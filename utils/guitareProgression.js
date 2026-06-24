// ═══════════════════════════════════════════
//  GUITAREPROGRESSION.JS — Suivi automatique
//  Enregistre chaque session d'exercice réellement
//  pratiquée (BPM atteint, durée, date) et calcule
//  la progression dans le temps. Alimente à la fois
//  l'écran de suivi et le PDF d'export du lot 13
//  (qui utilisait des données d'exemple jusqu'ici).
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_PROGRESSION = 'guitare_progression';
const CLE_SESSIONS = 'guitare_sessions';

/**
 * Structure d'une entrée de progression (une par exercice unique) :
 * { exercice, type: 'guitare'|'chant', bpmActuel, bpmObjectif,
 *   derniereSession (date lisible), nbSessions, historiqueBpm: [{date, bpm}] }
 *
 * Structure d'une session brute enregistrée :
 * { id, exercice, type, bpm, dureeMinutes, date (ISO) }
 */

function formatDateLisible(isoDate) {
  const d = new Date(isoDate);
  const aujourd_hui = new Date();
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);

  if (d.toDateString() === aujourd_hui.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export async function getProgression() {
  return (await getData(CLE_PROGRESSION)) || [];
}

export async function getSessions() {
  return (await getData(CLE_SESSIONS)) || [];
}

/**
 * Enregistre une session pratiquée. À appeler quand l'utilisateur termine
 * un exercice (typiquement : arrête le métronome après avoir pratiqué, ou
 * quitte l'écran de détail d'un exercice après y avoir passé du temps).
 *
 * exercice = nom de l'exercice (ex: "Pentatonique mineure")
 * type = 'guitare' | 'chant'
 * bpmAtteint = BPM auquel l'utilisateur a pratiqué (0 si exercice sans métronome)
 * bpmObjectif = BPM cible de l'exercice (vient des données de SERIES_GUITARE)
 * dureeMinutes = durée approximative de la session
 */
export async function enregistrerSession(exercice, type, bpmAtteint, bpmObjectif, dureeMinutes = 5) {
  const sessions = await getSessions();
  const nouvelleSession = {
    id: Date.now(),
    exercice,
    type,
    bpm: bpmAtteint,
    dureeMinutes,
    date: new Date().toISOString(),
  };
  const sessionsActualisees = [...sessions, nouvelleSession].slice(-200); // garde les 200 dernières
  await setData(CLE_SESSIONS, sessionsActualisees);

  // Met à jour (ou crée) l'entrée de progression correspondante
  const progression = await getProgression();
  const indexExistant = progression.findIndex(p => p.exercice === exercice);

  if (indexExistant >= 0) {
    const entree = progression[indexExistant];
    const nouveauBpmActuel = bpmAtteint > entree.bpmActuel ? bpmAtteint : entree.bpmActuel;
    const historique = [...(entree.historiqueBpm || []), { date: nouvelleSession.date, bpm: bpmAtteint }].slice(-30);
    progression[indexExistant] = {
      ...entree,
      bpmActuel: nouveauBpmActuel,
      derniereSession: formatDateLisible(nouvelleSession.date),
      derniereSessionIso: nouvelleSession.date,
      nbSessions: (entree.nbSessions || 0) + 1,
      historiqueBpm: historique,
    };
  } else {
    progression.push({
      exercice,
      type,
      bpmActuel: bpmAtteint,
      bpmObjectif: bpmObjectif || bpmAtteint,
      derniereSession: formatDateLisible(nouvelleSession.date),
      derniereSessionIso: nouvelleSession.date,
      nbSessions: 1,
      historiqueBpm: [{ date: nouvelleSession.date, bpm: bpmAtteint }],
    });
  }

  await setData(CLE_PROGRESSION, progression);
  return progression;
}

/**
 * Calcule des statistiques globales utiles pour l'écran de suivi et le PDF.
 */
export async function getStatistiquesGlobales() {
  const sessions = await getSessions();
  const progression = await getProgression();

  const maintenant = new Date();
  const debutSemaine = new Date(maintenant);
  debutSemaine.setDate(maintenant.getDate() - 7);

  const sessionsSemaine = sessions.filter(s => new Date(s.date) >= debutSemaine);
  const minutesSemaine = sessionsSemaine.reduce((total, s) => total + (s.dureeMinutes || 0), 0);

  // Calcule une série de jours consécutifs avec au moins une session (streak)
  const joursAvecSession = new Set(sessions.map(s => new Date(s.date).toDateString()));
  let streak = 0;
  let jourCourant = new Date();
  while (joursAvecSession.has(jourCourant.toDateString())) {
    streak++;
    jourCourant.setDate(jourCourant.getDate() - 1);
  }

  return {
    totalSessions: sessions.length,
    minutesSemaine,
    streak,
    nbExercicesTravailles: progression.length,
    progressionMoyenne: progression.length > 0
      ? Math.round(progression.reduce((acc, p) => acc + (p.bpmObjectif ? (p.bpmActuel / p.bpmObjectif) * 100 : 0), 0) / progression.length)
      : 0,
  };
}

/**
 * Retourne l'historique formaté pour le tableau du module Santé/Guitare
 * (les 7 derniers jours avec activité, regroupés).
 */
export async function getHistoriqueRecent(nombreJours = 7) {
  const sessions = await getSessions();
  const maintenant = new Date();
  const limite = new Date(maintenant);
  limite.setDate(maintenant.getDate() - nombreJours);

  const sessionsRecentes = sessions.filter(s => new Date(s.date) >= limite);
  const parJour = {};

  sessionsRecentes.forEach(s => {
    const jourKey = new Date(s.date).toDateString();
    if (!parJour[jourKey]) parJour[jourKey] = { date: formatDateLisible(s.date), minutes: 0, exercices: [] };
    parJour[jourKey].minutes += s.dureeMinutes || 0;
    parJour[jourKey].exercices.push(s.exercice);
  });

  return Object.values(parJour).reverse();
}
