// ═══════════════════════════════════════════
//  SANTESCREEN.JS — Module Santé
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ExportPdfModal from '../components/ExportPdfModal';
import { BackButton, ProgressRing } from '../components/Shared';
import { getData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

export default function SanteScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [sante, setSante] = useState({});
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    getData('sante').then(s => setSante(s || {}));
  }, []);

  const d = sante;
  const imc = d.poids ? (d.poids / 1.72 / 1.72).toFixed(1) : '?';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>❤️ Santé</Text>
        <TouchableOpacity onPress={() => setShowExport(true)} style={styles.exportBtn}>
          <Text style={{ fontSize: 13 }}>📄 Exporter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.ringsGrid}>
          <View style={styles.ringBox}>
            <ProgressRing value={d.pas || 0} max={d.oP || 10000} color={PALETTE.blue} size={70} label={`${Math.round((d.pas || 0) / 1000)}k`} />
            <Text style={styles.ringCaption}>Pas</Text>
          </View>
          <View style={styles.ringBox}>
            <ProgressRing value={d.cal || 0} max={d.oCal || 2200} color={PALETTE.orange} size={70} label={`${d.cal || 0}`} />
            <Text style={styles.ringCaption}>kcal</Text>
          </View>
          <View style={styles.ringBox}>
            <ProgressRing value={d.som || 0} max={d.oSom || 8} color={PALETTE.violet} size={70} label={`${d.som || 0}h`} />
            <Text style={styles.ringCaption}>Sommeil</Text>
          </View>
          <View style={styles.ringBox}>
            <ProgressRing value={d.eau || 0} max={d.oEau || 2.5} color={PALETTE.teal} size={70} label={`${d.eau || 0}L`} />
            <Text style={styles.ringCaption}>Eau</Text>
          </View>
        </View>

        <View style={[styles.statCard, { borderColor: PALETTE.pink + '30' }]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>❤️ Fréquence cardiaque</Text>
            <Text style={[styles.statValue, { color: PALETTE.pink }]}>
              {d.fc || '?'} <Text style={styles.statUnit}>bpm</Text>
            </Text>
          </View>
          <Text style={styles.statSub}>Zone Repos · Excellent</Text>
        </View>

        <View style={styles.dualRow}>
          <View style={[styles.statCardHalf, { borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={styles.statLabelSmall}>⚖️ Poids</Text>
            <Text style={[styles.statValueBig, { color: PALETTE.orange }]}>{d.poids || '?'} kg</Text>
            <Text style={styles.statSub}>IMC {imc}</Text>
          </View>
          <View style={[styles.statCardHalf, { borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={styles.statLabelSmall}>🔥 Calories restantes</Text>
            <Text style={[styles.statValueBig, { color: PALETTE.orange }]}>
              {(d.oCal || 0) - (d.cal || 0)}
            </Text>
            <Text style={styles.statSub}>sur {d.oCal || 0} objectif</Text>
          </View>
        </View>

        <View style={[styles.coachCard, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '10' }]}>
          <Text style={[styles.coachTitle, { color: PALETTE.violet }]}>🌟 Kira Coach Santé</Text>
          <Text style={styles.coachText}>
            Sommeil à {d.som || '?'}h → couche-toi avant 22h30 ce soir. Avant le sport : banane 45
            min avant + étirements 10 min après !
          </Text>
        </View>
      </ScrollView>

      <ExportPdfModal visible={showExport} onClose={() => setShowExport(false)} type="sante" />
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
  ringsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    paddingVertical: 16,
    gap: 14,
  },
  ringBox: { alignItems: 'center', width: '22%' },
  ringCaption: { fontSize: 9, color: '#555566', marginTop: 5 },
  statCard: {
    backgroundColor: 'rgba(255,101,132,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statUnit: { fontSize: 11, fontWeight: '400' },
  statSub: { fontSize: 11, color: '#666677' },
  dualRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  statCardHalf: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  statLabelSmall: { fontSize: 11, color: '#888899', marginBottom: 4 },
  statValueBig: { fontSize: 20, fontWeight: '800' },
  coachCard: { borderRadius: 14, padding: 13, borderWidth: 1 },
  coachTitle: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  coachText: { fontSize: 12, color: '#ccccdd', lineHeight: 18 },
});
