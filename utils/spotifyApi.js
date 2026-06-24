// ═══════════════════════════════════════════
//  SPOTIFYAPI.JS — Appels réels à l'API Spotify
//  Recherche de titres, lecture en cours, contrôle
//  de lecture (Premium requis), gestion de playlists
//  (fonctionne avec tout compte, gratuit ou Premium).
// ═══════════════════════════════════════════

import { getJetonSpotifyValide } from './spotifyAuth';

const BASE_URL = 'https://api.spotify.com/v1';

async function appelApi(endpoint, options = {}) {
  const jeton = await getJetonSpotifyValide();
  if (!jeton) {
    return { data: null, erreur: 'NON_CONNECTE' };
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // 204 = succès sans contenu (cas fréquent pour les commandes de lecture)
    if (res.status === 204) return { data: null, erreur: null };

    if (!res.ok) {
      const body = await res.text();
      // 403 sur les endpoints de lecture = très souvent un compte gratuit (pas Premium)
      if (res.status === 403 && (endpoint.includes('/play') || endpoint.includes('/pause') || endpoint.includes('/next') || endpoint.includes('/previous'))) {
        throw new Error('Cette action nécessite un compte Spotify Premium.');
      }
      throw new Error(`Spotify erreur ${res.status} : ${body.slice(0, 150)}`);
    }

    // Certaines réponses sont vides même avec un statut 200
    const texte = await res.text();
    const data = texte ? JSON.parse(texte) : null;
    return { data, erreur: null };
  } catch (e) {
    return { data: null, erreur: e.message };
  }
}

/**
 * Recherche des titres, albums ou artistes.
 * type = 'track' | 'album' | 'artist' | 'playlist'
 */
export async function rechercherSpotify(requete, type = 'track', limite = 10) {
  const { data, erreur } = await appelApi(`/search?q=${encodeURIComponent(requete)}&type=${type}&limit=${limite}`);
  if (erreur) return { resultats: [], erreur };

  const cle = type + 's'; // tracks, albums, artists, playlists
  const items = data?.[cle]?.items || [];
  return { resultats: items, erreur: null };
}

/**
 * Récupère le morceau actuellement en cours de lecture (si l'utilisateur
 * écoute Spotify activement sur un appareil quelconque).
 */
export async function getLectureEnCours() {
  const { data, erreur } = await appelApi('/me/player/currently-playing');
  if (erreur) return { morceau: null, erreur };
  if (!data || !data.item) return { morceau: null, erreur: null };

  return {
    morceau: {
      titre: data.item.name,
      artiste: data.item.artists?.map(a => a.name).join(', '),
      album: data.item.album?.name,
      pochette: data.item.album?.images?.[0]?.url,
      enCours: data.is_playing,
      progressionMs: data.progress_ms,
      dureeMs: data.item.duration_ms,
    },
    erreur: null,
  };
}

/**
 * Commandes de contrôle de lecture — nécessitent Spotify Premium.
 * Retournent { succes, erreur } où erreur explique clairement le souci Premium si besoin.
 */
export async function jouerSpotify() {
  const { erreur } = await appelApi('/me/player/play', { method: 'PUT' });
  return { succes: !erreur, erreur };
}

export async function pauseSpotify() {
  const { erreur } = await appelApi('/me/player/pause', { method: 'PUT' });
  return { succes: !erreur, erreur };
}

export async function suivantSpotify() {
  const { erreur } = await appelApi('/me/player/next', { method: 'POST' });
  return { succes: !erreur, erreur };
}

export async function precedentSpotify() {
  const { erreur } = await appelApi('/me/player/previous', { method: 'POST' });
  return { succes: !erreur, erreur };
}

/**
 * Lance la lecture d'un morceau ou d'une playlist précis par son URI Spotify
 * (ex: "spotify:track:xxxx" ou "spotify:playlist:xxxx"). Nécessite Premium.
 */
export async function jouerUri(uri) {
  const estPlaylist = uri.includes('playlist');
  const corps = estPlaylist ? { context_uri: uri } : { uris: [uri] };
  const { erreur } = await appelApi('/me/player/play', { method: 'PUT', body: JSON.stringify(corps) });
  return { succes: !erreur, erreur };
}

/**
 * Récupère l'identifiant Spotify de l'utilisateur connecté — nécessaire pour
 * créer une playlist (l'API Spotify demande l'id utilisateur dans l'URL).
 */
async function getUserId() {
  const { data, erreur } = await appelApi('/me');
  if (erreur) throw new Error(erreur);
  return data.id;
}

/**
 * Liste les playlists de l'utilisateur connecté.
 */
export async function listerPlaylists() {
  const { data, erreur } = await appelApi('/me/playlists?limit=50');
  if (erreur) return { playlists: [], erreur };
  return {
    playlists: (data?.items || []).map(p => ({
      id: p.id,
      nom: p.name,
      nbMorceaux: p.tracks?.total || 0,
      pochette: p.images?.[0]?.url,
      uri: p.uri,
    })),
    erreur: null,
  };
}

/**
 * Crée une nouvelle playlist pour l'utilisateur connecté.
 */
export async function creerPlaylist(nom, description = '', publique = false) {
  try {
    const userId = await getUserId();
    const { data, erreur } = await appelApi(`/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({ name: nom, description, public: publique }),
    });
    if (erreur) return { playlist: null, erreur };
    return { playlist: { id: data.id, nom: data.name, uri: data.uri }, erreur: null };
  } catch (e) {
    return { playlist: null, erreur: e.message };
  }
}

/**
 * Ajoute un ou plusieurs morceaux (par URI) à une playlist existante.
 */
export async function ajouterMorceauxAPlaylist(playlistId, uris) {
  const liste = Array.isArray(uris) ? uris : [uris];
  const { erreur } = await appelApi(`/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ uris: liste }),
  });
  return { succes: !erreur, erreur };
}

/**
 * Retire un morceau d'une playlist.
 */
export async function retirerMorceauDePlaylist(playlistId, uri) {
  const { erreur } = await appelApi(`/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    body: JSON.stringify({ tracks: [{ uri }] }),
  });
  return { succes: !erreur, erreur };
}

/**
 * Récupère les morceaux d'une playlist.
 */
export async function getMorceauxPlaylist(playlistId) {
  const { data, erreur } = await appelApi(`/playlists/${playlistId}/tracks?limit=100`);
  if (erreur) return { morceaux: [], erreur };
  return {
    morceaux: (data?.items || [])
      .filter(item => item.track)
      .map(item => ({
        uri: item.track.uri,
        titre: item.track.name,
        artiste: item.track.artists?.map(a => a.name).join(', '),
        pochette: item.track.album?.images?.[2]?.url || item.track.album?.images?.[0]?.url,
        dureeMs: item.track.duration_ms,
      })),
    erreur: null,
  };
}
