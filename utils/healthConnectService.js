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

export async function healthConnectDisponible() {
  if (Platform.OS !== 'android') return false;
  try {
    return await initialize();
  } catch {
    return false;
  }
}

export function ouvrirInstallationHealthConnect() {
  Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata').catch(() => {});
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

  const disponible = await healthConnectDisponible();
  if (!disponible) {
    return { succes: false, erreur: 'NON_INSTALLE' };
  }

  try {
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
