// ═══════════════════════════════════════════
//  HOROSCOPECALLER.JS — Horoscope réellement quotidien (lot 47)
//
//  Avant ce lot, HOROSCOPE_DATA (dans HoroscopeScreen.js) contenait UN
//  SEUL texte fixe par signe, écrit une fois pour toutes lors de la
//  création du module — ce n'était donc jamais "du jour" au sens
//  propre, juste un texte statique par signe qui ne bougeait jamais
//  (bug remonté le 11/07 : "j'ai l'impression que mon horoscope est
//  tous les jours le même" — confirmé, c'était bien le cas).
//
//  Ce module génère maintenant un vrai horoscope différent chaque jour
//  civil, par IA si un fournisseur est configuré, sinon en piochant
//  dans plusieurs variantes par signe selon la date (même technique
//  que cuisineCaller.js).
// ═══════════════════════════════════════════

import { getData, setData } from './storage';
import { demanderAKira } from './aiCaller';

const CLE_CACHE_HOROSCOPE = 'horoscope_cache';

// ── Variantes de secours par signe (mode hors-ligne) ──
// Plusieurs textes par signe pour qu'une vraie rotation quotidienne
// soit possible sans répéter le même message chaque jour.
const VARIANTES_SECOURS = {
  'Bélier': [
    'Journée propice aux initiatives. Ton énergie attire les opportunités.',
    'Un élan de spontanéité te pousse à agir vite — fais confiance à ton instinct aujourd\'hui.',
    'La compétition stimule ton énergie ce jour-ci. Canalise-la vers un objectif précis.',
  ],
  'Taureau': [
    'La patience sera ton alliée. Un projet prend forme lentement mais sûrement.',
    'Un moment de confort mérité t\'attend — accorde-toi une pause bien gagnée.',
    'Ta détermination tranquille impressionne ton entourage aujourd\'hui.',
  ],
  'Gémeaux': [
    'Ta créativité est à son apogée. Profite-en pour tes projets artistiques.',
    'Une conversation inattendue pourrait t\'apporter une idée précieuse.',
    'Ton esprit curieux te pousse vers de nouvelles découvertes ce jour-ci.',
  ],
  'Cancer': [
    'Les émotions sont vives. Prends soin de toi et de tes proches.',
    'Un souvenir agréable refait surface et colore positivement ta journée.',
    'Ton intuition familiale te guide vers la bonne décision aujourd\'hui.',
  ],
  'Lion': [
    'Ton charisme rayonne. C\'est le moment de te mettre en avant. Une reconnaissance arrive.',
    'Une occasion de briller se présente — ne la laisse pas passer.',
    'Ta générosité naturelle touche quelqu\'un de ton entourage aujourd\'hui.',
  ],
  'Vierge': [
    'L\'organisation sera la clé. Tes efforts minutieux portent leurs fruits.',
    'Un détail que tu avais remarqué se révèle important aujourd\'hui.',
    'Ton sens pratique aide quelqu\'un à résoudre un problème du quotidien.',
  ],
  'Balance': [
    'L\'harmonie est au cœur de ta journée. Des compromis constructifs sont possibles.',
    'Ton sens esthétique s\'exprime particulièrement bien aujourd\'hui.',
    'Une décision en suspens trouve enfin un équilibre satisfaisant.',
  ],
  'Scorpion': [
    'Ton intuition est affûtée. Fais confiance à tes ressentis profonds.',
    'Une vérité cachée pourrait se révéler à toi aujourd\'hui.',
    'Ta détermination profonde te permet d\'avancer malgré les obstacles.',
  ],
  'Sagittaire': [
    'L\'aventure t\'appelle ! Une découverte intellectuelle ou physique s\'annonce.',
    'Ton optimisme contagieux redonne le sourire à ceux qui t\'entourent.',
    'Une opportunité de voyage ou d\'évasion, même petite, se présente.',
  ],
  'Capricorne': [
    'La persévérance paie enfin. Un objectif à long terme est à portée de main.',
    'Ta rigueur habituelle porte enfin ses fruits visibles aujourd\'hui.',
    'Une responsabilité supplémentaire t\'es confiée — signe de confiance méritée.',
  ],
  'Verseau': [
    'Ton originalité fait la différence. Une idée innovante te distingue.',
    'Un projet collectif bénéficie particulièrement de ta vision unique.',
    'Ton indépendance d\'esprit t\'aide à voir une situation sous un angle nouveau.',
  ],
  'Poissons': [
    'Ta sensibilité artistique est exacerbée. Crée, chante, dessine !',
    'Un rêve ou une intuition mérite d\'être pris au sérieux aujourd\'hui.',
    'Ta compassion naturelle apaise une situation tendue autour de toi.',
  ],
};

