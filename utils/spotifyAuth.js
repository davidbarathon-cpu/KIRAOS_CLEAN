// ═══════════════════════════════════════════
//  SPOTIFYAUTH.JS — Authentification OAuth Spotify
//  Même logique que googleAuth.js (lot 10) :
//  expo-auth-session, PKCE, rafraîchissement
//  automatique du jeton expiré.
// ═══════════════════════════════════════════

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getData, removeData, setData } from './storage';

WebBrowser.maybeCompleteAuthSession();

// Scopes nécessaires : lecture du morceau en cours, contrôle de lecture,
// lecture/écriture des playlists (privées et publiques).
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
];

const DECOUVERTE_SPOTIFY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export async function getSpotifyClientId() {
  const config = await getData('spotify_config');
  return config?.clientId || null;
}

export async function setSpotifyClientId(clientId) {
  const config = (await getData('spotify_config')) || {};
  await setData('spotify_config', { ...config, clientId: clientId.trim() });
}

export function construireConfigOAuthSpotify(clientId) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'kiraos' });
  return {
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  };
}

export { DECOUVERTE_SPOTIFY };

export async function echangerCodeContreJetonSpotify(code, clientId, redirectUri, codeVerifier) {
  const res = await fetch(DECOUVERTE_SPOTIFY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Échange de jeton Spotify échoué (${res.status}) : ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const jetons = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await setData('spotify_jetons', jetons);
  return jetons;
}

export async function rafraichirJetonSpotify(clientId) {
  const jetonsActuels = await getData('spotify_jetons');
  if (!jetonsActuels?.refreshToken) {
    throw new Error('Aucun refresh token Spotify disponible — reconnexion nécessaire.');
  }

  const res = await fetch(DECOUVERTE_SPOTIFY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: jetonsActuels.refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Rafraîchissement du jeton Spotify échoué (${res.status}) : ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const nouveauxJetons = {
    accessToken: data.access_token,
    // Spotify renvoie parfois un nouveau refresh_token, parfois non — on garde l'ancien si absent
    refreshToken: data.refresh_token || jetonsActuels.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await setData('spotify_jetons', nouveauxJetons);
  return nouveauxJetons;
}

export async function getJetonSpotifyValide() {
  const jetons = await getData('spotify_jetons');
  if (!jetons) return null;

  if (Date.now() < jetons.expiresAt - 60000) {
    return jetons.accessToken;
  }

  try {
    const clientId = await getSpotifyClientId();
    const nouveauxJetons = await rafraichirJetonSpotify(clientId);
    return nouveauxJetons.accessToken;
  } catch (e) {
    return null;
  }
}

export async function estConnecteASpotify() {
  const jetons = await getData('spotify_jetons');
  return !!jetons?.refreshToken;
}

export async function deconnecterSpotify() {
  // Spotify n'a pas d'endpoint de révocation officiel simple comme Google —
  // on supprime simplement les jetons localement.
  await removeData('spotify_jetons');
}
