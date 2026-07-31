// ═══════════════════════════════════════════
//  REVEILSCREEN.JS — Module Réveil
//  MISE À JOUR LOT 47 : corrige deux retours du 11/07 —
//  1) impossible de modifier une alarme après création (heure y
//     compris) → un bouton ✏️ ouvre maintenant un vrai formulaire
//     d'édition, pré-rempli, pour chaque alarme.
//  2) le texte affirmait que les alarmes "sonnent réellement" — c'est
//     inexact et corrigé ici : expo-notifications envoie une vraie
//     notification programmée avec un son, mais ce n'est PAS un réveil
//     qui sonne en boucle en ignorant le mode silencieux comme l'appli
//     Horloge d'Android. Un vrai "moteur d'alarme" est un chantier à
//     part (voir note dans le livre de bord) — le texte ci-dessous est
//     maintenant honnête sur ce que fait réellement le module.
// ═══════════════════════════════════════════

import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton, Toggle } from '../components/Shared';
import {
  annulerParCle,
  demanderPermissionNotifications,
  reprogrammerAlarmeJoursSemaine,
  verifierPermissionNotifications,
} from '../utils/notifications';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';
import { useKiraTheme } from '../utils/useTheme';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const DEFAULT_ALARMES = [
  { id: 1, heure: '07:00', label: 'Réveil matin', actif: true, jours: [true, true, true, true, true, false, false], son: 'Douce' },
  { id: 2, heure: '13:30', label: 'Pause guitare', actif: false, jours: [true, true, true, true, true, false, false], son: 'Musique' },
];

const SONNERIES = ['Douce', 'Nature', 'Musique', 'Classique'];
const FORM_VIDE = { heure: '07:00', label: '', actif: true, jours: [true, true, true, true, true, false, false], son: 'Douce' };

