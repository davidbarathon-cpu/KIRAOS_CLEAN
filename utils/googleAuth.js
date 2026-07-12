// ═══════════════════════════════════════════
//  GOOGLEAUTH.JS — Authentification OAuth Google
//  Gère la connexion/déconnexion du compte Google
//  et le rafraîchissement automatique du jeton
// ═══════════════════════════════════════════

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getData, removeData, setData } from './storage';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const DECOUVERTE_GOOGLE = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Récupère le Client ID configuré par l'utilisateur
 */
export async function getGoogleClientId() {
  const config = await getData('google_config');
  return config?.clientId || null;
}

export async function setGoogleClientId(clientId) {
  const config = (await getData('google_config')) || {};
  await setData('google_config', { ...config, clientId: clientId.trim() });
}

/**
 * Construit la configuration de requête OAuth.
 * Utilise makeRedirectUri() sans argument pour utiliser le proxy https://auth.expo.io
 */
export function construireConfigOAuth(clientId) {
  // CORRECTION : makeRedirectUri() sans paramètres utilise le proxy HTTPS d'Expo
  const redirectUri = AuthSession.makeRedirectUri();
  
  return {
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  };
}

export { DECOUVERTE_GOOGLE };

/**
 * Échange le code d'autorisation reçu après connexion contre un jeton d'accès
 */
export async function echangerCodeContreJeton(code, clientId, redirectUri, codeVerifier) {
  const res = await fetch(DECOUVERTE_GOOGLE.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Échange de jeton échoué (${res.status}) : ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const jetons = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await setData('google_jetons', jetons);
  return jetons;
}

/**
 * Rafraîchit le jeton d'accès expiré
 */
export async function rafraichirJeton(clientId) {
  const jetonsActuels = await getData('google_jetons');
  if (!jetonsActuels?.refreshToken) {
    throw new Error('Aucun refresh token disponible — reconnexion nécessaire.');
  }

  const res = await fetch(DECOUVERTE_GOOGLE.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: jetonsActuels.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Rafraîchissement du jeton échoué (${res.status}) : ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const nouveauxJetons = {
    accessToken: data.access_token,
    refreshToken: jetonsActuels.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await setData('google_jetons', nouveauxJetons);
  return nouveauxJetons;
}

/**
 * Retourne un jeton d'accès valide
 */
export async function getJetonValide() {
  const jetons = await getData('google_jetons');
  if (!jetons) return null;

  if (Date.now() < jetons.expiresAt - 60000) {
    return jetons.accessToken;
  }

  try {
    const clientId = await getGoogleClientId();
    const nouveauxJetons = await rafraichirJeton(clientId);
    return nouveauxJetons.accessToken;
  } catch (e) {
    return null;
  }
}

export async function estConnecteAGoogle() {
  const jetons = await getData('google_jetons');
  return !!jetons?.refreshToken;
}

export async function deconnecterGoogle() {
  const jetons = await getData('google_jetons');
  if (jetons?.accessToken) {
    try {
      await fetch(`${DECOUVERTE_GOOGLE.revocationEndpoint}?token=${jetons.accessToken}`, { method: 'POST' });
    } catch {
      // Échec silencieux
    }
  }
  await removeData('google_jetons');
}