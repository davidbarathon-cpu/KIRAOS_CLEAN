// ═══════════════════════════════════════════
//  MINUTEURSCREEN.JS — Module Minuteur / Pomodoro (lot 71)
//  Repris du prototype web (ModTimer), jamais porté jusqu'ici.
//  3 modes (Pomodoro / Courte pause / Longue pause), anneau de
//  progression, compteur de sessions du jour. Une notification est
//  programmée au démarrage pour prévenir même si le téléphone est
//  verrouillé ou l'app en arrière-plan, et annulée si on réinitialise
//  avant la fin (même logique que la confirmation Géo-Kira, lot 66).
// ═══════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, ProgressRing } from '../components/Shared';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';
import { enregistrerSession, getStatistiques } from '../utils/minuteurHistorique';
import { programmerNotificationDansSecondes, annulerNotifications } from '../utils/notifications';

const MODES = [
  { id: 'pomodoro', label: '🍅 Pomodoro', minutes: 25, couleur: PALETTE.pink },
  { id: 'courte', label: '☕ Courte pause', minutes: 5, couleur: PALETTE.teal },
  { id: 'longue', label: '🧘 Longue pause', minutes: 15, couleur: PALETTE.violet },
];

function formatTemps(secondes) {
  const m = String(Math.floor(secondes / 60)).padStart(2, '0');
  const s = String(secondes % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function MinuteurScreen({ navigation }) {
  const theme = useKiraTheme();
  const [modeId, setModeId] = useState('pomodoro');
  const [secondesRestantes, setSecondesRestantes] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ pomodorosAujourdhui: 0, minutesSemaine: 0 });
  const intervalRef = useRef(null);
  const notifIdRef = useRef(null);

  const mode = MODES.find(m => m.id === modeId) || MODES[0];
  const secondesTotal = mode.minutes * 60;

  const chargerStats = useCallback(() => { getStatistiques().then(setStats); }, []);
  useFocusEffect(useCallback(() => { chargerStats(); }, [chargerStats]));

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const changerMode = nouveauModeId => {
    stopper(false);
    setModeId(nouveauModeId);
    const nouveauMode = MODES.find(m => m.id === nouveauModeId);
    setSecondesRestantes(nouveauMode.minutes * 60);
  };

  const demarrer = async () => {
    setRunning(true);
    // Notification de secours programmée dès le départ, pour le cas où l'app
    // passe en arrière-plan ou le téléphone se verrouille pendant la session.
    const id = await programmerNotificationDansSecondes(
      `${mode.label} terminé !`,
      "Ta session est terminée — bravo, prends un instant avant d'enchaîner.",
      secondesRestantes,
      { type: 'minuteur', mode: modeId }
    );
    notifIdRef.current = id;

    intervalRef.current = setInterval(() => {
      setSecondesRestantes(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          terminerSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const pauser = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    // La session n'est pas allée à son terme : la notif de secours ne doit
    // plus se déclencher plus tard pour une session qu'on a mise en pause.
    if (notifIdRef.current) {
      annulerNotifications(notifIdRef.current).catch(() => {});
      notifIdRef.current = null;
    }
  };

  const stopper = (reinitialiserTemps = true) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    if (notifIdRef.current) {
      annulerNotifications(notifIdRef.current).catch(() => {});
      notifIdRef.current = null;
    }
    if (reinitialiserTemps) setSecondesRestantes(secondesTotal);
  };

  const terminerSession = async () => {
    setRunning(false);
    notifIdRef.current = null; // la notif s'est déclenchée normalement, rien à annuler
    await enregistrerSession(modeId, mode.minutes);
    chargerStats();
    setSecondesRestantes(secondesTotal);
  };

  const toggle = () => (running ? pauser() : demarrer());

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => { stopper(false); navigation.goBack(); }} />
        <Text style={styles.headerTitle}>⏱️ Minuteur</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.modesRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => changerMode(m.id)}
              style={[
                styles.modeBtn,
                { borderColor: modeId === m.id ? m.couleur : 'rgba(255,255,255,0.08)', backgroundColor: modeId === m.id ? m.couleur + '22' : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 11, color: modeId === m.id ? m.couleur : '#888899', fontWeight: modeId === m.id ? '700' : '400' }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.ringWrap}>
          <ProgressRing value={secondesTotal - secondesRestantes} max={secondesTotal} color={mode.couleur} size={220} label={formatTemps(secondesRestantes)} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => stopper(true)} style={styles.resetBtn}>
            <Text style={{ fontSize: 20, color: '#888899' }}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggle} style={[styles.playBtn, { backgroundColor: running ? 'rgba(255,101,132,0.18)' : mode.couleur }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: running ? PALETTE.pink : '#000' }}>{running ? '⏸ Pause' : '▶ Démarrer'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.pomodorosAujourdhui}</Text>
            <Text style={styles.statLabel}>Pomodoros aujourd'hui</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.minutesSemaine}</Text>
            <Text style={styles.statLabel}>Minutes cette semaine</Text>
          </View>
        </View>

        <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
          <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
          <Text style={styles.coachText}>
            La technique Pomodoro : 25 minutes de concentration totale, puis une vraie pause.
            Après 4 pomodoros, prends une pause longue — ton cerveau te remerciera.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 20, alignItems: 'center' },
  modesRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 28 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  ringWrap: { marginBottom: 28 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  resetBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { paddingHorizontal: 34, paddingVertical: 15, borderRadius: 99, alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 13, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: '#888899', marginTop: 4, textAlign: 'center' },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1, width: '100%' },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
});
