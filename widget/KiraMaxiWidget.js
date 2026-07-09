// ═══════════════════════════════════════════
//  KIRAMAXIWIDGET.JS — Le widget Android plein écran de Kira (lot 41)
//
//  IMPORTANT : ce fichier n'utilise PAS les composants habituels de
//  l'app (View, Text de react-native) mais des composants spéciaux
//  fournis par react-native-android-widget (FlexWidget, TextWidget).
//  Ils ressemblent à du React Native classique mais sont convertis en
//  vraies "RemoteViews" Android, ce qui permet à ce composant de
//  s'afficher sur l'écran d'accueil du téléphone, même app fermée.
//
//  Conséquence pratique : on ne peut PAS réutiliser Shared.js, theme.js
//  (styles trop riches) ni les icônes SVG habituelles ici — ce fichier
//  redéclare une palette de couleurs minimale cohérente avec le thème
//  "cosmos" du reste de l'app.
// ═══════════════════════════════════════════

import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const C = {
  bg: '#05050f',
  border: 'rgba(108,99,255,0.35)',
  accent: '#6C63FF',
  white: '#e8e8f8',
  muted: '#8888aa',
  faint: '#55556a',
  cardBg: 'rgba(255,255,255,0.05)',
  trackBg: 'rgba(255,255,255,0.08)',
};

const KIRA_STATE_COLORS = { rush: '#FF6584', flow: '#6C63FF', recovery: '#43D9AD' };
const KIRA_STATE_LABELS = { rush: '⚡ Rush', flow: '🌊 Flow', recovery: '🌙 Récup' };

// ── Petite barre de progression (pas de SVG possible ici sans complexité
// supplémentaire, une barre horizontale reste lisible et premium) ──
function Bar({ value, max, color, label }) {
  const pct = Math.max(0, Math.min(1, (value || 0) / Math.max(max || 1, 1)));
  return (
    <FlexWidget style={{ flexDirection: 'column', flex: 1, marginRight: 8 }}>
      <TextWidget text={label} style={{ fontSize: 9, color: C.faint, marginBottom: 4 }} />
      <FlexWidget style={{ width: 'match_parent', height: 6, backgroundColor: C.trackBg, borderRadius: 3 }}>
        <FlexWidget style={{ width: `${Math.round(pct * 100)}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/**
 * data attendu (voir utils/widgetUpdater.js → getKiraWidgetSnapshot) :
 * { heure, date, kiraState, sante: {pas,oP,eau,oEau,som,oSom},
 *   prochainEvenement: {heure, titre} | null, meteo: {temp, icon}, dicton: {t} }
 */
export function KiraMaxiWidget({ data }) {
  const d = data || {};
  const kColor = KIRA_STATE_COLORS[d.kiraState] || KIRA_STATE_COLORS.flow;
  const kLabel = KIRA_STATE_LABELS[d.kiraState] || KIRA_STATE_LABELS.flow;
  const s = d.sante || {};
  const meteo = d.meteo || {};

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: C.bg,
        borderRadius: 26,
        borderColor: C.border,
        borderWidth: 1,
        padding: 16,
      }}
    >
      {/* ── Contenu (prend toute la place disponible, pousse le bouton en bas) ── */}
      <FlexWidget style={{ flexDirection: 'column', flex: 1, width: 'match_parent' }}>
        {/* Header : heure/date à gauche, météo à droite */}
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: 'match_parent' }}>
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget text={`KIRA OS · ${kLabel}`} style={{ fontSize: 10, color: kColor, fontWeight: 'bold' }} />
            <TextWidget text={d.heure || '--:--'} style={{ fontSize: 34, color: '#ffffff', fontWeight: 'bold' }} />
            <TextWidget text={d.date || ''} style={{ fontSize: 11, color: C.muted }} />
          </FlexWidget>

          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'kiraosclean://meteo' }}
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(108,99,255,0.14)',
              borderRadius: 16,
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <TextWidget text={meteo.icon || '⛅'} style={{ fontSize: 22 }} />
            <TextWidget
              text={meteo.temp !== null && meteo.temp !== undefined ? `${meteo.temp}°` : '—'}
              style={{ fontSize: 13, color: C.accent, fontWeight: 'bold' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Barres santé */}
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 16 }}>
          <Bar value={s.pas} max={s.oP} color="#4FC3F7" label={`👟 ${s.pas || 0}`} />
          <Bar value={s.eau} max={s.oEau} color="#43D9AD" label={`💧 ${s.eau || 0}L`} />
          <Bar value={s.som} max={s.oSom} color="#A78BFA" label={`😴 ${s.som || 0}h`} />
        </FlexWidget>

        {/* Prochain évènement de l'agenda */}
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'kiraosclean://agenda' }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
            marginTop: 16,
            backgroundColor: C.cardBg,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <TextWidget text="📅" style={{ fontSize: 16, marginRight: 8 }} />
          <TextWidget
            text={d.prochainEvenement ? `${d.prochainEvenement.heure} · ${d.prochainEvenement.titre}` : "Rien de prévu pour l'instant"}
            style={{ fontSize: 12, color: C.white, flex: 1 }}
          />
        </FlexWidget>

        {/* Dicton du jour */}
        <TextWidget
          text={d.dicton?.t ? `"${d.dicton.t}"` : ''}
          style={{ fontSize: 11, color: C.muted, marginTop: 14, fontStyle: 'italic' }}
        />
      </FlexWidget>

      {/* ── Bouton micro : accès instantané à l'écoute rapide de Kira ── */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'kiraosclean://ecoute' }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'match_parent',
          backgroundColor: C.accent,
          borderRadius: 99,
          paddingVertical: 12,
        }}
      >
        <TextWidget text="🎤 Parler à Kira" style={{ fontSize: 13, color: '#ffffff', fontWeight: 'bold' }} />
      </FlexWidget>
    </FlexWidget>
  );
}
