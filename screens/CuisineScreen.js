import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getRecettesDuJour } from '../utils/cuisineCaller';
import { getFavoris, toggleFavori } from '../utils/cuisineFavoris';
import { getAllApiKeys, getActiveAiProvider, AI_PROVIDERS } from '../utils/apiKeys';
import { getData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

export default function CuisineScreen({ navigation }) {
  const theme = useKiraTheme();
  const [recettes, setRecettes] = useState([]);
  const [recipeIdx, setRecipeIdx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerationEnCours, setRegenerationEnCours] = useState(false);
  const [sourceIA, setSourceIA] = useState(null);
  const [favorisState, setFavorisState] = useState({}); // LOT 78 — clé "type|titre" -> bool

  const charger = useCallback(async (forcerRegeneration = false) => {
    if (forcerRegeneration) setRegenerationEnCours(true);
    else setLoading(true);
    try {
      const [sante, agenda, profil, keys, provider] = await Promise.all([
        getData('sante'), getData('agenda'), getData('profil'),
        getAllApiKeys(), getActiveAiProvider(),
      ]);
      const appState = { sante: sante || {}, agenda: agenda || [], profil: profil || {}, kiraState: 'flow' };
      const { recettes: r, source } = await getRecettesDuJour(appState, provider, keys || {}, forcerRegeneration);
      setRecettes(r || []);
      setSourceIA(source);
      // LOT 78 — sait tout de suite quelles recettes du jour sont déjà en favoris
      const favoris = await getFavoris();
      const etat = {};
      (r || []).forEach(recette => { etat[`${recette.type}|${recette.titre}`] = favoris.some(f => f.type === recette.type && f.titre === recette.titre); });
      setFavorisState(etat);
    } catch (e) {
      console.warn('Erreur chargement recettes:', e);
    }
    setLoading(false);
    setRegenerationEnCours(false);
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  // LOT 78 — bascule favori depuis la vue détail ou la liste
  const handleToggleFavori = async recette => {
    const maintenantFavori = await toggleFavori(recette);
    setFavorisState(prev => ({ ...prev, [`${recette.type}|${recette.titre}`]: maintenantFavori }));
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={{ color: '#666677', marginTop: 12, fontSize: 12 }}>
          Kira prépare tes recettes du jour...
        </Text>
      </View>
    );
  }

  if (recipeIdx !== null) {
    const r = recettes[recipeIdx];
    if (!r) { setRecipeIdx(null); return null; }
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => setRecipeIdx(null)} />
          <View style={{ flex: 1 }}>
            {r.type && <Text style={styles.typeLabel}>{r.type.toUpperCase()}</Text>}
            <Text style={styles.headerTitle} numberOfLines={1}>{r.titre}</Text>
          </View>
          <TouchableOpacity onPress={() => handleToggleFavori(r)} style={styles.favBtn}>
            <Text style={{ fontSize: 20 }}>{favorisState[`${r.type}|${r.titre}`] ? '⭐' : '☆'}</Text>
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

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🍽 Cuisine du jour</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CuisineFavoris')} style={styles.favBtn}>
          <Text style={{ fontSize: 13 }}>⭐ Mes favoris</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {sourceIA === 'ia' && (
          <View style={[styles.iaBadge, { borderColor: theme.accent + '44' }]}>
            <Text style={{ color: theme.accent, fontSize: 11 }}>✨ Recettes générées par Kira aujourd'hui</Text>
          </View>
        )}
        {sourceIA === 'offline' && (
          <View style={[styles.iaBadge, { borderColor: PALETTE.gray + '44' }]}>
            <Text style={{ color: PALETTE.gray, fontSize: 11 }}>💡 Recettes de la bibliothèque — configure une IA pour des recettes fraîches chaque jour</Text>
          </View>
        )}
        {recettes.map((r, i) => (
          <TouchableOpacity key={i} style={[styles.recetteCard, { borderColor: theme.accent + '22' }]} onPress={() => setRecipeIdx(i)}>
            <View style={styles.recetteHeader}>
              <View style={{ flex: 1 }}>
                {r.type && <Text style={styles.typeLabelSmall}>{r.type.toUpperCase()}</Text>}
                <Text style={styles.recetteTitre}>{r.titre}</Text>
              </View>
              <TouchableOpacity onPress={() => handleToggleFavori(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 16 }}>{favorisState[`${r.type}|${r.titre}`] ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recetteMeta}>
              <Text style={[styles.metaTag, { color: PALETTE.teal }]}>⏱ {r.temps}</Text>
              <Text style={[styles.metaTag, { color: PALETTE.purple }]}>📊 {r.difficulte}</Text>
              <Text style={[styles.metaTag, { color: PALETTE.orange }]}>🥘 {(r.ingredients || []).length} ingr.</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: theme.accent + '44' }]}
          onPress={() => charger(true)}
          disabled={regenerationEnCours}
        >
          {regenerationEnCours ? (
            <ActivityIndicator color={theme.accent} size="small" />
          ) : (
            <Text style={{ color: theme.accent, fontSize: 12 }}>🔄 Nouvelles recettes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
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
  iaBadge: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 14 },
  recetteCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  recetteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recetteTitre: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  recetteMeta: { flexDirection: 'row', gap: 12 },
  metaTag: { fontSize: 11 },
  refreshBtn: { marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  favBtn: { paddingHorizontal: 8, paddingVertical: 4 },
});
