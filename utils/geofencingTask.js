// ═══════════════════════════════════════════
//  GEOFENCINGTASK.JS — LOT 54
//
//  ⚠️ IMPORTANT : ce fichier doit être importé une seule fois,
//  au tout début de l'app (dans App.js, avant le composant),
//  et JAMAIS à l'intérieur d'un composant ou d'une fonction.
//  C'est une règle stricte d'expo-task-manager : la tâche doit
//  être "définie" dès le chargement du JS, sinon Android ne
//  saura pas quoi faire quand il détecte que tu entres dans la
//  zone domicile alors que l'app est fermée.
// ═══════════════════════════════════════════

import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { GEOFENCE_TASK_NAME, DELAI_CONFIRMATION_SECONDES, getSceneActiveArrivee, peutDeclencherScene, marquerSceneDeclenchee } from './geoKira';
import { getData, setData } from './storage';
import { getDriver } from './domotiqueDrivers'; // LOT 57 — scène d'arrivée

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Erreur Géo-Kira (geofencing):', error.message);
    return;
  }

  const { eventType, region } = data;

  // S'assure que le canal de notification existe même si l'app n'a jamais
  // été ouverte depuis le dernier redémarrage du téléphone (cas rare mais
  // possible : Android peut relancer ce bout de code seul en arrière-plan).
  await Notifications.setNotificationChannelAsync('kira-defaut', {
    name: 'Kira — Rappels et alertes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6C63FF',
  });

  const profil = (await getData('profil')) || {};
  const nom = profil.prenom || profil.nom || '';

  const estEntree = eventType === 1; // Location.GeofencingEventType.Enter === 1
  const estSortie = eventType === 2; // Location.GeofencingEventType.Exit  === 2

  if (estEntree) {
    // LOT 65 — BUGFIX : David nous a signalé recevoir "Bon retour !" en passant
    // simplement dans la rue devant chez lui, sans s'arrêter. Au lieu d'afficher la
    // notification immédiatement, on la programme avec un léger différé
    // (DELAI_CONFIRMATION_SECONDES). Si une sortie de zone est détectée avant ce
    // délai (voir bloc estSortie ci-dessous), on l'annule : ce n'était qu'un passage.
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏠 Bon retour !',
        body: nom ? `Content de te revoir à la maison, ${nom} ! 🌟` : 'Content de te revoir à la maison ! 🌟',
        data: { type: 'geokira', evenement: 'entree' },
        sound: true,
      },
      trigger: { seconds: DELAI_CONFIRMATION_SECONDES },
    });
    await setData('geokira_notif_attente', { notificationId: notifId, depuis: new Date().toISOString() });
    await enregistrerEvenement('entree');
    await declencherSceneArrivee(); // LOT 57, garde-fous ajoutés au LOT 65 (voir plus bas)
  } else if (estSortie) {
    // LOT 65 — si la notification d'arrivée n'a pas encore été affichée
    // (toujours "en attente" de confirmation), on l'annule : simple passage.
    const attente = await getData('geokira_notif_attente');
    if (attente?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(attente.notificationId).catch(() => {});
      await setData('geokira_notif_attente', null);
    }
    await enregistrerEvenement('sortie');
  }
});

async function enregistrerEvenement(type) {
  const historique = (await getData('geokira_historique')) || [];
  const nouvelleEntree = { type, date: new Date().toISOString() };
  const misAJour = [nouvelleEntree, ...historique].slice(0, 50); // garde les 50 derniers
  await setData('geokira_historique', misAJour);
}

/**
 * LOT 57 — Allume automatiquement les appareils choisis par l'utilisateur
 * comme "scène d'arrivée" (voir GeoKiraCard.js), quel que soit leur driver
 * (Démo, Philips Hue, Tuya...). Silencieux en cas d'échec sur un appareil
 * (ex: bridge injoignable) — n'empêche jamais la notification d'arrivée.
 *
 * LOT 65 — Deux garde-fous ajoutés suite au retour de David ("j'ai peur qu'elle
 * s'allume trop souvent") :
 *  1. La scène ne se déclenche QUE si explicitement activée dans les Paramètres
 *     (opt-in, désactivée par défaut — voir getSceneActiveArrivee/setSceneActiveArrivee
 *     dans geoKira.js). Choisir des appareils dans la liste ne suffit plus à elle
 *     seule : il faut aussi ce second interrupteur "Activer la scène automatique".
 *  2. Un cooldown (30 min par défaut, voir COOLDOWN_SCENE_MS) empêche un nouveau
 *     déclenchement si la scène vient déjà de s'exécuter récemment — utile si le
 *     rayon choisi est encore un peu trop large et que Géo-Kira détecte plusieurs
 *     entrées/sorties rapprochées (rue passante, allers-retours en voiture...).
 */
async function declencherSceneArrivee() {
  const sceneActivee = await getSceneActiveArrivee();
  if (!sceneActivee) return; // garde-fou 1 : opt-in désactivé par défaut

  const cooldownOk = await peutDeclencherScene();
  if (!cooldownOk) return; // garde-fou 2 : déclenchement trop récent

  const scene = (await getData('geokira_scene_arrivee')) || [];
  if (scene.length === 0) return;

  await Promise.allSettled(
    scene.map(({ driverId, id }) => {
      const driver = getDriver(driverId);
      if (!driver) return Promise.resolve();
      return driver.allumer(id);
    })
  );

  await marquerSceneDeclenchee();
}

// ── Note technique ──
// expo-location expose Location.GeofencingEventType.Enter === 1 et .Exit === 2.
// On compare ici directement aux valeurs numériques stables de la librairie
// (documentées et inchangées depuis plusieurs versions) plutôt que d'importer
// expo-location dans ce fichier, pour éviter tout risque de cycle d'import
// avec geoKira.js selon la façon dont Metro (le bundler) résout les modules.
