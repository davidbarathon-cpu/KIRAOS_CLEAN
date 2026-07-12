// ═══════════════════════════════════════════
//  HEALTHCONNECTSERVICE.JS — Connexion à Health Connect (lot 45)
//
//  Health Connect est l'app santé centrale d'Android : Fitbit, Garmin
//  Connect, Samsung Health, Withings et d'autres peuvent y écrire leurs
//  données automatiquement (si l'utilisateur l'a activé dans CES
//  applications-là — c'est un réglage à faire une fois dans chacune
//  d'elles, on ne peut pas le faire à leur place). En connectant Kira
//  OS à Health Connect une seule fois, on récupère donc potentiellement
//  les données de tous ces appareils/apps sans intégration séparée
//  pour chacun.
// ═══════════════════════════════════════════

import { Platform, Linking } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  getSdkStatus,
  SdkAvailabilityStatus,
  readRecords,
} from 'react-native-health-connect';

import { mettreAJourSante } from './santeManager';
import { getData, setData } from './storage';

const PERMISSIONS_DEMANDEES = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
];

function extraireNombre(...chemins) {
  for (const v of chemins) {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
  }
  return null;
}

/**
 * Retourne 'disponible' | 'a_installer' | 'a_mettre_a_jour' | 'indisponible'.
 * ⚠️ Correction lot 47 : la version précédente se contentait d'appeler
 * initialize() et considérait tout échec comme "non installé", ce qui
 * était trompeur (Health Connect/Santé Connect peut être installé mais
 * dans un état différent — SDK à mettre à jour, ou simplement pas encore
 * initialisé). On utilise maintenant getSdkStatus(), la fonction prévue
 * précisément pour ce diagnostic.
 */
export async function statutHealthConnect() {
  if (Platform.OS !== 'android') return 'indisponible';
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'disponible';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'a_mettre_a_jour';
    return 'a_installer';
  } catch (e) {
    console.warn('Erreur statutHealthConnect', e.message);
    return 'indisponible';
  }
}

export async function healthConnectDisponible() {
  return (await statutHealthConnect()) === 'disponible';
}

export function ouvrirInstallationHealthConnect() {
  // "market://" ouvre directement l'app Play Store (plus fiable que le
  // lien web sur certains appareils) ; on retombe sur le lien web si
  // le Play Store natif n'est pas disponible.
  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() => {
    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata').catch(() => {});
  });
}

export async function estConnecteAHealthConnect() {
  const prefs = (await getData('prefs')) || {};
  return !!prefs.healthConnectActif;
}

/**
 * Demande les permissions Health Connect à l'utilisateur (affiche l'écran
 * système standard) et enregistre le choix. Retourne { succes, erreur }.
 */
