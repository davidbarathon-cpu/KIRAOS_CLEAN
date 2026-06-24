// ═══════════════════════════════════════════
//  STORAGE.JS — Persistance locale (AsyncStorage)
//  MISE À JOUR LOT 3 :
//  - profil.signe ajouté aux valeurs par défaut
//  - clé "notes" ajoutée aux DEFAULTS
// ═══════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'kiraos_';

// Données par défaut au premier lancement de l'app
const DEFAULTS = {
  profil: {
    prenom: '',
    nom: '',
    email: '',
    ville: 'Villeneuve-sur-Lot',
    naissance: '',
    guitareNiv: 'Intermédiaire',
    chantNiv: 'Débutant',
    style: 'Rock, Blues, Pop',
    signe: 'Lion',
    calObj: 2200,
    sleepObj: 8,
    pasObj: 10000,
  },
  sante: {
    pas: 7842,
    oP: 10000,
    cal: 1680,
    oCal: 2200,
    som: 7.2,
    oSom: 8,
    fc: 68,
    poids: 73.5,
    eau: 1.4,
    oEau: 2.5,
  },
  agenda: [
    { id: 1, h: '08:30', t: 'Stand-up équipe', c: '#6C63FF', l: 'Zoom', dur: '15min' },
    { id: 2, h: '10:00', t: 'Revue de sprint', c: '#FF6584', l: 'Salle Neon', dur: '1h' },
    { id: 3, h: '15:00', t: 'Session guitare & chant', c: '#FFB347', l: 'Maison', dur: '1h' },
    { id: 4, h: '18:00', t: 'Course à pied', c: '#4FC3F7', l: 'Parc', dur: '45min' },
  ],
  courses: [
    { id: 1, n: 'Lait demi-écrémé', cat: 'Laitiers', q: '2L', done: false },
    { id: 2, n: 'Poulet fermier', cat: 'Viande', q: '1kg', done: false },
    { id: 3, n: 'Quinoa', cat: 'Épicerie', q: '500g', done: true },
    { id: 4, n: 'Avocats', cat: 'Fruits', q: '3', done: false },
  ],
  notes: [
    { id: 1, t: 'Idées chanson', txt: 'Accord Cadd9 intro → verse Dm → chorus G\nThème : voyage et liberté', c: '#FFB347', source: 'manuel' },
    { id: 2, t: 'Exercices guitare', txt: 'Pentatonique 20 min chaque matin avant café', c: '#A78BFA', source: 'manuel' },
  ],
  chat: [],
  prefs: {
    theme: 'cosmos',
    proactif: true,
    voix: true,
    weatherFx: true,
  },
};

/**
 * Initialise le stockage : si c'est le tout premier lancement,
 * écrit les valeurs par défaut. Sinon ne touche à rien.
 */
export async function initStorage() {
  try {
    const initialized = await AsyncStorage.getItem(PREFIX + 'initialized');
    if (!initialized) {
      await Promise.all(
        Object.entries(DEFAULTS).map(([key, val]) =>
          AsyncStorage.setItem(PREFIX + key, JSON.stringify(val))
        )
      );
      await AsyncStorage.setItem(PREFIX + 'initialized', 'true');
    }
  } catch (e) {
    console.warn('Erreur initStorage:', e);
  }
}

/**
 * Récupère une valeur stockée (ex: getData('agenda'))
 * Retourne la valeur par défaut si rien n'est trouvé.
 */
export async function getData(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw === null) return DEFAULTS[key] ?? null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Erreur getData', key, e);
    return DEFAULTS[key] ?? null;
  }
}

/**
 * Sauvegarde une valeur (ex: setData('agenda', [...]))
 */
export async function setData(key, value) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('Erreur setData', key, e);
    return false;
  }
}

/**
 * Efface une clé spécifique
 */
export async function removeData(key) {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Remet à zéro toute l'application (à utiliser depuis les Paramètres)
 */
export async function resetAllData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const kiraKeys = keys.filter(k => k.startsWith(PREFIX));
    await AsyncStorage.multiRemove(kiraKeys);
    await initStorage();
    return true;
  } catch (e) {
    return false;
  }
}
