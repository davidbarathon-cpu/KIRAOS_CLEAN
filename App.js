import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as QuickActions from 'expo-quick-actions';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';

import ActualitesScreen from './screens/ActualitesScreen';
import AgendaScreen from './screens/AgendaScreen';
import CoursesScreen from './screens/CoursesScreen';
import CreerModuleScreen from './screens/CreerModuleScreen';
import CuisineScreen from './screens/CuisineScreen';
import DomotiqueScreen from './screens/DomotiqueScreen';
import EcouteRapideScreen from './screens/EcouteRapideScreen';
import GuitareScreen from './screens/GuitareScreen';
import HomeScreen from './screens/HomeScreen';
import HoroscopeScreen from './screens/HoroscopeScreen';
import KiraChatScreen from './screens/KiraChatScreen';
import MeteoScreen from './screens/MeteoScreen';
import ModulePersonnaliseScreen from './screens/ModulePersonnaliseScreen';
import MusiqueScreen from './screens/MusiqueScreen';
import NotesScreen from './screens/NotesScreen';
import ParametresScreen from './screens/ParametresScreen';
import ParkingScreen from './screens/ParkingScreen';
import PotagerScreen from './screens/PotagerScreen';
import ReveilScreen from './screens/ReveilScreen';
import SanteScreen from './screens/SanteScreen';
import TraductionScreen from './screens/TraductionScreen';

import { demanderPermissionNotifications } from './utils/notifications';
import { initStorage } from './utils/storage';
import { THEMES } from './utils/theme';

const Stack = createNativeStackNavigator();

// ── Déclaration du App Shortcut Android ──
// "Parler à Kira" apparaît dans le menu qui s'ouvre par appui long sur
// l'icône de l'app, depuis l'écran d'accueil du téléphone — sans avoir
// à ouvrir l'app normalement au préalable.
QuickActions.setItems([
  {
    id: 'parler-a-kira',
    title: 'Parler à Kira',
    subtitle: 'Lance le micro directement',
    icon: 'kira_mic', // voir le guide d'installation pour l'icône native correspondante
  },
]);

export default function App() {
  const [ready, setReady] = useState(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    (async () => {
      await initStorage();
      await demanderPermissionNotifications();
      setReady(true);
    })();
  }, []);

  // ── Écoute le déclenchement du Shortcut, que l'app soit déjà ouverte
  // (cas "warm start") ou lancée fraîchement depuis le shortcut (cas "cold start") ──
  useEffect(() => {
    // Cas où l'app était déjà fermée et vient d'être lancée via le shortcut
    QuickActions.initial?.then(action => {
      if (action?.id === 'parler-a-kira') {
        // On attend que la navigation soit prête avant de naviguer
        setTimeout(() => navigationRef.current?.navigate('EcouteRapide'), 300);
      }
    });

    // Cas où l'app tournait déjà en arrière-plan et est ramenée au premier plan via le shortcut
    const sub = QuickActions.addListener(action => {
      if (action?.id === 'parler-a-kira') {
        navigationRef.current?.navigate('EcouteRapide');
      }
    });

    return () => sub?.remove();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor={THEMES.cosmos.bg} />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: THEMES.cosmos.bg },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Agenda" component={AgendaScreen} />
          <Stack.Screen name="Sante" component={SanteScreen} />
          <Stack.Screen name="KiraChat" component={KiraChatScreen} />
          <Stack.Screen name="Guitare" component={GuitareScreen} />
          <Stack.Screen name="Cuisine" component={CuisineScreen} />
          <Stack.Screen name="Courses" component={CoursesScreen} />
          <Stack.Screen name="Meteo" component={MeteoScreen} />
          <Stack.Screen name="Horoscope" component={HoroscopeScreen} />
          <Stack.Screen name="Notes" component={NotesScreen} />
          <Stack.Screen name="Potager" component={PotagerScreen} />
          <Stack.Screen name="Parking" component={ParkingScreen} />
          <Stack.Screen name="Actualites" component={ActualitesScreen} />
          <Stack.Screen name="Traduction" component={TraductionScreen} />
          <Stack.Screen name="Musique" component={MusiqueScreen} />
          <Stack.Screen name="Reveil" component={ReveilScreen} />
          <Stack.Screen name="Domotique" component={DomotiqueScreen} />
          <Stack.Screen name="Parametres" component={ParametresScreen} />
          <Stack.Screen name="ModulePersonnalise" component={ModulePersonnaliseScreen} />
          <Stack.Screen name="CreerModule" component={CreerModuleScreen} />
          <Stack.Screen
            name="EcouteRapide"
            component={EcouteRapideScreen}
            options={{ animation: 'fade', presentation: 'transparentModal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
