// ═══════════════════════════════════════════
//  COURSESSCREEN.JS — Module Liste de courses
//  Kira pourra y ajouter des articles dictés
//  (la dictée vocale viendra dans une étape ultérieure)
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getAllApiKeys, getActiveAiProvider } from '../utils/apiKeys';
import { ingredientCorrespondAArticle, suggererRecetteDepuisCourses } from '../utils/cuisineCaller'; // LOT 92
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

const CATEGORIES = ['Épicerie', 'Viande', 'Légumes', 'Fruits', 'Laitiers', 'Boulangerie', 'Boissons', 'Hygiène'];
const SUGGESTIONS_RAPIDES = ['Lait', 'Oeufs', 'Pain', 'Poulet', 'Avocat', 'Bananes', 'Riz', 'Tomates', 'Fromage'];

// LOT 77 — CORRECTIF : le "Conseil Kira" affichait un texte fixe ("poulet
// rôti... citrons, thym...") jamais relié aux vraies recettes du jour,
// signalé par David comme "toujours la même chose, pas en rapport avec les
// recettes". On relit maintenant le cache du module Cuisine
// ('cuisine_recettes_cache', voir utils/cuisineCaller.js) et on compare ses
// ingrédients à la liste de courses actuelle pour ne signaler que ce qui
// manque réellement.
const CLE_CACHE_RECETTES = 'cuisine_recettes_cache';

// LOT 92 — nomIngredientNettoye()/ingredientCorrespondAArticle() ont déménagé
// dans utils/cuisineCaller.js (réutilisées aussi par la nouvelle suggestion
// de recette depuis les courses, voir plus bas) — ce petit alias garde le
// nom déjà utilisé plus loin dans ce fichier, pour un diff minimal.
function ingredientDejaDansListe(ingredientBrut, itemsCourses) {
  return itemsCourses.some(i => ingredientCorrespondAArticle(ingredientBrut, i.n));
}

const DEFAULT_COURSES = [
  { id: 1, n: 'Lait demi-écrémé', cat: 'Laitiers', q: '2L', done: false },
  { id: 2, n: 'Poulet fermier', cat: 'Viande', q: '1kg', done: false },
  { id: 3, n: 'Quinoa', cat: 'Épicerie', q: '500g', done: true },
  { id: 4, n: 'Avocats', cat: 'Fruits', q: '3', done: false },
];

