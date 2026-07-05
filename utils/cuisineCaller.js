// ═══════════════════════════════════════════
//  CUISINECALLER.JS — Recettes quotidiennes par IA (lot 39)
//  NOUVEAU : comble un vrai manque identifié lors
//  du test du 28/06 — les recettes étaient codées en
//  dur et ne changeaient jamais ("🚧 De nouvelles
//  recettes seront ajoutées chaque jour
//  automatiquement par Kira" — commentaire resté en
//  l'état depuis le début du projet, jamais construit).
//
//  FONCTIONNEMENT :
//  - Chaque jour, Kira génère 3 nouvelles recettes via
//    ton fournisseur IA configuré (Gemini, Claude, etc.)
//  - Le résultat est mis en cache local avec la date du
//    jour — Kira ne re-génère pas si tu ouvres le
//    module plusieurs fois dans la même journée, pour
//    économiser les appels API.
//  - Si aucun fournisseur IA n'est configuré (mode
//    hors-ligne), on retourne les recettes de secours
//    codées en dur — la roue tourne entre 6 recettes
//    de secours selon le jour de la semaine, pour
//    varier un minimum même sans IA.
//  - Le profil utilisateur (allergies, préférences
//    éventuellement dans les notes de Kira) est pris
//    en compte dans le prompt si disponible.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';
import { demanderAKira } from './aiCaller';

const CLE_CACHE_RECETTES = 'cuisine_recettes_cache';

// Recettes de secours (mode hors-ligne ou absence de clé IA), une par
// jour de la semaine (0=dimanche...6=samedi) pour varier un minimum.
const RECETTES_SECOURS = [
  {
    titre: 'Poulet rôti aux herbes',
    temps: '45 min',
    difficulte: 'Facile',
    ingredients: ['1 poulet entier', 'Herbes de Provence', 'Huile d\'olive', 'Ail', 'Citron'],
    etapes: [
      'Préchauffer le four à 200°C.',
      'Badigeonner le poulet d\'huile et d\'herbes.',
      'Glisser de l\'ail et du citron à l\'intérieur.',
      'Cuire 45 min en arrosant régulièrement.',
    ],
    conseil: 'Kira suggère d\'accompagner avec des pommes de terre rôties au même four !',
  },
  {
    titre: 'Salade de lentilles aux légumes',
    temps: '25 min',
    difficulte: 'Très facile',
    ingredients: ['200g de lentilles', 'Tomates cerises', 'Concombre', 'Oignons rouges', 'Vinaigrette'],
    etapes: [
      'Cuire les lentilles 20 min dans l\'eau salée.',
      'Couper les légumes en petits dés.',
      'Mélanger avec les lentilles refroidies.',
      'Assaisonner avec la vinaigrette.',
    ],
    conseil: 'Riche en protéines végétales — parfait pour un repas équilibré !',
  },
  {
    titre: 'Pâtes carbonara légères',
    temps: '20 min',
    difficulte: 'Facile',
    ingredients: ['350g de spaghetti', '150g de lardons', '3 œufs', 'Parmesan', 'Poivre noir'],
    etapes: [
      'Cuire les pâtes al dente.',
      'Faire revenir les lardons à sec.',
      'Battre les œufs avec le parmesan.',
      'Hors du feu, mélanger pâtes, lardons et sauce aux œufs.',
    ],
    conseil: 'Le secret : retirer la casserole du feu avant d\'ajouter les œufs pour éviter de les brouiller.',
  },
  {
    titre: 'Omelette aux champignons',
    temps: '15 min',
    difficulte: 'Très facile',
    ingredients: ['4 œufs', '200g de champignons', 'Crème fraîche', 'Persil', 'Beurre'],
    etapes: [
      'Faire sauter les champignons au beurre.',
      'Battre les œufs avec la crème et le persil.',
      'Verser dans la poêle et cuire à feu moyen.',
      'Plier l\'omelette et servir aussitôt.',
    ],
    conseil: 'Une omelette baveuse est meilleure — inutile de la cuire trop longtemps !',
  },
  {
    titre: 'Soupe de légumes maison',
    temps: '35 min',
    difficulte: 'Facile',
    ingredients: ['Carottes', 'Poireaux', 'Pommes de terre', 'Bouillon de légumes', 'Crème'],
    etapes: [
      'Éplucher et couper tous les légumes.',
      'Faire revenir dans un peu de beurre.',
      'Couvrir de bouillon et cuire 25 min.',
      'Mixer et ajouter une touche de crème.',
    ],
    conseil: 'Ajoute un filet d\'huile de truffe au moment de servir pour un effet wow !',
  },
  {
    titre: 'Poêlée de riz aux crevettes',
    temps: '20 min',
    difficulte: 'Facile',
    ingredients: ['200g de riz cuit', '250g de crevettes', 'Poivrons', 'Sauce soja', 'Gingembre'],
    etapes: [
      'Faire revenir les poivrons en dés.',
      'Ajouter les crevettes et le gingembre.',
      'Incorporer le riz cuit et la sauce soja.',
      'Faire sauter à feu vif 3 minutes.',
    ],
    conseil: 'Utilise du riz cuit de la veille pour un meilleur résultat — il accroche moins.',
  },
];

