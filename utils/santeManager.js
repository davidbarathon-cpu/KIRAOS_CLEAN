// ═══════════════════════════════════════════
//  SANTEMANAGER.JS — Rend le module Santé réellement
//  interactif (lot 44, étape 1/2 : sans API externe).
//
//  Avant ce lot, "sante" dans le stockage était un simple objet figé,
//  jamais modifié après l'installation. Ce module ajoute :
//  - un vrai historique quotidien (utilisé par l'export PDF, qui lisait
//    déjà "sante_historique" mais personne n'y écrivait jamais rien)
//  - un rollover automatique à minuit (le jour suivant, pas/calories/eau
//    repartent à zéro, poids et fréquence cardiaque restent tels quels
//    jusqu'à nouvelle saisie — comportement réaliste)
//  - les objectifs (pas/calories/sommeil/eau) viennent maintenant du
//    Profil (Paramètres) plutôt que d'être dupliqués et jamais synchro
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

function dateISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dateLisible(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * Récupère l'état santé du jour, en effectuant si besoin le rollover
 * (archivage de la veille + remise à zéro des compteurs journaliers).
 * Les objectifs (oP, oCal, oSom, oEau) sont recalculés à partir du
 * Profil à chaque appel, pour rester synchronisés avec ce que
 * l'utilisateur a réglé dans Paramètres → Profil.
 */
export async function getSanteDuJour() {
  const [sante, profil, historique] = await Promise.all([
    getData('sante'),
    getData('profil'),
    getData('sante_historique'),
  ]);

  const s = sante || {};
  const p = profil || {};
  let histTravail = historique || [];
  let sTravail = s;
  const aujourdHui = dateISO();

  if (s.jour && s.jour !== aujourdHui) {
    // Nouveau jour détecté → on archive la veille et on remet à zéro
    // les compteurs qui n'ont de sens que sur une journée.
    histTravail = [
      ...histTravail,
      {
        date: dateLisible(s.jour),
        pas: s.pas || 0,
        som: s.som || 0,
        eau: s.eau || 0,
        poids: s.poids || null,
      },
    ].slice(-90); // 90 derniers jours max, largement suffisant

    sTravail = { ...s, pas: 0, cal: 0, eau: 0, jour: aujourdHui };
    await Promise.all([setData('sante', sTravail), setData('sante_historique', histTravail)]);
  } else if (!s.jour) {
    // Tout premier lancement : on initialise juste la date, sans archiver
    // de fausses données de démonstration dans l'historique.
    sTravail = { ...s, jour: aujourdHui };
    await setData('sante', sTravail);
  }

  return {
    ...sTravail,
    oP: p.pasObj || sTravail.oP || 10000,
    oCal: p.calObj || sTravail.oCal || 2200,
    oSom: p.sleepObj || sTravail.oSom || 8,
    oEau: p.eauObj || sTravail.oEau || 2.5,
    historique: histTravail,
  };
}

/**
 * Ajoute rapidement de l'eau (ex: bouton "+250 ml").
 * litres : quantité en litres (0.25 pour 250 ml).
 */
export async function ajouterEau(litres) {
  const sante = (await getData('sante')) || {};
  const updated = { ...sante, eau: Math.round(((sante.eau || 0) + litres) * 100) / 100 };
  await setData('sante', updated);
  return updated;
}

/**
 * Met à jour un ou plusieurs champs santé saisis manuellement
 * (poids, fréquence cardiaque, pas, calories, sommeil...).
 */
export async function mettreAJourSante(champs) {
  const sante = (await getData('sante')) || {};
  const updated = { ...sante, ...champs };
  await setData('sante', updated);
  return updated;
}

/**
 * Génère un conseil Kira dynamique (1 à 2 messages) en fonction des
 * vraies données du jour, plutôt qu'un texte fixe identique tous les jours.
 */
export function genererConseilSante(s, historique) {
  const messages = [];
  const heure = new Date().getHours();
  const pctPas = s.oP ? (s.pas || 0) / s.oP : 0;
  const pctEau = s.oEau ? (s.eau || 0) / s.oEau : 0;

  if (pctPas >= 1) {
    messages.push("Objectif de pas atteint aujourd'hui, bravo ! 🎉");
  } else if (pctPas < 0.3 && heure >= 17) {
    messages.push('Encore peu de pas aujourd\'hui — une petite marche avant ce soir ferait du bien.');
  }

  if (pctEau >= 1) {
    messages.push("Objectif d'hydratation atteint, parfait ! 💧");
  } else if (pctEau < 0.4 && heure >= 14) {
    messages.push("Tu es en dessous de la moitié de ton objectif d'eau — bois un grand verre maintenant !");
  }

  if (s.som && s.som < 6.5) {
    messages.push('Ton sommeil était court cette nuit — essaie de te coucher plus tôt ce soir.');
  } else if (s.som && s.som >= 7.5) {
    messages.push('Bon sommeil cette nuit, ton corps t\'en remercie !');
  }

  if (historique && historique.length > 0) {
    const dernier = historique[historique.length - 1];
    if (dernier.poids && s.poids) {
      if (s.poids < dernier.poids - 0.1) messages.push(`Poids en légère baisse depuis le ${dernier.date} — continue comme ça.`);
      else if (s.poids > dernier.poids + 0.5) messages.push(`Le poids a un peu augmenté depuis le ${dernier.date} — rien d'alarmant, garde un œil dessus.`);
    }
  }

  if (messages.length === 0) {
    messages.push('Les indicateurs sont équilibrés aujourd\'hui. Continue sur cette lancée !');
  }

  return messages.slice(0, 2).join(' ');
}
