// ═══════════════════════════════════════════
//  CUISINEFAVORIS.JS — LOT 78
//  Gestion des recettes favorites (module Cuisine).
//
//  Les recettes du jour sont générées par IA et changent chaque jour —
//  impossible de les "re-consulter" plus tard via un simple id. On stocke
//  donc ici la recette COMPLÈTE (titre, ingrédients, étapes, conseil...)
//  au moment où David appuie sur ⭐, pas juste une référence.
//
//  Clé de stockage : 'cuisine_favoris' — tableau d'objets recette, chacun
//  complété par { id, dateAjout } en plus des champs habituels
//  (titre, type, temps, difficulte, ingredients, etapes, conseil).
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_FAVORIS = 'cuisine_favoris';

export async function getFavoris() {
  const favoris = await getData(CLE_FAVORIS);
  return Array.isArray(favoris) ? favoris : [];
}

/** Une recette est identifiée par titre+type : les recettes IA n'ont pas
 * d'id stable d'un jour à l'autre, mais deux recettes avec le même titre
 * pour le même type de plat sont, en pratique, "la même" pour David. */
function memeRecette(a, b) {
  return a.titre === b.titre && a.type === b.type;
}

export async function estFavori(recette, favoris = null) {
  const liste = favoris || (await getFavoris());
  return liste.some(f => memeRecette(f, recette));
}

/** Ajoute ou retire la recette des favoris. Retourne le nouvel état
 * (true = maintenant favorite, false = retirée) pour mettre à jour l'UI
 * sans recharger tout le stockage. */
export async function toggleFavori(recette) {
  const favoris = await getFavoris();
  const dejaFavori = favoris.some(f => memeRecette(f, recette));
  let nouvelleListe;
  if (dejaFavori) {
    nouvelleListe = favoris.filter(f => !memeRecette(f, recette));
  } else {
    nouvelleListe = [{ ...recette, id: `${Date.now()}`, dateAjout: new Date().toISOString() }, ...favoris];
  }
  await setData(CLE_FAVORIS, nouvelleListe);
  return !dejaFavori;
}

export async function retirerFavori(id) {
  const favoris = await getFavoris();
  const nouvelleListe = favoris.filter(f => f.id !== id);
  await setData(CLE_FAVORIS, nouvelleListe);
  return nouvelleListe;
}
