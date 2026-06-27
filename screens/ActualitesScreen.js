// ═══════════════════════════════════════════
//  ACTUALITESSCREEN.JS — Module Actualités
//  MISE À JOUR LOT 11 :
//  - Combine NewsAPI + GNews (fournisseurs activables séparément)
//  - Article complet affiché DANS l'app via WebView (plus de sortie navigateur)
//  - Icône Kira dans le header
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { BackButton, Chip, KiraHeaderIcon } from '../components/Shared';
import { getActualitesProvidersActifs, getAllApiKeys } from '../utils/apiKeys';
import { getActualites } from '../utils/newsCaller';
import { getTheme, PALETTE } from '../utils/theme';

const CATEGORIES = ['Tout', 'Tech', 'Santé', 'Sport', 'Musique', 'Environnement', 'Culture'];

export default function ActualitesScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [filtre, setFiltre] = useState('Tout');
  const [expanded, setExpanded] = useState(null);
  const [articles, setArticles] = useState([]);
  const [source, setSource] = useState(null);
  const [erreurs, setErreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providersActifs, setProvidersActifs] = useState([]);
  const [articleOuvert, setArticleOuvert] = useState(null); // article dont on affiche la WebView

  const charger = useCallback(async (cat = filtre) => {
    const [keys, providers] = await Promise.all([getAllApiKeys(), getActualitesProvidersActifs()]);
    setProvidersActifs(providers);
    const { articles: arts, source: src, erreurs: errs } = await getActualites(cat, providers, keys);
    setArticles(arts);
    setSource(src);
    setErreurs(errs || []);
    setLoading(false);
    setRefreshing(false);
  }, [filtre]);

  useEffect(() => { charger(filtre); }, [filtre]);
  useFocusEffect(useCallback(() => { charger(filtre); }, [filtre]));

  const onRefresh = () => {
    setRefreshing(true);
    charger(filtre);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>📰 Actualités</Text>
        <KiraHeaderIcon size={28} color={theme.accent} onPress={() => navigation.navigate('KiraChat')} />
        {source === 'live' && <Text style={styles.liveTag}>🟢</Text>}
      </View>

      {providersActifs.length === 0 && (
        <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('Parametres')}>
          <Text style={styles.setupBannerText}>
            💡 Aucun fournisseur d'actualités activé. Configure NewsAPI et/ou GNews dans Paramètres → 🔑 API →
          </Text>
        </TouchableOpacity>
      )}
      {source === 'non_configure' && providersActifs.length > 0 && (
        <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('Parametres')}>
          <Text style={styles.setupBannerText}>
            💡 Articles de démonstration — ajoute tes clés API pour les fournisseurs activés →
          </Text>
        </TouchableOpacity>
      )}
      {source === 'vide' && (
        <View style={styles.setupBanner}>
          <Text style={styles.setupBannerText}>
            ℹ️ Aucun article récent trouvé pour "{filtre}" auprès de tes fournisseurs — articles
            de démonstration affichés à la place. Essaie une autre catégorie ou reviens plus tard.
          </Text>
        </View>
      )}
      {erreurs.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {erreurs.join(' · ').slice(0, 100)}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtresRow} style={styles.filtresScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filtreChip, { backgroundColor: filtre === cat ? PALETTE.violet : 'rgba(255,255,255,0.06)', borderColor: filtre === cat ? PALETTE.violet : 'rgba(255,255,255,0.08)' }]}
            onPress={() => setFiltre(cat)}
          >
            <Text style={{ color: filtre === cat ? '#000' : '#888899', fontSize: 11, fontWeight: filtre === cat ? '700' : '400' }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} size="large" />
          <Text style={{ color: '#666677', marginTop: 12, fontSize: 12 }}>Chargement des actualités...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contenuScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        >
          <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
            <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira — Synthèse</Text>
            <Text style={styles.coachText}>
              {source === 'live'
                ? `${articles.length} articles trouvés via ${providersActifs.join(' + ')}. Appuie sur "Lire l'article complet" pour le voir sans quitter l'app !`
                : "Configure NewsAPI et/ou GNews pour des actualités toujours à jour."}
            </Text>
          </View>

          {articles.map((a, i) => (
            <View key={a.id ?? i} style={[styles.actuCard, { borderColor: a.c + '22', borderLeftColor: a.c }]}>
              <TouchableOpacity onPress={() => setExpanded(expanded === (a.id ?? i) ? null : (a.id ?? i))} activeOpacity={0.85}>
                <View style={styles.actuHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actuTitle}>{a.t}</Text>
                  </View>
                  <Chip label={a.cat} color={a.c} />
                </View>
                {expanded === (a.id ?? i) ? (
                  <View>
                    <Text style={styles.actuResume}>{a.r}</Text>
                    <View style={styles.actuFooter}>
                      <Text style={styles.actuSrc}>{a.src}{a.fournisseur ? ` · via ${a.fournisseur}` : ''}</Text>
                      {a.url && (
                        <TouchableOpacity onPress={() => setArticleOuvert(a)}>
                          <Text style={[styles.actuLien, { color: theme.accent }]}>Lire l'article complet →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.actuSrcSmall}>{a.src} · Appuie pour lire</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}

          {articles.length === 0 && <Text style={styles.emptyText}>Aucun article trouvé pour cette catégorie.</Text>}
        </ScrollView>
      )}

      {/* ── Modal WebView : affiche l'article complet SANS quitter l'app ── */}
      <Modal visible={!!articleOuvert} animationType="slide" onRequestClose={() => setArticleOuvert(null)}>
        <View style={[styles.webviewHeader, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => setArticleOuvert(null)} style={styles.webviewCloseBtn}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.webviewTitle} numberOfLines={1}>{articleOuvert?.src}</Text>
        </View>
        {articleOuvert && (
          <WebView
            source={{ uri: articleOuvert.url }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator color={theme.accent} size="large" />
              </View>
            )}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  liveTag: { fontSize: 12 },
  setupBanner: { backgroundColor: 'rgba(108,99,255,0.1)', paddingHorizontal: 16, paddingVertical: 10 },
  setupBannerText: { fontSize: 10, color: '#aaa', lineHeight: 15 },
  errorBanner: { backgroundColor: 'rgba(255,101,132,0.12)', paddingHorizontal: 16, paddingVertical: 10 },
  errorBannerText: { fontSize: 10, color: PALETTE.pink, lineHeight: 15 },
  filtresScroll: { flexGrow: 0, flexShrink: 0 },
  filtresRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  contenuScroll: { flex: 1 },
  filtreChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1, marginBottom: 14 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  actuCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1, borderLeftWidth: 3 },
  actuHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  actuTitle: { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18, flex: 1 },
  actuResume: { fontSize: 12, color: '#aaa', lineHeight: 18, marginTop: 4 },
  actuFooter: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actuSrc: { fontSize: 10, color: '#555566' },
  actuLien: { fontSize: 11, fontWeight: '600' },
  actuSrcSmall: { fontSize: 10, color: '#444455' },
  emptyText: { fontSize: 13, color: '#555566', textAlign: 'center', marginTop: 30 },
  webviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14 },
  webviewCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  webviewTitle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#05050f' },
});
