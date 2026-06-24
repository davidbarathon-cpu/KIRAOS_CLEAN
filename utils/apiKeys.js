// ═══════════════════════════════════════════
//  APIKEYS.JS — Gestion centralisée des clés API
//  Stockage local uniquement (AsyncStorage).
//  Aucune clé n'est jamais envoyée ailleurs qu'au
//  fournisseur choisi, directement depuis le téléphone.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

// ── Définition des fournisseurs d'IA disponibles ──
// "gratuit" = a un palier gratuit généreux sans carte bancaire au démarrage
export const AI_PROVIDERS = [
  {
    id: 'gemini',
    nom: 'Google Gemini',
    icon: '🔵',
    gratuit: true,
    description: 'Généreux palier gratuit, aucune carte bancaire requise.',
    lienCreationCle: 'https://aistudio.google.com/app/apikey',
    modeles: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    modeleParDefaut: 'gemini-2.5-flash',
  },
  {
    id: 'mistral',
    nom: 'Mistral AI',
    icon: '🟠',
    gratuit: true,
    description: 'IA française, palier gratuit "La Plateforme" disponible.',
    lienCreationCle: 'https://console.mistral.ai/api-keys/',
    modeles: ['mistral-small-latest', 'mistral-large-latest'],
    modeleParDefaut: 'mistral-small-latest',
  },
  {
    id: 'claude',
    nom: 'Claude (Anthropic)',
    icon: '🟣',
    gratuit: false,
    description: 'Très bonne qualité de réponse, crédit de démarrage offert puis payant à l\'usage.',
    lienCreationCle: 'https://console.anthropic.com/settings/keys',
    modeles: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
    modeleParDefaut: 'claude-3-5-haiku-latest',
  },
  {
    id: 'openai',
    nom: 'OpenAI (GPT)',
    icon: '⚪',
    gratuit: false,
    description: 'Très connu, nécessite généralement une carte bancaire après le crédit d\'essai.',
    lienCreationCle: 'https://platform.openai.com/api-keys',
    modeles: ['gpt-4o-mini', 'gpt-4o'],
    modeleParDefaut: 'gpt-4o-mini',
  },
];

export const WEATHER_PROVIDER = {
  id: 'openweathermap',
  nom: 'OpenWeatherMap',
  icon: '⛅',
  gratuit: true,
  description: 'Gratuit jusqu\'à 1000 appels/jour, suffisant pour un usage personnel.',
  lienCreationCle: 'https://home.openweathermap.org/users/sign_up',
};

// ── Fournisseurs de traduction disponibles (plusieurs, l'utilisateur choisit) ──
export const TRADUCTION_PROVIDERS = [
  {
    id: 'deepl',
    nom: 'DeepL',
    icon: '🌍',
    gratuit: true,
    necessiteCle: true,
    description: 'Gratuit jusqu\'à 500 000 caractères/mois, traductions très naturelles.',
    lienCreationCle: 'https://www.deepl.com/fr/pro-api',
  },
  {
    id: 'libretranslate',
    nom: 'LibreTranslate',
    icon: '🔓',
    gratuit: true,
    necessiteCle: false, // serveur public, aucune clé requise pour un usage léger
    description: 'Open-source et gratuit. Qualité un peu moins naturelle que DeepL mais aucune inscription requise.',
    lienCreationCle: 'https://libretranslate.com/',
  },
  {
    id: 'mymemory',
    nom: 'MyMemory',
    icon: '💭',
    gratuit: true,
    necessiteCle: false, // gratuit sans clé jusqu'à 5000 mots/jour
    description: 'Gratuit sans inscription, limité à 5000 mots/jour. Pratique en secours.',
    lienCreationCle: 'https://mymemory.translated.net/doc/spec.php',
  },
];

// ── Fournisseurs d'actualités disponibles (plusieurs, combinables) ──
export const ACTUALITES_PROVIDERS = [
  {
    id: 'newsapi',
    nom: 'NewsAPI',
    icon: '📰',
    gratuit: true,
    description: 'Gratuit pour usage personnel (limité à 100 requêtes/jour). Bonne couverture française.',
    lienCreationCle: 'https://newsapi.org/register',
  },
  {
    id: 'gnews',
    nom: 'GNews',
    icon: '🗞️',
    gratuit: true,
    description: 'Gratuit jusqu\'à 100 requêtes/jour. Bonne alternative pour plus de couverture.',
    lienCreationCle: 'https://gnews.io/register',
  },
];

