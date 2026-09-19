// ═══════════════════════════════════════════
//  CUISINEFAVORISSCREEN.JS — LOT 78
//  Livre de recettes personnel : les recettes que David a marquées d'une
//  étoile depuis l'écran Cuisine. Consultable même les jours où Kira
//  propose autre chose (contrairement aux recettes du jour, qui changent
//  chaque jour et ne sont pas re-consultables sinon).
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getFavoris, retirerFavori } from '../utils/cuisineFavoris';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

// LOT 88 — construit un texte lisible pour le partage natif (WhatsApp, SMS,
// mail...), même esprit que l'export PDF santé/guitare existant mais sans
// fichier, juste du texte brut, plus simple à envoyer rapidement.
function partagerRecette(r) {
  const ingredients = (r.ingredients || []).map(i => `• ${i}`).join('\n');
  const etapes = (r.etapes || []).map((e, i) => `${i + 1}. ${e}`).join('\n');
  const message = `🍽 ${r.titre}${r.type ? ` (${r.type})` : ''}\n⏱ ${r.temps || '?'} · 📊 ${r.difficulte || '?'}\n\nIngrédients :\n${ingredients}\n\nPréparation :\n${etapes}${r.conseil ? `\n\n🌟 Conseil : ${r.conseil}` : ''}\n\n— Partagé depuis Kira OS`;
  Share.share({ message });
}

export default function CuisineFavorisScreen({ navigation }) {
  const theme = useKiraTheme();
  const [favoris, setFavoris] = useState([]);
  const [recetteOuverte, setRecetteOuverte] = useState(null);

  useFocusEffect(useCallback(() => {
    getFavoris().then(setFavoris);
  }, []));

  const confirmerSuppression = recette => {
    Alert.alert(
      'Retirer des favoris ?',
      `"${recette.titre}" sera retirée de ton livre de recettes.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const nouvelleListe = await retirerFavori(recette.id);
            setFavoris(nouvelleListe);
            setRecetteOuverte(null);
          },
        },
      ]
    );
  };

  // ── Vue détail d'une recette favorite ──
  if (recetteOuverte) {
    const r = recetteOuverte;
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => setRecetteOuverte(null)} />
          <View style={{ flex: 1 }}>
            {r.type && <Text style={styles.typeLabel}>{r.type.toUpperCase()}</Text>}
            <Text style={styles.headerTitle} numberOfLines={1}>{r.titre}</Text>
          </View>
          <TouchableOpacity onPress={() => partagerRecette(r)} style={styles.favBtn}>
            <Text style={{ fontSize: 18 }}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmerSuppression(r)} style={styles.favBtn}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: PALETTE.teal + '22' }]}>
              <Text style={{ color: PALETTE.teal, fontSize: 11 }}>⏱ {r.temps}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: PALETTE.purple + '22' }]}>
              <Text style={{ color: PALETTE.purple, fontSize: 11 }}>📊 {r.difficulte}</Text>
            </View>
          </View>

          <SectionLabel>Ingrédients</SectionLabel>
          {(r.ingredients || []).map((ing, i) => (
            <View key={i} style={styles.ingRow}>
              <Text style={{ color: PALETTE.teal, marginRight: 8 }}>•</Text>
              <Text style={styles.ingText}>{ing}</Text>
            </View>
          ))}

          <SectionLabel style={{ marginTop: 16 }}>Préparation</SectionLabel>
          {(r.etapes || []).map((etape, i) => (
            <View key={i} style={styles.etapeRow}>
              <View style={[styles.etapeNum, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={styles.etapeText}>{etape}</Text>
            </View>
          ))}

          {r.conseil && (
            <View style={[styles.conseilBox, { borderColor: theme.accent + '44' }]}>
              <Text style={{ fontSize: 14, marginBottom: 6 }}>🌟</Text>
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>Conseil de Kira</Text>
              <Text style={{ color: '#aaa', fontSize: 12, lineHeight: 18 }}>{r.conseil}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Liste des favoris ──
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>⭐ Mes recettes favorites</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {favoris.length === 0 ? (
          <Text style={{ color: '#666677', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Pas encore de recette favorite. Ouvre une recette du jour dans Cuisine et appuie sur
            l'étoile ⭐ pour la garder ici.
          </Text>
        ) : (
          favoris.map(r => (
            <TouchableOpacity key={r.id} style={[styles.recetteCard, { borderColor: theme.accent + '22' }]} onPress={() => setRecetteOuverte(r)}>
              <View style={styles.recetteHeader}>
                <View style={{ flex: 1 }}>
                  {r.type && <Text style={styles.typeLabelSmall}>{r.type.toUpperCase()}</Text>}
                  <Text style={styles.recetteTitre}>{r.titre}</Text>
                </View>
                <Text style={{ fontSize: 16 }}>⭐</Text>
              </View>
              <View style={styles.recetteMeta}>
                <Text style={[styles.metaTag, { color: PALETTE.teal }]}>⏱ {r.temps}</Text>
                <Text style={[styles.metaTag, { color: PALETTE.purple }]}>📊 {r.difficulte}</Text>
                <Text style={[styles.metaTag, { color: PALETTE.orange }]}>🥘 {(r.ingredients || []).length} ingr.</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  favBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  typeLabel: { fontSize: 10, fontWeight: '700', color: PALETTE.orange, letterSpacing: 1, marginBottom: 2 },
  typeLabelSmall: { fontSize: 9, fontWeight: '700', color: PALETTE.orange, letterSpacing: 0.8, marginBottom: 3 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  ingText: { color: '#ccc', fontSize: 13, flex: 1, lineHeight: 19 },
  etapeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  etapeNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  etapeText: { color: '#ccc', fontSize: 13, flex: 1, lineHeight: 20 },
  conseilBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 16 },
  recetteCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  recetteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recetteTitre: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  recetteMeta: { flexDirection: 'row', gap: 12 },
  metaTag: { fontSize: 11 },
});
