// ═══════════════════════════════════════════
//  KIRAVOIX.JS — LOT 82
//  Voix naturelle de Kira via Gemini TTS (le modèle audio natif de Google,
//  utilisé par exemple dans Gemini Live), avec repli automatique et
//  invisible sur la synthèse vocale standard du téléphone (expo-speech) si
//  aucune clé Gemini n'est configurée, ou si l'appel réseau échoue.
//
//  Pourquoi : David trouvait la voix de Kira "robotique" (voix système
//  Android par défaut). Gemini expose son propre modèle de génération audio
//  (gemini-3.1-flash-tts-preview), nettement plus naturel — et comme Kira
//  utilise déjà Gemini comme fournisseur d'IA possible (utils/apiKeys.js),
//  on peut réutiliser directement la même clé si elle est déjà configurée.
//
//  Utilisé par : kiraBriefing.js (Kira-Podcast), KiraChatScreen.js
//  (lecture des réponses), MeditationScreen.js (guide vocal),
//  EcouteRapideScreen.js.
//
//  Le modèle TTS ne renvoie que de l'audio brut (PCM 16 bits, mono,
//  généralement 24kHz) encodé en base64 — pas un fichier jouable tel quel.
//  On lui ajoute donc un en-tête WAV (44 octets) avant de l'écrire sur le
//  disque et de le lire avec expo-audio.
// ═══════════════════════════════════════════

import { createAudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { getAllApiKeys } from './apiKeys';
import { getData, setData } from './storage';

const CLE_VOIX_CHOISIE = 'kira_voix_gemini_nom';
const MODELE_TTS = 'gemini-3.1-flash-tts-preview';
const VOIX_PAR_DEFAUT = 'Sulafat';

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

/** Appelle Gemini TTS et écrit le résultat en .wav dans le cache. Retourne
 * l'URI du fichier généré, ou null si indisponible pour une raison
 * quelconque (pas de clé, erreur réseau, réponse inattendue...) — jamais
 * d'exception qui remonte, le repli est toujours géré par l'appelant. */
async function genererAudioGemini(texte) {
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

    const fichier = new File(Paths.cache, 'kira_voix.wav');
    // CORRECTIF (relecture post-lot 82) : create()/write() sont documentées
    // comme asynchrones (Promise<void>) — sans `await`, rien ne garantissait
    // que l'écriture soit terminée avant que createAudioPlayer() ne tente de
    // lire le fichier juste après, un risque réel de condition de course
    // (fichier tronqué ou vide lu par le lecteur audio).
    try { await fichier.delete(); } catch (e) { /* n'existait pas encore, rien à faire */ }
    await fichier.create();
    await fichier.write(octetsWav);
    return fichier.uri;
  } catch (e) {
    return null;
  }
}

/**
 * Fait parler Kira avec la voix la plus naturelle disponible. Utilise
 * Gemini TTS si une clé Gemini est configurée dans l'app (Paramètres > IA
 * pour Kira), sinon la voix standard du téléphone — de façon totalement
 * transparente, sans jamais faire échouer la lecture.
 */
export async function parlerAvecVoixKira(texte, { onDebut, onFin } = {}) {
  arreterVoixKira();
  enCoursDeLecture = true;
  onDebut?.();

  const uriAudio = await genererAudioGemini(texte);

  if (uriAudio) {
    try {
      const lecteur = createAudioPlayer({ uri: uriAudio });
      lecteurAudioActuel = lecteur;
      // ⚠️ Limite connue d'expo-audio (issue GitHub expo/expo#41852) : sur
      // certains appareils, après un usage répété, l'évènement
      // "didJustFinish" peut cesser de se déclencher. Si un jour Kira reste
      // bloquée en "train de parler" sans jamais revenir à l'état normal,
      // c'est la piste à vérifier en premier — pas un bug de ce fichier.
      lecteur.addListener('playbackStatusUpdate', status => {
        if (status.didJustFinish) {
          enCoursDeLecture = false;
          try { lecteur.release(); } catch (e) { /* déjà relâché */ }
          if (lecteurAudioActuel === lecteur) lecteurAudioActuel = null;
          onFin?.();
        }
      });
      lecteur.play();
      return;
    } catch (e) {
      // Échec de lecture malgré un audio généré (rare) — on tombe sur le
      // repli standard ci-dessous plutôt que de laisser Kira muette.
    }
  }

  // Repli : voix standard du téléphone (identique au comportement d'avant
  // le lot 82 — jamais de régression si Gemini n'est pas configuré/dispo).
  Speech.speak(texte, {
    language: 'fr-FR',
    onDone: () => { enCoursDeLecture = false; onFin?.(); },
    onStopped: () => { enCoursDeLecture = false; onFin?.(); },
    onError: () => { enCoursDeLecture = false; onFin?.(); },
  });
}

export function arreterVoixKira() {
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
