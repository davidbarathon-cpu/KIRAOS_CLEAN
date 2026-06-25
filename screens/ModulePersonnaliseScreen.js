// ═══════════════════════════════════════════
//  MODULEPERSONNALISESCREEN.JS — Écran générique (lot 31)
//  NOUVEAU : un seul écran capable d'afficher et de
//  faire fonctionner N'IMPORTE QUEL module créé par
//  l'utilisateur via le constructeur de modules
//  (Paramètres → Modules → Créer un module).
//
//  Reprend le même pattern visuel et fonctionnel que
//  CoursesScreen.js / NotesScreen.js (cocher, ajouter,
//  supprimer, suggestions rapides) mais en lisant la
//  structure des champs depuis la définition du module
//  au lieu de l'avoir codée en dur.
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
  getCustomModuleData,
  setCustomModuleData,
  getCustomModuleParId,
} from '../utils/customModules';
import { getTheme } from '../utils/theme';

/**
 * Construit un nouvel élément vide conforme aux champs de la définition
 * (un objet avec une clé par champ, valeur initiale selon le type).
 */
function nouvelElementVide(champs) {
  const elt = {};
  champs.forEach(champ => {
    elt[champ.id] = champ.type === 'checkbox' ? false : '';
  });
  return elt;
}

export default function ModulePersonnaliseScreen({ navigation, route }) {
  const { moduleId } = route.params || {};
  const theme = getTheme('cosmos');
  const [definition, setDefinition] = useState(null);
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nouvelElement, setNouvelElement] = useState({});
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const def = await getCustomModuleParId(moduleId);
      if (!def) {
        // Le module a été supprimé entre-temps (ex: depuis un autre appareil) —
        // on prévient plutôt que de planter sur un écran vide incompréhensible.
        Alert.alert('Module introuvable', "Ce module personnalisé n'existe plus.", [
          { text: 'Retour', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setDefinition(def);
      setNouvelElement(nouvelElementVide(def.champs));
      const data = await getCustomModuleData(moduleId);
      setItems(data);
      setChargement(false);
    })();
  }, [moduleId]);

  if (chargement || !definition) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Chargement...</Text>
        </View>
      </View>
    );
  }

  // Le champ "checkbox" (s'il existe) est traité comme l'équivalent du
  // "done" dans Courses/Notes — sert au calcul de progression et au tri visuel.
  const champCheckbox = definition.champs.find(c => c.type === 'checkbox');
  const champsAffichables = definition.champs.filter(c => c.type !== 'checkbox');

  const persist = async liste => {
    setItems(liste);
    await setCustomModuleData(moduleId, liste);
  };

  const toggleCheckbox = id => {
    if (!champCheckbox) return;
    persist(items.map(i => (i.id === id ? { ...i, [champCheckbox.id]: !i[champCheckbox.id] } : i)));
  };

  const removeItem = id => {
    persist(items.filter(i => i.id !== id));
  };

  const ajouterElement = () => {
    // Le premier champ texte/nombre est considéré comme le champ "titre" —
    // on exige qu'il soit rempli, comme Courses exige un nom d'article.
    const premierChamp = champsAffichables[0];
    if (premierChamp && !String(nouvelElement[premierChamp.id] || '').trim()) return;

    const elt = { id: Date.now(), ...nouvelElement };
    persist([...items, elt]);
    setNouvelElement(nouvelElementVide(definition.champs));
    setShowAdd(false);
  };

  const ajouterSuggestionRapide = valeur => {
    const premierChamp = champsAffichables[0];
    if (!premierChamp) return;
    const elt = { id: Date.now() + Math.random(), ...nouvelElementVide(definition.champs), [premierChamp.id]: valeur };
    persist([...items, elt]);
  };

  const doneCount = champCheckbox ? items.filter(i => i[champCheckbox.id]).length : 0;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{definition.icon} {definition.nom}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Barre de progression — uniquement si le module a une case à cocher */}
        {champCheckbox && total > 0 && (
          <View style={[styles.progressCard, { borderColor: definition.color + '30' }]}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{doneCount}/{total} éléments</Text>
              <Text style={{ fontSize: 12, color: doneCount === total ? definition.color : '#888899' }}>
                {doneCount === total ? '🎉 Terminé !' : `${pct}%`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: definition.color }]} />
            </View>
          </View>
        )}

        {items.length === 0 && (
          <Text style={styles.emptyText}>Aucun élément pour l'instant. Ajoute le premier ci-dessous !</Text>
        )}

        {/* Liste des éléments */}
        {items.map(item => {
          const estCoche = champCheckbox ? !!item[champCheckbox.id] : false;
          return (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                { opacity: estCoche ? 0.5 : 1, borderColor: estCoche ? 'rgba(255,255,255,0.04)' : definition.color + '30' },
              ]}
            >
              {champCheckbox && (
                <TouchableOpacity
                  onPress={() => toggleCheckbox(item.id)}
                  style={[
                    styles.checkbox,
                    { borderColor: estCoche ? definition.color : definition.color, backgroundColor: estCoche ? definition.color : 'transparent' },
                  ]}
                >
                  {estCoche && <Text style={{ fontSize: 11, color: '#000' }}>✓</Text>}
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                {champsAffichables.map((champ, i) => (
                  <Text
                    key={champ.id}
                    style={i === 0
                      ? [styles.itemName, estCoche && { textDecorationLine: 'line-through', color: '#555566' }]
                      : styles.itemMeta}
                  >
                    {i > 0 && `${champ.label} : `}{String(item[champ.id] ?? '')}
                  </Text>
                ))}
              </View>
              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Text style={styles.removeBtn}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Formulaire d'ajout, généré depuis les champs de la définition */}
        {!showAdd ? (
          <TouchableOpacity style={[styles.addBtn, { borderColor: definition.color + '40' }]} onPress={() => setShowAdd(true)}>
            <Text style={[styles.addBtnText, { color: definition.color }]}>+ Ajouter un élément</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { borderColor: definition.color + '25' }]}>
            {champsAffichables.map(champ => (
              <TextInput
                key={champ.id}
                style={styles.input}
                placeholder={champ.label}
                placeholderTextColor="#555566"
                value={String(nouvelElement[champ.id] ?? '')}
                onChangeText={t => setNouvelElement({ ...nouvelElement, [champ.id]: t })}
                keyboardType={champ.type === 'nombre' ? 'numeric' : 'default'}
              />
            ))}
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: definition.color }]} onPress={ajouterElement}>
                <Text style={styles.formBtnTextPrimary}>Ajouter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setShowAdd(false)}>
                <Text style={styles.formBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Suggestions rapides, si activées dans la définition */}
        {definition.afficherSuggestionsRapides && definition.suggestionsRapides?.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <SectionLabel>Suggestions rapides</SectionLabel>
            <View style={styles.suggRow}>
              {definition.suggestionsRapides.map(s => (
                <TouchableOpacity key={s} onPress={() => ajouterSuggestionRapide(s)} style={[styles.suggChip, { borderColor: definition.color + '25', backgroundColor: definition.color + '08' }]}>
                  <Text style={{ color: definition.color, fontSize: 11 }}>+ {s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.modifierBtn}
          onPress={() => navigation.navigate('CreerModule', { moduleId: definition.id })}
        >
          <Text style={styles.modifierBtnText}>⚙️ Modifier ce module (icône, couleur, champs...)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  progressCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 7, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, color: '#fff', fontWeight: '600' },
  itemMeta: { fontSize: 10, color: '#444455', marginTop: 2 },
  removeBtn: { color: '#333344', fontSize: 18 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 6 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10, marginBottom: 8 },
  formActions: { flexDirection: 'row', gap: 8 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  formBtnTextPrimary: { color: '#000', fontWeight: '700', fontSize: 13 },
  formBtnText: { color: '#888899', fontSize: 13 },
  suggRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  modifierBtn: { marginTop: 20, padding: 12, alignItems: 'center' },
  modifierBtnText: { color: '#666677', fontSize: 12 },
});
