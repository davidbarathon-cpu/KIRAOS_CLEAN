// ═══════════════════════════════════════════
//  SANTESCREEN.JS — Module Santé
//  MISE À JOUR LOT 45 : connexion à Health Connect (récupération
//  automatique pas/calories/FC/sommeil/poids depuis le téléphone ou
//  toute app compatible : Fitbit, Garmin, Samsung Health...).
//  La saisie manuelle (lot 44) reste disponible en complément/secours.
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ExportPdfModal from '../components/ExportPdfModal';
import { BackButton, ProgressRing, SectionLabel } from '../components/Shared';
import {
  connecterHealthConnect,
  estConnecteAHealthConnect,
  ouvrirInstallationHealthConnect,
  synchroniserDepuisHealthConnect,
} from '../utils/healthConnectService';
import { ajouterEau, genererConseilSante, getSanteDuJour, mettreAJourSante } from '../utils/santeManager';
import { getTheme, PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';
import { refreshKiraWidget } from '../utils/widgetUpdater';

const BOUTONS_EAU = [
  { label: '+250 ml', litres: 0.25 },
  { label: '+500 ml', litres: 0.5 },
];

export default function SanteScreen({ navigation }) {
  const theme = useKiraTheme();
  const [sante, setSante] = useState({});
  const [showExport, setShowExport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [ajoutEauEnCours, setAjoutEauEnCours] = useState(false);
  const [hcConnecte, setHcConnecte] = useState(false);
  const [hcSyncEnCours, setHcSyncEnCours] = useState(false);
  const [hcErreur, setHcErreur] = useState(null);

  const charger = useCallback(async () => {
    const connecte = await estConnecteAHealthConnect();
    setHcConnecte(connecte);

    if (connecte) {
      setHcSyncEnCours(true);
      const { erreur } = await synchroniserDepuisHealthConnect();
      setHcErreur(erreur);
      setHcSyncEnCours(false);
    }

    const data = await getSanteDuJour();
    setSante(data);
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const connecterHC = async () => {
    setHcSyncEnCours(true);
    const { succes, erreur } = await connecterHealthConnect();
    setHcSyncEnCours(false);
    if (!succes && (erreur === 'NON_INSTALLE' || erreur === 'A_METTRE_A_JOUR')) {
      ouvrirInstallationHealthConnect();
      setHcErreur(erreur === 'A_METTRE_A_JOUR' ? 'Health Connect (Santé Connect) doit être mis à jour depuis le Play Store.' : null);
      return;
    }
    if (succes) await charger();
    else setHcErreur(erreur);
  };

  const boireEau = async litres => {
    setAjoutEauEnCours(true);
    await ajouterEau(litres);
    await charger();
    refreshKiraWidget();
    setAjoutEauEnCours(false);
  };

  const ouvrirEdition = () => {
    setForm({
      pas: String(sante.pas ?? 0),
      cal: String(sante.cal ?? 0),
      fc: String(sante.fc ?? ''),
      poids: String(sante.poids ?? ''),
      som: String(sante.som ?? ''),
    });
    setEditing(true);
  };

  const enregistrerEdition = async () => {
    await mettreAJourSante({
      pas: parseInt(form.pas, 10) || 0,
      cal: parseInt(form.cal, 10) || 0,
      fc: parseInt(form.fc, 10) || null,
      poids: parseFloat(form.poids.replace(',', '.')) || null,
      som: parseFloat(form.som.replace(',', '.')) || 0,
    });
    setEditing(false);
    await charger();
    refreshKiraWidget();
  };

  const d = sante;
  const imc = d.poids ? (d.poids / 1.72 / 1.72).toFixed(1) : '?';
  const conseil = genererConseilSante(d, d.historique || []);
  const historique7j = (d.historique || []).slice(-7);
  const maxPasHistorique = Math.max(d.oP || 10000, ...historique7j.map(h => h.pas || 0), 1);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>❤️ Santé</Text>
        <TouchableOpacity onPress={ouvrirEdition} style={styles.exportBtn}>
          <Text style={{ fontSize: 13 }}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowExport(true)} style={styles.exportBtn}>
          <Text style={{ fontSize: 13 }}>📄</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bandeau Health Connect (lot 45) ── */}
      <View style={[styles.hcBanner, hcConnecte ? styles.hcBannerOk : styles.hcBannerOff]}>
        <Text style={{ fontSize: 16 }}>{hcConnecte ? '🟢' : '🔗'}</Text>
        <Text style={styles.hcBannerText}>
          {hcConnecte
            ? 'Synchronisé avec Health Connect (Fitbit, Garmin, Samsung Health...)'
            : 'Connecte Health Connect pour remonter pas/FC/sommeil automatiquement'}
        </Text>
        {hcSyncEnCours ? (
          <ActivityIndicator color={theme.accent} size="small" />
        ) : hcConnecte ? (
          <TouchableOpacity onPress={charger}>
            <Text style={[styles.hcBannerAction, { color: theme.accent }]}>🔄</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={connecterHC}>
            <Text style={[styles.hcBannerAction, { color: theme.accent }]}>Connecter →</Text>
          </TouchableOpacity>
        )}
      </View>
      {hcErreur && hcErreur !== 'NON_INSTALLE' && (
        <View style={styles.hcErreurBanner}>
          <Text style={styles.hcErreurText}>⚠️ Synchronisation Health Connect : {hcErreur.slice(0, 100)}</Text>
        </View>
      )}

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

        {/* Ajout rapide d'eau — l'action la plus fréquente, en un geste */}
        <View style={styles.eauRow}>
          {BOUTONS_EAU.map(b => (
            <TouchableOpacity
              key={b.label}
              style={[styles.eauBtn, { borderColor: PALETTE.teal + '40', backgroundColor: PALETTE.teal + '15' }]}
              onPress={() => boireEau(b.litres)}
              disabled={ajoutEauEnCours}
            >
              <Text style={{ color: PALETTE.teal, fontWeight: '700', fontSize: 13 }}>💧 {b.label}</Text>
            </TouchableOpacity>
          ))}
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
          <Text style={styles.coachText}>{conseil}</Text>
        </View>

        {/* Historique — se remplit jour après jour à partir de maintenant */}
        <SectionLabel style={{ marginTop: 18 }}>7 derniers jours</SectionLabel>
        {historique7j.length === 0 ? (
          <View style={styles.emptyHistBox}>
            <Text style={styles.emptyHistText}>
              Ton historique se construit au fil des jours. Reviens demain — la journée
              d'aujourd'hui apparaîtra ici automatiquement !
            </Text>
          </View>
        ) : (
          <View style={styles.histBox}>
            {historique7j.map((h, i) => (
              <View key={i} style={styles.histRow}>
                <Text style={styles.histDay}>{h.date}</Text>
                <View style={styles.histBarTrack}>
                  <View style={[styles.histBarFill, { width: `${Math.min((h.pas / maxPasHistorique) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.histValue}>{Math.round((h.pas || 0) / 1000)}k</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {editing && (
        <View style={styles.editOverlay}>
          <View style={[styles.editModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.editTitle}>✏️ Mettre à jour mes données</Text>

            {[
              ['pas', 'Pas aujourd\'hui'],
              ['cal', 'Calories brûlées (kcal)'],
              ['fc', 'Fréquence cardiaque (bpm)'],
              ['poids', 'Poids (kg)'],
              ['som', 'Sommeil cette nuit (h)'],
            ].map(([key, label]) => (
              <View key={key} style={{ marginBottom: 10 }}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor="#555566"
                  value={form[key]}
                  onChangeText={t => setForm({ ...form, [key]: t })}
                />
              </View>
            ))}

            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.accent }]} onPress={enregistrerEdition}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditing(false)}>
                <Text style={{ color: '#888899', fontSize: 13 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ExportPdfModal visible={showExport} onClose={() => setShowExport(false)} type="sante" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  exportBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)' },
  hcBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9 },
  hcBannerOk: { backgroundColor: 'rgba(67,217,173,0.1)' },
  hcBannerOff: { backgroundColor: 'rgba(108,99,255,0.08)' },
  hcBannerText: { flex: 1, fontSize: 10, color: '#aaa' },
  hcBannerAction: { fontSize: 11, fontWeight: '700' },
  hcErreurBanner: { backgroundColor: 'rgba(255,101,132,0.12)', paddingHorizontal: 16, paddingVertical: 7 },
  hcErreurText: { fontSize: 10, color: PALETTE.pink },
  ringsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    paddingVertical: 16,
    gap: 14,
  },
  ringBox: { alignItems: 'center', width: '22%' },
  ringCaption: { fontSize: 9, color: '#555566', marginTop: 5 },
  eauRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  eauBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
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
  emptyHistBox: { padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14 },
  emptyHistText: { fontSize: 12, color: '#666677', lineHeight: 18, textAlign: 'center' },
  histBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  histDay: { width: 42, fontSize: 10, color: '#666677' },
  histBarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  histBarFill: { height: '100%', backgroundColor: PALETTE.blue, borderRadius: 99 },
  histValue: { width: 32, fontSize: 10, color: '#aab', textAlign: 'right' },
  editOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  editModal: { width: '100%', borderRadius: 18, padding: 18, borderWidth: 1 },
  editTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 14 },
  fieldLabel: { fontSize: 10, color: '#888899', marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9,
    color: '#fff',
    fontSize: 13,
    padding: 10,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});
