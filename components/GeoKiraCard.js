// ═══════════════════════════════════════════
//  GEOKIRACARD.JS — LOT 54
//  Carte autonome insérée dans ParametresScreen → section Kira.
//  Isolée dans son propre composant pour ne pas avoir à toucher
//  tout le fichier ParametresScreen.js (risque de casser les
//  correctifs récents des lots 50-53).
// ═══════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { PALETTE } from '../utils/theme';
import { Toggle } from './Shared';
import { getData } from '../utils/storage';
import { listerTousLesAppareils } from '../utils/domotiqueDrivers';
import {
  getDomicile, getGeoKiraActif, getRayonGeoKira, setRayonGeoKira,
  demanderPermissionsGeoKira, verifierPermissionsGeoKira,
  demarrerGeoKira, arreterGeoKira, getPositionActuelleCommeAdresse,
  getSceneArrivee, setSceneArrivee,
  getSceneActiveArrivee, setSceneActiveArrivee, // LOT 65
} from '../utils/geoKira';

// LOT 65 : ajout d'un rayon plus fin (50m) — un rayon de 100-200m déborde
// souvent sur la rue devant chez soi pour une maison standard, ce qui
// déclenchait Géo-Kira au simple passage plutôt qu'à une vraie arrivée.
const RAYONS = [50, 100, 200, 500];

