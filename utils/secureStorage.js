// ═══════════════════════════════════════════
//  SECURESTORAGE.JS — Stockage chiffré (lot 30)
//  Utilise expo-secure-store, qui s'appuie sur le
//  Keystore Android (matériel de sécurité du
//  téléphone, le même système qui protège les
//  mots de passe enregistrés ou les données de
//  paiement). C'est nettement plus robuste qu'un
//  chiffrement "logiciel" fait à la main.
//
//  Ce fichier ne doit normalement PAS être appelé
//  directement par les écrans — storage.js s'en
//  occupe automatiquement (voir CLES_SENSIBLES
//  ci-dessous). Réservé aux données les plus
//  sensibles de l'app : clés API, jetons de
//  connexion, identifiants d'appareils domotiques.
//
//  Limite technique connue de SecureStore : une
//  valeur ne doit pas dépasser ~2048 caractères.
//  Toutes les données concernées ici (clés API,
//  jetons OAuth, petite config Hue) sont largement
//  sous cette limite — pas un souci en pratique.
// ═══════════════════════════════════════════

import * as SecureStore from 'expo-secure-store';

// Liste exhaustive des clés de storage.js qui doivent être chiffrées.
// Pour ajouter une future donnée sensible : il suffit de l'ajouter ici,
// storage.js s'occupe automatiquement de la rediriger.
export const CLES_SENSIBLES = [
  'api_keys',         // toutes les clés API (IA, météo, traduction, actus, Resend...)
  'google_jetons',    // jetons OAuth Google Agenda
  'spotify_jetons',   // jetons OAuth Spotify
  'hue_config',       // adresse IP + identifiant du bridge Philips Hue
];

const PREFIX_SECURE = 'kiraos_secure_';

/**
 * Récupère une valeur chiffrée. Retourne null si absente (jamais
 * d'erreur bloquante : si la donnée n'existe pas, l'app doit pouvoir
 * continuer normalement, par exemple "pas encore de clé configurée").
 */
export async function getSecureData(key) {
  try {
    const raw = await SecureStore.getItemAsync(PREFIX_SECURE + key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Erreur getSecureData', key, e);
    return null;
  }
}

/**
 * Sauvegarde une valeur de façon chiffrée.
 */
export async function setSecureData(key, value) {
  try {
    await SecureStore.setItemAsync(PREFIX_SECURE + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('Erreur setSecureData', key, e);
    return false;
  }
}

/**
 * Efface une valeur chiffrée.
 */
export async function removeSecureData(key) {
  try {
    await SecureStore.deleteItemAsync(PREFIX_SECURE + key);
    return true;
  } catch (e) {
    return false;
  }
}
