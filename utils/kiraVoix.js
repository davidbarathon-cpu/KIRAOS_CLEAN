// ═══════════════════════════════════════════
//  KIRAVOIX.JS — LOT 82, corrigé au LOT 91 (découpage en segments)
//  Voix naturelle de Kira via Gemini TTS (le modèle audio natif de Google,
//  utilisé par exemple dans Gemini Live), avec repli automatique et
//  invisible sur la synthèse vocale standard du téléphone (expo-speech) si
//  aucune clé Gemini n'est configurée, ou si l'appel réseau échoue.
//
//  Utilisé par : kiraBriefing.js (Kira-Podcast), KiraChatScreen.js
//  (lecture des réponses), MeditationScreen.js (guide vocal),
//  EcouteRapideScreen.js.
//
//  Le modèle TTS ne renvoie que de l'audio brut (PCM 16 bits, mono,
//  généralement 24kHz) encodé en base64 — pas un fichier jouable tel quel.
//  On lui ajoute donc un en-tête WAV (44 octets) avant de l'écrire sur le
//  disque et de le lire avec expo-audio.
//
//  ═══ LOT 91 — CORRECTIF IMPORTANT ═══
//  David a signalé deux problèmes liés au lot 82 : (1) un temps de réponse
//  très long avant que Kira commence à parler, et (2) les textes longs
//  (comme le résumé matinal) coupés en plein milieu.
//
//  Cause trouvée : la documentation officielle de Gemini TTS confirme que
//  le modèle a une limite de sortie non garantie sur les textes longs
//  ("Quality of longer outputs... We recommend splitting your transcripts
//  into smaller chunks" — ai.google.dev/gemini-api/docs/speech-generation).
//  Envoyer tout un briefing d'un coup provoquait donc à la fois la
//  troncature (le modèle s'arrête avant la fin) ET la lenteur (générer
//  beaucoup d'audio d'un coup prend du temps, sans rien à jouer avant que
//  ce soit terminé).
//
//  Correctif : le texte est maintenant découpé en segments courts (environ
//  500 caractères, sur des frontières de phrases), lus les uns après les
//  autres. Le segment suivant est généré EN PARALLÈLE pendant que le
//  segment actuel joue (pré-chargement), pour qu'il n'y ait pas de blanc
//  entre deux segments. Ça règle la troncature (chaque segment est bien
//  sous la limite) et réduit le délai avant le début de la lecture (seul le
//  premier segment, court, doit être prêt avant de commencer).
//
//  Un délai de sécurité (8 secondes) sur le tout premier segment fait
//  basculer sur la voix système si le réseau est visiblement lent ce
//  jour-là, plutôt que de laisser David attendre indéfiniment.
// ═══════════════════════════════════════════

import { createAudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { getAllApiKeys } from './apiKeys';
import { getData, setData } from './storage';

const CLE_VOIX_CHOISIE = 'kira_voix_gemini_nom';
const MODELE_TTS = 'gemini-3.1-flash-tts-preview';
const VOIX_PAR_DEFAUT = 'Sulafat';
const TAILLE_SEGMENT_MAX = 500; // caractères — bien sous les limites documentées
const DELAI_MAX_PREMIER_SEGMENT_MS = 8000; // au-delà, on abandonne Gemini pour ce message

// Sélection restreinte parmi les 30 voix du catalogue Gemini — celles qui
// correspondent le mieux à une voix d'assistant chaleureuse. Liste complète
// sur https://ai.google.dev/gemini-api/docs/speech-generation#voices si
// David veut en essayer d'autres plus tard.
export const VOIX_GEMINI_DISPONIBLES = [
  { id: 'Sulafat', label: 'Chaleureuse' },
  { id: 'Achird', label: 'Amicale' },
  { id: 'Vindemiatrix', label: 'Douce' },
  { id: 'Kore', label: 'Posée' },
  { id: 'Autonoe', label: 'Lumineuse' },
  { id: 'Laomedeia', label: 'Enjouée' },
];

let lecteurAudioActuel = null;
let enCoursDeLecture = false;
// LOT 91 — identifiant de "session de lecture" : incrémenté à chaque appel
// de parlerAvecVoixKira()/arreterVoixKira(). La boucle de lecture séquentielle
// vérifie ce compteur avant de jouer chaque segment, pour s'arrêter proprement
// si l'utilisateur a demandé autre chose entre-temps (sinon, une ancienne
// lecture pourrait continuer à parler par-dessus une nouvelle).
let sessionActuelle = 0;

export async function getVoixGeminiChoisie() {
  return (await getData(CLE_VOIX_CHOISIE)) || VOIX_PAR_DEFAUT;
}

export async function setVoixGeminiChoisie(id) {
  await setData(CLE_VOIX_CHOISIE, id);
}

/** Indique si la voix Gemini est utilisable (clé configurée), pour que les
 * écrans puissent afficher un petit indicateur si besoin. */
export async function voixNaturelleDisponible() {
  const keys = await getAllApiKeys();
  return !!keys?.gemini;
}

function base64ParaUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

/** Ajoute un en-tête WAV (44 octets) devant les données PCM brutes reçues de
 * Gemini, pour obtenir un fichier .wav standard que expo-audio sait lire. */
function construireWav(pcmBytes, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBytes.length;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer);
  const ecrireTexte = (offset, texte) => {
    for (let i = 0; i < texte.length; i++) view.setUint8(offset + i, texte.charCodeAt(i));
  };
  ecrireTexte(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ecrireTexte(8, 'WAVE');
  ecrireTexte(12, 'fmt ');
  view.setUint32(16, 16, true); // taille du sous-bloc "fmt "
  view.setUint16(20, 1, true); // format = PCM non compressé
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  ecrireTexte(36, 'data');
  view.setUint32(40, dataSize, true);
  buffer.set(pcmBytes, 44);
  return buffer;
}

/**
 * LOT 91 — Découpe un texte en segments d'environ `tailleMax` caractères,
 * sur des frontières de phrases (jamais en plein milieu d'un mot). Un texte
 * court tient dans un seul segment, un texte long en a plusieurs.
 */
function decouperEnSegments(texte, tailleMax = TAILLE_SEGMENT_MAX) {
  const phrases = texte.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [texte];
  const segments = [];
  let courant = '';
  for (const phrase of phrases) {
    if (courant && (courant.length + phrase.length) > tailleMax) {
      segments.push(courant.trim());
      courant = phrase;
    } else {
      courant += phrase;
    }
  }
  if (courant.trim()) segments.push(courant.trim());
  return segments.length > 0 ? segments : [texte];
}

/** Appelle Gemini TTS pour UN segment de texte et écrit le résultat en .wav
 * dans le cache (un fichier distinct par segment, pour ne pas écraser un
 * fichier encore en cours de lecture pendant le pré-chargement du suivant).
 * Retourne l'URI du fichier généré, ou null si indisponible pour une raison
 * quelconque (pas de clé, erreur réseau, réponse inattendue...) — jamais
 * d'exception qui remonte, le repli est toujours géré par l'appelant. */
async function genererAudioGemini(texte, indexSegment) {
  const keys = await getAllApiKeys();
  const apiKey = keys?.gemini;
  if (!apiKey) return null;

  try {
    const voixId = await getVoixGeminiChoisie();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELE_TTS}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: texte }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voixId } } },
          },
        }),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const partieAudio = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!partieAudio?.data) return null;

    const correspondanceFrequence = /rate=(\d+)/.exec(partieAudio.mimeType || '');
    const frequence = correspondanceFrequence ? parseInt(correspondanceFrequence[1], 10) : 24000;
    const octetsPcm = base64ParaUint8Array(partieAudio.data);
    const octetsWav = construireWav(octetsPcm, frequence);

    // LOT 91 — un nom de fichier par segment (pas toujours le même), pour
    // que le pré-chargement du segment suivant n'écrase jamais le fichier
    // que le lecteur audio est potentiellement encore en train de lire.
    const fichier = new File(Paths.cache, `kira_voix_${indexSegment % 2}.wav`);
    try { await fichier.delete(); } catch (e) { /* n'existait pas encore, rien à faire */ }
    await fichier.create();
    await fichier.write(octetsWav);
    return fichier.uri;
  } catch (e) {
    return null;
  }
}

/** Joue un fichier audio local et attend la fin de la lecture (Promise).
 * Résout immédiatement sans jouer si `session` ne correspond plus à la
 * lecture en cours (annulée entre-temps par arreterVoixKira()). */