export async function connecterHealthConnect() {
  if (Platform.OS !== 'android') {
    return { succes: false, erreur: 'Disponible uniquement sur Android.' };
  }

  const statut = await statutHealthConnect();
  if (statut === 'a_installer') {
    return { succes: false, erreur: 'NON_INSTALLE' };
  }
  if (statut === 'a_mettre_a_jour') {
    return { succes: false, erreur: 'A_METTRE_A_JOUR' };
  }
  if (statut !== 'disponible') {
    return { succes: false, erreur: 'Health Connect indisponible sur cet appareil.' };
  }

  try {
    // ⚠️ Bug corrigé au lot 47 : il manquait cet appel à initialize()
    // avant requestPermission(). Sans lui, la demande de permission
    // échouait silencieusement et Kira OS n'apparaissait jamais dans la
    // liste des apps autorisées de Santé Connect, même après avoir
    // accepté l'écran (qui, en réalité, ne s'affichait jamais).
    await initialize();

    const accordees = await requestPermission(PERMISSIONS_DEMANDEES);
    if (!accordees || accordees.length === 0) {
      return { succes: false, erreur: 'Aucune permission accordée.' };
    }
    const prefs = (await getData('prefs')) || {};
    await setData('prefs', { ...prefs, healthConnectActif: true });
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

export async function deconnecterHealthConnect() {
  const prefs = (await getData('prefs')) || {};
  await setData('prefs', { ...prefs, healthConnectActif: false });
}

/**
 * Va chercher les données du jour dans Health Connect (pas, calories,
 * fréquence cardiaque la plus récente, sommeil de la nuit dernière,
 * dernier poids enregistré) et les enregistre dans le suivi santé de
 * Kira. Retourne { succes, erreur, sante } — sante contient les
 * données santé mises à jour si succes est vrai.
 */
export async function synchroniserDepuisHealthConnect() {
  if (Platform.OS !== 'android') return { succes: false, erreur: null, sante: null };

  const connecte = await estConnecteAHealthConnect();
  if (!connecte) return { succes: false, erreur: null, sante: null };

  const disponible = await healthConnectDisponible();
  if (!disponible) return { succes: false, erreur: 'NON_INSTALLE', sante: null };

  try {
    // Même remarque : initialize() doit être (re)appelé ici aussi, l'état
    // natif ne survit pas forcément entre deux ouvertures de l'app.
    await initialize();

    const granted = await getGrantedPermissions();
    const aAcces = type => granted.some(p => p.recordType === type);

    const maintenant = new Date();
    const debutJournee = new Date(maintenant);
    debutJournee.setHours(0, 0, 0, 0);
    const debutFenetreSommeil = new Date(maintenant.getTime() - 20 * 60 * 60 * 1000); // 20h en arrière

    const champsAMettreAJour = {};

    // ── Pas ──
    if (aAcces('Steps')) {
      const { records } = await readRecords('Steps', {
        timeRangeFilter: { operator: 'between', startTime: debutJournee.toISOString(), endTime: maintenant.toISOString() },
      });
      const total = (records || []).reduce((somme, r) => somme + (r.count || 0), 0);
      if (total > 0) champsAMettreAJour.pas = total;
    }

    // ── Calories ──
    if (aAcces('TotalCaloriesBurned')) {
      const { records } = await readRecords('TotalCaloriesBurned', {
        timeRangeFilter: { operator: 'between', startTime: debutJournee.toISOString(), endTime: maintenant.toISOString() },
      });
      const total = (records || []).reduce((somme, r) => {
        const kcal = extraireNombre(r.energy?.inKilocalories, r.energy?.inCalories ? r.energy.inCalories / 1000 : null);
        return somme + (kcal || 0);
      }, 0);
      if (total > 0) champsAMettreAJour.cal = Math.round(total);
    }

    // ── Fréquence cardiaque (dernier échantillon connu) ──
    if (aAcces('HeartRate')) {
      const { records } = await readRecords('HeartRate', {
        timeRangeFilter: { operator: 'between', startTime: debutFenetreSommeil.toISOString(), endTime: maintenant.toISOString() },
      });
      const tousLesEchantillons = (records || []).flatMap(r => r.samples || []);
      if (tousLesEchantillons.length > 0) {
        const dernier = tousLesEchantillons[tousLesEchantillons.length - 1];
        if (dernier?.beatsPerMinute) champsAMettreAJour.fc = Math.round(dernier.beatsPerMinute);
      }
    }

    // ── Sommeil de la nuit dernière ──
    if (aAcces('SleepSession')) {
      const { records } = await readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime: debutFenetreSommeil.toISOString(), endTime: maintenant.toISOString() },
      });
      const dureeTotaleMs = (records || []).reduce((somme, r) => {
        const debut = new Date(r.startTime).getTime();
        const fin = new Date(r.endTime).getTime();
        return somme + Math.max(fin - debut, 0);
      }, 0);
      if (dureeTotaleMs > 0) champsAMettreAJour.som = Math.round((dureeTotaleMs / 3600000) * 10) / 10;
    }

    // ── Dernier poids enregistré (fenêtre plus large : 30 jours) ──
    if (aAcces('Weight')) {
      const debutFenetrePoids = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { records } = await readRecords('Weight', {
        timeRangeFilter: { operator: 'between', startTime: debutFenetrePoids.toISOString(), endTime: maintenant.toISOString() },
      });
      if (records && records.length > 0) {
        const dernier = records[records.length - 1];
        const kg = extraireNombre(dernier.weight?.inKilograms);
        if (kg) champsAMettreAJour.poids = Math.round(kg * 10) / 10;
      }
    }

    if (Object.keys(champsAMettreAJour).length === 0) {
      return { succes: true, erreur: null, sante: null }; // connecté mais rien de neuf à remonter
    }

    const sante = await mettreAJourSante(champsAMettreAJour);
    return { succes: true, erreur: null, sante };
  } catch (e) {
    return { succes: false, erreur: e.message, sante: null };
  }
}
