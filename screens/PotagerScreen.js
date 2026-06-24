// ═══════════════════════════════════════════
//  POTAGERSCREEN.JS — Module Potager
//  MISE À JOUR LOT 9 : prise de photo réelle
//  (expo-image-picker, caméra ou galerie) +
//  analyse de plante par IA (Gemini/Claude).
// ═══════════════════════════════════════════

import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackButton, Chip, SectionLabel } from '../components/Shared';
import { AI_PROVIDERS, getActiveAiProvider, getAllApiKeys } from '../utils/apiKeys';
import { analyserPlante } from '../utils/plantAnalyzer';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const DEFAULT_PLANTES = [
  { id: 1, n: 'Tomates', icon: '🍅', eau: 'Élevé', prochain: 'Ce soir', c: PALETTE.pink, derniereAnalyse: null },
  { id: 2, n: 'Carottes', icon: '🥕', eau: 'Moyen', prochain: 'Demain', c: '#F97316', derniereAnalyse: null },
  { id: 3, n: 'Herbes aromatiques', icon: '🌿', eau: 'Faible', prochain: 'Dans 2j', c: PALETTE.green, derniereAnalyse: null },
];

const COULEUR_ETAT = {
  Excellent: PALETTE.green,
  Bon: PALETTE.teal,
  Moyen: PALETTE.orange,
  Préoccupant: PALETTE.pink,
};

const COULEUR_EAU = {
  Faible: PALETTE.green,
  Modéré: PALETTE.teal,
  Élevé: PALETTE.orange,
  Urgent: PALETTE.pink,
};

