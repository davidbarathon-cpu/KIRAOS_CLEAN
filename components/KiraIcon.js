// ═══════════════════════════════════════════
//  KIRAICON.JS — Icône animée de Kira
//  MISE À JOUR LOT 29 : Kira réagit maintenant à son
//  humeur réelle (kiraState = 'rush' | 'flow' |
//  'recovery'). Si kiraState est fourni, sa couleur
//  et sa vitesse d'animation prennent le dessus sur
//  la prop `color` fixe — sinon le comportement
//  d'avant est inchangé (rétro-compatible avec tous
//  les écrans existants qui n'utilisent pas kiraState).
// ═══════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
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
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    const dureePulse = Math.round(1100 * facteurVitesse);
    const dureeRotate = Math.round(6000 * facteurVitesse);

    if (config.animation === 'pulse' || config.animation === 'pulse-glow') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: dureePulse, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: dureePulse, useNativeDriver: true }),
        ])
      );
    } else if (config.animation === 'rotate') {
      animation = Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: dureeRotate, useNativeDriver: true })
      );
    }

    animation?.start();
    return () => animation?.stop();
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
    <Animated.View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: couleurFinale,
          transform: transformStyle,
          shadowColor: couleurFinale,
          shadowOpacity: 0.5,
          shadowRadius: size * 0.35,
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize || size * 0.45 }}>{config.emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
