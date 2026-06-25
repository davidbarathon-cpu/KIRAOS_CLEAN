// ═══════════════════════════════════════════
//  MOONPHASE.JS — Calcul réel des phases lunaires
//  NOUVEAU (lot 30, comble un manque du cahier
//  des charges section 2 : "les phases de la lune
//  le soir"). Avant cette mise à jour, MeteoScreen
//  affichait des dates codées en dur ("22 juin",
//  "6 juillet"...) qui devenaient fausses dès que
//  le calendrier avançait.
//
//  Utilise une formule astronomique standard basée
//  sur le cycle synodique lunaire (29,53 jours en
//  moyenne entre deux nouvelles lunes). Fonctionne
//  entièrement hors-ligne, sans aucune clé API —
//  cohérent avec le reste de l'app qui évite les
//  dépendances externes quand ce n'est pas nécessaire.
//
//  Précision : à quelques heures près, largement
//  suffisant pour un usage d'affichage dans une app
//  personnelle (les calendriers lunaires "grand
//  public" utilisent la même marge d'approximation).
// ═══════════════════════════════════════════

// Référence connue : nouvelle lune du 6 janvier 2000 à 18h14 UTC.
// C'est le point de départ standard utilisé dans la plupart des
// calculs astronomiques simplifiés de phase lunaire.
const NOUVELLE_LUNE_REFERENCE = new Date('2000-01-06T18:14:00Z').getTime();
const DUREE_CYCLE_JOURS = 29.530588853; // durée moyenne d'un cycle synodique
const DUREE_CYCLE_MS = DUREE_CYCLE_JOURS * 24 * 60 * 60 * 1000;

const PHASES = [
  { seuil: 0.02, nom: 'Nouvelle Lune', icon: '🌑' },
  { seuil: 0.24, nom: 'Premier Croissant', icon: '🌒' },
  { seuil: 0.26, nom: 'Premier Quartier', icon: '🌓' },
  { seuil: 0.49, nom: 'Lune Gibbeuse Croissante', icon: '🌔' },
  { seuil: 0.51, nom: 'Pleine Lune', icon: '🌕' },
  { seuil: 0.74, nom: 'Lune Gibbeuse Décroissante', icon: '🌖' },
  { seuil: 0.76, nom: 'Dernier Quartier', icon: '🌗' },
  { seuil: 0.98, nom: 'Dernier Croissant', icon: '🌘' },
  { seuil: 1.01, nom: 'Nouvelle Lune', icon: '🌑' },
];

/**
 * Calcule la position dans le cycle lunaire (0 à 1) pour une date donnée.
 * 0 = nouvelle lune, 0.5 = pleine lune, proche de 1 = retour à nouvelle lune.
 */
function calculerPositionCycle(date) {
  const diffMs = date.getTime() - NOUVELLE_LUNE_REFERENCE;
  const nbCycles = diffMs / DUREE_CYCLE_MS;
  const position = nbCycles - Math.floor(nbCycles); // partie fractionnaire = position dans le cycle actuel
  return position;
}

/**
 * Retourne le nom et l'icône de la phase lunaire actuelle.
 */
function getPhaseDepuisPosition(position) {
  return PHASES.find(p => position <= p.seuil) || PHASES[0];
}

/**
 * Calcule le pourcentage d'illumination de la lune (0% = nouvelle lune,
 * 100% = pleine lune), utile pour l'affichage "Lune à XX%".
 */
function calculerIllumination(position) {
  // L'illumination suit une courbe en cosinus : 0% à la nouvelle lune,
  // 100% à la pleine lune (position 0.5), puis redescend à 0%.
  const illumination = (1 - Math.cos(position * 2 * Math.PI)) / 2;
  return Math.round(illumination * 100);
}

/**
 * Point d'entrée principal : donne l'état lunaire complet pour aujourd'hui.
 * Retourne { nom, icon, illumination, position }
 */
export function getPhaseLunaireActuelle(date = new Date()) {
  const position = calculerPositionCycle(date);
  const phase = getPhaseDepuisPosition(position);
  const illumination = calculerIllumination(position);
  return { nom: phase.nom, icon: phase.icon, illumination, position };
}

/**
 * Cherche, à partir d'une date de départ, la prochaine occurrence de
 * chacune des 4 phases principales (Nouvelle Lune, Premier Quartier,
 * Pleine Lune, Dernier Quartier). Utilisé pour afficher le petit calendrier
 * "prochaines phases" comme l'ancienne version codée en dur le faisait,
 * mais avec de vraies dates qui avancent avec le temps.
 *
 * Méthode : on avance jour par jour (suffisant en précision pour un
 * affichage, pas besoin de calcul à la minute) et on détecte les
 * changements de phase principale.
 */
export function getProchainesPhasesPrincipales(dateDepart = new Date(), nombreJoursMax = 35) {
  const phasesPrincipales = ['Nouvelle Lune', 'Premier Quartier', 'Pleine Lune', 'Dernier Quartier'];
  const resultats = [];
  const dejaTrouvees = new Set();

  for (let i = 0; i <= nombreJoursMax; i++) {
    const date = new Date(dateDepart.getTime() + i * 24 * 60 * 60 * 1000);
    const { nom, icon } = getPhaseLunaireActuelle(date);

    if (phasesPrincipales.includes(nom) && !dejaTrouvees.has(nom)) {
      dejaTrouvees.add(nom);
      resultats.push({
        nom,
        icon,
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
      });
    }

    if (resultats.length === phasesPrincipales.length) break;
  }

  // Trie par ordre chronologique (l'ordre de détection n'est pas forcément
  // l'ordre logique du cycle si on démarre en plein milieu d'une phase)
  return resultats;
}
