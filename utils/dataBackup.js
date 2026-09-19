// ═══════════════════════════════════════════
//  DATABACKUP.JS — LOT 58
//  Rend enfin fonctionnel le bouton "💾 Exporter mes données (JSON)"
//  de Paramètres → Sécurité, qui ne faisait rien jusqu'ici.
//
//  Lit directement toutes les clés AsyncStorage préfixées "kiraos_"
//  (même préfixe que utils/storage.js), les rassemble dans un fichier
//  JSON lisible, et propose le partage natif Android (Drive, mail,
//  Bluetooth...) — exactement le même mécanisme que l'export PDF
//  santé/guitare (utils/pdfGenerator.js + expo-sharing).
//
//  ⚠️ Ne contient PAS les clés API (elles sont chiffrées séparément
//  via expo-secure-store depuis le lot 30, donc invisibles à
//  AsyncStorage — c'est voulu, on ne veut pas exporter de clés en
//  clair dans un fichier partagé).
// ═══════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const PREFIX = 'kiraos_';

/**
 * Exporte toutes les données AsyncStorage de l'app dans un fichier JSON,
 * puis ouvre le partage natif Android pour l'enregistrer où l'utilisateur
 * le souhaite (Google Drive, envoi par mail à soi-même, etc.).
 * Retourne { uri, nbCles } en cas de succès.
 */
export async function exporterDonneesJSON() {
  const toutesLesCles = await AsyncStorage.getAllKeys();
  const clesKira = toutesLesCles.filter(k => k.startsWith(PREFIX));

  const paires = await AsyncStorage.multiGet(clesKira);
  const donnees = {};
  paires.forEach(([cle, valeur]) => {
    try {
      donnees[cle] = JSON.parse(valeur);
    } catch {
      donnees[cle] = valeur; // certaines valeurs peuvent être de simples chaînes
    }
  });

  const contenu = JSON.stringify(
    { exporteLe: new Date().toISOString(), nombreDeCles: clesKira.length, donnees },
    null,
    2
  );

  const nomFichier = `kiraos-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  const uri = FileSystem.documentDirectory + nomFichier;
  await FileSystem.writeAsStringAsync(uri, contenu, { encoding: FileSystem.EncodingType.UTF8 });

  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Sauvegarder mes données Kira OS',
    });
  }

  return { uri, nbCles: clesKira.length };
}

// ═══════════════════════════════════════════
//  LOT 87 — Sauvegarde automatique périodique, en plus de l'export manuel
//  ci-dessus. Contrairement à exporterDonneesJSON (qui ouvre le partage
//  natif pour que l'utilisateur choisisse où envoyer le fichier), celle-ci
//  est SILENCIEUSE : elle écrit juste une copie locale sur l'appareil,
//  pour ne pas perdre des mois de données en cas de pépin, sans jamais
//  demander d'action à David. Elle ne remplace pas l'export manuel
//  (qu'il reste utile d'envoyer ailleurs — Drive, mail...), juste un
//  filet de sécurité local en plus.
// ═══════════════════════════════════════════

const CLE_DERNIERE_SAUVEGARDE_AUTO = 'kiraos_derniere_sauvegarde_auto';
const DOSSIER_SAUVEGARDES_AUTO = FileSystem.documentDirectory + 'sauvegardes_auto/';
const DELAI_ENTRE_SAUVEGARDES_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
const NB_SAUVEGARDES_CONSERVEES = 3; // rotation — pas d'accumulation infinie

/** Écrit une sauvegarde JSON silencieuse dans un sous-dossier local dédié,
 * puis ne conserve que les NB_SAUVEGARDES_CONSERVEES plus récentes. */
async function ecrireSauvegardeAutoLocale() {
  const toutesLesCles = await AsyncStorage.getAllKeys();
  const clesKira = toutesLesCles.filter(k => k.startsWith(PREFIX));
  const paires = await AsyncStorage.multiGet(clesKira);
  const donnees = {};
  paires.forEach(([cle, valeur]) => {
    try { donnees[cle] = JSON.parse(valeur); } catch { donnees[cle] = valeur; }
  });

  const contenu = JSON.stringify({ exporteLe: new Date().toISOString(), nombreDeCles: clesKira.length, donnees, type: 'auto' }, null, 2);

  const infoDossier = await FileSystem.getInfoAsync(DOSSIER_SAUVEGARDES_AUTO);
  if (!infoDossier.exists) await FileSystem.makeDirectoryAsync(DOSSIER_SAUVEGARDES_AUTO, { intermediates: true });

  const nomFichier = `auto-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await FileSystem.writeAsStringAsync(DOSSIER_SAUVEGARDES_AUTO + nomFichier, contenu, { encoding: FileSystem.EncodingType.UTF8 });

  // Rotation : ne garde que les plus récentes
  const { files } = await FileSystem.readDirectoryAsync(DOSSIER_SAUVEGARDES_AUTO).then(f => ({ files: f.sort() })).catch(() => ({ files: [] }));
  const excedent = files.length - NB_SAUVEGARDES_CONSERVEES;
  if (excedent > 0) {
    await Promise.all(files.slice(0, excedent).map(f => FileSystem.deleteAsync(DOSSIER_SAUVEGARDES_AUTO + f, { idempotent: true })));
  }
}