export default function ReveilScreen({ navigation }) {
  const theme = useKiraTheme();
  const [alarmes, setAlarmes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null); // null = mode création, sinon id de l'alarme éditée
  const [form, setForm] = useState(FORM_VIDE);
  const [permissionOk, setPermissionOk] = useState(true);

  // BUGFIX : même correctif que Courses/Notes/Potager — supprimer toutes ses alarmes ne
  // doit plus faire réapparaître les alarmes d'exemple au réouverture de l'écran.
  useFocusEffect(
    useCallback(() => {
      getData('alarmes').then(a => setAlarmes(Array.isArray(a) ? a : DEFAULT_ALARMES));
      verifierPermissionNotifications().then(setPermissionOk);
    }, [])
  );

  // ── Reprogramme une alarme réelle auprès du système Android ──
  const synchroniserNotifAlarme = async alarme => {
    if (!alarme.actif) {
      await annulerParCle(`alarme_${alarme.id}`);
      return;
    }
    const [h, m] = alarme.heure.split(':').map(Number);
    await reprogrammerAlarmeJoursSemaine(
      `alarme_${alarme.id}`,
      `⏰ ${alarme.label}`,
      "C'est l'heure ! Kira est là pour t'accompagner aujourd'hui 🌟",
      h, m,
      alarme.jours,
      { type: 'alarme', alarmeId: alarme.id }
    );
  };

  const persist = async list => {
    setAlarmes(list);
    await setData('alarmes', list);
  };

  const demanderPermissionSiBesoin = async () => {
    if (permissionOk) return true;
    const accordee = await demanderPermissionNotifications();
    setPermissionOk(accordee);
    if (!accordee) {
      Alert.alert(
        'Permission refusée',
        "Sans autorisation, tes alarmes seront enregistrées mais la notification ne s'affichera pas. Tu peux l'activer plus tard dans les réglages Android de l'application.",
      );
    }
    return accordee;
  };

  const toggleAlarme = async id => {
    const ok = await demanderPermissionSiBesoin();
    const updated = alarmes.map(a => (a.id === id ? { ...a, actif: !a.actif } : a));
    await persist(updated);
    const alarmeModifiee = updated.find(a => a.id === id);
    if (ok) await synchroniserNotifAlarme(alarmeModifiee);
  };

  const toggleJour = async (id, idx) => {
    const updated = alarmes.map(a => {
      if (a.id !== id) return a;
      const jours = [...a.jours];
      jours[idx] = !jours[idx];
      return { ...a, jours };
    });
    await persist(updated);
    const alarmeModifiee = updated.find(a => a.id === id);
    if (alarmeModifiee.actif) await synchroniserNotifAlarme(alarmeModifiee);
  };

  const removeAlarme = async id => {
    await annulerParCle(`alarme_${id}`);
    await persist(alarmes.filter(a => a.id !== id));
    if (editId === id) fermerFormulaire();
  };

  const ouvrirCreation = () => {
    setForm(FORM_VIDE);
    setEditId(null);
    setShowAdd(true);
  };

  const ouvrirEdition = alarme => {
    setForm({ heure: alarme.heure, label: alarme.label, actif: alarme.actif, jours: [...alarme.jours], son: alarme.son });
    setEditId(alarme.id);
    setShowAdd(true);
  };

  const fermerFormulaire = () => {
    setShowAdd(false);
    setEditId(null);
    setForm(FORM_VIDE);
  };

  const validerFormulaire = async () => {
    if (!form.label.trim()) return;
    const ok = await demanderPermissionSiBesoin();

    if (editId) {
      // ── Mode édition : remplace l'alarme existante ──
      const updated = alarmes.map(a => (a.id === editId ? { ...a, ...form } : a));
      await persist(updated);
      const alarmeModifiee = updated.find(a => a.id === editId);
      if (ok) await synchroniserNotifAlarme(alarmeModifiee); // reprogrammerAlarmeJoursSemaine annule et remplace l'ancienne programmation
    } else {
      // ── Mode création ──
      const alarme = { id: Date.now(), ...form };
      await persist([...alarmes, alarme]);
      if (ok && alarme.actif) await synchroniserNotifAlarme(alarme);
    }

    fermerFormulaire();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>⏰ Réveil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {!permissionOk && (
          <TouchableOpacity style={styles.permissionBanner} onPress={demanderPermissionSiBesoin}>
            <Text style={styles.permissionBannerText}>
              ⚠️ Notifications désactivées — tes alarmes ne pourront pas te prévenir. Appuie ici pour autoriser.
            </Text>
          </TouchableOpacity>
        )}

        {alarmes.map(a => (
          <View key={a.id} style={[styles.alarmCard, { borderColor: a.actif ? PALETTE.yellow + '30' : 'rgba(255,255,255,0.06)', opacity: a.actif ? 1 : 0.55 }]}>
            <View style={styles.alarmHeader}>
              <TouchableOpacity onPress={() => ouvrirEdition(a)} style={{ flex: 1 }}>
                <Text style={[styles.alarmHeure, { color: a.actif ? PALETTE.yellow : '#666677' }]}>{a.heure}</Text>
                <Text style={styles.alarmLabel}>{a.label}</Text>
                {a.actif && permissionOk && <Text style={styles.activeRealTag}>🔔 Notification programmée</Text>}
              </TouchableOpacity>
              <Toggle value={a.actif} onChange={() => toggleAlarme(a.id)} color={PALETTE.yellow} />
            </View>

            <View style={styles.joursRow}>
              {JOURS.map((j, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => toggleJour(a.id, idx)}
                  style={[styles.jourBtn, { backgroundColor: a.jours[idx] ? PALETTE.yellow + '25' : 'rgba(255,255,255,0.04)', borderColor: a.jours[idx] ? PALETTE.yellow : 'rgba(255,255,255,0.08)' }]}
                >
                  <Text style={{ fontSize: 10, color: a.jours[idx] ? PALETTE.yellow : '#555566', fontWeight: a.jours[idx] ? '700' : '400' }}>{j}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.alarmFooter}>
              <Text style={styles.alarmSon}>🔊 {a.son}</Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <TouchableOpacity onPress={() => ouvrirEdition(a)}>
                  <Text style={{ color: PALETTE.yellow, fontSize: 11 }}>✏️ Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeAlarme(a.id)}>
                  <Text style={{ color: PALETTE.pink, fontSize: 11 }}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {!showAdd ? (
          <TouchableOpacity style={[styles.addBtn, { borderColor: PALETTE.yellow + '40' }]} onPress={ouvrirCreation}>
            <Text style={[styles.addBtnText, { color: PALETTE.yellow }]}>+ Nouvelle alarme</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { borderColor: PALETTE.yellow + '25' }]}>
            <Text style={styles.formTitle}>{editId ? "✏️ Modifier l'alarme" : '+ Nouvelle alarme'}</Text>

            <Text style={styles.fieldLabel}>Heure</Text>
            <TextInput style={styles.input} placeholder="07:00" placeholderTextColor="#555566" value={form.heure} onChangeText={t => setForm({ ...form, heure: t })} />
            <Text style={styles.fieldLabel}>Nom de l'alarme</Text>
            <TextInput style={styles.input} placeholder="Ex: Réveil matin" placeholderTextColor="#555566" value={form.label} onChangeText={t => setForm({ ...form, label: t })} />
            <Text style={styles.fieldLabel}>Jours</Text>
            <View style={styles.joursRow}>
              {JOURS.map((j, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    const jours = [...form.jours];
                    jours[idx] = !jours[idx];
                    setForm({ ...form, jours });
                  }}
                  style={[styles.jourBtn, { backgroundColor: form.jours[idx] ? PALETTE.yellow + '25' : 'rgba(255,255,255,0.04)', borderColor: form.jours[idx] ? PALETTE.yellow : 'rgba(255,255,255,0.08)' }]}
                >
                  <Text style={{ fontSize: 10, color: form.jours[idx] ? PALETTE.yellow : '#555566', fontWeight: form.jours[idx] ? '700' : '400' }}>{j}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Sonnerie</Text>
            <View style={styles.sonRow}>
              {SONNERIES.map(s => (
                <TouchableOpacity key={s} onPress={() => setForm({ ...form, son: s })} style={[styles.sonChip, { backgroundColor: form.son === s ? PALETTE.yellow + '22' : 'rgba(255,255,255,0.04)', borderColor: form.son === s ? PALETTE.yellow : 'rgba(255,255,255,0.08)' }]}>
                  <Text style={{ fontSize: 11, color: form.son === s ? PALETTE.yellow : '#666677' }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sonNote}>
              ℹ️ Sert pour l'instant à te souvenir de l'ambiance choisie — la notification
              utilise le son par défaut d'Android tant que le "vrai" moteur d'alarme (avec
              sonneries distinctes) n'est pas construit.
            </Text>
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: PALETTE.yellow }]} onPress={validerFormulaire}>
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>{editId ? 'Enregistrer' : 'Créer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={fermerFormulaire}>
                <Text style={{ color: '#888899', fontSize: 13 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
          <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
          <Text style={styles.coachText}>
            Pour 8h de sommeil avec un réveil à 7h, couche-toi avant 23h00. Une vraie
            notification programmée s'affiche à l'heure prévue, même app fermée — pense
            simplement à ne pas activer le mode silencieux sur ton téléphone, sinon elle restera
            muette (ce n'est pas encore un réveil façon "Horloge" qui sonne en boucle et ignore
            le silencieux — si tu veux ce niveau-là, dis-le moi, c'est un chantier à part).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  permissionBanner: { backgroundColor: 'rgba(255,101,132,0.12)', borderRadius: 12, padding: 12, marginBottom: 14 },
  permissionBannerText: { fontSize: 11, color: PALETTE.pink, lineHeight: 16 },
  alarmCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  alarmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  alarmHeure: { fontSize: 26, fontWeight: '800' },
  alarmLabel: { fontSize: 12, color: '#888899', marginTop: 2 },
  activeRealTag: { fontSize: 9, color: PALETTE.green, marginTop: 4 },
  joursRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  jourBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  alarmFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alarmSon: { fontSize: 11, color: '#666677' },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 4 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: { backgroundColor: 'rgba(251,191,36,0.07)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 10 },
  formTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 8 },
  fieldLabel: { fontSize: 10, color: '#888899', marginBottom: 5, marginTop: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10 },
  sonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sonChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  sonNote: { fontSize: 10, color: '#555566', lineHeight: 15, marginTop: 8 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1, marginTop: 16 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
});
