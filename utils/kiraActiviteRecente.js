// ═══════════════════════════════════════════
//  KIRAACTIVITERECENTE.JS — Contexte des modules Humeur, Objectifs,
//  Minuteur et Méditation pour le chat de Kira (lot 73).
//
//  Même pattern que kiraMemoire.js / geoKiraBriefing.js : une fonction qui
//  construit un petit bout de texte à injecter dans le prompt système,
//  et une chaîne vide si rien de pertinent à signaler (pour ne jamais
//  ajouter un paragraphe creux si l'utilisateur n'utilise pas ces
//  modules).
//
//  ⚠️ Consigne de rédaction du prompt IMPORTANTE, à ne pas retirer si ce
//  fichier est modifié : on transmet des FAITS que l'utilisateur a
//  lui-même déclarés (son propre choix d'emoji d'humeur, ses propres
//  objectifs) — Kira doit les utiliser avec tact, jamais comme base d'un
//  diagnostic ou d'une affirmation sur l'état mental de l'utilisateur.
// ═══════════════════════════════════════════

import { getData } from './storage';
import { getStatistiques as getStatistiquesMinuteur } from './minuteurHistorique';

export async function construireContexteActiviteRecente() {
  const [humeurHistorique, objectifs, statsMinuteur, meditationHistorique] = await Promise.all([
    getData('humeur_historique'),
    getData('objectifs_liste'),
    getStatistiquesMinuteur(),
    getData('meditation_historique'),
  ]);

  const lignes = [];

  // ── Humeur ──
  if (Array.isArray(humeurHistorique) && humeurHistorique.length > 0) {
    const derniere = humeurHistorique[humeurHistorique.length - 1];
    const septDerniers = humeurHistorique.slice(-7);
    if (septDerniers.length >= 3) {
      const moyenne = septDerniers.reduce((acc, e) => acc + (e.score || 0), 0) / septDerniers.length;
      lignes.push(`Humeur la plus récemment notée par l'utilisateur : "${derniere.label}" ${derniere.emoji} (moyenne des 7 derniers jours : ${moyenne.toFixed(1)}/10)`);
    } else {
      lignes.push(`Humeur la plus récemment notée par l'utilisateur : "${derniere.label}" ${derniere.emoji}`);
    }
  }

  // ── Objectifs ──
  if (Array.isArray(objectifs) && objectifs.length > 0) {
    const enCours = objectifs.filter(o => o.progres < 100);
    const termines = objectifs.filter(o => o.progres >= 100);
    if (enCours.length > 0) {
      const liste = enCours.slice(0, 3).map(o => `"${o.titre}" (${o.progres}%)`).join(', ');
      lignes.push(`Objectifs personnels en cours : ${liste}${enCours.length > 3 ? '...' : ''}`);
    }
    if (termines.length > 0) {
      lignes.push(`${termines.length} objectif${termines.length > 1 ? 's' : ''} personnel${termines.length > 1 ? 's' : ''} déjà atteint${termines.length > 1 ? 's' : ''}`);
    }
  }

  // ── Minuteur / Pomodoro ──
  if (statsMinuteur?.pomodorosAujourdhui > 0) {
    lignes.push(`${statsMinuteur.pomodorosAujourdhui} session${statsMinuteur.pomodorosAujourdhui > 1 ? 's' : ''} Pomodoro déjà complétée${statsMinuteur.pomodorosAujourdhui > 1 ? 's' : ''} aujourd'hui`);
  }

  // ── Méditation ──
  if (Array.isArray(meditationHistorique) && meditationHistorique.length > 0) {
    const aujourdhui = new Date().toDateString();
    const seanceAujourdhui = meditationHistorique.find(s => new Date(s.date).toDateString() === aujourdhui);
    if (seanceAujourdhui) {
      lignes.push("Une séance de méditation a déjà été faite aujourd'hui");
    }
  }

  if (lignes.length === 0) return '';

  return `

Activité récente de l'utilisateur dans l'app (données qu'il a lui-même déclarées — utilise-les avec tact, pour personnaliser ta réponse si c'est pertinent, mais NE fais jamais de diagnostic ni d'affirmation sur son état mental ou émotionnel à partir de ces seules données) :
${lignes.map(l => `- ${l}`).join('\n')}`;
}
