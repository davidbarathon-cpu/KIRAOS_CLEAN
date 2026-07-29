// KIRAICON.JS — Icône Kira, orbe cristallin vivant (LOT 62)
//
// MISE À JOUR LOT 62 : la version précédente (lot 40) posait un gros
// emoji plat (🌟, 🌀, 🔮...) par-dessus la sphère en dégradé — visuellement,
// l'emoji écrasait tout le travail de relief/lumière en dessous et donnait
// l'impression d'"une simple icône qui bouge". Corrections apportées,
// toujours en SVG pur (react-native-svg), sans aucun nouveau module :
//   1. L'emoji est réduit à un petit détail discret et lumineux au centre,
//      au lieu de dominer toute l'icône.
//   2. Un reflet secondaire se déplace en boucle sur la sphère, comme une
//      vraie source de lumière qui tourne autour d'un objet 3D.
//   3. Deux particules lumineuses orbitent en continu autour de la sphère,
//      à des vitesses et distances différentes.
//   4. Un anneau d'énergie fin tourne en permanence, quel que soit le type
//      d'animation choisi (avant, seuls "rotate"/"pulse-glow" tournaient).
// Toutes ces animations sont désactivées en Mode Éco (lot 50), comme avant.

import { useEffect, useId, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient,
  RadialGradient, Stop,
} from 'react-native-svg';
import { KIRA_ICONS, getRendu3DActif } from '../utils/apiKeys';
import { KIRA_STATE_COLORS } from '../utils/theme';
import KiraOrb3D from './KiraOrb3D';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const VITESSE_PAR_ETAT = { rush: 0.55, flow: 1, recovery: 1.6 };

// Couleurs du dégradé cristallin de base (bleu→violet→rose comme le K)
const CRISTAL_DEGRADE = ['#22D3EE', '#6C63FF', '#F472B6'];

