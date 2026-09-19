// ═══════════════════════════════════════════
//  NOUVEAUTES.JS — LOT 85
//  Petit journal des nouveautés visible directement dans l'app (écran
//  NouveautesScreen.js), pour que David n'oublie pas ce qui a été ajouté au
//  fil des lots — l'app a grossi vite, facile de perdre le fil.
//
//  MAINTENANCE : à chaque lot qui ajoute une fonctionnalité qu'un
//  utilisateur remarquerait (pas un correctif de bug interne), ajouter une
//  entrée en HAUT du tableau NOUVEAUTES ci-dessous. Garder une quinzaine
//  d'entrées maximum (les plus anciennes peuvent être retirées).
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_DERNIER_VU = 'nouveautes_dernier_lot_vu';

export const NOUVEAUTES = [
  { lot: 85, icon: '🔍', titre: 'Recherche et favoris sur l\'accueil', description: "Une barre de recherche pour retrouver un module instantanément, et un appui long sur une carte pour l'épingler tout en haut. Kira peut aussi allumer/éteindre un appareil et lancer un minuteur directement depuis le chat." },
  { lot: 84, icon: '🌡️', titre: 'Thermostats Home Assistant', description: "Tes radiateurs et thermostats connectés apparaissent maintenant dans Domotique, utilisables dans les scènes d'arrivée et de départ." },
  { lot: 83, icon: '🚪', titre: 'Scène de départ', description: "Éteins automatiquement les appareils de ton choix quand tu quittes la maison, en miroir de la scène d'arrivée." },
  { lot: 82, icon: '🔊', titre: 'Voix naturelle de Kira', description: "Fini la voix robotique : si tu as une clé Gemini configurée, Kira parle avec une vraie voix naturelle, avec 6 styles au choix dans Paramètres." },
  { lot: 81, icon: '🎙️', titre: 'Guide vocal en Méditation', description: "Les séances de méditation peuvent maintenant être lues à voix haute. Le sélecteur de fichier pour restaurer une sauvegarde est aussi arrivé." },
  { lot: 80, icon: '🏠', titre: 'Intégration Home Assistant', description: "Connecte ton serveur Home Assistant à Kira — lumières, prises, ventilateurs et volets pilotables depuis l'app, à la maison comme à l'extérieur." },
  { lot: 78, icon: '⭐', titre: 'Favoris de recettes', description: "Marque tes recettes préférées d'une étoile et retrouve-les dans ton livre de recettes personnel, même les jours où Kira propose autre chose." },
  { lot: 77, icon: '❤️', titre: 'Cercles santé personnalisables', description: "Choisis quelles statistiques (pas, eau, calories, sommeil) s'affichent sur l'écran Santé et l'accueil." },
];

export async function getDernierLotVu() {
  return (await getData(CLE_DERNIER_VU)) || 0;
}

export async function marquerNouveautesCommeVues() {
  const dernierLot = NOUVEAUTES[0]?.lot || 0;
  await setData(CLE_DERNIER_VU, dernierLot);
}

/** Indique s'il y a des nouveautés jamais vues par David, pour afficher un
 * petit badge sur l'écran d'accueil. */
export async function yATilDesNouveautesNonVues() {
  const [dernierVu, dernierLot] = await Promise.all([getDernierLotVu(), Promise.resolve(NOUVEAUTES[0]?.lot || 0)]);
  return dernierLot > dernierVu;
}
