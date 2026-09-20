// ═══════════════════════════════════════════
//  GEOKIRA.JS — Notification d'arrivée à la maison (lot 54)
//  Support multi-lieux (domicile + bureau + ...) — LOT 90
//
//  Utilise le "geofencing" natif d'Android via
//  expo-location + expo-task-manager : Android
//  surveille lui-même la ou les zones enregistrées,
//  même app fermée ou téléphone verrouillé, sans
//  garder le GPS actif en continu (bien moins
//  gourmand en batterie qu'un suivi GPS classique).
//
//  LOT 90 — David voulait un deuxième lieu (bureau, salle de sport...) avec
//  ses propres scènes d'arrivée/départ, en plus du domicile. La bonne
//  nouvelle : l'API native (Location.startGeofencingAsync) accepte DÉJÀ un
//  tableau de plusieurs zones nommées en un seul appel — la limite venait
//  uniquement de notre propre modèle de données (un seul "domicile" en dur
//  partout). Toute la logique passe donc d'un objet unique à un tableau
//  `lieux`, chaque lieu ayant sa propre position, son rayon, et ses propres
//  scènes d'arrivée/départ — sans rien perdre de ce qui existait avant.
//
//  MIGRATION AUTOMATIQUE : si un ancien domicile (lot 54-89) est détecté au
//  premier appel de getLieux() après cette mise à jour, il est converti en
//  un premier lieu "Domicile" — aucune reconfiguration nécessaire pour
//  David, tout ce qu'il avait déjà réglé (scènes, rayon...) est repris tel
//  quel. Les anciennes clés de stockage ne sont plus modifiées après ça,
//  seulement lues une fois pour la migration.
// ═══════════════════════════════════════════

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getData, setData } from './storage';

// Nom du "task" — DOIT être identique à celui utilisé dans
// utils/geofencingTask.js (fichier séparé, chargé au tout début
// de l'app, avant même le premier rendu — voir App.js).
export const GEOFENCE_TASK_NAME = 'kira-geofence-domicile';

const CLE_LIEUX = 'geokira_lieux'; // LOT 90 — voir forme exacte plus bas
const CLE_ACTIF = 'geokira_actif'; // bool — un seul interrupteur global pour tous les lieux

// ── Anciennes clés (lots 54-89), lues uniquement pour la migration ──
const CLE_DOMICILE_ANCIEN = 'geokira_domicile';
const CLE_RAYON_ANCIEN = 'geokira_rayon';
const CLE_SCENE_ARRIVEE_ANCIENNE = 'geokira_scene_arrivee';
const CLE_SCENE_DEPART_ANCIENNE = 'geokira_scene_depart';
const CLE_SCENE_ACTIVE_ANCIENNE = 'geokira_scene_active';
const CLE_SCENE_ACTIVE_DEPART_ANCIENNE = 'geokira_scene_active_depart';
const CLE_DERNIER_DECLENCHEMENT_ANCIEN = 'geokira_dernier_declenchement_scene';
const CLE_DERNIER_DECLENCHEMENT_DEPART_ANCIEN = 'geokira_dernier_declenchement_scene_depart';

export const RAYON_PAR_DEFAUT = 200;
// Délai avant que la notification "Bon retour" ne soit réellement affichée — si tu
// ressors de la zone avant (juste un passage dans la rue), elle est annulée. Voir
// geofencingTask.js pour la logique complète.
export const DELAI_CONFIRMATION_SECONDES = 120; // 2 minutes
// Temps minimum entre deux déclenchements de la scène d'arrivée (lumières...), même si
// Géo-Kira détecte plusieurs entrées rapprochées (rue passante, allers-retours...).
export const COOLDOWN_SCENE_MS = 30 * 60 * 1000; // 30 minutes
// LOT 83 — même principe pour la scène de départ, délai plus court : une sortie de zone
// est un événement plus franc qu'une arrivée (pas de risque de "juste passer devant chez
// soi" en s'éloignant), donc moins besoin de marge de sécurité.
export const COOLDOWN_SCENE_DEPART_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Forme d'un lieu dans le tableau `lieux` :
 * {
 *   id, nom, icon,              // ex: 'domicile', 'Domicile', '🏠'
 *   lat, lng, adresse,
 *   rayon,                      // mètres
 *   sceneArrivee: [{driverId, id, nom}], sceneDepart: [...],
 *   sceneActiveArrivee: bool, sceneActiveDepart: bool,
 *   dernierDeclenchementArrivee: ISOString|null,
 *   dernierDeclenchementDepart: ISOString|null,
 * }
 */

async function migrerAncienDomicileSiNecessaire() {
  const domicileAncien = await getData(CLE_DOMICILE_ANCIEN);
  if (!domicileAncien) return [];

  const [rayon, sceneArrivee, sceneDepart, sceneActive, sceneActiveDepart, dernierArrivee, dernierDepart] = await Promise.all([
    getData(CLE_RAYON_ANCIEN),
    getData(CLE_SCENE_ARRIVEE_ANCIENNE),
    getData(CLE_SCENE_DEPART_ANCIENNE),
    getData(CLE_SCENE_ACTIVE_ANCIENNE),
    getData(CLE_SCENE_ACTIVE_DEPART_ANCIENNE),
    getData(CLE_DERNIER_DECLENCHEMENT_ANCIEN),
    getData(CLE_DERNIER_DECLENCHEMENT_DEPART_ANCIEN),
  ]);

  return [{
    id: 'domicile',
    nom: 'Domicile',
    icon: '🏠',
    lat: domicileAncien.lat,
    lng: domicileAncien.lng,
    adresse: domicileAncien.adresse || '',
    rayon: rayon || RAYON_PAR_DEFAUT,
    sceneArrivee: sceneArrivee || [],
    sceneDepart: sceneDepart || [],
    sceneActiveArrivee: sceneActive === true,
    sceneActiveDepart: sceneActiveDepart === true,
    dernierDeclenchementArrivee: dernierArrivee || null,
    dernierDeclenchementDepart: dernierDepart || null,
  }];
}

