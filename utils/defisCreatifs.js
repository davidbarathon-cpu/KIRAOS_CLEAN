// ═══════════════════════════════════════════
//  DEFISCREATIFS.JS — Mode Hasard Créatif (lot 51)
//
//  Un défi différent chaque jour pour sortir de la routine des
//  exercices habituels — même principe de rotation par date que
//  cuisineCaller.js / horoscopeCaller.js (déterministe : même date =
//  même défi tant qu'on ne force pas un nouveau tirage).
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_STOCKAGE = 'defis_creatifs';

const DEFIS_GUITARE = [
  'Travaille ta gamme pentatonique mais uniquement sur deux cordes aujourd\'hui.',
  'Improvise 30 secondes sans regarder tes doigts une seule fois.',
  'Apprends un accord que tu ne connais pas encore et enchaîne-le avec un accord familier.',
  'Joue ton exercice habituel deux fois plus lentement que d\'habitude — la précision avant la vitesse.',
  'Compose une progression de 4 accords en changeant à chaque fois d\'accord de départ.',
  'Joue uniquement en fingerpicking aujourd\'hui, même les morceaux que tu joues habituellement au médiator.',
  'Trouve trois façons différentes de jouer le même accord sur le manche.',
  'Enregistre-toi en jouant 1 minute, puis réécoute-toi immédiatement après.',
  'Joue les yeux fermés pendant 2 minutes — laisse tes oreilles guider tes doigts.',
  'Essaie un rythme de strumming complètement nouveau sur un morceau que tu connais déjà.',
  'Improvise sur une seule corde pendant 1 minute — explore toutes les nuances possibles.',
  'Change la tonalité d\'un morceau que tu connais et rejoue-le entièrement.',
];

const DEFIS_CHANT = [
  'Chante ta vocalise habituelle une octave plus bas que d\'habitude.',
  'Enregistre-toi en train de chanter 30 secondes, puis réécoute pour repérer un point à améliorer.',
  'Chante en marchant dans la pièce — la respiration change, observe l\'effet sur ta voix.',
  'Essaie de chanter un refrain que tu aimes sans les paroles, juste sur "la".',
  'Fais 5 minutes de sirènes vocales avant tout le reste aujourd\'hui, rien d\'autre.',
  'Chante un couplet en chuchotant pour te concentrer uniquement sur la justesse.',
  'Double ta respiration habituelle avant de chanter — inspire deux fois plus longtemps que d\'habitude.',
  'Chante devant un miroir et observe ta posture pendant 2 minutes.',
  'Essaie d\'imiter le style vocal d\'un chanteur que tu admires sur une phrase courte.',
  'Chante ta gamme préférée en changeant d\'émotion à chaque note (joyeux, triste, en colère...).',
];

function choisirParSeed(tableau, seedTexte) {
  let hash = 0;
  for (let i = 0; i < seedTexte.length; i++) {
    hash = (hash * 31 + seedTexte.charCodeAt(i)) >>> 0;
  }
  return { texte: tableau[hash % tableau.length], index: hash % tableau.length };
}

/**
 * Retourne le défi du jour pour 'guitare' ou 'chant'. Si forcerNouveau
 * est vrai, tire un défi différent du dernier affiché (au lieu de
 * rester sur le même toute la journée) — utile pour le bouton "🎲
 * Nouveau défi" quand l'utilisateur veut varier davantage.
 */
export async function getDefiDuJour(categorie, forcerNouveau = false) {
  const pool = categorie === 'chant' ? DEFIS_CHANT : DEFIS_GUITARE;
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR');
  const cache = (await getData(CLE_STOCKAGE)) || {};
  const cle = `${categorie}_${dateAujourdhui}`;

  if (!forcerNouveau && cache[cle] !== undefined) {
    return { texte: pool[cache[cle]] || pool[0], releve: !!cache[`${cle}_releve`] };
  }

  let { index } = choisirParSeed(pool, forcerNouveau ? `${dateAujourdhui}${Date.now()}` : dateAujourdhui);
  // Évite de retomber sur le même défi en forçant un nouveau tirage.
  if (forcerNouveau && cache[cle] === index) {
    index = (index + 1) % pool.length;
  }

  const nouveauCache = { ...cache, [cle]: index, [`${cle}_releve`]: false };
  await setData(CLE_STOCKAGE, nouveauCache);
  return { texte: pool[index], releve: false };
}

export async function marquerDefiReleve(categorie) {
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR');
  const cle = `${categorie}_${dateAujourdhui}`;
  const cache = (await getData(CLE_STOCKAGE)) || {};
  await setData(CLE_STOCKAGE, { ...cache, [`${cle}_releve`]: true });
}
