// ═══════════════════════════════════════════
//  USETHEME.JS — Hook du thème actif (lot 52)
//
//  ⚠️ Bug corrigé au lot 52 : 19 écrans sur 20 appelaient
//  `getTheme('cosmos')` en dur, ignorant complètement le thème choisi
//  par l'utilisateur dans Paramètres → Apparence (Cosmos/Aurora/Sunset)
//  ainsi que sa couleur d'accent personnalisée. Le sélecteur de thème
//  ne changeait donc en réalité QUE l'écran Paramètres lui-même,
//  depuis le tout début du projet.
//
//  Ce hook centralise la bonne façon de lire le thème actif — à
//  utiliser à la place de `getTheme('cosmos')` dans tous les écrans.
//  Se réactualise à chaque fois que l'écran reprend le focus, pour
//  qu'un changement de thème dans Paramètres soit immédiatement
//  visible en revenant sur n'importe quel autre écran, sans avoir à
//  relancer l'application.
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getData } from './storage';
import { getTheme } from './theme';

export function useKiraTheme() {
  const [prefs, setPrefs] = useState({});

  useFocusEffect(
    useCallback(() => {
      getData('prefs').then(p => setPrefs(p || {}));
    }, [])
  );

  const themeBase = getTheme(prefs.theme || 'cosmos');
  return { ...themeBase, accent: prefs.accent || themeBase.accent };
}
