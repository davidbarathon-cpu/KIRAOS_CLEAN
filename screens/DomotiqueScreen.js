// ═══════════════════════════════════════════
//  DOMOTIQUESCREEN.JS — Module Domotique
//  MISE À JOUR LOT 14 : architecture par drivers
//  génériques. Affiche les appareils de TOUS les
//  drivers activés, peu importe la marque. Pour
//  l'instant : driver Démo (toujours actif) +
//  driver Philips Hue (réel, à configurer si tu as
//  le matériel).
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackButton, KiraHeaderIcon, SectionLabel, Toggle } from '../components/Shared';
import { DRIVERS_DISPONIBLES, getDriver, listerTousLesAppareils } from '../utils/domotiqueDrivers';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const ICON_PAR_TYPE = { lumiere: '💡', prise: '🔌', thermostat: '🌡️', volet: '🪟', autre: '🏠' };

export default function DomotiqueScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [driversActifs, setDriversActifs] = useState(['demo']);
  const [appareils, setAppareils] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [reglageEnCours, setReglageEnCours] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    const actifs = (await getData('domotique_drivers_actifs')) || ['demo'];
    setDriversActifs(actifs);
    const liste = await listerTousLesAppareils(actifs);
    setAppareils(liste);
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, []);
  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const toggleAppareil = async appareil => {
    const driver = getDriver(appareil.driverId);
    if (!driver) return;
    setReglageEnCours(appareil.id);

    const action = appareil.etat === 'allume' ? driver.eteindre : driver.allumer;
    const { succes, erreur } = await action(appareil.id);

    if (!succes) {
      Alert.alert('Erreur', erreur || "Impossible d'agir sur cet appareil.");
    } else {
      await charger();
    }
    setReglageEnCours(null);
  };

  const driversConfigurables = DRIVERS_DISPONIBLES.filter(d => d.necessiteConfig);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🏠 Domotique</Text>
        <KiraHeaderIcon size={28} color={theme.accent} onPress={() => navigation.navigate('KiraChat')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
          <Text style={[styles.coachLabel, { color: '#94A3B8' }]}>🌟 Kira</Text>
          <Text style={styles.coachText}>
            L'app est prête pour plusieurs écosystèmes domotique. Active le driver Démo pour
            tester l'interface, ou configure Philips Hue si tu as un Bridge chez toi.
          </Text>
        </View>

        {/* ── Appareils (de tous les drivers actifs combinés) ── */}
        <SectionLabel style={{ marginTop: 16 }}>Mes appareils</SectionLabel>
        {chargement ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
        ) : appareils.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun appareil trouvé. Active un driver ci-dessous pour commencer.
          </Text>
        ) : (
          appareils.map(a => (
            <View key={`${a.driverId}-${a.id}`} style={[styles.deviceCard, { borderColor: a.etat === 'allume' ? PALETTE.yellow + '33' : 'rgba(255,255,255,0.05)' }]}>
              <View style={[styles.deviceIcon, { backgroundColor: a.etat === 'allume' ? PALETTE.yellow + '20' : 'rgba(255,255,255,0.05)' }]}>
                <Text style={{ fontSize: 18 }}>{ICON_PAR_TYPE[a.type] || '🏠'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{a.nom}</Text>
                <Text style={styles.deviceMeta}>
                  {a.driverIcon} {a.driverNom}{a.valeur !== null && a.valeur !== undefined ? ` · ${a.valeur}${a.type === 'thermostat' ? '°C' : '%'}` : ''}
                </Text>
              </View>
              {reglageEnCours === a.id ? (
                <ActivityIndicator color={theme.accent} size="small" />
              ) : (
                <Toggle value={a.etat === 'allume'} onChange={() => toggleAppareil(a)} color={PALETTE.yellow} />
              )}
            </View>
          ))
        )}

        {/* ── Drivers disponibles ── */}
        <SectionLabel style={{ marginTop: 22 }}>Écosystèmes disponibles</SectionLabel>
        {DRIVERS_DISPONIBLES.map(driver => {
          const actif = driversActifs.includes(driver.id);
          return (
            <View key={driver.id} style={[styles.driverCard, { borderColor: actif ? PALETTE.green + '30' : 'rgba(255,255,255,0.06)' }]}>
              <Text style={{ fontSize: 22 }}>{driver.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{driver.nom}</Text>
                <Text style={styles.driverDesc}>{driver.description}</Text>
              </View>
              <Toggle
                value={actif}
                onChange={async v => {
                  const updated = v ? [...driversActifs, driver.id] : driversActifs.filter(d => d !== driver.id);
                  setDriversActifs(updated);
                  await setData('domotique_drivers_actifs', updated);
                  charger();
                }}
                color={PALETTE.green}
              />
            </View>
          );
        })}

        {driversConfigurables.length > 0 && (
          <TouchableOpacity style={[styles.configBtn, { borderColor: theme.accent + '40' }]} onPress={() => navigation.navigate('Parametres')}>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>⚙️ Configurer Philips Hue dans les Paramètres →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.comingSoon}>
          🚧 D'autres écosystèmes (TP-Link Kasa, Tuya/Smart Life, Home Assistant) pourront
          être ajoutés dans de prochains lots grâce à cette architecture par drivers — sans
          rien casser de ce qui existe déjà.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  deviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  deviceIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  deviceName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  deviceMeta: { fontSize: 11, color: '#666677', marginTop: 2 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  driverName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  driverDesc: { fontSize: 11, color: '#666677', marginTop: 2, lineHeight: 15 },
  configBtn: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 18, lineHeight: 16 },
});
