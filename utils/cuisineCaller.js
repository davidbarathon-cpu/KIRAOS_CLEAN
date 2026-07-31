// ═══════════════════════════════════════════
//  CUISINECALLER.JS — Recettes quotidiennes par IA
//  MISE À JOUR LOT 47 : corrige deux bugs remontés
//  lors du test du 11/07 —
//  1) le bouton "Nouvelles recettes" ne changeait
//     rien car il relisait le cache du jour au lieu
//     de forcer une régénération.
//  2) en mode hors-ligne (pas de clé IA), la rotation
//     se faisait par JOUR DE LA SEMAINE (7 valeurs)
//     donc "toujours la même recette" d'une semaine
//     à l'autre. Rotation refaite sur la date complète,
//     sur un plus grand choix de recettes.
//  Ajout demandé : structure entrée/plat/dessert au
//  lieu de 3 recettes non catégorisées.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';
import { demanderAKira } from './aiCaller';

const CLE_CACHE_RECETTES = 'cuisine_recettes_cache';
// LOT 65 : historique des titres récemment proposés par l'IA, pour éviter
// les menus qui se répètent (voir bug ci-dessous et construirePromptRecettes).
const CLE_HISTORIQUE_TITRES = 'cuisine_historique_titres';
const NB_JOURS_HISTORIQUE = 10; // on évite de reproposer un titre déjà vu ces 10 derniers jours

// ── Recettes de secours (mode hors-ligne ou absence de clé IA) ──
// Organisées par catégorie, avec un choix plus large qu'avant pour
// qu'une vraie rotation quotidienne soit possible sans se répéter
// toutes les semaines.
const ENTREES_SECOURS = [
  { titre: 'Velouté de potiron', temps: '20 min', difficulte: 'Très facile', ingredients: ['500g potiron', 'Bouillon de légumes', 'Crème fraîche', 'Muscade'], etapes: ['Éplucher et cuire le potiron 15 min.', 'Mixer avec le bouillon.', 'Ajouter la crème et la muscade.'], conseil: 'Un filet d\'huile de noisette apporte du croquant en plus.' },
  { titre: 'Salade de chèvre chaud', temps: '15 min', difficulte: 'Facile', ingredients: ['Salade verte', '2 crottins de chèvre', 'Miel', 'Noix', 'Pain de campagne'], etapes: ['Toaster le pain avec le chèvre au four.', 'Arroser de miel.', 'Servir sur la salade avec les noix.'], conseil: 'Le miel de châtaignier apporte une belle amertume qui contraste bien.' },
  { titre: 'Carpaccio de tomates', temps: '10 min', difficulte: 'Très facile', ingredients: ['4 tomates variées', 'Basilic frais', 'Huile d\'olive', 'Parmesan'], etapes: ['Trancher finement les tomates.', 'Disposer en cercle.', 'Parsemer de basilic et copeaux de parmesan.'], conseil: 'Utilise des tomates de couleurs différentes pour un joli visuel.' },
  { titre: 'Soupe miso', temps: '15 min', difficulte: 'Facile', ingredients: ['Pâte miso', 'Tofu soyeux', 'Algues wakamé', 'Ciboulette'], etapes: ['Chauffer l\'eau sans bouillir.', 'Délayer la pâte miso.', 'Ajouter tofu et algues.'], conseil: 'Ne jamais faire bouillir le miso, ça détruit ses probiotiques.' },
  { titre: 'Bruschetta tomates-basilic', temps: '10 min', difficulte: 'Très facile', ingredients: ['Pain de campagne', 'Tomates', 'Ail', 'Basilic', 'Huile d\'olive'], etapes: ['Toaster le pain frotté à l\'ail.', 'Couvrir de tomates en dés.', 'Arroser d\'huile et parsemer de basilic.'], conseil: 'Sale les tomates 10 min avant pour qu\'elles rendent leur eau sucrée.' },
  { titre: 'Houmous maison', temps: '10 min', difficulte: 'Très facile', ingredients: ['Pois chiches', 'Tahini', 'Citron', 'Ail', 'Cumin'], etapes: ['Mixer tous les ingrédients.', 'Ajuster l\'assaisonnement.', 'Servir avec des crudités.'], conseil: 'Un glaçon mixé avec donne une texture plus mousseuse.' },
];

