// ═══════════════════════════════════════════
//  HOMESCREEN.JS — Journal de bord (accueil)
//  MISE À JOUR LOT 5 : Traduction, Musique, Réveil,
//  Domotique + bouton Paramètres maintenant fonctionnel
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Chip, KiraFAB, ModuleCard, ProgressRing, SectionLabel } from '../components/Shared';
import { analyzeContext, generatePredictions } from '../utils/kiraBrain';
import { getData } from '../utils/storage';
import { getTheme, KIRA_STATE_COLORS, KIRA_STATE_LABELS, PALETTE } from '../utils/theme';

const DICTONS = [
  { t: 'La musique est la sténographie des émotions.', a: 'Tolstoï' },
  { t: 'Chaque matin est une nouvelle chance de recommencer.', a: 'Proverbe' },
  { t: "La créativité, c'est l'intelligence qui s'amuse.", a: 'Albert Einstein' },
  { t: 'Un accord de guitare bien joué vaut mille mots.', a: 'Sagesse musicale' },
  { t: 'Chanter, c\'est prier deux fois.', a: 'Saint Augustin' },
];

const METEO_PREVIEW = { temp: 22, icon: '⛅' };

const TOUS_MODULES = [
  { id: 'agenda',     icon: '📅', label: 'Agenda',         desc: 'Mes événements',     color: PALETTE.purple,  screen: 'Agenda' },
  { id: 'sante',      icon: '❤️', label: 'Santé',          desc: 'Activité & bien-être', color: PALETTE.pink,   screen: 'Sante' },
  { id: 'guitare',    icon: '🎸', label: 'Guitare & Chant', desc: 'Exercices musicaux',  color: PALETTE.orange,  screen: 'Guitare' },
  { id: 'cuisine',    icon: '🍳', label: 'Cuisine',         desc: 'Recettes du jour',    color: '#F97316',       screen: 'Cuisine' },
  { id: 'courses',    icon: '🛒', label: 'Courses',         desc: 'Liste de provisions', color: PALETTE.green,   screen: 'Courses' },
  { id: 'meteo',      icon: '⛅', label: 'Météo',           desc: 'Prévisions & lune',   color: PALETTE.blue,    screen: 'Meteo' },
  { id: 'horoscope',  icon: '✨', label: 'Horoscope',       desc: 'Prévisions du jour',  color: PALETTE.magenta, screen: 'Horoscope' },
  { id: 'notes',      icon: '📝', label: 'Notes',           desc: 'Mes pense-bêtes',     color: PALETTE.violet,  screen: 'Notes' },
  { id: 'potager',    icon: '🌱', label: 'Potager',         desc: 'Mon jardin',          color: '#22C55E',       screen: 'Potager' },
  { id: 'parking',    icon: '🅿️', label: 'Parking',        desc: 'Position voiture',    color: PALETTE.cyan,    screen: 'Parking' },
  { id: 'actualites', icon: '📰', label: 'Actualités',      desc: 'News du jour',        color: '#8B78FF',       screen: 'Actualites' },
  { id: 'traduction', icon: '🌍', label: 'Traduction',      desc: 'Traducteur',          color: PALETTE.teal,    screen: 'Traduction' },
  { id: 'musique',    icon: '🎵', label: 'Musique',         desc: 'Lecteur & playlists', color: PALETTE.purple,  screen: 'Musique' },
  { id: 'reveil',     icon: '⏰', label: 'Réveil',          desc: 'Mes alarmes',         color: PALETTE.yellow,  screen: 'Reveil' },
  { id: 'domotique',  icon: '🏠', label: 'Domotique',       desc: 'Maison connectée',    color: '#64748B',       screen: 'Domotique' },
];

