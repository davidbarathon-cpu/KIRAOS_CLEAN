// ═══════════════════════════════════════════
//  NOTESSCREEN.JS — Module Notes
//  Kira pourra y ajouter des notes dictées
//  (ex: "Kira, note qu'il faut acheter des
//  cordes de guitare") une fois le micro branché.
//  Pour l'instant : ajout manuel + structure prête
//  pour que Kira y écrive plus tard.
// ═══════════════════════════════════════════

import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BackButton } from '../components/Shared';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const COLORS = [PALETTE.purple, PALETTE.orange, PALETTE.teal, PALETTE.pink, PALETTE.blue, PALETTE.violet, PALETTE.magenta, PALETTE.green];

const DEFAULT_NOTES = [
  { id: 1, t: 'Idées chanson', txt: 'Accord Cadd9 intro → verse Dm → chorus G\nThème : voyage et liberté\nBPM environ 100', c: PALETTE.orange, source: 'manuel' },
  { id: 2, t: 'Exercices guitare', txt: 'Pentatonique 20 min chaque matin avant café\nObjectif : 120 BPM avant fin du mois', c: PALETTE.violet, source: 'manuel' },
];

export default function NotesScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [notes, setNotes] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newNote, setNewNote] = useState({ t: '', txt: '', c: COLORS[0] });

  useEffect(() => {
    getData('notes').then(n => setNotes(n && n.length ? n : DEFAULT_NOTES));
  }, []);

  const persist = async list => {
    setNotes(list);
    await setData('notes', list);
  };

  const addNote = () => {
    if (!newNote.t.trim()) return;
    persist([...notes, { id: Date.now(), ...newNote, source: 'manuel' }]);
    setNewNote({ t: '', txt: '', c: COLORS[0] });
    setShowAdd(false);
  };

  const updateNoteText = (idx, txt) => {
    const updated = notes.map((n, i) => (i === idx ? { ...n, txt } : n));
    setNotes(updated);
  };

  const saveNoteEdit = async idx => {
    await setData('notes', notes);
    setEditIdx(null);
  };

  const deleteNote = idx => {
    persist(notes.filter((_, i) => i !== idx));
    setEditIdx(null);
  };

  // ── Vue édition d'une note ──
  if (editIdx !== null) {
    const note = notes[editIdx];
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => saveNoteEdit(editIdx)} />
          <Text style={styles.headerTitle} numberOfLines={1}>{note.t}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {note.source === 'kira' && (
            <View style={styles.kiraBadge}>
              <Text style={styles.kiraBadgeText}>🌟 Note ajoutée par Kira</Text>
            </View>
          )}
          <TextInput
            style={styles.editTextarea}
            multiline
            value={note.txt}
            onChangeText={t => updateNoteText(editIdx, t)}
            placeholder="Contenu de la note..."
            placeholderTextColor="#555566"
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: 'rgba(255,255,255,0.07)' }]}
              onPress={() => saveNoteEdit(editIdx)}
            >
              <Text style={{ color: '#888899', fontSize: 13 }}>← Retour (auto-enregistré)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: 'rgba(255,101,132,0.15)', borderWidth: 1, borderColor: 'rgba(255,101,132,0.3)' }]}
              onPress={() => deleteNote(editIdx)}
            >
              <Text style={{ color: PALETTE.pink, fontSize: 13 }}>🗑 Supprimer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Vue liste des notes ──
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>📝 Notes</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {notes.length === 0 && (
          <Text style={styles.emptyText}>Aucune note. Ajoute-en une, ou demande à Kira de le faire pour toi !</Text>
        )}

        {notes.map((note, i) => (
          <TouchableOpacity
            key={note.id}
            style={[styles.noteCard, { borderColor: note.c + '22', borderLeftColor: note.c }]}
            onPress={() => setEditIdx(i)}
            activeOpacity={0.85}
          >
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle}>{note.t}</Text>
              {note.source === 'kira' && <Text style={{ fontSize: 12 }}>🌟</Text>}
            </View>
            <Text style={styles.notePreview} numberOfLines={2}>{note.txt}</Text>
          </TouchableOpacity>
        ))}

        {!showAdd ? (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: PALETTE.magenta + '40' }]}
            onPress={() => setShowAdd(true)}
          >
            <Text style={[styles.addBtnText, { color: PALETTE.magenta }]}>+ Nouvelle note</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { borderColor: PALETTE.magenta + '25' }]}>
            <TextInput
              style={styles.input}
              placeholder="Titre de la note..."
              placeholderTextColor="#555566"
              value={newNote.t}
              onChangeText={t => setNewNote({ ...newNote, t })}
            />
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Contenu de la note..."
              placeholderTextColor="#555566"
              value={newNote.txt}
              onChangeText={t => setNewNote({ ...newNote, txt: t })}
              multiline
            />
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewNote({ ...newNote, c })}
                  style={[styles.colorDot, { backgroundColor: c, borderWidth: newNote.c === c ? 3 : 0 }]}
                />
              ))}
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: PALETTE.magenta }]} onPress={addNote}>
                <Text style={styles.formBtnTextPrimary}>Créer la note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                onPress={() => setShowAdd(false)}
              >
                <Text style={styles.formBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🚧 Une fois le module micro branché, tu pourras dire "Kira, note que..." et la note
            apparaîtra ici automatiquement avec le badge 🌟.
          </Text>
        </View>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  notePreview: { fontSize: 12, color: '#666677', lineHeight: 17 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 6 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: { backgroundColor: 'rgba(244,114,182,0.07)', borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 9,
    color: '#fff',
    fontSize: 13,
    padding: 10,
    marginBottom: 8,
  },
  colorRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  colorDot: { width: 24, height: 24, borderRadius: 12, borderColor: '#fff' },
  formActions: { flexDirection: 'row', gap: 8 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  formBtnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 13 },
  formBtnText: { color: '#888899', fontSize: 13 },
  kiraBadge: { backgroundColor: 'rgba(108,99,255,0.12)', borderRadius: 10, padding: 10, marginBottom: 12, alignSelf: 'flex-start' },
  kiraBadgeText: { fontSize: 11, color: PALETTE.violet, fontWeight: '600' },
  editTextarea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    minHeight: 220,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  infoBox: { marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  infoText: { fontSize: 11, color: '#444455', lineHeight: 17, textAlign: 'center' },
});
