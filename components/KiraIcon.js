// ═══════════════════════════════════════════
//  KIRAICON.JS — Icône premium animée de Kira
//  MISE À JOUR LOT 38 : remplace le cercle plat par
//  un orbe lumineux avec dégradé radial, halo flou en
//  arrière-plan et reflet "verre" — même langage
//  visuel premium/gloss que PremiumIcon.js (utilisé
//  pour les modules), pour une cohérence visuelle
//  totale dans toute l'app. Construit en SVG pur,
//  aucun moteur 3D, poids quasi nul.
//
//  Toute la logique d'animation existante est
//  préservée à l'identique : 3 types d'animation
//  (pulse, rotate, pulse-glow) selon le modèle
//  d'icône choisi (KIRA_ICONS dans apiKeys.js), et
//  réaction à l'humeur réelle de Kira (kiraState)
//  ajoutée au lot 29 — couleur et vitesse d'animation
//  changent toujours selon rush/flow/recovery.
// ═══════════════════════════════════════════

import { useEffect, useId, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { KIRA_ICONS } from '../utils/apiKeys';
import { KIRA_STATE_COLORS } from '../utils/theme';

// Vitesse d'animation selon l'humeur : rush = vif et nerveux,
// flow = rythme normal, recovery = lent et apaisé.
const VITESSE_PAR_ETAT = {
  rush: 0.55,
  flow: 1,
  recovery: 1.6,
};

export default function KiraIcon({ size = 44, color = '#6C63FF', iconId = 'etoile', emojiSize, kiraState }) {
  const config = KIRA_ICONS.find(i => i.id === iconId) || KIRA_ICONS[0];
  const couleurFinale = kiraState ? (KIRA_STATE_COLORS[kiraState] || color) : color;
  const facteurVitesse = kiraState ? (VITESSE_PAR_ETAT[kiraState] || 1) : 1;
  // Identifiant unique par instance pour le dégradé SVG — évite toute
  // collision si plusieurs KiraIcon sont affichées en même temps (ex: une
  // dans le header du chat, une dans le bouton flottant de l'accueil).
  const gradientId = `kiraGrad${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    let animationPrincipale;
    let animationHalo;
    const dureePulse = Math.round(1100 * facteurVitesse);
    const dureeRotate = Math.round(6000 * facteurVitesse);
    const dureeHalo = Math.round(1600 * facteurVitesse);

    if (config.animation === 'pulse' || config.animation === 'pulse-glow') {
      animationPrincipale = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: dureePulse, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: dureePulse, useNativeDriver: true }),
        ])
      );
    } else if (config.animation === 'rotate') {
      animationPrincipale = Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: dureeRotate, useNativeDriver: true })
      );
    }

    // Le halo lumineux pulse en continu uniquement pour le style
    // "pulse-glow" — donne un effet de respiration lumineuse en plus de
    // l'agrandissement de l'orbe lui-même.
    if (config.animation === 'pulse-glow') {
      animationHalo = Animated.loop(
        Animated.sequence([
          Animated.timing(halo, { toValue: 1, duration: dureeHalo, useNativeDriver: false }),
          Animated.timing(halo, { toValue: 0.5, duration: dureeHalo, useNativeDriver: false }),
        ])
      );
      animationHalo.start();
    }

    animationPrincipale?.start();
    return () => {
      animationPrincipale?.stop();
      animationHalo?.stop();
    };
  }, [config.animation, facteurVitesse]);

  const rotateInterpolated = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const transformStyle = [];
  if (config.animation === 'pulse' || config.animation === 'pulse-glow') {
    transformStyle.push({ scale: pulse });
  }
  if (config.animation === 'rotate') {
    transformStyle.push({ rotate: rotateInterpolated });
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: size * 0.68,
            top: -size * 0.175,
            left: -size * 0.175,
            backgroundColor: couleurFinale,
            opacity: config.animation === 'pulse-glow' ? halo : 0.4,
            shadowColor: couleurFinale,
          },
        ]}
      />
      <Animated.View style={[styles.orbeWrap, { width: size, height: size, transform: transformStyle }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={gradientId} cx="35%" cy="30%" r="75%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="35%" stopColor={couleurFinale} stopOpacity="1" />
              <Stop offset="100%" stopColor={couleurFinale} stopOpacity="0.55" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`url(#${gradientId})`} />
        </Svg>
        <View
          style={[
            styles.reflet,
            { width: size * 0.55, height: size * 0.28, borderRadius: size * 0.3, top: size * 0.08, left: size * 0.18 },
          ]}
        />
        <Text style={{ fontSize: emojiSize || size * 0.45, textAlign: 'center' }}>{config.emoji}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 6,
  },
  orbeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  reflet: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ rotate: '-20deg' }],
  },
});
