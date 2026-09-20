// ═══════════════════════════════════════════
//  GEOKIRABRIEFING.JS — LOT 56, adapté au multi-lieux LOT 90
//  Transforme l'historique brut de Géo-Kira (entrées/sorties
//  détectées par le geofencing du lot 54) en texte exploitable
//  par Kira, que ce soit en réponse directe dans le chat ou en
//  contexte injecté dans le prompt système envoyé à l'IA en ligne.
//
//  LOT 90 — l'historique contient désormais des évènements de plusieurs
//  lieux (domicile, bureau...). Ces fonctions restent volontairement
//  centrées sur le domicile (c'est ce que "tu es rentré" veut dire dans le
//  langage courant) — filtre sur lieuId === 'domicile'. Une évolution
//  future pourrait élargir Kira pour qu'elle parle aussi des arrivées au
//  bureau si on le souhaite, mais ce n'est pas ce qui a été demandé ici.
// ═══════════════════════════════════════════

import { getHistoriqueGeoKira, getLieu } from './geoKira';

function formatHeure(dateIso) {
  return new Date(dateIso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateCourt(dateIso) {
  const d = new Date(dateIso);
  const aujourdHui = new Date();
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  if (d.toDateString() === aujourdHui.toDateString()) return "aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Détecte si le message de l'utilisateur porte sur Géo-Kira / ses horaires
 * d'arrivée à la maison. Volontairement simple (mots-clés), même principe
 * que les autres détecteurs de kiraIntents.js.
 */
export function detecterDemandeGeoKira(message) {
  const low = message.toLowerCase();
  return [
    'rentré', 'rentree', 'quand suis-je rentré', 'quand je suis rentré',
    'arrivé à la maison', 'arrive a la maison', 'geo-kira', 'geo kira',
    'géo-kira', 'géo kira',
  ].some(w => low.includes(w));
}

/**
 * Génère une réponse directe (mode hors-ligne ET mode IA — utilisée dans
 * les deux cas quand l'intention Géo-Kira est détectée, comme pour les
 * actualités ou la traduction).
 */
export async function genererReponseGeoKira() {
  const [historique, domicile] = await Promise.all([getHistoriqueGeoKira(), getLieu('domicile')]);

  if (!domicile) {
    return "Je ne connais pas encore l'adresse de ton domicile 🏠 — configure-la dans Paramètres → 🌟 Kira → 📍 Géo-Kira, et j'pourrai ensuite te dire quand tu rentres !";
  }

  const entrees = historique.filter(e => e.type === 'entree' && e.lieuId === 'domicile').slice(0, 5);
  if (entrees.length === 0) {
    return "Je n'ai pas encore détecté d'arrivée chez toi 🏠 — vérifie que le switch Géo-Kira est bien activé dans Paramètres, et que la permission de localisation est sur \"Toujours autoriser\".";
  }

  const lignes = entrees.map(e => `• ${formatDateCourt(e.date)} à ${formatHeure(e.date)}`);
  return ['🏠 Tes dernières arrivées à la maison détectées par Géo-Kira :', '', ...lignes].join('\n');
}

/**
 * Génère une courte phrase de contexte (ou null si rien à dire) — à injecter
 * dans le prompt système envoyé à l'IA en ligne (aiCaller.js), pour que
 * Kira "sache" nativement à quelle heure tu es rentré même sans qu'on lui
 * pose la question directement (ex: "tu sembles fatigué, tu es rentré tard
 * hier soir...").
 */
export async function genererContexteGeoKira() {
  const [historique, domicile] = await Promise.all([getHistoriqueGeoKira(), getLieu('domicile')]);
  if (!domicile) return null;

  const derniereEntree = historique.find(e => e.type === 'entree' && e.lieuId === 'domicile');
  if (!derniereEntree) return null;

  return `Dernière arrivée à la maison détectée par Géo-Kira : ${formatDateCourt(derniereEntree.date)} à ${formatHeure(derniereEntree.date)}.`;
}
