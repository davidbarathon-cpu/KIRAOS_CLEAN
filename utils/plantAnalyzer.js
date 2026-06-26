// ═══════════════════════════════════════════
//  PLANTANALYZER.JS — Analyse de plante par IA
//  Utilise le fournisseur IA actif de Kira
//  (Gemini ou Claude, les deux seuls supportant
//  bien l'analyse d'image dans notre sélection).
//  Si Mistral ou OpenAI sont actifs, ou si aucun
//  fournisseur n'est configuré, on prévient
//  clairement l'utilisateur plutôt que d'échouer
//  silencieusement.
//
//  CORRECTIF LOT 32 : la conversion image → base64
//  utilisait auparavant fetch(uri).blob() puis
//  FileReader.readAsDataURL(), une technique qui ne
//  fonctionne plus sur le moteur Hermes utilisé par
//  Expo SDK 56+ ("Creating blobs from 'ArrayBuffer'
//  and 'ArrayBufferView' are not supported"). Remplacé
//  par la nouvelle API expo-file-system (classe File),
//  stable depuis le SDK 54, qui lit directement le
//  fichier en base64 sans jamais passer par un Blob.
// ═══════════════════════════════════════════

import { File } from 'expo-file-system';

const PROVIDERS_COMPATIBLES_IMAGE = ['gemini', 'claude'];

const PROMPT_ANALYSE = `Tu es Kira, assistante jardinage experte. Analyse cette photo de plante et réponds UNIQUEMENT au format JSON suivant, sans aucun texte avant ou après, sans balises markdown :

{
  "type_plante": "nom de la plante identifiée (ou 'Non identifiée' si incertain)",
  "etat_sante": "Excellent" | "Bon" | "Moyen" | "Préoccupant",
  "score_sante": nombre entre 0 et 100,
  "besoin_eau": "Faible" | "Modéré" | "Élevé" | "Urgent",
  "observations": "2-3 phrases décrivant ce que tu observes (couleur des feuilles, signes de stress, parasites visibles, etc.)",
  "conseil_principal": "1-2 phrases avec le conseil le plus important et actionnable",
  "conseils_secondaires": ["conseil court 1", "conseil court 2"]
}`;

/**
 * Convertit une URI locale d'image (fournie par expo-image-picker) en base64,
 * nécessaire pour l'envoyer aux API Gemini/Claude.
 * Utilise la classe File (API moderne expo-file-system, stable depuis le
 * SDK 54) qui lit directement le contenu en base64, sans passer par Blob
 * ni FileReader — ces derniers ne fonctionnent plus de façon fiable sur le
 * moteur Hermes des versions récentes de React Native.
 */
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
      generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
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

/**
 * Extrait le JSON de la réponse texte de l'IA, même si elle a ajouté
 * du texte ou des balises markdown autour (```json ... ```) malgré la consigne.
 */
function extraireJson(texte) {
  const nettoye = texte.replace(/```json|```/g, '').trim();
  const matchAccolades = nettoye.match(/\{[\s\S]*\}/);
  const aTraiter = matchAccolades ? matchAccolades[0] : nettoye;
  return JSON.parse(aTraiter);
}

/**
 * Point d'entrée principal : analyse une photo de plante.
 * imageUri = URI locale renvoyée par expo-image-picker
 * providerActif = 'gemini' | 'claude' | 'mistral' | 'openai' | null
 * Retourne { resultat, erreur } — resultat est null en cas d'échec.
 */
export async function analyserPlante(imageUri, providerActif, apiKey, modele) {
  if (!providerActif || !apiKey) {
    return {
      resultat: null,
      erreur: 'AUCUN_PROVIDER',
      message: "Configure d'abord un fournisseur IA (Gemini ou Claude) dans Paramètres → 🔑 API, puis active-le pour Kira.",
    };
  }

  if (!PROVIDERS_COMPATIBLES_IMAGE.includes(providerActif)) {
    return {
      resultat: null,
      erreur: 'PROVIDER_INCOMPATIBLE',
      message: `${providerActif === 'mistral' ? 'Mistral' : 'OpenAI (modèle mini)'} ne gère pas bien l'analyse d'image dans notre configuration. Bascule temporairement sur Gemini ou Claude dans Paramètres → 🔑 API pour analyser tes plantes.`,
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

