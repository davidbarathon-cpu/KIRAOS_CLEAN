// ═══════════════════════════════════════════
//  MODULESDYNAMIQUES.JS — Modules suggérés selon le moment (lot 75)
//
//  Reprend une demande du tout premier cahier des charges, jamais
//  implémentée : "j'aimerais que les modules changent en fonction de la
//  journée... actualités le matin, le potager le soir". Plutôt que de
//  MASQUER des modules (source de confusion — "où est passé mon module ?"),
//  on les RÉORDONNE : les modules pertinents pour le moment présent
//  remontent en haut de la grille d'accueil, sous un bandeau "Suggérés
//  maintenant", sans jamais rien cacher — tout reste accessible dans la
//  section "Tous les modules" juste en dessous.
// ═══════════════════════════════════════════

// Chaque période associe des ids de modules par ordre de pertinence
// décroissante. Un module peut apparaître dans plusieurs périodes.
const PERIODES = [
  { debut: 5, fin: 11, ids: ['actualites', 'meteo', 'agenda', 'humeur', 'cuisine'] },
  { debut: 11, fin: 14, ids: ['cuisine', 'courses', 'agenda'] },
  { debut: 14, fin: 18, ids: ['guitare', 'objectifs', 'minuteur', 'traduction', 'notes'] },
  { debut: 18, fin: 22, ids: ['potager', 'cuisine', 'domotique', 'musique', 'budget'] },
  { debut: 22, fin: 24, ids: ['reveil', 'meditation', 'humeur', 'notes'] },
  { debut: 0, fin: 5, ids: ['reveil', 'meditation', 'humeur'] },
];

/**
 * Retourne les ids de modules suggérés pour une heure donnée (0-23),
 * dans l'ordre de pertinence. Pure et synchrone — facile à tester.
 */
export function getIdsSuggeresPourHeure(heure) {
  const periode = PERIODES.find(p => heure >= p.debut && heure < p.fin);
  return periode ? periode.ids : [];
}

/**
 * Sépare une liste de modules (déjà filtrée selon les préférences de
 * l'utilisateur) en { suggeres, autres } — suggeres dans l'ordre de
 * pertinence du moment, autres dans leur ordre d'origine. Aucun module
 * n'est dupliqué ni masqué, juste réparti entre les deux groupes.
 * Limité à 4 suggestions maximum pour ne pas dominer tout l'écran.
 */
export function separerModulesSuggeres(modules, heure = new Date().getHours()) {
  const idsSuggeres = getIdsSuggeresPourHeure(heure);
  const suggeres = idsSuggeres
    .map(id => modules.find(m => m.id === id))
    .filter(Boolean)
    .slice(0, 4);
  const idsRetenus = new Set(suggeres.map(m => m.id));
  const autres = modules.filter(m => !idsRetenus.has(m.id));
  return { suggeres, autres };
}
