// ═══════════════════════════════════════════
//  NOTIFICATIONS.JS — Gestion centralisée des
//  notifications natives Android (expo-notifications)
//
//  Ce module gère :
//  - La demande de permission à l'utilisateur
//  - La programmation de notifications ponctuelles (rappels)
//  - La programmation de notifications répétées (alarmes quotidiennes)
//  - L'annulation de notifications programmées
// ═══════════════════════════════════════════

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getData, setData } from './storage';

// ── Comportement d'affichage quand une notif arrive app ouverte ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission d'envoyer des notifications.
 * À appeler une fois au démarrage de l'app (dans App.js)
 * et/ou quand l'utilisateur active une notification dans les Paramètres.
 * Retourne true si la permission est accordée.
 */
export async function demanderPermissionNotifications() {
  const { status: statutActuel } = await Notifications.getPermissionsAsync();
  let statutFinal = statutActuel;

  if (statutActuel !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    statutFinal = status;
  }

  // Sur Android, il faut aussi créer un "canal" de notification (obligatoire depuis Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('kira-defaut', {
      name: 'Kira — Rappels et alertes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  return statutFinal === 'granted';
}

export async function verifierPermissionNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Programme une notification ponctuelle dans X secondes.
 * Utile pour les rappels relatifs (ex: "rappelle-moi dans 15 minutes pour le parking").
 */
export async function programmerNotificationDansSecondes(titre, corps, secondes, donnees = {}) {
  return Notifications.scheduleNotificationAsync({
    content: { title: titre, body: corps, data: donnees, sound: true },
    trigger: { seconds: Math.max(secondes, 1), channelId: 'kira-defaut' },
  });
}

/**
 * Programme une notification quotidienne répétée à une heure précise.
 * Utilisé pour : réveils, résumé matinal, rappels guitare, check-in du soir...
 * heure et minute sont des nombres (ex: 7, 30 pour 07h30)
 */
export async function programmerNotificationQuotidienne(titre, corps, heure, minute, donnees = {}) {
  return Notifications.scheduleNotificationAsync({
    content: { title: titre, body: corps, data: donnees, sound: true },
    trigger: {
      hour: heure,
      minute: minute,
      repeats: true,
      channelId: 'kira-defaut',
    },
  });
}

/**
 * Programme une notification répétée certains jours de la semaine seulement.
 * jours = tableau de 7 booléens [Lundi, Mardi, ..., Dimanche] comme utilisé
 * dans le module Réveil. expo-notifications ne supporte pas nativement les
 * "jours sélectionnés" en une seule règle — on programme donc une notif
 * répétée par jour actif, avec un identifiant qui les regroupe.
 */
export async function programmerAlarmeJoursSemaine(titre, corps, heure, minute, joursActifs, donnees = {}) {
  // weekday: 1 = Dimanche, 2 = Lundi, ... 7 = Samedi (convention expo-notifications/iOS)
  // joursActifs est [Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche]
  const mappingWeekday = [2, 3, 4, 5, 6, 7, 1]; // index 0 (Lundi) → weekday 2, etc.
  const idsCreees = [];

  for (let i = 0; i < joursActifs.length; i++) {
    if (!joursActifs[i]) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: titre, body: corps, data: donnees, sound: true },
      trigger: {
        weekday: mappingWeekday[i],
        hour: heure,
        minute: minute,
        repeats: true,
        channelId: 'kira-defaut',
      },
    });
    idsCreees.push(id);
  }
  return idsCreees;
}

/**
 * Annule une ou plusieurs notifications programmées par leur identifiant.
 */
export async function annulerNotifications(ids) {
  const liste = Array.isArray(ids) ? ids : [ids];
  await Promise.all(liste.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

/**
 * Annule absolument toutes les notifications programmées par l'app.
 * Utile pour le bouton "Réinitialiser l'application" des Paramètres.
 */
export async function annulerToutesLesNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Liste les notifications actuellement programmées (utile pour debug
 * ou pour afficher un récapitulatif dans les Paramètres).
 */
export async function listerNotificationsProgrammees() {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ═══════════════════════════════════════════
//  GESTION DES IDS PERSISTÉS PAR FONCTIONNALITÉ
//  (pour pouvoir annuler/remplacer une notif
//  précédente quand l'utilisateur change un réglage)
// ═══════════════════════════════════════════

const CLE_STOCKAGE = 'notif_ids';

async function getIdsStockes() {
  return (await getData(CLE_STOCKAGE)) || {};
}

async function setIdStocke(cle, valeur) {
  const tout = await getIdsStockes();
  await setData(CLE_STOCKAGE, { ...tout, [cle]: valeur });
}

/**
 * Reprogramme une notification quotidienne en remplaçant l'éventuelle
 * précédente (identifiée par "cle", ex: "resume_matinal", "alarme_3").
 */
export async function reprogrammerQuotidienne(cle, titre, corps, heure, minute, donnees = {}) {
  const ids = await getIdsStockes();
  if (ids[cle]) {
    await annulerNotifications(ids[cle]);
  }
  const nouvelId = await programmerNotificationQuotidienne(titre, corps, heure, minute, donnees);
  await setIdStocke(cle, nouvelId);
  return nouvelId;
}

/**
 * Reprogramme une alarme avec jours de la semaine en remplaçant
 * l'éventuel groupe de notifications précédent.
 */
export async function reprogrammerAlarmeJoursSemaine(cle, titre, corps, heure, minute, joursActifs, donnees = {}) {
  const ids = await getIdsStockes();
  if (ids[cle]) {
    await annulerNotifications(ids[cle]);
  }
  const nouveauxIds = await programmerAlarmeJoursSemaine(titre, corps, heure, minute, joursActifs, donnees);
  await setIdStocke(cle, nouveauxIds);
  return nouveauxIds;
}

/**
 * Annule la ou les notifications associées à une clé donnée.
 */
export async function annulerParCle(cle) {
  const ids = await getIdsStockes();
  if (ids[cle]) {
    await annulerNotifications(ids[cle]);
    const tout = await getIdsStockes();
    delete tout[cle];
    await setData(CLE_STOCKAGE, tout);
  }
}
