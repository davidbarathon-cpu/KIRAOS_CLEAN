// ═══════════════════════════════════════════
//  GEOKIRACARD.JS — LOT 54, multi-lieux LOT 90
//  Carte autonome insérée dans ParametresScreen → section Kira.
//  Isolée dans son propre composant pour ne pas avoir à toucher
//  tout le fichier ParametresScreen.js.
//
//  LOT 90 — gère maintenant une LISTE de lieux (domicile, bureau, salle de
//  sport...) au lieu d'un seul domicile en dur. Chaque lieu a sa propre
//  position, son propre rayon, et ses propres scènes d'arrivée/départ —
//  présentés en accordéon (un seul déplié à la fois) pour ne pas rendre la
//  carte interminable avec plusieurs lieux.
// ═══════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { PALETTE } from '../utils/theme';
import { Toggle } from './Shared';
import { getData } from '../utils/storage';
import { listerTousLesAppareils } from '../utils/domotiqueDrivers';
import {
  getLieux, ajouterLieu, supprimerLieu, mettreAJourLieu,
  getGeoKiraActif, demanderPermissionsGeoKira, verifierPermissionsGeoKira,
  demarrerGeoKira, arreterGeoKira, getPositionActuelleCommeAdresse,
  RAYON_PAR_DEFAUT,
} from '../utils/geoKira';

// LOT 65 : ajout d'un rayon plus fin (50m) — un rayon de 100-200m déborde
// souvent sur la rue devant chez soi pour une maison standard, ce qui
// déclenchait Géo-Kira au simple passage plutôt qu'à une vraie arrivée.
const RAYONS = [50, 100, 200, 500];

// LOT 90 — icônes proposées pour un nouveau lieu (le domicile garde 🏠,
// géré séparément lors de la migration automatique).
const ICONES_LIEU = ['🏢', '💪', '🏫', '👪', '🎵', '📍'];

