// ═══════════════════════════════════════════
//  KIRAINTENTS.JS — Détection d'intentions simples
//  permettant à Kira d'agir directement dans le
//  chat (traduction, actualités) en appelant les
//  vraies API plutôt que de juste en parler.
//
//  Volontairement simple (mots-clés + regex) plutôt
//  qu'une vraie analyse NLP — suffisant pour les
//  phrases types attendues, et fonctionne même en
//  mode hors-ligne total (pas besoin d'IA pour
//  détecter l'intention elle-même).
// ═══════════════════════════════════════════

const LANGUES_DETECTION = {
  français: 'fr', anglais: 'en', espagnol: 'es', allemand: 'de',
  italien: 'it', portugais: 'pt', japonais: 'ja', chinois: 'zh',
};

/**
 * Essaie de détecter une demande de traduction du type :
 * "traduis bonjour en anglais" / "traduction de bonjour vers l'espagnol"
 * Retourne { texte, langCible } si détecté, sinon null.
 */
export function detecterDemandeTraduction(message) {
  const low = message.toLowerCase();
  if (!low.includes('traduc') && !low.includes('traduis') && !low.includes('traduire')) {
    return null;
  }

  // Cherche la langue cible mentionnée
  let langCible = null;
  for (const [nomLangue, code] of Object.entries(LANGUES_DETECTION)) {
    if (low.includes(nomLangue)) {
      langCible = code;
      break;
    }
  }
  if (!langCible) return null;

  // Essaie d'extraire le texte à traduire : tout ce qui est entre guillemets,
  // sinon ce qui suit "traduis" et précède "en/vers/in <langue>"
  const matchGuillemets = message.match(/["'«]([^"'»]+)["'»]/);
  if (matchGuillemets) {
    return { texte: matchGuillemets[1].trim(), langCible };
  }

  const matchApres = low.match(/traduis?\s+(.+?)\s+(en|vers)\s+/);
  if (matchApres) {
    return { texte: matchApres[1].trim(), langCible };
  }

  // Dernier essai : tout ce qui suit "traduis" jusqu'à la fin
  const matchSimple = low.match(/traduis?\s+(.+)/);
  if (matchSimple) {
    // Retire la mention de langue à la fin si présente
    let texte = matchSimple[1].replace(/\s+(en|vers)\s+\w+\s*$/, '').trim();
    if (texte) return { texte, langCible };
  }

  return null;
}

/**
 * Détecte une demande d'actualités (pour injecter les vraies données
 * récupérées dans le contexte envoyé à l'IA ou au mode hors-ligne).
 */
export function detecterDemandeActualites(message) {
  const low = message.toLowerCase();
  return ['actualité', 'actualite', 'news', 'info du jour', "qu'est-ce qui se passe"].some(w => low.includes(w));
}

// ═══════════════════════════════════════════
//  AGENDA — détection création / suppression
//  d'événement, ajoutée au lot 10 (Google Agenda)
// ═══════════════════════════════════════════

/**
 * Détecte une demande de création de rendez-vous du type :
 * "ajoute un rendez-vous dentiste à 15h" / "crée un événement réunion à 10h30"
 * "note rendez-vous coiffeur demain à 14h"
 * Retourne { titre, heure } si détecté, sinon null.
 * Volontairement simple : suppose un format "HH:MM" ou "HHh" ou "HHhMM" dans le message.
 */
