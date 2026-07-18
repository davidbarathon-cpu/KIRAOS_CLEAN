// ═══════════════════════════════════════════
//  GUITARESCREEN.JS — Module Guitare & Chant
//  Exercices, métronome, suivi de progression
// ═══════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import ExportPdfModal from '../components/ExportPdfModal';
import { BackButton, Chip, SectionLabel } from '../components/Shared';
import { enregistrerSession, getProgression, getStatistiquesGlobales } from '../utils/guitareProgression';
import { getDefiDuJour, marquerDefiReleve } from '../utils/defisCreatifs';
import { getTheme, PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

// Données des séries d'exercices (guitare + chant)
const SERIES_GUITARE = [
  {
    id: 'gammes', t: 'Gammes & Modes', i: '🎼', c: PALETTE.orange, diff: 'Fondamental',
    exos: [
      { n: 'Pentatonique mineure', bpm: 80, d: '10min', tab: 'e|--5-8-------|\nB|----5-8-----|\nG|------5-7---|\nD|--------5-7-|\nA|--5-7-------|\nE|--5-8-------|', conseil: 'Métronome indispensable. Commence à 60 BPM et monte progressivement.' },
      { n: 'Gamme Do majeur', bpm: 70, d: '8min', tab: 'e|----------0-1-3-|\nB|------0-1-3-----|\nG|--0-2-3---------|', conseil: 'Alternate picking strict : haut-bas-haut-bas.' },
    ],
  },
  {
    id: 'accords', t: 'Accords & Voicings', i: '🎵', c: PALETTE.teal, diff: 'Intermédiaire',
    exos: [
      { n: 'Accords enrichis', bpm: 60, d: '10min', tab: 'Cadd9: x32033\nDadd9: xx0230', conseil: 'Ces voicings sonnent plus riches que les accords de base.' },
      { n: 'Barré F', bpm: 55, d: '15min', tab: 'F: 133211', conseil: 'Pouce derrière le manche, patience — ça vient !' },
    ],
  },
  {
    id: 'rythme', t: 'Rythme & Groove', i: '🥁', c: PALETTE.pink, diff: 'Fondamental',
    exos: [
      { n: 'Strumming pop/rock', bpm: 90, d: '10min', tab: '↓ . ↓ ↑ ↑ . ↓ ↑', conseil: 'La main droite doit toujours être en mouvement.' },
    ],
  },
];

const SERIES_CHANT = [
  {
    id: 'respiration', t: 'Respiration & Soutien', i: '🌬️', c: PALETTE.violet, diff: 'Fondamental',
    exos: [
      { n: 'Respiration diaphragmatique', bpm: 0, d: '10min', tab: '1. Allongé, main sur le ventre\n2. Inspire en gonflant le ventre\n3. Expire lentement sur 8 temps\n4. Répète 10 fois', conseil: "C'est la base de tout ! Sans soutien, pas de voix." },
    ],
  },
  {
    id: 'justesse', t: 'Justesse & Intonation', i: '🎯', c: PALETTE.teal, diff: 'Fondamental',
    exos: [
      { n: 'Sirènes vocales', bpm: 0, d: '5min', tab: 'Glisse de ton grave à ton aigu\nen douceur (ouh...), 3 passages.', conseil: 'Permet de trouver les résonateurs.' },
    ],
  },
];

export default function GuitareScreen({ navigation }) {
  const theme = useKiraTheme();
  const [tab, setTab] = useState('guitare'); // 'guitare' | 'chant'
  const [serieIdx, setSerieIdx] = useState(null);
  const [exoIdx, setExoIdx] = useState(null);
  const [bpm, setBpm] = useState(80);
  const [metroOn, setMetroOn] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [vueOnglet, setVueOnglet] = useState('series'); // 'series' | 'progression'
  const [progressionData, setProgressionData] = useState([]);
  const [statsGlobales, setStatsGlobales] = useState(null);
  const [defi, setDefi] = useState(null);
  const [defiChargement, setDefiChargement] = useState(false);
  const debutSessionRef = useRef(null);
  const metroRef = useRef(null);
  // Le clic du métronome : un seul lecteur, réutilisé à chaque tick via
  // seekTo(0) + play() — expo-audio ne réinitialise pas automatiquement la
  // position après la fin de la lecture. On évite volontairement d'utiliser
  // un second son pour le premier temps de la mesure : sur Android, lancer
  // play() sur un AudioPlayer met en pause les autres AudioPlayer en cours,
  // ce qui créerait des coupures audibles avec deux lecteurs simultanés.
  const clicMetronome = useAudioPlayer(require('../assets/sounds/metronome_clic.wav'));

  const series = tab === 'guitare' ? SERIES_GUITARE : SERIES_CHANT;

  /**
   * Arrête le scheduler du métronome, quelle que soit la façon dont il a
   * été démarré (setTimeout récursif — voir demarrerMetroPrecis). Centralisé
   * ici pour que les 4 endroits qui doivent arrêter le métronome (bouton
   * stop, changement d'exercice, retour en arrière, démontage du composant)
   * utilisent tous le même point d'arrêt fiable. Déclarée avant le premier
   * useEffect ci-dessous, qui en a besoin dans sa fonction de nettoyage.
   */
  const arreterMetro = () => {
    if (metroRef.current) {
      clearTimeout(metroRef.current);
      metroRef.current = null;
    }
  };

  // ── Métronome avec son réel (expo-audio) ──
  useEffect(() => {
    return () => {
      arreterMetro();
    };
  }, []);

  useEffect(() => {
    if (vueOnglet === 'progression') {
      chargerProgression();
    }
  }, [vueOnglet]);

  useEffect(() => {
    chargerDefi();
  }, [tab]);

  const chargerDefi = async (forcerNouveau = false) => {
    setDefiChargement(true);
    const d = await getDefiDuJour(tab, forcerNouveau);
    setDefi(d);
    setDefiChargement(false);
  };

  const marquerReleve = async () => {
    await marquerDefiReleve(tab);
    setDefi(d => ({ ...d, releve: true }));
  };

  const chargerProgression = async () => {
    const [prog, stats] = await Promise.all([getProgression(), getStatistiquesGlobales()]);
    setProgressionData(prog);
    setStatsGlobales(stats);
  };

  /**
   * CORRECTIF LOT 39 : remplace setInterval par un scheduler auto-correctif.
   * setInterval accumule une dérive à chaque tick (le thread JS de React
   * Native peut être ponctuellement retardé par le rendu UI, le garbage
   * collector, etc.) — c'est documenté comme un défaut connu et explique
   * exactement le symptôme observé ("le métronome accélère puis ralentit").
   *
   * La technique ici calcule le temps réel écoulé depuis le DÉBUT du
   * métronome (pas depuis le tick précédent), et programme chaque
   * setTimeout suivant pour viser le bon instant théorique, en compensant
   * activement tout retard accumulé plutôt que de le laisser s'additionner.
   */
  const demarrerMetroPrecis = bpmCible => {
    const intervalleMs = 60000 / bpmCible;
    const debut = Date.now();
    let tick = 0;

    const jouerEtReprogrammer = () => {
      clicMetronome.seekTo(0);
      clicMetronome.play();
      tick += 1;

      // Calcule quand le PROCHAIN tick théorique devrait se produire par
      // rapport au début (pas par rapport à "maintenant"), pour ne jamais
      // accumuler de dérive sur la durée d'une session.
      const prochainTickTheorique = debut + tick * intervalleMs;
      const delaiCorrige = Math.max(0, prochainTickTheorique - Date.now());

      metroRef.current = setTimeout(jouerEtReprogrammer, delaiCorrige);
    };

    metroRef.current = setTimeout(jouerEtReprogrammer, intervalleMs);
  };

  const toggleMetro = () => {
    if (metroOn) {
      arreterMetro();
      setMetroOn(false);
      enregistrerSiSessionValide();
    } else {
      debutSessionRef.current = Date.now();
      demarrerMetroPrecis(bpm);
      setMetroOn(true);
    }
  };

  /**
   * Enregistre la session en cours si elle a duré au moins 15 secondes
   * (seuil minimal pour éviter d'enregistrer un simple test du bouton).
   * Appelée à l'arrêt du métronome ou en quittant l'écran d'exercice.
   */
  const enregistrerSiSessionValide = async () => {
    if (!debutSessionRef.current || serieIdx === null || exoIdx === null) return;
    const dureeMs = Date.now() - debutSessionRef.current;
    const dureeMinutes = Math.round(dureeMs / 60000);
    debutSessionRef.current = null;

    if (dureeMs < 15000) return; // trop court, probablement un essai du bouton

    const s = series[serieIdx];
    const e = s.exos[exoIdx];
    await enregistrerSession(e.n, tab, bpm, e.bpm, Math.max(dureeMinutes, 1));
  };

  const resetNav = () => {
    setSerieIdx(null);
    setExoIdx(null);
    setMetroOn(false);
    arreterMetro();
  };

  // ── Vue détail d'un exercice ──
  if (serieIdx !== null && exoIdx !== null) {
    const s = series[serieIdx];
    const e = s.exos[exoIdx];
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => { if (metroOn) { arreterMetro(); setMetroOn(false); enregistrerSiSessionValide(); } setExoIdx(null); }} />
          <Text style={styles.headerTitle} numberOfLines={1}>{e.n}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <View style={[styles.conseilBox, { borderLeftColor: s.c }]}>
            <Text style={styles.conseilLabel}>🌟 Kira conseille</Text>
            <Text style={styles.conseilText}>{e.conseil}</Text>
          </View>

          <View style={[styles.tabBox, { borderColor: s.c + '33' }]}>
            <Text style={styles.tabText}>{e.tab}</Text>
          </View>

          {e.bpm > 0 && (
            <View style={styles.metroBox}>
              <SectionLabel>Métronome</SectionLabel>
              <View style={styles.bpmRow}>
                <Text style={[styles.bpmValue, { color: s.c }]}>{bpm}</Text>
                <Text style={styles.bpmUnit}>BPM</Text>
              </View>
              <View style={styles.bpmPresets}>
                {[60, 80, 100, 120, 140].map(b => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => setBpm(b)}
                    style={[
                      styles.bpmBtn,
                      { borderColor: bpm === b ? s.c : 'rgba(255,255,255,0.08)', backgroundColor: bpm === b ? s.c + '22' : 'transparent' },
                    ]}
                  >
                    <Text style={{ color: bpm === b ? s.c : '#666677', fontSize: 11 }}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={toggleMetro}
                style={[
                  styles.metroBtn,
                  { backgroundColor: metroOn ? 'rgba(255,101,132,0.15)' : s.c + '18', borderColor: metroOn ? PALETTE.pink + '44' : s.c + '44' },
                ]}
              >
                <Text style={{ color: metroOn ? PALETTE.pink : s.c, fontWeight: '600', fontSize: 13 }}>
                  {metroOn ? '⏹ Arrêter le métronome' : '▶ Lancer le métronome'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Vue liste des exercices d'une série ──
  if (serieIdx !== null) {
    const s = series[serieIdx];
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => setSerieIdx(null)} />
          <Text style={styles.headerTitle}>{s.t}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {s.exos.map((e, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.exoCard, { borderColor: s.c + '22' }]}
              onPress={() => { setExoIdx(i); setBpm(e.bpm || 80); }}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.exoTitle}>{e.n}</Text>
                <Text style={styles.exoSub}>{e.d}{e.bpm > 0 ? ` · ${e.bpm} BPM cible` : ' · Technique'}</Text>
              </View>
              <Text style={{ color: s.c, fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Vue principale : liste des séries ──
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🎸 Guitare & 🎤 Chant</Text>
        <TouchableOpacity onPress={() => setShowExport(true)} style={styles.exportBtn}>
          <Text style={{ fontSize: 13 }}>📄 Exporter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabBtn, { backgroundColor: tab === 'guitare' ? PALETTE.orange : PALETTE.orange + '22' }]}
          onPress={() => { setTab('guitare'); resetNav(); }}
        >
          <Text style={{ color: tab === 'guitare' ? '#000' : '#aaa', fontWeight: '700' }}>🎸 Guitare</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, { backgroundColor: tab === 'chant' ? PALETTE.violet : PALETTE.violet + '22' }]}
          onPress={() => { setTab('chant'); resetNav(); }}
        >
          <Text style={{ color: tab === 'chant' ? '#000' : '#aaa', fontWeight: '700' }}>🎤 Chant</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sousOngletsRow}>
        <TouchableOpacity onPress={() => setVueOnglet('series')} style={[styles.sousOnglet, vueOnglet === 'series' && { borderBottomColor: PALETTE.orange, borderBottomWidth: 2 }]}>
          <Text style={{ color: vueOnglet === 'series' ? '#fff' : '#666677', fontSize: 12, fontWeight: vueOnglet === 'series' ? '600' : '400' }}>Exercices</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setVueOnglet('progression')} style={[styles.sousOnglet, vueOnglet === 'progression' && { borderBottomColor: PALETTE.orange, borderBottomWidth: 2 }]}>
          <Text style={{ color: vueOnglet === 'progression' ? '#fff' : '#666677', fontSize: 12, fontWeight: vueOnglet === 'progression' ? '600' : '400' }}>📊 Progression</Text>
        </TouchableOpacity>
      </View>

      {vueOnglet === 'series' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 60 }}>
          <View style={[styles.kiraPlanBox, { borderColor: PALETTE.orange + '40' }]}>
            <Text style={[styles.kiraPlanLabel, { color: PALETTE.orange }]}>🌟 Plan Kira pour aujourd'hui :</Text>
            <Text style={styles.kiraPlanText}>
              1. Échauffement 5min{'\n'}
              2. Pentatonique 80 BPM — 10min{'\n'}
              3. Accords enrichis — 10min{'\n'}
              4. Vocalises — 5min
            </Text>
          </View>

          {defi && (
            <View style={[styles.defiBox, { borderColor: PALETTE.magenta + '40', backgroundColor: PALETTE.magenta + '0d' }]}>
              <View style={styles.defiHeader}>
                <Text style={[styles.defiLabel, { color: PALETTE.magenta }]}>🎲 Défi créatif du jour</Text>
                <TouchableOpacity onPress={() => chargerDefi(true)} disabled={defiChargement}>
                  <Text style={{ color: PALETTE.magenta, fontSize: 13 }}>🔄</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.defiTexte}>{defi.texte}</Text>
              {defi.releve ? (
                <View style={styles.defiReleveBadge}>
                  <Text style={{ color: PALETTE.green, fontSize: 11, fontWeight: '700' }}>✅ Défi relevé aujourd'hui !</Text>
                </View>
              ) : (
                <TouchableOpacity style={[styles.defiBtn, { backgroundColor: PALETTE.magenta }]} onPress={marquerReleve}>
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>Je l'ai relevé !</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {series.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.serieCard, { borderColor: s.c + '22' }]}
              onPress={() => { setSerieIdx(i); setExoIdx(null); }}
              activeOpacity={0.85}
            >
              <View style={[styles.serieIcon, { backgroundColor: s.c + '20' }]}>
                <Text style={{ fontSize: 19 }}>{s.i}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serieTitle}>{s.t}</Text>
                <Text style={styles.serieSub}>{s.exos.length} exercice{s.exos.length > 1 ? 's' : ''} · {s.diff}</Text>
              </View>
              <Chip label={s.diff} color={s.c} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 60 }}>
          {statsGlobales && (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}><Text style={styles.statValue}>{statsGlobales.streak}</Text><Text style={styles.statLabel}>jours de suite 🔥</Text></View>
              <View style={styles.statBox}><Text style={styles.statValue}>{statsGlobales.minutesSemaine}</Text><Text style={styles.statLabel}>min cette semaine</Text></View>
              <View style={styles.statBox}><Text style={styles.statValue}>{statsGlobales.totalSessions}</Text><Text style={styles.statLabel}>sessions totales</Text></View>
            </View>
          )}

          <SectionLabel style={{ marginTop: 8 }}>Progression par exercice</SectionLabel>
          {progressionData.filter(p => p.type === tab).length === 0 ? (
            <View style={styles.emptyProgressionBox}>
              <Text style={styles.emptyProgressionText}>
                Aucune session enregistrée encore. Lance le métronome sur un exercice et
                pratique au moins 15 secondes — ta progression apparaîtra ici automatiquement !
              </Text>
            </View>
          ) : (
            progressionData.filter(p => p.type === tab).map((p, i) => {
              const pct = p.bpmObjectif ? Math.min(Math.round((p.bpmActuel / p.bpmObjectif) * 100), 100) : 0;
              return (
                <View key={i} style={styles.progressionCard}>
                  <View style={styles.progressionHeader}>
                    <Text style={styles.progressionExo}>{p.exercice}</Text>
                    <Text style={styles.progressionBpm}>{p.bpmActuel} / {p.bpmObjectif || '-'} BPM</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: PALETTE.orange }]} />
                  </View>
                  <View style={styles.progressionFooter}>
                    <Text style={styles.progressionMeta}>{p.nbSessions} session{p.nbSessions > 1 ? 's' : ''}</Text>
                    <Text style={styles.progressionMeta}>Dernière : {p.derniereSession}</Text>
                  </View>
                </View>
              );
            })
          )}

          <View style={[styles.coachBoxProg, { borderColor: PALETTE.orange + '30' }]}>
            <Text style={[styles.coachLabelProg, { color: PALETTE.violet }]}>🌟 Kira</Text>
            <Text style={styles.coachTextProg}>
              Chaque session que tu pratiques avec le métronome (au moins 15 secondes) est
              enregistrée automatiquement ici. Continue régulièrement pour voir ta
              progression en BPM grimper !
            </Text>
          </View>
        </ScrollView>
      )}

      <ExportPdfModal visible={showExport} onClose={() => setShowExport(false)} type="guitare" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  exportBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabSwitch: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  sousOngletsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, marginTop: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sousOnglet: { paddingVertical: 10, paddingHorizontal: 10 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: '#888899', marginTop: 4, textAlign: 'center' },
  emptyProgressionBox: { padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, marginBottom: 14 },
  emptyProgressionText: { fontSize: 12, color: '#666677', lineHeight: 18, textAlign: 'center' },
  progressionCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  progressionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressionExo: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },
  progressionBpm: { fontSize: 12, color: PALETTE.orange, fontWeight: '700' },
  progressBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 99 },
  progressionFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  progressionMeta: { fontSize: 10, color: '#666677' },
  coachBoxProg: { borderRadius: 12, padding: 13, borderWidth: 1, marginTop: 8, backgroundColor: 'rgba(108,99,255,0.08)' },
  coachLabelProg: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachTextProg: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  tabBtn: { flex: 1, padding: 11, borderRadius: 12, alignItems: 'center' },
  kiraPlanBox: { borderRadius: 14, padding: 13, borderWidth: 1, marginBottom: 16, backgroundColor: 'rgba(255,140,50,0.08)' },
  kiraPlanLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  kiraPlanText: { fontSize: 12, color: '#fff', lineHeight: 19 },
  defiBox: { borderRadius: 14, padding: 13, borderWidth: 1, marginBottom: 16 },
  defiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  defiLabel: { fontSize: 11, fontWeight: '700' },
  defiTexte: { fontSize: 13, color: '#e0e0f0', lineHeight: 19, marginBottom: 10 },
  defiBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  defiReleveBadge: { alignSelf: 'flex-start' },
  serieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
  },
  serieIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serieTitle: { fontWeight: '600', color: '#fff', fontSize: 13 },
  serieSub: { fontSize: 11, color: '#666677', marginTop: 2 },
  exoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
  },
  exoTitle: { fontWeight: '600', color: '#fff', fontSize: 13 },
  exoSub: { fontSize: 11, color: '#666677', marginTop: 2 },
  conseilBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 14, borderLeftWidth: 3 },
  conseilLabel: { fontSize: 11, color: PALETTE.violet, fontWeight: '600', marginBottom: 4 },
  conseilText: { fontSize: 13, color: '#ccc', lineHeight: 19 },
  tabBox: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1 },
  tabText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, color: PALETTE.teal, lineHeight: 20 },
  metroBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 13 },
  bpmRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 8 },
  bpmValue: { fontSize: 34, fontWeight: '800' },
  bpmUnit: { color: '#666677', marginBottom: 6 },
  bpmPresets: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  bpmBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  metroBtn: { padding: 12, borderRadius: 11, borderWidth: 1, alignItems: 'center' },
});
