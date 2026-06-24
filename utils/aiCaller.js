// ═══════════════════════════════════════════
//  AICALLER.JS — Appels réels aux IA en ligne
//  Chaque fonction prend le message, le contexte
//  (profil/santé/agenda...) et la clé API, et
//  retourne la réponse texte de l'IA.
//
//  Si l'appel échoue (pas de réseau, clé invalide,
//  quota dépassé), on bascule automatiquement sur
//  getOfflineReply() de kiraBrain.js — Kira ne
//  reste donc jamais muette.
// ═══════════════════════════════════════════

import { getOfflineReply } from './kiraBrain';

// ── Construit le contexte système envoyé à l'IA ──
// C'est ce qui donne à Kira sa personnalité et sa connaissance de l'utilisateur.
function buildSystemPrompt(appState) {
  const nom = appState.profil?.prenom || appState.profil?.nom || "l'utilisateur";
  const s = appState.sante || {};
  const agendaTxt = (appState.agenda || []).slice(0, 5).map(e => `${e.h} - ${e.t}`).join(', ') || 'Rien de prévu';

  return `Tu es Kira, une assistante personnelle et coach de vie bienveillante, enthousiaste et un peu rigolote, intégrée dans une application mobile appelée Kira OS.

Contexte sur l'utilisateur (${nom}) :
- Niveau guitare : ${appState.profil?.guitareNiv || 'non précisé'}
- Niveau chant : ${appState.profil?.chantNiv || 'non précisé'}
- Signe astrologique : ${appState.profil?.signe || 'non précisé'}
- Pas aujourd'hui : ${s.pas ?? '?'} / objectif ${s.oP ?? '?'}
- Sommeil dernière nuit : ${s.som ?? '?'}h / objectif ${s.oSom ?? '?'}h
- Hydratation : ${s.eau ?? '?'}L / objectif ${s.oEau ?? '?'}L
- Agenda du jour : ${agendaTxt}
- Mode énergétique actuel de Kira : ${appState.kiraState || 'flow'} (rush = sois directe et efficace, flow = sois créative et engageante, recovery = sois douce et protectrice)

Réponds toujours en français, de façon chaleureuse, concise (3-6 phrases sauf si on te demande plus de détails), avec des emojis utilisés avec parcimonie. Tu peux faire référence aux modules de l'application (agenda, santé, guitare, cuisine, courses, météo, horoscope, notes, potager, parking, actualités, traduction, musique, réveil, domotique) si c'est pertinent pour ta réponse. Tu es une vraie coach de vie, pas juste un assistant technique : encourage, motive, et donne des conseils concrets et actionnables.`;
}

// ── Google Gemini ──
async function appelGemini(message, appState, apiKey, modele = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${apiKey}`;
  const systemPrompt = buildSystemPrompt(appState);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nMessage de l'utilisateur : ${message}` }] },
      ],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini a renvoyé une erreur (${res.status}) : ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texte) throw new Error('Réponse Gemini vide ou inattendue.');
  return texte.trim();
}

// ── Mistral AI ──
async function appelMistral(message, appState, apiKey, modele = 'mistral-small-latest') {
  const systemPrompt = buildSystemPrompt(appState);

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modele,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Mistral a renvoyé une erreur (${res.status}) : ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const texte = data?.choices?.[0]?.message?.content;
  if (!texte) throw new Error('Réponse Mistral vide ou inattendue.');
  return texte.trim();
}

// ── Claude (Anthropic) ──
async function appelClaude(message, appState, apiKey, modele = 'claude-3-5-haiku-latest') {
  const systemPrompt = buildSystemPrompt(appState);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modele,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude a renvoyé une erreur (${res.status}) : ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const texte = data?.content?.[0]?.text;
  if (!texte) throw new Error('Réponse Claude vide ou inattendue.');
  return texte.trim();
}

// ── OpenAI (GPT) ──
async function appelOpenAI(message, appState, apiKey, modele = 'gpt-4o-mini') {
  const systemPrompt = buildSystemPrompt(appState);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modele,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI a renvoyé une erreur (${res.status}) : ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const texte = data?.choices?.[0]?.message?.content;
  if (!texte) throw new Error('Réponse OpenAI vide ou inattendue.');
  return texte.trim();
}

const APPELS_PAR_PROVIDER = {
  gemini: appelGemini,
  mistral: appelMistral,
  claude: appelClaude,
  openai: appelOpenAI,
};

/**
 * Point d'entrée principal : envoie un message à Kira.
 * - Si un fournisseur IA actif est configuré avec une clé valide, tente l'appel réel.
 * - En cas d'échec (réseau, clé invalide, quota...), bascule sur le mode hors-ligne.
 * - Retourne toujours { texte, source } où source = 'live' ou 'offline'.
 */
export async function demanderAKira(message, appState, providerId, apiKey, modele) {
  if (providerId && apiKey && APPELS_PAR_PROVIDER[providerId]) {
    try {
      const texte = await APPELS_PAR_PROVIDER[providerId](message, appState, apiKey, modele);
      return { texte, source: 'live', erreur: null };
    } catch (e) {
      // On bascule sur le mode hors-ligne mais on garde le message d'erreur
      // pour que l'utilisateur comprenne ce qui s'est passé (visible dans les paramètres/debug).
      const texteOffline = getOfflineReply(message, appState);
      return { texte: texteOffline, source: 'offline', erreur: e.message };
    }
  }
  // Pas de fournisseur configuré → mode hors-ligne directement, sans erreur affichée
  const texteOffline = getOfflineReply(message, appState);
  return { texte: texteOffline, source: 'offline', erreur: null };
}
