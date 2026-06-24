// ═══════════════════════════════════════════
//  TRADUCTIONSCREEN.JS — Module Traduction
//  MISE À JOUR LOT 11 :
//  - Choix du fournisseur (DeepL, LibreTranslate, MyMemory)
//  - Russe ajouté aux langues disponibles
//  - Icône Kira dans le header
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackButton, KiraHeaderIcon } from '../components/Shared';
import { getActiveTraductionProvider, getAllApiKeys, setActiveTraductionProvider, TRADUCTION_PROVIDERS } from '../utils/apiKeys';
import { getTheme, PALETTE } from '../utils/theme';
import { traduireTexte } from '../utils/translationCaller';

const LANGUES = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 Anglais' },
  { code: 'es', label: '🇪🇸 Espagnol' },
  { code: 'de', label: '🇩🇪 Allemand' },
  { code: 'it', label: '🇮🇹 Italien' },
  { code: 'pt', label: '🇵🇹 Portugais' },
  { code: 'ja', label: '🇯🇵 Japonais' },
  { code: 'zh', label: '🇨🇳 Chinois' },
  { code: 'ru', label: '🇷🇺 Russe' },
];

export default function TraductionScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [texteSource, setTexteSource] = useState('');
  const [texteResult, setTexteResult] = useState('');
  const [resultSource, setResultSource] = useState(null);
  const [langSource, setLangSource] = useState('fr');
  const [langCible, setLangCible] = useState('en');
  const [loading, setLoading] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(null);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [providerActif, setProviderActif] = useState('deepl');
  const [apiKeys, setApiKeys] = useState({});

  useEffect(() => {
    (async () => {
      const [keys, provider] = await Promise.all([getAllApiKeys(), getActiveTraductionProvider()]);
      setApiKeys(keys || {});
      setProviderActif(provider);
    })();
  }, []);

  const traduire = async () => {
    if (!texteSource.trim()) return;
    setLoading(true);
    const { texte, source, providerUtilise } = await traduireTexte(texteSource, langSource, langCible, providerActif, apiKeys.deepl);
    setTexteResult(texte);
    setResultSource(source);
    setLoading(false);
  };

  const inverser = () => {
    const tmp = langSource;
    setLangSource(langCible);
    setLangCible(tmp);
    setTexteSource(resultSource === 'live' ? texteResult : texteSource);
    setTexteResult('');
    setResultSource(null);
  };

  const choisirProvider = async id => {
    setProviderActif(id);
    await setActiveTraductionProvider(id);
    setShowProviderPicker(false);
  };

  const labelLang = code => LANGUES.find(l => l.code === code)?.label || code;
  const providerInfo = TRADUCTION_PROVIDERS.find(p => p.id === providerActif) || TRADUCTION_PROVIDERS[0];
  const providerPretACetreUtilise = !providerInfo.necessiteCle || !!apiKeys[providerInfo.id];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🌍 Traduction</Text>
        <KiraHeaderIcon size={28} color={theme.accent} onPress={() => navigation.navigate('KiraChat')} />
      </View>

      {/* ── Sélecteur de fournisseur ── */}
      <TouchableOpacity style={styles.providerBanner} onPress={() => setShowProviderPicker(!showProviderPicker)}>
        <Text style={{ fontSize: 16 }}>{providerInfo.icon}</Text>
        <Text style={styles.providerBannerText}>
          Fournisseur : <Text style={{ fontWeight: '700', color: '#fff' }}>{providerInfo.nom}</Text>
        </Text>
        <Text style={{ color: theme.accent, fontSize: 11 }}>{showProviderPicker ? '▲' : '▼ Changer'}</Text>
      </TouchableOpacity>

      {showProviderPicker && (
        <View style={[styles.providerPicker, { borderColor: theme.accent + '25' }]}>
          {TRADUCTION_PROVIDERS.map(p => {
            const disponible = !p.necessiteCle || !!apiKeys[p.id];
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.providerOption, { borderColor: providerActif === p.id ? theme.accent : 'rgba(255,255,255,0.08)', backgroundColor: providerActif === p.id ? theme.accent + '15' : 'rgba(255,255,255,0.03)' }]}
                onPress={() => choisirProvider(p.id)}
              >
                <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerOptionName}>{p.nom}{!disponible ? ' (clé requise)' : ''}</Text>
                  <Text style={styles.providerOptionDesc}>{p.description}</Text>
                </View>
                {providerActif === p.id && <Text style={{ color: theme.accent }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          <Text style={styles.providerPickerNote}>
            💡 LibreTranslate et MyMemory ne demandent aucune clé — utilisables tout de suite.
          </Text>
        </View>
      )}

      {!providerPretACetreUtilise && (
        <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('Parametres')}>
          <Text style={styles.setupBannerText}>💡 Configure ta clé {providerInfo.nom} dans Paramètres → 🔑 API →</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.langRow}>
          <TouchableOpacity style={[styles.langBtn, { borderColor: theme.accent + '40', backgroundColor: theme.accent + '10' }]} onPress={() => setShowLangPicker(showLangPicker === 'source' ? null : 'source')}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{labelLang(langSource)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.invertBtn} onPress={inverser}>
            <Text style={{ color: theme.accent, fontSize: 18 }}>⇄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, { borderColor: theme.accent + '40', backgroundColor: theme.accent + '10' }]} onPress={() => setShowLangPicker(showLangPicker === 'cible' ? null : 'cible')}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{labelLang(langCible)}</Text>
          </TouchableOpacity>
        </View>

        {showLangPicker && (
          <View style={[styles.langPicker, { borderColor: theme.accent + '25' }]}>
            <Text style={styles.langPickerTitle}>{showLangPicker === 'source' ? 'Langue source' : 'Langue cible'}</Text>
            <View style={styles.langGrid}>
              {LANGUES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langOption, { backgroundColor: (showLangPicker === 'source' ? langSource : langCible) === l.code ? theme.accent + '22' : 'rgba(255,255,255,0.04)', borderColor: (showLangPicker === 'source' ? langSource : langCible) === l.code ? theme.accent : 'rgba(255,255,255,0.08)' }]}
                  onPress={() => { if (showLangPicker === 'source') setLangSource(l.code); else setLangCible(l.code); setShowLangPicker(null); }}
                >
                  <Text style={{ fontSize: 12, color: '#fff' }}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.textBox, { borderColor: theme.accent + '25' }]}>
          <TextInput
            style={styles.textInput}
            placeholder={`Texte en ${labelLang(langSource)}...`}
            placeholderTextColor="#555566"
            value={texteSource}
            onChangeText={setTexteSource}
            multiline
            textAlignVertical="top"
          />
          {texteSource.length > 0 && (
            <TouchableOpacity onPress={() => { setTexteSource(''); setTexteResult(''); setResultSource(null); }} style={styles.clearBtn}>
              <Text style={{ color: '#555566', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.traduireBtn, { backgroundColor: theme.accent, opacity: texteSource.trim() ? 1 : 0.4 }]} onPress={traduire} disabled={!texteSource.trim() || loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Traduire →</Text>}
        </TouchableOpacity>

        {texteResult ? (
          <View style={[styles.resultBox, resultSource === 'erreur' || resultSource === 'non_configure' ? { borderColor: PALETTE.pink + '30', backgroundColor: PALETTE.pink + '08' } : { borderColor: PALETTE.teal + '30', backgroundColor: PALETTE.teal + '08' }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultLang, resultSource === 'live' && { color: PALETTE.teal }]}>{resultSource === 'live' ? labelLang(langCible) : 'Information'}</Text>
              {resultSource === 'live' && <Text style={styles.liveTag}>🟢 {providerInfo.nom}</Text>}
            </View>
            <Text style={styles.resultText}>{texteResult}</Text>
          </View>
        ) : null}

        <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
          <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
          <Text style={styles.coachText}>Tu peux aussi me demander dans le chat : "traduis bonjour en russe" et je m'en occupe directement !</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  providerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
  providerBannerText: { flex: 1, fontSize: 11, color: '#888899' },
  providerPicker: { margin: 16, marginTop: 0, padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  providerOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 7 },
  providerOptionName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  providerOptionDesc: { fontSize: 10, color: '#666677', marginTop: 1 },
  providerPickerNote: { fontSize: 10, color: '#444455', marginTop: 4, lineHeight: 14 },
  setupBanner: { backgroundColor: 'rgba(108,99,255,0.1)', paddingHorizontal: 16, paddingVertical: 10 },
  setupBannerText: { fontSize: 11, color: '#aaa', lineHeight: 16 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  langBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  invertBtn: { padding: 8 },
  langPicker: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  langPickerTitle: { fontSize: 11, color: '#888899', marginBottom: 10, fontWeight: '600' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  langOption: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  textBox: { borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, marginBottom: 10, minHeight: 110 },
  textInput: { color: '#fff', fontSize: 14, lineHeight: 20, minHeight: 80 },
  clearBtn: { alignSelf: 'flex-end', padding: 4 },
  traduireBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 14 },
  resultBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultLang: { fontSize: 10, color: '#888899', fontWeight: '600' },
  liveTag: { fontSize: 9, color: PALETTE.green, fontWeight: '700' },
  resultText: { fontSize: 14, color: '#e0e0e8', lineHeight: 20 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1, marginBottom: 14 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
});
