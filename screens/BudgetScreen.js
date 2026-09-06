// ═══════════════════════════════════════════
//  BUDGETSCREEN.JS — Module Budget (lot 72)
//  Seul module de la toute première liste (prototype web) qui n'avait
//  jamais été ni maquetté ni construit — entièrement nouveau ici.
//  Budget mensuel simple : objectif du mois, dépenses par catégorie,
//  ce qu'il reste. Repart naturellement à zéro chaque mois (filtre sur
//  le mois en cours), sans bouton de réinitialisation nécessaire.
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, ProgressBar, SectionLabel } from '../components/Shared';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';
import { getData, setData } from '../utils/storage';

const CLE_BUDGET = 'budget_mensuel';
const CLE_DEPENSES = 'budget_depenses';
const BUDGET_PAR_DEFAUT = 1500;

const CATEGORIES = [
  { id: 'alimentation', label: '🛒 Alimentation', couleur: PALETTE.green },
  { id: 'logement', label: '🏠 Logement', couleur: PALETTE.blue },
  { id: 'transport', label: '🚗 Transport', couleur: PALETTE.orange },
  { id: 'loisirs', label: '🎉 Loisirs', couleur: PALETTE.violet },
  { id: 'sante', label: '❤️ Santé', couleur: PALETTE.pink },
  { id: 'autre', label: '📌 Autre', couleur: PALETTE.gray },
];

function moisEnCours() {
  return new Date().toISOString().slice(0, 7); // "2026-08"
}

