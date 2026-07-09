import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './widget/widgetTaskHandler';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Enregistre le gestionnaire du widget "Kira OS — Maxi" (lot 41) : c'est
// ce qui permet à Android d'appeler notre code même quand l'app est fermée,
// pour dessiner/actualiser le widget sur l'écran d'accueil.
registerWidgetTaskHandler(widgetTaskHandler);

