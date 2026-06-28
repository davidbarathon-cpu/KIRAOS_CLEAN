// ═══════════════════════════════════════════
//  KIRABRAIN.JS — Le cerveau de Kira
//  MISE À JOUR LOT 5 : Traduction, Réveil,
//  Domotique. Tous les modules du
//  cahier des charges sont maintenant couverts.
//  MISE À JOUR LOT 37 : Kira peut désormais
//  répondre à partir de ce qu'on lui a explicitement
//  demandé de retenir ("souviens-toi que..."), même
//  en mode hors-ligne (sans IA configurée).
// ═══════════════════════════════════════════

import { HOROSCOPE_DATA } from '../screens/HoroscopeScreen';
import { getFaitsMemorises, rechercherFaitsPertinents } from './kiraMemoire';

export function analyzeContext(agenda, sante, heureStr) {
  const h = parseInt(heureStr, 10);
  const soon = agenda.filter(e => {
    const eh = parseInt(e.h, 10);
    return eh >= h && eh <= h + 2;
  }).length;
  if (soon >= 2 || sante.fc > 90) return 'rush';
  if (h >= 20 || sante.som < 6) return 'recovery';
  return 'flow';
}

export function generatePredictions(agenda, sante, heureStr) {
  const h = parseInt(heureStr, 10);
  const preds = [];
  const next = agenda.find(e => parseInt(e.h, 10) > h);
  if (next && parseInt(next.h, 10) - h < 2)
    preds.push({ id: 'reschedule', icon: '📅', msg: `Tu as "${next.t}" dans moins de 2h. Prépare tes notes maintenant !`, action: 'Ok Kira ✓', color: '#6C63FF' });
  if (sante.eau < 1.5)
    preds.push({ id: 'water', icon: '💧', msg: `Seulement ${sante.eau}L d'eau (objectif ${sante.oEau}L). Bois maintenant !`, action: 'Noté ✓', color: '#43D9AD' });
  if (sante.som < 7)
    preds.push({ id: 'sleep', icon: '😴', msg: `Sommeil insuffisant (${sante.som}h). Mode Récupération activé.`, action: 'Merci Kira', color: '#A78BFA' });
  return preds;
}

export const STATE_LABELS = {
  rush: '⚡ Rush',
  flow: '🌊 Flow',
  recovery: '🌙 Récupération',
};