export default function HomeScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [sante, setSante] = useState({});
  const [agenda, setAgenda] = useState([]);
  const [kiraState, setKiraState] = useState('flow');
  const [predictions, setPredictions] = useState([]);
  const [dictonIdx] = useState(Math.floor(Math.random() * DICTONS.length));
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [modulesActifs, setModulesActifs] = useState(TOUS_MODULES.map(m => m.id));

  const loadData = useCallback(async () => {
    const [s, a, m] = await Promise.all([
      getData('sante'),
      getData('agenda'),
      getData('modules_actifs'),
    ]);
    setSante(s || {});
    setAgenda(a || []);
    if (m && m.length) setModulesActifs(m);
    const heureStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setKiraState(analyzeContext(a || [], s || {}, heureStr));
    setPredictions(generatePredictions(a || [], s || {}, heureStr));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dicton = DICTONS[dictonIdx];
  const kColor = KIRA_STATE_COLORS[kiraState];
  const kLabel = KIRA_STATE_LABELS[kiraState];

  const modulesAffiches = TOUS_MODULES.filter(m => modulesActifs.includes(m.id));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={theme.accent} />}
      >
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.kiraLabel, { color: kColor }]}>KIRA OS · {kLabel}</Text>
              <Text style={styles.clock}>{heure}</Text>
              <Text style={styles.dateStr}>{dateStr}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.meteoBadge, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '28' }]}
                onPress={() => navigation.navigate('Meteo')}
              >
                <Text style={{ fontSize: 20 }}>{METEO_PREVIEW.icon}</Text>
                <Text style={[styles.meteoTemp, { color: theme.accent }]}>{METEO_PREVIEW.temp}°</Text>
              </TouchableOpacity>
              {/* Bouton Paramètres — maintenant fonctionnel */}
              <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Parametres')}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.stateBar, { backgroundColor: kColor + '15', borderColor: kColor + '30' }]}>
            <View style={[styles.statePulse, { backgroundColor: kColor }]} />
            <Text style={styles.stateText}>
              Kira en mode <Text style={{ color: kColor, fontWeight: '700' }}>{kLabel}</Text>
            </Text>
          </View>

          <View style={styles.ringsRow}>
            {[
              { v: sante.pas || 0, max: sante.oP || 10000, c: PALETTE.blue,   l: `${Math.round((sante.pas || 0) / 1000)}k`, lab: 'Pas' },
              { v: sante.eau || 0, max: sante.oEau || 2.5, c: PALETTE.teal,   l: `${sante.eau || 0}L`,                      lab: 'Eau' },
              { v: sante.cal || 0, max: sante.oCal || 2200, c: PALETTE.orange, l: `${sante.cal || 0}`,                       lab: 'kcal' },
              { v: sante.som || 0, max: sante.oSom || 8,   c: PALETTE.violet, l: `${sante.som || 0}h`,                      lab: 'Sommeil' },
            ].map(r => (
              <View key={r.lab} style={styles.ringItem}>
                <ProgressRing value={r.v} max={r.max} color={r.c} size={50} label={r.l} />
                <Text style={styles.ringLabel}>{r.lab}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* Prédictions Kira */}
          {predictions.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <SectionLabel>🌟 Kira suggère</SectionLabel>
              {predictions.slice(0, 2).map(p => (
                <View key={p.id} style={[styles.predCard, { backgroundColor: p.color + '0f', borderColor: p.color + '2a' }]}>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.predText}>{p.msg}</Text>
                    <TouchableOpacity
                      style={[styles.predBtn, { backgroundColor: p.color }]}
                      onPress={() => setPredictions(predictions.filter(x => x.id !== p.id))}
                    >
                      <Text style={styles.predBtnText}>{p.action}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Dicton */}
          <View style={[styles.dictonCard, { backgroundColor: theme.accent + '0d', borderColor: theme.accent + '22', borderLeftColor: theme.accent }]}>
            <Text style={styles.dictonText}>"{dicton.t}"</Text>
            <Text style={styles.dictonAuthor}>— {dicton.a}</Text>
          </View>

          {/* Agenda preview */}
          <View style={[styles.agendaCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.agendaHeader}>
              <Text style={styles.agendaTitle}>📅 Aujourd'hui — {agenda.length} événement{agenda.length > 1 ? 's' : ''}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
                <Text style={{ fontSize: 10, color: theme.accent }}>Tout voir →</Text>
              </TouchableOpacity>
            </View>
            {agenda.slice(0, 3).map((ev, i) => (
              <View key={ev.id} style={[styles.agendaRow, i < Math.min(agenda.length, 3) - 1 && { marginBottom: 9 }]}>
                <Text style={styles.agendaHeure}>{ev.h}</Text>
                <View style={[styles.agendaDot, { backgroundColor: ev.c }]} />
                <Text style={styles.agendaEvent}>{ev.t}</Text>
                <Chip label={ev.dur} color={ev.c} />
              </View>
            ))}
            {agenda.length === 0 && (
              <Text style={{ color: '#444', fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>
                Aucun événement aujourd'hui.
              </Text>
            )}
          </View>

          {/* Grille modules — filtrée selon les préférences */}
          <SectionLabel style={{ marginTop: 18, marginBottom: 10 }}>Modules ({modulesAffiches.length})</SectionLabel>
          <View style={styles.modulesGrid}>
            {modulesAffiches.map(m => (
              <ModuleCard key={m.id} icon={m.icon} label={m.label} desc={m.desc} color={m.color} theme={theme} onPress={() => navigation.navigate(m.screen)} />
            ))}
          </View>
          <Text style={styles.comingSoon}>
            🎉 Tous les modules du cahier des charges sont créés ! Prochaines étapes : vraies
            connexions API (météo, Google Agenda, actualités), notifications, et le micro
            permanent "Hey Kira".
          </Text>
        </View>
      </ScrollView>

      <KiraFAB color={theme.accent} onPress={() => navigation.navigate('KiraChat')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  kiraLabel: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  clock: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  dateStr: { fontSize: 11, color: '#555566', marginTop: 3, textTransform: 'capitalize' },
  meteoBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  meteoTemp: { fontSize: 13, fontWeight: '800', marginTop: 1 },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  stateBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statePulse: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  stateText: { fontSize: 11, color: '#888899' },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ringItem: { alignItems: 'center' },
  ringLabel: { fontSize: 9, color: '#444455', marginTop: 3 },
  content: { paddingHorizontal: 14 },
  predCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderLeftWidth: 3 },
  predText: { fontSize: 12, color: '#d0d0e0', lineHeight: 18, marginBottom: 8 },
  predBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 },
  predBtnText: { fontSize: 10, fontWeight: '700', color: '#000' },
  dictonCard: { borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderLeftWidth: 3 },
  dictonText: { fontSize: 12, color: '#d0d0e0', fontStyle: 'italic', lineHeight: 18 },
  dictonAuthor: { fontSize: 10, color: '#3a3a55', marginTop: 5 },
  agendaCard: { borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1 },
  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  agendaTitle: { fontSize: 12, fontWeight: '700', color: '#e8e8f8' },
  agendaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agendaHeure: { fontSize: 11, color: '#444455', minWidth: 42 },
  agendaDot: { width: 3, height: 3, borderRadius: 2 },
  agendaEvent: { fontSize: 12, color: '#e0e0f0', flex: 1 },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
