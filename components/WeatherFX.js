// ═══════════════════════════════════════════
//  WEATHERFX.JS — Effets météo globaux animés
//  NOUVEAU (comble un manque du cahier des charges
//  section 2) : jusqu'ici, la pluie et le givre
//  n'étaient visibles que dans MeteoScreen. Ce
//  composant est monté UNE SEULE FOIS dans App.js
//  et flotte au-dessus de TOUS les écrans de l'app,
//  pour que la météo se ressente partout, comme
//  demandé ("des gouttes de pluie sur l'écran...
//  du givre sur les bords... des feuilles qui
//  volent... du brouillard").
//
//  Ajoute aussi les effets VENT et BROUILLARD, qui
//  étaient détectés par getWeatherEffect() mais
//  n'avaient jamais de rendu visuel codé.
//
//  Respecte le réglage prefs.weatherFx (Paramètres
//  → Apparence → "Animations météo") : si désactivé,
//  ce composant ne rend rien du tout.
// ═══════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { getData } from '../utils/storage';
import { getAllApiKeys } from '../utils/apiKeys';
import { getMeteoReelle } from '../utils/weatherCaller';
import { PALETTE } from '../utils/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Durée entre deux vérifications météo en arrière-plan (15 minutes).
// Pas besoin de vérifier plus souvent : la météo ne change pas vite,
// et ça économise les appels API + la batterie.
const INTERVALLE_RAFRAICHISSEMENT_MS = 15 * 60 * 1000;

/**
 * Détermine quel effet visuel afficher selon le texte de la condition météo.
 * Reprend exactement la même logique que MeteoScreen pour rester cohérent.
 */
export function getWeatherEffect(condition) {
  const c = (condition || '').toLowerCase();
  if (c.includes('pluie') || c.includes('orage')) return 'rain';
  if (c.includes('neige') || c.includes('gel')) return 'frost';
  if (c.includes('vent')) return 'wind';
  if (c.includes('brouillard')) return 'fog';
  return 'none';
}

// ── Pluie : gouttes qui tombent en continu ──
function RainEffect() {
  const drops = useRef(
    Array.from({ length: 22 }, () => ({
      x: Math.random() * SCREEN_W,
      anim: new Animated.Value(0),
      delay: Math.random() * 2000,
      duration: 1100 + Math.random() * 900,
    }))
  ).current;

  useEffect(() => {
    const loops = drops.map(d => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(d.delay),
          Animated.timing(d.anim, { toValue: 1, duration: d.duration, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={styles.fxOverlay} pointerEvents="none">
      {drops.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.raindrop,
            {
              left: d.x,
              opacity: d.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.5, 0.3, 0] }),
              transform: [{ translateY: d.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, SCREEN_H * 0.55] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Givre : voile glacé qui apparaît sur les coins de l'écran ──
function FrostEffect() {
  return (
    <View style={styles.fxOverlay} pointerEvents="none">
      <View style={[styles.frostCorner, { top: 0, left: 0 }]} />
      <View style={[styles.frostCorner, { top: 0, right: 0 }]} />
      <View style={[styles.frostCorner, styles.frostCornerBottom, { bottom: 0, left: 0 }]} />
      <View style={[styles.frostCorner, styles.frostCornerBottom, { bottom: 0, right: 0 }]} />
    </View>
  );
}

// ── Vent : feuilles qui traversent l'écran en oscillant ──
function WindEffect() {
  const feuilles = useRef(
    Array.from({ length: 7 }, () => ({
      y: Math.random() * SCREEN_H * 0.8,
      anim: new Animated.Value(0),
      delay: Math.random() * 3000,
      duration: 3500 + Math.random() * 2000,
      taille: 14 + Math.random() * 10,
    }))
  ).current;

  useEffect(() => {
    const loops = feuilles.map(f => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(f.delay),
          Animated.timing(f.anim, { toValue: 1, duration: f.duration, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={styles.fxOverlay} pointerEvents="none">
      {feuilles.map((f, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: f.y,
            opacity: f.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.6, 0.6, 0] }),
            transform: [
              { translateX: f.anim.interpolate({ inputRange: [0, 1], outputRange: [-40, SCREEN_W + 40] }) },
              {
                translateY: f.anim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0, -18, 0, -18, 0],
                }),
              },
              {
                rotate: f.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }),
              },
            ],
          }}
        >
          <View style={{ width: f.taille, height: f.taille * 0.7, borderRadius: f.taille, backgroundColor: PALETTE.orange, opacity: 0.55 }} />
        </Animated.View>
      ))}
    </View>
  );
}

// ── Brouillard : nappe semi-transparente qui dérive lentement ──
function FogEffect() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 12000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 12000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.fxOverlay} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.3,
          left: 0,
          width: SCREEN_W * 1.6,
          height: SCREEN_H * 0.5,
          backgroundColor: 'rgba(220,225,235,0.10)',
          borderRadius: 999,
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_W * 0.3, 0] }) },
          ],
        }}
      />
    </View>
  );
}

/**
 * Composant principal — à monter UNE SEULE FOIS dans App.js, au-dessus
 * du NavigationContainer, pour que les effets soient visibles sur tous
 * les écrans sans rien avoir à modifier dans chaque écran individuellement.
 */
export default function WeatherFX() {
  const [effect, setEffect] = useState('none');
  const [actif, setActif] = useState(true);

  const verifierMeteo = useCallback(async () => {
    const [profil, prefs, keys] = await Promise.all([
      getData('profil'),
      getData('prefs'),
      getAllApiKeys(),
    ]);

    // Respecte le réglage utilisateur — si désactivé dans les Paramètres,
    // on ne calcule même pas d'effet, on coupe tout immédiatement.
    if (prefs && prefs.weatherFx === false) {
      setActif(false);
      return;
    }
    setActif(true);

    const ville = profil?.ville || 'Villeneuve-sur-Lot';
    const apiKey = keys?.openweathermap;
    const meteo = await getMeteoReelle(ville, apiKey);
    setEffect(getWeatherEffect(meteo.condition));
  }, []);

  useEffect(() => {
    verifierMeteo();
    const interval = setInterval(verifierMeteo, INTERVALLE_RAFRAICHISSEMENT_MS);
    return () => clearInterval(interval);
  }, [verifierMeteo]);

  if (!actif || effect === 'none') return null;

  return (
    <View style={styles.conteneurGlobal} pointerEvents="none">
      {effect === 'rain' && <RainEffect />}
      {effect === 'frost' && <FrostEffect />}
      {effect === 'wind' && <WindEffect />}
      {effect === 'fog' && <FogEffect />}
    </View>
  );
}

const styles = StyleSheet.create({
  // zIndex élevé pour flotter au-dessus de la navigation, mais pointerEvents
  // "none" partout pour ne JAMAIS bloquer les touchers de l'utilisateur.
  conteneurGlobal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  fxOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  raindrop: { position: 'absolute', width: 1.5, height: 14, backgroundColor: PALETTE.blue, top: 0, borderRadius: 1 },
  frostCorner: {
    position: 'absolute',
    width: 110,
    height: 110,
    backgroundColor: 'rgba(200,230,255,0.10)',
    borderRadius: 55,
  },
  frostCornerBottom: {
    backgroundColor: 'rgba(200,230,255,0.06)',
  },
});
