// ═══════════════════════════════════════════
//  PARKINGSCREEN.JS — Module Parking
//  Position de la voiture, temps de stationnement
//  restant. La vraie carte (avec react-native-maps)
//  et le GPS réel viendront dans un lot futur —
//  pour l'instant structure + données manuelles.
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const DEFAULT_PARKING = {
  adresse: 'Rue Victor Hugo, 47300 Villeneuve-sur-Lot',
  heureArrivee: '14:30',
  dureeHeures: 2,
  note: 'Parking gratuit, 2h max',
  actif: true,
};

function calculerMinutesRestantes(heureArrivee, dureeHeures) {
  const [h, m] = heureArrivee.split(':').map(Number);
  const arrivee = new Date();
  arrivee.setHours(h, m, 0, 0);
  const expiration = new Date(arrivee.getTime() + dureeHeures * 60 * 60 * 1000);
  const maintenant = new Date();
  const diffMs = expiration - maintenant;
  return Math.round(diffMs / 60000);
}

function formatHeureExpiration(heureArrivee, dureeHeures) {
  const [h, m] = heureArrivee.split(':').map(Number);
  const total = h * 60 + m + dureeHeures * 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export default function ParkingScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [parking, setParking] = useState(DEFAULT_PARKING);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(DEFAULT_PARKING);

  useEffect(() => {
    getData('parking').then(p => {
      const data = p || DEFAULT_PARKING;
      setParking(data);
      setForm(data);
    });
  }, []);

  const save = async () => {
    const updated = { ...form, actif: true };
    setParking(updated);
    await setData('parking', updated);
    setEditing(false);
  };

  const clearParking = async () => {
    const cleared = { ...parking, actif: false };
    setParking(cleared);
    await setData('parking', cleared);
  };

  const minutesRestantes = parking.actif
    ? calculerMinutesRestantes(parking.heureArrivee, parking.dureeHeures)
    : null;
  const heureExpiration = formatHeureExpiration(parking.heureArrivee, parking.dureeHeures);
  const urgence = minutesRestantes !== null && minutesRestantes < 30;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🅿️ Parking</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {parking.actif ? (
          <View style={[styles.parkCard, { borderColor: PALETTE.cyan + '30' }]}>
            <View style={styles.parkHeader}>
              <Text style={{ fontSize: 32 }}>🚗</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.parkTitle}>Voiture garée</Text>
                <Text style={[styles.parkAdresse, { color: PALETTE.cyan }]}>{parking.adresse}</Text>
              </View>
            </View>

            {/* Emplacement carte simplifiée — la vraie carte interactive viendra avec react-native-maps */}
            <View style={styles.mapPlaceholder}>
              <Text style={{ fontSize: 30 }}>🗺️</Text>
              <Text style={styles.mapPlaceholderText}>Carte interactive à venir{'\n'}(react-native-maps)</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={{ fontSize: 16 }}>⏰</Text>
                <Text style={styles.statLabel}>Garée à</Text>
                <Text style={[styles.statValue, { color: PALETTE.cyan }]}>{parking.heureArrivee}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={{ fontSize: 16 }}>⏱️</Text>
                <Text style={styles.statLabel}>Expire à</Text>
                <Text style={[styles.statValue, { color: PALETTE.cyan }]}>{heureExpiration}</Text>
              </View>
            </View>

            <View
              style={[
                styles.timerBox,
                { backgroundColor: urgence ? 'rgba(255,101,132,0.15)' : 'rgba(34,211,238,0.1)', borderColor: urgence ? 'rgba(255,101,132,0.3)' : 'rgba(34,211,238,0.2)' },
              ]}
            >
              <Text style={{ color: urgence ? PALETTE.pink : PALETTE.cyan, fontWeight: '600', fontSize: 13 }}>
                {minutesRestantes > 0 ? `Il reste environ ${minutesRestantes} minutes` : '⚠️ Ticket expiré !'}
              </Text>
            </View>

            <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
              <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
              <Text style={styles.coachText}>
                Je te rappellerai 15 minutes avant l'expiration pour éviter l'amende
                {urgence ? ' — c\'est maintenant !' : '.'}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: PALETTE.cyan + '15', borderColor: PALETTE.cyan + '30' }]}
                onPress={() => { setForm(parking); setEditing(true); }}
              >
                <Text style={{ color: PALETTE.cyan, fontSize: 12, fontWeight: '600' }}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(255,101,132,0.15)', borderColor: 'rgba(255,101,132,0.3)' }]}
                onPress={clearParking}
              >
                <Text style={{ color: PALETTE.pink, fontSize: 12, fontWeight: '600' }}>🗑 Effacer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🚗</Text>
            <Text style={styles.emptyText}>Aucune position de stationnement enregistrée.</Text>
            <TouchableOpacity
              style={[styles.addParkBtn, { backgroundColor: PALETTE.cyan }]}
              onPress={() => { setForm({ ...DEFAULT_PARKING, heureArrivee: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }); setEditing(true); }}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>+ Enregistrer ma position</Text>
            </TouchableOpacity>
          </View>
        )}

        {editing && (
          <View style={[styles.editForm, { borderColor: PALETTE.cyan + '25' }]}>
            <SectionLabel>Adresse de stationnement</SectionLabel>
            <TextInput
              style={styles.input}
              placeholder="Adresse..."
              placeholderTextColor="#555566"
              value={form.adresse}
              onChangeText={t => setForm({ ...form, adresse: t })}
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Heure d'arrivée</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14:30"
                  placeholderTextColor="#555566"
                  value={form.heureArrivee}
                  onChangeText={t => setForm({ ...form, heureArrivee: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Durée (heures)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor="#555566"
                  keyboardType="numeric"
                  value={String(form.dureeHeures)}
                  onChangeText={t => setForm({ ...form, dureeHeures: parseFloat(t) || 0 })}
                />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Note (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Parking gratuit, 2h max"
              placeholderTextColor="#555566"
              value={form.note}
              onChangeText={t => setForm({ ...form, note: t })}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: PALETTE.cyan }]} onPress={save}>
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                onPress={() => setEditing(false)}
              >
                <Text style={{ color: '#888899', fontSize: 13 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.comingSoon}>
          🚧 GPS automatique et carte interactive réelle arriveront avec react-native-maps dans un lot futur.
        </Text>
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  parkCard: { backgroundColor: 'rgba(34,211,238,0.06)', borderRadius: 14, padding: 14, borderWidth: 1 },
  parkHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  parkTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  parkAdresse: { fontSize: 11, marginTop: 2 },
  mapPlaceholder: {
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mapPlaceholderText: { fontSize: 10, color: '#444455', textAlign: 'center', marginTop: 6, lineHeight: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#666677', marginTop: 3 },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  timerBox: { padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, marginBottom: 12 },
  coachBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, padding: 11, borderRadius: 11, borderWidth: 1, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, color: '#555566', marginBottom: 16, textAlign: 'center' },
  addParkBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99 },
  editForm: { backgroundColor: 'rgba(34,211,238,0.07)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 14 },
  fieldLabel: { fontSize: 10, color: '#888899', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9,
    color: '#fff',
    fontSize: 13,
    padding: 10,
  },
  row2: { flexDirection: 'row', gap: 8 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  formBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