/**
 * Récupère le fournisseur de traduction actif choisi par l'utilisateur.
 * Par défaut : DeepL si une clé existe, sinon LibreTranslate (pas besoin de clé).
 */
export async function getActiveTraductionProvider() {
  const prefs = await getData('prefs');
  return prefs?.traductionProviderActif || 'deepl';
}

export async function setActiveTraductionProvider(providerId) {
  const prefs = (await getData('prefs')) || {};
  await setData('prefs', { ...prefs, traductionProviderActif: providerId });
}

/**
 * Récupère la liste des fournisseurs d'actualités actuellement activés
 * par l'utilisateur (peut en activer plusieurs en même temps pour
 * combiner les résultats).
 */
export async function getActualitesProvidersActifs() {
  const prefs = await getData('prefs');
  return prefs?.actualitesProvidersActifs || ['newsapi']; // newsapi activé par défaut
}

export async function setActualitesProvidersActifs(liste) {
  const prefs = (await getData('prefs')) || {};
  await setData('prefs', { ...prefs, actualitesProvidersActifs: liste });
}

/**
 * Liste des icônes Kira disponibles, avec leur type d'animation.
 * Utilisé par le sélecteur d'icône dans les Paramètres et par le
 * composant KiraIcon affiché partout dans l'app.
 */
export const KIRA_ICONS = [
  { id: 'etoile', nom: 'Étoile', emoji: '🌟', animation: 'pulse' },
  { id: 'spirale', nom: 'Spirale', emoji: '🌀', animation: 'rotate' },
  { id: 'orbe', nom: 'Orbe électrique', emoji: '🔮', animation: 'pulse-glow' },
  { id: 'atome', nom: 'Atome vivant', emoji: '⚛️', animation: 'rotate' },
  { id: 'comete', nom: 'Comète', emoji: '☄️', animation: 'pulse' },
  { id: 'diamant', nom: 'Diamant', emoji: '💠', animation: 'pulse-glow' },
  { id: 'eclair', nom: 'Éclair vif', emoji: '⚡', animation: 'pulse' },
  { id: 'galaxie', nom: 'Galaxie', emoji: '🌌', animation: 'rotate' },
];

export async function getActiveKiraIcon() {
  const prefs = await getData('prefs');
  return prefs?.kiraIconActive || 'etoile';
}

export async function setActiveKiraIcon(iconId) {
  const prefs = (await getData('prefs')) || {};
  await setData('prefs', { ...prefs, kiraIconActive: iconId });
}

/**
 * Récupère toutes les clés API stockées (objet { gemini: "...", mistral: "...", ... })
 */
export async function getAllApiKeys() {
  const keys = await getData('api_keys');
  return keys || {};
}

/**
 * Sauvegarde une clé API pour un fournisseur donné
 */
export async function setApiKey(providerId, key) {
  const keys = await getAllApiKeys();
  const updated = { ...keys, [providerId]: key.trim() };
  await setData('api_keys', updated);
  return updated;
}

/**
 * Supprime une clé API
 */
export async function removeApiKey(providerId) {
  const keys = await getAllApiKeys();
  const updated = { ...keys };
  delete updated[providerId];
  await setData('api_keys', updated);
  return updated;
}

/**
 * Récupère le fournisseur IA actif choisi par l'utilisateur
 */
export async function getActiveAiProvider() {
  const prefs = await getData('prefs');
  return prefs?.aiProviderActif || null;
}

export async function setActiveAiProvider(providerId) {
  const prefs = (await getData('prefs')) || {};
  await setData('prefs', { ...prefs, aiProviderActif: providerId });
}

/**
 * Liste les fournisseurs IA pour lesquels une clé a été configurée
 */
export async function getConfiguredAiProviders() {
  const keys = await getAllApiKeys();
  return AI_PROVIDERS.filter(p => keys[p.id] && keys[p.id].length > 0);
}
