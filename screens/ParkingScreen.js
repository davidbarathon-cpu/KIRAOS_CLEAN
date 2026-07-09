// ═══════════════════════════════════════════
//  PARKINGSCREEN.JS — Module Parking
//  MISE À JOUR LOT 42 : position GPS réelle
//  (expo-location) + carte interactive sombre
//  (react-native-maps) + bouton "Me guider"
//  qui ouvre Google Maps en itinéraire piéton.
// ═══════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, SectionLabel } from '../components/Shared';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const DEFAULT_PARKING = {
  adresse: 'Rue Victor Hugo, 47300 Villeneuve-sur-Lot',
  heureArrivee: '14:30',
  dureeHeures: 2,
  note: 'Parking gratuit, 2h max',
  actif: true,
  lat: null,
  lng: null,
};

// Style de carte sombre (Google Maps "night mode") pour rester cohérent
// avec le thème Cosmos du reste de l'application.
const CARTE_SOMBRE = [
  { elementType: 'geometry', stylers: [{ color: '#0e0e1e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e1e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c0c0e0' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a8a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14251c' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1c2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0e0e1e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a45' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1c1c2e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050510' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a4a6a' }] },
];

function calculerMinutesRestantes(heureArrivee, dureeHeures) {
  const [h, m] = heureArrivee.split(':').map(Number);
  const arrivee = new Date();
  arrivee.setHours(h, m, 0, 0);
  const expiration = new Date(arrivee.getTime() + dureeHeures * 60 * 60 * 1000);
  const maintenant = new Date();
  const diffMs = expiration - maintenant;
  return Math.round(diffMs / 60000);
}

