// ═══════════════════════════════════════════
//  KIRABRIEFING.JS — "Kira-Podcast" : le résumé
//  matinal lu à voix haute par Kira (lot 48).
//
//  C'est en fait un morceau du cahier des charges d'origine jamais
//  concrétisé : "Elle devra aussi me proposer un résumé matinal sur
//  la journée à venir, en puisant dans tous les modules, dicton,
//  agenda, météo, actualités, etc." Ce module compose ce texte, et
//  utilise kiraVoix.js (lot 82 — voix naturelle Gemini avec repli sur
//  expo-speech) pour le lire à voix haute.
// ═══════════════════════════════════════════

import { arreterVoixKira, parlerAvecVoixKira } from './kiraVoix';

/**
 * Construit le texte du briefing à partir de données déjà chargées
 * par l'écran appelant (pas d'appel réseau ici — volontairement rapide
 * et fiable, cohérent avec ce que l'utilisateur voit déjà à l'écran).
 *
 * data attendu : { prenom, heure, kiraState, meteo: {temp, icon},
 *   agenda: [...], sante: {...}, dicton: {t, a}, activite: {...} }
 *   (activite est optionnel — voir utils/kiraActiviteRecente.js,
 *   getResumeActivitePourBriefing(), lot 74)
 */
export function genererTexteBriefing(data) {
  const { prenom, heure, kiraState, meteo, agenda = [], sante = {}, dicton, activite } = data;
  const nom = prenom || '';
  const phrases = [];

  // ── Salutation adaptée à l'heure ──
  const h = parseInt(heure, 10) || new Date().getHours();
  const salutation = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  phrases.push(`${salutation}${nom ? ' ' + nom : ''} ! Voici ton briefing.`);

  // ── Météo ──
  if (meteo?.temp !== null && meteo?.temp !== undefined) {
    phrases.push(`Il fait actuellement ${meteo.temp} degrés dehors.`);
  }

  // ── Agenda ──
  if (agenda.length === 0) {
    phrases.push("Aucun événement de prévu aujourd'hui — une journée libre.");
  } else {
    const prochain = agenda[0];
    phrases.push(
      agenda.length === 1
        ? `Tu as un seul événement aujourd'hui : ${prochain.t}, à ${prochain.h}.`
        : `Tu as ${agenda.length} événements aujourd'hui. Le premier : ${prochain.t}, à ${prochain.h}.`
    );
  }

  // ── Santé ──
  if (sante.som !== undefined && sante.som > 0) {
    phrases.push(
      sante.som < 7
        ? `Côté sommeil, seulement ${sante.som} heures cette nuit — essaie de te coucher un peu plus tôt ce soir.`
        : `Tu as bien dormi cette nuit, ${sante.som} heures.`
    );
  }
  if (sante.eau !== undefined && sante.oEau) {
    const pct = Math.round((sante.eau / sante.oEau) * 100);
    if (pct < 30 && h >= 10) phrases.push("Pense à boire un peu d'eau, tu es encore loin de ton objectif du jour.");
  }

  // ── Mode Kira ──
  const modeTexte = kiraState === 'rush' ? 'plutôt chargée — je resterai directe et efficace avec toi'
    : kiraState === 'recovery' ? 'calme — profites-en pour prendre soin de toi'
    : 'plutôt fluide et créative';
  phrases.push(`La journée s'annonce ${modeTexte}.`);

  // ── Activité récente (Humeur / Objectifs / Minuteur / Méditation, lot 74) ──
  // Volontairement discret et jamais interprétatif à l'oral : on rapporte
  // des faits que l'utilisateur a lui-même déclarés (son propre choix
  // d'humeur, ses propres objectifs), sans jamais poser de diagnostic ni
  // d'affirmation sur son état — même consigne que pour le chat (voir
  // utils/kiraActiviteRecente.js).
  if (activite?.humeur) {
    phrases.push(`Tu avais noté te sentir plutôt "${activite.humeur.label}" récemment.`);
  }
  if (activite?.objectifsEnCours > 0) {
    phrases.push(`Tu as ${activite.objectifsEnCours} objectif${activite.objectifsEnCours > 1 ? 's' : ''} personnel${activite.objectifsEnCours > 1 ? 's' : ''} en cours.`);
  }

  // ── Dicton ──
  if (dicton?.t) {
    phrases.push(`Pour t'accompagner : "${dicton.t}", ${dicton.a ? 'de ' + dicton.a : ''}.`);
  }

  phrases.push('Bonne journée !');

  return phrases.join(' ');
}

