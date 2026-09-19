// ═══════════════════════════════════════════
//  KIRARAPPELSHABITUDES.JS — LOT 87
//  Petits rappels doux quand une habitude suivie dans l'app n'a pas été
//  pratiquée depuis un moment (poids, guitare/chant, méditation) — dans
//  l'esprit "coach de vie" déjà présent dans le ton de Kira, mais
//  proactif plutôt qu'à la demande.
//
//  Même format que les prédictions de utils/kiraBrain.js
//  ({ id, icon, msg, action, color }) pour s'intégrer directement dans la
//  même liste sur l'écran d'accueil, sans logique d'affichage séparée.
//
//  Rédigé au fait constaté, jamais au jugement ("ça fait X jours que...",
//  jamais "tu ne t'entraînes pas assez") — même principe de tact que le
//  reste de l'app (voir kiraActiviteRecente.js).
// ═══════════════════════════════════════════

import { getData } from './storage';
import { getSessions as getSessionsGuitare } from './guitareProgression';
import { PALETTE } from './theme';

const SEUIL_JOURS_POIDS = 8;
const SEUIL_JOURS_GUITARE = 14;
const SEUIL_JOURS_MEDITATION = 14;

function joursDepuis(dateStr) {
  if (!dateStr) return Infinity;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export async function getRappelsHabitudes() {
  const rappels = [];

  // ── Poids (utils/santeManager.js écrit l'historique quotidien ici) ──
  const historiqueSante = (await getData('sante_historique')) || [];
  const entreesAvecPoids = historiqueSante.filter(h => h.poids);
  if (entreesAvecPoids.length > 0) {
    const jours = joursDepuis(entreesAvecPoids[entreesAvecPoids.length - 1].date);
    if (jours >= SEUIL_JOURS_POIDS) {
      rappels.push({ id: 'rappel-poids', icon: '⚖️', msg: `Ça fait ${jours} jours que tu n'as pas noté ton poids.`, action: 'Noter maintenant', color: PALETTE.orange, screen: 'Sante' });
    }
  }

  // ── Guitare / chant (toutes sessions confondues, tous exercices) ──
  const sessions = await getSessionsGuitare();
  if (sessions.length > 0) {
    const jours = joursDepuis(sessions[sessions.length - 1].date);
    if (jours >= SEUIL_JOURS_GUITARE) {
      rappels.push({ id: 'rappel-guitare', icon: '🎸', msg: `Ça fait ${jours} jours sans séance de guitare ou de chant.`, action: 'Voir Guitare', color: PALETTE.magenta, screen: 'Guitare' });
    }
  }

  // ── Méditation ──
  const meditationHistorique = (await getData('meditation_historique')) || [];
  if (meditationHistorique.length > 0) {
    const jours = joursDepuis(meditationHistorique[meditationHistorique.length - 1].date);
    if (jours >= SEUIL_JOURS_MEDITATION) {
      rappels.push({ id: 'rappel-meditation', icon: '🧘', msg: `Ça fait ${jours} jours sans séance de méditation.`, action: 'Méditer un peu', color: PALETTE.violet, screen: 'Meditation' });
    }
  }

  // Volontairement un seul rappel à la fois sur l'accueil (pas une liste de
  // reproches) — le plus ancien en retard passe en premier.
  return rappels.slice(0, 1);
}
