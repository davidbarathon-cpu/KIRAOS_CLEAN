// ═══════════════════════════════════════════
//  CUISINESCREEN.JS — Module Cuisine
//  Recettes quotidiennes, détails, conseils Kira
// ═══════════════════════════════════════════

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BackButton, Chip, SectionLabel } from '../components/Shared';
import { getTheme, PALETTE } from '../utils/theme';

const RECETTES = [
  {
    id: 1,
    n: 'Poulet rôti citron & thym',
    i: '🍋',
    d: '45min',
    cal: 420,
    diff: 'Facile',
    c: PALETTE.orange,
    ing: ['1 poulet', '2 citrons', 'Thym frais', "Ail, huile d'olive"],
    etapes: [
      'Préchauffer le four à 200°C',
      "Badigeonner le poulet de jus de citron et d'huile",
      "Parsemer de thym et d'ail émincé",
      'Rôtir 45 min en arrosant toutes les 15 min',
      'Laisser reposer 10 min avant de découper',
    ],
    conseil: 'Arroser régulièrement pour une peau croustillante.',
  },
  {
    id: 2,
    n: 'Buddha bowl avocat-quinoa',
    i: '🥑',
    d: '20min',
    cal: 380,
    diff: 'Très facile',
    c: PALETTE.teal,
    ing: ['100g quinoa', '1 avocat mûr', 'Tomates cerises', 'Tahini, citron'],
    etapes: [
      "Cuire le quinoa 12 min dans 2x son volume d'eau",
      "Couper l'avocat et les tomates",
      'Disposer en bol sur le quinoa',
      'Arroser de tahini dilué au citron',
    ],
    conseil: 'Préparez le quinoa la veille pour gagner du temps.',
  },
  {
    id: 3,
    n: 'Soupe miso & tofu',
    i: '🍜',
    d: '15min',
    cal: 180,
    diff: 'Facile',
    c: PALETTE.blue,
    ing: ['1L bouillon dashi', '3cs miso blanc', '200g tofu soyeux', 'Algues wakamé, ciboulette'],
    etapes: [
      'Chauffer le bouillon sans faire bouillir',
      "Délayer le miso dans une louche de bouillon",
      'Incorporer doucement, ajouter le tofu en dés',
      'Parsemer de ciboulette et wakamé réhydratée',
    ],
    conseil: 'Ne jamais faire bouillir le miso — cela détruit les probiotiques.',
  },
];

export default function CuisineScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [recipeIdx, setRecipeIdx] = useState(null);

  // ── Vue détail recette ──
  if (recipeIdx !== null) {
    const r = RECETTES[recipeIdx];
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => setRecipeIdx(null)} />
          <Text style={styles.headerTitle} numberOfLines={1}>{r.n}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <Text style={styles.recipeEmoji}>{r.i}</Text>
          <View style={styles.chipsRow}>
            <Chip label={r.diff} color={PALETTE.orange} />
            <Chip label={r.d} color={PALETTE.blue} />
            <Chip label={`${r.cal} kcal`} color={PALETTE.pink} />
          </View>

          <View style={styles.sectionBox}>
            <SectionLabel>Ingrédients</SectionLabel>
            {r.ing.map((item, i) => (
              <Text key={i} style={styles.ingredientText}>• {item}</Text>
            ))}
          </View>

          <View style={styles.sectionBox}>
            <SectionLabel>Préparation</SectionLabel>
            {r.etapes.map((e, i) => (
              <View key={i} style={styles.etapeRow}>
                <View style={[styles.etapeNum, { borderColor: r.c, backgroundColor: r.c + '33' }]}>
                  <Text style={{ color: r.c, fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>
                </View>
                <Text style={styles.etapeText}>{e}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.coachBox, { backgroundColor: r.c + '12', borderColor: r.c + '33' }]}>
            <Text style={[styles.coachLabel, { color: r.c }]}>🌟 Kira conseille</Text>
            <Text style={styles.coachText}>{r.conseil}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Vue liste recettes ──
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🍳 Cuisine</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={[styles.suggestBox, { borderColor: PALETTE.orange + '40' }]}>
          <Text style={[styles.suggestLabel, { color: PALETTE.orange }]}>🌟 Kira suggère ce soir :</Text>
          <Text style={styles.suggestText}>
            Poulet rôti citron & thym — léger, protéiné, parfait après une course. 420 kcal,
            dans ton budget !
          </Text>
        </View>

        {RECETTES.map((r, i) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.recipeCard, { borderColor: r.c + '22' }]}
            onPress={() => setRecipeIdx(i)}
            activeOpacity={0.85}
          >
            <View style={[styles.recipeIcon, { backgroundColor: r.c + '20' }]}>
              <Text style={{ fontSize: 24 }}>{r.i}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeName}>{r.n}</Text>
              <View style={styles.chipsRowSmall}>
                <Chip label={r.d} color={PALETTE.blue} />
                <Chip label={r.diff} color={PALETTE.orange} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.recipeCal, { color: r.c }]}>{r.cal}</Text>
              <Text style={styles.recipeCalUnit}>kcal</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.comingSoon}>
          🚧 De nouvelles recettes seront ajoutées chaque jour automatiquement par Kira.
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  recipeEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
  chipsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 },
  chipsRowSmall: { flexDirection: 'row', gap: 6, marginTop: 5 },
  sectionBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  ingredientText: { fontSize: 13, color: '#ccc', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  etapeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  etapeNum: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  etapeText: { fontSize: 13, color: '#ccc', lineHeight: 19, flex: 1, paddingTop: 3 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc' },
  suggestBox: { backgroundColor: 'rgba(249,115,22,0.08)', borderRadius: 14, padding: 13, borderWidth: 1, marginBottom: 14 },
  suggestLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  suggestText: { fontSize: 13, color: '#fff' },
  recipeCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
  },
  recipeIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recipeName: { fontWeight: '600', color: '#fff', fontSize: 13 },
  recipeCal: { fontSize: 15, fontWeight: '800' },
  recipeCalUnit: { fontSize: 10, color: '#444455' },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
