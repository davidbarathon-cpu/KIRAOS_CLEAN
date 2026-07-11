// ═══════════════════════════════════════════
//  DRIVERTUYA.JS — Driver Tuya / Smart Life (lot 46)
//
//  Contrairement à Philips Hue (API locale, sur le Wi-Fi de la maison),
//  Tuya/Smart Life n'a pas d'API locale simple utilisable ici — on passe
//  par leur API cloud officielle (gratuite pour un usage personnel,
//  avec un essai à renouveler périodiquement côté Tuya — voir le guide
//  d'installation). C'est aussi ce qui fait fonctionner énormément de
//  marques "génériques" revendues sous d'autres noms (beaucoup de
//  prises/ampoules pas chères utilisent en réalité la puce et le cloud
//  Tuya en coulisses).
//
//  Toute la signature des requêtes suit l'algorithme officiel Tuya
//  (HMAC-SHA256, version "nouvelle signature" obligatoire pour tout
//  projet Cloud créé après le 30 juin 2021 — donc pour toi).
//
//  ⚠️ Limite honnête : Tuya utilise des "codes DP" (data points) qui
//  varient selon le type d'appareil pour représenter marche/arrêt et
//  luminosité. Ce driver interroge la fiche technique de chaque
//  appareil pour deviner le bon code plutôt que de le figer en dur,
//  mais certains appareils très spécifiques peuvent ne pas être
//  reconnus correctement du premier coup.
// ═══════════════════════════════════════════

import CryptoJS from 'crypto-js';
import { getData, setData } from './storage';