/**
 * Construit le prompt envoyé à l'IA pour générer 3 recettes du jour.
 * Intègre la date du jour et le profil utilisateur si disponible,
 * pour des suggestions personnalisées et adaptées à la saison.
 */
function construirePromptRecettes(profil) {
  const maintenant = new Date();
  const jourSemaine = maintenant.toLocaleDateString('fr-FR', { weekday: 'long' });
  const mois = maintenant.toLocaleDateString('fr-FR', { month: 'long' });
  const prenom = profil?.prenom || 'l\'utilisateur';

  return `Tu es Kira, assistante culinaire de ${prenom}. Génère 3 recettes de cuisine pour ce ${jourSemaine} de ${mois}.

Réponds UNIQUEMENT avec un tableau JSON valide, rien d'autre. Voici un exemple du format EXACT attendu :

[
  {
    "titre": "Nom de la recette",
    "temps": "30 min",
    "difficulte": "Facile",
    "ingredients": ["ingrédient 1", "ingrédient 2", "ingrédient 3"],
    "etapes": ["Étape 1 détaillée.", "Étape 2 détaillée.", "Étape 3 détaillée."],
    "conseil": "Un conseil personnalisé de Kira sur cette recette."
  }
]

Règles :
- 3 recettes variées adaptées à la saison (${mois})
- Une recette simple rapide (moins de 20 min), une équilibrée, une plus élaborée
- Les ingrédients doivent être faciles à trouver en France
- Les étapes doivent être claires et détaillées
- Le conseil de Kira doit être pratique et personnel
- Pas de guillemets doubles DANS les textes (utilise des guillemets simples si nécessaire)
- Aucune virgule après le dernier élément d'un tableau ou d'un objet`;
}

/**
 * Nettoie et parse la réponse JSON de l'IA, en gérant les erreurs courantes
 * (balises markdown, virgules finales, etc.) — même logique que plantAnalyzer.
 */
function extraireRecettesJson(texte) {
  let nettoye = texte.replace(/```json|```/g, '').trim();
  const matchCrochets = nettoye.match(/\[[\s\S]*\]/);
  let aTraiter = matchCrochets ? matchCrochets[0] : nettoye;
  // Nettoie les virgules finales avant ] ou }
  aTraiter = aTraiter.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(aTraiter);
}

/**
 * Retourne les recettes du jour. Logique :
 * 1. Si un cache existe pour AUJOURD'HUI → retourne le cache (pas d'appel IA)
 * 2. Si une IA est configurée → génère 3 nouvelles recettes et les met en cache
 * 3. Sinon → rotation entre les 6 recettes de secours selon le jour de la semaine
 */
export async function getRecettesDuJour(appState, providerActif, apiKeys) {
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR');

  // Vérifie le cache
  const cache = await getData(CLE_CACHE_RECETTES);
  if (cache && cache.date === dateAujourdhui && cache.recettes?.length > 0) {
    return { recettes: cache.recettes, source: cache.source || 'cache' };
  }

  // Tente la génération par IA
  const { AI_PROVIDERS } = await import('./apiKeys');
  const providerInfo = AI_PROVIDERS.find(p => p.id === providerActif);
  const apiKey = providerActif ? apiKeys[providerActif] : null;

  if (providerActif && apiKey && providerInfo) {
    try {
      const prompt = construirePromptRecettes(appState.profil);
      const { texte, source } = await demanderAKira(
        prompt,
        { ...appState, kiraState: 'flow' },
        providerActif,
        apiKey,
        providerInfo.modeleParDefaut,
        [] // pas d'historique nécessaire pour la génération de recettes
      );

      if (source === 'live') {
        const recettes = extraireRecettesJson(texte);
        if (Array.isArray(recettes) && recettes.length > 0) {
          await setData(CLE_CACHE_RECETTES, { date: dateAujourdhui, recettes, source: 'ia' });
          return { recettes, source: 'ia' };
        }
      }
    } catch (e) {
      console.warn('Génération de recettes IA échouée, recettes de secours utilisées:', e.message);
    }
  }

  // Recettes de secours : rotation par jour de la semaine (0=dim...6=sam)
  const jourIndex = new Date().getDay();
  const recetteSecours = [RECETTES_SECOURS[jourIndex % RECETTES_SECOURS.length]];
  return { recettes: recetteSecours, source: 'offline' };
}
