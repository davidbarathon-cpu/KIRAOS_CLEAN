// ═══════════════════════════════════════════
//  DOMOTIQUEDRIVERS.JS — Architecture par drivers
//
//  Chaque "driver" représente un écosystème domotique
//  (Philips Hue, TP-Link Kasa, démo locale...) et
//  implémente la même interface commune. Le reste de
//  l'app (DomotiqueScreen, Kira) ne parle JAMAIS
//  directement à un fabricant — uniquement à cette
//  interface générique. Pour ajouter une nouvelle
//  marque plus tard, il suffit d'écrire un nouveau
//  driver qui respecte ce contrat, sans toucher au
//  reste du code.
//
//  Interface qu'un driver doit implémenter :
//    id              : string unique
//    nom             : nom affiché
//    icon            : emoji
//    necessiteConfig : bool (clé/identifiants requis ?)
//    estConfigure()  : async () => bool
//    listerAppareils(): async () => [{ id, nom, type, etat, valeur }]
//    allumer(id)     : async () => { succes, erreur }
//    eteindre(id)    : async () => { succes, erreur }
//    reglerValeur(id, valeur) : async () => { succes, erreur } (luminosité, température...)
// ═══════════════════════════════════════════

import { driverDemo } from './driverDemo';
import { driverPhilipsHue } from './driverPhilipsHue';

/**
 * Registre central de tous les drivers disponibles dans l'app.
 * Ajouter un nouveau fabricant = ajouter une ligne ici après avoir
 * écrit le fichier driverXxx.js correspondant.
 */
export const DRIVERS_DISPONIBLES = [
  driverDemo,
  driverPhilipsHue,
  // Prochains drivers possibles (structure prête, pas encore implémentés) :
  // driverTpLinkKasa,    — ampoules/prises TP-Link Kasa, API cloud avec compte gratuit
  // driverTuya,          — écosystème Tuya/Smart Life, très répandu sur les produits génériques
  // driverHomeAssistant, — pont universel si l'utilisateur a déjà un serveur Home Assistant
];

export function getDriver(driverId) {
  return DRIVERS_DISPONIBLES.find(d => d.id === driverId) || null;
}

/**
 * Récupère tous les appareils de tous les drivers configurés et actifs,
 * avec une étiquette indiquant de quel driver chaque appareil provient.
 * C'est cette fonction que DomotiqueScreen utilise pour afficher la liste
 * unifiée, peu importe le nombre d'écosystèmes connectés en parallèle.
 */
export async function listerTousLesAppareils(driversActifs) {
  const resultats = await Promise.allSettled(
    driversActifs.map(async driverId => {
      const driver = getDriver(driverId);
      if (!driver) return [];
      const configure = await driver.estConfigure();
      if (!configure) return [];
      const appareils = await driver.listerAppareils();
      return appareils.map(a => ({ ...a, driverId: driver.id, driverNom: driver.nom, driverIcon: driver.icon }));
    })
  );

  return resultats
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}
