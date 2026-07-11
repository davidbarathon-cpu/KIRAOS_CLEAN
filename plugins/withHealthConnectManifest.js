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

const withHealthConnectManifest = config => {
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

module.exports = withHealthConnectManifest;
