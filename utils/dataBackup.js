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
