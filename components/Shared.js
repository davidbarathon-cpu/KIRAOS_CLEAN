// ═══════════════════════════════════════════
//  SHARED.JS — Composants UI réutilisables
//  MISE À JOUR : ModuleCard utilise maintenant
//  une largeur en % pour fonctionner avec
//  flexWrap dans la grille de modules.
// ═══════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { getActiveKiraIcon } from '../utils/apiKeys';
import { PALETTE } from '../utils/theme';
import KiraIcon from './KiraIcon';

// ── Petit libellé de section (style "SLabel" du prototype web) ──
export function SectionLabel({ children, style }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

// ── Badge / Chip coloré ──
export function Chip({ label, color = PALETTE.purple }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Barre de progression horizontale ──
export function ProgressBar({ value, max, color = PALETTE.purple, height = 5 }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[styles.barTrack, { height, borderRadius: height }]}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height,
          backgroundColor: color,
          width: widthAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

// ── Anneau de progression circulaire (SVG) ──
export function ProgressRing({ value, max, color = PALETTE.purple, size = 56, label = '' }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const dashOffset = circ * (1 - pct);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={5}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={5}
        fill="none"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + 4}
        fontSize={size > 50 ? 11 : 9}
        fontWeight="700"
        fill="#fff"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </Svg>
  );
}

// ── Toggle / interrupteur ──
export function Toggle({ value, onChange, color = PALETTE.purple }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onChange(!value)}
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? color : 'rgba(255,255,255,0.1)' },
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          { alignSelf: value ? 'flex-end' : 'flex-start' },
        ]}
      />
    </TouchableOpacity>
  );
}

// ── Carte de module (sur l'écran d'accueil) ──
// IMPORTANT : largeur fixée en % (et non flex:1) pour fonctionner
// correctement à l'intérieur d'un conteneur flexWrap.
export function ModuleCard({ icon, label, desc, color, onPress, theme }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.moduleCard,
        { backgroundColor: theme.surface, borderColor: color + '22' },
      ]}
    >
      <View style={[styles.moduleIconWrap, { backgroundColor: color + '20', borderColor: color + '33' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={styles.moduleLabel}>{label}</Text>
      {desc ? <Text style={styles.moduleDesc}>{desc}</Text> : null}
    </TouchableOpacity>
  );
}

// ── Bouton flottant Kira ──
// Utilise maintenant KiraIcon, qui charge l'icône choisie par l'utilisateur
// dans les Paramètres (étoile, spirale, orbe électrique...) au lieu d'une
// étoile fixe codée en dur.
export function KiraFAB({ onPress, color = PALETTE.purple }) {
  const [iconId, setIconId] = useState('etoile');

  useEffect(() => {
    getActiveKiraIcon().then(setIconId);
  }, []);

  return (
    <View style={styles.fabWrap}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.fabTouch}>
        <KiraIcon size={62} color={color} iconId={iconId} emojiSize={28} />
      </TouchableOpacity>
    </View>
  );
}

// ── Petite icône Kira pour les headers et avatars (taille réduite, pas de FAB) ──
// À utiliser dans les écrans de modules, le chat, etc. pour une présence
// cohérente de Kira partout dans l'app (demande explicite : "la retrouver
// sur toutes les pages").
export function KiraHeaderIcon({ size = 30, color = PALETTE.purple, onPress }) {
  const [iconId, setIconId] = useState('etoile');

  useEffect(() => {
    getActiveKiraIcon().then(setIconId);
  }, []);

  const contenu = <KiraIcon size={size} color={color} iconId={iconId} />;

  if (!onPress) return contenu;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {contenu}
    </TouchableOpacity>
  );
}

// ── Bouton retour simple ──
export function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backBtn} activeOpacity={0.8}>
      <Text style={{ color: '#aaa', fontSize: 15 }}>←</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  barTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  toggleTrack: {
    width: 42,
    height: 23,
    borderRadius: 99,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 17,
    height: 17,
    borderRadius: 99,
    backgroundColor: '#fff',
  },
  moduleCard: {
    width: '47%', // 2 colonnes avec un petit espace (gap:10 du parent)
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 92,
  },
  moduleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e8e8f8',
  },
  moduleDesc: {
    fontSize: 10,
    color: '#555566',
    marginTop: 2,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 28,
    right: 20,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