export default function CoursesScreen({ navigation }) {
  const theme = useKiraTheme();
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ n: '', q: '1', cat: CATEGORIES[0] });
  const [recetteDuJour, setRecetteDuJour] = useState(null); // LOT 77
  const [suggestion, setSuggestion] = useState(null); // LOT 92 — { recette, source } | null
  const [suggestionEnCours, setSuggestionEnCours] = useState(false);
  const [suggestionErreur, setSuggestionErreur] = useState(null);

  // BUGFIX : l'ancienne condition (`c && c.length ? c : DEFAULT_COURSES`) traitait une
  // liste vidée par l'utilisateur (tableau vide, donc "length" à 0) comme une absence de
  // données, et réaffichait à tort les articles d'exemple. On ne retombe sur la liste de
  // démo QUE si la donnée stockée n'est pas un tableau du tout (premier lancement ou
  // donnée corrompue) — une liste vide reste une liste vide.
  useFocusEffect(
    useCallback(() => {
      getData('courses').then(c => setItems(Array.isArray(c) ? c : DEFAULT_COURSES));
      // LOT 77 : recharge aussi le menu du jour à chaque passage sur l'écran,
      // pour rester à jour si le module Cuisine vient d'être régénéré.
      getData(CLE_CACHE_RECETTES).then(cache => {
        const dateAujourdhui = new Date().toLocaleDateString('fr-FR');
        if (cache && cache.date === dateAujourdhui && Array.isArray(cache.recettes)) {
          const plat = cache.recettes.find(r => r.type === 'Plat') || cache.recettes[0];
          setRecetteDuJour(plat || null);
        } else {
          setRecetteDuJour(null);
        }
      });
    }, [])
  );

  const persist = async list => {
    setItems(list);
    await setData('courses', list);
  };

  // LOT 92 — suggère une recette à partir de ce qui est déjà coché comme
  // acheté, à l'inverse du flux habituel (recette du jour → liste de
  // courses). Utile pour limiter le gaspillage : "j'ai déjà ça, qu'est-ce
  // que je peux en faire ?"
  const demanderSuggestionRecette = async () => {
    const itemsCoches = items.filter(i => i.done);
    if (itemsCoches.length === 0) return;

    setSuggestionEnCours(true);
    setSuggestionErreur(null);
    setSuggestion(null);
    try {
      const [profil, keys, provider] = await Promise.all([
        getData('profil'), getAllApiKeys(), getActiveAiProvider(),
      ]);
      const appState = { profil: profil || {}, kiraState: 'flow' };
      const { recette, source, erreur } = await suggererRecetteDepuisCourses(itemsCoches, appState, provider, keys || {});
      if (erreur || !recette) {
        setSuggestionErreur("Impossible de trouver une suggestion pour l'instant.");
      } else {
        setSuggestion({ recette, source });
      }
    } catch (e) {
      setSuggestionErreur('Une erreur est survenue, réessaie dans un instant.');
    }
    setSuggestionEnCours(false);
  };

  const toggleItem = id => {
    persist(items.map(i => (i.id === id ? { ...i, done: !i.done } : i)));
  };

  const removeItem = id => {
    persist(items.filter(i => i.id !== id));
  };

  const addItem = () => {
    if (!newItem.n.trim()) return;
    persist([...items, { id: Date.now(), ...newItem, done: false }]);
    setNewItem({ n: '', q: '1', cat: CATEGORIES[0] });
    setShowAdd(false);
  };

  const addQuick = name => {
    persist([...items, { id: Date.now() + Math.random(), n: name, cat: 'Épicerie', q: '1', done: false }]);
  };

  const clearDone = () => {
    persist(items.filter(i => !i.done));
  };

  const doneCount = items.filter(i => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // LOT 77 — CORRECTIF conseil Kira : construit un message qui dépend
  // vraiment de la recette du jour (module Cuisine) et de ce qui manque
  // dans la liste, au lieu du texte fixe précédent.
  const conseilKira = (() => {
    if (!recetteDuJour) {
      return "Va d'abord voir le menu du jour dans Cuisine 🍳 — je pourrai te dire ce qu'il te manque pour le préparer.";
    }
    const manquants = (recetteDuJour.ingredients || []).filter(ing => !ingredientDejaDansListe(ing, items));
    if (manquants.length === 0) {
      return `Tout est déjà dans ta liste pour "${recetteDuJour.titre}" de ce soir. 👍`;
    }
    return `Pour "${recetteDuJour.titre}" de ce soir, il te faudra ${manquants.join(', ')}. Tout est dans ta liste ?`;
  })();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🛒 Liste de courses</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Progression */}
        <View style={[styles.progressCard, { borderColor: PALETTE.green + '30' }]}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{doneCount}/{total} articles</Text>
            <Text style={{ fontSize: 12, color: doneCount === total && total > 0 ? PALETTE.teal : '#888899' }}>
              {doneCount === total && total > 0 ? '🎉 Terminé !' : `${pct}%`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: PALETTE.green }]} />
          </View>
          {doneCount > 0 && (
            <TouchableOpacity onPress={clearDone} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>🗑 Supprimer les articles cochés ({doneCount})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Liste */}
        {items.map(item => (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              {
                opacity: item.done ? 0.5 : 1,
                borderColor: item.done ? 'rgba(255,255,255,0.04)' : PALETTE.green + '30',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => toggleItem(item.id)}
              style={[
                styles.checkbox,
                {
                  borderColor: item.done ? PALETTE.teal : PALETTE.green,
                  backgroundColor: item.done ? PALETTE.teal : 'transparent',
                },
              ]}
            >
              {item.done && <Text style={{ fontSize: 11, color: '#000' }}>✓</Text>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, item.done && { textDecorationLine: 'line-through', color: '#555566' }]}>
                {item.n}
              </Text>
              <Text style={styles.itemMeta}>{item.cat} · {item.q}</Text>
            </View>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Text style={styles.removeBtn}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Formulaire d'ajout */}
        {!showAdd ? (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: PALETTE.green + '40' }]}
            onPress={() => setShowAdd(true)}
          >
            <Text style={[styles.addBtnText, { color: PALETTE.green }]}>+ Ajouter un article</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { borderColor: PALETTE.green + '25' }]}>
            <TextInput
              style={styles.input}
              placeholder="Nom de l'article..."
              placeholderTextColor="#555566"
              value={newItem.n}
              onChangeText={t => setNewItem({ ...newItem, n: t })}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Quantité (ex: 2L, 500g, 3)"
              placeholderTextColor="#555566"
              value={newItem.q}
              onChangeText={t => setNewItem({ ...newItem, q: t })}
            />
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewItem({ ...newItem, cat: c })}
                  style={[
                    styles.catChip,
                    {
                      borderColor: newItem.cat === c ? PALETTE.green : 'rgba(255,255,255,0.1)',
                      backgroundColor: newItem.cat === c ? PALETTE.green + '22' : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 10, color: newItem.cat === c ? PALETTE.green : '#666677' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: PALETTE.green }]} onPress={addItem}>
                <Text style={styles.formBtnTextPrimary}>Ajouter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                onPress={() => setShowAdd(false)}
              >
                <Text style={styles.formBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Suggestions rapides */}
        <View style={{ marginTop: 18 }}>
          <SectionLabel>Suggestions rapides</SectionLabel>
          <View style={styles.suggRow}>
            {SUGGESTIONS_RAPIDES.map(s => (
              <TouchableOpacity key={s} onPress={() => addQuick(s)} style={styles.suggChip}>
                <Text style={{ color: PALETTE.green, fontSize: 11 }}>+ {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Conseil Kira */}
        <View style={[styles.coachBox, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '10' }]}>
          <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira suggère :</Text>
          <Text style={styles.coachText}>{conseilKira}</Text>
        </View>

        {/* LOT 92 — À l'inverse du conseil ci-dessus (recette du jour → ce
            qui manque), suggère une recette à partir de ce qui est DÉJÀ
            coché comme acheté — pour limiter le gaspillage. */}
        {items.some(i => i.done) && !suggestion && (
          <TouchableOpacity
            style={[styles.suggestionBtn, { borderColor: PALETTE.teal + '40', backgroundColor: PALETTE.teal + '15' }]}
            onPress={demanderSuggestionRecette}
            disabled={suggestionEnCours}
          >
            {suggestionEnCours
              ? <ActivityIndicator color={PALETTE.teal} size="small" />
              : <Text style={{ color: PALETTE.teal, fontSize: 12, fontWeight: '600' }}>🍳 Une recette avec ce que j'ai déjà acheté ?</Text>}
          </TouchableOpacity>
        )}

        {suggestionErreur && <Text style={styles.suggestionErreur}>{suggestionErreur}</Text>}

        {suggestion && (
          <View style={[styles.suggestionCard, { borderColor: PALETTE.teal + '30' }]}>
            <View style={styles.suggestionHeader}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: PALETTE.teal, letterSpacing: 0.8 }}>
                {(suggestion.recette.type || 'RECETTE').toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setSuggestion(null)}>
                <Text style={{ color: '#888', fontSize: 12 }}>✕ Fermer</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.suggestionTitre}>{suggestion.recette.titre}</Text>
            <View style={styles.suggestionMeta}>
              <Text style={styles.suggestionMetaTag}>⏱ {suggestion.recette.temps}</Text>
              <Text style={styles.suggestionMetaTag}>📊 {suggestion.recette.difficulte}</Text>
            </View>

            <Text style={[styles.coachLabel, { color: PALETTE.teal, marginTop: 12 }]}>Ingrédients</Text>
            {(suggestion.recette.ingredients || []).map((ing, i) => {
              const dejaCoche = ingredientDejaDansListe(ing, items.filter(it => it.done));
              return (
                <Text key={i} style={[styles.suggestionIngredient, dejaCoche && { color: PALETTE.teal }]}>
                  {dejaCoche ? '✓ ' : '• '}{ing}
                </Text>
              );
            })}

            <Text style={[styles.coachLabel, { color: PALETTE.teal, marginTop: 12 }]}>Préparation</Text>
            {(suggestion.recette.etapes || []).map((etape, i) => (
              <Text key={i} style={styles.suggestionIngredient}>{i + 1}. {etape}</Text>
            ))}

            {suggestion.recette.conseil && (
              <Text style={[styles.coachText, { marginTop: 10, fontStyle: 'italic' }]}>🌟 {suggestion.recette.conseil}</Text>
            )}
          </View>
        )}

        <Text style={styles.comingSoon}>
          💡 Dis ou écris "Kira, ajoute du lait" dans le chat, et je l'ajoute directement à ta liste.
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
  progressCard: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  clearBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'rgba(255,101,132,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,101,132,0.25)',
    alignItems: 'center',
  },
  clearBtnText: { color: PALETTE.pink, fontSize: 12, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 7,
    borderWidth: 1,
  },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, color: '#fff', fontWeight: '600' },
  itemMeta: { fontSize: 10, color: '#444455', marginTop: 2 },
  removeBtn: { color: '#333344', fontSize: 18 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 6 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: {
    backgroundColor: 'rgba(52,211,153,0.07)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9,
    color: '#fff',
    fontSize: 13,
    padding: 10,
    marginBottom: 8,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  formActions: { flexDirection: 'row', gap: 8 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  formBtnTextPrimary: { color: '#000', fontWeight: '700', fontSize: 13 },
  formBtnText: { color: '#888899', fontSize: 13 },
  suggRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  coachBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 16 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc' },
  suggestionBtn: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 12, alignItems: 'center' },
  suggestionErreur: { color: PALETTE.pink, fontSize: 12, marginTop: 12, textAlign: 'center' },
  suggestionCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestionTitre: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 4 },
  suggestionMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  suggestionMetaTag: { fontSize: 11, color: '#999' },
  suggestionIngredient: { fontSize: 12.5, color: '#ccc', lineHeight: 19 },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
