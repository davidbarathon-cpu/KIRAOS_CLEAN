// ═══════════════════════════════════════════
//  DRIVERHOMEASSISTANT.JS — LOT 80
//  Pont universel vers un serveur Home Assistant existant. Contrairement
//  aux drivers Hue/Tuya (un seul écosystème), Home Assistant expose déjà
//  TOUS les appareils qui lui sont connectés (Zigbee, Wi-Fi, Tuya, Hue...)
//  via une seule API REST locale — pas de compte cloud, pas d'OAuth.
//
//  David veut y accéder aussi bien à la maison (Wi-Fi local, rapide) qu'en
//  dehors (URL distante — Nabu Casa ou son propre accès distant). On
//  configure donc DEUX adresses possibles, et on essaie d'abord la locale
//  (rapide, fonctionne seulement sur le Wi-Fi maison) avant de retomber sur
//  la distante (fonctionne partout, un peu plus lente) — totalement
//  invisible pour David au quotidien, Kira choisit toute seule.
//
//  Le jeton d'accès (créé une fois dans Home Assistant → Profil → Jetons
//  d'accès longue durée) est le même pour les deux adresses.
// ═══════════════════════════════════════════

import { getData, setData } from './storage';

const CLE_CONFIG = 'ha_config';
const DELAI_TEST_LOCAL_MS = 2500; // au-delà, on considère le Wi-Fi maison hors de portée

async function getConfigHA() {
  return (await getData(CLE_CONFIG)) || {};
}

export async function getHaConfigActuelle() {
  const { urlLocale, urlDistante, token } = await getConfigHA();
  return { urlLocale: urlLocale || '', urlDistante: urlDistante || '', token: token || '' };
}

function nettoyerUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/+$/, ''); // retire un éventuel "/" final
}

export async function setHaConfig({ urlLocale, urlDistante, token }) {
  await setData(CLE_CONFIG, {
    urlLocale: nettoyerUrl(urlLocale),
    urlDistante: nettoyerUrl(urlDistante),
    token: token?.trim() || '',
  });
}

/** Essaie une URL avec un délai court — sert à savoir si on est sur le
 * Wi-Fi maison (locale jointe vite) ou non (on passe alors à la distante). */
async function urlJoignable(url, token) {
  if (!url) return false;
  try {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), DELAI_TEST_LOCAL_MS);
    const res = await fetch(`${url}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controleur.signal,
    });
    clearTimeout(minuteur);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/** Détermine quelle URL utiliser pour cet appel : locale si joignable
 * (Wi-Fi maison), sinon distante si configurée. */
async function resoudreBaseUrl() {
  const { urlLocale, urlDistante, token } = await getConfigHA();
  if (urlLocale && (await urlJoignable(urlLocale, token))) return urlLocale;
  if (urlDistante) return urlDistante;
  return urlLocale || null; // dernier recours : au moins tenter la locale et remonter l'erreur telle quelle
}

async function appelApiHA(endpoint, options = {}) {
  const { token } = await getConfigHA();
  const baseUrl = await resoudreBaseUrl();
  if (!baseUrl || !token) {
    return { data: null, erreur: 'NON_CONFIGURE' };
  }

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`Home Assistant a répondu avec une erreur ${res.status}.`);
    // Les appels de service (POST /api/services/...) renvoient parfois un
    // tableau vide plutôt qu'un objet — .json() gère les deux sans problème.
    const data = await res.json().catch(() => null);
    return { data, erreur: null };
  } catch (e) {
    return {
      data: null,
      erreur: `${e.message} (vérifie l'adresse configurée et que le téléphone a accès au serveur)`,
    };
  }
}

// Domaines Home Assistant pris en charge — les plus courants pour du
// pilotage simple. D'autres (media_player...) pourront s'ajouter plus tard
// sans casser ce qui existe déjà.
const DOMAINES_GERES = {
  light: { type: 'lumiere', serviceOn: 'turn_on', serviceOff: 'turn_off' },
  switch: { type: 'prise', serviceOn: 'turn_on', serviceOff: 'turn_off' },
  fan: { type: 'ventilateur', serviceOn: 'turn_on', serviceOff: 'turn_off' },
  cover: { type: 'volet', serviceOn: 'open_cover', serviceOff: 'close_cover' },
  // LOT 84 — thermostats/radiateurs connectés. Pas de réglage de température
  // ici : l'écran Domotique n'a pour l'instant qu'un interrupteur on/off
  // (pas de curseur), donc on se limite à allumer/éteindre le chauffage/clim
  // — déjà utile pour une scène de départ ("coupe le chauffage en partant").
  climate: { type: 'thermostat', serviceOn: 'turn_on', serviceOff: 'turn_off' },
};

