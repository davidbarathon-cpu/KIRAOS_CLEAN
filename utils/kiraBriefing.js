// ═══════════════════════════════════════════
//  KIRABRIEFING.JS — "Kira-Podcast" : le résumé
//  matinal lu à voix haute par Kira (lot 48).
//
//  C'est en fait un morceau du cahier des charges d'origine jamais
//  concrétisé : "Elle devra aussi me proposer un résumé matinal sur
//  la journée à venir, en puisant dans tous les modules, dicton,
//  agenda, météo, actualités, etc." Ce module compose ce texte, et
//  utilise expo-speech (déjà utilisé ailleurs dans l'app, pour le
//  chat et l'écoute rapide) pour le lire à voix haute.
// ═══════════════════════════════════════════

import * as Speech from 'expo-speech';

/**
 * Construit le texte du briefing à partir de données déjà chargées
 * par l'écran appelant (pas d'appel réseau ici — volontairement rapide
 * et fiable, cohérent avec ce que l'utilisateur voit déjà à l'écran).
 *
 * data attendu : { prenom, heure, kiraState, meteo: {temp, icon},
 *   agenda: [...], sante: {...}, dicton: {t, a} }
 */
export function genererTexteBriefing(data) {
  const { prenom, heure, kiraState, meteo, agenda = [], sante = {}, dicton } = data;
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

  // ── Dicton ──
  if (dicton?.t) {
    phrases.push(`Pour t'accompagner : "${dicton.t}", ${dicton.a ? 'de ' + dicton.a : ''}.`);
  }

  phrases.push('Bonne journée !');

  return phrases.join(' ');
}

let enCoursDeLecture = false;

export function lireBriefing(texte, { onDebut, onFin } = {}) {
  if (enCoursDeLecture) {
    Speech.stop();
    enCoursDeLecture = false;
    onFin?.();
    return;
  }
  enCoursDeLecture = true;
  onDebut?.();
  Speech.speak(texte, {
    language: 'fr-FR',
    onDone: () => { enCoursDeLecture = false; onFin?.(); },
    onStopped: () => { enCoursDeLecture = false; onFin?.(); },
    onError: () => { enCoursDeLecture = false; onFin?.(); },
  });
}

export function arreterBriefing() {
  Speech.stop();
  enCoursDeLecture = false;
}
