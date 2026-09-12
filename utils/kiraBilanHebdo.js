// ═══════════════════════════════════════════
//  KIRABILANHEBDO.JS — Bilan hebdomadaire de Kira (lot 76)
//  Étend le principe du résumé matinal (une journée) à une synthèse sur
//  7 jours, en puisant dans santé, guitare, budget, objectifs et humeur —
//  demande explicite du cahier des charges initial ("Kira devra...
//  proposer un résumé... en puisant dans tous les modules"), jusqu'ici
//  seulement fait à l'échelle d'une journée (utils/kiraBriefing.js).
//
//  Comme pour kiraActiviteRecente.js (lot 73/74) : les données viennent
//  de ce que l'utilisateur a lui-même déclaré (humeur, objectifs...) —
//  Kira les restitue avec tact, jamais comme base d'un diagnostic.
// ═══════════════════════════════════════════

import { getData } from './storage';
import { getSanteDuJour } from './santeManager';
import { getStatistiquesGlobales as getStatsGuitare } from './guitareProgression';

function debutSemaine() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export async function genererBilanHebdomadaire() {
  const [sante, statsGuitare, humeurHistorique, objectifs, budgetDepenses, budgetMensuel, profil] = await Promise.all([
    getSanteDuJour(),
    getStatsGuitare(),
    getData('humeur_historique'),
    getData('objectifs_liste'),
    getData('budget_depenses'),
    getData('budget_mensuel'),
    getData('profil'),
  ]);

  const nom = profil?.prenom || profil?.nom || '';
  const seuil = debutSemaine();
  const paragraphes = [];

  paragraphes.push(`🌟 Bilan de ta semaine${nom ? `, ${nom}` : ''} !`);

  // ── Santé (snapshot du jour, pas d'historique 7 jours disponible pour l'instant) ──
  if (sante && (sante.pas || sante.som)) {
    const pctPas = sante.oP ? Math.round(((sante.pas || 0) / sante.oP) * 100) : null;
    paragraphes.push(
      `❤️ Santé : ${sante.pas ?? '?'} pas aujourd'hui${pctPas !== null ? ` (${pctPas}% de ton objectif)` : ''}, ` +
      `sommeil moyen récent autour de ${sante.som ?? '?'}h.`
    );
  }

  // ── Guitare & chant ──
  if (statsGuitare && statsGuitare.totalSessions > 0) {
    paragraphes.push(
      `🎸 Musique : ${statsGuitare.minutesSemaine} minutes pratiquées cette semaine, ` +
      `${statsGuitare.streak > 0 ? `${statsGuitare.streak} jour${statsGuitare.streak > 1 ? 's' : ''} de suite 🔥` : 'reprends le rythme quand tu veux'}.`
    );
  }

  // ── Budget ──
  if (Array.isArray(budgetDepenses) && budgetDepenses.length > 0) {
    const depensesSemaine = budgetDepenses.filter(d => new Date(d.date) >= seuil);
    const totalSemaine = depensesSemaine.reduce((acc, d) => acc + d.montant, 0);
    if (totalSemaine > 0) {
      paragraphes.push(
        `💰 Budget : ${totalSemaine.toFixed(0)} € dépensés cette semaine` +
        `${budgetMensuel ? ` (objectif mensuel : ${budgetMensuel.toFixed(0)} €)` : ''}.`
      );
    }
  }

  // ── Objectifs ──
  if (Array.isArray(objectifs) && objectifs.length > 0) {
    const enCours = objectifs.filter(o => o.progres < 100);
    const termines = objectifs.filter(o => o.progres >= 100);
    if (enCours.length > 0 || termines.length > 0) {
      const bouts = [];
      if (enCours.length > 0) bouts.push(`${enCours.length} objectif${enCours.length > 1 ? 's' : ''} en cours`);
      if (termines.length > 0) bouts.push(`${termines.length} atteint${termines.length > 1 ? 's' : ''} 🎉`);
      paragraphes.push(`🎯 Objectifs : ${bouts.join(', ')}.`);
    }
  }

  // ── Humeur (tendance sur 7 jours) ──
  if (Array.isArray(humeurHistorique) && humeurHistorique.length > 0) {
    const septDerniers = humeurHistorique.filter(e => new Date(e.date) >= seuil);
    if (septDerniers.length >= 2) {
      const moyenne = septDerniers.reduce((acc, e) => acc + (e.score || 0), 0) / septDerniers.length;
      const tendanceTexte = moyenne >= 7
        ? 'une semaine plutôt positive dans l\'ensemble 🌟'
        : moyenne <= 4
          ? 'une semaine qui a semblé difficile — prends soin de toi'
          : 'une semaine dans la moyenne, avec des hauts et des bas';
      paragraphes.push(`😊 Humeur : ${septDerniers.length} jour${septDerniers.length > 1 ? 's' : ''} noté${septDerniers.length > 1 ? 's' : ''}, ${tendanceTexte}.`);
    }
  }

  if (paragraphes.length === 1) {
    paragraphes.push("Pas encore assez de données cette semaine pour un vrai bilan — reviens dans quelques jours, ou utilise un peu plus les modules Humeur, Objectifs, Budget et Guitare !");
  }

  return paragraphes.join('\n\n');
}
