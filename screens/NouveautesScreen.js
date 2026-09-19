// ═══════════════════════════════════════════
//  NOUVEAUTESSCREEN.JS — LOT 85
//  Petit journal des nouveautés de l'app, pour ne pas perdre le fil de
//  tout ce qui a été ajouté au fil des lots.
// ═══════════════════════════════════════════

import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton } from '../components/Shared';
import { marquerNouveautesCommeVues, NOUVEAUTES } from '../utils/nouveautes';
import { PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

export default function NouveautesScreen({ navigation }) {
  const theme = useKiraTheme();

  // Marque tout comme vu dès l'ouverture de l'écran — pas besoin d'action
  // supplémentaire de David, le badge disparaît simplement une fois qu'il a
  // jeté un œil à la liste.
  useEffect(() => { marquerNouveautesCommeVues(); }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🆕 Nouveautés</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.intro}>Ce qui a changé dans Kira OS récemment :</Text>
        {NOUVEAUTES.map((n, i) => (
          <View key={n.lot} style={[styles.carte, { borderColor: theme.accent + '22' }, i === 0 && { borderColor: theme.accent + '50' }]}>
            <View style={styles.carteHeader}>
              <Text style={{ fontSize: 20 }}>{n.icon}</Text>
              <Text style={styles.carteTitre}>{n.titre}</Text>
            </View>
            <Text style={styles.carteDesc}>{n.description}</Text>
          </View>
        ))}
        <Text style={styles.finListe}>C'est tout pour l'instant — reviens bientôt 👋</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  intro: { color: '#999', fontSize: 13, marginBottom: 16 },
  carte: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  carteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  carteTitre: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  carteDesc: { color: '#ccc', fontSize: 12.5, lineHeight: 19 },
  finListe: { color: '#555566', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