const PLATS_SECOURS = [
  { titre: 'Poulet rôti aux herbes', temps: '45 min', difficulte: 'Facile', ingredients: ['1 poulet entier', 'Herbes de Provence', 'Huile d\'olive', 'Ail', 'Citron'], etapes: ['Préchauffer le four à 200°C.', 'Badigeonner le poulet d\'huile et d\'herbes.', 'Glisser de l\'ail et du citron à l\'intérieur.', 'Cuire 45 min en arrosant régulièrement.'], conseil: 'Kira suggère d\'accompagner avec des pommes de terre rôties au même four !' },
  { titre: 'Salade de lentilles aux légumes', temps: '25 min', difficulte: 'Très facile', ingredients: ['200g de lentilles', 'Tomates cerises', 'Concombre', 'Oignons rouges', 'Vinaigrette'], etapes: ['Cuire les lentilles 20 min dans l\'eau salée.', 'Couper les légumes en petits dés.', 'Mélanger avec les lentilles refroidies.', 'Assaisonner avec la vinaigrette.'], conseil: 'Riche en protéines végétales — parfait pour un repas équilibré !' },
  { titre: 'Pâtes carbonara légères', temps: '20 min', difficulte: 'Facile', ingredients: ['350g de spaghetti', '150g de lardons', '3 œufs', 'Parmesan', 'Poivre noir'], etapes: ['Cuire les pâtes al dente.', 'Faire revenir les lardons à sec.', 'Battre les œufs avec le parmesan.', 'Hors du feu, mélanger pâtes, lardons et sauce aux œufs.'], conseil: 'Le secret : retirer la casserole du feu avant d\'ajouter les œufs pour éviter de les brouiller.' },
  { titre: 'Omelette aux champignons', temps: '15 min', difficulte: 'Très facile', ingredients: ['4 œufs', '200g de champignons', 'Crème fraîche', 'Persil', 'Beurre'], etapes: ['Faire sauter les champignons au beurre.', 'Battre les œufs avec la crème et le persil.', 'Verser dans la poêle et cuire à feu moyen.', 'Plier l\'omelette et servir aussitôt.'], conseil: 'Une omelette baveuse est meilleure — inutile de la cuire trop longtemps !' },
  { titre: 'Poêlée de riz aux crevettes', temps: '20 min', difficulte: 'Facile', ingredients: ['200g de riz cuit', '250g de crevettes', 'Poivrons', 'Sauce soja', 'Gingembre'], etapes: ['Faire revenir les poivrons en dés.', 'Ajouter les crevettes et le gingembre.', 'Incorporer le riz cuit et la sauce soja.', 'Faire sauter à feu vif 3 minutes.'], conseil: 'Utilise du riz cuit de la veille pour un meilleur résultat — il accroche moins.' },
  { titre: 'Curry de légumes au lait de coco', temps: '30 min', difficulte: 'Facile', ingredients: ['Lait de coco', 'Patate douce', 'Pois chiches', 'Pâte de curry', 'Épinards'], etapes: ['Faire revenir la pâte de curry.', 'Ajouter la patate douce et le lait de coco.', 'Mijoter 20 min.', 'Ajouter pois chiches et épinards en fin de cuisson.'], conseil: 'Encore meilleur réchauffé le lendemain — les épices ont le temps de infuser.' },
  { titre: 'Saumon en papillote', temps: '25 min', difficulte: 'Facile', ingredients: ['2 pavés de saumon', 'Citron', 'Aneth', 'Courgettes', 'Huile d\'olive'], etapes: ['Disposer le saumon et les légumes sur du papier cuisson.', 'Arroser de citron et d\'huile.', 'Fermer la papillote et cuire 20 min à 180°C.'], conseil: 'La papillote garde tout le moelleux du poisson sans ajouter de matière grasse.' },
  { titre: 'Chili sin carne', temps: '35 min', difficulte: 'Facile', ingredients: ['Haricots rouges', 'Maïs', 'Tomates concassées', 'Poivrons', 'Épices chili'], etapes: ['Faire revenir oignons et poivrons.', 'Ajouter tomates, haricots et maïs.', 'Assaisonner et mijoter 25 min.'], conseil: 'Un carré de chocolat noir fondu dedans arrondit magnifiquement les saveurs.' },
];