function jouerFichierEtAttendre(uri, session) {
  return new Promise(resolve => {
    if (session !== sessionActuelle) { resolve(); return; }
    try {
      const lecteur = createAudioPlayer({ uri });
      lecteurAudioActuel = lecteur;
      // ⚠️ Limite connue d'expo-audio (issue GitHub expo/expo#41852) : sur
      // certains appareils, après un usage répété, l'évènement
      // "didJustFinish" peut cesser de se déclencher. Si un jour Kira reste
      // bloquée en "train de parler" sans jamais revenir à l'état normal,
      // c'est la piste à vérifier en premier — pas un bug de ce fichier.
      lecteur.addListener('playbackStatusUpdate', status => {
        if (status.didJustFinish) {
          try { lecteur.release(); } catch (e) { /* déjà relâché */ }
          if (lecteurAudioActuel === lecteur) lecteurAudioActuel = null;
          resolve();
        }
      });
      lecteur.play();
    } catch (e) {
      resolve();
    }
  });
}

/** Lit un texte avec la voix système du téléphone et attend la fin (Promise) —
 * utilisé aussi bien en repli complet qu'en repli ponctuel pour un seul
 * segment dont la génération Gemini aurait échoué en cours de route. */
function directParExpoSpeech(texte, session) {
  return new Promise(resolve => {
    if (session !== sessionActuelle) { resolve(); return; }
    Speech.speak(texte, {
      language: 'fr-FR',
      onDone: resolve,
      onStopped: resolve,
      onError: resolve,
    });
  });
}

/**
 * Fait parler Kira avec la voix la plus naturelle disponible. Utilise
 * Gemini TTS si une clé Gemini est configurée dans l'app (Paramètres > IA
 * pour Kira), sinon la voix standard du téléphone — de façon totalement
 * transparente, sans jamais faire échouer la lecture.
 *
 * LOT 91 — découpe désormais le texte en segments et les enchaîne, avec
 * pré-chargement du segment suivant pendant la lecture du segment actuel.
 */
export async function parlerAvecVoixKira(texte, { onDebut, onFin } = {}) {
  arreterVoixKira();
  const session = ++sessionActuelle;
  enCoursDeLecture = true;
  onDebut?.();

  const geminiDisponible = await voixNaturelleDisponible();
  if (!geminiDisponible) {
    await directParExpoSpeech(texte, session);
    if (session === sessionActuelle) { enCoursDeLecture = false; onFin?.(); }
    return;
  }

  const segments = decouperEnSegments(texte);

  // LOT 91 — délai de sécurité sur le tout premier segment seulement : si
  // Gemini met visiblement trop de temps à répondre (réseau lent ce
  // jour-là), on bascule sur la voix système pour TOUT le message plutôt
  // que de faire attendre David indéfiniment.
  const premierSegmentPromesse = genererAudioGemini(segments[0], 0);
  const delaiDepasse = await Promise.race([
    premierSegmentPromesse.then(() => false),
    new Promise(resolve => setTimeout(() => resolve(true), DELAI_MAX_PREMIER_SEGMENT_MS)),
  ]);

  if (session !== sessionActuelle) return; // annulé entre-temps

  if (delaiDepasse) {
    // Gemini reste en cours en arrière-plan mais on ne l'attend plus — le
    // repli prend le relais pour tout le texte, pour cette fois.
    await directParExpoSpeech(texte, session);
    if (session === sessionActuelle) { enCoursDeLecture = false; onFin?.(); }
    return;
  }

  let audioSuivant = premierSegmentPromesse;
  for (let i = 0; i < segments.length; i++) {
    if (session !== sessionActuelle) return; // annulé entre-temps

    const uri = await audioSuivant;

    // Pré-charge le segment suivant EN PARALLÈLE de la lecture de celui-ci,
    // pour qu'il n'y ait pas de blanc à l'enchaînement.
    if (i + 1 < segments.length) {
      audioSuivant = genererAudioGemini(segments[i + 1], i + 1);
    }

    if (uri) {
      await jouerFichierEtAttendre(uri, session);
    } else {
      // Échec Gemini pour CE segment précis (rare) — repli ponctuel, la
      // suite continue normalement en Gemini si les segments suivants
      // fonctionnent.
      await directParExpoSpeech(segments[i], session);
    }
  }

  if (session === sessionActuelle) {
    enCoursDeLecture = false;
    onFin?.();
  }
}

export function arreterVoixKira() {
  sessionActuelle++; // invalide toute lecture séquentielle en cours
  Speech.stop();
  if (lecteurAudioActuel) {
    try { lecteurAudioActuel.pause(); lecteurAudioActuel.release(); } catch (e) { /* déjà arrêté */ }
    lecteurAudioActuel = null;
  }
  enCoursDeLecture = false;
}

export function voixKiraEnCours() {
  return enCoursDeLecture;
}
