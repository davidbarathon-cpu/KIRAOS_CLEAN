// ═══════════════════════════════════════════
//  DICTONS.JS — Source unique du "dicton du jour"
//  LOT 65 : corrige un bug remonté par David — le dicton de
//  l'accueil semblait "toujours le même". Deux causes réunies :
//  1) HomeScreen.js tirait le dicton au hasard (Math.random()) à
//     CHAQUE ouverture de l'écran plutôt qu'une fois par jour —
//     avec seulement 5 dictons, deux tirages consécutifs tombaient
//     souvent sur le même (~20% de chances à chaque réouverture).
//  2) La liste ne comptait que 5 entrées, et HomeScreen.js /
//     widgetUpdater.js avaient chacun leur propre copie, avec deux
//     logiques de sélection différentes (aléatoire vs date) —
//     source de confusion et de désynchronisation entre l'accueil
//     et le widget plein écran.
//
//  Correctif : une seule liste, largement étoffée, et une sélection
//  déterministe basée sur le jour de l'année — le dicton change
//  une fois par jour (pas à chaque ouverture d'écran), et l'accueil
//  affiche exactement le même dicton que le widget.
// ═══════════════════════════════════════════

export const DICTONS = [
  { t: 'La musique est la sténographie des émotions.', a: 'Tolstoï' },
  { t: 'Chaque matin est une nouvelle chance de recommencer.', a: 'Proverbe' },
  { t: "La créativité, c'est l'intelligence qui s'amuse.", a: 'Albert Einstein' },
  { t: 'Un accord de guitare bien joué vaut mille mots.', a: 'Sagesse musicale' },
  { t: "Chanter, c'est prier deux fois.", a: 'Saint Augustin' },
  { t: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", a: 'Sénèque' },
  { t: 'Un jardin, même petit, nourrit toujours un peu plus que le ventre.', a: 'Proverbe' },
  { t: "L'ordre règne dans une liste de courses bien tenue.", a: 'Sagesse du quotidien' },
  { t: "Il n'y a pas de vent favorable pour celui qui ne sait pas où il va.", a: 'Sénèque' },
  { t: "Bien dormir, c'est déjà bien vivre.", a: 'Proverbe' },
  { t: "L'eau est la meilleure des potions.", a: 'Pindare' },
  { t: 'Le talent, on le doit à la persévérance plus qu\'au don.', a: 'Sagesse musicale' },
  { t: "Un pas après l'autre suffit pour aller très loin.", a: 'Proverbe chinois' },
  { t: 'Cuisiner soi-même, c\'est déjà prendre soin de soi.', a: 'Sagesse du quotidien' },
  { t: "La patience est amère, mais son fruit est doux.", a: 'Jean-Jacques Rousseau' },
  { t: 'Chaque note fausse rapproche un peu plus de la juste.', a: 'Sagesse musicale' },
  { t: "Les étoiles ne se voient que dans le ciel le plus sombre.", a: 'Proverbe' },
  { t: 'Ranger sa tête commence souvent par ranger son agenda.', a: 'Sagesse du quotidien' },
  { t: "Le meilleur moment pour planter un arbre était il y a vingt ans. Le second, c'est maintenant.", a: 'Proverbe chinois' },
  { t: "On ne récolte que ce que l'on a semé — au jardin comme ailleurs.", a: 'Proverbe' },
];

/**
 * Numéro du jour dans l'année (1 à 365/366) — sert de graine stable pour
 * que le dicton reste identique toute la journée, mais change chaque jour.
 */
function jourDeLAnnee(date) {
  const debutAnnee = new Date(date.getFullYear(), 0, 0);
  const diffMs = date - debutAnnee;
  return Math.floor(diffMs / 86400000);
}

/**
 * Retourne le dicton du jour, identique partout dans l'app (accueil, widget)
 * pour une même date. `dateReference` est optionnel, utile pour les tests.
 */
export function getDictonDuJour(dateReference = new Date()) {
  const index = jourDeLAnnee(dateReference) % DICTONS.length;
  return DICTONS[index];
}