const DESSERTS_SECOURS = [
  { titre: 'Compote pommes-cannelle', temps: '20 min', difficulte: 'Très facile', ingredients: ['6 pommes', 'Cannelle', 'Un peu de sucre', 'Jus de citron'], etapes: ['Éplucher et couper les pommes.', 'Cuire à feu doux avec un fond d\'eau.', 'Écraser à la fourchette, ajouter la cannelle.'], conseil: 'Laisse quelques morceaux entiers pour une texture plus intéressante.' },
  { titre: 'Yaourt maison miel-noix', temps: '5 min (+ repos)', difficulte: 'Très facile', ingredients: ['Yaourts nature', 'Miel', 'Noix concassées'], etapes: ['Verser le yaourt dans un bol.', 'Arroser de miel.', 'Parsemer de noix.'], conseil: 'Fais-le la veille pour que le miel imprègne bien le yaourt.' },
  { titre: 'Fondant au chocolat', temps: '25 min', difficulte: 'Facile', ingredients: ['200g chocolat noir', '150g beurre', '3 œufs', '100g sucre', '50g farine'], etapes: ['Faire fondre chocolat et beurre.', 'Mélanger avec œufs et sucre.', 'Incorporer la farine.', 'Cuire 12 min à 180°C — le cœur doit rester coulant.'], conseil: 'Sors-le du four dès que le dessus craquelle, pas plus — le cœur continue de cuire hors du four.' },
  { titre: 'Salade de fruits de saison', temps: '10 min', difficulte: 'Très facile', ingredients: ['Fruits de saison au choix', 'Jus de citron', 'Menthe fraîche'], etapes: ['Couper les fruits en morceaux.', 'Arroser de citron pour éviter l\'oxydation.', 'Parsemer de menthe ciselée.'], conseil: 'Prépare-la juste avant de servir pour garder le croquant des fruits.' },
  { titre: 'Riz au lait à la vanille', temps: '30 min', difficulte: 'Facile', ingredients: ['Riz rond', 'Lait', 'Vanille', 'Sucre'], etapes: ['Cuire le riz dans le lait vanillé à feu doux.', 'Remuer régulièrement 25 min.', 'Sucrer en fin de cuisson.'], conseil: 'Un caramel maison versé dessus transforme complètement le dessert.' },
  { titre: 'Mousse au chocolat', temps: '15 min (+ repos)', difficulte: 'Facile', ingredients: ['200g chocolat noir', '4 œufs', 'Une pincée de sel'], etapes: ['Faire fondre le chocolat.', 'Séparer blancs et jaunes.', 'Mélanger jaunes au chocolat, incorporer les blancs montés en neige.', 'Réfrigérer 3h minimum.'], conseil: 'Une pincée de sel dans les blancs les fait monter plus fermes.' },
];

/**
 * Choisit un élément d'un tableau de façon déterministe à partir d'une
 * chaîne (ex: une date) — même date + même tableau = même résultat, mais
 * ça change chaque jour puisque la date change. Contrairement à l'ancien
 * `new Date().getDay() % 6` (7 valeurs seulement, se répète chaque semaine),
 * on part ici de la date COMPLÈTE, donc la séquence ne boucle qu'après
 * avoir épuisé toutes les combinaisons possibles.
 */
function choisirParSeed(tableau, seedTexte, decalage = 0) {
  let hash = 0;
  for (let i = 0; i < seedTexte.length; i++) {
    hash = (hash * 31 + seedTexte.charCodeAt(i)) >>> 0;
  }
  return tableau[(hash + decalage) % tableau.length];
}

function getRecettesSecoursDuJour() {
  const seed = new Date().toISOString().slice(0, 10); // ex: "2026-07-11"
  return [
    { ...choisirParSeed(ENTREES_SECOURS, seed, 0), type: 'Entrée' },
    { ...choisirParSeed(PLATS_SECOURS, seed, 1), type: 'Plat' },
    { ...choisirParSeed(DESSERTS_SECOURS, seed, 2), type: 'Dessert' },
  ];
}

/**
 * Construit le prompt envoyé à l'IA pour générer le menu du jour,
 * structuré en entrée/plat/dessert (demande explicite du 11/07).
 *
 * BUGFIX LOT 65 : le prompt ne contenait que le jour de la semaine et le
 * mois (ex: "ce vendredi de juillet"), donc un texte STRICTEMENT
 * IDENTIQUE était envoyé à l'IA à chaque vendredi de juillet — plusieurs
 * fournisseurs IA renvoient alors des menus très proches, voire
 * identiques, pour un prompt identique. On envoie maintenant la date
 * complète (qui ne se répète jamais), et on liste explicitement les
 * titres récemment proposés pour demander à l'IA de ne pas les reprendre.
 */
