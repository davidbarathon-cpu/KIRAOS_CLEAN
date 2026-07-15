// KIRAICON.JS — Icône Kira redessinée (lot 40)
// Inspirée de l'icône d'application : orbe cristallin avec
// dégradé bleu/violet/rose, anneaux lumineux animés, étincelle dorée.
// Construit en SVG pur (react-native-svg), sans moteur 3D.

import { useEffect, useId, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient,
  RadialGradient, Stop,
} from 'react-native-svg';
import { KIRA_ICONS } from '../utils/apiKeys';
import { KIRA_STATE_COLORS } from '../utils/theme';

const VITESSE_PAR_ETAT = { rush: 0.55, flow: 1, recovery: 1.6 };

// Couleurs du dégradé cristallin de base (bleu→violet→rose comme le K)
const CRISTAL_DEGRADE = ['#22D3EE', '#6C63FF', '#F472B6'];

export default function KiraIcon({ size = 44, color = '#6C63FF', iconId = 'etoile', emojiSize, kiraState, modeEco = false }) {
  const config = KIRA_ICONS.find(i => i.id === iconId) || KIRA_ICONS[0];
  const couleurFinale = kiraState ? (KIRA_STATE_COLORS[kiraState] || color) : color;
  const facteurVitesse = kiraState ? (VITESSE_PAR_ETAT[kiraState] || 1) : 1;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const idGrad = `kg${uid}`;
  const idHalo = `kh${uid}`;
  const idAnneau = `ka${uid}`;

  // Animations
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0.4)).current;
  const etincelle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Mode Éco (lot 50) : Kira reste visible mais parfaitement immobile —
    // aucune boucle Animated ne démarre, ce qui économise du CPU/de la
    // batterie sur un composant affiché en permanence sur presque tous
    // les écrans (bouton flottant, en-têtes...).
    if (modeEco) return undefined;

    const d = facteurVitesse;
    const loops = [];

    if (config.animation === 'pulse' || config.animation === 'pulse-glow') {
      loops.push(Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: Math.round(1100 * d), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: Math.round(1100 * d), useNativeDriver: true }),
      ])));
    }
    if (config.animation === 'rotate' || config.animation === 'pulse-glow') {
      loops.push(Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: Math.round(5000 * d), useNativeDriver: true })
      ));
    }
    if (config.animation === 'pulse-glow') {
      loops.push(Animated.loop(Animated.sequence([
        Animated.timing(halo, { toValue: 0.9, duration: Math.round(1600 * d), useNativeDriver: false }),
        Animated.timing(halo, { toValue: 0.4, duration: Math.round(1600 * d), useNativeDriver: false }),
      ])));
    }
    // Étincelle dorée qui clignote périodiquement
    loops.push(Animated.loop(Animated.sequence([
      Animated.delay(Math.round(2000 * d)),
      Animated.timing(etincelle, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(etincelle, { toValue: 0, duration: 300, useNativeDriver: true }),
    ])));

    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [config.animation, facteurVitesse, modeEco]);

  const rotateInterpolated = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const transformOrbe = !modeEco && (config.animation === 'rotate' || config.animation === 'pulse-glow')
    ? [{ rotate: rotateInterpolated }]
    : [];
  const transformPulse = !modeEco && (config.animation === 'pulse' || config.animation === 'pulse-glow')
    ? [{ scale: pulse }]
    : [];

  const r = size / 2;
  const cx = r;
  const cy = r;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Halo externe pulsant */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: size,
          backgroundColor: couleurFinale,
          opacity: config.animation === 'pulse-glow' ? halo : 0.35,
          transform: [{ scale: 1.3 }],
          shadowColor: couleurFinale,
          shadowOpacity: 0.9,
          shadowRadius: size * 0.4,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }
      ]} />

      {/* Orbe principal avec dégradé cristallin */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        { transform: [...transformPulse, ...transformOrbe] }
      ]}>
        <Svg width={size} height={size}>
          <Defs>
            {/* Dégradé radial principal : blanc → couleur → foncé */}
            <RadialGradient id={idGrad} cx="35%" cy="28%" r="72%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <Stop offset="30%" stopColor={CRISTAL_DEGRADE[0]} stopOpacity="0.9" />
              <Stop offset="65%" stopColor={couleurFinale} stopOpacity="1" />
              <Stop offset="100%" stopColor={CRISTAL_DEGRADE[2]} stopOpacity="0.7" />
            </RadialGradient>
            {/* Dégradé linéaire pour l'anneau externe — effet néon */}
            <LinearGradient id={idAnneau} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
              <Stop offset="40%" stopColor={CRISTAL_DEGRADE[0]} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={CRISTAL_DEGRADE[2]} stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {/* Anneau extérieur lumineux (comme le double anneau du K) */}
          <Circle
            cx={cx} cy={cy} r={r - 2}
            fill="none"
            stroke={`url(#${idAnneau})`}
            strokeWidth={size * 0.06}
            strokeOpacity={0.7}
          />
          {/* Second anneau intérieur plus fin */}
          <Circle
            cx={cx} cy={cy} r={r - size * 0.12}
            fill="none"
            stroke={couleurFinale}
            strokeWidth={size * 0.025}
            strokeOpacity={0.5}
          />
          {/* Corps de l'orbe */}
          <Circle cx={cx} cy={cy} r={r - size * 0.16} fill={`url(#${idGrad})`} />
          {/* Reflet gloss en haut */}
          <Ellipse
            cx={cx - size * 0.08} cy={cy - size * 0.22}
            rx={size * 0.22} ry={size * 0.13}
            fill="white" fillOpacity={0.35}
          />
          {/* Petite étincelle facette cristal (bas-droite) */}
          <Circle
            cx={cx + size * 0.2} cy={cy + size * 0.18}
            r={size * 0.04}
            fill={CRISTAL_DEGRADE[0]} fillOpacity={0.8}
          />
        </Svg>
      </Animated.View>

      {/* Étincelle dorée qui clignote (angle haut-droit comme dans le K) */}
      <Animated.View style={{
        position: 'absolute',
        top: size * 0.04,
        right: size * 0.06,
        opacity: etincelle,
      }}>
        <Text style={{ fontSize: size * 0.2, color: '#FFD700' }}>✦</Text>
      </Animated.View>

      {/* Emoji central */}
      <Text style={{
        position: 'absolute',
        fontSize: emojiSize || size * 0.4,
        textAlign: 'center',
      }}>{config.emoji}</Text>
    </View>
  );
}
