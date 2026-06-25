// ═══════════════════════════════════════════
//  CREERMODULESCREEN.JS — Constructeur de module (lot 31)
//  NOUVEAU : permet de créer un module personnalisé
//  de zéro, ou de modifier un module déjà créé.
//  Si route.params.moduleId est fourni → mode édition.
//  Sinon → mode création.
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackButton, SectionLabel } from '../components/Shared';
import {
  TYPES_CHAMPS,
  creerCustomModule,
  modifierCustomModule,
  supprimerCustomModule,
  getCustomModuleParId,
} from '../utils/customModules';
import { getTheme, PALETTE } from '../utils/theme';

const COULEURS_DISPONIBLES = Object.values(PALETTE).filter(c => c.startsWith('#'));
const ICONES_SUGGEREES = ['⭐', '🎣', '📦', '🚗', '💪', '🎮', '📚', '🐶', '🌿', '💼', '🎨', '🏠', '✈️', '💰', '🔧', '🎬'];

export default function CreerModuleScreen({ navigation, route }) {
  const { moduleId } = route.params || {};
  const enEdition = !!moduleId;
  const theme = getTheme('cosmos');

  const [nom, setNom] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState(ICONES_SUGGEREES[0]);
  const [color, setColor] = useState(COULEURS_DISPONIBLES[0]);
  const [champs, setChamps] = useState([{ id: 'nom', label: 'Nom', type: 'texte' }]);
  const [afficherSuggestionsRapides, setAfficherSuggestionsRapides] = useState(false);
  const [suggestionsTexte, setSuggestionsTexte] = useState(''); // saisie brute, séparée par virgules
  const [chargement, setChargement] = useState(enEdition);

  useEffect(() => {
    if (!enEdition) return;
    (async () => {
      const def = await getCustomModuleParId(moduleId);
      if (def) {
        setNom(def.nom);
        setDesc(def.desc || '');
        setIcon(def.icon);
        setColor(def.color);
        setChamps(def.champs);
        setAfficherSuggestionsRapides(def.afficherSuggestionsRapides);
        setSuggestionsTexte((def.suggestionsRapides || []).join(', '));
      }
      setChargement(false);
    })();
  }, [moduleId, enEdition]);

  const ajouterChamp = () => {
    // Limite raisonnable à 6 champs : au-delà, le formulaire d'ajout
    // deviendrait trop long à remplir sur un module personnalisé —
    // mieux vaut créer deux modules distincts dans ce cas.
    if (champs.length >= 6) {
      Alert.alert('Limite atteinte', 'Un module peut avoir au maximum 6 champs. Crée un second module si tu as besoin de plus de détails.');
      return;
    }
    setChamps([...champs, { id: `champ_${Date.now()}`, label: '', type: 'texte' }]);
  };

  const modifierChamp = (index, modifications) => {
    setChamps(champs.map((c, i) => (i === index ? { ...c, ...modifications } : c)));
  };

  const supprimerChamp = index => {
    if (champs.length <= 1) {
      Alert.alert('Impossible', 'Un module doit avoir au moins un champ.');
      return;
    }
    setChamps(champs.filter((_, i) => i !== index));
  };

  const valider = async () => {
    if (!nom.trim()) {
      Alert.alert('Nom requis', 'Donne un nom à ton module avant de continuer.');
      return;
    }
    if (champs.some(c => !c.label.trim())) {
      Alert.alert('Champ incomplet', 'Chaque champ doit avoir un nom (ex: "Nom de l\'article", "Quantité"...).');
      return;
    }

    const suggestionsRapides = suggestionsTexte
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const donnees = { nom, icon, color, desc, champs, afficherSuggestionsRapides, suggestionsRapides };

    if (enEdition) {
      await modifierCustomModule(moduleId, donnees);
      Alert.alert('✅ Module modifié !', `"${nom}" a été mis à jour.`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } else {
      await creerCustomModule(donnees);
      Alert.alert('✅ Module créé !', `"${nom}" est maintenant disponible sur ton accueil.`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    }
  };

  const demanderSuppression = () => {
    Alert.alert(
      '⚠️ Supprimer ce module',
      `"${nom}" et toutes ses données seront définitivement supprimés. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            await supprimerCustomModule(moduleId);
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  if (chargement) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{enEdition ? '✏️ Modifier le module' : '✨ Créer un module'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Aperçu en direct de la carte module, pour se rendre compte du résultat */}
        <SectionLabel>Aperçu</SectionLabel>
        <View style={[styles.apercuCard, { backgroundColor: theme.surface, borderColor: color + '40' }]}>
          <View style={[styles.apercuIcon, { backgroundColor: color + '22', borderColor: color + '44' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <Text style={styles.apercuLabel}>{nom || 'Nom du module'}</Text>
          {desc ? <Text style={styles.apercuDesc}>{desc}</Text> : null}
        </View>

        <SectionLabel style={{ marginTop: 18 }}>Informations générales</SectionLabel>
        <Text style={styles.fieldLabel}>Nom du module</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Matériel de pêche"
          placeholderTextColor="#555566"
          value={nom}
          onChangeText={setNom}
        />
        <Text style={styles.fieldLabel}>Petite description (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Mon inventaire de pêche"
          placeholderTextColor="#555566"
          value={desc}
          onChangeText={setDesc}
        />

        <Text style={styles.fieldLabel}>Icône</Text>
        <View style={styles.iconsGrid}>
          {ICONES_SUGGEREES.map(ic => (
            <TouchableOpacity
              key={ic}
              onPress={() => setIcon(ic)}
              style={[styles.iconOption, { borderColor: icon === ic ? color : 'rgba(255,255,255,0.1)', backgroundColor: icon === ic ? color + '22' : 'rgba(255,255,255,0.04)' }]}
            >
              <Text style={{ fontSize: 20 }}>{ic}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Couleur</Text>
        <View style={styles.colorRow}>
          {COULEURS_DISPONIBLES.map(c => (
            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0 }]} />
          ))}
        </View>

        <SectionLabel style={{ marginTop: 18 }}>
          Champs de la liste ({champs.length}/6)
        </SectionLabel>
        <Text style={styles.aideTexte}>
          Chaque champ devient une information que tu pourras remplir pour chaque élément de
          ta liste. Le premier champ texte est utilisé comme titre principal.
        </Text>

        {champs.map((champ, index) => (
          <View key={champ.id} style={[styles.champBox, { borderColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={styles.champHeader}>
              <Text style={styles.champNumero}>Champ {index + 1}</Text>
              <TouchableOpacity onPress={() => supprimerChamp(index)}>
                <Text style={styles.champSupprimer}>Supprimer</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nom du champ (ex: Quantité)"
              placeholderTextColor="#555566"
              value={champ.label}
              onChangeText={t => modifierChamp(index, { label: t })}
            />
            <View style={styles.typeRow}>
              {TYPES_CHAMPS.map(type => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => modifierChamp(index, { type: type.id })}
                  style={[styles.typeChip, { borderColor: champ.type === type.id ? color : 'rgba(255,255,255,0.1)', backgroundColor: champ.type === type.id ? color + '22' : 'transparent' }]}
                >
                  <Text style={{ fontSize: 11, color: champ.type === type.id ? color : '#666677' }}>{type.icon} {type.nom}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.addChampBtn, { borderColor: color + '40' }]} onPress={ajouterChamp}>
          <Text style={[styles.addChampText, { color }]}>+ Ajouter un champ</Text>
        </TouchableOpacity>

        <SectionLabel style={{ marginTop: 18 }}>Suggestions rapides (optionnel)</SectionLabel>
        <Text style={styles.aideTexte}>
          Comme dans le module Courses : des boutons "+ Lait", "+ Pain"... pour ajouter
          rapidement un élément fréquent sans ouvrir le formulaire complet.
        </Text>
        <View style={styles.toggleSuggRow}>
          <TouchableOpacity
            onPress={() => setAfficherSuggestionsRapides(!afficherSuggestionsRapides)}
            style={[styles.toggleSuggBtn, { backgroundColor: afficherSuggestionsRapides ? color + '22' : 'rgba(255,255,255,0.05)', borderColor: afficherSuggestionsRapides ? color : 'rgba(255,255,255,0.1)' }]}
          >
            <Text style={{ color: afficherSuggestionsRapides ? color : '#888899', fontSize: 12, fontWeight: '600' }}>
              {afficherSuggestionsRapides ? '✓ Activées' : 'Activer les suggestions rapides'}
            </Text>
          </TouchableOpacity>
        </View>
        {afficherSuggestionsRapides && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Sépare chaque suggestion par une virgule : Lait, Pain, Oeufs..."
            placeholderTextColor="#555566"
            value={suggestionsTexte}
            onChangeText={setSuggestionsTexte}
          />
        )}

        <TouchableOpacity style={[styles.validerBtn, { backgroundColor: color }]} onPress={valider}>
          <Text style={styles.validerBtnText}>{enEdition ? 'Enregistrer les modifications' : 'Créer le module'}</Text>
        </TouchableOpacity>

        {enEdition && (
          <TouchableOpacity style={styles.supprimerBtn} onPress={demanderSuppression}>
            <Text style={styles.supprimerBtnText}>🗑 Supprimer définitivement ce module</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  apercuCard: { borderRadius: 16, padding: 14, borderWidth: 1, minHeight: 92, width: '60%' },
  apercuIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  apercuLabel: { fontSize: 12, fontWeight: '600', color: '#e8e8f8' },
  apercuDesc: { fontSize: 10, color: '#555566', marginTop: 2 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5, marginTop: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10 },
  iconsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: { width: 46, height: 46, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderColor: '#fff' },
  aideTexte: { fontSize: 11, color: '#444455', lineHeight: 16, marginBottom: 10 },
  champBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  champHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  champNumero: { fontSize: 11, color: '#888899', fontWeight: '600' },
  champSupprimer: { fontSize: 11, color: PALETTE.pink },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  addChampBtn: { padding: 11, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginBottom: 6 },
  addChampText: { fontWeight: '600', fontSize: 12 },
  toggleSuggRow: { flexDirection: 'row' },
  toggleSuggBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1 },
  validerBtn: { padding: 15, borderRadius: 13, alignItems: 'center', marginTop: 22 },
  validerBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  supprimerBtn: { padding: 13, alignItems: 'center', marginTop: 10 },
  supprimerBtnText: { color: PALETTE.pink, fontSize: 12, fontWeight: '600' },
});
