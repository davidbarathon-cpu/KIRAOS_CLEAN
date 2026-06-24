// ═══════════════════════════════════════════
//  HOROSCOPESCREEN.JS — Module Horoscope
//  Lié à Kira : le signe choisi ici influence
//  la façon dont Kira perçoit "l'humeur du jour"
//  de l'utilisateur (utilisé dans kiraBrain.js)
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BackButton, Chip, SectionLabel } from '../components/Shared';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const SIGNES = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];

export const HOROSCOPE_DATA = {
  'Bélier': { i: '♈', desc: 'Journée propice aux initiatives. Ton énergie attire les opportunités.', lucky: '7, 21', color: PALETTE.pink, element: 'Feu' },
  'Taureau': { i: '♉', desc: 'La patience sera ton alliée. Un projet prend forme lentement mais sûrement.', lucky: '4, 18', color: PALETTE.teal, element: 'Terre' },
  'Gémeaux': { i: '♊', desc: 'Ta créativité est à son apogée. Profite-en pour tes projets artistiques.', lucky: '3, 14', color: PALETTE.orange, element: 'Air' },
  'Cancer': { i: '♋', desc: 'Les émotions sont vives. Prends soin de toi et de tes proches.', lucky: '2, 11', color: PALETTE.blue, element: 'Eau' },
  'Lion': { i: '♌', desc: 'Ton charisme rayonne. C\'est le moment de te mettre en avant. Une reconnaissance arrive.', lucky: '1, 19', color: '#FBBF24', element: 'Feu' },
  'Vierge': { i: '♍', desc: 'L\'organisation sera la clé. Tes efforts minutieux portent leurs fruits.', lucky: '5, 22', color: PALETTE.green, element: 'Terre' },
  'Balance': { i: '♎', desc: 'L\'harmonie est au cœur de ta journée. Des compromis constructifs sont possibles.', lucky: '6, 15', color: PALETTE.violet, element: 'Air' },
  'Scorpion': { i: '♏', desc: 'Ton intuition est affûtée. Fais confiance à tes ressentis profonds.', lucky: '8, 23', color: PALETTE.orange, element: 'Eau' },
  'Sagittaire': { i: '♐', desc: 'L\'aventure t\'appelle ! Une découverte intellectuelle ou physique s\'annonce.', lucky: '9, 17', color: '#F97316', element: 'Feu' },
  'Capricorne': { i: '♑', desc: 'La persévérance paie enfin. Un objectif à long terme est à portée de main.', lucky: '10, 26', color: PALETTE.purple, element: 'Terre' },
  'Verseau': { i: '♒', desc: 'Ton originalité fait la différence. Une idée innovante te distingue.', lucky: '11, 20', color: PALETTE.cyan, element: 'Air' },
  'Poissons': { i: '♓', desc: 'Ta sensibilité artistique est exacerbée. Crée, chante, dessine !', lucky: '12, 24', color: PALETTE.magenta, element: 'Eau' },
};

export default function HoroscopeScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [tab, setTab] = useState('today'); // today | signe
  const [signe, setSigne] = useState('Lion');

  useEffect(() => {
    getData('profil').then(p => {
      if (p && p.signe) setSigne(p.signe);
    });
  }, []);

  const selectSigne = async s => {
    setSigne(s);
    const profil = (await getData('profil')) || {};
    await setData('profil', { ...profil, signe: s });
  };

  const h = HOROSCOPE_DATA[signe] || HOROSCOPE_DATA['Lion'];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>✨ Horoscope</Text>
      </View>

      <View style={styles.tabRow}>
        {[{ id: 'today', l: "Aujourd'hui" }, { id: 'signe', l: 'Mon signe' }].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && { borderBottomColor: PALETTE.magenta, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={{ color: tab === t.id ? '#fff' : '#666677', fontSize: 12, fontWeight: tab === t.id ? '600' : '400' }}>
              {t.l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {tab === 'today' ? (
          <View>
            <View style={styles.signeHeader}>
              <Text style={styles.signeIcon}>{h.i}</Text>
              <Text style={styles.signeName}>{signe}</Text>
              <View style={styles.chipsRow}>
                <Chip label={h.element} color={h.color} />
                <Chip label={`Chance : ${h.lucky}`} color={PALETTE.orange} />
              </View>
            </View>

            <View style={[styles.descBox, { backgroundColor: h.color + '12', borderColor: h.color + '33' }]}>
              <Text style={styles.descText}>{h.desc}</Text>
            </View>

            <View style={styles.domainsGrid}>
              {[
                ['❤️', 'Amour', '⭐⭐⭐⭐'],
                ['💼', 'Travail', '⭐⭐⭐'],
                ['💰', 'Finances', '⭐⭐⭐⭐⭐'],
              ].map(([icon, label, stars]) => (
                <View key={label} style={styles.domainBox}>
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                  <Text style={styles.domainLabel}>{label}</Text>
                  <Text style={[styles.domainStars, { color: h.color }]}>{stars}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.coachBox, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '10' }]}>
              <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
              <Text style={styles.coachText}>
                Je tiens compte de ton signe ({signe}) pour adapter mon ton et mes suggestions
                aujourd'hui. Les énergies du {signe} favorisent particulièrement l'expression
                artistique — bon moment pour une session guitare !
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <SectionLabel>Choisis ton signe astrologique</SectionLabel>
            <View style={styles.signesGrid}>
              {SIGNES.map(s => {
                const sh = HOROSCOPE_DATA[s];
                const active = signe === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => selectSigne(s)}
                    style={[
                      styles.signeChip,
                      {
                        borderColor: active ? sh.color : 'rgba(255,255,255,0.08)',
                        backgroundColor: active ? sh.color + '22' : 'rgba(255,255,255,0.03)',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{sh.i}</Text>
                    <Text style={{ fontSize: 12, color: active ? '#fff' : '#666677' }}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.comingSoon}>
              Ce choix est partagé avec ton profil et utilisé par Kira dans ses conversations.
            </Text>
          </View>
        )}
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
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  signeHeader: { alignItems: 'center', paddingVertical: 16 },
  signeIcon: { fontSize: 64, marginBottom: 8 },
  signeName: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  descBox: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  descText: { fontSize: 13, color: '#e0e0e8', lineHeight: 21 },
  domainsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  domainBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, alignItems: 'center' },
  domainLabel: { fontSize: 11, color: '#888899', marginTop: 4 },
  domainStars: { fontSize: 9, marginTop: 3 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  signesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  signeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 2 },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 18, lineHeight: 16 },
});
