// ═══════════════════════════════════════════
//  WITHPORCUPINEASSETS.JS — Plugin Expo local (lot 43)
//
//  Picovoice ne fournit pas de plugin Expo officiel pour copier les
//  fichiers du mot de réveil personnalisé ("Kira") dans le projet
//  Android. Ce petit plugin fait ce travail automatiquement à chaque
//  "prebuild" (donc à chaque `eas build`) : il copie tout le contenu
//  de assets/porcupine/ (à la racine du projet) vers
//  android/app/src/main/assets/ dans le projet Android généré.
//
//  Concrètement : tu déposes tes fichiers .ppn et .pv téléchargés
//  depuis Picovoice Console dans assets/porcupine/, et ce plugin
//  s'occupe du reste — pas besoin de toucher au dossier android/ à la main.
// ═══════════════════════════════════════════

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function copierRecursivement(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(destination, { recursive: true });

  for (const entree of fs.readdirSync(source, { withFileTypes: true })) {
    if (entree.name === '.gitkeep') continue;
    const cheminSource = path.join(source, entree.name);
    const cheminDestination = path.join(destination, entree.name);

    if (entree.isDirectory()) {
      copierRecursivement(cheminSource, cheminDestination);
    } else {
      fs.copyFileSync(cheminSource, cheminDestination);
    }
  }
}

const withPorcupineAssets = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      const dossierSource = path.join(config.modRequest.projectRoot, 'assets', 'porcupine');
      const dossierDestination = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'assets'
      );
      copierRecursivement(dossierSource, dossierDestination);
      return config;
    },
  ]);
};

module.exports = withPorcupineAssets;
