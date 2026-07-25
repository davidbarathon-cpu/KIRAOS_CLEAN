// ═══════════════════════════════════════════
//  POTAGERSCREEN.JS — Module Potager
//  MISE À JOUR LOT 47 : corrige les retours du 11/07 —
//  1) impossible de renommer une plante mal reconnue par l'IA
//     → champ modifiable avant d'ajouter au suivi.
//  2) impossible de supprimer une plante suivie → bouton 🗑 ajouté.
//  3) pas de vrai historique par plante (un seul "dernière analyse"
//     écrasé à chaque fois) → tableau d'historique complet, un
//     appui sur une plante affiche toutes ses analyses passées.
//  4) prompt d'analyse rendu plus tolérant (encourage une estimation
//     même en cas de doute plutôt que de répondre "Non identifiée").
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  Alert, Image, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getTheme, PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';
import { getData, setData } from '../utils/storage';
import { getAllApiKeys, getActiveAiProvider, AI_PROVIDERS } from '../utils/apiKeys';
import { analyserPlante } from '../utils/plantAnalyzer';
import { BackButton, Chip, SectionLabel } from '../components/Shared';

const DEFAULT_PLANTES = [
  { id: 1, n: 'Tomates', icon: '🍅', eau: 'Élevé', prochain: 'Ce soir', c: PALETTE.pink, historique: [] },
  { id: 2, n: 'Carottes', icon: '🥕', eau: 'Moyen', prochain: 'Demain', c: '#F97316', historique: [] },
  { id: 3, n: 'Herbes aromatiques', icon: '🌿', eau: 'Faible', prochain: 'Dans 2j', c: PALETTE.green, historique: [] },
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

/**
 * Migration douce : les plantes enregistrées avant le lot 47 avaient
 * "derniereAnalyse"/"derniereScore" au lieu d'un vrai tableau
 * "historique" — on les convertit à la volée pour ne rien perdre.
 */
function migrerPlante(p) {
  if (p.historique) return p;
  const historique = p.derniereAnalyse
    ? [{ date: p.derniereAnalyse, score: p.derniereScore ?? null, etatSante: null, besoinEau: p.eau, observations: null, conseilPrincipal: null }]
    : [];
  return { ...p, historique };
}

export default function PotagerScreen({ navigation }) {
  const theme = useKiraTheme();
  const [plantes, setPlantes] = useState([]);
  const [meteo] = useState({ temp: 22, humidite: 58 });
  const [photoUri, setPhotoUri] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [nomEdite, setNomEdite] = useState('');
  const [erreurAnalyse, setErreurAnalyse] = useState(null);
  const [providerActif, setProviderActif] = useState(null);
  const [planteCibleId, setPlanteCibleId] = useState(null); // null = nouvelle plante, sinon on complète l'historique d'une plante existante
  const [planteOuverte, setPlanteOuverte] = useState(null); // plante dont on affiche l'historique complet
  const [showAjoutManuel, setShowAjoutManuel] = useState(false);
  const [editionDatePlantation, setEditionDatePlantation] = useState(false);
  const [dateePlantationSaisie, setDateePlantationSaisie] = useState('');
  const [ajoutNoteVisible, setAjoutNoteVisible] = useState(false);
  const [noteRapideTexte, setNoteRapideTexte] = useState('');
  const [nomManuel, setNomManuel] = useState('');

  useEffect(() => {
    getData('potager_plantes').then(p => {
      const liste = p && p.length ? p.map(migrerPlante) : DEFAULT_PLANTES;
      setPlantes(liste);
    });
    getActiveAiProvider().then(setProviderActif);
  }, []);

  const persist = async list => {
    setPlantes(list);
    await setData('potager_plantes', list);
  };

  const prendrePhoto = async cibleId => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Autorise l'accès à la caméra dans les réglages Android pour utiliser cette fonctionnalité.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: false });
    if (!result.canceled && result.assets?.[0]) demarrerAnalyse(result.assets[0].uri, cibleId);
  };

  const choisirDansGalerie = async cibleId => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "Autorise l'accès aux photos dans les réglages Android pour utiliser cette fonctionnalité.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) demarrerAnalyse(result.assets[0].uri, cibleId);
  };

  const demarrerAnalyse = async (uri, cibleId = null) => {
    setPlanteCibleId(cibleId);
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
      setNomEdite(cibleId ? plantes.find(p => p.id === cibleId)?.n || res.type_plante : res.type_plante);
    }
  };

  const enregistrerDansSuivi = () => {
    if (!resultat) return;
    const nomFinal = nomEdite.trim() || resultat.type_plante || 'Ma plante';
    const nouvelleEntreeHistorique = {
      date: new Date().toLocaleDateString('fr-FR'),
      score: resultat.score_sante,
      etatSante: resultat.etat_sante,
      besoinEau: resultat.besoin_eau,
      observations: resultat.observations,
      conseilPrincipal: resultat.conseil_principal,
      conseilsSecondaires: resultat.conseils_secondaires || [],
    };

    if (planteCibleId) {
      // On complète l'historique d'une plante déjà suivie.
      const listeMaj = plantes.map(p => {
        if (p.id !== planteCibleId) return p;
        return {
          ...p,
          eau: resultat.besoin_eau,
          prochain: resultat.besoin_eau === 'Urgent' ? 'Maintenant !' : resultat.besoin_eau === 'Élevé' ? 'Ce soir' : 'Dans 2-3 jours',
          c: COULEUR_EAU[resultat.besoin_eau] || p.c,
          historique: [...(p.historique || []), nouvelleEntreeHistorique],
        };
      });
      persist(listeMaj);
      Alert.alert('✅ Historique mis à jour !', `Une nouvelle analyse a été ajoutée pour ${plantes.find(p => p.id === planteCibleId)?.n}.`);
    } else {
      // Nouvelle plante suivie.
      const nouvellePlante = {
        id: Date.now(),
        n: nomFinal,
        icon: '🌿',
        eau: resultat.besoin_eau,
        prochain: resultat.besoin_eau === 'Urgent' ? 'Maintenant !' : resultat.besoin_eau === 'Élevé' ? 'Ce soir' : 'Dans 2-3 jours',
        c: COULEUR_EAU[resultat.besoin_eau] || PALETTE.green,
        historique: [nouvelleEntreeHistorique],
      };
      persist([...plantes, nouvellePlante]);
      Alert.alert('✅ Ajoutée !', `${nomFinal} a été ajoutée à tes plantes suivies.`);
    }

    reinitialiserAnalyse();
  };

  const reinitialiserAnalyse = () => {
    setPhotoUri(null);
    setResultat(null);
    setErreurAnalyse(null);
    setPlanteCibleId(null);
    setNomEdite('');
  };

  const ajouterManuellement = () => {
    if (!nomManuel.trim()) return;
    const nouvellePlante = {
      id: Date.now(),
      n: nomManuel.trim(),
      icon: '🌱',
      eau: 'Modéré',
      prochain: 'À définir',
      c: PALETTE.green,
      historique: [],
    };
    persist([...plantes, nouvellePlante]);
    setNomManuel('');
    setShowAjoutManuel(false);
  };

  /**
   * Journal rapide (lot 53) : ajoute une entrée légère à l'historique
   * d'une plante sans passer par une analyse photo complète — un
   * arrosage, une taille, ou une observation libre notée sur le vif.
   */
  const ajouterEvenement = (planteId, evenement, icone, note = '') => {
    const nouvelleEntree = {
      type: 'evenement',
      date: new Date().toLocaleDateString('fr-FR'),
      evenement,
      icone,
      note,
    };
    const listeMaj = plantes.map(p => (
      p.id === planteId ? { ...p, historique: [...(p.historique || []), nouvelleEntree] } : p
    ));
    persist(listeMaj);
  };

  const validerDatePlantation = planteId => {
    const listeMaj = plantes.map(p => (
      p.id === planteId ? { ...p, datePlantation: dateePlantationSaisie.trim() } : p
    ));
    persist(listeMaj);
    setEditionDatePlantation(false);
  };

  const supprimerPlante = id => {
    const plante = plantes.find(p => p.id === id);
    Alert.alert(
      'Supprimer cette plante ?',
      `"${plante?.n}" et tout son historique seront définitivement supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => { persist(plantes.filter(p => p.id !== id)); setPlanteOuverte(null); } },
      ]
    );
  };

  const ouvrirChoixPhoto = (cibleId = null) => {
    Alert.alert('Analyser une plante', 'Comment veux-tu fournir la photo ?', [
      { text: '📷 Prendre une photo', onPress: () => prendrePhoto(cibleId) },
      { text: '🖼️ Choisir dans la galerie', onPress: () => choisirDansGalerie(cibleId) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  // ── Vue historique complet d'une plante ──
  if (planteOuverte) {
    const p = plantes.find(x => x.id === planteOuverte);
    if (!p) { setPlanteOuverte(null); return null; }
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => { setPlanteOuverte(null); setEditionDatePlantation(false); setAjoutNoteVisible(false); }} />
          <Text style={styles.headerTitle} numberOfLines={1}>{p.icon} {p.n}</Text>
          <TouchableOpacity onPress={() => supprimerPlante(p.id)} style={styles.deleteBtn}>
            <Text style={{ fontSize: 13 }}>🗑</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <View style={[styles.resumeBox, { borderColor: p.c + '33' }]}>
            <Text style={styles.resumeLabel}>Besoin en eau actuel</Text>
            <Chip label={p.eau} color={p.c} />
            <Text style={[styles.resumeProchain, { color: p.c }]}>Prochain arrosage : {p.prochain}</Text>

            {editionDatePlantation ? (
              <View style={styles.datePlantationEdit}>
                <TextInput
                  style={[styles.nomInput, { flex: 1, marginBottom: 0 }]}
                  value={dateePlantationSaisie}
                  onChangeText={setDateePlantationSaisie}
                  placeholder="Ex: 12 mai 2026"
                  placeholderTextColor="#555566"
                  autoFocus
                />
                <TouchableOpacity onPress={() => validerDatePlantation(p.id)} style={styles.dateOkBtn}>
                  <Text style={{ color: PALETTE.green, fontSize: 13, fontWeight: '700' }}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setDateePlantationSaisie(p.datePlantation || ''); setEditionDatePlantation(true); }} style={styles.datePlantationRow}>
                <Text style={styles.resumePlantation}>
                  🌱 {p.datePlantation ? `Plantée le ${p.datePlantation}` : 'Date de plantation non renseignée'}
                </Text>
                <Text style={{ color: theme.accent, fontSize: 11 }}>✏️</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Journal rapide (lot 53) : quelques gestes du quotidien sans passer par une photo ── */}
          <View style={styles.journalRow}>
            <TouchableOpacity style={[styles.journalBtn, { borderColor: PALETTE.teal + '40', backgroundColor: PALETTE.teal + '12' }]} onPress={() => ajouterEvenement(p.id, 'Arrosage', '💧')}>
              <Text style={{ color: PALETTE.teal, fontSize: 12, fontWeight: '600' }}>💧 Arrosé</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.journalBtn, { borderColor: PALETTE.orange + '40', backgroundColor: PALETTE.orange + '12' }]} onPress={() => ajouterEvenement(p.id, 'Taille', '✂️')}>
              <Text style={{ color: PALETTE.orange, fontSize: 12, fontWeight: '600' }}>✂️ Taillé</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.journalBtn, { borderColor: theme.accent + '40', backgroundColor: theme.accent + '12' }]} onPress={() => setAjoutNoteVisible(!ajoutNoteVisible)}>
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>📝 Note</Text>
            </TouchableOpacity>
          </View>

          {ajoutNoteVisible && (
            <View style={styles.noteRapideBox}>
              <TextInput
                style={styles.nomInput}
                value={noteRapideTexte}
                onChangeText={setNoteRapideTexte}
                placeholder="Ex: une feuille jaunit à la base..."
                placeholderTextColor="#555566"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.accent }]}
                onPress={() => { ajouterEvenement(p.id, 'Observation', '📝', noteRapideTexte); setNoteRapideTexte(''); setAjoutNoteVisible(false); }}
              >
                <Text style={styles.saveBtnText}>Ajouter au journal</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.analyserBtn, { borderColor: PALETTE.green + '40' }]} onPress={() => ouvrirChoixPhoto(p.id)}>
            <Text style={{ color: PALETTE.green, fontSize: 12, fontWeight: '600' }}>📸 Nouvelle analyse pour cette plante</Text>
          </TouchableOpacity>

          <SectionLabel style={{ marginTop: 18 }}>Historique ({(p.historique || []).length})</SectionLabel>
          {(!p.historique || p.historique.length === 0) ? (
            <Text style={styles.emptyHistText}>Aucune entrée enregistrée pour l'instant.</Text>
          ) : (
            [...p.historique].reverse().map((entree, i) => {
              if (entree.type === 'evenement') {
                return (
                  <View key={i} style={styles.evenementRow}>
                    <Text style={{ fontSize: 14, marginRight: 8 }}>{entree.icone}</Text>
                    <Text style={styles.evenementDate}>{entree.date}</Text>
                    <Text style={styles.evenementLabel}>{entree.evenement}</Text>
                    {entree.note ? <Text style={styles.evenementNote} numberOfLines={1}>· {entree.note}</Text> : null}
                  </View>
                );
              }
              return (
              <View key={i} style={[styles.histCard, { borderColor: (COULEUR_ETAT[entree.etatSante] || PALETTE.green) + '30' }]}>
                <View style={styles.histHeader}>
                  <Text style={styles.histDate}>{entree.date}</Text>
                  {entree.etatSante && (
                    <View style={[styles.etatBadge, { backgroundColor: (COULEUR_ETAT[entree.etatSante] || PALETTE.green) + '22' }]}>
                      <Text style={{ color: COULEUR_ETAT[entree.etatSante] || PALETTE.green, fontSize: 10, fontWeight: '700' }}>
                        {entree.etatSante}{entree.score ? ` · ${entree.score}%` : ''}
                      </Text>
                    </View>
                  )}
                </View>
                {entree.observations && <Text style={styles.histObs}>{entree.observations}</Text>}
                {entree.conseilPrincipal && (
                  <View style={styles.histConseilBox}>
                    <Text style={styles.histConseilLabel}>🌟 Conseil</Text>
                    <Text style={styles.histConseilText}>{entree.conseilPrincipal}</Text>
                  </View>
                )}
              </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

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
            plantes gourmandes en eau ce soir après 19h pour éviter l'évaporation.
          </Text>
        </View>

        {!photoUri ? (
          <TouchableOpacity style={[styles.photoBox, { borderColor: PALETTE.green + '40' }]} onPress={() => ouvrirChoixPhoto(null)} activeOpacity={0.85}>
            <Text style={styles.photoIcon}>📸</Text>
            <Text style={styles.photoTitle}>Analyse de plante par Kira</Text>
            <Text style={styles.photoDesc}>
              Prends une photo et Kira analysera l'état de santé, le type de plante, et te
              donnera des conseils d'arrosage, d'engrais ou de taille.
            </Text>
            <View style={[styles.photoBtn, { backgroundColor: PALETTE.green + '20', borderColor: PALETTE.green + '40' }]}>
              <Text style={{ color: PALETTE.green, fontSize: 12, fontWeight: '600' }}>📷 Analyser une plante</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.analyseBox, { borderColor: theme.accent + '25' }]}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />

            {analysing && (
              <View style={styles.analysingBox}>
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
                <Text style={styles.champLabel}>Nom de la plante (modifiable)</Text>
                <TextInput
                  style={styles.nomInput}
                  value={nomEdite}
                  onChangeText={setNomEdite}
                  placeholder="Nom de la plante..."
                  placeholderTextColor="#555566"
                />

                <View style={styles.resultatHeader}>
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
                  <Text style={styles.saveBtnText}>{planteCibleId ? "+ Ajouter à l'historique" : '+ Ajouter à mes plantes suivies'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.recommencerBtn} onPress={reinitialiserAnalyse}>
              <Text style={styles.recommencerText}>← Nouvelle photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.suiviesHeaderRow}>
          <SectionLabel style={{ marginTop: 18, marginBottom: 0 }}>Mes plantes suivies</SectionLabel>
          <TouchableOpacity onPress={() => setShowAjoutManuel(!showAjoutManuel)}>
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>{showAjoutManuel ? 'Annuler' : '+ Ajouter manuellement'}</Text>
          </TouchableOpacity>
        </View>

        {showAjoutManuel && (
          <View style={[styles.ajoutManuelBox, { borderColor: theme.accent + '30' }]}>
            <TextInput
              style={styles.nomInput}
              value={nomManuel}
              onChangeText={setNomManuel}
              placeholder="Nom de la plante (ex: Basilic)"
              placeholderTextColor="#555566"
              autoFocus
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent, marginTop: 8 }]} onPress={ajouterManuellement}>
              <Text style={styles.saveBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        )}

        {plantes.map(p => (
          <TouchableOpacity key={p.id} style={[styles.planteCard, { borderColor: p.c + '22' }]} onPress={() => setPlanteOuverte(p.id)} activeOpacity={0.85}>
            <Text style={{ fontSize: 28 }}>{p.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.planteName}>{p.n}</Text>
              <Text style={styles.planteMeta}>Besoin en eau : {p.eau}</Text>
              <Text style={[styles.planteProchain, { color: p.c }]}>Prochain arrosage : {p.prochain}</Text>
              <Text style={styles.planteHistCount}>
                {(p.historique || []).length > 0 ? `🕘 ${p.historique.length} analyse${p.historique.length > 1 ? 's' : ''} — voir l'historique` : 'Aucune analyse — appuie pour en ajouter une'}
              </Text>
            </View>
            <Text style={{ color: '#555566', fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,101,132,0.12)' },
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
  champLabel: { fontSize: 10, color: '#888899', marginBottom: 5 },
  nomInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 9, color: '#fff', fontSize: 14, padding: 10, marginBottom: 12, fontWeight: '600',
  },
  resultatHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
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
  suiviesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  ajoutManuelBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 10 },
  planteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  planteName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  planteMeta: { fontSize: 11, color: '#666677', marginTop: 2 },
  planteProchain: { fontSize: 11, marginTop: 1, fontWeight: '600' },
  planteHistCount: { fontSize: 10, color: '#555566', marginTop: 4 },
  resumeBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  resumeLabel: { fontSize: 10, color: '#888899', marginBottom: 6 },
  resumeProchain: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  datePlantationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  resumePlantation: { fontSize: 11, color: '#aab' },
  datePlantationEdit: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  dateOkBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 9 },
  journalRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  journalBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1, alignItems: 'center' },
  noteRapideBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 12 },
  evenementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  evenementDate: { fontSize: 11, color: '#666677', width: 78 },
  evenementLabel: { fontSize: 12, color: '#ccc', fontWeight: '600' },
  evenementNote: { fontSize: 11, color: '#666677', marginLeft: 6, flex: 1 },
  analyserBtn: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 8 },
  emptyHistText: { fontSize: 12, color: '#555566', textAlign: 'center', marginTop: 20 },
  histCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1 },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  histDate: { fontSize: 12, color: '#aab', fontWeight: '600' },
  histObs: { fontSize: 12, color: '#ccc', lineHeight: 18, marginBottom: 8 },
  histConseilBox: { backgroundColor: 'rgba(108,99,255,0.08)', borderRadius: 10, padding: 10 },
  histConseilLabel: { fontSize: 10, color: PALETTE.violet, fontWeight: '600', marginBottom: 4 },
  histConseilText: { fontSize: 12, color: '#ccc', lineHeight: 17 },
});