function domaineDe(entityId) {
  return entityId.split('.')[0];
}

export const driverHomeAssistant = {
  id: 'home_assistant',
  nom: 'Home Assistant',
  icon: '🏠',
  necessiteConfig: true,
  description: "Pont universel vers ton propre serveur Home Assistant — expose tous les appareils qui y sont déjà connectés (Zigbee, Wi-Fi, Hue, Tuya...).",

  async estConfigure() {
    const { urlLocale, urlDistante, token } = await getConfigHA();
    return !!((urlLocale || urlDistante) && token);
  },

  async listerAppareils() {
    const { data, erreur } = await appelApiHA('/api/states');
    if (erreur || !Array.isArray(data)) return [];

    return data
      .filter(e => DOMAINES_GERES[domaineDe(e.entity_id)])
      .map(e => {
        const domaine = domaineDe(e.entity_id);
        const { type } = DOMAINES_GERES[domaine];
        let valeur = null;
        if (domaine === 'light' && e.attributes?.brightness) {
          valeur = Math.round((e.attributes.brightness / 255) * 100);
        } else if (domaine === 'cover' && typeof e.attributes?.current_position === 'number') {
          valeur = e.attributes.current_position;
        } else if (domaine === 'climate') {
          // Température actuelle mesurée si dispo, sinon la consigne visée.
          const temp = e.attributes?.current_temperature ?? e.attributes?.temperature;
          if (typeof temp === 'number') valeur = Math.round(temp * 10) / 10;
        }
        // Les thermostats n'utilisent pas "on"/"off" comme état mais des modes
        // ("heat", "cool", "auto", "heat_cool", "dry", "fan_only"...) — tout
        // ce qui n'est pas explicitement "off" est considéré allumé.
        const etatAllume = domaine === 'climate'
          ? e.state !== 'off'
          : ['on', 'open', 'opening'].includes(e.state);
        return {
          id: e.entity_id,
          nom: e.attributes?.friendly_name || e.entity_id,
          type,
          etat: etatAllume ? 'allume' : 'eteint',
          valeur,
        };
      });
  },

  async allumer(id) {
    const domaine = domaineDe(id);
    const { serviceOn } = DOMAINES_GERES[domaine] || DOMAINES_GERES.light;
    const { erreur } = await appelApiHA(`/api/services/${domaine}/${serviceOn}`, {
      method: 'POST',
      body: JSON.stringify({ entity_id: id }),
    });
    return { succes: !erreur, erreur };
  },

  async eteindre(id) {
    const domaine = domaineDe(id);
    const { serviceOff } = DOMAINES_GERES[domaine] || DOMAINES_GERES.light;
    const { erreur } = await appelApiHA(`/api/services/${domaine}/${serviceOff}`, {
      method: 'POST',
      body: JSON.stringify({ entity_id: id }),
    });
    return { succes: !erreur, erreur };
  },

  async reglerValeur(id, valeurPourcent) {
    const domaine = domaineDe(id);
    if (domaine === 'light') {
      const { erreur } = await appelApiHA('/api/services/light/turn_on', {
        method: 'POST',
        body: JSON.stringify({ entity_id: id, brightness_pct: valeurPourcent }),
      });
      return { succes: !erreur, erreur };
    }
    if (domaine === 'cover') {
      const { erreur } = await appelApiHA('/api/services/cover/set_cover_position', {
        method: 'POST',
        body: JSON.stringify({ entity_id: id, position: valeurPourcent }),
      });
      return { succes: !erreur, erreur };
    }
    if (domaine === 'fan') {
      const { erreur } = await appelApiHA('/api/services/fan/set_percentage', {
        method: 'POST',
        body: JSON.stringify({ entity_id: id, percentage: valeurPourcent }),
      });
      return { succes: !erreur, erreur };
    }
    // Les prises (switch) n'ont pas de réglage progressif côté Home Assistant.
    return { succes: false, erreur: "Ce type d'appareil ne prend pas de réglage progressif." };
  },
};
