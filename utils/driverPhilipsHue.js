// ═══════════════════════════════════════════
//  DRIVERPHILIPSHUE.JS — Driver réel Philips Hue
//
//  Utilise l'API LOCALE du bridge Hue (pas l'API
//  cloud Remote, qui nécessite un compte développeur
//  Philips). L'API locale est gratuite, fonctionne
//  directement sur le réseau Wi-Fi de la maison, et
//  ne nécessite qu'un "Bridge" Hue (le boîtier physique
//  fourni avec les packs de démarrage Philips Hue) +
//  une simple "pression du bouton" pour s'apparier,
//  comme expliqué dans le guide d'installation.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

async function getConfigHue() {
  return (await getData('hue_config')) || {};
}

export async function setHueConfig(bridgeIp, username) {
  const config = await getConfigHue();
  await setData('hue_config', { ...config, bridgeIp: bridgeIp?.trim(), username: username?.trim() });
}

/**
 * Procédure d'appariement Hue : l'utilisateur doit appuyer sur le bouton
 * physique du bridge, PUIS appeler cette fonction dans les 30 secondes qui
 * suivent. Le bridge renvoie alors un "username" (jeton d'accès permanent)
 * qu'on stocke pour tous les appels futurs.
 */
export async function apparierAvecBridge(bridgeIp) {
  try {
    const res = await fetch(`http://${bridgeIp}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devicetype: 'kira_os#telephone' }),
    });

    if (!res.ok) throw new Error(`Le bridge a répondu avec une erreur ${res.status}.`);

    const data = await res.json();
    const erreurApi = data?.[0]?.error;
    if (erreurApi) {
      if (erreurApi.type === 101) {
        throw new Error("Bouton du bridge non appuyé. Appuie sur le bouton physique du bridge Hue, puis réessaie dans les 30 secondes.");
      }
      throw new Error(erreurApi.description || 'Erreur inconnue du bridge.');
    }

    const username = data?.[0]?.success?.username;
    if (!username) throw new Error('Réponse inattendue du bridge.');

    await setHueConfig(bridgeIp, username);
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

async function appelApiHue(endpoint, options = {}) {
  const { bridgeIp, username } = await getConfigHue();
  if (!bridgeIp || !username) {
    return { data: null, erreur: 'NON_CONFIGURE' };
  }

  try {
    const res = await fetch(`http://${bridgeIp}/api/${username}${endpoint}`, options);
    if (!res.ok) throw new Error(`Bridge Hue erreur ${res.status}`);
    const data = await res.json();
    return { data, erreur: null };
  } catch (e) {
    // Erreur réseau typique si le téléphone n'est pas sur le même Wi-Fi que le bridge
    return { data: null, erreur: `${e.message} (vérifie que ton téléphone est sur le même réseau Wi-Fi que le bridge Hue)` };
  }
}

export const driverPhilipsHue = {
  id: 'philips_hue',
  nom: 'Philips Hue',
  icon: '💡',
  necessiteConfig: true,
  description: 'Éclairage connecté. Nécessite un Bridge Hue sur ton réseau Wi-Fi local.',

  async estConfigure() {
    const { bridgeIp, username } = await getConfigHue();
    return !!(bridgeIp && username);
  },

  async listerAppareils() {
    const { data, erreur } = await appelApiHue('/lights');
    if (erreur || !data) return [];

    return Object.entries(data).map(([id, lampe]) => ({
      id,
      nom: lampe.name,
      type: 'lumiere',
      etat: lampe.state?.on ? 'allume' : 'eteint',
      valeur: lampe.state?.bri ? Math.round((lampe.state.bri / 254) * 100) : null, // 0-254 → 0-100%
    }));
  },

  async allumer(id) {
    const { erreur } = await appelApiHue(`/lights/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on: true }),
    });
    return { succes: !erreur, erreur };
  },

  async eteindre(id) {
    const { erreur } = await appelApiHue(`/lights/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on: false }),
    });
    return { succes: !erreur, erreur };
  },

  async reglerValeur(id, valeurPourcent) {
    // Hue utilise une échelle de luminosité 0-254, on convertit depuis le pourcentage 0-100
    const bri = Math.round((valeurPourcent / 100) * 254);
    const { erreur } = await appelApiHue(`/lights/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on: true, bri }),
    });
    return { succes: !erreur, erreur };
  },
};