/**
 * À appeler une fois au démarrage de l'app (App.js). Vérifie si la dernière
 * sauvegarde automatique remonte à plus de 7 jours (ou n'a jamais eu lieu)
 * et, si oui, en écrit une nouvelle en silence. Ne bloque jamais le
 * démarrage de l'app en cas d'erreur (mieux vaut démarrer sans sauvegarde
 * fraîche que planter au lancement pour ça).
 */
export async function sauvegarderAutomatiquementSiNecessaire() {
  try {
    const derniere = await AsyncStorage.getItem(CLE_DERNIERE_SAUVEGARDE_AUTO);
    const doitSauvegarder = !derniere || Date.now() - new Date(derniere).getTime() > DELAI_ENTRE_SAUVEGARDES_MS;
    if (!doitSauvegarder) return;

    await ecrireSauvegardeAutoLocale();
    await AsyncStorage.setItem(CLE_DERNIERE_SAUVEGARDE_AUTO, new Date().toISOString());
  } catch (e) {
    // Silencieux volontairement — une sauvegarde automatique manquée un
    // jour n'est jamais critique, la prochaine tentative aura lieu au
    // prochain démarrage de l'app.
  }
}

/** Pour affichage dans Paramètres → Sécurité : date de la dernière
 * sauvegarde automatique réussie, ou null si aucune n'a encore eu lieu. */
export async function getDateDerniereSauvegardeAuto() {
  const derniere = await AsyncStorage.getItem(CLE_DERNIERE_SAUVEGARDE_AUTO);
  return derniere || null;
}
// (jusqu'ici "Bientôt disponible" depuis le lot 58).
//
// Pas de sélecteur de fichier natif (expo-document-picker n'est pas
// installé — volontairement, pour ne pas ajouter une dépendance native de
// plus alors que David a déjà plusieurs rebuilds en attente). À la place :
// l'utilisateur ouvre son fichier .json exporté (Drive, mail...), copie
// son contenu, et le colle dans un champ texte de l'app. Un vrai
// sélecteur de fichier pourra remplacer ça plus tard, une fois qu'un
// rebuild natif sera de toute façon nécessaire pour autre chose.

/**
 * Restaure une sauvegarde à partir du texte JSON collé par l'utilisateur
 * (généré par exporterDonneesJSON ci-dessus). Écrase les données
 * actuelles pour chaque clé présente dans la sauvegarde — action
 * destructive, à confirmer côté UI avant d'appeler cette fonction.
 * Retourne { nbCles, dateExport }.
 */
export async function importerDonneesJSON(texteJSON) {
  let parsed;
  try {
    parsed = JSON.parse(texteJSON);
  } catch {
    throw new Error("Le texte collé n'est pas un JSON valide — vérifie que tu as bien copié tout le contenu du fichier.");
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.donnees || typeof parsed.donnees !== 'object') {
    throw new Error("Ce contenu ne ressemble pas à une sauvegarde Kira OS valide (structure inattendue).");
  }

  const entrees = Object.entries(parsed.donnees).filter(([cle]) => cle.startsWith(PREFIX));
  if (entrees.length === 0) {
    throw new Error('Aucune donnée Kira OS reconnue dans ce fichier.');
  }

  const paires = entrees.map(([cle, valeur]) => [cle, typeof valeur === 'string' ? valeur : JSON.stringify(valeur)]);
  await AsyncStorage.multiSet(paires);

  return { nbCles: paires.length, dateExport: parsed.exporteLe || null };
}
