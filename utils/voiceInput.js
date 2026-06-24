// ═══════════════════════════════════════════
//  VOICEINPUT.JS — Reconnaissance vocale réelle
//  Utilise expo-speech-recognition, qui s'appuie
//  sur le moteur de reconnaissance vocale natif
//  d'Android (le même que celui utilisé par le
//  clavier Gboard pour la dictée) — gratuit, pas
//  de clé API, fonctionne hors-ligne sur la plupart
//  des Android récents pour le français.
// ═══════════════════════════════════════════

import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * Demande la permission d'utiliser le micro pour la reconnaissance vocale.
 * À appeler avant le premier lancement de l'écoute.
 */
export async function demanderPermissionMicro() {
  const resultat = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return resultat.granted;
}

export async function verifierPermissionMicro() {
  const resultat = await ExpoSpeechRecognitionModule.getPermissionsAsync();
  return resultat.granted;
}

/**
 * Lance une session d'écoute unique : écoute jusqu'à ce que l'utilisateur
 * arrête de parler (silence détecté) ou que le délai maximum soit atteint,
 * puis retourne le texte transcrit.
 *
 * onResultatPartiel : callback optionnel appelé avec le texte en cours de
 * reconnaissance (utile pour afficher "..." en temps réel à l'écran)
 * onFin : callback appelé avec le texte final, ou null si rien n'a été compris
 * onErreur : callback appelé avec un message d'erreur explicite
 *
 * Retourne une fonction d'arrêt manuel (utile si l'utilisateur veut annuler).
 */
export function ecouterUneCommande({ onResultatPartiel, onFin, onErreur }) {
  let texteFinal = '';

  const sousResultat = ExpoSpeechRecognitionModule.addListener('result', event => {
    const transcription = event.results?.[0]?.transcript || '';
    texteFinal = transcription;
    onResultatPartiel?.(transcription);
  });

  const sousFin = ExpoSpeechRecognitionModule.addListener('end', () => {
    sousResultat.remove();
    sousFin.remove();
    sousErreur.remove();
    onFin?.(texteFinal.trim() || null);
  });

  const sousErreur = ExpoSpeechRecognitionModule.addListener('error', event => {
    sousResultat.remove();
    sousFin.remove();
    sousErreur.remove();

    const messages = {
      'no-speech': "Je n'ai rien entendu. Réessaie en parlant plus près du micro.",
      'not-allowed': 'Permission micro refusée. Autorise-la dans les réglages Android.',
      network: 'Connexion réseau nécessaire pour la reconnaissance vocale en ligne (selon ton appareil).',
    };
    onErreur?.(messages[event.error] || `Erreur de reconnaissance vocale : ${event.error}`);
  });

  ExpoSpeechRecognitionModule.start({
    lang: 'fr-FR',
    interimResults: true,
    continuous: false, // une seule commande à la fois, s'arrête après le silence
    maxAlternatives: 1,
  });

  // Fonction d'arrêt manuel, exposée à l'appelant
  return () => {
    ExpoSpeechRecognitionModule.stop();
  };
}
