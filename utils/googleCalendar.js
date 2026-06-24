// ═══════════════════════════════════════════
//  GOOGLECALENDAR.JS — Appels réels à l'API
//  Google Calendar (lecture, création, suppression
//  d'événements). Utilise toujours getJetonValide()
//  qui gère le rafraîchissement automatique.
// ═══════════════════════════════════════════

import { getJetonValide } from './googleAuth';

const BASE_URL = 'https://www.googleapis.com/calendar/v3';

// Couleurs cycliques pour différencier visuellement les événements importés
const COULEURS_CYCLE = ['#6C63FF', '#FF6584', '#43D9AD', '#FFB347', '#4FC3F7', '#F472B6', '#A78BFA'];

function formatHeure(dateTimeStr) {
  if (!dateTimeStr) return '--:--';
  const d = new Date(dateTimeStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function calculerDuree(debut, fin) {
  if (!debut || !fin) return '';
  const ms = new Date(fin) - new Date(debut);
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste > 0 ? `${heures}h${reste}` : `${heures}h`;
}

/**
 * Convertit un événement au format Google Calendar vers le format
 * utilisé partout dans l'app (le même que les événements locaux).
 */
function convertirEvenementGoogle(evt, index) {
  const debut = evt.start?.dateTime || evt.start?.date;
  const fin = evt.end?.dateTime || evt.end?.date;
  return {
    id: evt.id, // on garde l'id Google tel quel pour pouvoir le supprimer ensuite
    h: evt.start?.dateTime ? formatHeure(debut) : 'Jour entier',
    t: evt.summary || '(Sans titre)',
    l: evt.location || '',
    dur: evt.start?.dateTime ? calculerDuree(debut, fin) : '',
    c: COULEURS_CYCLE[index % COULEURS_CYCLE.length],
    source: 'google',
    googleId: evt.id,
  };
}

/**
 * Récupère les événements de l'agenda principal pour aujourd'hui (et les jours suivants
 * si besoin). Retourne { evenements, erreur }.
 */
export async function listerEvenementsGoogle(nombreJours = 1) {
  const jeton = await getJetonValide();
  if (!jeton) {
    return { evenements: [], erreur: 'NON_CONNECTE' };
  }

  try {
    const maintenant = new Date();
    const debutJournee = new Date(maintenant.setHours(0, 0, 0, 0)).toISOString();
    const finPeriode = new Date(maintenant.setDate(maintenant.getDate() + nombreJours)).toISOString();

    const params = new URLSearchParams({
      timeMin: debutJournee,
      timeMax: finPeriode,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const res = await fetch(`${BASE_URL}/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${jeton}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Calendar erreur ${res.status} : ${body.slice(0, 150)}`);
    }

    const data = await res.json();
    const evenements = (data.items || []).map(convertirEvenementGoogle);
    return { evenements, erreur: null };
  } catch (e) {
    return { evenements: [], erreur: e.message };
  }
}

/**
 * Crée un nouvel événement dans le Google Agenda principal.
 * heure et dateJour au format "HH:MM" et "YYYY-MM-DD" (par défaut aujourd'hui).
 * dureeMinutes par défaut 60 minutes.
 */
export async function creerEvenementGoogle(titre, heure, dateJour, lieu = '', dureeMinutes = 60) {
  const jeton = await getJetonValide();
  if (!jeton) {
    return { evenement: null, erreur: 'NON_CONNECTE' };
  }

  try {
    const jour = dateJour || new Date().toISOString().slice(0, 10);
    const debut = new Date(`${jour}T${heure}:00`);
    const fin = new Date(debut.getTime() + dureeMinutes * 60000);
    const fuseauHoraire = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const res = await fetch(`${BASE_URL}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: titre,
        location: lieu,
        start: { dateTime: debut.toISOString(), timeZone: fuseauHoraire },
        end: { dateTime: fin.toISOString(), timeZone: fuseauHoraire },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Création d'événement échouée ${res.status} : ${body.slice(0, 150)}`);
    }

    const evt = await res.json();
    return { evenement: convertirEvenementGoogle(evt, 0), erreur: null };
  } catch (e) {
    return { evenement: null, erreur: e.message };
  }
}

/**
 * Supprime un événement du Google Agenda par son identifiant Google.
 */
export async function supprimerEvenementGoogle(googleId) {
  const jeton = await getJetonValide();
  if (!jeton) {
    return { succes: false, erreur: 'NON_CONNECTE' };
  }

  try {
    const res = await fetch(`${BASE_URL}/calendars/primary/events/${googleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jeton}` },
    });

    // Google renvoie 204 (No Content) en cas de succès, 410 si déjà supprimé (qu'on tolère)
    if (!res.ok && res.status !== 410) {
      const body = await res.text();
      throw new Error(`Suppression échouée ${res.status} : ${body.slice(0, 150)}`);
    }

    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}