export default function KiraIcon({ size = 44, color = '#6C63FF', iconId = 'etoile', emojiSize, kiraState, modeEco = false, apercu = false }) {
  const config = KIRA_ICONS.find(i => i.id === iconId) || KIRA_ICONS[0];
  const couleurFinale = kiraState ? (KIRA_STATE_COLORS[kiraState] || color) : color;
  const facteurVitesse = kiraState ? (VITESSE_PAR_ETAT[kiraState] || 1) : 1;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const idGrad = `kg${uid}`;
  const idAnneau = `ka${uid}`;

  // LOT 63 — Rendu 3D expérimental : activé uniquement si l'utilisateur l'a
  // explicitement choisi dans Paramètres, jamais en Mode Éco (coûteux en
  // batterie), et jamais dans une petite vignette d'aperçu (apercu=true,
  // utilisé par le sélecteur d'icônes qui affiche 8 icônes à la fois —
  // faire tourner 8 scènes 3D simultanément serait inutilement lourd).
  const [rendu3D, setRendu3D] = useState(false);
  useEffect(() => {
    if (modeEco || apercu) {
      setRendu3D(false);
      return;
    }
    getRendu3DActif().then(setRendu3D);
  }, [modeEco, apercu]);

  // Animations existantes (lot 40)
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0.4)).current;
  const etincelle = useRef(new Animated.Value(0)).current;

  // Animations nouvelles (lot 62) — toujours actives, quel que soit le
  // type d'animation choisi, pour que CHAQUE icône paraisse vivante.
  const lumiereMobile = useRef(new Animated.Value(0)).current;
  const anneauEnergie = useRef(new Animated.Value(0)).current;
  const orbite1 = useRef(new Animated.Value(0)).current;
  const orbite2 = useRef(new Animated.Value(0)).current;

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

    // ── LOT 62 : animations "vivantes", indépendantes du type d'icône ──
    // Lumière qui se déplace sur la sphère (simule une source lumineuse
    // qui tourne autour d'un objet 3D) — pas de useNativeDriver ici car
    // on anime des coordonnées SVG (cx/cy), pas une transform.
    loops.push(Animated.loop(
      Animated.timing(lumiereMobile, { toValue: 1, duration: Math.round(4200 * d), useNativeDriver: false })
    ));
    // Anneau d'énergie fin, tourne toujours, même pour les icônes "pulse"
    loops.push(Animated.loop(
      Animated.timing(anneauEnergie, { toValue: 1, duration: Math.round(7000 * d), useNativeDriver: true })
    ));
    // Deux particules en orbite, vitesses et sens différents
    loops.push(Animated.loop(
      Animated.timing(orbite1, { toValue: 1, duration: Math.round(3400 * d), useNativeDriver: true })
    ));
    loops.push(Animated.loop(
      Animated.timing(orbite2, { toValue: 1, duration: Math.round(5600 * d), useNativeDriver: true })
    ));

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

  // Trajectoire approximative en boucle pour la lumière mobile (donne
  // l'illusion d'une source lumineuse qui balaie la surface de la sphère).
  const lumiereCx = lumiereMobile.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [cx - size * 0.14, cx + size * 0.1, cx + size * 0.2, cx - size * 0.02, cx - size * 0.14],
  });
  const lumiereCy = lumiereMobile.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [cy - size * 0.22, cy - size * 0.28, cy - size * 0.05, cy + size * 0.12, cy - size * 0.22],
  });
  const lumiereOpacite = lumiereMobile.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.2, 0.5],
  });

  const anneauRotationDeg = anneauEnergie.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbite1Deg = orbite1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbite2Deg = orbite2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }); // sens inverse

  // LOT 63 — Bascule vers la vraie sphère 3D si activée. Le reste du
  // composant (rendu SVG) sert de version par défaut et de filet de
  // sécurité (aperçus, Mode Éco, ou si le rendu 3D n'est pas activé).
  if (rendu3D) {
    return <KiraOrb3D size={size} color={couleurFinale} />;
  }

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

      {/* LOT 62 — Particule en orbite n°1 (sens horaire, proche) */}
      {!modeEco && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: orbite1Deg }] }]}>
          <View style={{
            position: 'absolute', top: -size * 0.04, left: '50%', marginLeft: -size * 0.035,
            width: size * 0.07, height: size * 0.07, borderRadius: size * 0.07,
            backgroundColor: CRISTAL_DEGRADE[0],
            shadowColor: CRISTAL_DEGRADE[0], shadowOpacity: 0.9, shadowRadius: size * 0.08, elevation: 4,
          }} />
        </Animated.View>
      )}

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
          {/* Reflet gloss fixe en haut (base du volume) */}
          <Ellipse
            cx={cx - size * 0.08} cy={cy - size * 0.22}
            rx={size * 0.22} ry={size * 0.13}
            fill="white" fillOpacity={0.22}
          />
          {/* LOT 62 — reflet mobile : simule une lumière qui tourne sur la
              surface de la sphère, pour un vrai effet de volume/3D */}
          {!modeEco && (
            <AnimatedEllipse
              cx={lumiereCx} cy={lumiereCy}
              rx={size * 0.12} ry={size * 0.08}
              fill="white" fillOpacity={lumiereOpacite}
            />
          )}
          {/* Petite étincelle facette cristal (bas-droite) */}
          <Circle
            cx={cx + size * 0.2} cy={cy + size * 0.18}
            r={size * 0.04}
            fill={CRISTAL_DEGRADE[0]} fillOpacity={0.8}
          />
        </Svg>
      </Animated.View>

      {/* LOT 62 — Anneau d'énergie fin, tourne toujours (même les icônes
          "pulse" qui ne tournaient pas du tout auparavant) */}
      {!modeEco && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: anneauRotationDeg }] }]}>
          <Svg width={size} height={size}>
            <Circle
              cx={cx} cy={cy} r={r - size * 0.03}
              fill="none"
              stroke={CRISTAL_DEGRADE[1]}
              strokeWidth={size * 0.012}
              strokeOpacity={0.55}
              strokeDasharray={`${size * 0.15}, ${size * 0.22}`}
            />
          </Svg>
        </Animated.View>
      )}

      {/* LOT 62 — Particule en orbite n°2 (sens antihoraire, plus loin) */}
      {!modeEco && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: orbite2Deg }] }]}>
          <View style={{
            position: 'absolute', bottom: -size * 0.02, left: '50%', marginLeft: -size * 0.025,
            width: size * 0.05, height: size * 0.05, borderRadius: size * 0.05,
            backgroundColor: '#FFD700',
            shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: size * 0.06, elevation: 4,
          }} />
        </Animated.View>
      )}

      {/* Étincelle dorée qui clignote (angle haut-droit comme dans le K) */}
      <Animated.View style={{
        position: 'absolute',
        top: size * 0.04,
        right: size * 0.06,
        opacity: etincelle,
      }}>
        <Text style={{ fontSize: size * 0.14, color: '#FFD700' }}>✦</Text>
      </Animated.View>

      {/* LOT 62 — Emoji réduit à un détail discret et lumineux, plutôt
          qu'un gros dessin plat qui écrasait la sphère en dessous. Un
          halo doux derrière lui simule une petite gravure lumineuse. */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{
          width: size * 0.34, height: size * 0.34, borderRadius: size * 0.34,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{
            fontSize: emojiSize ? emojiSize * 0.6 : size * 0.24,
            opacity: 0.85,
            textAlign: 'center',
          }}>{config.emoji}</Text>
        </View>
      </View>
    </View>
  );
}