function choisirParSeed(tableau, seedTexte) {
  let hash = 0;
  for (let i = 0; i < seedTexte.length; i++) {
    hash = (hash * 31 + seedTexte.charCodeAt(i)) >>> 0;
  }
  return tableau[hash % tableau.length];
}

function chiffresChanceDuJour(seedTexte) {
  let hash = 0;
  for (let i = 0; i < seedTexte.length; i++) {
    hash = (hash * 17 + seedTexte.charCodeAt(i)) >>> 0;
  }
  const a = (hash % 28) + 1;
  const b = ((hash >> 4) % 28) + 1;
  return `${a}, ${b}`;
}

function construirePrompt(signe, element) {
  const maintenant = new Date();
  const jour = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `Tu es Kira, astrologue bienveillante. Rédige l'horoscope du ${jour} pour le signe ${signe} (élément ${element}).

Réponds UNIQUEMENT avec un objet JSON, rien d'autre, au format exact :
{"desc": "2-3 phrases d'horoscope positif et concret, en français, sans être générique", "lucky": "deux nombres entre 1 et 28 séparés par une virgule"}

Varie le ton et les thèmes abordés (amour, travail, énergie, créativité...) plutôt que de rester générique.`;
}

function extraireJson(texte) {
  const nettoye = texte.replace(/```json|```/g, '').trim();
  const match = nettoye.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : nettoye);
}

/**
 * Retourne l'horoscope du jour pour un signe donné : { desc, lucky, source }.
 * Même logique de cache/régénération que getRecettesDuJour.
 */
export async function getHoroscopeDuJour(signe, providerActif, apiKeys, forcerRegeneration = false) {
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR');
  const cle = `${dateAujourdhui}_${signe}`;

  if (!forcerRegeneration) {
    const cache = await getData(CLE_CACHE_HOROSCOPE);
    if (cache && cache.cle === cle) {
      return { desc: cache.desc, lucky: cache.lucky, source: cache.source };
    }
  }

  const { AI_PROVIDERS } = await import('./apiKeys');
  const providerInfo = AI_PROVIDERS.find(p => p.id === providerActif);
  const apiKey = providerActif ? apiKeys[providerActif] : null;

  if (providerActif && apiKey && providerInfo) {
    try {
      const prompt = construirePrompt(signe, '');
      const { texte, source } = await demanderAKira(prompt, { kiraState: 'flow' }, providerActif, apiKey, providerInfo.modeleParDefaut, []);
      if (source === 'live') {
        const resultat = extraireJson(texte);
        if (resultat.desc) {
          await setData(CLE_CACHE_HOROSCOPE, { cle, desc: resultat.desc, lucky: resultat.lucky || '7, 21', source: 'ia' });
          return { desc: resultat.desc, lucky: resultat.lucky || '7, 21', source: 'ia' };
        }
      }
    } catch (e) {
      console.warn('Génération horoscope IA échouée, secours utilisé:', e.message);
    }
  }

  const variantes = VARIANTES_SECOURS[signe] || VARIANTES_SECOURS['Lion'];
  const desc = choisirParSeed(variantes, `${dateAujourdhui}_${signe}`);
  const lucky = chiffresChanceDuJour(`${dateAujourdhui}_${signe}`);
  await setData(CLE_CACHE_HOROSCOPE, { cle, desc, lucky, source: 'offline' });
  return { desc, lucky, source: 'offline' };
}
