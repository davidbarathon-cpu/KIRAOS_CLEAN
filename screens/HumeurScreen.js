// ═══════════════════════════════════════════
//  HUMEURSCREEN.JS — Module Humeur (lot 70)
//  Suivi quotidien simple du ressenti, repris du tout premier
//  prototype web (KiraApp.jsx → ModHumeur) jamais porté jusqu'ici.
//  Une entrée par jour (re-sélectionner remplace celle du jour, pas
//  de doublon), historique des 7 derniers jours affiché en dessous.
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getData, setData } from '../utils/storage';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

const CLE_HUMEUR = 'humeur_historique';

const HUMEURS = [
  { emoji: '😄', label: 'Excellent', couleur: PALETTE.teal, score: 10 },
  { emoji: '😊', label: 'Bien', couleur: PALETTE.green, score: 8 },
  { emoji: '😐', label: 'Neutre', couleur: PALETTE.orange, score: 6 },
  { emoji: '😔', label: 'Moyen', couleur: '#F97316', score: 4 },
  { emoji: '😢', label: 'Difficile', couleur: PALETTE.pink, score: 2 },
];

const JOURS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function dateDuJour() {
  return new Date().toISOString().slice(0, 10); // "2026-08-02"
}

function libelleJour(dateStr, index) {
  const d = new Date(dateStr);
  const aujourdhui = dateDuJour();
  if (dateStr === aujourdhui) return "Aujourd'hui";
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  if (dateStr === hier.toISOString().slice(0, 10)) return 'Hier';
  return JOURS_COURT[d.getDay()];
}

export default function HumeurScreen({ navigation }) {
  const theme = useKiraTheme();
  const [historique, setHistorique] = useState([]);
  const [note, setNote] = useState('');
  const [selectionEnCours, setSelectionEnCours] = useState(null);

  const charger = useCallback(async () => {
    const h = (await getData(CLE_HUMEUR)) || [];
    setHistorique(h);
    const entreeAujourdhui = h.find(e => e.date === dateDuJour());
    setNote(entreeAujourdhui?.note || '');
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const entreeAujourdhui = historique.find(e => e.date === dateDuJour());

  const enregistrerHumeur = async humeur => {
    const aujourdhui = dateDuJour();
    const autresJours = historique.filter(e => e.date !== aujourdhui);
    const nouvelleEntree = { date: aujourdhui, emoji: humeur.emoji, label: humeur.label, score: humeur.score, note };
    // Garde les 60 derniers jours pour ne pas faire grossir le stockage indéfiniment.
    const misAJour = [...autresJours, nouvelleEntree]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);
    setHistorique(misAJour);
    await setData(CLE_HUMEUR, misAJour);
    setSelectionEnCours(null);
  };

  const enregistrerNote = async () => {
    if (!entreeAujourdhui) return;
    const misAJour = historique.map(e => (e.date === dateDuJour() ? { ...e, note } : e));
    setHistorique(misAJour);
    await setData(CLE_HUMEUR, misAJour);
  };

  // 7 derniers jours (aujourd'hui compris), dans l'ordre chronologique.
  const sept_derniers_jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const historiqueSemaine = sept_derniers_jours.map(date => ({
    date,
    entree: historique.find(e => e.date === date) || null,
  }));

  const joursRenseignesSemaine = historiqueSemaine.filter(j => j.entree).length;
  const moyenneSemaine = joursRenseignesSemaine > 0
    ? Math.round(historiqueSemaine.reduce((acc, j) => acc + (j.entree?.score || 0), 0) / joursRenseignesSemaine)
    : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>😊 Humeur</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={styles.question}>Comment te sens-tu aujourd'hui ?</Text>

        <View style={styles.humeursRow}>
          {HUMEURS.map(h => {
            const selectionnee = (selectionEnCours ?? entreeAujourdhui?.emoji) === h.emoji;
            return (
              <TouchableOpacity
                key={h.emoji}
                style={styles.humeurBtn}
                activeOpacity={0.8}
                onPress={() => { setSelectionEnCours(h.emoji); enregistrerHumeur(h); }}
              >
                <View style={[styles.humeurCercle, { borderColor: selectionnee ? h.couleur : 'transparent', backgroundColor: selectionnee ? h.couleur + '22' : 'rgba(255,255,255,0.04)' }]}>
                  <Text style={{ fontSize: 28 }}>{h.emoji}</Text>
                </View>
                <Text style={[styles.humeurLabel, { color: selectionnee ? h.couleur : '#666677' }]}>{h.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {entreeAujourdhui && (
          <View style={[styles.noteBox, { borderColor: theme.accent + '25' }]}>
            <Text style={styles.noteLabel}>Une note pour aujourd'hui (optionnel)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ce qui a marqué ta journée..."
              placeholderTextColor="#555566"
              value={note}
              onChangeText={setNote}
              onBlur={enregistrerNote}
              multiline
            />
          </View>
        )}

        <SectionLabel style={{ marginTop: 22 }}>Cette semaine</SectionLabel>
        <View style={styles.semaineRow}>
          {historiqueSemaine.map(({ date, entree }, i) => (
            <View key={date} style={styles.jourBox}>
              <Text style={styles.jourLabel}>{libelleJour(date, i)}</Text>
              <View style={[styles.jourCercle, { borderColor: entree ? HUMEURS.find(h => h.emoji === entree.emoji)?.couleur + '55' : 'rgba(255,255,255,0.06)' }]}>
                <Text style={{ fontSize: 16 }}>{entree ? entree.emoji : '·'}</Text>
              </View>
            </View>
          ))}
        </View>

        {moyenneSemaine !== null && (
          <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
            <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
            <Text style={styles.coachText}>
              {joursRenseignesSemaine < 3
                ? "Continue à noter ton humeur quelques jours de plus pour que je puisse repérer des tendances utiles."
                : moyenneSemaine >= 7
                  ? "Une belle semaine dans l'ensemble — profites-en pour savourer ce qui va bien. 🌟"
                  : moyenneSemaine <= 4
                    ? "La semaine a semblé difficile. Accorde-toi un moment rien que pour toi aujourd'hui si tu peux."
                    : "Une semaine dans la moyenne — normal d'avoir des hauts et des bas."}
            </Text>
          </View>
        )}

        <Text style={styles.infoSmall}>
          💡 Une seule humeur enregistrée par jour — la re-sélectionner remplace celle du jour, ça ne crée pas de doublon.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  question: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 6, marginBottom: 18 },
  humeursRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  humeurBtn: { alignItems: 'center', gap: 6 },
  humeurCercle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  humeurLabel: { fontSize: 10, fontWeight: '600' },
  noteBox: { borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 13, marginTop: 18 },
  noteLabel: { fontSize: 11, color: '#888899', marginBottom: 8 },
  noteInput: { color: '#fff', fontSize: 13, minHeight: 50, textAlignVertical: 'top' },
  semaineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  jourBox: { alignItems: 'center', gap: 6, flex: 1 },
  jourLabel: { fontSize: 9, color: '#555566' },
  jourCercle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1, marginTop: 20 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  infoSmall: { fontSize: 10, color: '#444455', textAlign: 'center', marginTop: 18, lineHeight: 15 },
});
