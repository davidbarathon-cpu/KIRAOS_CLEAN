// ═══════════════════════════════════════════
//  WIDGETUPDATER.JS — Widget Android "Kira Maxi" (lot 41)
//  Point d'entrée unique pour :
//  1) construire l'instantané de données à afficher dans le widget
//     (getKiraWidgetSnapshot — utilisé par l'app ET par le widget lui-même)
//  2) mettre en cache la météo pour que le widget puisse l'afficher
//     sans avoir à faire son propre appel réseau (cacherMeteoPourWidget)
//  3) demander à Android de redessiner le widget tout de suite,
//     depuis l'app quand des données changent (refreshKiraWidget)
//
//  IMPORTANT : le widget tourne dans un contexte "headless" (sans écran
//  ouvert), donc on évite volontairement d'importer kiraBrain.js ou les
//  écrans (trop de dépendances en cascade) — la logique d'humeur de Kira
//  est dupliquée ici en version simplifiée. Si tu fais évoluer les règles
//  dans kiraBrain.js (analyzeContext), pense à reporter le changement ici.
// ═══════════════════════════════════════════

import { Platform } from 'react-native';

import { getData, setData } from './storage';

// Même liste que celle de HomeScreen.js (dupliquée volontairement, voir
// note ci-dessus) — garder les deux synchronisées si tu ajoutes un dicton.
const DICTONS = [
  { t: 'La musique est la sténographie des émotions.', a: 'Tolstoï' },
  { t: 'Chaque matin est une nouvelle chance de recommencer.', a: 'Proverbe' },
  { t: "La créativité, c'est l'intelligence qui s'amuse.", a: 'Albert Einstein' },
  { t: 'Un accord de guitare bien joué vaut mille mots.', a: 'Sagesse musicale' },
  { t: "Chanter, c'est prier deux fois.", a: 'Saint Augustin' },
];

/**
 * Construit l'instantané de données affiché par le widget.
 * Utilisé à la fois par l'app (refreshKiraWidget) et par le widget
 * lui-même quand Android le redessine en arrière-plan (widgetTaskHandler).
 */
export async function getKiraWidgetSnapshot() {
  const [profil, sante, agenda, meteoCache] = await Promise.all([
    getData('profil'),
    getData('sante'),
    getData('agenda'),
    getData('widget_meteo'),
  ]);

  const now = new Date();
  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const s = sante || {};
  const p = profil || {};
  const h = now.getHours();
  const list = agenda || [];
  const soon = list.filter(e => {
    const eh = parseInt(e.h, 10);
    return eh >= h && eh <= h + 2;
  }).length;

  let kiraState = 'flow';
  if (soon >= 2 || s.fc > 90) kiraState = 'rush';
  else if (h >= 20 || s.som < 6) kiraState = 'recovery';

  const prochain = list.find(e => parseInt(e.h, 10) >= h) || null;
  const dicton = DICTONS[now.getDate() % DICTONS.length];

  return {
    heure,
    date,
    kiraState,
    sante: {
      pas: s.pas || 0, oP: p.pasObj || s.oP || 10000,
      eau: s.eau || 0, oEau: p.eauObj || s.oEau || 2.5,
      som: s.som || 0, oSom: p.sleepObj || s.oSom || 8,
    },
    prochainEvenement: prochain ? { heure: prochain.h, titre: (prochain.t || '').slice(0, 40) } : null,
    meteo: meteoCache || { temp: null, icon: '⛅' },
    dicton: { t: (dicton.t || '').slice(0, 90) },
  };
}

/**
 * À appeler depuis MeteoScreen (ou HomeScreen) juste après un appel météo
 * réussi, pour que le widget affiche une donnée réelle récente sans avoir
 * à interroger l'API météo lui-même (plus robuste, plus rapide, économise
 * des appels API).
 */
export async function cacherMeteoPourWidget(meteoData) {
  if (!meteoData) return;
  await setData('widget_meteo', {
    temp: meteoData.temp ?? null,
    icon: meteoData.icon || '⛅',
  });
}

/**
 * Demande à Android de redessiner le widget "Kira Maxi" tout de suite,
 * avec les données actuelles. Ne fait rien sur iOS (widgets natifs
 * Android uniquement) ni si l'utilisateur n'a pas encore ajouté le
 * widget sur son écran d'accueil (auquel cas widgetNotFound est appelé
 * silencieusement par la librairie).
 */
export async function refreshKiraWidget() {
  if (Platform.OS !== 'android') return;

  try {
    // Imports différés : si jamais le module natif n'est pas encore
    // compilé (ex: juste après avoir ajouté la dépendance, avant le
    // premier build), on ne casse pas le reste de l'app.
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { KiraMaxiWidget } = require('../widget/KiraMaxiWidget');

    const data = await getKiraWidgetSnapshot();

    requestWidgetUpdate({
      widgetName: 'KiraMaxi',
      renderWidget: () => <KiraMaxiWidget data={data} />,
      widgetNotFound: () => {
        // Aucun widget "Kira OS — Maxi" sur l'écran d'accueil pour
        // l'instant — rien à faire, ce n'est pas une erreur.
      },
    });
  } catch (e) {
    console.warn('Erreur refreshKiraWidget', e);
  }
}