function construirePromptRecettes(profil, titresRecents = []) {
  const maintenant = new Date();
  const dateComplete = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const prenom = profil?.prenom || 'l\'utilisateur';

  const consigneAntiRepetition = titresRecents.length > 0
    ? `\n\nIMPORTANT — Ne propose AUCUNE des recettes suivantes, déjà servies récemment : ${titresRecents.join(', ')}. Sois créative et varie vraiment par rapport à ces derniers jours.`
    : '';

  return `Tu es Kira, assistante culinaire de ${prenom}. Compose un menu complet pour aujourd'hui, ${dateComplete} : une entrée, un plat, et un dessert.${consigneAntiRepetition}

Réponds UNIQUEMENT avec un tableau JSON valide de 3 éléments, rien d'autre. Voici le format EXACT attendu :

[
  {
    "type": "Entrée",
    "titre": "Nom de la recette",
    "temps": "15 min",
    "difficulte": "Facile",
    "ingredients": ["ingrédient 1", "ingrédient 2"],
    "etapes": ["Étape 1 détaillée.", "Étape 2 détaillée."],
    "conseil": "Un conseil personnalisé de Kira sur cette recette."
  },
  { "type": "Plat", ... même structure ... },
  { "type": "Dessert", ... même structure ... }
]

Règles :
- Exactement 3 éléments, dans cet ordre : Entrée, Plat, Dessert
- Adapté à la saison actuelle, varié par rapport à un menu classique et par rapport aux jours précédents
- Les ingrédients doivent être faciles à trouver en France
- Les étapes doivent être claires et détaillées
- Le conseil de Kira doit être pratique et personnel
- Pas de guillemets doubles DANS les textes (utilise des guillemets simples si nécessaire)
- Aucune virgule après le dernier élément d'un tableau ou d'un objet`;
}

function extraireRecettesJson(texte) {
  let nettoye = texte.replace(/```json|```/g, '').trim();
  const matchCrochets = nettoye.match(/\[[\s\S]*\]/);
  let aTraiter = matchCrochets ? matchCrochets[0] : nettoye;
  aTraiter = aTraiter.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(aTraiter);
}

/**
 * Retourne le menu du jour (entrée/plat/dessert). Logique :
 * 1. Si forcerRegeneration est vrai → on ignore le cache, on régénère.
 * 2. Sinon, si un cache existe pour AUJOURD'HUI → retourne le cache.
 * 3. Si une IA est configurée → génère un nouveau menu et le met en cache.
 * 4. Sinon → menu de secours choisi selon la date complète (voir
 *    choisirParSeed), varie chaque jour au lieu de boucler chaque semaine.
 */
export async function getRecettesDuJour(appState, providerActif, apiKeys, forcerRegeneration = false) {
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR');

  if (!forcerRegeneration) {
    const cache = await getData(CLE_CACHE_RECETTES);
    if (cache && cache.date === dateAujourdhui && cache.recettes?.length > 0) {
      return { recettes: cache.recettes, source: cache.source || 'cache' };
    }
  }

  const { AI_PROVIDERS } = await import('./apiKeys');
  const providerInfo = AI_PROVIDERS.find(p => p.id === providerActif);
  const apiKey = providerActif ? apiKeys[providerActif] : null;

  if (providerActif && apiKey && providerInfo) {
    try {
      // BUGFIX LOT 65 : on récupère les titres des derniers jours pour
      // demander explicitement à l'IA de ne pas les reproposer.
      const historique = (await getData(CLE_HISTORIQUE_TITRES)) || [];
      const titresRecents = historique.map(h => h.titre);

      const prompt = construirePromptRecettes(appState.profil, titresRecents);
      const { texte, source } = await demanderAKira(
        prompt,
        { ...appState, kiraState: 'flow' },
        providerActif,
        apiKey,
        providerInfo.modeleParDefaut,
        []
      );

      if (source === 'live') {
        const recettes = extraireRecettesJson(texte);
        if (Array.isArray(recettes) && recettes.length > 0) {
          await setData(CLE_CACHE_RECETTES, { date: dateAujourdhui, recettes, source: 'ia' });

          // Met à jour l'historique anti-répétition : on garde les
          // NB_JOURS_HISTORIQUE derniers jours de titres proposés (3 titres
          // par jour : entrée/plat/dessert).
          const titresDuJour = recettes.map(r => ({ date: dateAujourdhui, titre: r.titre })).filter(h => h.titre);
          const historiqueMisAJour = [
            ...historique.filter(h => h.date !== dateAujourdhui),
            ...titresDuJour,
          ].slice(-NB_JOURS_HISTORIQUE * 3);
          await setData(CLE_HISTORIQUE_TITRES, historiqueMisAJour);

          return { recettes, source: 'ia' };
        }
      }
    } catch (e) {
      console.warn('Génération de recettes IA échouée, recettes de secours utilisées:', e.message);
    }
  }

  const recettesSecours = getRecettesSecoursDuJour();
  // On met aussi en cache le menu de secours, pour que le module Cuisine
  // affiche la même chose toute la journée (cohérent), et seulement un
  // nouveau menu le lendemain OU si l'utilisateur force une régénération.
  await setData(CLE_CACHE_RECETTES, { date: dateAujourdhui, recettes: recettesSecours, source: 'offline' });
  return { recettes: recettesSecours, source: 'offline' };
}