export default function GeoKiraCard({ accent }) {
  const [lieux, setLieuxState] = useState([]);
  const [actif, setActif] = useState(false);
  const [chargementActivation, setChargementActivation] = useState(false);
  const [permissionsOk, setPermissionsOk] = useState(true);
  const [appareilsDisponibles, setAppareilsDisponibles] = useState([]);
  const [lieuOuvertId, setLieuOuvertId] = useState(null);

  // ── Formulaire d'ajout d'un nouveau lieu ──
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauIcon, setNouveauIcon] = useState(ICONES_LIEU[0]);
  const [nouvellePosition, setNouvellePosition] = useState(null);
  const [chargementPosition, setChargementPosition] = useState(false);

  const charger = async () => {
    const [l, a, p] = await Promise.all([getLieux(), getGeoKiraActif(), verifierPermissionsGeoKira()]);
    setLieuxState(l);
    setActif(a);
    setPermissionsOk(p);
    setLieuOuvertId(prev => prev || (l[0]?.id ?? null));

    const driversActifs = (await getData('domotique_drivers_actifs')) || ['demo'];
    setAppareilsDisponibles(await listerTousLesAppareils(driversActifs));
  };

  useEffect(() => { charger(); }, []);

  const redemarrerSiActif = async () => {
    if (actif) await demarrerGeoKira();
  };

  // ── Capture de position pour le formulaire d'ajout ──
  const capturerPositionNouveauLieu = async () => {
    setChargementPosition(true);
    const { position, erreur } = await getPositionActuelleCommeAdresse();
    setChargementPosition(false);
    if (erreur) {
      Alert.alert('Erreur', erreur);
      return;
    }
    setNouvellePosition(position);
  };

  const annulerAjoutLieu = () => {
    setAjoutEnCours(false);
    setNouveauNom('');
    setNouveauIcon(ICONES_LIEU[0]);
    setNouvellePosition(null);
  };

  const confirmerAjoutLieu = async () => {
    if (!nouveauNom.trim()) {
      Alert.alert('Nom manquant', 'Donne un nom à ce lieu (ex : "Bureau").');
      return;
    }
    if (!nouvellePosition) {
      Alert.alert('Position manquante', "Appuie sur \"Utiliser ma position actuelle\" une fois sur place.");
      return;
    }
    const nouveau = await ajouterLieu({
      nom: nouveauNom.trim(),
      icon: nouveauIcon,
      lat: nouvellePosition.lat,
      lng: nouvellePosition.lng,
      adresse: nouvellePosition.adresse,
      rayon: RAYON_PAR_DEFAUT,
    });
    annulerAjoutLieu();
    await charger();
    setLieuOuvertId(nouveau.id);
    await redemarrerSiActif();
  };

  const confirmerSuppressionLieu = (id, nom) => {
    Alert.alert(
      `Supprimer "${nom}" ?`,
      'Ses scènes associées seront perdues. Géo-Kira arrêtera de le surveiller.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supprimerLieu(id);
            await charger();
            await redemarrerSiActif();
          },
        },
      ]
    );
  };

  // ── Mise à jour de la position d'un lieu existant ──
  const [chargementPositionLieu, setChargementPositionLieu] = useState(null); // id du lieu en cours de MAJ
  const mettreAJourPositionLieu = async (id, nom) => {
    setChargementPositionLieu(id);
    const { position, erreur } = await getPositionActuelleCommeAdresse();
    setChargementPositionLieu(null);
    if (erreur) {
      Alert.alert('Erreur', erreur);
      return;
    }
    await mettreAJourLieu(id, { lat: position.lat, lng: position.lng, adresse: position.adresse });
    await charger();
    Alert.alert('✅ Position mise à jour', `${nom} : ${position.adresse || 'position enregistrée.'}`);
    await redemarrerSiActif();
  };

  const changerRayon = async (id, r) => {
    await mettreAJourLieu(id, { rayon: r });
    setLieuxState(prev => prev.map(l => (l.id === id ? { ...l, rayon: r } : l)));
    await redemarrerSiActif();
  };

  // ── Scènes (arrivée/départ) d'un lieu — mêmes fonctions pour les deux
  // types, paramétrées par `champ` ('sceneArrivee' | 'sceneDepart'). ──
  const toggleAppareilScene = async (lieuId, champ, appareil) => {
    const lieu = lieux.find(l => l.id === lieuId);
    if (!lieu) return;
    const listeActuelle = lieu[champ] || [];
    const dejaDedans = listeActuelle.some(a => a.driverId === appareil.driverId && a.id === appareil.id);
    const misAJour = dejaDedans
      ? listeActuelle.filter(a => !(a.driverId === appareil.driverId && a.id === appareil.id))
      : [...listeActuelle, { driverId: appareil.driverId, id: appareil.id, nom: appareil.nom }];
    await mettreAJourLieu(lieuId, { [champ]: misAJour });
    setLieuxState(prev => prev.map(l => (l.id === lieuId ? { ...l, [champ]: misAJour } : l)));
  };

  const toggleSceneActive = async (lieuId, champ, valeur) => {
    await mettreAJourLieu(lieuId, { [champ]: valeur });
    setLieuxState(prev => prev.map(l => (l.id === lieuId ? { ...l, [champ]: valeur } : l)));
  };

  const toggleActif = async v => {
    if (v) {
      if (lieux.length === 0) {
        Alert.alert('Lieu requis', "Enregistre d'abord au moins un lieu (domicile, bureau...) ci-dessous.");
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

  // ── Rendu d'un bloc "scène" (arrivée OU départ) pour un lieu donné ──
  const renderScene = (lieu, type) => {
    const estArrivee = type === 'arrivee';
    const champListe = estArrivee ? 'sceneArrivee' : 'sceneDepart';
    const champActif = estArrivee ? 'sceneActiveArrivee' : 'sceneActiveDepart';
    const liste = lieu[champListe] || [];
    const actifScene = !!lieu[champActif];

    return (
      <View key={type}>
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
          {estArrivee ? "🏠 Scène d'arrivée (optionnel)" : '🚪 Scène de départ (optionnel)'}
        </Text>
        <Text style={styles.desc}>
          {estArrivee
            ? `Ces appareils peuvent s'allumer automatiquement dès l'arrivée à "${lieu.nom}". Coche-les, PUIS active l'interrupteur dédié — délai minimum 30 min entre deux déclenchements.`
            : `Ces appareils peuvent s'éteindre automatiquement en quittant "${lieu.nom}". Coche-les, PUIS active l'interrupteur dédié — délai minimum 10 min entre deux déclenchements.`}
        </Text>
        {appareilsDisponibles.length === 0 ? (
          <Text style={styles.desc}>
            Aucun appareil domotique configuré pour l'instant — active un driver dans le module
            Domotique pour pouvoir en choisir ici.
          </Text>
        ) : (
          appareilsDisponibles.map(a => {
            const inclus = liste.some(s => s.driverId === a.driverId && s.id === a.id);
            return (
              <View key={`${type}-${a.driverId}-${a.id}`} style={styles.appareilRow}>
                <Text style={{ fontSize: 15 }}>{a.driverIcon}</Text>
                <Text style={styles.appareilNom} numberOfLines={1}>{a.nom}</Text>
                <Toggle value={inclus} onChange={() => toggleAppareilScene(lieu.id, champListe, a)} color={accent} />
              </View>
            );
          })
        )}
        <View style={[styles.toggleRow, liste.length === 0 && { opacity: 0.4 }]} pointerEvents={liste.length === 0 ? 'none' : 'auto'}>
          <Text style={styles.toggleLabel}>⚡ Activer la scène {estArrivee ? "d'arrivée" : 'de départ'}</Text>
          <Toggle value={actifScene} onChange={v => toggleSceneActive(lieu.id, champActif, v)} color={accent} />
        </View>
        {actifScene && (
          <Text style={[styles.desc, { color: accent, marginTop: 8 }]}>
            Scène active pour "{lieu.nom}".
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.card, { borderColor: accent + '25' }]}>
      <Text style={styles.desc}>
        Kira te souhaite la bienvenue par notification dès que tu approches d'un lieu enregistré
        (domicile, bureau...) — même téléphone verrouillé, sans consommer la batterie comme un
        GPS actif en continu.
      </Text>

      {lieux.map(lieu => {
        const estOuvert = lieuOuvertId === lieu.id;
        return (
          <View key={lieu.id} style={[styles.lieuBloc, { borderColor: accent + '20' }]}>
            <TouchableOpacity style={styles.lieuHeader} onPress={() => setLieuOuvertId(estOuvert ? null : lieu.id)}>
              <Text style={{ fontSize: 18 }}>{lieu.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.lieuNom}>{lieu.nom}</Text>
                <Text style={styles.lieuAdresse} numberOfLines={1}>{lieu.adresse || `${lieu.lat.toFixed(5)}, ${lieu.lng.toFixed(5)}`}</Text>
              </View>
              <Text style={{ color: '#888', fontSize: 12 }}>{estOuvert ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {estOuvert && (
              <View style={styles.lieuDetail}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]}
                  onPress={() => mettreAJourPositionLieu(lieu.id, lieu.nom)}
                  disabled={chargementPositionLieu === lieu.id}
                >
                  {chargementPositionLieu === lieu.id
                    ? <ActivityIndicator color={accent} size="small" />
                    : <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>📍 Mettre à jour avec ma position actuelle</Text>}
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Rayon de détection</Text>
                <Text style={styles.desc}>
                  Choisis le plus petit rayon qui couvre bien "{lieu.nom}", sans déborder sur la
                  rue ou les environs.
                </Text>
                <View style={styles.rayonRow}>
                  {RAYONS.map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => changerRayon(lieu.id, r)}
                      style={[
                        styles.rayonBtn,
                        { borderColor: lieu.rayon === r ? accent : 'rgba(255,255,255,0.1)', backgroundColor: lieu.rayon === r ? accent + '22' : 'transparent' },
                      ]}
                    >
                      <Text style={{ color: lieu.rayon === r ? accent : '#666677', fontSize: 12 }}>{r} m</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {renderScene(lieu, 'arrivee')}
                {renderScene(lieu, 'depart')}

                <TouchableOpacity onPress={() => confirmerSuppressionLieu(lieu.id, lieu.nom)} style={styles.supprimerLieuBtn}>
                  <Text style={{ color: PALETTE.pink, fontSize: 12 }}>🗑 Supprimer "{lieu.nom}"</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* ── LOT 90 : Ajouter un nouveau lieu ── */}
      {!ajoutEnCours ? (
        <TouchableOpacity style={[styles.btn, styles.ajouterBtn, { borderColor: accent + '40' }]} onPress={() => setAjoutEnCours(true)}>
          <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>+ Ajouter un lieu (bureau, salle de sport...)</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.lieuBloc, { borderColor: accent + '40' }]}>
          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Nom du lieu</Text>
          <TextInput
            style={styles.input}
            value={nouveauNom}
            onChangeText={setNouveauNom}
            placeholder="Ex : Bureau"
            placeholderTextColor="#666677"
          />
          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Icône</Text>
          <View style={styles.iconesRow}>
            {ICONES_LIEU.map(ic => (
              <TouchableOpacity
                key={ic}
                onPress={() => setNouveauIcon(ic)}
                style={[styles.iconeBtn, { borderColor: nouveauIcon === ic ? accent : 'rgba(255,255,255,0.1)', backgroundColor: nouveauIcon === ic ? accent + '22' : 'transparent' }]}
              >
                <Text style={{ fontSize: 16 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, { marginTop: 12, backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]}
            onPress={capturerPositionNouveauLieu}
            disabled={chargementPosition}
          >
            {chargementPosition
              ? <ActivityIndicator color={accent} size="small" />
              : <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>📍 Utiliser ma position actuelle</Text>}
          </TouchableOpacity>
          {nouvellePosition && (
            <Text style={[styles.desc, { marginTop: 8 }]}>✅ {nouvellePosition.adresse}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' }]} onPress={annulerAjoutLieu}>
              <Text style={{ color: '#aaa', fontSize: 12 }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: accent }]} onPress={confirmerAjoutLieu}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Activer Géo-Kira ({lieux.length} lieu{lieux.length > 1 ? 'x' : ''})</Text>
        {chargementActivation ? <ActivityIndicator color={accent} size="small" /> : <Toggle value={actif} onChange={toggleActif} color={accent} />}
      </View>

      {!permissionsOk && actif && (
        <Text style={styles.permissionWarning}>
          ⚠️ Permission de localisation en arrière-plan manquante — réactive le switch pour la redemander.
        </Text>
      )}

      <Text style={styles.desc}>
        💡 La notification "Bon retour" (ou "Arrivée à...") attend 2 minutes avant de s'afficher,
        et s'annule automatiquement si tu ressors entre-temps — un simple passage devant un lieu
        ne devrait donc pas déclencher Kira.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  desc: { fontSize: 11, color: '#888899', lineHeight: 16, marginBottom: 12 },
  btn: { padding: 11, borderRadius: 10, alignItems: 'center' },
  ajouterBtn: { borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 },
  rayonRow: { flexDirection: 'row', gap: 8 },
  rayonBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, borderWidth: 1, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  toggleLabel: { fontSize: 13, color: '#ccc' },
  permissionWarning: { fontSize: 10, color: PALETTE.pink, marginTop: 10, lineHeight: 14 },
  appareilRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  appareilNom: { flex: 1, fontSize: 12, color: '#ccc' },
  lieuBloc: { borderWidth: 1, borderRadius: 12, marginBottom: 10, overflow: 'hidden', padding: 12 },
  lieuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lieuNom: { fontSize: 13, fontWeight: '700', color: '#fff' },
  lieuAdresse: { fontSize: 11, color: '#888899', marginTop: 1 },
  lieuDetail: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  supprimerLieuBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  input: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10, color: '#fff', fontSize: 13 },
  iconesRow: { flexDirection: 'row', gap: 8 },
  iconeBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
