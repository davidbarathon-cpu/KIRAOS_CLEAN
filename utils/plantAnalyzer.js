// ═══════════════════════════════════════════
//  PLANTANALYZER.JS — Analyse de plante par IA
//  Utilise le fournisseur IA actif de Kira
//  (Gemini ou Claude, les deux seuls supportant
//  bien l'analyse d'image dans notre sélection).
//  Si Mistral ou OpenAI sont actifs, ou si aucun
//  fournisseur n'est configuré, on prévient
//  clairement l'utilisateur plutôt que d'échouer
//  silencieusement.
// ═══════════════════════════════════════════

const PROVIDERS_COMPATIBLES_IMAGE = ['gemini', 'claude'];

const PROMPT_ANALYSE = `Tu es Kira, assistante jardinage experte. Analyse cette photo de plante.

Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre : pas de texte avant ou après, pas de balises markdown, pas de commentaires.

Voici un EXEMPLE de réponse valide (remplace les valeurs par ta vraie analyse, mais garde exactement cette structure et ce format) :

{"type_plante": "Tomate cerise", "etat_sante": "Bon", "score_sante": 85, "besoin_eau": "Modéré", "observations": "Les feuilles sont vert vif sans signe de stress visible. Quelques taches jaunes sur les feuilles basses, normal a ce stade.", "conseil_principal": "Arrose le sol reste legerement humide, attends encore un jour.", "conseils_secondaires": ["Surveille les feuilles basses", "Apporte de l'engrais dans 2 semaines"]}

Règles STRICTES à respecter pour que ta réponse soit lisible par un programme :
- "etat_sante" doit valoir EXACTEMENT une seule de ces 4 valeurs : Excellent, Bon, Moyen, Préoccupant
- "besoin_eau" doit valoir EXACTEMENT une seule de ces 4 valeurs : Faible, Modéré, Élevé, Urgent
- "score_sante" est un nombre entier entre 0 et 100, sans guillemets autour
- N'utilise JAMAIS de guillemets doubles (") à l'intérieur des textes de "observations", "conseil_principal" ou des éléments de "conseils_secondaires" — utilise des guillemets simples ou reformule sans guillemets
- N'ajoute aucune virgule après le dernier élément d'une liste ou d'un objet
- "conseils_secondaires" contient exactement 2 courtes phrases sous forme de liste`;

/**
 * Convertit une URI locale d'image (fournie par expo-image-picker) en base64,
 * nécessaire pour l'envoyer aux API Gemini/Claude.
 */
async function imageUriEnBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result ressemble à "data:image/jpeg;base64,/9j/4AAQ..."
      // on ne garde que la partie après la virgule
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
 *
 * MISE À JOUR LOT 35 : ajoute un nettoyage des erreurs de syntaxe les plus
 * fréquentes que les IA introduisent malgré les consignes (virgules finales
 * avant une accolade/crochet fermant), et propage le texte brut reçu dans
 * le message d'erreur en cas d'échec — avant cette mise à jour, l'erreur
 * "JSON Parse error" ne donnait aucune piste pour comprendre ce qui avait
 * réellement été reçu de l'IA.
 */
function extraireJson(texte) {
  let nettoye = texte.replace(/```json|```/g, '').trim();
  const matchAccolades = nettoye.match(/\{[\s\S]*\}/);
  let aTraiter = matchAccolades ? matchAccolades[0] : nettoye;

  // Retire les virgules finales avant une accolade ou un crochet fermant
  // (ex: `"a": 1, }` ou `["x", "y",]`), erreur fréquente des modèles IA
  // que Hermes (le moteur JS d'Android) refuse plus strictement que d'autres
  // environnements JavaScript.
  aTraiter = aTraiter.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(aTraiter);
  } catch (e) {
    // Message enrichi avec un extrait du texte réellement reçu, pour
    // pouvoir diagnostiquer la prochaine fois si le problème se reproduit
    // (au lieu d'un message générique impossible à investiguer).
    const extrait = aTraiter.length > 300 ? `${aTraiter.slice(0, 300)}…` : aTraiter;
    throw new Error(`${e.message} — réponse reçue de l'IA : ${extrait}`);
  }
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

