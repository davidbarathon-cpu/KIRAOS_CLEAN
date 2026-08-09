// ═══════════════════════════════════════════
//  OBJECTIFSSCREEN.JS — Module Objectifs (lot 71)
//  Repris du prototype web (onglet "objectifs" du module Santé), mais
//  transformé en module autonome et éditable — dans le prototype les
//  objectifs étaient une simple liste de démo en dur, ici l'utilisateur
//  crée, met à jour et supprime ses propres objectifs.
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, ProgressBar, SectionLabel } from '../components/Shared';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';
import { getData, setData } from '../utils/storage';

const CLE_OBJECTIFS = 'objectifs_liste';

const CATEGORIES = [
  { id: 'sport', label: '🏃 Sport', couleur: PALETTE.blue },
  { id: 'sante', label: '❤️ Santé', couleur: PALETTE.pink },
  { id: 'musique', label: '🎸 Musique', couleur: PALETTE.orange },
  { id: 'bien_etre', label: '🧘 Bien-être', couleur: PALETTE.violet },
  { id: 'perso', label: '✨ Personnel', couleur: PALETTE.magenta },
  { id: 'autre', label: '📌 Autre', couleur: PALETTE.gray },
];

export default function ObjectifsScreen({ navigation }) {
  const theme = useKiraTheme();
  const [objectifs, setObjectifs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nouveauTitre, setNouveauTitre] = useState('');
  const [nouvelleCategorie, setNouvelleCategorie] = useState(CATEGORIES[0].id);

  const charger = useCallback(async () => {
    const o = await getData(CLE_OBJECTIFS);
    setObjectifs(Array.isArray(o) ? o : []);
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const persister = async liste => {
    setObjectifs(liste);
    await setData(CLE_OBJECTIFS, liste);
  };

  const ajouterObjectif = () => {
    if (!nouveauTitre.trim()) return;
    const nouvel = { id: Date.now(), titre: nouveauTitre.trim(), categorie: nouvelleCategorie, progres: 0, dateCreation: new Date().toISOString() };
    persister([nouvel, ...objectifs]);
    setNouveauTitre('');
    setNouvelleCategorie(CATEGORIES[0].id);
    setShowAdd(false);
  };

  const modifierProgres = (id, delta) => {
    const misAJour = objectifs.map(o => (o.id === id ? { ...o, progres: Math.max(0, Math.min(100, o.progres + delta)) } : o));
    persister(misAJour);
  };

  const supprimerObjectif = id => {
    persister(objectifs.filter(o => o.id !== id));
  };

  const enCours = objectifs.filter(o => o.progres < 100);
  const termines = objectifs.filter(o => o.progres >= 100);

  const renderObjectif = o => {
    const cat = CATEGORIES.find(c => c.id === o.categorie) || CATEGORIES[CATEGORIES.length - 1];
    const termine = o.progres >= 100;
    return (
      <View key={o.id} style={[styles.objectifCard, { borderColor: cat.couleur + '22', opacity: termine ? 0.7 : 1 }]}>
        <View style={styles.objectifHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.objectifTitre}>{termine ? '✅ ' : ''}{o.titre}</Text>
            <Text style={[styles.objectifCat, { color: cat.couleur }]}>{cat.label}</Text>
          </View>
          <Text style={[styles.objectifPct, { color: termine ? PALETTE.teal : cat.couleur }]}>{o.progres}%</Text>
        </View>
        <ProgressBar value={o.progres} max={100} color={termine ? PALETTE.teal : cat.couleur} height={6} />
        <View style={styles.objectifActions}>
          {!termine && (
            <>
              <TouchableOpacity onPress={() => modifierProgres(o.id, -10)} style={styles.miniBtn}>
                <Text style={styles.miniBtnText}>−10%</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => modifierProgres(o.id, 10)} style={[styles.miniBtn, { backgroundColor: cat.couleur + '22', borderColor: cat.couleur + '44' }]}>
                <Text style={[styles.miniBtnText, { color: cat.couleur }]}>+10%</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => supprimerObjectif(o.id)} style={styles.deleteBtn}>
            <Text style={{ color: PALETTE.pink, fontSize: 11 }}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🎯 Objectifs</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {objectifs.length > 0 && (
          <View style={[styles.resumeBox, { borderColor: theme.accent + '25' }]}>
            <Text style={styles.resumeText}>
              {termines.length} sur {objectifs.length} objectif{objectifs.length > 1 ? 's' : ''} atteint{termines.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {enCours.length === 0 && termines.length === 0 && (
          <Text style={styles.emptyText}>Aucun objectif pour l'instant. Ajoute ta première ambition ci-dessous !</Text>
        )}

        {enCours.length > 0 && <SectionLabel style={{ marginTop: 6 }}>En cours</SectionLabel>}
        {enCours.map(renderObjectif)}

        {!showAdd ? (
          <TouchableOpacity style={[styles.addBtn, { borderColor: theme.accent + '40' }]} onPress={() => setShowAdd(true)}>
            <Text style={[styles.addBtnText, { color: theme.accent }]}>+ Nouvel objectif</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { backgroundColor: theme.accent + '0d', borderColor: theme.accent + '25' }]}>
            <TextInput
              style={styles.input}
              placeholder="Ex: Courir 5 km sans m'arrêter"
              placeholderTextColor="#555566"
              value={nouveauTitre}
              onChangeText={setNouveauTitre}
              autoFocus
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
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: theme.accent }]} onPress={ajouterObjectif}>
                <Text style={styles.formBtnTextPrimary}>Créer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setShowAdd(false)}>
                <Text style={styles.formBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {termines.length > 0 && <SectionLabel style={{ marginTop: 18 }}>Terminés 🎉</SectionLabel>}
        {termines.map(renderObjectif)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resumeBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14, alignItems: 'center' },
  resumeText: { fontSize: 12, color: '#ccc', fontWeight: '600' },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  objectifCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  objectifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  objectifTitre: { fontSize: 13, fontWeight: '600', color: '#fff' },
  objectifCat: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  objectifPct: { fontSize: 16, fontWeight: '800' },
  objectifActions: { flexDirection: 'row', gap: 7, marginTop: 10, alignItems: 'center' },
  miniBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  miniBtnText: { fontSize: 11, color: '#888899', fontWeight: '600' },
  deleteBtn: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 5 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 6, marginBottom: 6 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10, marginBottom: 10 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  formActions: { flexDirection: 'row', gap: 8 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  formBtnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 13 },
  formBtnText: { color: '#888899', fontSize: 13 },
});
