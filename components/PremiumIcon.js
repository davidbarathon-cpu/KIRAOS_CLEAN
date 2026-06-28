// ═══════════════════════════════════════════
//  PREMIUMICON.JS — Icône premium "glossy/néon" (lot 38)
//  NOUVEAU : remplace le rendu plat (cercle uni +
//  emoji) par un orbe lumineux avec dégradé radial,
//  halo flou en arrière-plan, reflet "verre" en haut,
//  et anneau lumineux animé — donnant un effet
//  premium/3D simulé, sans aucun moteur 3D réel.
//
//  Construit en SVG pur (react-native-svg, déjà
//  installé) : poids quasi nul, rendu instantané,
//  fonctionne de façon identique sur tout téléphone
//  Android, contrairement à un vrai moteur 3D.
//
//  Réutilisable pour TOUS les modules de l'app — un
//  seul composant, piloté par la couleur et l'emoji
//  de chaque module (déjà définis dans TOUS_MODULES),
//  pas besoin de dessiner une icône différente à la
//  main pour chacun des 13+ modules.
// ═══════════════════════════════════════════

import { useEffect, useId, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * size : taille en pixels du cercle conteneur
 * color : couleur d'accent (vient de PALETTE ou de la couleur du module)
 * emoji : symbole affiché au centre (ex: '📅', '❤️'...)
 * emojiSize : taille de l'emoji (par défaut ~45% de size)
 * animé : si true, un léger halo pulse en continu (à utiliser avec
 *   parcimonie — sur une grille de 13 modules affichés en même temps,
 *   tout animer en permanence serait visuellement fatiguant ; voir
 *   recommandation d'usage dans INSTALLATION.md)
 */
export default function PremiumIcon({ size = 44, color = '#6C63FF', emoji = '⭐', emojiSize, anime = false }) {
  // Identifiant unique par instance du composant : évite toute collision
  // d'id de gradient SVG si deux icônes de la même couleur sont affichées
  // en même temps dans la grille de modules (ce qui arrive régulièrement,
  // certaines couleurs de PALETTE étant réutilisées entre plusieurs modules).
  // useId() génère des ":" qui ne sont pas valides dans un id SVG — nettoyés
  // ici pour ne garder que des caractères alphanumériques.
  const gradientId = `grad${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!anime) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.5, duration: 1600, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anime]);

  // Halo lumineux en arrière-plan : un cercle flou plus grand que l'orbe
  // lui-même, qui donne l'impression de lumière qui irradie. Simulé avec
  // shadowRadius (pas de vrai flou gaussien SVG ici, pour rester léger et
  // compatible avec toutes les versions d'Android sans configuration
  // supplémentaire).
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: size * 0.65,
            top: -size * 0.15,
            left: -size * 0.15,
            backgroundColor: color,
            opacity: anime ? pulse : 0.35,
            shadowColor: color,
          },
        ]}
      />
      <View style={[styles.orbeWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Dégradé radial décalé vers le haut-gauche : simule une
                source de lumière venant d'un coin, donnant l'effet "sphère
                brillante" plutôt qu'un cercle plat. */}
            <RadialGradient id={gradientId} cx="35%" cy="30%" r="75%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="35%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.55" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`url(#${gradientId})`} />
        </Svg>
        {/* Reflet "verre" : un petit arc clair en haut de l'orbe, qui
            simule la réflexion de lumière sur une surface bombée et
            brillante (effet "gloss"). */}
        <View
          style={[
            styles.reflet,
            {
              width: size * 0.55,
              height: size * 0.28,
              borderRadius: size * 0.3,
              top: size * 0.08,
              left: size * 0.18,
            },
          ]}
        />
        <Text style={{ fontSize: emojiSize || size * 0.45, textAlign: 'center' }}>{emoji}</Text>
      </View>
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