export default function PotagerScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [plantes, setPlantes] = useState([]);
  const [meteo] = useState({ temp: 22, humidite: 58 });
  const [photoUri, setPhotoUri] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreurAnalyse, setErreurAnalyse] = useState(null);
  const [providerActif, setProviderActif] = useState(null);

  useEffect(() => {
    getData('potager_plantes').then(p => setPlantes(p && p.length ? p : DEFAULT_PLANTES));
    getActiveAiProvider().then(setProviderActif);
  }, []);

  const persist = async list => {
    setPlantes(list);
    await setData('potager_plantes', list);
  };

  // ── Demande la permission et ouvre la caméra ──
  const prendrePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Autorise l'accès à la caméra dans les réglages Android pour utiliser cette fonctionnalité.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, // compression pour limiter la taille envoyée à l'IA
      base64: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      demarrerAnalyse(result.assets[0].uri);
    }
  };

  // ── Alternative : choisir une photo existante dans la galerie ──
  const choisirDansGalerie = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Autorise l'accès aux photos dans les réglages Android pour utiliser cette fonctionnalité.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]) {
      demarrerAnalyse(result.assets[0].uri);
    }
  };

  const demarrerAnalyse = async uri => {
    setPhotoUri(uri);
    setResultat(null);
    setErreurAnalyse(null);
    setAnalysing(true);

    const keys = await getAllApiKeys();
    const provider = await getActiveAiProvider();
    setProviderActif(provider);
    const providerInfo = AI_PROVIDERS.find(p => p.id === provider);
    const apiKey = provider ? keys[provider] : null;

    const { resultat: res, erreur, message } = await analyserPlante(uri, provider, apiKey, providerInfo?.modeleParDefaut);

    setAnalysing(false);
    if (erreur) {
      setErreurAnalyse(message);
    } else {
      setResultat(res);
    }
  };

  const enregistrerDansSuivi = () => {
    if (!resultat) return;
    const nouvellePlante = {
      id: Date.now(),
      n: resultat.type_plante,
      icon: '🌿',
      eau: resultat.besoin_eau,
      prochain: resultat.besoin_eau === 'Urgent' ? 'Maintenant !' : resultat.besoin_eau === 'Élevé' ? 'Ce soir' : 'Dans 2-3 jours',
      c: COULEUR_EAU[resultat.besoin_eau] || PALETTE.green,
      derniereAnalyse: new Date().toLocaleDateString('fr-FR'),
      derniereScore: resultat.score_sante,
    };
    persist([...plantes, nouvellePlante]);
    Alert.alert('✅ Ajoutée !', `${resultat.type_plante} a été ajoutée à tes plantes suivies.`);
    reinitialiserAnalyse();
  };

  const reinitialiserAnalyse = () => {
    setPhotoUri(null);
    setResultat(null);
    setErreurAnalyse(null);
  };

  const ouvrirChoixPhoto = () => {
    Alert.alert('Analyser une plante', 'Comment veux-tu fournir la photo ?', [
      { text: '📷 Prendre une photo', onPress: prendrePhoto },
      { text: '🖼️ Choisir dans la galerie', onPress: choisirDansGalerie },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🌱 Potager</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={[styles.coachBox, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '10' }]}>
          <Text style={[styles.coachLabel, { color: PALETTE.green }]}>🌟 Kira — Météo & Potager</Text>
          <Text style={styles.coachText}>
            Il fait {meteo.temp}°C aujourd'hui, humidité {meteo.humidite}%. Conseil : arrose tes
            tomates ce soir après 19h pour éviter l'évaporation. 🍅
          </Text>
        </View>

        {/* ── Zone d'analyse photo ── */}
        {!photoUri ? (
          <TouchableOpacity style={[styles.photoBox, { borderColor: PALETTE.green + '40' }]} onPress={ouvrirChoixPhoto} activeOpacity={0.85}>
            <Text style={styles.photoIcon}>📸</Text>
            <Text style={styles.photoTitle}>Analyse de plante par Kira</Text>
            <Text style={styles.photoDesc}>
              Prends une photo et Kira analysera l'état de santé, le type de plante, et te
              donnera des conseils d'arrosage, d'engrais ou de taille.
            </Text>
            <View style={[styles.photoBtn, { backgroundColor: PALETTE.green + '20', borderColor: PALETTE.green + '40' }]}>
              <Text style={{ color: PALETTE.green, fontSize: 12, fontWeight: '600' }}>📷 Analyser ma plante</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.analyseBox, { borderColor: theme.accent + '25' }]}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />

            {analysing && (
              <View style={styles.analysingBox}>
                <ActivityIndicator color={theme.accent} size="large" />
                <Text style={styles.analysingText}>
                  Kira analyse ta plante via {AI_PROVIDERS.find(p => p.id === providerActif)?.nom || '...'}
                </Text>
              </View>
            )}

            {erreurAnalyse && (
              <View style={styles.erreurBox}>
                <Text style={styles.erreurTitle}>⚠️ Analyse impossible</Text>
                <Text style={styles.erreurText}>{erreurAnalyse}</Text>
                {erreurAnalyse.includes('Paramètres') && (
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: theme.accent }]} onPress={() => navigation.navigate('Parametres')}>
                    <Text style={styles.smallBtnText}>Configurer →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {resultat && (
              <View style={styles.resultatBox}>
                <View style={styles.resultatHeader}>
                  <Text style={styles.resultatType}>{resultat.type_plante}</Text>
                  <View style={[styles.etatBadge, { backgroundColor: (COULEUR_ETAT[resultat.etat_sante] || PALETTE.green) + '22' }]}>
                    <Text style={{ color: COULEUR_ETAT[resultat.etat_sante] || PALETTE.green, fontSize: 11, fontWeight: '700' }}>
                      {resultat.etat_sante} · {resultat.score_sante}%
                    </Text>
                  </View>
                </View>

                <View style={styles.eauRow}>
                  <Text style={styles.eauLabel}>💧 Besoin en eau :</Text>
                  <Chip label={resultat.besoin_eau} color={COULEUR_EAU[resultat.besoin_eau] || PALETTE.blue} />
                </View>

                <Text style={styles.observationsLabel}>Observations</Text>
                <Text style={styles.observationsText}>{resultat.observations}</Text>

                <View style={[styles.conseilBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
                  <Text style={[styles.conseilLabel, { color: PALETTE.violet }]}>🌟 Conseil principal</Text>
                  <Text style={styles.conseilText}>{resultat.conseil_principal}</Text>
                </View>

                {resultat.conseils_secondaires?.length > 0 && (
                  <View style={styles.secondairesBox}>
                    {resultat.conseils_secondaires.map((c, i) => (
                      <Text key={i} style={styles.secondaireItem}>• {c}</Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: PALETTE.green }]} onPress={enregistrerDansSuivi}>
                  <Text style={styles.saveBtnText}>+ Ajouter à mes plantes suivies</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.recommencerBtn} onPress={reinitialiserAnalyse}>
              <Text style={styles.recommencerText}>← Nouvelle photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Liste des plantes suivies ── */}
        <SectionLabel style={{ marginTop: 18 }}>Mes plantes suivies</SectionLabel>
        {plantes.map(p => (
          <View key={p.id} style={[styles.planteCard, { borderColor: p.c + '22' }]}>
            <Text style={{ fontSize: 28 }}>{p.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.planteName}>{p.n}</Text>
              <Text style={styles.planteMeta}>Besoin en eau : {p.eau}</Text>
              <Text style={[styles.planteProchain, { color: p.c }]}>Prochain arrosage : {p.prochain}</Text>
              {p.derniereAnalyse && (
                <Chip label={`Analysé le ${p.derniereAnalyse}${p.derniereScore ? ` · ${p.derniereScore}%` : ''}`} color={PALETTE.violet} />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  coachBox: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 14 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  photoBox: { alignItems: 'center', padding: 22, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', marginBottom: 4 },
  photoIcon: { fontSize: 42, marginBottom: 10 },
  photoTitle: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 8 },
  photoDesc: { fontSize: 12, color: '#555566', textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  photoBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, borderWidth: 1 },
  analyseBox: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  photoPreview: { width: '100%', height: 220, backgroundColor: '#000' },
  analysingBox: { alignItems: 'center', padding: 24 },
  analysingText: { color: '#888899', fontSize: 12, marginTop: 12, textAlign: 'center' },
  erreurBox: { padding: 16, backgroundColor: 'rgba(255,101,132,0.08)' },
  erreurTitle: { fontSize: 13, fontWeight: '700', color: PALETTE.pink, marginBottom: 6 },
  erreurText: { fontSize: 12, color: '#ccc', lineHeight: 18, marginBottom: 10 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, alignSelf: 'flex-start' },
  smallBtnText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  resultatBox: { padding: 16 },
  resultatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  resultatType: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  etatBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  eauRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  eauLabel: { fontSize: 12, color: '#888899' },
  observationsLabel: { fontSize: 10, fontWeight: '700', color: '#666677', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  observationsText: { fontSize: 13, color: '#ccc', lineHeight: 19, marginBottom: 14 },
  conseilBox: { borderRadius: 12, padding: 13, borderWidth: 1, marginBottom: 10 },
  conseilLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  conseilText: { fontSize: 13, color: '#fff', lineHeight: 19 },
  secondairesBox: { marginBottom: 16 },
  secondaireItem: { fontSize: 12, color: '#aaa', lineHeight: 19, marginBottom: 2 },
  saveBtn: { padding: 13, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  recommencerBtn: { padding: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  recommencerText: { color: '#888899', fontSize: 12 },
  planteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  planteName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  planteMeta: { fontSize: 11, color: '#666677', marginTop: 2 },
  planteProchain: { fontSize: 11, marginTop: 1, fontWeight: '600' },
});
