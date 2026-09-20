// ═══════════════════════════════════════════
//  GEOFENCINGTASK.JS — LOT 54, multi-lieux LOT 90
//
//  ⚠️ IMPORTANT : ce fichier doit être importé une seule fois,
//  au tout début de l'app (dans App.js, avant le composant),
//  et JAMAIS à l'intérieur d'un composant ou d'une fonction.
//  C'est une règle stricte d'expo-task-manager : la tâche doit
//  être "définie" dès le chargement du JS, sinon Android ne
//  saura pas quoi faire quand il détecte que tu entres dans une
//  zone surveillée alors que l'app est fermée.
//
//  LOT 90 — une seule tâche de geofencing surveille maintenant PLUSIEURS
//  zones nommées (voir geoKira.js). `region.identifier` (fourni par
//  Android/expo-location à chaque évènement) correspond à l'id du lieu
//  concerné dans `getLieux()` — c'est ce qui permet de savoir "arrivée à
//  la maison" ou "arrivée au bureau" et d'appliquer la bonne scène.
// ═══════════════════════════════════════════

import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { GEOFENCE_TASK_NAME, DELAI_CONFIRMATION_SECONDES, getLieu, peutDeclencherScene, marquerSceneDeclenchee } from './geoKira';
import { getData, setData } from './storage';
import { getDriver } from './domotiqueDrivers'; // LOT 57 — scènes d'arrivée/départ

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Erreur Géo-Kira (geofencing):', error.message);
    return;
  }

  const { eventType, region } = data;

  // LOT 90 — retrouve de quel lieu il s'agit. Si le lieu a été supprimé
  // entre-temps (ex: David l'a retiré juste avant qu'Android ne délivre un
  // évènement déjà en vol), on ignore simplement l'évènement.
  const lieu = await getLieu(region.identifier);
  if (!lieu) return;

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

  // LOT 90 — texte de notification adapté au lieu : formulation chaleureuse
  // "Bon retour" réservée au domicile (comportement inchangé depuis le lot
  // 54), formulation neutre pour tout autre lieu ("Bureau", "Salle de
  // sport"...).
  const estDomicile = lieu.id === 'domicile';
  const titreArrivee = estDomicile ? '🏠 Bon retour !' : `${lieu.icon || '📍'} Arrivée à ${lieu.nom}`;
  const corpsArrivee = estDomicile
    ? (nom ? `Content de te revoir à la maison, ${nom} ! 🌟` : 'Content de te revoir à la maison ! 🌟')
    : (nom ? `${nom}, te voilà à ${lieu.nom}.` : `Arrivée détectée à ${lieu.nom}.`);

  if (estEntree) {
    // LOT 65 — BUGFIX : David nous a signalé recevoir "Bon retour !" en passant
    // simplement dans la rue devant chez lui, sans s'arrêter. Au lieu d'afficher la
    // notification immédiatement, on la programme avec un léger différé
    // (DELAI_CONFIRMATION_SECONDES). Si une sortie de zone est détectée avant ce
    // délai (voir bloc estSortie ci-dessous), on l'annule : ce n'était qu'un passage.
    // LOT 90 — la notification en attente est maintenant gardée PAR LIEU
    // (`geokira_notif_attente` est un objet indexé par lieuId), pour ne pas
    // qu'une entrée au bureau annule par erreur une notification d'arrivée
    // à la maison programmée juste avant (ou l'inverse).
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: titreArrivee,
        body: corpsArrivee,
        data: { type: 'geokira', evenement: 'entree', lieuId: lieu.id },
        sound: true,
      },
      trigger: { seconds: DELAI_CONFIRMATION_SECONDES },
    });
    const attentes = (await getData('geokira_notif_attente')) || {};
    attentes[lieu.id] = { notificationId: notifId, depuis: new Date().toISOString() };
    await setData('geokira_notif_attente', attentes);
    await enregistrerEvenement('entree', lieu);
    await declencherScene(lieu, 'arrivee');
  } else if (estSortie) {
    // LOT 65 — si la notification d'arrivée n'a pas encore été affichée
    // (toujours "en attente" de confirmation) POUR CE LIEU, on l'annule :
    // simple passage.
    const attentes = (await getData('geokira_notif_attente')) || {};
    const attente = attentes[lieu.id];
    if (attente?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(attente.notificationId).catch(() => {});
      delete attentes[lieu.id];
      await setData('geokira_notif_attente', attentes);
    }
    await enregistrerEvenement('sortie', lieu);
    await declencherScene(lieu, 'depart');
  }
});

async function enregistrerEvenement(type, lieu) {
  const historique = (await getData('geokira_historique')) || [];
  // LOT 90 — lieuId/lieuNom ajoutés à chaque entrée, pour pouvoir distinguer
  // plus tard "arrivée à la maison" d'"arrivée au bureau" (utils/geoKiraBriefing.js
  // ne s'intéresse pour l'instant qu'au domicile, mais l'info est conservée).
  const nouvelleEntree = { type, date: new Date().toISOString(), lieuId: lieu.id, lieuNom: lieu.nom };
  const misAJour = [nouvelleEntree, ...historique].slice(0, 50); // garde les 50 derniers
  await setData('geokira_historique', misAJour);
}

/**
 * LOT 57/83, généralisé au lot 90 — allume (arrivée) ou éteint (départ) les
 * appareils choisis comme scène pour CE lieu précis, quel que soit leur
 * driver (Démo, Philips Hue, Tuya, Home Assistant...). Silencieux en cas
 * d'échec sur un appareil (ex: bridge injoignable) — n'empêche jamais la
 * notification.
 *
 * Mêmes garde-fous que depuis le lot 65, maintenant par lieu :
 *  1. Opt-in explicite (lieu.sceneActiveArrivee / lieu.sceneActiveDepart).
 *  2. Cooldown propre à ce lieu et ce type d'évènement (peutDeclencherScene).
 */
async function declencherScene(lieu, type) {
  const actif = type === 'arrivee' ? lieu.sceneActiveArrivee : lieu.sceneActiveDepart;
  if (!actif) return;

  if (!peutDeclencherScene(lieu, type)) return;

  const scene = type === 'arrivee' ? lieu.sceneArrivee : lieu.sceneDepart;
  if (!scene || scene.length === 0) return;

  await Promise.allSettled(
    scene.map(({ driverId, id }) => {
      const driver = getDriver(driverId);
      if (!driver) return Promise.resolve();
      return type === 'arrivee' ? driver.allumer(id) : driver.eteindre(id);
    })
  );

  await marquerSceneDeclenchee(lieu.id, type);
}

// ── Note technique ──
// expo-location expose Location.GeofencingEventType.Enter === 1 et .Exit === 2.
// On compare ici directement aux valeurs numériques stables de la librairie
// (documentées et inchangées depuis plusieurs versions) plutôt que d'importer
// expo-location dans ce fichier, pour éviter tout risque de cycle d'import
// avec geoKira.js selon la façon dont Metro (le bundler) résout les modules.
