// ═══════════════════════════════════════════
//  ECOUTERAPIDESCREEN.JS — Écran d'écoute rapide
//  Ouvert directement par l'App Shortcut Android
//  (appui long sur l'icône Kira OS → "Parler à Kira").
//  Lance le micro IMMÉDIATEMENT à l'ouverture, sans
//  navigation supplémentaire — l'objectif est la
//  rapidité maximale pour une commande ponctuelle.
//  Une fois la commande traitée, propose de revenir
//  à l'app normale ou de fermer directement.
// ═══════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import KiraIcon from '../components/KiraIcon';
import { demanderAKira } from '../utils/aiCaller';
import { AI_PROVIDERS, getActiveAiProvider, getActiveKiraIcon, getAllApiKeys } from '../utils/apiKeys';
import { analyzeContext } from '../utils/kiraBrain';
import { detecterCreationEvenement } from '../utils/kiraIntents';
import { getData, setData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';
import { demanderPermissionMicro, ecouterUneCommande, verifierPermissionMicro } from '../utils/voiceInput';

export default function EcouteRapideScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [etat, setEtat] = useState('init'); // init | ecoute | traitement | reponse | erreur
  const [texteEntendu, setTexteEntendu] = useState('');
  const [reponseKira, setReponseKira] = useState('');
  const [erreur, setErreur] = useState(null);
  const [kiraIconActive, setKiraIconActive] = useState('etoile');
  const arreterEcoute = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getActiveKiraIcon().then(setKiraIconActive);
    demarrer();

    // Permet de fermer cet écran rapide avec le bouton retour Android,
    // sans repasser par toute la pile de navigation habituelle.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (etat === 'ecoute') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [etat]);

  const demarrer = async () => {
    let permissionOk = await verifierPermissionMicro();
    if (!permissionOk) {
      permissionOk = await demanderPermissionMicro();
    }
    if (!permissionOk) {
      setErreur('Permission micro refusée. Autorise-la dans les réglages Android pour utiliser cette fonctionnalité.');
      setEtat('erreur');
      return;
    }

    setEtat('ecoute');
    arreterEcoute.current = ecouterUneCommande({
      onResultatPartiel: txt => setTexteEntendu(txt),
      onFin: texteFinal => {
        if (!texteFinal) {
          setErreur("Je n'ai rien entendu. Réessaie.");
          setEtat('erreur');
        } else {
          setTexteEntendu(texteFinal);
          traiterCommande(texteFinal);
        }
      },
      onErreur: msg => {
        setErreur(msg);
        setEtat('erreur');
      },
    });
  };

  const traiterCommande = async texte => {
    setEtat('traitement');

    const [profil, sante, agenda, courses, notes, provider, apiKeys] = await Promise.all([
      getData('profil'), getData('sante'), getData('agenda'),
      getData('courses'), getData('notes'),
      getActiveAiProvider(), getAllApiKeys(),
    ]);
    const heureStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const kiraState = analyzeContext(agenda || [], sante || {}, heureStr);
    const appState = { profil: profil || {}, sante: sante || {}, agenda: agenda || [], courses: courses || [], notes: notes || [], kiraState };

    // Détection rapide des actions directes (mêmes intentions que le chat complet) —
    // pour rester cohérent, on garde la logique simple ici ; les actions plus complexes
    // (Spotify, agenda Google) restent gérées dans le chat normal pour plus de contrôle.
    const demandeCreationEvt = detecterCreationEvenement(texte);
    if (demandeCreationEvt) {
      const agendaActuel = (await getData('agenda')) || [];
      const nouvelEvenement = { id: Date.now(), h: demandeCreationEvt.heure, t: demandeCreationEvt.titre, l: '', dur: '1h', c: '#6C63FF', source: 'local' };
      await setData('agenda', [...agendaActuel, nouvelEvenement].sort((a, b) => a.h.localeCompare(b.h)));
      finaliser(`📅 C'est noté ! "${demandeCreationEvt.titre}" à ${demandeCreationEvt.heure}.`);
      return;
    }

    const providerInfo = AI_PROVIDERS.find(p => p.id === provider);
    const apiKey = provider ? apiKeys[provider] : null;
    const { texte: reponse } = await demanderAKira(texte, appState, provider, apiKey, providerInfo?.modeleParDefaut);
    finaliser(reponse);
  };

  const finaliser = reponse => {
    setReponseKira(reponse);
    setEtat('reponse');

    const clean = reponse.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 400);
    try {
      const Speech = require('expo-speech');
      Speech.speak(clean, { language: 'fr-FR' });
    } catch {
      // expo-speech non disponible ou erreur silencieuse — pas bloquant
    }
  };

  const reessayer = () => {
    setEtat('init');
    setTexteEntendu('');
    setReponseKira('');
    setErreur(null);
    demarrer();
  };

  const ouvrirChatComplet = () => {
    navigation.navigate('KiraChat');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: etat === 'ecoute' ? pulseAnim : 1 }] }}>
          <KiraIcon size={100} color={theme.accent} iconId={kiraIconActive} emojiSize={48} />
        </Animated.View>

        <Text style={styles.etatTexte}>
          {etat === 'init' && 'Initialisation...'}
          {etat === 'ecoute' && "🎤 Je t'écoute..."}
          {etat === 'traitement' && 'Kira réfléchit...'}
          {etat === 'reponse' && 'Voilà !'}
          {etat === 'erreur' && '⚠️ Oups'}
        </Text>

        {(etat === 'ecoute' || etat === 'traitement' || etat === 'reponse') && texteEntendu && (
          <View style={[styles.bulle, { borderColor: theme.accent + '30' }]}>
            <Text style={styles.bulleLabel}>Toi :</Text>
            <Text style={styles.bulleTexte}>{texteEntendu}</Text>
          </View>
        )}

        {etat === 'reponse' && (
          <View style={[styles.bulle, styles.bulleReponse, { borderColor: theme.accent + '40' }]}>
            <Text style={[styles.bulleLabel, { color: theme.accent }]}>Kira :</Text>
            <Text style={styles.bulleTexte}>{reponseKira}</Text>
          </View>
        )}

        {etat === 'erreur' && (
          <View style={[styles.bulle, { borderColor: PALETTE.pink + '40' }]}>
            <Text style={[styles.bulleTexte, { color: PALETTE.pink }]}>{erreur}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {(etat === 'reponse' || etat === 'erreur') && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={reessayer}>
              <Text style={styles.btnTexte}>🎤 Nouvelle commande</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnSecondaire]} onPress={ouvrirChatComplet}>
            <Text style={[styles.btnTexte, { color: '#aaa' }]}>💬 Ouvrir le chat complet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnFermer} onPress={() => navigation.goBack()}>
            <Text style={styles.btnFermerTexte}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  etatTexte: { color: '#fff', fontSize: 17, fontWeight: '600', marginTop: 20, marginBottom: 20 },
  bulle: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  bulleReponse: { backgroundColor: 'rgba(108,99,255,0.08)' },
  bulleLabel: { fontSize: 10, color: '#666677', fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  bulleTexte: { fontSize: 14, color: '#e0e0e8', lineHeight: 20 },
  actions: { width: '100%', marginTop: 16, gap: 10 },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  btnSecondaire: { backgroundColor: 'rgba(255,255,255,0.06)' },
  btnTexte: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnFermer: { alignItems: 'center', padding: 10 },
  btnFermerTexte: { color: '#555566', fontSize: 13 },
});
