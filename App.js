import './utils/geofencingTask'; // LOT 54 — doit être chargé au tout début (règle expo-task-manager)

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
import NotesScreen from './screens/NotesScreen';
import ParametresScreen from './screens/ParametresScreen';
import ParkingScreen from './screens/ParkingScreen';
import PotagerScreen from './screens/PotagerScreen';
import ReveilScreen from './screens/ReveilScreen';
import SanteScreen from './screens/SanteScreen';
import TraductionScreen from './screens/TraductionScreen';

import { getGeoKiraActif, demarrerGeoKira } from './utils/geoKira'; // LOT 54
import { demanderPermissionNotifications } from './utils/notifications';
import { getData, initStorage } from './utils/storage';
import { getTheme, THEMES } from './utils/theme';
import WeatherFX from './components/WeatherFX';

const Stack = createNativeStackNavigator();

// ── Deep-linking (lot 41) ──
// Nécessaire pour que les boutons du widget "Kira OS — Maxi" (écran
// d'accueil Android) puissent ouvrir directement un écran précis de
// l'app (ex: kiraosclean://ecoute → écran d'écoute rapide) plutôt que
// de simplement rouvrir l'app sur l'accueil.
const linking = {
  prefixes: ['kiraosclean://'],
  config: {
    screens: {
      Home: '',
      Agenda: 'agenda',
      Meteo: 'meteo',
      Sante: 'sante',
      KiraChat: 'chat',
      EcouteRapide: 'ecoute',
    },
  },
};

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
  const [themeActif, setThemeActif] = useState(THEMES.cosmos);
  const navigationRef = useRef(null);

  useEffect(() => {
    (async () => {
      await initStorage();
      await demanderPermissionNotifications();
      // ⚠️ Corrige au lot 52 : la couleur de fond de la barre de statut et
      // du fond de navigation entre les écrans était figée sur Cosmos,
      // même quand l'utilisateur avait choisi un autre thème.
      const prefs = await getData('prefs');
      if (prefs?.theme) setThemeActif(getTheme(prefs.theme));

      // LOT 54 — Relance la surveillance Géo-Kira si elle était déjà active
      // (Android arrête parfois les tâches en arrière-plan après un redémarrage
      // du téléphone, ceci les relance à chaque ouverture de l'app).
      getGeoKiraActif().then(actif => {
        if (actif) demarrerGeoKira();
      });

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
      <StatusBar style="light" backgroundColor={themeActif.bg} />
      <NavigationContainer ref={navigationRef} linking={linking}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: themeActif.bg },
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

      {/* Effets météo globaux (lot 29) : flottent au-dessus de toute la
          navigation, ne bloquent jamais les touchers (pointerEvents="none"
          en interne dans WeatherFX). */}
      <WeatherFX />
    </>
  );
}
