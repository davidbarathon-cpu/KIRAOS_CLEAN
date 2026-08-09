// ═══════════════════════════════════════════
//  TEST-PROMPT.JS — Teste un prompt Gemini directement,
//  sans passer par l'app ni par une conversation Claude.
//
//  Utilisation :
//    $env:GEMINI_API_KEY = "ta_cle_ici"      (une fois par session terminal)
//    node test-prompt.js "Ton prompt ici..."
//
//  Fonctionne avec Node.js 18+ (fetch est intégré nativement, pas besoin
//  d'installer quoi que ce soit).
// ═══════════════════════════════════════════

const apiKey = process.env.GEMINI_API_KEY;
const modele = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const prompt = process.argv.slice(2).join(' ');

if (!apiKey) {
  console.error('❌ Variable GEMINI_API_KEY manquante.');
  console.error('   Lance d\'abord : $env:GEMINI_API_KEY = "ta_cle_ici"');
  process.exit(1);
}

if (!prompt) {
  console.error('❌ Aucun prompt fourni.');
  console.error('   Utilisation : node test-prompt.js "Ton prompt ici..."');
  process.exit(1);
}

async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${apiKey}`;

  console.log(`🤖 Modèle : ${modele}`);
  console.log(`📝 Prompt : ${prompt}`);
  console.log('⏳ Envoi en cours...\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // Mêmes réglages que dans l'app (lot 67) : on désactive le
      // raisonnement interne de Gemini 2.5, qui grignote sinon le quota
      // de tokens avant même de produire la réponse visible.
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ Erreur ${res.status} :`, JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data?.candidates?.[0]?.finishReason;

  console.log('─'.repeat(60));
  console.log(texte || '(réponse vide)');
  console.log('─'.repeat(60));

  if (finishReason && finishReason !== 'STOP') {
    console.log(`\n⚠️  finishReason: ${finishReason} (si "MAX_TOKENS", la réponse a été coupée — augmente maxOutputTokens dans ce script)`);
  }
}

main().catch(e => {
  console.error('❌ Erreur inattendue :', e.message);
  process.exit(1);
});