export default function GeoKiraCard({ accent }) {
  const [domicile, setDomicileState] = useState(null);
  const [actif, setActif] = useState(false);
  const [rayon, setRayon] = useState(200);
  const [chargementPosition, setChargementPosition] = useState(false);
  const [chargementActivation, setChargementActivation] = useState(false);
  const [permissionsOk, setPermissionsOk] = useState(true);
  const [appareilsDisponibles, setAppareilsDisponibles] = useState([]); // LOT 57
  const [sceneArrivee, setSceneArriveeState] = useState([]); // LOT 57
  const [sceneActive, setSceneActiveState] = useState(false); // LOT 65 — opt-in, false par défaut

  const charger = async () => {
    const [d, a, r, p, sa] = await Promise.all([
      getDomicile(), getGeoKiraActif(), getRayonGeoKira(), verifierPermissionsGeoKira(),
      getSceneActiveArrivee(),
    ]);
    setDomicileState(d);
    setActif(a);
    setRayon(r);
    setPermissionsOk(p);
    setSceneActiveState(sa);

    // LOT 57 — charge les appareils domotique dispo + la scène déjà choisie
    const driversActifs = (await getData('domotique_drivers_actifs')) || ['demo'];
    const [appareils, scene] = await Promise.all([
      listerTousLesAppareils(driversActifs),
      getSceneArrivee(),
    ]);
    setAppareilsDisponibles(appareils);
    setSceneArriveeState(scene);
  };

  useEffect(() => { charger(); }, []);

  const enregistrerPositionActuelle = async () => {
    setChargementPosition(true);
    const { position, erreur } = await getPositionActuelleCommeAdresse();
    setChargementPosition(false);
    if (erreur) {
      Alert.alert('Erreur', erreur);
      return;
    }
    const { setDomicile } = await import('../utils/geoKira');
    await setDomicile(position.lat, position.lng, position.adresse);
    setDomicileState(position);
    Alert.alert('✅ Domicile enregistré', position.adresse || 'Position enregistrée.');
    if (actif) {
      // Redémarre la surveillance avec la nouvelle position si déjà active
      await demarrerGeoKira();
    }
  };

  const changerRayon = async r => {
    setRayon(r);
    await setRayonGeoKira(r);
    if (actif) await demarrerGeoKira();
  };

  // LOT 57 — ajoute/retire un appareil de la scène d'arrivée
  const toggleAppareilScene = async appareil => {
    const dejaDedans = sceneArrivee.some(a => a.driverId === appareil.driverId && a.id === appareil.id);
    const misAJour = dejaDedans
      ? sceneArrivee.filter(a => !(a.driverId === appareil.driverId && a.id === appareil.id))
      : [...sceneArrivee, { driverId: appareil.driverId, id: appareil.id, nom: appareil.nom }];
    setSceneArriveeState(misAJour);
    await setSceneArrivee(misAJour);
  };

  // LOT 65 — active/désactive explicitement la scène domotique automatique
  // (opt-in, séparé du choix des appareils ci-dessous).
  const toggleSceneActive = async v => {
    setSceneActiveState(v);
    await setSceneActiveArrivee(v);
  };

  const toggleActif = async v => {
    if (v) {
      if (!domicile) {
        Alert.alert('Domicile requis', "Enregistre d'abord la position de ton domicile ci-dessus.");
        return;
      }
      setChargementActivation(true);
      const permissions = await demanderPermissionsGeoKira();
      if (!permissions.accordee) {
        setChargementActivation(false);
        Alert.alert('Permission nécessaire', permissions.message);
        return;
      }
      const { succes, erreur } = await demarrerGeoKira();
      setChargementActivation(false);
      if (!succes) {
        Alert.alert('Erreur', `Impossible d'activer Géo-Kira : ${erreur}`);
        return;
      }
      setActif(true);
      setPermissionsOk(true);
    } else {
      setChargementActivation(true);
      await arreterGeoKira();
      setChargementActivation(false);
      setActif(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: accent + '25' }]}>
      <Text style={styles.desc}>
        Kira te souhaite la bienvenue par notification dès que tu approches de chez toi — même
        téléphone verrouillé, sans consommer la batterie comme un GPS actif en continu.
      </Text>

      <View style={styles.domicileRow}>
        <Text style={{ fontSize: 18 }}>🏠</Text>
        <Text style={styles.domicileTexte} numberOfLines={2}>
          {domicile ? (domicile.adresse || `${domicile.lat.toFixed(5)}, ${domicile.lng.toFixed(5)}`) : 'Aucun domicile enregistré'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]}
        onPress={enregistrerPositionActuelle}
        disabled={chargementPosition}
      >
        {chargementPosition
          ? <ActivityIndicator color={accent} size="small" />
          : <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>📍 Utiliser ma position actuelle comme domicile</Text>}
      </TouchableOpacity>

      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Rayon de détection</Text>
      <Text style={styles.desc}>
        Choisis le rayon le plus petit qui couvre bien ta maison, sans déborder sur la rue ou
        chez les voisins — un rayon trop large déclenche Kira dès que tu passes à proximité,
        pas seulement quand tu t'arrêtes vraiment chez toi.
      </Text>
      <View style={styles.rayonRow}>
        {RAYONS.map(r => (
          <TouchableOpacity
            key={r}
            onPress={() => changerRayon(r)}
            style={[
              styles.rayonBtn,
              { borderColor: rayon === r ? accent : 'rgba(255,255,255,0.1)', backgroundColor: rayon === r ? accent + '22' : 'transparent' },
            ]}
          >
            <Text style={{ color: rayon === r ? accent : '#666677', fontSize: 12 }}>{r} m</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Activer Géo-Kira</Text>
        {chargementActivation ? <ActivityIndicator color={accent} size="small" /> : <Toggle value={actif} onChange={toggleActif} color={accent} />}
      </View>

      {!permissionsOk && actif && (
        <Text style={styles.permissionWarning}>
          ⚠️ Permission de localisation en arrière-plan manquante — réactive le switch pour la redemander.
        </Text>
      )}

      <Text style={styles.desc}>
        💡 Depuis le lot 65 : la notification "Bon retour" attend 2 minutes avant de
        s'afficher, et s'annule automatiquement si tu ressors entre-temps — un simple
        passage devant chez toi ne devrait donc plus déclencher Kira.
      </Text>

      {/* ── LOT 57 : Scène d'arrivée ── */}
      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>🏠 Scène d'arrivée (optionnel)</Text>
      <Text style={styles.desc}>
        Ces appareils peuvent s'allumer automatiquement dès que tu rentres à la maison.
        Choisis-les ci-dessous, PUIS active l'interrupteur "Activer la scène automatique" —
        elle reste désactivée tant que tu ne l'as pas explicitement allumée, même si des
        appareils sont cochés. Un délai minimum de 30 min entre deux déclenchements est aussi
        appliqué automatiquement, pour éviter que ça s'allume trop souvent.
      </Text>
      {appareilsDisponibles.length === 0 ? (
        <Text style={styles.desc}>
          Aucun appareil domotique configuré pour l'instant — active un driver dans le module
          Domotique pour pouvoir en choisir ici.
        </Text>
      ) : (
        appareilsDisponibles.map(a => {
          const inclus = sceneArrivee.some(s => s.driverId === a.driverId && s.id === a.id);
          return (
            <View key={`${a.driverId}-${a.id}`} style={styles.appareilRow}>
              <Text style={{ fontSize: 15 }}>{a.driverIcon}</Text>
              <Text style={styles.appareilNom} numberOfLines={1}>{a.nom}</Text>
              <Toggle value={inclus} onChange={() => toggleAppareilScene(a)} color={accent} />
            </View>
          );
        })
      )}

      <View style={[styles.toggleRow, sceneArrivee.length === 0 && { opacity: 0.4 }]} pointerEvents={sceneArrivee.length === 0 ? 'none' : 'auto'}>
        <Text style={styles.toggleLabel}>⚡ Activer la scène automatique</Text>
        <Toggle value={sceneActive} onChange={toggleSceneActive} color={accent} />
      </View>
      {sceneActive && (
        <Text style={[styles.desc, { color: accent, marginTop: 8 }]}>
          Scène active — les appareils cochés ci-dessus s'allumeront à chaque arrivée
          confirmée (avec un minimum de 30 min entre deux déclenchements).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  desc: { fontSize: 11, color: '#888899', lineHeight: 16, marginBottom: 12 },
  domicileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10, marginBottom: 10 },
  domicileTexte: { flex: 1, fontSize: 12, color: '#ccc' },
  btn: { padding: 11, borderRadius: 10, alignItems: 'center' },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 },
  rayonRow: { flexDirection: 'row', gap: 8 },
  rayonBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, borderWidth: 1, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  toggleLabel: { fontSize: 13, color: '#ccc' },
  permissionWarning: { fontSize: 10, color: PALETTE.pink, marginTop: 10, lineHeight: 14 },
  appareilRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  appareilNom: { flex: 1, fontSize: 12, color: '#ccc' },
});
