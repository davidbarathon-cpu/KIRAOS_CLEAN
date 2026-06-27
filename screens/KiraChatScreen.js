// ═══════════════════════════════════════════
//  KIRACHATSCREEN.JS — Chat avec Kira
//  MISE À JOUR LOT 6 : utilise maintenant
//  demanderAKira() qui tente un vrai appel IA
//  (Gemini/Mistral/Claude/OpenAI selon config)
//  et bascule sur le mode hors-ligne si besoin.
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import KiraIcon from '../components/KiraIcon';
import { demanderAKira } from '../utils/aiCaller';
import { AI_PROVIDERS, getActiveAiProvider, getActiveKiraIcon, getAllApiKeys } from '../utils/apiKeys';
import { estConnecteAGoogle } from '../utils/googleAuth';
import { creerEvenementGoogle, supprimerEvenementGoogle } from '../utils/googleCalendar';
import { analyzeContext } from '../utils/kiraBrain';
import { detecterAjoutCourse, detecterAjoutNote, detecterCreationEvenement, detecterCreationPlaylist, detecterDemandeActualites, detecterDemandeLectureEnCours, detecterDemandeTraduction, detecterSuppressionEvenement } from '../utils/kiraIntents';
import { getActualites } from '../utils/newsCaller';
import { creerPlaylist, getLectureEnCours } from '../utils/spotifyApi';
import { estConnecteASpotify } from '../utils/spotifyAuth';
import { getData, setData } from '../utils/storage';
import { getTheme, KIRA_STATE_LABELS, PALETTE } from '../utils/theme';
import { traduireTexte } from '../utils/translationCaller';
import { demanderPermissionMicro, ecouterUneCommande, verifierPermissionMicro } from '../utils/voiceInput';

const SUGGESTIONS = [
  'Résume ma journée 💪',
  'Conseils guitare 🎸',
  'Mon horoscope du jour ✨',
  'Quel temps fait-il ? ⛅',
];