/**
 * Récupère tous les lieux enregistrés. Migre automatiquement l'ancien
 * domicile mono-zone (lots 54-89) au premier appel si besoin — transparent,
 * aucune action requise de l'utilisateur.
 */
export async function getLieux() {
  const lieux = await getData(CLE_LIEUX);
  if (Array.isArray(lieux)) return lieux;

  const migre = await migrerAncienDomicileSiNecessaire();
  await setData(CLE_LIEUX, migre); // écrit même si vide, pour ne migrer qu'une seule fois
  return migre;
}

export async function setLieux(liste) {
  await setData(CLE_LIEUX, liste);
}

export async function getLieu(id) {
  const lieux = await getLieux();
  return lieux.find(l => l.id === id) || null;
}

/** Ajoute un nouveau lieu (ex: "Bureau"). Scènes vides par défaut, comme un
 * domicile fraîchement configuré. */
export async function ajouterLieu({ nom, icon, lat, lng, adresse, rayon }) {
  const lieux = await getLieux();
  const nouveau = {
    id: `lieu-${Date.now()}`,
    nom: nom || 'Nouveau lieu',
    icon: icon || '📍',
    lat, lng,
    adresse: adresse || '',
    rayon: rayon || RAYON_PAR_DEFAUT,
    sceneArrivee: [],
    sceneDepart: [],
    sceneActiveArrivee: false,
    sceneActiveDepart: false,
    dernierDeclenchementArrivee: null,
    dernierDeclenchementDepart: null,
  };
  await setLieux([...lieux, nouveau]);
  return nouveau;
}

export async function supprimerLieu(id) {
  const lieux = await getLieux();
  await setLieux(lieux.filter(l => l.id !== id));
}

/** Met à jour un ou plusieurs champs d'un lieu existant (fusion partielle). */
export async function mettreAJourLieu(id, patch) {
  const lieux = await getLieux();
  const misAJour = lieux.map(l => (l.id === id ? { ...l, ...patch } : l));
  await setLieux(misAJour);
  return misAJour.find(l => l.id === id);
}

export async function getGeoKiraActif() {
  const v = await getData(CLE_ACTIF);
  return v === true;
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
 * Démarre (ou redémarre) la surveillance de TOUS les lieux enregistrés en
 * une seule tâche de geofencing — l'API native accepte directement un
 * tableau de zones nommées. À appeler après avoir ajouté/modifié/supprimé
 * un lieu, et au démarrage de l'app si Géo-Kira est actif.
 */
export async function demarrerGeoKira() {
  const lieux = await getLieux();
  if (lieux.length === 0) {
    return { succes: false, erreur: 'AUCUN_LIEU' };
  }

  const permissionsOk = await verifierPermissionsGeoKira();
  if (!permissionsOk) {
    return { succes: false, erreur: 'PERMISSIONS_MANQUANTES' };
  }

  try {
    // On arrête d'abord une éventuelle surveillance précédente (ex: si
    // l'utilisateur change un lieu ou son rayon) pour éviter les doublons.
    const dejaActif = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (dejaActif) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }

    await Location.startGeofencingAsync(
      GEOFENCE_TASK_NAME,
      lieux.map(l => ({
        identifier: l.id,
        latitude: l.lat,
        longitude: l.lng,
        radius: l.rayon,
        notifyOnEnter: true,
        notifyOnExit: true,
      }))
    );

    await setData(CLE_ACTIF, true);
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

/**
 * Arrête complètement la surveillance de tous les lieux (bouton "Désactiver"
 * dans les Paramètres).
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
 * Utilisé par le bouton "📍 Utiliser ma position actuelle" (domicile ou tout
 * autre lieu). Même logique que ParkingScreen (lot 42), réutilisée ici pour
 * cohérence.
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
 * Historique léger des passages détectés, tous lieux confondus (pour
 * affichage dans Paramètres et référence future par Kira dans le chat).
 * Chaque entrée porte maintenant lieuId/lieuNom (lot 90) pour savoir de
 * quel lieu il s'agissait. Alimenté par geofencingTask.js à chaque évènement.
 */
export async function getHistoriqueGeoKira() {
  return (await getData('geokira_historique')) || [];
}

/**
 * Vérifie si le cooldown entre deux déclenchements de la scène d'un lieu est
 * respecté. `type` vaut 'arrivee' ou 'depart'.
 */
export function peutDeclencherScene(lieu, type) {
  const champ = type === 'arrivee' ? 'dernierDeclenchementArrivee' : 'dernierDeclenchementDepart';
  const cooldown = type === 'arrivee' ? COOLDOWN_SCENE_MS : COOLDOWN_SCENE_DEPART_MS;
  const dernier = lieu?.[champ];
  if (!dernier) return true;
  return Date.now() - new Date(dernier).getTime() > cooldown;
}

export async function marquerSceneDeclenchee(lieuId, type) {
  const champ = type === 'arrivee' ? 'dernierDeclenchementArrivee' : 'dernierDeclenchementDepart';
  await mettreAJourLieu(lieuId, { [champ]: new Date().toISOString() });
}

export async function getNotifAttente() {
  return (await getData('geokira_notif_attente')) || null;
}

export async function setNotifAttente(valeur) {
  await setData('geokira_notif_attente', valeur);
}
