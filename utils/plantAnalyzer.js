// ═══════════════════════════════════════════
// PLANTANALYZER.JS — Analyse de plante par IA
// ═══════════════════════════════════════════

import { File } from 'expo-file-system';

const PROVIDERS_COMPATIBLES_IMAGE = ['gemini', 'claude'];

const PROMPT_ANALYSE = `Tu es Kira, assistante jardinage experte. Analyse cette photo de plante.

CRUCIAL : Tu DOIS répondre UNIQUEMENT avec un objet JSON complet, commençant par '{' et se terminant par '}'.
N'inclus AUCUN texte avant ou après, pas de markdown, pas de commentaires.

Structure exacte à respecter :
{
  "type_plante": "Nom",
  "etat_sante": "Excellent" | "Bon" | "Moyen" | "Préoccupant",
  "score_sante": 0-100,
  "besoin_eau": "Faible" | "Modéré" | "Élevé" | "Urgent",
  "observations": "Texte explicatif sans guillemets doubles",
  "conseil_principal": "Conseil court sans guillemets doubles",
  "conseils_secondaires": ["Conseil 1", "Conseil 2"]
}

Règles :
1. "score_sante" est un nombre, sans guillemets.
2. Interdiction d'utiliser des guillemets doubles (") à l'intérieur des textes — utilise des guillemets simples ou reformule.
3. Le JSON doit être valide et fermé par une accolade finale '}'.`;

async function imageUriEnBase64(uri) {
  const file = new File(uri);
  return file.base64();
}

async function analyserAvecGemini(imageBase64, apiKey, modele = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT_ANALYSE },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { 
        temperature: 0.4, 
        maxOutputTokens: 500,
        // Force l'API à renvoyer un JSON valide et complet
        responseMimeType: "application/json" 
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini erreur ${res.status} : ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texte) throw new Error('Réponse Gemini vide.');
  return texte;
}

async function analyserAvecClaude(imageBase64, apiKey, modele = 'claude-3-5-haiku-latest') {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modele,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: PROMPT_ANALYSE },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude erreur ${res.status} : ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const texte = data?.content?.[0]?.text;
  if (!texte) throw new Error('Réponse Claude vide.');
  return texte;
}

function extraireJson(texte) {
  let nettoye = texte.replace(/```json|```/g, '').trim();
  const matchAccolades = nettoye.match(/\{[\s\S]*\}/);
  let aTraiter = matchAccolades ? matchAccolades[0] : nettoye;
  aTraiter = aTraiter.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(aTraiter);
  } catch (e) {
    const extrait = aTraiter.length > 300 ? `${aTraiter.slice(0, 300)}…` : aTraiter;
    throw new Error(`${e.message} — réponse reçue de l'IA : ${extrait}`);
  }
}

export async function analyserPlante(imageUri, providerActif, apiKey, modele) {
  if (!providerActif || !apiKey) {
    return {
      resultat: null,
      erreur: 'AUCUN_PROVIDER',
      message: "Configure d'abord un fournisseur IA dans Paramètres → 🔑 API.",
    };
  }

  if (!PROVIDERS_COMPATIBLES_IMAGE.includes(providerActif)) {
    return {
      resultat: null,
      erreur: 'PROVIDER_INCOMPATIBLE',
      message: "Utilise Gemini ou Claude pour l'analyse d'image.",
    };
  }

  try {
    const imageBase64 = await imageUriEnBase64(imageUri);
    const texteReponse = providerActif === 'gemini'
      ? await analyserAvecGemini(imageBase64, apiKey, modele)
      : await analyserAvecClaude(imageBase64, apiKey, modele);

    const resultat = extraireJson(texteReponse);
    return { resultat, erreur: null };
  } catch (e) {
    return {
      resultat: null,
      erreur: 'ECHEC_ANALYSE',
      message: `L'analyse a échoué : ${e.message}`,
    };
  }
}

export { PROVIDERS_COMPATIBLES_IMAGE };