// ═══════════════════════════════════════════
//  LOT 87 — Résumé du soir, symétrique du briefing matinal ci-dessus.
//
//  Contrairement au briefing du matin, ne parle PAS de l'agenda du
//  lendemain : le modèle de données de l'Agenda (utils/googleCalendar.js,
//  AgendaScreen.js) ne conserve pas de date par événement, seulement une
//  heure — toute la logique actuelle suppose "aujourd'hui". Ajouter une
//  vraie notion de "demain" demanderait de faire transiter un champ date
//  partout (stockage local + conversion Google + création d'événement),
//  un chantier plus large qu'un simple résumé du soir. En attendant, ce
//  résumé se concentre sur ce qui est fiable : le bilan de la journée
//  écoulée (objectifs, méditation, humeur, eau) — voir
//  utils/kiraActiviteRecente.js, déjà utilisé par le briefing du matin.
// ═══════════════════════════════════════════

/**
 * data attendu : { prenom, activite (voir getResumeActivitePourBriefing),
 *   sante: {eau, oEau}, dicton }
 */
export function genererTexteBriefingSoir(data) {
  const { prenom, activite, sante = {}, dicton } = data;
  const nom = prenom || '';
  const phrases = [];

  phrases.push(`Bonsoir${nom ? ' ' + nom : ''} ! Petit récap avant de te reposer.`);

  // ── Méditation ──
  if (activite?.meditationFaiteAujourdhui) {
    phrases.push('Tu as pris le temps de méditer aujourd\'hui, belle habitude.');
  } else {
    phrases.push('Tu n\'as pas encore pris de moment de méditation aujourd\'hui — même cinq minutes peuvent aider à bien dormir, si le cœur t\'en dit.');
  }

  // ── Objectifs ──
  if (activite?.objectifsEnCours > 0) {
    phrases.push(`Tu as ${activite.objectifsEnCours} objectif${activite.objectifsEnCours > 1 ? 's' : ''} personnel${activite.objectifsEnCours > 1 ? 's' : ''} en cours.`);
  }

  // ── Pomodoro / concentration ──
  if (activite?.pomodorosAujourdhui > 0) {
    phrases.push(`Côté concentration, ${activite.pomodorosAujourdhui} session${activite.pomodorosAujourdhui > 1 ? 's' : ''} terminée${activite.pomodorosAujourdhui > 1 ? 's' : ''} aujourd'hui, bien joué.`);
  }

  // ── Eau ──
  if (sante.eau !== undefined && sante.oEau) {
    const pct = Math.round((sante.eau / sante.oEau) * 100);
    if (pct < 70) phrases.push(`Tu n'as bu que ${pct}% de ton objectif d'eau aujourd'hui — un dernier verre avant de dormir ne fera pas de mal.`);
  }

  // ── Humeur (même consigne de tact que le briefing du matin : on
  // rapporte un fait déclaré par l'utilisateur, jamais un diagnostic) ──
  if (activite?.humeur) {
    phrases.push(`Tu avais noté te sentir plutôt "${activite.humeur.label}" aujourd'hui.`);
  }

  if (dicton?.t) {
    phrases.push(`Pour finir la journée en douceur : "${dicton.t}", ${dicton.a ? 'de ' + dicton.a : ''}.`);
  }

  phrases.push('Bonne nuit !');

  return phrases.join(' ');
}

let enCoursDeLecture = false;

export function lireBriefing(texte, { onDebut, onFin } = {}) {
  if (enCoursDeLecture) {
    arreterVoixKira();
    enCoursDeLecture = false;
    onFin?.();
    return;
  }
  enCoursDeLecture = true;
  onDebut?.();
  parlerAvecVoixKira(texte, {
    onFin: () => { enCoursDeLecture = false; onFin?.(); },
  });
}

export function arreterBriefing() {
  arreterVoixKira();
  enCoursDeLecture = false;
}
