// ═══════════════════════════════════════════
//  DRIVERDEMO.JS — Driver de démonstration
//  Toujours disponible, ne nécessite aucune
//  configuration ni appareil réel. Permet de tester
//  l'interface domotique et de comprendre comment
//  elle fonctionnera avec de vrais appareils plus tard.
//  Les états sont persistés localement pour que les
//  changements (allumer/éteindre) restent visibles
//  entre les sessions, comme un vrai appareil le ferait.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_STOCKAGE = 'domotique_demo_appareils';

const APPAREILS_PAR_DEFAUT = [
  { id: 'demo-1', nom: 'Lampe salon (démo)', type: 'lumiere', etat: 'eteint', valeur: 80 },
  { id: 'demo-2', nom: 'Prise TV (démo)', type: 'prise', etat: 'allume', valeur: null },
  { id: 'demo-3', nom: 'Thermostat (démo)', type: 'thermostat', etat: 'allume', valeur: 21 },
];

async function getAppareilsStockes() {
  const appareils = await getData(CLE_STOCKAGE);
  return appareils && appareils.length ? appareils : APPAREILS_PAR_DEFAUT;
}

export const driverDemo = {
  id: 'demo',
  nom: 'Démo locale',
  icon: '🧪',
  necessiteConfig: false,
  description: 'Appareils simulés pour tester l\'interface — aucun matériel requis.',

  async estConfigure() {
    return true; // toujours disponible
  },

  async listerAppareils() {
    return getAppareilsStockes();
  },

  async allumer(id) {
    const appareils = await getAppareilsStockes();
    const updated = appareils.map(a => (a.id === id ? { ...a, etat: 'allume' } : a));
    await setData(CLE_STOCKAGE, updated);
    return { succes: true, erreur: null };
  },

  async eteindre(id) {
    const appareils = await getAppareilsStockes();
    const updated = appareils.map(a => (a.id === id ? { ...a, etat: 'eteint' } : a));
    await setData(CLE_STOCKAGE, updated);
    return { succes: true, erreur: null };
  },

  async reglerValeur(id, valeur) {
    const appareils = await getAppareilsStockes();
    const updated = appareils.map(a => (a.id === id ? { ...a, valeur } : a));
    await setData(CLE_STOCKAGE, updated);
    return { succes: true, erreur: null };
  },
};
