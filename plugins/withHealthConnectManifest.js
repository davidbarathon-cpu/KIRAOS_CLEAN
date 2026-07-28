// ═══════════════════════════════════════════
//  WITHHEALTHCONNECTMANIFEST.JS — Plugin Expo local (lot 45)
//
//  Health Connect a besoin d'un "filtre d'intention" spécial déclaré
//  sur l'activité principale de l'app pour pouvoir afficher son écran
//  d'explication des permissions ("pourquoi Kira OS demande accès à
//  tes pas, ton sommeil..."). react-native-health-connect ne l'ajoute
//  pas tout seul — ce petit plugin s'en charge automatiquement à
//  chaque build, comme withPorcupineAssets.js pour l'écoute permanente.
// ═══════════════════════════════════════════

const { withAndroidManifest } = require('@expo/config-plugins');

const PACKAGE_HEALTH_CONNECT = 'com.google.android.apps.healthdata';

const withHealthConnectManifest = config => {
  config = withQueriesHealthConnect(config);
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    const activitePrincipale = manifest.application?.[0]?.activity?.[0];

    if (!activitePrincipale) {
      console.warn('withHealthConnectManifest : activité principale introuvable, filtre non ajouté.');
      return config;
    }

    if (!activitePrincipale['intent-filter']) {
      activitePrincipale['intent-filter'] = [];
    }

    // Évite d'ajouter le filtre deux fois si prebuild est relancé plusieurs fois.
    const dejaPresent = activitePrincipale['intent-filter'].some(f =>
      f.action?.some(a => a.$?.['android:name'] === 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE')
    );

    if (!dejaPresent) {
      activitePrincipale['intent-filter'].push({
        action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }],
      });
    }

    return config;
  });
};

/**
 * CORRECTIF LOT 60 : depuis Android 11, une app ne peut pas "voir" ou
 * lancer une autre app installée sans déclarer explicitement son package
 * dans un bloc <queries> du manifeste (restriction de visibilité des
 * packages). Sans ce bloc, l'appel à requestPermission() de Health Connect
 * peut échouer de façon très bas niveau — jusqu'à un plantage immédiat de
 * l'app sur certains appareils/versions Android, sans le moindre message
 * d'erreur JS puisque le problème se situe avant même d'atteindre le code
 * JavaScript. C'est l'étape d'installation officiellement documentée par
 * react-native-health-connect qui manquait ici.
 */
const withQueriesHealthConnect = config => {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [{ package: [] }];
    }
    if (!manifest.queries[0].package) {
      manifest.queries[0].package = [];
    }

    const dejaPresent = manifest.queries[0].package.some(
      p => p.$?.['android:name'] === PACKAGE_HEALTH_CONNECT
    );

    if (!dejaPresent) {
      manifest.queries[0].package.push({ $: { 'android:name': PACKAGE_HEALTH_CONNECT } });
    }

    return config;
  });
};

module.exports = withHealthConnectManifest;
