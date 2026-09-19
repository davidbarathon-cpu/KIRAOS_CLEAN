// ═══════════════════════════════════════════
//  USETHEME.JS — Hook du thème actif (lot 52, mode auto lot 88)
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
//
//  LOT 88 — "Thème automatique selon l'heure" : David a demandé un thème
//  jour/nuit automatique. Important à savoir : les 3 thèmes de l'app
//  (Cosmos, Aurora, Sunset — voir utils/theme.js) sont TOUS des thèmes
//  sombres, il n'existe pas de vrai thème clair. En créer un demanderait
//  de revoir les couleurs sur une trentaine d'écrans (texte clair sur
//  fond sombre partout), trop risqué à faire d'un coup. En attendant, le
//  mode auto bascule entre les thèmes sombres EXISTANTS selon l'heure —
//  Cosmos (neutre) le jour, Sunset (tons chauds, plus "veillée") le soir
//  — pour donner cette sensation jour/nuit sans toucher à l'apparence de
//  chaque écran individuellement.
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

  // LOT 88 — en mode auto, ignore le thème choisi manuellement et calcule
  // celui du moment : "jour" de 7h à 19h (Cosmos), "soir/nuit" le reste du
  // temps (Sunset, tons chauds).
  const themeKey = prefs.themeAuto
    ? (() => { const h = new Date().getHours(); return h >= 7 && h < 19 ? 'cosmos' : 'sunset'; })()
    : (prefs.theme || 'cosmos');

  const themeBase = getTheme(themeKey);
  return { ...themeBase, accent: prefs.accent || themeBase.accent };
}
