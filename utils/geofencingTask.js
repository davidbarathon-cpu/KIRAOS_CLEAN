// ═══════════════════════════════════════════
//  GEOFENCINGTASK.JS — LOT 54
//
//  ⚠️ IMPORTANT : ce fichier doit être importé une seule fois,
//  au tout début de l'app (dans App.js, avant le composant),
//  et JAMAIS à l'intérieur d'un composant ou d'une fonction.
//  C'est une règle stricte d'expo-task-manager : la tâche doit
//  être "définie" dès le chargement du JS, sinon Android ne
//  saura pas quoi faire quand il détecte que tu entres dans la
//  zone domicile alors que l'app est fermée.
// ═══════════════════════════════════════════

import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { GEOFENCE_TASK_NAME } from './geoKira';
import { getData, setData } from './storage';

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Erreur Géo-Kira (geofencing):', error.message);
    return;
  }

  const { eventType, region } = data;

  // S'assure que le canal de notification existe même si l'app n'a jamais
  // été ouverte depuis le dernier redémarrage du téléphone (cas rare mais
  // possible : Android peut relancer ce bout de code seul en arrière-plan).
  await Notifications.setNotificationChannelAsync('kira-defaut', {
    name: 'Kira — Rappels et alertes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6C63FF',
  });

  const profil = (await getData('profil')) || {};
  const nom = profil.prenom || profil.nom || '';

  const estEntree = eventType === 1; // Location.GeofencingEventType.Enter === 1
  const estSortie = eventType === 2; // Location.GeofencingEventType.Exit  === 2

  if (estEntree) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏠 Bon retour !',
        body: nom ? `Content de te revoir à la maison, ${nom} ! 🌟` : 'Content de te revoir à la maison ! 🌟',
        data: { type: 'geokira', evenement: 'entree' },
        sound: true,
      },
      trigger: null, // null = affichage immédiat
    });
    await enregistrerEvenement('entree');
  } else if (estSortie) {
    await enregistrerEvenement('sortie');
    // Pas de notification à la sortie pour l'instant (évite le spam) —
    // seulement consigné dans l'historique pour référence future de Kira.
  }
});

async function enregistrerEvenement(type) {
  const historique = (await getData('geokira_historique')) || [];
  const nouvelleEntree = { type, date: new Date().toISOString() };
  const misAJour = [nouvelleEntree, ...historique].slice(0, 50); // garde les 50 derniers
  await setData('geokira_historique', misAJour);
}

// ── Note technique ──
// expo-location expose Location.GeofencingEventType.Enter === 1 et .Exit === 2.
// On compare ici directement aux valeurs numériques stables de la librairie
// (documentées et inchangées depuis plusieurs versions) plutôt que d'importer
// expo-location dans ce fichier, pour éviter tout risque de cycle d'import
// avec geoKira.js selon la façon dont Metro (le bundler) résout les modules.
