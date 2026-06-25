// ═══════════════════════════════════════════
//  METEOSCREEN.JS — Module Météo
//  MISE À JOUR LOT 6 : connexion réelle à
//  OpenWeatherMap. Si aucune clé n'est configurée
//  dans les Paramètres, données de démo affichées
//  avec un bandeau explicite.
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getAllApiKeys } from '../utils/apiKeys';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';
import { getMeteoReelle } from '../utils/weatherCaller';
import { getPhaseLunaireActuelle, getProchainesPhasesPrincipales } from '../utils/moonPhase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function getWeatherEffect(condition) {
  const c = (condition || '').toLowerCase();
  if (c.includes('pluie') || c.includes('orage')) return 'rain';
  if (c.includes('neige') || c.includes('gel')) return 'frost';
  if (c.includes('vent')) return 'wind';
  if (c.includes('brouillard')) return 'fog';
  return 'none';
}

function RainEffect({ enabled }) {
  const drops = useRef(
    Array.from({ length: 18 }, () => ({
      x: Math.random() * SCREEN_W,
      anim: new Animated.Value(0),
      delay: Math.random() * 2000,
      duration: 1200 + Math.random() * 800,
    }))
  ).current;

  useEffect(() => {
    if (!enabled) return;
    const loops = drops.map(d => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(d.delay),
          Animated.timing(d.anim, { toValue: 1, duration: d.duration, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach(l => l.stop());
  }, [enabled]);

  if (!enabled) return null;

  return (
    <View style={styles.fxOverlay} pointerEvents="none">
      {drops.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.raindrop,
            {
              left: d.x,
              opacity: d.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.5, 0.3, 0] }),
              transform: [{ translateY: d.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, SCREEN_H * 0.4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function FrostEffect({ enabled }) {
  if (!enabled) return null;
  return (
    <View style={styles.fxOverlay} pointerEvents="none">
      <View style={[styles.frostCorner, { top: 0, left: 0 }]} />
      <View style={[styles.frostCorner, { top: 0, right: 0 }]} />
    </View>
  );
}

export default function MeteoScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [tab, setTab] = useState('now');
  const [fxEnabled, setFxEnabled] = useState(true);
  const [meteo, setMeteo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);

  const chargerMeteo = useCallback(async () => {
    setLoading(true);
    const [profil, prefs, keys] = await Promise.all([getData('profil'), getData('prefs'), getAllApiKeys()]);
    if (prefs && prefs.weatherFx !== undefined) setFxEnabled(prefs.weatherFx);

    const ville = profil?.ville || 'Villeneuve-sur-Lot';
    const apiKey = keys?.openweathermap;
    setHasApiKey(!!apiKey);

    const data = await getMeteoReelle(ville, apiKey);
    setMeteo(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { chargerMeteo(); }, [chargerMeteo]));

  const toggleFx = async () => {
    const newVal = !fxEnabled;
    setFxEnabled(newVal);
    const prefs = (await getData('prefs')) || {};
    await setData('prefs', { ...prefs, weatherFx: newVal });
  };

  if (loading || !meteo) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={{ color: '#666677', marginTop: 12, fontSize: 12 }}>Récupération de la météo...</Text>
      </View>
    );
  }

  const effect = getWeatherEffect(meteo.condition);
  // Calcul léger (pas d'appel réseau), recalculé à chaque rendu de l'écran.
  const phaseLuneActuelle = getPhaseLunaireActuelle();
  const prochainesPhases = getProchainesPhasesPrincipales();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {fxEnabled && effect === 'rain' && <RainEffect enabled={true} />}
      {fxEnabled && effect === 'frost' && <FrostEffect enabled={true} />}

      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>⛅ Météo</Text>
        <TouchableOpacity onPress={toggleFx} style={styles.fxToggle}>
          <Text style={{ fontSize: 11, color: fxEnabled ? PALETTE.blue : '#444455' }}>
            {fxEnabled ? '✨ Anim ON' : 'Anim OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bandeau d'état de connexion */}
      {meteo.source !== 'live' && (
        <View style={[styles.banner, meteo.source === 'erreur' ? styles.bannerError : styles.bannerDemo]}>
          <Text style={styles.bannerText}>
            {meteo.source === 'erreur'
              ? `⚠️ Erreur de connexion à OpenWeatherMap — données de démonstration affichées. (${meteo.erreurMessage?.slice(0, 80) || ''})`
              : '💡 Données de démonstration. Ajoute ta clé OpenWeatherMap dans Paramètres → Kira pour la météo réelle.'}
          </Text>
          {!hasApiKey && (
            <TouchableOpacity onPress={() => navigation.navigate('Parametres')}>
              <Text style={styles.bannerLink}>Configurer →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.tabRow}>
        {[{ id: 'now', l: 'Maintenant' }, { id: 'prevision', l: 'Prévisions' }, { id: 'lune', l: '🌙 Lune' }].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && { borderBottomColor: PALETTE.blue, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={{ color: tab === t.id ? '#fff' : '#666677', fontSize: 11, fontWeight: tab === t.id ? '600' : '400' }}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {tab === 'now' && (
          <View>
            <View style={styles.nowBox}>
              <Text style={styles.bigIcon}>{meteo.icon}</Text>
              <Text style={styles.bigTemp}>{meteo.temp}°</Text>
              <Text style={styles.condition}>{meteo.condition}</Text>
              <Text style={styles.location}>
                {meteo.ville} · {meteo.source === 'live' ? 'Données en direct' : 'Démo'}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              {[
                ['💧', 'Humidité', `${meteo.humidite}%`],
                ['💨', 'Vent', `${meteo.vent} km/h`],
                ['☀️', 'UV', `${meteo.uv}/10`],
              ].map(([icon, label, val]) => (
                <View key={label} style={[styles.statBox, { borderColor: PALETTE.blue + '25' }]}>
                  <Text style={{ fontSize: 20 }}>{icon}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={[styles.statValue, { color: PALETTE.blue }]}>{val}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.coachBox, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '10' }]}>
              <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira dit :</Text>
              <Text style={styles.coachText}>
                Avec {meteo.temp}°C et {meteo.condition.toLowerCase()}, les conditions sont
                {meteo.temp > 28 ? ' chaudes — pense à bien t\'hydrater si tu sors !' : ' bonnes pour sortir.'}
              </Text>
            </View>
          </View>
        )}

        {tab === 'prevision' && (
          <View>
            <SectionLabel>Prévisions {meteo.prevision.length} jours</SectionLabel>
            {meteo.prevision.map((j, i) => (
              <View key={i} style={styles.forecastRow}>
                <Text style={styles.forecastDay}>{j.j}</Text>
                <Text style={{ fontSize: 18 }}>{j.i}</Text>
                <View style={styles.forecastBarTrack}>
                  <View style={[styles.forecastBarFill, { width: `${Math.min((j.h / 35) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.forecastLow}>{j.l}°</Text>
                <Text style={styles.forecastHigh}>{j.h}°</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'lune' && (
          <View>
            <View style={styles.moonBox}>
              <Text style={styles.moonIcon}>{phaseLuneActuelle.icon}</Text>
              <Text style={styles.moonName}>{phaseLuneActuelle.nom}</Text>
              <Text style={styles.moonSub}>Lune illuminée à {phaseLuneActuelle.illumination}%</Text>
            </View>
            <View style={[styles.phasesBox, { borderColor: 'rgba(255,255,255,0.06)' }]}>
              {prochainesPhases.map((p, i) => (
                <View key={i} style={styles.phaseRow}>
                  <Text style={{ fontSize: 18 }}>{p.icon}</Text>
                  <Text style={styles.phaseName}>{p.nom}</Text>
                  <Text style={styles.phaseDate}>{p.date}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.comingSoon}>
              ⓘ Calcul astronomique réel (cycle synodique lunaire). Les heures précises de
              lever/coucher de lune dépendraient de ta position géographique exacte — non
              affichées pour rester fiables sans demander ta localisation.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  fxToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)' },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  bannerDemo: { backgroundColor: 'rgba(108,99,255,0.1)' },
  bannerError: { backgroundColor: 'rgba(255,101,132,0.12)' },
  bannerText: { flex: 1, fontSize: 10, color: '#aaa', lineHeight: 14 },
  bannerLink: { fontSize: 11, color: PALETTE.blue, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  nowBox: { alignItems: 'center', paddingVertical: 24 },
  bigIcon: { fontSize: 70 },
  bigTemp: { fontSize: 52, fontWeight: '800', color: '#fff' },
  condition: { fontSize: 14, color: '#aaa', marginTop: 4 },
  location: { fontSize: 11, color: '#444455', marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(79,195,247,0.08)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statLabel: { fontSize: 10, color: '#888899', marginTop: 4 },
  statValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  forecastDay: { width: 32, fontSize: 11, color: '#666677' },
  forecastBarTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  forecastBarFill: { height: '100%', backgroundColor: PALETTE.blue, borderRadius: 99 },
  forecastLow: { fontSize: 11, color: '#555566', width: 26, textAlign: 'right' },
  forecastHigh: { fontSize: 13, color: '#fff', fontWeight: '700', width: 30, textAlign: 'right' },
  moonBox: { alignItems: 'center', paddingVertical: 20 },
  moonIcon: { fontSize: 70, marginBottom: 8 },
  moonName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  moonSub: { fontSize: 12, color: '#666677', marginTop: 4 },
  phasesBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  phaseName: { flex: 1, fontSize: 12, color: '#ccc' },
  phaseDate: { fontSize: 11, color: '#555566' },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 16, lineHeight: 16 },
  fxOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, overflow: 'hidden' },
  raindrop: { position: 'absolute', width: 1.5, height: 14, backgroundColor: PALETTE.blue, top: 0, borderRadius: 1 },
  frostCorner: { position: 'absolute', width: 80, height: 80, backgroundColor: 'rgba(200,230,255,0.08)', borderRadius: 40 },
});
