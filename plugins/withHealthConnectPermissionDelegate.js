// ═══════════════════════════════════════════
//  WITHHEALTHCONNECTPERMISSIONDELEGATE.JS — Plugin Expo local (lot 69)
//
//  CORRECTIF DU PLANTAGE "Kira OS se ferme en appuyant sur Connecter
//  Health Connect" (crash.log fourni par David le 02/08) :
//
//    kotlin.UninitializedPropertyAccessException: lateinit property
//    requestPermission has not been initialized
//        at dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate
//           .launchPermissionsDialog(HealthConnectPermissionDelegate.kt:45)
//
//  Cause : react-native-health-connect exige une étape d'installation
//  documentée mais NON automatique — un appel à
//  HealthConnectPermissionDelegate.setPermissionDelegate(this) doit être
//  ajouté dans le onCreate() de MainActivity.kt, sinon le "lanceur" de la
//  boîte de dialogue de permissions système n'est jamais créé, et
//  l'appli plante dès qu'on essaie d'appeler requestPermission().
//  Source : https://github.com/matinzd/react-native-health-connect
//  (section "Installation", exemple de diff sur MainActivity.kt).
//
//  Le plugin officiel s'appelle "expo-health-connect" et nécessite
//  d'installer un paquet npm supplémentaire — pour éviter d'ajouter une
//  nouvelle dépendance (et son lot de soucis de résolution qu'on a déjà
//  suffisamment vus sur ce projet), ce plugin fait exactement la même
//  chose "à la main", sur le même principe que withHealthConnectManifest.js
//  et withPorcupineAssets.js déjà présents dans ce dossier.
// ═══════════════════════════════════════════

const { withMainActivity } = require('@expo/config-plugins');

const IMPORT_DELEGATE = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const IMPORT_BUNDLE = 'import android.os.Bundle';
const APPEL_DELEGATE = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

const withHealthConnectPermissionDelegate = config => {
  return withMainActivity(config, config => {
    if (config.modResults.language !== 'kt') {
      console.warn(
        "withHealthConnectPermissionDelegate : MainActivity n'est pas en Kotlin — " +
        'patch non appliqué. Préviens Claude si ce message apparaît, le projet ' +
        'utilise normalement Kotlin.'
      );
      return config;
    }

    let contents = config.modResults.contents;

    // Idempotent : si déjà patché lors d'un prebuild précédent, on ne touche à rien.
    if (contents.includes(APPEL_DELEGATE)) {
      return config;
    }

    // 1. Imports nécessaires (ajoutés juste après la ligne "package ...")
    const importsAAjouter = [];
    if (!contents.includes(IMPORT_BUNDLE)) importsAAjouter.push(IMPORT_BUNDLE);
    if (!contents.includes(IMPORT_DELEGATE)) importsAAjouter.push(IMPORT_DELEGATE);

    if (importsAAjouter.length > 0) {
      contents = contents.replace(
        /^package [\w.]+\n/m,
        match => `${match}${importsAAjouter.map(i => i + '\n').join('')}`
      );
    }

    // 2. Insère l'appel dans onCreate(), JUSTE APRÈS l'appel à super.onCreate(...)
    // (ordre exact recommandé par la documentation officielle du paquet — appeler
    // setPermissionDelegate() avant le super.onCreate() n'est pas garanti sûr selon
    // le cycle de vie Android). Expo génère toujours un onCreate avec
    // "super.onCreate(null)" à l'intérieur ; si ce motif précis n'est pas trouvé
    // (variante inattendue), on se replie sur une insertion juste après l'ouverture
    // de la méthode, avec un avertissement pour vérifier manuellement.
    const regexApresSuper = /(override fun onCreate\(savedInstanceState: Bundle\?\)\s*\{\s*\n\s*super\.onCreate\([^)]*\)\s*\n)/;
    const regexOuvertureOnCreate = /(override fun onCreate\(savedInstanceState: Bundle\?\)\s*\{\s*\n)/;

    if (regexApresSuper.test(contents)) {
      contents = contents.replace(regexApresSuper, `$1    ${APPEL_DELEGATE}\n`);
    } else if (regexOuvertureOnCreate.test(contents)) {
      console.warn(
        'withHealthConnectPermissionDelegate : super.onCreate(...) non trouvé au ' +
        "format attendu — l'appel a été inséré en tout début de onCreate() par " +
        'sécurité. Vérifie MainActivity.kt généré si Health Connect replante.'
      );
      contents = contents.replace(regexOuvertureOnCreate, `$1    ${APPEL_DELEGATE}\n`);
    } else {
      contents = contents.replace(
        /(class MainActivity\s*:\s*ReactActivity\(\)\s*\{\s*\n)/,
        `$1  override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(null)\n    ${APPEL_DELEGATE}\n  }\n\n`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withHealthConnectPermissionDelegate;
