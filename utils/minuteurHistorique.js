// ═══════════════════════════════════════════
//  MINUTEURHISTORIQUE.JS — Suivi des sessions Pomodoro
//  Même pattern que guitareProgression.js (lot 13) : sessions brutes
//  horodatées + statistiques calculées à la volée, rien de plus.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_SESSIONS = 'minuteur_sessions';

export async function getSessions() {
  return (await getData(CLE_SESSIONS)) || [];
}

/**
 * Enregistre une session Pomodoro/pause terminée (pas annulée avant la fin).
 * mode = 'pomodoro' | 'courte' | 'longue'
 */
export async function enregistrerSession(mode, dureeMinutes) {
  const sessions = await getSessions();
  const nouvelle = { id: Date.now(), mode, dureeMinutes, date: new Date().toISOString() };
  const misAJour = [...sessions, nouvelle].slice(-300); // garde les 300 dernières
  await setData(CLE_SESSIONS, misAJour);
  return misAJour;
}

export async function getStatistiques() {
  const sessions = await getSessions();
  const aujourdhui = new Date().toDateString();

  const sessionsAujourdhui = sessions.filter(s => new Date(s.date).toDateString() === aujourdhui && s.mode === 'pomodoro');

  const debutSemaine = new Date();
  debutSemaine.setDate(debutSemaine.getDate() - 7);
  const sessionsSemaine = sessions.filter(s => new Date(s.date) >= debutSemaine);
  const minutesSemaine = sessionsSemaine.reduce((acc, s) => acc + (s.dureeMinutes || 0), 0);

  return {
    pomodorosAujourdhui: sessionsAujourdhui.length,
    minutesSemaine,
    totalSessions: sessions.length,
  };
}
