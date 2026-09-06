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

// LOT 74 — Rend enfin fonctionnel le bouton "📥 Importer une sauvegarde"
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