export async function getOfflineReply(txt, appState) {
  const low = txt.toLowerCase();
  const nom = appState.profil?.prenom || appState.profil?.nom || 'toi';
  const s = appState.sante || {};
  const modeLabel = STATE_LABELS[appState.kiraState] || STATE_LABELS.flow;
  const has = words => words.some(w => low.includes(w));

  // ── Mémoire longue durée (lot 37) ──
  // Vérifiée en priorité : si la question correspond à un fait que
  // l'utilisateur a explicitement demandé de retenir, Kira répond avec ce
  // fait précis plutôt qu'avec une réponse générique. Recherche simple par
  // mots-clés communs (cohérent avec le reste du système d'intentions de
  // l'app, volontairement simple plutôt qu'une vraie recherche sémantique).
  const faitsMemorises = await getFaitsMemorises();
  if (faitsMemorises.length > 0) {
    const faitsPertinents = rechercherFaitsPertinents(faitsMemorises, txt);
    if (faitsPertinents.length > 0) {
      return [
        `🧠 Je me souviens, ${nom} !`,
        '',
        faitsPertinents.map(f => `• ${f.texte}`).join('\n'),
      ].join('\n');
    }
  }

  if (has(['bonjour', 'salut', 'coucou', 'bilan', 'résumé', 'resume', 'journée', 'hello'])) {
    return [
      `Bonjour ${nom} ! 🌟`,
      `Mode actuel : ${modeLabel}`,
      '',
      'Ton bilan du jour :',
      `• 👟 ${s.pas ?? 0} pas — ${s.oP ? Math.round((s.pas / s.oP) * 100) : 0}%`,
      `• 😴 Sommeil : ${s.som ?? '?'}h / ${s.oSom ?? '?'}h${(s.som ?? 8) < 7 ? ' — couche-toi tôt 🌙' : ' — parfait !'}`,
      `• 💧 Eau : ${s.eau ?? '?'}L / ${s.oEau ?? '?'}L${(s.eau ?? 2) < 1.5 ? ' — bois maintenant !' : ' — bien'}`,
      '',
      "Qu'est-ce qu'on attaque ? 💪",
    ].join('\n');
  }

  if (has(['guitare', 'accord', 'gamme', 'tablature', 'bpm', 'picking'])) {
    return [`🎸 Coach Guitare, ${nom} !`, '', 'Plan de session 30 min :', '1. Échauffement doigts (5min, 60 BPM)', '2. Pentatonique mineure à 80 BPM (10min)', '3. Accords Cadd9 / Dadd9 (10min)', '4. Transitions sans regarder les doigts (5min)'].join('\n');
  }

  if (has(['chant', 'voix', 'vocalise', 'chanter'])) {
    return [`🎤 Coach Chant, ${nom} !`, '', '1. Respiration 4-2-6 (5 fois)', '2. Sirènes grave → aigu (3 passages)', '3. Vocalises A-E-I-O-U sur La3', '', 'Ne force jamais les aigus !'].join('\n');
  }

  if (has(['santé', 'sante', 'pas', 'courir', 'sport', 'calories', 'poids'])) {
    return [`🏃 Coach Santé, ${nom} !`, '', `Pas : ${s.pas ?? 0} / ${s.oP ?? 10000}`, `Calories : ${s.cal ?? 0} / ${s.oCal ?? 2200} kcal`, `Poids : ${s.poids ?? '?'} kg`, '', "Avant le sport : banane 45 min avant. Après : 10 min d'étirements !"].join('\n');
  }

  if (has(['eau', 'hydrat', 'boire', 'soif'])) {
    return `💧 Tu es à ${s.eau ?? '?'}L sur ${s.oEau ?? '?'}L, ${nom}. Bois un grand verre maintenant !`;
  }

  if (has(['sommeil', 'dormir', 'fatigue', 'repos'])) {
    return [`😴 Coach Sommeil, ${nom} !`, '', `Dernier relevé : ${s.som ?? '?'}h / ${s.oSom ?? 8}h.`, 'Ce soir : écrans éteints à 22h, lumières off à 22h30.'].join('\n');
  }

  if (has(['stress', 'médite', 'medite', 'calme', 'respire', 'anxieux'])) {
    return [`🧘 Bien-être, ${nom} !`, '', '1. Ferme les yeux, dos droit', '2. Inspire 4 temps, retiens 4, expire 6', '3. Répète 5 fois', '', 'Fait ! Ton cortisol vient de baisser 🎉'].join('\n');
  }

  if (has(['agenda', 'planning', 'organisation', 'réunion', 'tâche'])) {
    const items = (appState.agenda || []).slice(0, 4).map(e => `• ${e.h} — ${e.t}`).join('\n');
    return [`📅 Organisation, ${nom} !`, '', "Aujourd'hui :", items || 'Rien de prévu.', '', `Mode ${modeLabel} : ${appState.kiraState === 'rush' ? 'sois direct.' : appState.kiraState === 'recovery' ? 'protège ton énergie.' : 'tu es dans ta zone !'}`].join('\n');
  }

  if (has(['cuisine', 'manger', 'recette', 'repas', 'nutrition'])) {
    return [`🍳 Nutrition, ${nom} !`, '', `Tu es à ${s.cal ?? 0} kcal sur ${s.oCal ?? 2200}. Il reste ${Math.max((s.oCal ?? 2200) - (s.cal ?? 0), 0)} kcal.`, '', 'Ce soir : poulet rôti citron & thym (420 kcal) !'].join('\n');
  }

  if (has(['courses', 'provisions', 'supermarché', 'acheter'])) {
    const reste = (appState.courses || []).filter(c => !c.done).length;
    return [`🛒 Courses, ${nom} !`, '', `${reste} article${reste > 1 ? 's' : ''} restant${reste > 1 ? 's' : ''}.`].join('\n');
  }

  if (has(['météo', 'meteo', 'temps', 'température', 'pluie'])) {
    return `⛅ ${nom}, 22°C et partiellement nuageux. Conditions bonnes pour sortir ! Ouvre le module Météo pour le détail.`;
  }

  if (has(['horoscope', 'astro', 'signe', 'étoiles'])) {
    const signe = appState.profil?.signe || 'Lion';
    const h = HOROSCOPE_DATA[signe];
    return h ? [`✨ ${signe} du jour, ${nom} !`, '', h.desc, '', `Chance : ${h.lucky} · Élément : ${h.element}`].join('\n') : `✨ Consulte le module Horoscope !`;
  }

  if (has(['note', 'mémo', 'memo', 'rappel'])) {
    const nb = (appState.notes || []).length;
    return [`📝 Notes, ${nom} !`, '', `Tu as ${nb} note${nb > 1 ? 's' : ''} active${nb > 1 ? 's' : ''}.`].join('\n');
  }

  if (has(['potager', 'plante', 'arrosage', 'jardin', 'tomate'])) {
    return [`🌱 Potager, ${nom} !`, '', '22°C, humidité 58%.', '→ Arrose tes tomates ce soir après 19h', '→ Prends une photo pour une analyse !'].join('\n');
  }

  if (has(['parking', 'voiture', 'garer', 'stationnement', 'ticket'])) {
    return [`🅿️ Parking, ${nom} !`, '', appState.parking?.actif ? 'Ta voiture est garée. Vérifie le temps restant !' : 'Aucune position enregistrée.', 'Je te rappellerai 15 min avant l\'expiration.'].join('\n');
  }

  if (has(['actualité', 'actualite', 'news', 'info'])) {
    if (appState.actualitesRecentes && appState.actualitesRecentes.length > 0) {
      const titres = appState.actualitesRecentes.slice(0, 3).map(a => `• ${a.t}`).join('\n');
      return [`📰 Actualités, ${nom} !`, '', titres, '', 'Ouvre le module pour tout lire ou me demander plus de détails sur un sujet !'].join('\n');
    }
    return [`📰 Actualités, ${nom} !`, '', "• 🤖 L'IA révolutionne la médecine", '• 🌡️ Chaleur record en Europe', "• 🎸 Kemper intègre l'IA", '', 'Ouvre le module pour les vraies actualités (configure NewsAPI dans Paramètres) !'].join('\n');
  }

  // ── Nouveaux dans ce lot ──

  if (has(['traduc', 'traduire', 'translation'])) {
    return [
      `🌍 Traduction, ${nom} !`, '',
      'Si tu as configuré ta clé DeepL, je peux traduire directement ici — dis-moi par exemple "traduis bonjour en anglais".',
      '',
      'Sinon, ouvre le module Traduction pour des textes plus longs.',
    ].join('\n');
  }

  if (has(['réveil', 'reveil', 'alarme', 'matin'])) {
    return [
      `⏰ Réveil, ${nom} !`, '',
      `Pour ${s.oSom ?? 8}h de sommeil, couche-toi avant 23h00 si ton réveil est à 7h.`,
      'Gère tes alarmes dans le module Réveil — tu peux en créer plusieurs avec des jours différents.',
    ].join('\n');
  }

  if (has(['domotique', 'lumière', 'lumiere', 'thermostat', 'maison connectée', 'volets'])) {
    return [
      `🏠 Domotique, ${nom} !`, '',
      'Je peux piloter tes appareils une fois connectés à Google Home ou HomeKit.',
      'Ouvre le module Domotique pour voir et gérer tes appareils.',
      '',
      "Android Auto pour la voiture arrivera dans un lot futur — c'est plus complexe techniquement.",
    ].join('\n');
  }

  if (has(['paramètre', 'parametre', 'réglage', 'reglage', 'config'])) {
    return [`⚙️ Paramètres, ${nom} !`, '', 'Tu peux configurer ton profil, le design, les modules actifs, mon comportement et la sécurité depuis le menu Paramètres (icône en haut à droite de l\'accueil).'].join('\n');
  }

  // Réponse par défaut — couvre tous les modules
  return [
    `Je t'entends, ${nom} ! 🌟`, '',
    'Je suis connectée à TOUS tes modules :',
    '🏃 Santé · 🎸 Guitare & Chant · 📅 Agenda',
    '🧘 Bien-être · 🍳 Cuisine · 🛒 Courses',
    '⛅ Météo · ✨ Horoscope · 📝 Notes',
    '🌱 Potager · 🅿️ Parking · 📰 Actualités',
    '🌍 Traduction · ⏰ Réveil · 🏠 Domotique',
    '',
    'Que puis-je faire pour toi ? 💪',
  ].join('\n');
}