export default function BudgetScreen({ navigation }) {
  const theme = useKiraTheme();
  const [budgetMensuel, setBudgetMensuel] = useState(BUDGET_PAR_DEFAUT);
  const [depenses, setDepenses] = useState([]);
  const [editionBudget, setEditionBudget] = useState(false);
  const [budgetSaisi, setBudgetSaisi] = useState(String(BUDGET_PAR_DEFAUT));
  const [showAdd, setShowAdd] = useState(false);
  const [nouveauMontant, setNouveauMontant] = useState('');
  const [nouvelleDesc, setNouvelleDesc] = useState('');
  const [nouvelleCategorie, setNouvelleCategorie] = useState(CATEGORIES[0].id);

  const charger = useCallback(async () => {
    const [b, d] = await Promise.all([getData(CLE_BUDGET), getData(CLE_DEPENSES)]);
    setBudgetMensuel(typeof b === 'number' ? b : BUDGET_PAR_DEFAUT);
    setBudgetSaisi(String(typeof b === 'number' ? b : BUDGET_PAR_DEFAUT));
    setDepenses(Array.isArray(d) ? d : []);
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const depensesDuMois = depenses.filter(d => d.date.slice(0, 7) === moisEnCours()).sort((a, b) => b.date.localeCompare(a.date));
  const totalDepense = depensesDuMois.reduce((acc, d) => acc + d.montant, 0);
  const restant = budgetMensuel - totalDepense;
  const pctUtilise = budgetMensuel > 0 ? Math.min(Math.round((totalDepense / budgetMensuel) * 100), 100) : 0;
  const depassement = totalDepense > budgetMensuel;

  const totauxParCategorie = CATEGORIES.map(c => ({
    ...c,
    total: depensesDuMois.filter(d => d.categorie === c.id).reduce((acc, d) => acc + d.montant, 0),
  })).filter(c => c.total > 0);

  const enregistrerBudget = async () => {
    const valeur = parseFloat(budgetSaisi.replace(',', '.'));
    if (isNaN(valeur) || valeur <= 0) return;
    setBudgetMensuel(valeur);
    await setData(CLE_BUDGET, valeur);
    setEditionBudget(false);
  };

  const ajouterDepense = async () => {
    const montant = parseFloat(nouveauMontant.replace(',', '.'));
    if (isNaN(montant) || montant <= 0) return;
    const nouvelle = { id: Date.now(), montant, categorie: nouvelleCategorie, description: nouvelleDesc.trim(), date: new Date().toISOString() };
    const misAJour = [...depenses, nouvelle];
    setDepenses(misAJour);
    await setData(CLE_DEPENSES, misAJour);
    setNouveauMontant('');
    setNouvelleDesc('');
    setNouvelleCategorie(CATEGORIES[0].id);
    setShowAdd(false);
  };

  const supprimerDepense = async id => {
    const misAJour = depenses.filter(d => d.id !== id);
    setDepenses(misAJour);
    await setData(CLE_DEPENSES, misAJour);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>💰 Budget</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={[styles.resumeBox, { borderColor: depassement ? PALETTE.pink + '40' : theme.accent + '25', backgroundColor: depassement ? 'rgba(255,101,132,0.08)' : theme.accent + '0d' }]}>
          <View style={styles.resumeHeader}>
            <Text style={styles.resumeMois}>{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setEditionBudget(!editionBudget)}>
              <Text style={{ fontSize: 11, color: theme.accent }}>✏️ Objectif</Text>
            </TouchableOpacity>
          </View>

          {editionBudget ? (
            <View style={styles.editBudgetRow}>
              <TextInput
                style={styles.editBudgetInput}
                keyboardType="numeric"
                value={budgetSaisi}
                onChangeText={setBudgetSaisi}
                autoFocus
              />
              <Text style={{ color: '#888899', fontSize: 13 }}>€ / mois</Text>
              <TouchableOpacity onPress={enregistrerBudget} style={[styles.saveBudgetBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.restantValeur, { color: depassement ? PALETTE.pink : '#fff' }]}>
                {restant >= 0 ? `${restant.toFixed(0)} €` : `−${Math.abs(restant).toFixed(0)} €`}
              </Text>
              <Text style={styles.restantLabel}>{depassement ? 'dépassement sur' : 'restant sur'} {budgetMensuel.toFixed(0)} € ce mois</Text>
              <ProgressBar value={pctUtilise} max={100} color={depassement ? PALETTE.pink : theme.accent} height={7} />
              <Text style={styles.pctLabel}>{totalDepense.toFixed(0)} € dépensés ({pctUtilise}%)</Text>
            </>
          )}
        </View>

        {totauxParCategorie.length > 0 && (
          <View style={styles.catTotauxRow}>
            {totauxParCategorie.map(c => (
              <View key={c.id} style={[styles.catTotalChip, { borderColor: c.couleur + '33', backgroundColor: c.couleur + '12' }]}>
                <Text style={{ fontSize: 10, color: c.couleur }}>{c.label} · {c.total.toFixed(0)}€</Text>
              </View>
            ))}
          </View>
        )}

        {!showAdd ? (
          <TouchableOpacity style={[styles.addBtn, { borderColor: theme.accent + '40' }]} onPress={() => setShowAdd(true)}>
            <Text style={[styles.addBtnText, { color: theme.accent }]}>+ Ajouter une dépense</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { backgroundColor: theme.accent + '0d', borderColor: theme.accent + '25' }]}>
            <View style={styles.montantRow}>
              <TextInput
                style={styles.montantInput}
                placeholder="0"
                placeholderTextColor="#555566"
                keyboardType="numeric"
                value={nouveauMontant}
                onChangeText={setNouveauMontant}
                autoFocus
              />
              <Text style={{ color: '#888899', fontSize: 16 }}>€</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Description (optionnel)"
              placeholderTextColor="#555566"
              value={nouvelleDesc}
              onChangeText={setNouvelleDesc}
            />
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setNouvelleCategorie(c.id)}
                  style={[styles.catChip, { borderColor: nouvelleCategorie === c.id ? c.couleur : 'rgba(255,255,255,0.1)', backgroundColor: nouvelleCategorie === c.id ? c.couleur + '22' : 'transparent' }]}
                >
                  <Text style={{ fontSize: 11, color: nouvelleCategorie === c.id ? c.couleur : '#666677' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: theme.accent }]} onPress={ajouterDepense}>
                <Text style={styles.formBtnTextPrimary}>Ajouter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setShowAdd(false)}>
                <Text style={styles.formBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SectionLabel style={{ marginTop: 18 }}>Dépenses du mois</SectionLabel>
        {depensesDuMois.length === 0 ? (
          <Text style={styles.emptyText}>Aucune dépense enregistrée ce mois-ci.</Text>
        ) : (
          depensesDuMois.map(d => {
            const cat = CATEGORIES.find(c => c.id === d.categorie) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <View key={d.id} style={[styles.depenseRow, { borderColor: cat.couleur + '20' }]}>
                <View style={[styles.depenseCatDot, { backgroundColor: cat.couleur }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.depenseDesc}>{d.description || cat.label}</Text>
                  <Text style={styles.depenseDate}>{new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <Text style={styles.depenseMontant}>{d.montant.toFixed(2)} €</Text>
                <TouchableOpacity onPress={() => supprimerDepense(d.id)} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#333344', fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resumeBox: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 14 },
  resumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resumeMois: { fontSize: 11, color: '#888899', textTransform: 'capitalize' },
  restantValeur: { fontSize: 32, fontWeight: '800' },
  restantLabel: { fontSize: 11, color: '#888899', marginBottom: 10 },
  pctLabel: { fontSize: 10, color: '#666677', marginTop: 6 },
  editBudgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBudgetInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 16, padding: 8, width: 90 },
  saveBudgetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, marginLeft: 'auto' },
  catTotauxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  catTotalChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginBottom: 10 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  montantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  montantInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 18, padding: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10, marginBottom: 10 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  formActions: { flexDirection: 'row', gap: 8 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  formBtnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 13 },
  formBtnText: { color: '#888899', fontSize: 13 },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  depenseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 7, borderWidth: 1 },
  depenseCatDot: { width: 8, height: 8, borderRadius: 4 },
  depenseDesc: { fontSize: 12, color: '#fff', fontWeight: '600' },
  depenseDate: { fontSize: 10, color: '#666677', marginTop: 2 },
  depenseMontant: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