export default function KiraChatScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appState, setAppState] = useState({
    profil: {}, sante: {}, agenda: [], courses: [], notes: [], kiraState: 'flow',
  });
  const [providerActif, setProviderActif] = useState(null);
  const [kiraIconActive, setKiraIconActive] = useState('etoile');
  const [ecouteVocale, setEcouteVocale] = useState(false);
  const [voixActivee, setVoixActivee] = useState(true);
  const [kiraEnTrainDeParler, setKiraEnTrainDeParler] = useState(false);
  const arreterEcouteRef = React.useRef(null);
  const [apiKeys, setApiKeys] = useState({});
  const scrollRef = useRef(null);

  const chargerContexte = async () => {
    const [profil, sante, agenda, courses, notes, chat, provider, keys, iconActif, prefs] = await Promise.all([
      getData('profil'), getData('sante'), getData('agenda'),
      getData('courses'), getData('notes'), getData('chat'),
      getActiveAiProvider(), getAllApiKeys(), getActiveKiraIcon(), getData('prefs'),
    ]);
    const heureStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const kiraState = analyzeContext(agenda || [], sante || {}, heureStr);
    setAppState({ profil: profil || {}, sante: sante || {}, agenda: agenda || [], courses: courses || [], notes: notes || [], kiraState });
    setMessages(chat && chat.length > 0 ? chat : []);
    setProviderActif(provider);
    setApiKeys(keys || {});
    setKiraIconActive(iconActif);
    // Le réglage "Voix de Kira" (Paramètres → Kira) est activé par défaut
    // tant que l'utilisateur ne l'a pas explicitement désactivé.
    setVoixActivee(prefs?.voix !== false);
  };

  useEffect(() => { chargerContexte(); }, []);
  useFocusEffect(React.useCallback(() => { chargerContexte(); }, []));

  // Coupe immédiatement la voix de Kira si l'utilisateur quitte l'écran
  // pendant qu'elle parle — sinon la lecture continuerait en arrière-plan.
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  /**
   * Lit à voix haute la dernière réponse de Kira, si le réglage "Voix de
   * Kira" est activé. Nettoie le texte des marqueurs markdown (**gras**,
   * emojis en trop) pour une lecture plus naturelle, et limite la longueur
   * pour éviter une lecture interminable sur une réponse très détaillée.
   */
  const lireReponseKira = texte => {
    if (!voixActivee) return;
    const texteNettoye = texte
      .replace(/\*\*/g, '')
      .replace(/\n+/g, '. ')
      .slice(0, 600);
    if (!texteNettoye.trim()) return;

    Speech.stop();
    setKiraEnTrainDeParler(true);
    Speech.speak(texteNettoye, {
      language: 'fr-FR',
      onDone: () => setKiraEnTrainDeParler(false),
      onStopped: () => setKiraEnTrainDeParler(false),
      onError: () => setKiraEnTrainDeParler(false),
    });
  };

  const arreterLaVoix = () => {
    Speech.stop();
    setKiraEnTrainDeParler(false);
  };

  const persistChat = async msgs => {
    setMessages(msgs);
    await setData('chat', msgs.slice(-60));
    // Lit à voix haute uniquement si le dernier message est bien une
    // réponse de Kira (et non le message de l'utilisateur qui vient
    // d'être ajouté juste avant l'appel à l'IA).
    const dernierMessage = msgs[msgs.length - 1];
    if (dernierMessage?.r === 'ai') {
      lireReponseKira(dernierMessage.t);
    }
  };

  const toggleEcouteVocale = async () => {
    if (ecouteVocale) {
      arreterEcouteRef.current?.();
      setEcouteVocale(false);
      return;
    }

    // Coupe la voix de Kira avant d'écouter — sinon le micro risquerait de
    // capter sa propre réponse en train d'être lue à voix haute.
    arreterLaVoix();

    let permissionOk = await verifierPermissionMicro();
    if (!permissionOk) permissionOk = await demanderPermissionMicro();
    if (!permissionOk) {
      Alert.alert('Permission refusée', "Autorise l'accès au micro dans les réglages Android pour utiliser la reconnaissance vocale.");
      return;
    }

    setEcouteVocale(true);
    arreterEcouteRef.current = ecouterUneCommande({
      onResultatPartiel: txt => setInput(txt),
      onFin: texteFinal => {
        setEcouteVocale(false);
        if (texteFinal) {
          setInput(texteFinal);
          setTimeout(() => send(texteFinal), 200);
        }
      },
      onErreur: msg => {
        setEcouteVocale(false);
        Alert.alert('Reconnaissance vocale', msg);
      },
    });
  };

  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const withUser = [...messages, { r: 'user', t: msg }];
    setMessages(withUser);
    setInput('');
    setLoading(true);

    // ── 1. Essaie d'abord les actions directes (traduction, actualités) ──
    // Si l'intention est détectée ET la clé correspondante configurée,
    // Kira répond directement avec la vraie donnée sans passer par l'IA générale.

    const demandeTrad = detecterDemandeTraduction(msg);
    if (demandeTrad) {
      const deeplKey = apiKeys.deepl;
      const { texte: traduction, source: srcTrad } = await traduireTexte(demandeTrad.texte, 'fr', demandeTrad.langCible, deeplKey);
      const reponse = deeplKey
        ? `🌍 "${demandeTrad.texte}" → ${traduction}`
        : `🌍 Je peux traduire ça, mais je n'ai pas encore de clé DeepL configurée.\n\nAjoute-la dans Paramètres → 🔑 API, puis redemande-moi !`;
      const withReply = [...withUser, { r: 'ai', t: reponse, source: deeplKey ? srcTrad : 'non_configure' }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    if (detecterDemandeActualites(msg)) {
      const newsKey = apiKeys.newsapi;
      const { articles, source: srcNews } = await getActualites('Tout', newsKey);
      const titres = articles.slice(0, 4).map(a => `• ${a.t}`).join('\n');
      const reponse = newsKey
        ? `📰 Voici les actualités du moment :\n\n${titres}\n\nOuvre le module Actualités pour les détails complets !`
        : `📰 Voici quelques actualités de démonstration (configure NewsAPI dans Paramètres pour du vrai contenu) :\n\n${titres}`;
      const withReply = [...withUser, { r: 'ai', t: reponse, source: newsKey ? srcNews : 'non_configure' }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── Création d'événement (Google Agenda si connecté, sinon agenda local) ──
    const demandeCreation = detecterCreationEvenement(msg);
    if (demandeCreation) {
      const connecteGoogle = await estConnecteAGoogle();
      let reponse;
      if (connecteGoogle) {
        const { evenement, erreur } = await creerEvenementGoogle(demandeCreation.titre, demandeCreation.heure);
        if (erreur) {
          reponse = `⚠️ Je n'ai pas pu créer "${demandeCreation.titre}" dans ton Google Agenda : ${erreur}`;
        } else {
          const agendaActuel = (await getData('agenda')) || [];
          await setData('agenda', [...agendaActuel, evenement].sort((a, b) => (a.h || '').localeCompare(b.h || '')));
          reponse = `📅 C'est noté ! J'ai ajouté "${demandeCreation.titre}" à ${demandeCreation.heure} dans ton Google Agenda. 🌟`;
        }
      } else {
        const agendaActuel = (await getData('agenda')) || [];
        const nouvelEvenement = { id: Date.now(), h: demandeCreation.heure, t: demandeCreation.titre, l: '', dur: '1h', c: '#6C63FF', source: 'local' };
        await setData('agenda', [...agendaActuel, nouvelEvenement].sort((a, b) => a.h.localeCompare(b.h)));
        reponse = `📅 C'est noté ! J'ai ajouté "${demandeCreation.titre}" à ${demandeCreation.heure} dans ton agenda local.\n\n💡 Connecte ton compte Google dans le module Agenda pour que ça se synchronise aussi avec ton vrai calendrier !`;
      }
      const withReply = [...withUser, { r: 'ai', t: reponse }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── Suppression d'événement (recherche approximative par titre) ──
    const rechercheASupprimer = detecterSuppressionEvenement(msg);
    if (rechercheASupprimer) {
      const agendaActuel = (await getData('agenda')) || [];
      const evenementTrouve = agendaActuel.find(e => e.t.toLowerCase().includes(rechercheASupprimer.toLowerCase()));
      let reponse;
      if (!evenementTrouve) {
        reponse = `🤔 Je ne trouve pas d'événement correspondant à "${rechercheASupprimer}" dans ton agenda. Vérifie l'orthographe ou consulte le module Agenda directement.`;
      } else {
        if (evenementTrouve.source === 'google') {
          const { succes, erreur } = await supprimerEvenementGoogle(evenementTrouve.googleId);
          reponse = succes
            ? `🗑️ "${evenementTrouve.t}" a été supprimé de ton Google Agenda !`
            : `⚠️ Je n'ai pas pu le supprimer de Google Agenda : ${erreur}`;
          if (succes) await setData('agenda', agendaActuel.filter(e => e.id !== evenementTrouve.id));
        } else {
          await setData('agenda', agendaActuel.filter(e => e.id !== evenementTrouve.id));
          reponse = `🗑️ "${evenementTrouve.t}" a été supprimé de ton agenda !`;
        }
      }
      const withReply = [...withUser, { r: 'ai', t: reponse }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── Création de playlist Spotify ──
    const nomPlaylist = detecterCreationPlaylist(msg);
    if (nomPlaylist) {
      const connecteSpotify = await estConnecteASpotify();
      let reponse;
      if (!connecteSpotify) {
        reponse = `🎵 Je peux créer ça, mais tu n'es pas encore connecté à Spotify.\n\nConnecte ton compte dans le module Musique, puis redemande-moi !`;
      } else {
        const { playlist, erreur } = await creerPlaylist(nomPlaylist, 'Créée par Kira sur demande');
        reponse = erreur
          ? `⚠️ Je n'ai pas pu créer la playlist "${nomPlaylist}" : ${erreur}`
          : `🎵 C'est fait ! J'ai créé la playlist "${nomPlaylist}" sur ton compte Spotify. Tu peux y ajouter des morceaux depuis le module Musique. 🌟`;
      }
      const withReply = [...withUser, { r: 'ai', t: reponse }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── Consultation du morceau en cours ──
    if (detecterDemandeLectureEnCours(msg)) {
      const connecteSpotify = await estConnecteASpotify();
      let reponse;
      if (!connecteSpotify) {
        reponse = `🎵 Connecte ton compte Spotify dans le module Musique pour que je puisse voir ce que tu écoutes !`;
      } else {
        const { morceau, erreur } = await getLectureEnCours();
        if (erreur) reponse = `⚠️ Je n'ai pas pu vérifier : ${erreur}`;
        else if (!morceau) reponse = `🎵 Rien n'est en cours de lecture sur Spotify en ce moment.`;
        else reponse = `🎵 Tu écoutes "${morceau.titre}" de ${morceau.artiste} !${morceau.enCours ? '' : ' (en pause)'}`;
      }
      const withReply = [...withUser, { r: 'ai', t: reponse }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── Ajout d'un article à la liste de courses ──
    // Vérifié AVANT la détection de note, car certains messages pourraient
    // contenir le mot "note" tout en étant une vraie demande de courses
    // (ex: "note sur ma liste de courses : pain").
    const articleASupprimer = detecterAjoutCourse(msg);
    if (articleASupprimer) {
      const coursesActuelles = (await getData('courses')) || [];
      const nouvelArticle = { id: Date.now(), n: articleASupprimer, cat: 'Épicerie', q: '1', done: false };
      await setData('courses', [...coursesActuelles, nouvelArticle]);
      const reponse = `🛒 C'est noté ! J'ai ajouté "${articleASupprimer}" à ta liste de courses.`;
      const withReply = [...withUser, { r: 'ai', t: reponse }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── Ajout d'une note rapide ──
    const texteNote = detecterAjoutNote(msg);
    if (texteNote) {
      const notesActuelles = (await getData('notes')) || [];
      // Le titre de la note est une troncature du début du texte, pour que
      // la liste de notes reste lisible même si le contenu est long.
      const titre = texteNote.length > 40 ? `${texteNote.slice(0, 40)}…` : texteNote;
      const nouvelleNote = { id: Date.now(), t: titre, txt: texteNote, c: PALETTE.violet, source: 'kira' };
      await setData('notes', [...notesActuelles, nouvelleNote]);
      const reponse = `📝 C'est noté ! J'ai ajouté ça dans tes notes : "${texteNote}"`;
      const withReply = [...withUser, { r: 'ai', t: reponse }];
      await persistChat(withReply);
      setLoading(false);
      return;
    }

    // ── 2. Sinon, passe par l'IA générale (ou le mode hors-ligne si rien configuré) ──
    const providerInfo = AI_PROVIDERS.find(p => p.id === providerActif);
    const apiKey = providerActif ? apiKeys[providerActif] : null;
    const modele = providerInfo?.modeleParDefaut;

    const { texte, source, erreur } = await demanderAKira(msg, appState, providerActif, apiKey, modele);

    const withReply = [...withUser, { r: 'ai', t: texte, source, erreur }];
    await persistChat(withReply);
    setLoading(false);
  };

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages, loading]);

  const kLabel = KIRA_STATE_LABELS[appState.kiraState] || KIRA_STATE_LABELS.flow;
  const providerInfo = AI_PROVIDERS.find(p => p.id === providerActif);
  const statutTxt = providerInfo && apiKeys[providerActif] ? `🟢 ${providerInfo.nom}` : '💾 Mode hors-ligne';

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}>
        <View style={styles.avatarWrap}>
          <KiraIcon size={42} color={theme.accent} iconId={kiraIconActive} emojiSize={20} kiraState={appState.kiraState} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kiraName}>Kira</Text>
          <Text style={styles.kiraSub}>{statutTxt} · {kLabel}</Text>
        </View>
        {kiraEnTrainDeParler && (
          <TouchableOpacity onPress={arreterLaVoix} style={[styles.voixBtn, { backgroundColor: PALETTE.pink + '22' }]}>
            <Text style={{ fontSize: 13 }}>🔇</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Parametres')} style={styles.configBtn}>
          <Text style={{ fontSize: 13 }}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={{ color: '#aaa', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {!providerInfo && (
        <TouchableOpacity style={styles.setupBanner} onPress={() => navigation.navigate('Parametres')}>
          <Text style={styles.setupBannerText}>
            💡 Kira répond en mode hors-ligne (réponses pré-écrites). Configure une clé API gratuite (Gemini ou Mistral) dans Paramètres pour des réponses vraiment intelligentes et personnalisées →
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.messagesContainer}>
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={{ marginBottom: 12 }}>
              <KiraIcon size={64} color={theme.accent} iconId={kiraIconActive} emojiSize={30} />
            </View>
            <Text style={styles.emptyTitle}>Bonjour ! Je suis Kira 🌟</Text>
            <Text style={styles.emptySub}>Pose-moi une question sur ta santé,{'\n'}ta guitare, ton horoscope...</Text>
          </View>
        )}

        {messages.map((m, i) => (
          <View key={i} style={[styles.msgRow, { justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start' }]}>
            {m.r === 'ai' && (
              <KiraIcon size={26} color={theme.accent} iconId={kiraIconActive} emojiSize={13} />
            )}
            <View>
              <View
                style={[
                  styles.bubble,
                  m.r === 'user'
                    ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
                    : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: theme.accent + '22', borderWidth: 1, borderBottomLeftRadius: 4 },
                ]}
              >
                <Text style={[styles.bubbleText, m.r === 'user' && { color: '#fff' }]}>{m.t}</Text>
              </View>
              {m.r === 'ai' && m.source === 'offline' && m.erreur && (
                <Text style={styles.erreurTag}>⚠️ IA indisponible, réponse hors-ligne</Text>
              )}
            </View>
          </View>
        ))}

        {loading && (
          <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
            <KiraIcon size={26} color={theme.accent} iconId={kiraIconActive} emojiSize={13} />
            <View style={[styles.bubble, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={styles.bubbleText}>{providerInfo ? '...réflexion en cours...' : '...'}</Text>
            </View>
          </View>
        )}

        {messages.length === 0 && (
          <View style={styles.suggWrap}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s} style={[styles.suggBtn, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '10' }]} onPress={() => send(s)}>
                <Text style={{ color: theme.accent, fontSize: 11 }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.micBtn, { backgroundColor: ecouteVocale ? PALETTE.pink + '20' : 'rgba(255,255,255,0.06)', borderColor: ecouteVocale ? PALETTE.pink + '50' : 'rgba(255,255,255,0.1)' }]}
          onPress={toggleEcouteVocale}
        >
          <Text style={{ fontSize: 16 }}>{ecouteVocale ? '🔴' : '🎤'}</Text>
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder={ecouteVocale ? "🎤 Je t'écoute..." : "Parle à Kira..."}
            placeholderTextColor="#555566"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            editable={!ecouteVocale}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.accent : 'rgba(255,255,255,0.07)' }]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Text style={{ fontSize: 18, color: input.trim() ? '#fff' : '#444' }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  kiraName: { fontWeight: '800', color: '#fff', fontSize: 15 },
  kiraSub: { fontSize: 10, color: '#555566', marginTop: 1 },
  configBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  voixBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  setupBanner: { backgroundColor: 'rgba(108,99,255,0.1)', paddingHorizontal: 14, paddingVertical: 10 },
  setupBannerText: { fontSize: 10, color: '#aaa', lineHeight: 15 },
  messagesContainer: { padding: 14, paddingBottom: 20, flexGrow: 1 },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 12, color: '#444455', textAlign: 'center', lineHeight: 18 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  miniAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  bubbleText: { fontSize: 13, color: '#ddd', lineHeight: 19 },
  erreurTag: { fontSize: 9, color: PALETTE.pink, marginTop: 3, marginLeft: 4 },
  suggWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14, justifyContent: 'center' },
  suggBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  inputBar: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
  micBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  inputWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14 },
  input: { color: '#fff', fontSize: 13, paddingVertical: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