function formatHeureExpiration(heureArrivee, dureeHeures) {
  const [h, m] = heureArrivee.split(':').map(Number);
  const total = h * 60 + m + dureeHeures * 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

/**
 * Distance à vol d'oiseau entre deux points GPS (formule de Haversine).
 * Retourne une distance en mètres.
 */
function calculerDistanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000; // rayon de la Terre en mètres
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(metres) {
  if (metres === null || metres === undefined) return null;
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export default function ParkingScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [parking, setParking] = useState(DEFAULT_PARKING);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(DEFAULT_PARKING);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);
  const [distanceMetres, setDistanceMetres] = useState(null);
  const [actualisationDistance, setActualisationDistance] = useState(false);

  useEffect(() => {
    getData('parking').then(p => {
      const data = p || DEFAULT_PARKING;
      setParking(data);
      setForm(data);
    });
  }, []);

  // Recalcule automatiquement la distance jusqu'à la voiture à chaque
  // fois qu'on revient sur cet écran (si une position GPS est enregistrée).
  useFocusEffect(
    useCallback(() => {
      if (parking.actif && parking.lat && parking.lng) {
        actualiserDistance();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parking.actif, parking.lat, parking.lng])
  );

  const save = async () => {
    const updated = { ...form, actif: true };
    setParking(updated);
    await setData('parking', updated);
    setEditing(false);
  };

  const clearParking = async () => {
    const cleared = { ...parking, actif: false };
    setParking(cleared);
    await setData('parking', cleared);
    setDistanceMetres(null);
  };

  /**
   * Demande la permission de localisation puis récupère la position GPS
   * actuelle du téléphone pour pré-remplir automatiquement l'adresse et
   * les coordonnées du formulaire — c'est ce qui alimente ensuite la
   * carte et le bouton "Me guider".
   */
  const utiliserPositionActuelle = async () => {
    setLocalisationEnCours(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          "Autorise l'accès à la position dans les réglages Android pour que Kira puisse enregistrer automatiquement l'endroit où tu te gares."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;

      let adresseTexte = form.adresse;
      try {
        const [lieu] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (lieu) {
          adresseTexte = [lieu.streetNumber, lieu.street, lieu.postalCode, lieu.city].filter(Boolean).join(' ');
        }
      } catch {
        // La géolocalisation inversée peut échouer (pas de réseau...) —
        // on garde alors l'adresse déjà saisie, les coordonnées restent utiles.
      }

      setForm(f => ({ ...f, lat: latitude, lng: longitude, adresse: adresseTexte || f.adresse }));
    } catch (e) {
      Alert.alert('Erreur de localisation', e.message || "Impossible de récupérer ta position pour le moment.");
    } finally {
      setLocalisationEnCours(false);
    }
  };

  /**
   * Recalcule la distance entre la position actuelle du téléphone et la
   * voiture garée, sans modifier la position enregistrée de la voiture.
   */
  const actualiserDistance = async () => {
    if (!parking.lat || !parking.lng) return;
    setActualisationDistance(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const d = calculerDistanceMetres(position.coords.latitude, position.coords.longitude, parking.lat, parking.lng);
      setDistanceMetres(d);
    } catch {
      // Pas bloquant : on affiche simplement pas de distance si ça échoue.
    } finally {
      setActualisationDistance(false);
    }
  };

  /**
   * Ouvre Google Maps avec un itinéraire piéton jusqu'à la voiture. Si on
   * n'a pas de coordonnées GPS enregistrées (ancienne position saisie à la
   * main avant ce lot), on retombe sur une recherche par adresse.
   */
  const guiderVersVoiture = () => {
    const url = parking.lat && parking.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${parking.lat},${parking.lng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parking.adresse)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', "Impossible d'ouvrir Google Maps. Vérifie qu'il est bien installé sur ton téléphone.");
    });
  };

  const minutesRestantes = parking.actif
    ? calculerMinutesRestantes(parking.heureArrivee, parking.dureeHeures)
    : null;
  const heureExpiration = formatHeureExpiration(parking.heureArrivee, parking.dureeHeures);
  const urgence = minutesRestantes !== null && minutesRestantes < 30;
  const aUnePositionGPS = !!(parking.lat && parking.lng);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🅿️ Parking</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {parking.actif ? (
          <View style={[styles.parkCard, { borderColor: PALETTE.cyan + '30' }]}>
            <View style={styles.parkHeader}>
              <Text style={{ fontSize: 32 }}>🚗</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.parkTitle}>Voiture garée</Text>
                <Text style={[styles.parkAdresse, { color: PALETTE.cyan }]}>{parking.adresse}</Text>
              </View>
            </View>

            {/* Carte interactive réelle si on a une position GPS, sinon message d'invitation */}
            {aUnePositionGPS ? (
              <View style={styles.mapWrap}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  customMapStyle={CARTE_SOMBRE}
                  initialRegion={{
                    latitude: parking.lat,
                    longitude: parking.lng,
                    latitudeDelta: 0.006,
                    longitudeDelta: 0.006,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  onPress={guiderVersVoiture}
                >
                  <Marker coordinate={{ latitude: parking.lat, longitude: parking.lng }} pinColor={PALETTE.cyan} />
                </MapView>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={{ fontSize: 30 }}>🗺️</Text>
                <Text style={styles.mapPlaceholderText}>
                  Appuie sur "✏️ Modifier" puis "📍 Utiliser ma position actuelle"{'\n'}pour afficher la carte ici.
                </Text>
              </View>
            )}

            {aUnePositionGPS && (
              <View style={styles.distanceRow}>
                <Text style={styles.distanceText}>
                  {distanceMetres !== null ? `📏 Environ ${formatDistance(distanceMetres)} de ta position` : '📏 Distance inconnue'}
                </Text>
                <TouchableOpacity onPress={actualiserDistance} disabled={actualisationDistance}>
                  {actualisationDistance ? (
                    <ActivityIndicator color={PALETTE.cyan} size="small" />
                  ) : (
                    <Text style={{ color: PALETTE.cyan, fontSize: 16 }}>🔄</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={{ fontSize: 16 }}>⏰</Text>
                <Text style={styles.statLabel}>Garée à</Text>
                <Text style={[styles.statValue, { color: PALETTE.cyan }]}>{parking.heureArrivee}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={{ fontSize: 16 }}>⏱️</Text>
                <Text style={styles.statLabel}>Expire à</Text>
                <Text style={[styles.statValue, { color: PALETTE.cyan }]}>{heureExpiration}</Text>
              </View>
            </View>

            <View
              style={[
                styles.timerBox,
                { backgroundColor: urgence ? 'rgba(255,101,132,0.15)' : 'rgba(34,211,238,0.1)', borderColor: urgence ? 'rgba(255,101,132,0.3)' : 'rgba(34,211,238,0.2)' },
              ]}
            >
              <Text style={{ color: urgence ? PALETTE.pink : PALETTE.cyan, fontWeight: '600', fontSize: 13 }}>
                {minutesRestantes > 0 ? `Il reste environ ${minutesRestantes} minutes` : '⚠️ Ticket expiré !'}
              </Text>
            </View>

            <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
              <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
              <Text style={styles.coachText}>
                Je te rappellerai 15 minutes avant l'expiration pour éviter l'amende
                {urgence ? ' — c\'est maintenant !' : '.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.guideBtn, { backgroundColor: PALETTE.cyan }]}
              onPress={guiderVersVoiture}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>🧭 Me guider jusqu'à ma voiture</Text>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: PALETTE.cyan + '15', borderColor: PALETTE.cyan + '30' }]}
                onPress={() => { setForm(parking); setEditing(true); }}
              >
                <Text style={{ color: PALETTE.cyan, fontSize: 12, fontWeight: '600' }}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(255,101,132,0.15)', borderColor: 'rgba(255,101,132,0.3)' }]}
                onPress={clearParking}
              >
                <Text style={{ color: PALETTE.pink, fontSize: 12, fontWeight: '600' }}>🗑 Effacer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🚗</Text>
            <Text style={styles.emptyText}>Aucune position de stationnement enregistrée.</Text>
            <TouchableOpacity
              style={[styles.addParkBtn, { backgroundColor: PALETTE.cyan }]}
              onPress={() => { setForm({ ...DEFAULT_PARKING, heureArrivee: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }); setEditing(true); }}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>+ Enregistrer ma position</Text>
            </TouchableOpacity>
          </View>
        )}

        {editing && (
          <View style={[styles.editForm, { borderColor: PALETTE.cyan + '25' }]}>
            <TouchableOpacity
              style={[styles.gpsBtn, { backgroundColor: PALETTE.cyan + '18', borderColor: PALETTE.cyan + '44' }]}
              onPress={utiliserPositionActuelle}
              disabled={localisationEnCours}
            >
              {localisationEnCours ? (
                <ActivityIndicator color={PALETTE.cyan} size="small" />
              ) : (
                <Text style={{ color: PALETTE.cyan, fontWeight: '700', fontSize: 13 }}>📍 Utiliser ma position actuelle</Text>
              )}
            </TouchableOpacity>
            {form.lat && form.lng && (
              <Text style={styles.gpsOk}>✅ Position GPS enregistrée — la carte et le guidage seront disponibles.</Text>
            )}

            <SectionLabel style={{ marginTop: 14 }}>Adresse de stationnement</SectionLabel>
            <TextInput
              style={styles.input}
              placeholder="Adresse..."
              placeholderTextColor="#555566"
              value={form.adresse}
              onChangeText={t => setForm({ ...form, adresse: t })}
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Heure d'arrivée</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14:30"
                  placeholderTextColor="#555566"
                  value={form.heureArrivee}
                  onChangeText={t => setForm({ ...form, heureArrivee: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Durée (heures)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor="#555566"
                  keyboardType="numeric"
                  value={String(form.dureeHeures)}
                  onChangeText={t => setForm({ ...form, dureeHeures: parseFloat(t) || 0 })}
                />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Note (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Parking gratuit, 2h max"
              placeholderTextColor="#555566"
              value={form.note}
              onChangeText={t => setForm({ ...form, note: t })}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: PALETTE.cyan }]} onPress={save}>
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                onPress={() => setEditing(false)}
              >
                <Text style={{ color: '#888899', fontSize: 13 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
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
  parkCard: { backgroundColor: 'rgba(34,211,238,0.06)', borderRadius: 14, padding: 14, borderWidth: 1 },
  parkHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  parkTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  parkAdresse: { fontSize: 11, marginTop: 2 },
  mapWrap: { height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  map: { flex: 1 },
  mapPlaceholder: {
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  mapPlaceholderText: { fontSize: 10, color: '#444455', textAlign: 'center', marginTop: 6, lineHeight: 14 },
  distanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 2 },
  distanceText: { fontSize: 11, color: '#aab', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#666677', marginTop: 3 },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  timerBox: { padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, marginBottom: 12 },
  coachBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
  guideBtn: { padding: 13, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, padding: 11, borderRadius: 11, borderWidth: 1, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, color: '#555566', marginBottom: 16, textAlign: 'center' },
  addParkBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99 },
  editForm: { backgroundColor: 'rgba(34,211,238,0.07)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 14 },
  gpsBtn: { padding: 12, borderRadius: 11, borderWidth: 1, alignItems: 'center' },
  gpsOk: { fontSize: 10, color: PALETTE.teal, marginTop: 8, textAlign: 'center' },
  fieldLabel: { fontSize: 10, color: '#888899', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9,
    color: '#fff',
    fontSize: 13,
    padding: 10,
  },
  row2: { flexDirection: 'row', gap: 8 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  formBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' },
});
