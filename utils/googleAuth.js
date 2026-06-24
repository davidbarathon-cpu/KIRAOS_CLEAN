// ═══════════════════════════════════════════
//  GOOGLEAUTH.JS — Authentification OAuth Google
//  Gère la connexion/déconnexion du compte Google
//  et le rafraîchissement automatique du jeton
//  d'accès (les jetons Google expirent après 1h).
//
//  Utilise expo-auth-session, la méthode officielle
//  recommandée par Expo pour OAuth (ouvre un
//  navigateur système sécurisé, pas une WebView
//  custom — plus sûr et accepté par Google).
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
 * Récupère le Client ID configuré par l'utilisateur dans les Paramètres
 * (créé sur Google Cloud Console, voir le guide d'installation).
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
 * Construit la configuration de requête OAuth nécessaire au hook useAuthRequest.
 * À utiliser dans un composant React avec :
 *   const [request, response, promptAsync] = AuthSession.useAuthRequest(config, DECOUVERTE_GOOGLE);
 */
export function construireConfigOAuth(clientId) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'kiraos-clean' });
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
 * Échange le code d'autorisation reçu après connexion contre un vrai jeton d'accès
 * (et un refresh token pour pouvoir se reconnecter automatiquement plus tard).
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
 * Rafraîchit le jeton d'accès expiré à l'aide du refresh token.
 * Google ne renvoie généralement pas de nouveau refresh token à cette étape —
 * on conserve donc l'ancien.
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
 * Retourne un jeton d'accès valide, en le rafraîchissant automatiquement
 * s'il a expiré. C'est la fonction à utiliser avant chaque appel à l'API
 * Google Calendar.
 */
export async function getJetonValide() {
  const jetons = await getData('google_jetons');
  if (!jetons) return null;

  // Marge de sécurité de 60 secondes avant l'expiration réelle
  if (Date.now() < jetons.expiresAt - 60000) {
    return jetons.accessToken;
  }

  try {
    const clientId = await getGoogleClientId();
    const nouveauxJetons = await rafraichirJeton(clientId);
    return nouveauxJetons.accessToken;
  } catch (e) {
    // Le refresh a échoué (révoqué, expiré...) — il faudra se reconnecter
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
      // Si la révocation réseau échoue, on supprime quand même localement
    }
  }
  await removeData('google_jetons');
}
