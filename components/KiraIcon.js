// ═══════════════════════════════════════════
//  KIRAICON.JS — Icône animée de Kira
// ═══════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { KIRA_ICONS } from '../utils/apiKeys';

export default function KiraIcon({ size = 44, color = '#6C63FF', iconId = 'etoile', emojiSize }) {
  const config = KIRA_ICONS.find(i => i.id === iconId) || KIRA_ICONS[0];
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;

    if (config.animation === 'pulse' || config.animation === 'pulse-glow') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ])
      );
    } else if (config.animation === 'rotate') {
      animation = Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 6000, useNativeDriver: true })
      );
    }

    animation?.start();
    return () => animation?.stop();
  }, [config.animation]);

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
          backgroundColor: color,
          transform: transformStyle,
          shadowColor: color,
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