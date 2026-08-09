// ═══════════════════════════════════════════
//  MEDITATIONSCREEN.JS — Module Méditation (lot 71)
//  Repris du prototype web (ModMeditation), jamais porté jusqu'ici.
//  5 séances guidées (texte, pas d'audio pour l'instant — voir note de
//  fin de fichier), minuteur simple, suivi du temps total médité.
// ═══════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, ProgressRing, SectionLabel } from '../components/Shared';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';
import { getData, setData } from '../utils/storage';
import { programmerNotificationDansSecondes, annulerNotifications } from '../utils/notifications';

const CLE_HISTORIQUE = 'meditation_historique';

const SEANCES = [
  { id: 'pleine_conscience', nom: 'Pleine conscience', minutes: 5, icon: '🧘', couleur: PALETTE.violet, desc: 'Focus sur la respiration', guide: "Ferme les yeux. Inspire lentement sur 4 temps, retiens 2 temps, expire sur 6 temps. Reviens à ta respiration à chaque fois que ton esprit s'échappe — c'est normal, ce n'est pas un échec." },
  { id: 'relaxation', nom: 'Relaxation profonde', minutes: 10, icon: '🌊', couleur: PALETTE.blue, desc: 'Libérer les tensions', guide: 'Détends chaque partie de ton corps, des pieds à la tête, en marquant une pause sur chaque groupe musculaire. Laisse le poids de ton corps se relâcher complètement.' },
  { id: 'bienveillance', nom: 'Bienveillance envers soi', minutes: 15, icon: '❤️', couleur: PALETTE.pink, desc: 'Compassion et gratitude', guide: "Pense à trois choses pour lesquelles tu es reconnaissant aujourd'hui. Adresse-toi mentalement des mots bienveillants, comme tu le ferais pour un ami proche." },
  { id: 'scan_corporel', nom: 'Scan corporel', minutes: 8, icon: '🔍', couleur: PALETTE.teal, desc: 'Conscience du corps', guide: "Parcours ton corps mentalement, sans rien changer, juste en observant : les points de contact avec le sol, les tensions, la température. Simple curiosité, sans jugement." },
  { id: 'visualisation', nom: 'Visualisation', minutes: 12, icon: '🌸', couleur: PALETTE.magenta, desc: 'Voyage intérieur', guide: "Imagine un lieu où tu te sens complètement en sécurité et apaisé. Détaille-le avec tes 5 sens : ce que tu vois, entends, sens, touches, et même goûtes s'il y a lieu." },
];

function formatTemps(secondes) {
  const m = String(Math.floor(secondes / 60)).padStart(2, '0');
  const s = String(secondes % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function MeditationScreen({ navigation }) {
  const theme = useKiraTheme();
  const [seanceOuverte, setSeanceOuverte] = useState(null);
  const [secondesRestantes, setSecondesRestantes] = useState(0);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ totalMinutes: 0, seancesCount: 0 });
  const intervalRef = useRef(null);
  const notifIdRef = useRef(null);

  const chargerStats = useCallback(async () => {
    const historique = (await getData(CLE_HISTORIQUE)) || [];
    const totalMinutes = historique.reduce((acc, s) => acc + (s.minutes || 0), 0);
    setStats({ totalMinutes, seancesCount: historique.length });
  }, []);

  useFocusEffect(useCallback(() => { chargerStats(); }, [chargerStats]));
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const ouvrirSeance = seance => {
    stopper();
    setSeanceOuverte(seance);
    setSecondesRestantes(seance.minutes * 60);
  };

  const fermerSeance = () => {
    stopper();
    setSeanceOuverte(null);
  };

  const demarrer = async () => {
    setRunning(true);
    const id = await programmerNotificationDansSecondes(
      `🧘 ${seanceOuverte.nom} terminée`,
      'Prends un instant avant de reprendre ta journée.',
      secondesRestantes,
      { type: 'meditation', seance: seanceOuverte.id }
    );
    notifIdRef.current = id;
    intervalRef.current = setInterval(() => {
      setSecondesRestantes(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          terminerSeance();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const pauser = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    if (notifIdRef.current) { annulerNotifications(notifIdRef.current).catch(() => {}); notifIdRef.current = null; }
  };

  const stopper = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    if (notifIdRef.current) { annulerNotifications(notifIdRef.current).catch(() => {}); notifIdRef.current = null; }
  };

  const terminerSeance = async () => {
    setRunning(false);
    notifIdRef.current = null;
    const historique = (await getData(CLE_HISTORIQUE)) || [];
    const misAJour = [...historique, { id: Date.now(), seance: seanceOuverte.id, minutes: seanceOuverte.minutes, date: new Date().toISOString() }].slice(-200);
    await setData(CLE_HISTORIQUE, misAJour);
    chargerStats();
  };

  const toggle = () => (running ? pauser() : demarrer());

  if (seanceOuverte) {
    const s = seanceOuverte;
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={fermerSeance} />
          <Text style={styles.headerTitle} numberOfLines={1}>{s.icon} {s.nom}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.ringWrap}>
            <ProgressRing value={s.minutes * 60 - secondesRestantes} max={s.minutes * 60} color={s.couleur} size={220} label={formatTemps(secondesRestantes)} />
          </View>
          <TouchableOpacity onPress={toggle} style={[styles.playBtn, { backgroundColor: running ? 'rgba(255,101,132,0.18)' : s.couleur }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: running ? PALETTE.pink : '#000' }}>{running ? '⏸ Pause' : '▶ Commencer'}</Text>
          </TouchableOpacity>

          <View style={[styles.guideBox, { borderColor: s.couleur + '30', backgroundColor: s.couleur + '0d' }]}>
            <Text style={[styles.guideLabel, { color: s.couleur }]}>Guide</Text>
            <Text style={styles.guideText}>{s.guide}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🧘 Méditation</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes méditées</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.seancesCount}</Text>
            <Text style={styles.statLabel}>Séances terminées</Text>
          </View>
        </View>

        <SectionLabel style={{ marginTop: 6 }}>Séances</SectionLabel>
        {SEANCES.map(s => (
          <TouchableOpacity key={s.id} onPress={() => ouvrirSeance(s)} activeOpacity={0.85} style={[styles.seanceCard, { borderColor: s.couleur + '22' }]}>
            <View style={[styles.seanceIcon, { backgroundColor: s.couleur + '20' }]}>
              <Text style={{ fontSize: 22 }}>{s.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.seanceNom}>{s.nom}</Text>
              <Text style={styles.seanceDesc}>{s.minutes} min · {s.desc}</Text>
            </View>
            <Text style={{ color: s.couleur, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.infoSmall}>
          💡 Les séances sont guidées par texte pour l'instant — un guide audio/voix pourra
          être ajouté dans une prochaine étape.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  content: { padding: 20, alignItems: 'center', paddingBottom: 60 },
  ringWrap: { marginTop: 20, marginBottom: 24 },
  playBtn: { paddingHorizontal: 34, paddingVertical: 15, borderRadius: 99, alignItems: 'center', marginBottom: 24 },
  guideBox: { borderRadius: 14, padding: 16, borderWidth: 1, width: '100%' },
  guideLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  guideText: { fontSize: 13, color: '#ddd', lineHeight: 21 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 13, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: '#888899', marginTop: 4, textAlign: 'center' },
  seanceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  seanceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  seanceNom: { fontSize: 13, fontWeight: '600', color: '#fff' },
  seanceDesc: { fontSize: 11, color: '#666677', marginTop: 2 },
  infoSmall: { fontSize: 10, color: '#444455', textAlign: 'center', marginTop: 16, lineHeight: 15 },
});
