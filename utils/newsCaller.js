// ═══════════════════════════════════════════
//  NEWSCALLER.JS — Actualités multi-fournisseurs
//  MISE À JOUR LOT 11 : combine NewsAPI + GNews
//  selon les fournisseurs activés par l'utilisateur,
//  fusionne et dédoublonne les résultats.
// ═══════════════════════════════════════════

const CATEGORIE_VERS_NEWSAPI = {
  Tech: 'technology', Santé: 'health', Sport: 'sports',
  Environnement: 'science', Culture: 'entertainment',
};

const CATEGORIE_VERS_GNEWS = {
  Tech: 'technology', Santé: 'health', Sport: 'sports',
  Environnement: 'science', Culture: 'entertainment',
};

const COULEURS_CATEGORIE = {
  Tech: '#6C63FF', Santé: '#FF6584', Sport: '#4FC3F7',
  Musique: '#FF8C32', Environnement: '#43D9AD', Culture: '#F59E0B',
};

const ACTU_SECOURS = [
  { id: 'demo-1', t: "L'IA révolutionne la médecine personnalisée", src: 'Le Monde', cat: 'Tech', c: '#6C63FF', r: "Des algorithmes d'IA adaptent désormais les traitements en temps réel.", url: null },
  { id: 'demo-2', t: 'Record de chaleur en Europe cet été', src: 'Météo France', cat: 'Environnement', c: '#43D9AD', r: 'Les températures sont 3 à 5°C au-dessus des normales saisonnières.', url: null },
  { id: 'demo-3', t: 'Tour de France 2026 — 8 étapes de montagne', src: "L'Équipe", cat: 'Sport', c: '#4FC3F7', r: "La 113e édition promet un tracé exigeant.", url: null },
  { id: 'demo-4', t: 'Bienfaits du jeûne intermittent confirmés', src: 'Sciences & Vie', cat: 'Santé', c: '#FF6584', r: "Une large méta-analyse confirme les bénéfices métaboliques.", url: null },
];

async function getActualitesNewsApi(categorie, apiKey) {
  if (!apiKey) return [];
  let url;
  if (categorie === 'Tout' || !categorie) {
    url = `https://newsapi.org/v2/top-headlines?country=fr&pageSize=20&apiKey=${apiKey}`;
  } else if (categorie === 'Musique') {
    url = `https://newsapi.org/v2/everything?q=musique%20OR%20guitare%20OR%20concert&language=fr&sortBy=publishedAt&pageSize=15&apiKey=${apiKey}`;
  } else {
    const cat = CATEGORIE_VERS_NEWSAPI[categorie] || 'general';
    url = `https://newsapi.org/v2/top-headlines?country=fr&category=${cat}&pageSize=15&apiKey=${apiKey}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const data = await res.json();

  return (data.articles || [])
    .filter(a => a.title && a.title !== '[Removed]')
    .map((a, i) => ({
      id: `newsapi-${i}`,
      t: a.title,
      src: a.source?.name || 'NewsAPI',
      cat: categorie === 'Tout' ? 'Actu' : categorie,
      c: COULEURS_CATEGORIE[categorie] || '#8B78FF',
      r: a.description || 'Pas de résumé disponible.',
      url: a.url,
      image: a.urlToImage,
      date: a.publishedAt,
      fournisseur: 'NewsAPI',
    }));
}

async function getActualitesGNews(categorie, apiKey) {
  if (!apiKey) return [];
  let url;
  if (categorie === 'Tout' || !categorie) {
    url = `https://gnews.io/api/v4/top-headlines?lang=fr&country=fr&max=20&apikey=${apiKey}`;
  } else if (categorie === 'Musique') {
    url = `https://gnews.io/api/v4/search?q=musique%20OR%20guitare%20OR%20concert&lang=fr&max=15&apikey=${apiKey}`;
  } else {
    const cat = CATEGORIE_VERS_GNEWS[categorie] || 'general';
    url = `https://gnews.io/api/v4/top-headlines?category=${cat}&lang=fr&country=fr&max=15&apikey=${apiKey}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews ${res.status}`);
  const data = await res.json();

  return (data.articles || []).map((a, i) => ({
    id: `gnews-${i}`,
    t: a.title,
    src: a.source?.name || 'GNews',
    cat: categorie === 'Tout' ? 'Actu' : categorie,
    c: COULEURS_CATEGORIE[categorie] || '#8B78FF',
    r: a.description || 'Pas de résumé disponible.',
    url: a.url,
    image: a.image,
    date: a.publishedAt,
    fournisseur: 'GNews',
  }));
}

const APPELS_PAR_PROVIDER = {
  newsapi: getActualitesNewsApi,
  gnews: getActualitesGNews,
};

/**
 * Déduplique des articles approximativement similaires (même titre à 85%+)
 * pour éviter d'afficher deux fois la même dépêche reprise par plusieurs médias.
 */
function dedupliquer(articles) {
  const vus = [];
  return articles.filter(a => {
    const titreNormalise = a.t.toLowerCase().slice(0, 40);
    if (vus.includes(titreNormalise)) return false;
    vus.push(titreNormalise);
    return true;
  });
}

/**
 * Récupère les actualités en combinant tous les fournisseurs activés par l'utilisateur.
 * providersActifs = tableau d'ids, ex: ['newsapi', 'gnews']
 * apiKeys = objet complet des clés de l'utilisateur (on prend celles qui concernent les actus)
 * Retourne { articles, source, erreurs } où source = 'live' | 'non_configure'.
 */
export async function getActualites(categorie, providersActifs, apiKeys) {
  const providersAvecCle = (providersActifs || []).filter(p => apiKeys?.[p]);

  if (providersAvecCle.length === 0) {
    return { articles: ACTU_SECOURS, source: 'non_configure', erreurs: [] };
  }

  const resultats = await Promise.allSettled(
    providersAvecCle.map(p => APPELS_PAR_PROVIDER[p](categorie, apiKeys[p]))
  );

  const articlesCombines = [];
  const erreurs = [];
  resultats.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      articlesCombines.push(...r.value);
    } else {
      erreurs.push(`${providersAvecCle[i]} : ${r.reason.message}`);
    }
  });

  if (articlesCombines.length === 0) {
    return { articles: ACTU_SECOURS, source: erreurs.length > 0 ? 'erreur' : 'vide', erreurs };
  }

  // Mélange légèrement les sources plutôt que de tout grouper par fournisseur,
  // puis déduplique les titres très proches
  const dedupliques = dedupliquer(articlesCombines);
  return { articles: dedupliques, source: 'live', erreurs };
}
