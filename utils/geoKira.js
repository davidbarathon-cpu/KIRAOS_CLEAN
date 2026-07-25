// ═══════════════════════════════════════════
//  GEOKIRA.JS — Notification d'arrivée à la maison
//  LOT 54
//
//  Utilise le "geofencing" natif d'Android via
//  expo-location + expo-task-manager : Android
//  surveille lui-même la zone autour du domicile,
//  même app fermée ou téléphone verrouillé, sans
//  garder le GPS actif en continu (bien moins
//  gourmand en batterie qu'un suivi GPS classique).
// ═══════════════════════════════════════════

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getData, setData } from './storage';

// Nom du "task" — DOIT être identique à celui utilisé dans
// utils/geofencingTask.js (fichier séparé, chargé au tout début
// de l'app, avant même le premier rendu — voir App.js).
export const GEOFENCE_TASK_NAME = 'kira-geofence-domicile';

const CLE_DOMICILE = 'geokira_domicile'; // { lat, lng, adresse }
const CLE_ACTIF = 'geokira_actif';       // bool
const CLE_RAYON = 'geokira_rayon';       // mètres (100 | 200 | 500)

const RAYON_PAR_DEFAUT = 200;

/**
 * Récupère la position enregistrée du domicile (ou null si jamais réglée).
 */
export async function getDomicile() {
  return (await getData(CLE_DOMICILE)) || null;
}

/**
 * Enregistre la position du domicile. lat/lng en degrés décimaux.
 */
export async function setDomicile(lat, lng, adresse = '') {
  await setData(CLE_DOMICILE, { lat, lng, adresse });
}

export async function getGeoKiraActif() {
  const v = await getData(CLE_ACTIF);
  return v === true;
}

export async function getRayonGeoKira() {
  return (await getData(CLE_RAYON)) || RAYON_PAR_DEFAUT;
}

export async function setRayonGeoKira(metres) {
  await setData(CLE_RAYON, metres);
}

/**
 * Demande les permissions nécessaires, dans le bon ordre :
 * 1. Localisation "quand l'app est utilisée" (obligatoire d'abord sur Android)
 * 2. Localisation "toujours" (nécessaire pour que le geofencing fonctionne
 *    app fermée — Android affiche un second écran de permission séparé)
 * Retourne { accordee: bool, message: string|null }
 */
export async function demanderPermissionsGeoKira() {
  const avantPlan = await Location.requestForegroundPermissionsAsync();
  if (avantPlan.status !== 'granted') {
    return { accordee: false, message: "Permission de localisation refusée. Géo-Kira ne peut pas fonctionner sans elle." };
  }

  const arrierePlan = await Location.requestBackgroundPermissionsAsync();
  if (arrierePlan.status !== 'granted') {
    return {
      accordee: false,
      message: "Pour que Géo-Kira te prévienne même app fermée, Android demande une autorisation supplémentaire : choisis \"Toujours autoriser\" dans les réglages de localisation de l'app (Réglages Android → Applications → Kira OS → Autorisations → Position → Toujours autoriser).",
    };
  }

  return { accordee: true, message: null };
}

export async function verifierPermissionsGeoKira() {
  const avantPlan = await Location.getForegroundPermissionsAsync();
  const arrierePlan = await Location.getBackgroundPermissionsAsync();
  return avantPlan.status === 'granted' && arrierePlan.status === 'granted';
}

/**
 * Démarre (ou redémarre) la surveillance de la zone domicile.
 * À appeler après avoir enregistré/changé le domicile ou le rayon,
 * et au démarrage de l'app si Géo-Kira est actif.
 */
export async function demarrerGeoKira() {
  const domicile = await getDomicile();
  if (!domicile) {
    return { succes: false, erreur: 'AUCUN_DOMICILE' };
  }

  const permissionsOk = await verifierPermissionsGeoKira();
  if (!permissionsOk) {
    return { succes: false, erreur: 'PERMISSIONS_MANQUANTES' };
  }

  const rayon = await getRayonGeoKira();

  try {
    // On arrête d'abord une éventuelle surveillance précédente (ex: si
    // l'utilisateur change son domicile ou le rayon) pour éviter les doublons.
    const dejaActif = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (dejaActif) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
      {
        identifier: 'domicile',
        latitude: domicile.lat,
        longitude: domicile.lng,
        radius: rayon,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);

    await setData(CLE_ACTIF, true);
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

/**
 * Arrête complètement la surveillance (bouton "Désactiver" dans les Paramètres).
 */
export async function arreterGeoKira() {
  try {
    const dejaActif = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (dejaActif) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    await setData(CLE_ACTIF, false);
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

/**
 * Récupère la position GPS actuelle et la reverse-géocode en adresse lisible.
 * Utilisé par le bouton "📍 Utiliser ma position actuelle comme domicile".
 * Même logique que ParkingScreen (lot 42), réutilisée ici pour cohérence.
 */
export async function getPositionActuelleCommeAdresse() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { position: null, erreur: 'Permission de localisation refusée.' };
  }

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const [lieu] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    const adresse = lieu
      ? [lieu.street, lieu.postalCode, lieu.city].filter(Boolean).join(', ')
      : `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;

    return {
      position: { lat: position.coords.latitude, lng: position.coords.longitude, adresse },
      erreur: null,
    };
  } catch (e) {
    return { position: null, erreur: e.message };
  }
}

/**
 * Historique léger des passages détectés (pour affichage dans Paramètres
 * et référence future par Kira dans le chat — "tu es rentré à 18h32").
 * Alimenté par geofencingTask.js à chaque évènement.
 */
export async function getHistoriqueGeoKira() {
  return (await getData('geokira_historique')) || [];
}
