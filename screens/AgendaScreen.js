// ═══════════════════════════════════════════
//  AGENDASCREEN.JS — Module Agenda
//  MISE À JOUR LOT 10 : synchronisation réelle
//  avec Google Agenda (OAuth). Les événements
//  Google et locaux coexistent ; les événements
//  Google ont un badge distinctif et ne peuvent
//  être édités que via synchronisation (pour
//  éviter les conflits), mais peuvent être
//  supprimés (ce qui les supprime aussi côté Google).
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackButton } from '../components/Shared';
import {
  construireConfigOAuth,
  deconnecterGoogle,
  DECOUVERTE_GOOGLE,
  echangerCodeContreJeton, estConnecteAGoogle,
  getGoogleClientId,
} from '../utils/googleAuth';
import { creerEvenementGoogle, listerEvenementsGoogle, supprimerEvenementGoogle } from '../utils/googleCalendar';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

const COLORS = [PALETTE.purple, PALETTE.pink, PALETTE.teal, PALETTE.orange, PALETTE.blue, PALETTE.magenta];

export default function AgendaScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ h: '09:00', t: '', l: '', c: COLORS[0] });
  const [connecteGoogle, setConnecteGoogle] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [erreurSync, setErreurSync] = useState(null);
  const [request, response, promptAsync] = useOAuthRequest(clientId);

  const chargerEtat = useCallback(async () => {
    const [a, cid, connecte] = await Promise.all([
      getData('agenda'),
      getGoogleClientId(),
      estConnecteAGoogle(),
    ]);
    setEvents(a || []);
    setClientId(cid);
    setConnecteGoogle(connecte);
  }, []);

  useEffect(() => { chargerEtat(); }, []);
  useFocusEffect(useCallback(() => { chargerEtat(); }, [chargerEtat]));

  // ── Gère la réponse OAuth une fois l'utilisateur revenu du navigateur Google ──
  useEffect(() => {
    (async () => {
      if (response?.type === 'success' && response.params?.code && request) {
        try {
          await echangerCodeContreJeton(response.params.code, clientId, request.redirectUri, request.codeVerifier);
          setConnecteGoogle(true);
          await synchroniser();
        } catch (e) {
          Alert.alert('Erreur de connexion', e.message);
        }
      } else if (response?.type === 'error') {
        Alert.alert('Connexion annulée', "La connexion à Google n'a pas pu être finalisée.");
      }
    })();
  }, [response]);

  const seConnecter = async () => {
    if (!clientId) {
      Alert.alert(
        'Configuration requise',
        "Tu dois d'abord configurer ton Client ID Google dans Paramètres → 🔑 API. Consulte le guide d'installation pour savoir comment le créer.",
        [{ text: 'Aller aux Paramètres', onPress: () => navigation.navigate('Parametres') }, { text: 'Annuler', style: 'cancel' }]
      );
      return;
    }
    await promptAsync();
  };

  const seDeconnecter = async () => {
    Alert.alert('Déconnexion Google', 'Tes événements Google ne seront plus synchronisés (les événements locaux restent intacts).', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive', onPress: async () => {
          await deconnecterGoogle();
          setConnecteGoogle(false);
          // Retire les événements Google de la liste affichée, garde les locaux
          const locauxSeuls = events.filter(e => e.source !== 'google');
          await persist(locauxSeuls);
        },
      },
    ]);
  };

  const synchroniser = async () => {
    setSyncing(true);
    setErreurSync(null);
    const { evenements: evtsGoogle, erreur } = await listerEvenementsGoogle(1);

    if (erreur && erreur !== 'NON_CONNECTE') {
      setErreurSync(erreur);
      setSyncing(false);
      return;
    }

    // Fusionne : garde les événements locaux (source absente ou 'local'),
    // remplace tous les anciens événements Google par les nouveaux récupérés
    const locaux = events.filter(e => e.source !== 'google');
    const fusion = [...locaux, ...evtsGoogle].sort((a, b) => (a.h || '').localeCompare(b.h || ''));
    await persist(fusion);
    setSyncing(false);
  };

  const persist = async list => {
    setEvents(list);
    await setData('agenda', list);
  };

  const addEvent = async () => {
    if (!newEvent.t.trim()) return;

    if (connecteGoogle) {
      // Crée directement dans Google — il sera récupéré au prochain sync,
      // mais on l'ajoute aussi immédiatement en local pour un retour visuel instantané
      setSyncing(true);
      const { evenement, erreur } = await creerEvenementGoogle(newEvent.t, newEvent.h, null, newEvent.l);
      setSyncing(false);
      if (erreur) {
        Alert.alert('Erreur', `Impossible de créer l'événement dans Google Agenda : ${erreur}`);
        return;
      }
      const fusion = [...events, evenement].sort((a, b) => (a.h || '').localeCompare(b.h || ''));
      await persist(fusion);
    } else {
      const ev = { id: Date.now(), ...newEvent, dur: '1h', source: 'local' };
      await persist([...events, ev].sort((a, b) => a.h.localeCompare(b.h)));
    }

    setNewEvent({ h: '09:00', t: '', l: '', c: COLORS[0] });
    setShowAdd(false);
  };

  const removeEvent = async ev => {
    if (ev.source === 'google') {
      setSyncing(true);
      const { succes, erreur } = await supprimerEvenementGoogle(ev.googleId);
      setSyncing(false);
      if (!succes) {
        Alert.alert('Erreur', `Impossible de supprimer dans Google Agenda : ${erreur}`);
        return;
      }
    }
    await persist(events.filter(e => e.id !== ev.id));
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>📅 Agenda</Text>
        {syncing && <ActivityIndicator color={theme.accent} size="small" />}
      </View>

      {/* ── Bandeau de connexion Google ── */}
      <View style={[styles.googleBanner, connecteGoogle ? styles.googleBannerOk : styles.googleBannerOff]}>
        <Text style={{ fontSize: 16 }}>{connecteGoogle ? '🟢' : '📅'}</Text>
        <Text style={styles.googleBannerText}>
          {connecteGoogle ? 'Synchronisé avec Google Agenda' : 'Connecte ton compte Google pour synchroniser'}
        </Text>
        {connecteGoogle ? (
          <TouchableOpacity onPress={synchroniser}>
            <Text style={[styles.googleBannerAction, { color: theme.accent }]}>🔄 Sync</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={seConnecter}>
            <Text style={[styles.googleBannerAction, { color: theme.accent }]}>Connecter →</Text>
          </TouchableOpacity>
        )}
      </View>

      {erreurSync && (
        <View style={styles.erreurBanner}>
          <Text style={styles.erreurBannerText}>⚠️ Erreur de synchronisation : {erreurSync.slice(0, 100)}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {events.length === 0 && (
          <Text style={styles.emptyText}>Aucun événement. Ajoute-en un ci-dessous !</Text>
        )}

        {events.map(ev => (
          <View key={ev.id} style={[styles.eventCard, { borderColor: ev.c + '22', borderLeftColor: ev.c }]}>
            <Text style={styles.eventHeure}>{ev.h}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.eventTitleRow}>
                <Text style={styles.eventTitle}>{ev.t}</Text>
                {ev.source === 'google' && <Text style={styles.googleTag}>G</Text>}
              </View>
              {ev.l ? <Text style={styles.eventLieu}>📍 {ev.l} · {ev.dur}</Text> : <Text style={styles.eventLieu}>{ev.dur}</Text>}
            </View>
            <TouchableOpacity onPress={() => removeEvent(ev)}>
              <Text style={styles.removeBtn}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {!showAdd ? (
          <TouchableOpacity style={[styles.addBtn, { borderColor: theme.accent + '40' }]} onPress={() => setShowAdd(true)}>
            <Text style={[styles.addBtnText, { color: theme.accent }]}>+ Ajouter un événement</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addForm, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
            {connecteGoogle && (
              <Text style={styles.addFormGoogleNote}>📅 Sera ajouté directement à ton Google Agenda</Text>
            )}
            <TextInput style={styles.input} placeholder="Heure (ex: 14:30)" placeholderTextColor="#555566" value={newEvent.h} onChangeText={t => setNewEvent({ ...newEvent, h: t })} />
            <TextInput style={styles.input} placeholder="Titre de l'événement..." placeholderTextColor="#555566" value={newEvent.t} onChangeText={t => setNewEvent({ ...newEvent, t })} />
            <TextInput style={styles.input} placeholder="Lieu (optionnel)" placeholderTextColor="#555566" value={newEvent.l} onChangeText={t => setNewEvent({ ...newEvent, l: t })} />
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setNewEvent({ ...newEvent, c })} style={[styles.colorDot, { backgroundColor: c, borderWidth: newEvent.c === c ? 3 : 0 }]} />
              ))}
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: theme.accent }]} onPress={addEvent}>
                <Text style={styles.formBtnTextPrimary}>Ajouter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setShowAdd(false)}>
                <Text style={styles.formBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {connecteGoogle && (
          <TouchableOpacity style={styles.deconnecterBtn} onPress={seDeconnecter}>
            <Text style={styles.deconnecterText}>Déconnecter Google Agenda</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Hook séparé pour respecter les règles des hooks React (useAuthRequest
 * doit être appelé inconditionnellement) même quand clientId n'est pas
 * encore chargé — on lui passe une config "vide" tant que ce n'est pas prêt.
 */
function useOAuthRequest(clientId) {
  const config = clientId ? construireConfigOAuth(clientId) : { clientId: 'placeholder', scopes: [], redirectUri: AuthSession.makeRedirectUri({ scheme: 'kiraos' }) };
  return AuthSession.useAuthRequest(config, DECOUVERTE_GOOGLE);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  googleBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  googleBannerOk: { backgroundColor: 'rgba(67,217,173,0.1)' },
  googleBannerOff: { backgroundColor: 'rgba(108,99,255,0.08)' },
  googleBannerText: { flex: 1, fontSize: 11, color: '#aaa' },
  googleBannerAction: { fontSize: 11, fontWeight: '700' },
  erreurBanner: { backgroundColor: 'rgba(255,101,132,0.12)', paddingHorizontal: 16, paddingVertical: 8 },
  erreurBannerText: { fontSize: 10, color: PALETTE.pink },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  eventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 8, borderWidth: 1, borderLeftWidth: 3 },
  eventHeure: { fontSize: 11, color: '#555566', minWidth: 42, paddingTop: 2 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  googleTag: { fontSize: 9, color: '#4285F4', backgroundColor: '#4285F420', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, fontWeight: '700' },
  eventLieu: { fontSize: 11, color: '#555566', marginTop: 3 },
  removeBtn: { color: '#333344', fontSize: 18, lineHeight: 18 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 6 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  addForm: { borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 10 },
  addFormGoogleNote: { fontSize: 10, color: '#4285F4', marginBottom: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10, marginBottom: 8 },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 2 },
  colorDot: { width: 26, height: 26, borderRadius: 13, borderColor: '#fff' },
  formActions: { flexDirection: 'row', gap: 8 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  formBtnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 13 },
  formBtnText: { color: '#888899', fontSize: 13 },
  deconnecterBtn: { marginTop: 16, padding: 10, alignItems: 'center' },
  deconnecterText: { fontSize: 11, color: PALETTE.pink },
});
