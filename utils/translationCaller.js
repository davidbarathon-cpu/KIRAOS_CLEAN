// ═══════════════════════════════════════════
//  TRANSLATIONCALLER.JS — Traduction multi-fournisseurs
//  MISE À JOUR LOT 11 : DeepL + LibreTranslate +
//  MyMemory, avec sélection du fournisseur actif
//  et ajout du russe à la liste des langues.
// ═══════════════════════════════════════════

// Codes DeepL (légèrement différents en langue source vs cible)
const DEEPL_SOURCE = { fr: 'FR', en: 'EN', es: 'ES', de: 'DE', it: 'IT', pt: 'PT', ja: 'JA', zh: 'ZH', ru: 'RU' };
const DEEPL_CIBLE = { fr: 'FR', en: 'EN-GB', es: 'ES', de: 'DE', it: 'IT', pt: 'PT-PT', ja: 'JA', zh: 'ZH', ru: 'RU' };

// Codes ISO standards utilisés par LibreTranslate et MyMemory
const CODE_ISO = { fr: 'fr', en: 'en', es: 'es', de: 'de', it: 'it', pt: 'pt', ja: 'ja', zh: 'zh', ru: 'ru' };

async function traduireDeepL(texte, langSource, langCible, apiKey) {
  if (!apiKey) {
    return { texte: "[Aucune clé DeepL configurée]\n\nAjoute ta clé gratuite dans Paramètres → 🔑 API, ou choisis un autre fournisseur de traduction.", source: 'non_configure' };
  }
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `DeepL-Auth-Key ${apiKey}` },
    body: new URLSearchParams({
      text: texte,
      source_lang: DEEPL_SOURCE[langSource] || 'FR',
      target_lang: DEEPL_CIBLE[langCible] || 'EN-GB',
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL erreur ${res.status} : ${body.slice(0, 150)}`);
  }
  const data = await res.json();
  const traduction = data?.translations?.[0]?.text;
  if (!traduction) throw new Error('Réponse DeepL vide ou inattendue.');
  return { texte: traduction, source: 'live' };
}

async function traduireLibreTranslate(texte, langSource, langCible) {
  // Serveur public officiel — pas de clé requise pour un usage personnel léger.
  // Si jamais ce serveur public est surchargé, on pourra proposer une URL alternative.
  const res = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texte,
      source: CODE_ISO[langSource] || 'fr',
      target: CODE_ISO[langCible] || 'en',
      format: 'text',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LibreTranslate erreur ${res.status} : ${body.slice(0, 150)}`);
  }
  const data = await res.json();
  if (!data.translatedText) throw new Error('Réponse LibreTranslate vide ou inattendue.');
  return { texte: data.translatedText, source: 'live' };
}

async function traduireMyMemory(texte, langSource, langCible) {
  const paire = `${CODE_ISO[langSource] || 'fr'}|${CODE_ISO[langCible] || 'en'}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=${paire}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MyMemory erreur ${res.status} : ${body.slice(0, 150)}`);
  }
  const data = await res.json();
  const traduction = data?.responseData?.translatedText;
  if (!traduction) throw new Error('Réponse MyMemory vide ou inattendue.');
  return { texte: traduction, source: 'live' };
}

const APPELS_PAR_PROVIDER = {
  deepl: traduireDeepL,
  libretranslate: traduireLibreTranslate,
  mymemory: traduireMyMemory,
};

/**
 * Traduit un texte via le fournisseur choisi. providerId = 'deepl' | 'libretranslate' | 'mymemory'.
 * apiKey n'est utilisé que par DeepL (les deux autres n'en ont pas besoin).
 * Retourne { texte, source, providerUtilise } où source = 'live' | 'erreur' | 'non_configure'.
 */
export async function traduireTexte(texte, langSource, langCible, providerId, apiKey) {
  if (!texte || !texte.trim()) {
    return { texte: '', source: 'vide', providerUtilise: providerId };
  }

  const fonction = APPELS_PAR_PROVIDER[providerId] || traduireLibreTranslate;

  try {
    const resultat = providerId === 'deepl'
      ? await fonction(texte, langSource, langCible, apiKey)
      : await fonction(texte, langSource, langCible);
    return { ...resultat, providerUtilise: providerId };
  } catch (e) {
    return {
      texte: `⚠️ Erreur de traduction (${providerId}) : ${e.message}\n\nEssaie un autre fournisseur dans Paramètres → 🔑 API, ou réessaie dans quelques instants.`,
      source: 'erreur',
      erreurMessage: e.message,
      providerUtilise: providerId,
    };
  }
}
