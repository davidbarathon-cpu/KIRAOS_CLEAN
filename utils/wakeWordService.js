// ═══════════════════════════════════════════
//  WAKEWORDSERVICE.JS — Écoute permanente "Kira" (lot 43)
//
//  Utilise Porcupine (moteur de mot de réveil de Picovoice) pour
//  détecter le mot "Kira" en continu, 100% sur l'appareil — aucun son
//  n'est jamais envoyé sur internet pour cette détection.
//
//  Comme Android tue les tâches en arrière-plan qui n'ont pas de
//  notification visible, on utilise react-native-background-actions
//  pour garder ce service actif même app fermée. C'est Android qui
//  impose la notification persistante "🌟 Kira écoute..." tant que
//  l'écoute est active — impossible de la masquer, c'est une règle du
//  système, pas un choix de Kira OS.
//
//  ⚠️ Limite honnête à connaître : si le téléphone est verrouillé,
//  Android peut empêcher l'app de s'ouvrir directement au moment de la
//  détection (règle de sécurité du système). Dans ce cas, une
//  notification apparaît quand même — il suffit de taper dessus pour
//  parler à Kira.
// ═══════════════════════════════════════════

import { Linking, Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { PorcupineManager } from '@picovoice/porcupine-react-native';
import * as Notifications from 'expo-notifications';

import { getAllApiKeys } from './apiKeys';

// ⚠️ Noms exacts des fichiers générés pour toi par Picovoice Console
// (voir INSTALLATION_LOT43.md). Si tu renommes ces fichiers, mets aussi
// ces deux constantes à jour.
const FICHIER_MOT_CLE = 'kira_fr_android.ppn';
const FICHIER_MODELE_FR = 'porcupine_params_fr.pv';

let managerActif = null;

/**
 * Appelée quand Kira entend son nom. Essaie d'abord d'ouvrir l'app
 * directement sur l'écran d'écoute rapide (fonctionne si le téléphone
 * est déverrouillé ou l'app juste mise en arrière-plan), et envoie
 * systématiquement une notification en secours pour les cas où
 * l'ouverture directe est bloquée par Android (écran verrouillé).
 */
async function surMotCleDetecte() {
  try {
    await Linking.openURL('kiraosclean://ecoute');
  } catch {
    // Pas grave : la notification ci-dessous prend le relais.
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌟 Kira t\'écoute !',
        body: 'Touche ici pour lui parler.',
        data: { url: 'kiraosclean://ecoute' },
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // La notification peut échouer si la permission n'a jamais été
    // accordée — l'ouverture directe ci-dessus reste tentée dans tous les cas.
  }
}

/**
 * La tâche qui tourne en continu dans le service de premier plan
 * Android tant que l'écoute permanente est activée.
 */
const tacheEcoutePermanente = async () => {
  const keys = await getAllApiKeys();
  const accessKey = keys?.picovoice;

  if (!accessKey) {
    console.warn('Écoute permanente Kira : aucune clé Picovoice configurée.');
    return;
  }

  try {
    managerActif = await PorcupineManager.fromKeywordPaths(
      accessKey,
      [FICHIER_MOT_CLE],
      () => { surMotCleDetecte(); },
      erreur => { console.warn('Erreur Porcupine', erreur); },
      FICHIER_MODELE_FR
    );
    await managerActif.start();
  } catch (e) {
    console.warn('Impossible de démarrer Porcupine', e);
    return;
  }

  // Garde la tâche "en vie" tant que le service tourne — BackgroundService
  // considère la tâche terminée dès que cette fonction se termine.
  while (BackgroundService.isRunning()) {
    await new Promise(r => setTimeout(r, 5000));
  }
};

const OPTIONS_SERVICE = {
  taskName: 'KiraEcoute',
  taskTitle: '🌟 Kira écoute...',
  taskDesc: 'Dis "Kira" à tout moment pour lui parler.',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#6C63FF',
  linkingURI: 'kiraosclean://ecoute',
  parameters: {},
};

/**
 * Démarre l'écoute permanente. Retourne { succes, erreur } — erreur
 * peut valoir 'AUCUNE_CLE' si aucune clé Picovoice n'est configurée.
 */
export async function demarrerEcoutePermanente() {
  if (Platform.OS !== 'android') {
    return { succes: false, erreur: 'Disponible uniquement sur Android.' };
  }

  const keys = await getAllApiKeys();
  if (!keys?.picovoice) {
    return { succes: false, erreur: 'AUCUNE_CLE' };
  }

  try {
    await BackgroundService.start(tacheEcoutePermanente, OPTIONS_SERVICE);
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

export async function arreterEcoutePermanente() {
  if (Platform.OS !== 'android') return;
  try {
    if (managerActif) {
      await managerActif.stop();
      await managerActif.delete();
      managerActif = null;
    }
    await BackgroundService.stop();
  } catch (e) {
    console.warn('Erreur arrêt écoute permanente', e);
  }
}

export function ecoutePermanenteActive() {
  if (Platform.OS !== 'android') return false;
  return BackgroundService.isRunning();
}
