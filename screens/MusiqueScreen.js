// ═══════════════════════════════════════════
//  MUSIQUESCREEN.JS — Module Musique
//  MISE À JOUR LOT 12 : connexion Spotify réelle
//  (OAuth), recherche, lecture en cours, contrôle
//  (Premium requis), gestion de playlists.
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BackButton, KiraHeaderIcon } from '../components/Shared';
import {
  ajouterMorceauxAPlaylist,
  creerPlaylist,
  getLectureEnCours,
  getMorceauxPlaylist,
  jouerSpotify,
  jouerUri, listerPlaylists,
  pauseSpotify,
  precedentSpotify,
  rechercherSpotify,
  suivantSpotify,
} from '../utils/spotifyApi';
import {
  construireConfigOAuthSpotify,
  deconnecterSpotify,
  DECOUVERTE_SPOTIFY,
  echangerCodeContreJetonSpotify, estConnecteASpotify,
  getSpotifyClientId,
} from '../utils/spotifyAuth';
import { getTheme, PALETTE } from '../utils/theme';

export default function MusiqueScreen({ navigation }) {
  const theme = getTheme('cosmos');
  const [connecte, setConnecte] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [request, response, promptAsync] = useSpotifyOAuthRequest(clientId);

  const [tab, setTab] = useState('recherche'); // 'recherche' | 'playlists'
  const [requeteRecherche, setRequeteRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherchant, setRecherchant] = useState(false);

  const [lectureEnCours, setLectureEnCours] = useState(null);
  const [erreurLecture, setErreurLecture] = useState(null);

  const [playlists, setPlaylists] = useState([]);
  const [playlistOuverte, setPlaylistOuverte] = useState(null);
  const [morceauxPlaylist, setMorceauxPlaylist] = useState([]);
  const [showCreerPlaylist, setShowCreerPlaylist] = useState(false);
  const [nomNouvellePlaylist, setNomNouvellePlaylist] = useState('');

  const chargerEtat = useCallback(async () => {
    const [cid, est] = await Promise.all([getSpotifyClientId(), estConnecteASpotify()]);
    setClientId(cid);
    setConnecte(est);
    if (est) {
      rafraichirLectureEnCours();
      chargerPlaylists();
    }
  }, []);

  useEffect(() => { chargerEtat(); }, []);
  useFocusEffect(useCallback(() => { chargerEtat(); }, [chargerEtat]));

  useEffect(() => {
    (async () => {
      if (response?.type === 'success' && response.params?.code && request) {
        try {
          await echangerCodeContreJetonSpotify(response.params.code, clientId, request.redirectUri, request.codeVerifier);
          setConnecte(true);
          rafraichirLectureEnCours();
          chargerPlaylists();
        } catch (e) {
          Alert.alert('Erreur de connexion', e.message);
        }
      } else if (response?.type === 'error') {
        Alert.alert('Connexion annulée', "La connexion à Spotify n'a pas pu être finalisée.");
      }
    })();
  }, [response]);

  const seConnecter = async () => {
    if (!clientId) {
      Alert.alert(
        'Configuration requise',
        "Configure d'abord ton Client ID Spotify dans Paramètres → 🔑 API. Consulte le guide d'installation pour la procédure.",
        [{ text: 'Aller aux Paramètres', onPress: () => navigation.navigate('Parametres') }, { text: 'Annuler', style: 'cancel' }]
      );
      return;
    }
    await promptAsync();
  };

  const seDeconnecter = async () => {
    await deconnecterSpotify();
    setConnecte(false);
    setLectureEnCours(null);
    setPlaylists([]);
  };

  const rafraichirLectureEnCours = async () => {
    const { morceau, erreur } = await getLectureEnCours();
    setLectureEnCours(morceau);
    setErreurLecture(erreur);
  };

  const chargerPlaylists = async () => {
    const { playlists: liste } = await listerPlaylists();
    setPlaylists(liste);
  };

  const rechercher = async () => {
    if (!requeteRecherche.trim()) return;
    setRecherchant(true);
    const { resultats: res, erreur } = await rechercherSpotify(requeteRecherche, 'track', 15);
    if (erreur) Alert.alert('Erreur de recherche', erreur);
    setResultats(res);
    setRecherchant(false);
  };

  const controlerLecture = async action => {
    let res;
    if (action === 'play') res = await jouerSpotify();
    else if (action === 'pause') res = await pauseSpotify();
    else if (action === 'next') res = await suivantSpotify();
    else if (action === 'prev') res = await precedentSpotify();

    if (res?.erreur) {
      Alert.alert('Action impossible', res.erreur.includes('Premium') ? "Cette fonctionnalité nécessite un compte Spotify Premium. La recherche et les playlists restent disponibles sans Premium." : res.erreur);
    } else {
      setTimeout(rafraichirLectureEnCours, 500);
    }
  };

  const jouerMorceau = async track => {
    const { erreur } = await jouerUri(track.uri);
    if (erreur) {
      Alert.alert('Lecture impossible', erreur.includes('Premium') ? "La lecture à distance nécessite un compte Spotify Premium." : erreur);
    } else {
      setTimeout(rafraichirLectureEnCours, 500);
    }
  };

  const creerNouvellePlaylist = async () => {
    if (!nomNouvellePlaylist.trim()) return;
    const { playlist, erreur } = await creerPlaylist(nomNouvellePlaylist, 'Créée depuis Kira OS');
    if (erreur) {
      Alert.alert('Erreur', erreur);
    } else {
      Alert.alert('✅ Créée !', `La playlist "${nomNouvellePlaylist}" a été créée.`);
      setNomNouvellePlaylist('');
      setShowCreerPlaylist(false);
      chargerPlaylists();
    }
  };

  const ouvrirPlaylist = async playlist => {
    setPlaylistOuverte(playlist);
    const { morceaux } = await getMorceauxPlaylist(playlist.id);
    setMorceauxPlaylist(morceaux);
  };

  const ajouterAPlaylist = async (playlist, track) => {
    const { succes, erreur } = await ajouterMorceauxAPlaylist(playlist.id, track.uri);
    if (succes) Alert.alert('✅ Ajouté !', `"${track.name}" a été ajouté à "${playlist.nom}".`);
    else Alert.alert('Erreur', erreur);
  };

  // ── Vue détail d'une playlist ──
  if (playlistOuverte) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <BackButton onPress={() => setPlaylistOuverte(null)} />
          <Text style={styles.headerTitle} numberOfLines={1}>{playlistOuverte.nom}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {morceauxPlaylist.length === 0 && <Text style={styles.emptyText}>Cette playlist est vide pour le moment.</Text>}
          {morceauxPlaylist.map((m, i) => (
            <View key={i} style={[styles.trackCard, { borderColor: PALETTE.purple + '20' }]}>
              {m.pochette && <Image source={{ uri: m.pochette }} style={styles.trackPochette} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitre} numberOfLines={1}>{m.titre}</Text>
                <Text style={styles.trackArtiste} numberOfLines={1}>{m.artiste}</Text>
              </View>
              <TouchableOpacity onPress={() => jouerUri(m.uri).then(() => setTimeout(rafraichirLectureEnCours, 500))}>
                <Text style={{ fontSize: 18 }}>▶</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>🎵 Musique</Text>
        <KiraHeaderIcon size={28} color={theme.accent} onPress={() => navigation.navigate('KiraChat')} />
      </View>

      {/* ── Bandeau connexion Spotify ── */}
      <View style={[styles.spotifyBanner, connecte ? styles.spotifyBannerOk : styles.spotifyBannerOff]}>
        <Text style={{ fontSize: 16 }}>{connecte ? '🟢' : '🎵'}</Text>
        <Text style={styles.spotifyBannerText}>{connecte ? 'Connecté à Spotify' : 'Connecte ton compte Spotify'}</Text>
        {connecte ? (
          <TouchableOpacity onPress={seDeconnecter}><Text style={[styles.spotifyBannerAction, { color: PALETTE.pink }]}>Déconnecter</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={seConnecter}><Text style={[styles.spotifyBannerAction, { color: theme.accent }]}>Connecter →</Text></TouchableOpacity>
        )}
      </View>

      {connecte && (
        <>
          {/* ── Lecteur en cours ── */}
          {lectureEnCours ? (
            <View style={[styles.playerBox, { borderColor: theme.accent + '30', backgroundColor: theme.accent + '08' }]}>
              {lectureEnCours.pochette && <Image source={{ uri: lectureEnCours.pochette }} style={styles.playerPochette} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.playerTitre} numberOfLines={1}>{lectureEnCours.titre}</Text>
                <Text style={styles.playerArtiste} numberOfLines={1}>{lectureEnCours.artiste}</Text>
              </View>
              <View style={styles.playerControls}>
                <TouchableOpacity onPress={() => controlerLecture('prev')}><Text style={{ fontSize: 16 }}>⏮</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => controlerLecture(lectureEnCours.enCours ? 'pause' : 'play')} style={[styles.playerBtnMain, { backgroundColor: theme.accent }]}>
                  <Text style={{ fontSize: 16 }}>{lectureEnCours.enCours ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => controlerLecture('next')}><Text style={{ fontSize: 16 }}>⏭</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noPlaybackBox}>
              <Text style={styles.noPlaybackText}>Aucune lecture en cours. Lance un morceau depuis l'app Spotify ou la recherche ci-dessous.</Text>
            </View>
          )}

          {/* ── Onglets ── */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tabBtn, tab === 'recherche' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]} onPress={() => setTab('recherche')}>
              <Text style={{ color: tab === 'recherche' ? '#fff' : '#666677', fontSize: 12, fontWeight: tab === 'recherche' ? '600' : '400' }}>🔍 Recherche</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, tab === 'playlists' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]} onPress={() => setTab('playlists')}>
              <Text style={{ color: tab === 'playlists' ? '#fff' : '#666677', fontSize: 12, fontWeight: tab === 'playlists' ? '600' : '400' }}>📁 Mes playlists</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {tab === 'recherche' ? (
              <View>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un titre, artiste..."
                    placeholderTextColor="#555566"
                    value={requeteRecherche}
                    onChangeText={setRequeteRecherche}
                    onSubmitEditing={rechercher}
                  />
                  <TouchableOpacity style={[styles.searchBtn, { backgroundColor: theme.accent }]} onPress={rechercher}>
                    {recherchant ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 16 }}>🔍</Text>}
                  </TouchableOpacity>
                </View>

                {resultats.map((track, i) => (
                  <View key={track.id || i} style={[styles.trackCard, { borderColor: PALETTE.purple + '20' }]}>
                    {track.album?.images?.[2]?.url && <Image source={{ uri: track.album.images[2].url }} style={styles.trackPochette} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackTitre} numberOfLines={1}>{track.name}</Text>
                      <Text style={styles.trackArtiste} numberOfLines={1}>{track.artists?.map(a => a.name).join(', ')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => jouerMorceau(track)} style={{ marginRight: 12 }}>
                      <Text style={{ fontSize: 18 }}>▶</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (playlists.length === 0) { Alert.alert('Aucune playlist', "Crée d'abord une playlist dans l'onglet correspondant."); return; }
                        Alert.alert('Ajouter à...', 'Choisis une playlist', [
                          ...playlists.map(p => ({ text: p.nom, onPress: () => ajouterAPlaylist(p, track) })),
                          { text: 'Annuler', style: 'cancel' },
                        ]);
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>➕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                {!showCreerPlaylist ? (
                  <TouchableOpacity style={[styles.addBtn, { borderColor: theme.accent + '40' }]} onPress={() => setShowCreerPlaylist(true)}>
                    <Text style={[styles.addBtnText, { color: theme.accent }]}>+ Créer une playlist</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.createForm, { borderColor: theme.accent + '25' }]}>
                    <TextInput style={styles.searchInput} placeholder="Nom de la playlist..." placeholderTextColor="#555566" value={nomNouvellePlaylist} onChangeText={setNomNouvellePlaylist} />
                    <View style={styles.formActions}>
                      <TouchableOpacity style={[styles.formBtn, { backgroundColor: theme.accent }]} onPress={creerNouvellePlaylist}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Créer</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.formBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setShowCreerPlaylist(false)}><Text style={{ color: '#888899', fontSize: 13 }}>Annuler</Text></TouchableOpacity>
                    </View>
                  </View>
                )}

                {playlists.map(p => (
                  <TouchableOpacity key={p.id} style={[styles.playlistCard, { borderColor: PALETTE.purple + '20' }]} onPress={() => ouvrirPlaylist(p)}>
                    {p.pochette ? <Image source={{ uri: p.pochette }} style={styles.playlistPochette} /> : <View style={[styles.playlistPochette, styles.playlistPochettePlaceholder]}><Text>🎵</Text></View>}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackTitre} numberOfLines={1}>{p.nom}</Text>
                      <Text style={styles.trackArtiste}>{p.nbMorceaux} morceau{p.nbMorceaux > 1 ? 'x' : ''}</Text>
                    </View>
                    <Text style={{ color: '#666677' }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.coachBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '25' }]}>
              <Text style={[styles.coachLabel, { color: PALETTE.violet }]}>🌟 Kira</Text>
              <Text style={styles.coachText}>
                Demande-moi dans le chat : "crée une playlist guitare" ou "qu'est-ce que j'écoute" et je m'en occupe directement !
              </Text>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

function useSpotifyOAuthRequest(clientId) {
  const config = clientId
    ? construireConfigOAuthSpotify(clientId)
    : { clientId: 'placeholder', scopes: [], redirectUri: AuthSession.makeRedirectUri({ scheme: 'kiraos' }) };
  return AuthSession.useAuthRequest(config, DECOUVERTE_SPOTIFY);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  spotifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  spotifyBannerOk: { backgroundColor: 'rgba(67,217,173,0.1)' },
  spotifyBannerOff: { backgroundColor: 'rgba(108,99,255,0.08)' },
  spotifyBannerText: { flex: 1, fontSize: 11, color: '#aaa' },
  spotifyBannerAction: { fontSize: 11, fontWeight: '700' },
  playerBox: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, marginBottom: 0, padding: 12, borderRadius: 14, borderWidth: 1 },
  playerPochette: { width: 48, height: 48, borderRadius: 8 },
  playerTitre: { fontSize: 13, fontWeight: '600', color: '#fff' },
  playerArtiste: { fontSize: 11, color: '#888899', marginTop: 2 },
  playerControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playerBtnMain: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  noPlaybackBox: { margin: 16, marginBottom: 0, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
  noPlaybackText: { fontSize: 11, color: '#555566', textAlign: 'center', lineHeight: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, marginTop: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, padding: 11 },
  searchBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trackCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1 },
  trackPochette: { width: 42, height: 42, borderRadius: 6 },
  trackTitre: { fontSize: 13, fontWeight: '600', color: '#fff' },
  trackArtiste: { fontSize: 11, color: '#888899', marginTop: 2 },
  addBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginBottom: 14 },
  addBtnText: { fontWeight: '600', fontSize: 13 },
  createForm: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  formBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  playlistCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1 },
  playlistPochette: { width: 48, height: 48, borderRadius: 8 },
  playlistPochettePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  emptyText: { color: '#444455', fontSize: 13, textAlign: 'center', marginVertical: 20 },
  coachBox: { borderRadius: 12, padding: 13, borderWidth: 1, marginTop: 4 },
  coachLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  coachText: { fontSize: 12, color: '#ccc', lineHeight: 18 },
});
