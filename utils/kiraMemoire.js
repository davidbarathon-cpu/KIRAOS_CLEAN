// ═══════════════════════════════════════════
//  KIRAMEMOIRE.JS — Mémoire longue durée de Kira (lot 37)
//  NOUVEAU : comble un vrai manque identifié en clarifiant
//  la question "la mémoire de Kira est-elle au point ?" —
//  jusqu'ici Kira n'avait AUCUNE mémoire technique :
//  - Pas de mémoire de conversation (chaque appel à l'IA
//    n'envoyait que le message courant, jamais l'historique)
//  - Pas de mémoire long terme ("souviens-toi que...")
//
//  Ce fichier traite le 2e point : un vrai stockage de faits
//  que l'utilisateur demande explicitement à Kira de retenir
//  ("Kira, souviens-toi que mon code de garage est 1234"),
//  qu'elle peut relire plus tard sur demande ("Kira, quel est
//  mon code garage ?") ou automatiquement à chaque conversation
//  (les faits sont injectés dans le contexte envoyé à l'IA).
//
//  Le 1er point (mémoire de conversation courte) est traité
//  directement dans aiCaller.js et KiraChatScreen.js.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_MEMOIRE = 'kira_memoire';

// Limite volontaire : au-delà de 50 faits mémorisés, le contexte envoyé à
// l'IA à chaque message deviendrait trop long (coût, lenteur, risque de
// diluer l'attention du modèle sur l'essentiel). Les plus anciens faits
// sont retirés automatiquement au-delà de cette limite (FIFO).
const MAX_FAITS_MEMORISES = 50;

/**
 * Structure d'un fait mémorisé :
 * { id, texte: "mon code de garage est 1234", creeLe: ISO date }
 */

/**
 * Récupère tous les faits mémorisés par Kira. Retourne toujours un tableau.
 */
export async function getFaitsMemorises() {
  const faits = await getData(CLE_MEMOIRE);
  return faits || [];
}

/**
 * Ajoute un nouveau fait à la mémoire de Kira. Si plus de
 * MAX_FAITS_MEMORISES faits existent après l'ajout, retire les plus anciens.
 */
export async function memoriserFait(texte) {
  const faits = await getFaitsMemorises();
  const nouveauFait = { id: Date.now(), texte: texte.trim(), creeLe: new Date().toISOString() };
  let misAJour = [...faits, nouveauFait];
  if (misAJour.length > MAX_FAITS_MEMORISES) {
    misAJour = misAJour.slice(misAJour.length - MAX_FAITS_MEMORISES);
  }
  await setData(CLE_MEMOIRE, misAJour);
  return nouveauFait;
}

/**
 * Supprime un fait mémorisé par son id (utilisé depuis l'écran Paramètres,
 * pour que l'utilisateur garde le contrôle de ce que Kira retient de lui).
 */
export async function oublierFait(id) {
  const faits = await getFaitsMemorises();
  await setData(CLE_MEMOIRE, faits.filter(f => f.id !== id));
  return true;
}

/**
 * Efface entièrement la mémoire de Kira (remise à zéro complète).
 */
export async function oublierTout() {
  await setData(CLE_MEMOIRE, []);
  return true;
}

/**
 * Construit le texte à injecter dans le contexte envoyé à l'IA, listant
 * tous les faits mémorisés. Retourne une chaîne vide si rien n'est mémorisé
 * (pour ne pas alourdir le prompt inutilement).
 */
export async function construireContexteMemoire() {
  const faits = await getFaitsMemorises();
  if (faits.length === 0) return '';
  const liste = faits.map(f => `- ${f.texte}`).join('\n');
  return `\n\nVoici des informations que l'utilisateur t'a explicitement demandé de retenir lors de précédentes conversations :\n${liste}\n\nUtilise ces informations si elles sont pertinentes pour répondre, sans forcément les répéter mot pour mot.`;
}

/**
 * Recherche le ou les faits mémorisés les plus pertinents par rapport à
 * une question posée, pour une réponse hors-ligne (sans IA configurée).
 * Recherche simple par mots-clés communs — suffisant pour ce cas d'usage,
 * cohérent avec le reste du système d'intentions de l'app qui reste
 * volontairement simple plutôt que d'utiliser une vraie recherche sémantique.
 */
export function rechercherFaitsPertinents(faits, question) {
  const motsQuestion = question
    .toLowerCase()
    .replace(/[^\wàâäéèêëïîôöùûüç\s]/g, ' ')
    .split(/\s+/)
    .filter(m => m.length > 3); // ignore les mots trop courts (articles, etc.)

  if (motsQuestion.length === 0) return [];

  const resultats = faits
    .map(fait => {
      const texteFait = fait.texte.toLowerCase();
      const score = motsQuestion.filter(mot => texteFait.includes(mot)).length;
      return { fait, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return resultats.map(r => r.fait);
}