export function detecterCreationEvenement(message) {
  const low = message.toLowerCase();
  const motsDeclencheurs = ['ajoute un rendez-vous', 'ajoute un rdv', 'ajoute un événement', 'ajoute un evenement', 'crée un rendez-vous', 'crée un rdv', 'crée un événement', 'cree un evenement', 'planifie', 'note un rendez-vous', 'note rendez-vous'];
  const declencheurTrouve = motsDeclencheurs.find(m => low.includes(m));
  if (!declencheurTrouve) return null;

  // Cherche une heure au format 14h, 14h30, 14:30
  const matchHeure = message.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if (!matchHeure) return null;
  const heureNum = matchHeure[1].padStart(2, '0');
  const minuteNum = (matchHeure[2] || '00').padStart(2, '0');
  const heure = `${heureNum}:${minuteNum}`;

  // Le titre est tout ce qui suit le déclencheur, avant la mention d'heure
  const apresDeclencheur = message.slice(low.indexOf(declencheurTrouve) + declencheurTrouve.length);
  let titre = apresDeclencheur.replace(/\d{1,2}\s*[h:]\s*\d{0,2}/, '').replace(/\bà\b|\bdemain\b|\baujourd'hui\b/gi, '').trim();
  titre = titre.replace(/^[\s,:-]+|[\s,:-]+$/g, '');
  if (!titre) titre = 'Nouveau rendez-vous';

  return { titre, heure };
}

/**
 * Détecte une demande de suppression d'événement du type :
 * "supprime le rendez-vous dentiste" / "annule la réunion de 10h"
 * Retourne le texte de recherche (utilisé pour matcher un événement existant
 * par titre approximatif), ou null.
 */
export function detecterSuppressionEvenement(message) {
  const low = message.toLowerCase();
  const matchSuppr = low.match(/(?:supprime|annule|efface)\s+(?:le|la|l'|mon|ma)?\s*(?:rendez-vous|rdv|événement|evenement|réunion|reunion)?\s*(.*)/);
  if (!matchSuppr) return null;
  const recherche = matchSuppr[1].replace(/\bde\b|\bà\b|\d{1,2}\s*[h:]\s*\d{0,2}/gi, '').trim();
  return recherche || null;
}

// ═══════════════════════════════════════════
//  SPOTIFY — détection création de playlist /
//  consultation du morceau en cours, ajoutée au
//  lot 12.
// ═══════════════════════════════════════════

/**
 * Détecte une demande de création de playlist du type :
 * "crée une playlist guitare" / "fais-moi une playlist de motivation"
 * Retourne le nom de la playlist si détecté, sinon null.
 */
export function detecterCreationPlaylist(message) {
  const low = message.toLowerCase();
  const motsDeclencheurs = ['crée une playlist', 'cree une playlist', 'fais-moi une playlist', 'fais moi une playlist', "crée moi une playlist"];
  const declencheurTrouve = motsDeclencheurs.find(m => low.includes(m));
  if (!declencheurTrouve) return null;

  let nom = message.slice(low.indexOf(declencheurTrouve) + declencheurTrouve.length).trim();
  nom = nom.replace(/^(de|sur|pour|avec)\s+/i, '').trim();
  if (!nom) nom = 'Playlist Kira';
  return nom;
}

/**
 * Détecte une demande de consultation du morceau en cours d'écoute.
 */
export function detecterDemandeLectureEnCours(message) {
  const low = message.toLowerCase();
  return ["qu'est-ce que j'écoute", "qu'est ce que j'écoute", 'quel morceau', 'quelle chanson', 'musique en cours', "qu'est-ce qui joue"].some(w => low.includes(w));
}

// ═══════════════════════════════════════════
//  COURSES & NOTES — détection d'ajout d'un
//  article à la liste de courses, ou d'une note
//  rapide. Volontairement vérifiées AVANT la
//  détection de rendez-vous (qui utilise aussi le
//  mot "note") pour éviter qu'une vraie demande de
//  rendez-vous ("note un rendez-vous dentiste à
//  15h") ne soit interceptée par erreur ici.
// ═══════════════════════════════════════════

/**
 * Détecte une demande d'ajout d'article à la liste de courses, du type :
 * "ajoute du lait à ma liste de courses" / "ajoute des oeufs aux courses"
 * "mets du pain dans mes courses" / "note sur ma liste de courses : pain"
 * Retourne le nom de l'article si détecté, sinon null.
 */
export function detecterAjoutCourse(message) {
  const low = message.toLowerCase();
  // Le mot "course(s)" doit être présent, sinon "ajoute un rendez-vous" par
  // exemple ne doit surtout pas tomber ici.
  if (!low.includes('course')) return null;

  const motsDeclencheurs = ['ajoute', 'ajouter', 'mets', 'mettre', 'rajoute', 'note'];
  const declencheurTrouve = motsDeclencheurs.find(m => low.includes(m));
  if (!declencheurTrouve) return null;

  const indexCourse = low.indexOf('course');
  const indexDeclencheur = low.indexOf(declencheurTrouve);

  // Cas 1 : l'article est mentionné APRÈS "courses" (ex: "note sur ma liste
  // de courses : pain") → on prend ce qui suit "courses".
  let segmentApres = message.slice(indexCourse + 'course'.length).replace(/^s?/, '');
  segmentApres = nettoyerMotsDeLiaison(segmentApres);

  // Cas 2 : l'article est mentionné AVANT "courses" (ex: "ajoute du lait à
  // ma liste de courses") → on prend ce qui suit le déclencheur, jusqu'à "courses".
  let segmentAvant = message.slice(indexDeclencheur + declencheurTrouve.length, indexCourse);
  segmentAvant = nettoyerMotsDeLiaison(segmentAvant);

  // Priorité au segment après "courses" s'il contient quelque chose (cas le
  // plus explicite, ex: "ma liste de courses : X"), sinon celui d'avant.
  if (segmentApres) return segmentApres;
  if (segmentAvant) return segmentAvant;
  return null;
}

/**
 * Retire les petits mots de liaison français (articles, prépositions) d'un
 * segment de texte, pour isoler le nom de l'article ou le contenu utile.
 * Utilise des délimiteurs espace explicites plutôt que \b : en JavaScript,
 * \b ne fonctionne pas correctement avec les caractères accentués comme "à",
 * ce qui laissait auparavant des résidus du type "lait à" au lieu de "lait".
 */
function nettoyerMotsDeLiaison(texte) {
  let t = ` ${texte.trim()} `;
  const motsAVirer = ['à', 'a', 'au', 'aux', 'dans', 'sur', 'ma', 'mes', 'la', 'liste', 'de', 'du', 'des', 'le', 'les'];
  motsAVirer.forEach(mot => {
    t = t.replace(new RegExp(` ${mot} `, 'gi'), ' ');
  });
  return t.replace(/\s+/g, ' ').trim().replace(/^[:\-,]+|[:\-,]+$/g, '').trim();
}

/**
 * Détecte une demande d'ajout de note rapide, du type :
 * "note que j'ai changé mes cordes de guitare" / "Kira, note que..."
 * "ajoute une note : penser à arroser les tomates"
 * Retourne le texte de la note si détecté, sinon null.
 *
 * IMPORTANT : vérifie d'abord qu'il ne s'agit pas d'une demande de
 * rendez-vous (qui contient aussi "note" dans certains déclencheurs) ni
 * d'une demande de courses — l'appelant (KiraChatScreen) doit donc tester
 * detecterCreationEvenement et detecterAjoutCourse avant cette fonction.
 */
export function detecterAjoutNote(message) {
  const low = message.toLowerCase();
  const matchNote = low.match(/\bnote\s+que\s+(.+)/) || low.match(/\bajoute\s+une\s+note\s*[:\-]?\s*(.+)/);
  if (!matchNote) return null;

  const texte = matchNote[1].trim();
  if (!texte) return null;

  return texte;
}