const BASE_URLS = {
  eu: 'https://openapi.tuyaeu.com',
  us: 'https://openapi.tuyaus.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

const SHA256_VIDE = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// Cache mémoire (le temps de la session) du code DP marche/arrêt et
// luminosité trouvé pour chaque appareil, pour éviter de refaire un
// appel "specifications" à chaque allumage/extinction.
const cacheCodesAppareils = new Map();

async function getConfigTuya() {
  return (await getData('tuya_config')) || {};
}

export async function setTuyaConfig({ clientId, clientSecret, uid, region }) {
  const config = await getConfigTuya();
  await setData('tuya_config', {
    ...config,
    clientId: clientId?.trim() ?? config.clientId,
    clientSecret: clientSecret?.trim() ?? config.clientSecret,
    uid: uid?.trim() ?? config.uid,
    region: region ?? config.region ?? 'eu',
  });
}

export async function getTuyaConfigActuelle() {
  return getConfigTuya();
}

function baseUrl(region) {
  return BASE_URLS[region] || BASE_URLS.eu;
}

function sha256Hex(texte) {
  return CryptoJS.SHA256(texte || '').toString(CryptoJS.enc.Hex);
}

function signer(str, secret) {
  return CryptoJS.HmacSHA256(str, secret).toString(CryptoJS.enc.Hex).toUpperCase();
}

/**
 * Construit les en-têtes signés Tuya pour une requête donnée, avec ou
 * sans jeton d'accès (les requêtes de jeton ne signent pas avec un jeton).
 */
function construireEnTetes({ methode, chemin, corps, clientId, clientSecret, accessToken }) {
  const t = Date.now().toString();
  const contentSha256 = corps ? sha256Hex(JSON.stringify(corps)) : SHA256_VIDE;
  const stringToSign = [methode, contentSha256, '', chemin].join('\n');
  const base = clientId + (accessToken || '') + t + stringToSign;
  const sign = signer(base, clientSecret);

  const entetes = {
    client_id: clientId,
    sign,
    sign_method: 'HMAC-SHA256',
    t,
    'Content-Type': 'application/json',
  };
  if (accessToken) entetes.access_token = accessToken;
  return entetes;
}

async function requeteTuya({ methode = 'GET', chemin, corps, config, accessToken }) {
  const entetes = construireEnTetes({
    methode,
    chemin,
    corps,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    accessToken,
  });

  const res = await fetch(`${baseUrl(config.region)}${chemin}`, {
    method: methode,
    headers: entetes,
    body: corps ? JSON.stringify(corps) : undefined,
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.msg || `Erreur Tuya (code ${data.code ?? '?'})`);
  }
  return data.result;
}

/**
 * Récupère un jeton d'accès valide, en le rafraîchissant si besoin
 * (jetons Tuya valables 2h). Retourne null si pas configuré ou en cas
 * d'échec (identifiants invalides...).
 */
async function getJetonValide() {
  const config = await getConfigTuya();
  if (!config.clientId || !config.clientSecret) return null;

  const jetons = await getData('tuya_jetons');
  if (jetons && Date.now() < jetons.expiresAt - 60000) {
    return jetons.accessToken;
  }

  try {
    if (jetons?.refreshToken) {
      const result = await requeteTuya({
        methode: 'GET',
        chemin: `/v1.0/token/${jetons.refreshToken}`,
        config,
      });
      const nouveaux = {
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresAt: Date.now() + result.expire_time * 1000,
      };
      await setData('tuya_jetons', nouveaux);
      return nouveaux.accessToken;
    }

    const result = await requeteTuya({
      methode: 'GET',
      chemin: '/v1.0/token?grant_type=1',
      config,
    });
    const nouveaux = {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt: Date.now() + result.expire_time * 1000,
    };
    await setData('tuya_jetons', nouveaux);
    return nouveaux.accessToken;
  } catch (e) {
    console.warn('Erreur jeton Tuya', e.message);
    return null;
  }
}

/**
 * Devine le code DP (data point) marche/arrêt et luminosité d'un
 * appareil en consultant sa fiche technique, avec mise en cache.
 */
async function getCodesAppareil(deviceId, config, accessToken) {
  if (cacheCodesAppareils.has(deviceId)) return cacheCodesAppareils.get(deviceId);

  let codes = { onOff: 'switch_1', luminosite: null, luminositeMax: 1000 };
  try {
    const spec = await requeteTuya({
      methode: 'GET',
      chemin: `/v1.0/devices/${deviceId}/specifications`,
      config,
      accessToken,
    });
    const fonctions = spec?.functions || [];
    const onOffFn = fonctions.find(f => f.type === 'Boolean' && /switch/i.test(f.code));
    if (onOffFn) codes.onOff = onOffFn.code;

    const luminositeFn = fonctions.find(f => /bright/i.test(f.code) && f.type === 'Integer');
    if (luminositeFn) {
      codes.luminosite = luminositeFn.code;
      try {
        const bornes = JSON.parse(luminositeFn.values);
        codes.luminositeMax = bornes.max || 1000;
      } catch {
        // Bornes non lisibles → on garde la valeur par défaut 1000.
      }
    }
  } catch {
    // On garde les valeurs par défaut si la fiche technique échoue.
  }

  cacheCodesAppareils.set(deviceId, codes);
  return codes;
}

export const driverTuya = {
  id: 'tuya',
  nom: 'Tuya / Smart Life',
  icon: '🔵',
  necessiteConfig: true,
  description: 'Écosystème Tuya (Smart Life, et beaucoup de marques génériques qui utilisent la même puce/cloud en coulisses).',

  async estConfigure() {
    const config = await getConfigTuya();
    return !!(config.clientId && config.clientSecret && config.uid);
  },

  async listerAppareils() {
    const config = await getConfigTuya();
    const accessToken = await getJetonValide();
    if (!accessToken) return [];

    try {
      const homes = await requeteTuya({
        methode: 'GET',
        chemin: `/v1.0/users/${config.uid}/homes`,
        config,
        accessToken,
      });

      const listesParMaison = await Promise.all(
        (homes || []).map(home =>
          requeteTuya({ methode: 'GET', chemin: `/v1.0/homes/${home.home_id}/devices`, config, accessToken }).catch(() => [])
        )
      );

      const appareils = listesParMaison.flat();

      return Promise.all(
        appareils.map(async a => {
          const codes = await getCodesAppareil(a.id, config, accessToken);
          const dpOnOff = (a.status || []).find(s => s.code === codes.onOff);
          const dpLuminosite = codes.luminosite ? (a.status || []).find(s => s.code === codes.luminosite) : null;

          return {
            id: a.id,
            nom: a.name,
            type: codes.luminosite ? 'lumiere' : 'prise',
            etat: dpOnOff?.value ? 'allume' : 'eteint',
            valeur: dpLuminosite ? Math.round((dpLuminosite.value / codes.luminositeMax) * 100) : null,
          };
        })
      );
    } catch (e) {
      console.warn('Erreur listerAppareils Tuya', e.message);
      return [];
    }
  },

  async allumer(id) {
    return envoyerCommandeOnOff(id, true);
  },

  async eteindre(id) {
    return envoyerCommandeOnOff(id, false);
  },

  async reglerValeur(id, valeurPourcent) {
    const config = await getConfigTuya();
    const accessToken = await getJetonValide();
    if (!accessToken) return { succes: false, erreur: 'NON_CONFIGURE' };

    try {
      const codes = await getCodesAppareil(id, config, accessToken);
      if (!codes.luminosite) return { succes: false, erreur: 'Cet appareil ne supporte pas le réglage de luminosité.' };

      const valeur = Math.round((valeurPourcent / 100) * codes.luminositeMax);
      await requeteTuya({
        methode: 'POST',
        chemin: `/v1.0/devices/${id}/commands`,
        corps: { commands: [{ code: codes.luminosite, value: valeur }] },
        config,
        accessToken,
      });
      return { succes: true, erreur: null };
    } catch (e) {
      return { succes: false, erreur: e.message };
    }
  },
};

async function envoyerCommandeOnOff(id, allume) {
  const config = await getConfigTuya();
  const accessToken = await getJetonValide();
  if (!accessToken) return { succes: false, erreur: 'NON_CONFIGURE' };

  try {
    const codes = await getCodesAppareil(id, config, accessToken);
    await requeteTuya({
      methode: 'POST',
      chemin: `/v1.0/devices/${id}/commands`,
      corps: { commands: [{ code: codes.onOff, value: allume }] },
      config,
      accessToken,
    });
    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}
