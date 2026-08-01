# 📖 LIVRE DE BORD — KIRA OS

> Ce fichier est le journal de bord du projet, tenu par Claude à chaque session.
> Protocole de début de session : `git pull`, lire ce fichier en entier, puis proposer la suite.
> Ce fichier n'existait pas encore dans le dépôt au 08/07/2026 malgré les échanges précédents —
> il a été reconstruit ce jour-là à partir de l'historique Git et du code réel, puis tenu à jour
> à partir de là. **Nouvelle note du 25/07/2026** : ce fichier a de nouveau été perdu entre deux
> sessions (jamais poussé sur GitHub sous le nom `LIVRE_DE_BORD_KIRA.md`) — reconstruit une
> deuxième fois à partir d'une copie conservée par Claude, et déposé cette fois-ci dans
> `KIRA_CONTEXT.md` (fichier déjà présent mais vide dans le dépôt) pour éviter que ça se
> reproduise. **David : vérifie bien que ce fichier est commité et poussé sur GitHub après cette
> mise à jour.**

---

## 🧭 Contexte du projet

**Kira OS** est une application mobile assistant personnel / journal de bord, en **React Native
(Expo SDK 56)**, JavaScript. Le projet a pivoté tôt de Kotlin/Android Studio vers React Native
(décision confirmée par David). Le dépôt GitHub `davidbarathon-cpu/KIRAOS_CLEAN` fait foi entre
les sessions.

David est novice en programmation, communique en français, et veut un compagnon de dev proactif :
Claude propose la suite plutôt que d'attendre les instructions, livre du code complet et prêt à
copier, avec des guides d'installation clairs.

**Format de livraison actuel** : fichiers complets édités directement à partir du code réel du
dépôt (envoyé par David en upload quand Claude n'a pas accès direct à jour), livrés en ZIP par
lot avec un tableau simple "ce fichier → cet emplacement". Éviter les instructions de type
"ajoute cette ligne ici" — David préfère remplacer des fichiers entiers plutôt que d'éditer à la
main. Il faut explique la procedure de sauvegarde dans chaque zip.

---

## 📦 État du dépôt au 25/07/2026 (lot 56)

### Structure
```
KIRAOS_CLEAN/
├── App.js                     # Navigation + Quick Actions + WeatherFX global + Géo-Kira (lot 54)
├── KIRA_CONTEXT.md            # ← CE FICHIER, le livre de bord (anciennement vide)
├── AGENTS.md / CLAUDE.md      # Rappel : toujours consulter la doc Expo v56 avant de coder
├── screens/                   # 20 écrans (voir liste des modules plus bas)
├── components/                # Shared.js, KiraIcon.js, GeoKiraCard.js (lot 54), WeatherFX.js...
├── utils/                     # ~29 fichiers logique métier / API / storage
├── plugins/
├── widget/
└── assets/
```

### Modules livrés et fonctionnels
| Module | Écran | État |
|---|---|---|
| Accueil / Journal de bord | HomeScreen | ✅ météo live, agenda preview, prédictions Kira, grille modules |
| Agenda | AgendaScreen | ✅ Google Calendar OAuth réel (créer/lister/supprimer) |
| Santé | SanteScreen | ✅ interactif (lot 44) + Health Connect (lot 45), export PDF |
| Guitare & Chant | GuitareScreen | ✅ métronome son réel, suivi progression BPM, défi créatif du jour (lot 51), export PDF |
| Cuisine | CuisineScreen | ✅ recettes quotidiennes générées par IA, structure entrée/plat/dessert (lot 47) |
| Courses | CoursesScreen | ✅ ajout par Kira via chat |
| Météo | MeteoScreen | ✅ OpenWeatherMap réel + phases de lune calculées astronomiquement |
| Horoscope | HoroscopeScreen | ✅ vraie rotation quotidienne (lot 47), lié au profil |
| Notes | NotesScreen | ✅ ajout par Kira via chat |
| Potager | PotagerScreen | ✅ analyse photo IA + historique complet par plante + journal de bord (lot 53) |
| Parking | ParkingScreen | ✅ GPS réel + carte interactive (lot 42) |
| Actualités | ActualitesScreen | ✅ NewsAPI + GNews combinés |
| Traduction | TraductionScreen | ✅ DeepL / LibreTranslate / MyMemory au choix |
| Réveil | ReveilScreen | ✅ notifications natives réelles, édition d'alarme (lot 47) |
| Domotique | DomotiqueScreen | ✅ architecture par drivers (Démo, Philips Hue, Tuya/Smart Life) — **Home Assistant en projet, voir Prochaines pistes** |
| Modules personnalisés | CreerModuleScreen / ModulePersonnaliseScreen | ✅ créer un module sans coder |
| Chat Kira | KiraChatScreen | ✅ multi-IA, mémoire longue durée, voix, briefing audio, **Géo-Kira (lot 56)** |
| Écoute rapide | EcouteRapideScreen | ✅ reconnaissance vocale native via App Shortcut |
| Écoute permanente "Kira" | wakeWordService | ✅ Porcupine, mains libres (lot 43, le plus fragile techniquement) |
| Géo-Kira | GeoKiraCard (dans Paramètres) | ✅ notification d'arrivée à la maison par geofencing (lot 54) |
| Paramètres | ParametresScreen | ✅ 7 sections : Profil, Apparence, Modules, 🔑 API, Kira, Notifs, Sécurité |

### Retiré du projet
- **Musique / Spotify** (lot 36) : Spotify exige un compte Premium pour la Web API même en mode
  développeur — décision de retrait actée avec David.
- **Android Auto** (décidé le 08/07/2026) : catégories d'apps autorisées par Google trop
  restrictives pour un assistant généraliste comme Kira.

### Sécurité
- `secureStorage.js` (lot 30) : clés API, jetons OAuth et config Hue chiffrés via
  `expo-secure-store` (Android Keystore matériel).

### Bugs corrigés au fil des lots (à ne pas régresser)
- Incompatibilité Hermes avec Blob/FileReader.
- Breaking change `expo-notifications` (format `trigger` sans `type`).
- Dérive du métronome (scheduler auto-correcteur).
- `expo-av` déprécié → migration vers `expo-audio`.
- **Lot 49** : crash Health Connect sous New Architecture → `newArchEnabled: false`.
- **Lot 52** : le sélecteur de thème (Apparence) ne changeait en réalité rien en dehors de
  l'écran Paramètres depuis le lot 6 — corrigé sur 19 écrans + `App.js` via `useKiraTheme()`.
- **Lot 55** : textes obsolètes "arrivera avec le module micro" dans Notes/Courses corrigés
  (la fonctionnalité existait déjà depuis longtemps, seul le texte n'avait pas suivi).

---

## 🎯 Prochaines pistes (à discuter avec David — aucune décidée seule)

## 🏠 Piste actée avec David — Home Assistant (à faire une fois le serveur installé)

David va bientôt installer un serveur **Home Assistant** à la maison pour piloter sa domotique.
Objectif : que Kira s'y connecte et puisse commander les appareils à la demande dans le chat.

**Bonne nouvelle technique** : l'architecture par drivers posée dès le lot 14
(`utils/domotiqueDrivers.js`, interface commune `estConfigure / listerAppareils / allumer /
eteindre / reglerValeur`) a été pensée exactement pour ce cas — un `driverHomeAssistant.js`
s'intègre sans toucher à `DomotiqueScreen.js`, qui affiche déjà génériquement tous les drivers
du registre (voir comment les drivers Hue et Tuya se sont branchés sans aucune modification de
l'écran).

**Pourquoi Home Assistant est en réalité le cas le plus simple à intégrer** de tous les
écosystèmes domotique envisagés jusqu'ici :
- API REST locale bien documentée (`/api/services/<domain>/<service>`), authentification par
  jeton longue durée (créé une fois dans Home Assistant → Profil → Jetons d'accès longue durée),
  **aucun compte cloud, aucun OAuth** — plus simple que Google Agenda ou Tuya.
- Un seul driver Home Assistant peut exposer TOUS les appareils déjà connectés à Home Assistant
  (Zigbee, Wi-Fi, Tuya, Hue, etc.) — potentiellement plus utile à terme que les drivers Hue/Tuya
  actuels pris séparément.
- Pur JavaScript (fetch HTTPS), **aucun rebuild natif nécessaire**.

**Ce qu'il faudra à David avant qu'on puisse commencer** :
1. Le serveur Home Assistant installé et accessible sur le réseau local (adresse IP ou nom
   d'hôte, ex: `homeassistant.local:8123`).
2. Un jeton d'accès longue durée créé depuis son profil Home Assistant.
3. Si le téléphone doit y accéder depuis l'extérieur du domicile (pas seulement en Wi-Fi
   maison) : Home Assistant Cloud (Nabu Casa, payant) ou une configuration d'accès distant côté
   serveur — à voir avec David selon son usage réel, pas la priorité pour une V1 locale.

**Ne pas commencer avant que David confirme le serveur en place et donne l'adresse + le jeton.**

---

Par rapport au cahier des charges d'origine, il reste principalement :
1. ~~Petites retouches de texte (Notes/Courses)~~ ✅ fait au lot 55.
2. Éventuellement republier un module Musique via un autre fournisseur (YouTube Music, Deezer)
   si David souhaite le remplacer un jour.
3. Éventuellement un driver TP-Link Kasa pour la Domotique — **piste probablement obsolète
   maintenant que Home Assistant arrive** (Home Assistant peut déjà piloter des appareils Kasa
   lui-même une fois connecté à lui). À reconsidérer seulement si David veut un accès Kasa
   indépendant de Home Assistant.
4. ~~Widget plein écran~~ ✅ fait au lot 41.
5. ~~Carte interactive réelle + GPS pour le Parking~~ ✅ fait au lot 42.
6. ~~Écoute permanente du mot "Kira"~~ ✅ fait au lot 43.
7. ~~Module Santé statique~~ ✅ fait aux lots 44-45 (interactif + Health Connect).
8. **Android Auto : abandonné**, décision actée avec David le 08/07/2026.
9. ~~Notification d'arrivée à la maison~~ ✅ fait aux lots 54 (geofencing) et 56 (exploité dans
   le chat).
10. **Home Assistant** ✅ voir bloc dédié ci-dessus — en attente du serveur physique.
11. Non exploré : historique `geokira_historique` (posé au lot 54) pourrait aussi déclencher
    automatiquement une "scène domotique" à l'arrivée (allumer les lumières via Hue/Tuya, ou
    Home Assistant une fois branché) — idée à proposer à David plus tard, pas demandée.

---

## 📝 Historique des sessions

### 25/07/2026 — Lot 56 : Géo-Kira exploité dans le chat
Suite directe du lot 54 — l'historique des arrivées/sorties détectées par le geofencing devient
utilisable par Kira, en mode IA comme en mode hors-ligne. **Aucun rebuild natif.**

**Fonctionnement :**
- Nouvelle intention directe : "Kira, quand suis-je rentré ?" (et variantes) → liste les 5
  dernières arrivées détectées, avec date et heure. Fonctionne identiquement en mode IA ou
  hors-ligne (action directe avant l'appel IA, même mécanique que les actualités/la traduction).
- Contexte passif : la dernière arrivée détectée est injectée dans le prompt système envoyé à
  l'IA en ligne, pour que Kira puisse s'en servir spontanément dans une conversation.

**Fichiers créés :**
- `utils/geoKiraBriefing.js` — détection d'intention + génération des réponses/contexte à
  partir de `geokira_historique` (posé au lot 54).

**Fichiers modifiés :**
- `screens/KiraChatScreen.js` — nouvelle action directe dans `send()`.
- `utils/aiCaller.js` — `buildSystemPrompt()` inclut la dernière arrivée si disponible.

### 25/07/2026 — Lot 55 : correctif de texte (Notes & Courses)
Les deux derniers textes 🚧 obsolètes repérés le 08/07/2026 ("arrivera avec le module micro")
corrigés — la fonctionnalité existait déjà depuis longtemps (dictée vocale + saisie via le chat),
seul le texte affiché n'avait jamais été mis à jour. Purement cosmétique, aucun rebuild.

**Fichiers modifiés :**
- `screens/NotesScreen.js`
- `screens/CoursesScreen.js`

### 25/07/2026 — Lot 54 : Géo-Kira (notification d'arrivée à la maison)
Fonctionnalité du cahier des charges d'origine (module Domotique / vie quotidienne) — Kira
prévient désormais quand tu arrives à la maison, sans action manuelle.

**Choix technique** : `expo-location` (déjà présent depuis le lot 42) + nouveau module
`expo-task-manager`, via le "geofencing" natif Android (`Location.startGeofencingAsync`).
Android surveille lui-même la zone domicile en tâche de fond légère — pas de suivi GPS actif en
continu, donc impact batterie minime. Fonctionne même app fermée ou téléphone verrouillé.

**Fonctionnement :**
- Nouvelle carte "📍 Géo-Kira" dans Paramètres → 🌟 Kira.
- Bouton "Utiliser ma position actuelle comme domicile" (même logique de géolocalisation
  inversée que le module Parking du lot 42).
- Rayon de détection réglable : 100 / 200 / 500 m.
- Une fois activé : notification "🏠 Bon retour, {prénom} !" à chaque entrée dans la zone.
  Les entrées/sorties sont aussi consignées dans un historique léger (`geokira_historique`,
  50 dernières entrées).

**Fichiers créés :**
- `utils/geoKira.js` — logique domicile/permissions/démarrage-arrêt du geofencing.
- `utils/geofencingTask.js` — définition de la tâche de fond Android (importée au tout début de
  `App.js`, avant le composant, règle stricte d'expo-task-manager).
- `components/GeoKiraCard.js` — carte UI autonome insérée dans Paramètres.

**Fichiers modifiés :**
- `App.js` — import de `geofencingTask.js` en tête de fichier + relance automatique de la
  surveillance au démarrage si Géo-Kira était déjà actif.
- `screens/ParametresScreen.js` — ajout de `<GeoKiraCard />` dans la section Kira.
- `app.json` — permission `ACCESS_BACKGROUND_LOCATION` + plugin `expo-location` enrichi
  (`isAndroidBackgroundLocationEnabled: true`).
- `package.json` — dépendance `expo-task-manager`.

**⚠️ Rebuild natif obligatoire** (nouveau module `expo-task-manager` + permission de
localisation en arrière-plan) — build à faire avec `eas build`, comme aux lots 41/42/43.

### 11/07/2026 — Lot 53 : Journal de bord du Potager
Idée "Journal de bord du Potager" de la liste de David — vient compléter naturellement le
système d'historique par plante construit au lot 47. **Aucun rebuild natif.**

**Fonctionnement :** en ouvrant une plante suivie, en plus des analyses photo :
- Date de plantation modifiable (appui sur "🌱 Date de plantation non renseignée" ou sur la date
  déjà saisie pour la corriger).
- Trois boutons de journal rapide : **💧 Arrosé**, **✂️ Taillé**, **📝 Note** (observation libre,
  ex: "une feuille jaunit à la base") — chacun ajoute une entrée légère à l'historique, affichée
  distinctement des analyses IA complètes.
- L'historique mélange donc maintenant analyses photo ET évènements du quotidien, dans l'ordre
  chronologique.

**Fichiers modifiés :**
- `screens/PotagerScreen.js` — boutons de journal rapide, édition de la date de plantation,
  distinction visuelle évènement/analyse dans l'historique.

### 11/07/2026 — Lot 52 : correctif majeur — le sélecteur de thème ne servait à rien
En creusant l'idée "Kira personnalisable" de la liste de David, découverte d'un bug de fond
resté invisible depuis le début du projet : **le sélecteur de thème (Cosmos/Aurora/Sunset) et
la couleur d'accent dans Paramètres → Apparence ne changeaient en réalité RIEN en dehors de
l'écran Paramètres lui-même**. 19 écrans sur 20 appelaient `getTheme('cosmos')` en dur au lieu
de lire le thème choisi par l'utilisateur, et `App.js` figeait aussi la couleur de la barre de
statut et du fond de navigation sur Cosmos.

**Aucun rebuild natif** — que du JS, mais gros volume de fichiers touchés (mécanique, pas
risqué).

**Correctif :**
- Nouveau hook `utils/useTheme.js` (`useKiraTheme()`) : lit `prefs.theme`/`prefs.accent` et se
  réactualise à chaque fois que l'écran reprend le focus.
- Remplacement scripté de `const theme = getTheme('cosmos');` par `const theme = useKiraTheme();`
  dans les 19 écrans concernés.
- `App.js` : la couleur de la barre de statut et le fond de transition entre écrans suivent
  maintenant aussi le thème choisi (lu une fois au démarrage de l'app).

**Fichiers créés :**
- `utils/useTheme.js`

**Fichiers modifiés (20) :** `App.js` + 19 écrans.

### 11/07/2026 — Lot 51 : Mode Hasard Créatif (défis guitare/chant)
Troisième idée de la liste de David (catégorie 🟢). **Aucun rebuild natif** — que du JS.

**Fonctionnement :** une nouvelle carte "🎲 Défi créatif du jour" dans le module Guitare & Chant
(onglet Exercices), sous le "Plan Kira" existant. Un défi différent par jour, propre à l'onglet
actif (guitare ou chant) — 12 défis guitare et 10 défis chant, rotation déterministe par date,
plus un bouton 🔄 pour en tirer un nouveau à la demande. Bouton "Je l'ai relevé !" pour un petit
côté gamifié, mémorisé pour la journée.

**Fichiers créés :**
- `utils/defisCreatifs.js`

**Fichiers modifiés :**
- `screens/GuitareScreen.js` — carte défi + logique de chargement/validation.

### 11/07/2026 — Lot 50 : Mode Économie de batterie
Deuxième idée de la liste de David (catégorie 🟢). **Aucun rebuild natif** — que du JS.

**Fonctionnement :** nouveau switch dans Paramètres → Apparence → "🔋 Mode Économie de
batterie". Une fois activé :
- L'icône animée de Kira (pulsations, rotation, halo, étincelles) devient statique **partout**.
- Les animations météo (pluie, givre...) sont coupées.
- L'horloge de l'accueil se rafraîchit toutes les 2 minutes au lieu de toutes les 30 secondes.

**Fichiers modifiés :**
- `components/KiraIcon.js` — nouvelle prop `modeEco`.
- `components/Shared.js`, `components/WeatherFX.js`, `screens/ParametresScreen.js`,
  `screens/KiraChatScreen.js`, `screens/EcouteRapideScreen.js`, `screens/HomeScreen.js`.

### 11/07/2026 — Lot 49 : correctif crash Health Connect (New Architecture)
David a testé le lot 48 et remonte un crash au moment de se connecter à Santé Connect
(`kotlin.UninitializedPropertyAccessException` sur `requestPermission`).

**Diagnostic** : bug connu upstream de `react-native-health-connect` (issue #214), touchant
spécifiquement les projets utilisant la **New Architecture** de React Native. Notre projet
n'avait jamais réglé `newArchEnabled` explicitement, donc utilisait la valeur par défaut du SDK
56 : activée.

**Correctif appliqué** : `"newArchEnabled": false` dans `app.json`.

**⚠️ Pas garanti à 100%** — bug upstream documenté sans correctif officiel confirmé ; piste la
plus probable au vu du contexte technique.

**⚠️ Rebuild natif nécessaire.**

### 11/07/2026 — Lot 48 : Kira-Podcast (briefing audio)
Premier lot de la liste d'idées transmise par David. **Aucun rebuild natif** — réutilise
`expo-speech`, déjà présent. Concrétise une partie du cahier des charges d'origine : le résumé
matinal parlé.

**Fonctionnement :**
- Bouton 🎙️ dans la barre d'état de l'accueil → compose un texte à partir des données déjà
  affichées (météo, agenda du jour, sommeil/hydratation, dicton) et le lit à voix haute.
- Accessible aussi depuis le chat : "fais-moi mon briefing" (ou variantes).

**Fichiers créés :**
- `utils/kiraBriefing.js`

**Fichiers modifiés :**
- `screens/HomeScreen.js`, `utils/kiraIntents.js`, `screens/KiraChatScreen.js`

### 11/07/2026 — Lot 47 : corrections suite aux premiers tests réels
David a testé les lots 41-46 et remonte 6 problèmes concrets. Session de correction pure,
**aucun rebuild natif nécessaire**.

**1. Health Connect détecté comme "non installé" alors qu'il l'est** — `initialize()` n'était
jamais appelé avant `requestPermission()`. Corrigé + diagnostic `getSdkStatus()` plus précis.

**2. Cuisine : toujours la même recette** — bouton régénération cassé + rotation hors-ligne trop
limitée (7 valeurs). Corrigés. Ajout structure entrée/plat/dessert.

**3. Horoscope toujours identique** — jamais eu de logique de variation. Nouveau
`utils/horoscopeCaller.js` (génération IA ou rotation par date) + bouton régénérer.

**4. Potager** — nom modifiable, suppression de plante, vrai historique par plante (tableau
complet au lieu d'un seul champ écrasé), prompt d'analyse plus tolérant, photo meilleure qualité.

**5. Réveil : impossible de modifier l'heure, "rien ne sonne"** — édition d'alarme ajoutée
(n'existait pas). Clarification texte : notification programmée réelle, mais pas un moteur
d'alarme façon appli "Horloge" (pas de sonnerie en boucle qui ignore le mode silencieux).

**6. Sauvegarde Git** — `COMMENT_SAUVEGARDER.md` fourni.

**Fichiers créés :** `utils/horoscopeCaller.js`

**Fichiers modifiés :** `utils/healthConnectService.js`, `utils/cuisineCaller.js`,
`utils/plantAnalyzer.js`, `screens/CuisineScreen.js`, `screens/HoroscopeScreen.js`,
`screens/PotagerScreen.js`, `screens/ReveilScreen.js`, `screens/SanteScreen.js`,
`screens/ParametresScreen.js`

### 08/07/2026 — Lot 46 : Driver Tuya / Smart Life pour la Domotique
**✅ Aucun rebuild natif** — API cloud (HTTPS + signature HMAC-SHA256 via `crypto-js`, 100% JS).

**Pourquoi le cloud plutôt qu'une approche locale** : le protocole local Tuya demande une
extraction de clé secrète par appareil + de vraies connexions TCP brutes (aurait demandé
`react-native-tcp-socket`, un nouveau module natif). Le cloud officiel reste plus simple.

**⚠️ Limite propre à Tuya** : l'essai gratuit d'IoT Core (1 mois) doit être prolongé
manuellement depuis leur interface, sinon les appels API s'arrêtent.

**Fonctionnement :** driver `driverTuya` respectant l'architecture par drivers du lot 14 —
`DomotiqueScreen.js` n'a eu besoin d'aucune modification. Gestion automatique du jeton (2h).
Détection automatique des "codes DP" marche/arrêt et luminosité par appareil.

**Fichiers créés :** `utils/driverTuya.js`

**Fichiers modifiés :** `utils/domotiqueDrivers.js`, `screens/ParametresScreen.js`,
`package.json`.

### 08/07/2026 — Lot 45 (étape 2/2) : Connexion Health Connect
Health Connect est le point central où Fitbit/Garmin/Samsung Health/Withings peuvent tous écrire
leurs données — une seule intégration suffit pour tous, au lieu d'une par marque.

**Choix technique** : `react-native-health-connect` + `expo-build-properties`
(`minSdkVersion=26` requis).

**Fonctionnement :** bandeau connecté/déconnecté dans Santé, synchronisation auto au focus (pas,
calories, FC, sommeil, poids). La saisie manuelle du lot 44 reste disponible en complément.

**Fichiers créés :** `utils/healthConnectService.js`, `plugins/withHealthConnectManifest.js`

**Fichiers modifiés :** `screens/SanteScreen.js`, `screens/ParametresScreen.js`, `app.json`,
`package.json`

**⚠️ Rebuild natif** — recommandé de grouper avec les lots 41+42, garder le lot 43 séparé.

### 08/07/2026 — Lot 44 (étape 1/2) : Santé réellement interactive — sans API externe
Le module Santé était 100% statique depuis le début. **Aucun rebuild natif requis.**

**Corrections/ajouts :** objectifs (Profil) enfin connectés aux anneaux (bug de fond corrigé),
ajout d'eau en un geste, saisie manuelle, vrai historique quotidien avec rollover automatique à
minuit (`sante_historique`, 90 jours), mini graphique 7 jours, conseil Kira dynamique.

**Fichiers créés :** `utils/santeManager.js`

**Fichiers modifiés :** `utils/storage.js`, `screens/SanteScreen.js`, `screens/HomeScreen.js`,
`screens/ParametresScreen.js`, `utils/widgetUpdater.js`

### 08/07/2026 — Lot 43 : Écoute permanente du mot "Kira" (mains libres)
**⚠️ Le lot le plus complexe et le plus fragile à ce jour.** Trois dépendances natives empilées :
`@picovoice/porcupine-react-native` (+ `react-native-voice-processor`) pour la détection 100%
locale du mot-clé, `react-native-background-actions` pour le service de premier plan (notification
persistante non masquable, imposée par Android), et un plugin Expo local
`plugins/withPorcupineAssets.js` pour copier les fichiers du mot-clé au build.

**Mot de réveil "Kira" en français** créé par David via Picovoice Console (étape humaine
obligatoire).

**Limites honnêtes** : notification persistante obligatoire, consommation batterie notable,
écran verrouillé peut bloquer l'ouverture directe (notification prend le relais).

**Fichiers créés :** `utils/wakeWordService.js`, `plugins/withPorcupineAssets.js`,
`assets/porcupine/`

**Fichiers modifiés :** `utils/apiKeys.js`, `screens/ParametresScreen.js`, `app.json`,
`package.json`

**⚠️ Rebuild natif — recommandé de traiter ce lot SEUL, séparément des autres.**

### 08/07/2026 — Lot 42 : Parking GPS réel + carte interactive
`react-native-maps` + `expo-location`. Bouton position actuelle (géolocalisation inversée),
carte interactive sombre, distance en temps réel (Haversine), bouton guidage Google Maps.
Rétrocompatible avec les anciennes positions saisies à la main.

**Fichiers modifiés :** `screens/ParkingScreen.js`, `package.json`, `app.json` (clé Google Maps
à configurer manuellement).

**⚠️ Rebuild natif — peut être groupé avec le lot 41.**

### 08/07/2026 — Lot 41 : Widget Android "Kira OS — Maxi"
`react-native-android-widget` (v0.20.3). Widget 5×5 cases (occupe la quasi-totalité d'une page
d'accueil sur la plupart des lanceurs — le maximum que la plateforme permette d'appeler "plein
écran" pour un widget). Affiche heure/date, état de Kira, météo, 3 barres santé, prochain
évènement, dicton, bouton "🎤 Parler à Kira". Deep-linking configuré (`kiraosclean://`).

**Fichiers créés :** `widget/KiraMaxiWidget.js`, `widget/widgetTaskHandler.js`,
`utils/widgetUpdater.js`

**Fichiers modifiés :** `index.js`, `app.json`, `package.json`, `App.js`,
`screens/HomeScreen.js`, `screens/AgendaScreen.js`, `screens/MeteoScreen.js`,
`screens/ParametresScreen.js`

**⚠️ Rebuild natif obligatoire.**

### 08/07/2026 — Session d'ouverture (lot 40 → première reconstruction du livre de bord)
- `LIVRE_DE_BORD_KIRA.md` introuvable dans le dépôt malgré les échanges précédents → reconstruit
  intégralement à partir de l'historique Git (15 commits) et de la lecture du code actuel.
- État général : projet très avancé, quasiment tous les modules du cahier des charges initial
  fonctionnels avec de vraies API, sécurité par chiffrement en place, mémoire de Kira démarrée.
- David choisit le widget plein écran comme priorité suivante → lot 41.

### [26/07/2026] — Lot 57 : Scène domotique automatique à l'arrivée
Suite de Géo-Kira (lot 54) — idée notée en fin de section "Prochaines pistes" du lot précédent,
concrétisée. **Aucun rebuild natif** — réutilise `expo-task-manager` déjà installé au lot 54.

**Fonctionnement :**
- Dans Paramètres → 🌟 Kira → 📍 Géo-Kira, nouvelle liste "🏠 Scène d'arrivée" : tous les
  appareils domotique disponibles (tous drivers actifs confondus — Démo/Hue/Tuya), avec un
  switch par appareil.
- Les appareils cochés s'allument automatiquement, en plus de la notification, dès que Géo-Kira
  détecte une entrée dans la zone domicile.
- Robuste : un appareil injoignable n'empêche jamais la notification ni les autres appareils de
  la scène de fonctionner (`Promise.allSettled`).

**Fichiers modifiés (les 3 mêmes qu'au lot 54, versions mises à jour) :**
- `utils/geoKira.js` — `getSceneArrivee()` / `setSceneArrivee()`.
- `utils/geofencingTask.js` — `declencherSceneArrivee()` appelée à chaque entrée détectée.
- `components/GeoKiraCard.js` — liste des appareils avec switches, alimentée par
  `listerTousLesAppareils()` (architecture par drivers du lot 14, réutilisée sans modification).

**Note** : une fois Home Assistant connecté, ses appareils apparaîtront automatiquement dans
cette même liste, sans rien à changer ici — c'est tout l'intérêt de l'architecture par drivers.

### [26/07/2026] — Lot 58 : Export réel des données (sauvegarde JSON)
Correctif d'un bouton fantôme repéré en explorant Paramètres → Sécurité : "💾 Exporter mes
données (JSON)" existait dans l'interface depuis longtemps sans le moindre `onPress` — il ne
faisait rien. **Aucun rebuild natif** — que du JS, réutilise `expo-file-system`/`expo-sharing`
déjà présents (mêmes libs que l'export PDF santé/guitare).

**Fonctionnement :** rassemble toutes les clés AsyncStorage préfixées `kiraos_` dans un fichier
`.json` horodaté, puis ouvre le partage natif Android (Drive, mail, etc.). Les clés API ne sont
volontairement pas incluses (chiffrées séparément via `expo-secure-store` depuis le lot 30 —
invisibles à AsyncStorage, donc absentes de cet export par construction, pas de risque de fuite).

Le bouton "📥 Importer une sauvegarde" a été rendu honnête en attendant (message clair "bientôt
disponible" au lieu de ne rien faire silencieusement) — l'import nécessitera un sélecteur de
fichier natif (`expo-document-picker`) et donc un rebuild, à faire dans un lot dédié si besoin.

**Fichiers créés :** `utils/dataBackup.js`

**Fichiers modifiés :** `screens/ParametresScreen.js`

### [26/07/2026] — Lot 59 : App autonome + mises à jour à distance (EAS Update)
David signale que l'app actuelle (build `development`) nécessite de laisser l'ordinateur
connecté (`npx expo start`) pour fonctionner — normal, c'est le mode client de développement
utilisé depuis le début pour itérer vite pendant la construction. Mise en place du passage à un
usage quotidien autonome.

**Changement de stratégie de build/livraison à partir de maintenant :**
- Build principal du téléphone : profil `preview` (APK autonome, distribué en interne, PAS le
  Play Store) au lieu de `development`.
- `expo-updates` ajouté : pour tous les lots JS-only (la grande majorité), David lance
  `eas update --branch preview` au lieu de reconstruire — l'app se met à jour au prochain
  lancement, sans rebuild ni ordinateur connecté en continu.
- Les lots avec nouveau module natif (flag "⚠️ Rebuild natif obligatoire") nécessitent toujours
  un `eas build --profile preview` classique.

**Fichiers modifiés :**
- `app.json` — `runtimeVersion` (policy `appVersion`), `updates.url` (vers le projet EAS
  existant), plugin `expo-updates`.
- `package.json` — dépendance `expo-updates`.

**Reste à faire côté David (pas fait par Claude, pas accès à `eas.json`) :**
- Vérifier/ajouter le profil `preview` dans `eas.json` (contenu standard donné dans le guide
  d'installation du lot).
- Lancer le premier `eas build --profile preview` et installer l'APK obtenu sur le téléphone.

**Note pour Claude (sessions futures)** : à partir de ce lot, préciser à chaque livraison si
elle nécessite `eas update` (JS seulement) ou `eas build` (natif) plutôt que de simplement dire
"aucun rebuild" — les deux commandes ont un sens différent maintenant que le build autonome est
en place.

### [28/07/2026] — Lot 60 : correctifs Potager (Gemini) + Health Connect
David a testé les lots précédents sur le build `preview` autonome et remonte 3 problèmes :
Potager (Gemini), Health Connect (crash), Google Agenda (OAuth 400). Ce lot traite les deux
premiers ; l'Agenda reste ouvert (voir note en bas).

**1. Potager / Gemini — cause confirmée avec certitude.**
`maxOutputTokens: 500` était trop bas pour le JSON complet demandé (tous les champs +
observations + 2 conseils secondaires) → Gemini coupé en plein milieu de sa réponse →
`"JSON Parse error: Unexpected end of input"`. Remonté à 1024 tokens pour Gemini ET Claude
(cohérence), + détection explicite du cas `finishReason === 'MAX_TOKENS'` pour ne plus jamais
laisser ça remonter comme un crash JSON opaque.
- **JS seulement**, livrable par `eas update`.

**2. Health Connect — plantage immédiat au moment de "Connecter", sans message d'erreur.**
Diagnostic à distance (pas de logcat fourni par David à ce stade) : il manquait le bloc
`<queries>` dans le manifeste Android, obligatoire depuis Android 11 pour qu'une app puisse
voir/lancer une autre app installée (ici Santé Connect) — restriction de visibilité des
packages. C'est une étape d'installation documentée officiellement par
`react-native-health-connect`, jamais ajoutée jusqu'ici. Le symptôme (plantage immédiat, aucun
message JS) est cohérent avec un problème survenant avant même d'atteindre le code JavaScript.
- **⚠️ Piste probable, pas confirmée par un vrai log** — à valider après rebuild. Si le crash
  persiste, demander à David un `adb logcat *:E` pendant la reproduction du crash.
- **Rebuild natif obligatoire** (modifie le manifeste Android au build).

**Fichiers modifiés :**
- `utils/plantAnalyzer.js`
- `plugins/withHealthConnectManifest.js`

**Reste ouvert — Google Agenda / OAuth "Erreur 400 : invalid_request"** : probablement lié au
passage au build `preview` (nouvelle empreinte SHA-1 de signature, différente de celle utilisée
sur les précédents builds `development`). Pistes données à David : vérifier que le client OAuth
dans Google Cloud Console est bien de type "Application Android" (pas "Application Web"), et
que la nouvelle empreinte SHA-1 du build `preview` (récupérable via `eas credentials`) est bien
celle enregistrée dans ce client. En attente du retour de David sur ces deux points avant
d'aller plus loin — rien à coder tant qu'on n'a pas confirmé côté Google Cloud Console.

**Rappel process (à ne pas oublier)** : depuis le lot 59, `eas.json` a un profil `preview` avec
`buildType: apk`. Toujours faire `npm install` après qu'un lot ait touché `package.json`, avant
de lancer `eas build` (sinon `npm ci` échoue en environnement EAS — vécu au lot 59).

### [28/07/2026] — Lot 61 : harmonisation des limites de réponse IA (chat)
En corrigeant le bug de troncature Gemini du Potager (lot 60), vérification préventive du même
type de problème ailleurs dans le projet. Trouvé dans `utils/aiCaller.js` (chat général) :
Mistral/Claude/OpenAI limités à 500 tokens de réponse, contre 2000 déjà pour Gemini — risque de
réponse coupée en plein milieu si l'utilisateur demande "plus de détails" à Kira (explicitement
autorisé par le prompt système). Remonté à 1500 pour les trois, cohérent avec Gemini.

**JS seulement**, livré par `eas update` (David ne peut pas rebuilder pendant quelques jours à
ce lot).

**Fichiers modifiés :** `utils/aiCaller.js`

**David ne peut pas rebuilder pour l'instant** — les lots suivants doivent rester JS-only
(`eas update`) tant qu'il n'a pas confirmé pouvoir relancer un `eas build`. Ne pas proposer de
correctif nécessitant un nouveau module natif ou une modification de manifeste/gradle avant
cette confirmation.

### [29/07/2026] — Lot 62 : icône Kira, orbe vivant (v2)
David trouvait l'icône de Kira trop simple ("une simple étoile qui bouge") pour une app qui se
veut premium. En regardant le vrai fichier (`components/KiraIcon.js`, lot 40), le travail de
fond (sphère en dégradé, anneaux, reflet gloss) était en réalité déjà soigné — le problème
identifié : un gros emoji plat (🌟, 🌀, 🔮...) posé par-dessus écrasait visuellement tout ce
travail, donnant l'impression d'une icône plate malgré la sphère en dessous.

**JS seulement** (`react-native-svg`, déjà en place) — livré par `eas update`, aucun rebuild.

**Changements :**
- Emoji réduit à un petit détail discret et lumineux au centre (au lieu de dominer l'icône).
- Reflet mobile qui se déplace en boucle sur la sphère (simule une source de lumière qui tourne
  autour d'un objet 3D — l'effet le plus déterminant pour la sensation de volume).
- Deux particules lumineuses en orbite (vitesses et sens différents).
- Anneau d'énergie fin toujours en rotation, quel que soit le type d'animation de l'icône
  (avant, seules les icônes "rotate"/"pulse-glow" tournaient — les icônes "pulse" restaient
  statiques à part le battement).
- `utils/apiKeys.js` non modifié — la liste `KIRA_ICONS` reste identique, aucun autre fichier
  touché.

**Fichiers modifiés :** `components/KiraIcon.js`

**Piste notée pour plus tard (nécessite un rebuild, pas fait)** : une vraie sphère 3D rendue
via `expo-gl` + `three.js` (relief et lumière réellement calculés, pas simulés en SVG 2D) —
proposée à David comme évolution possible une fois qu'il pourra de nouveau rebuilder.

### [29/07/2026] — Lot 63 : vraie sphère 3D pour Kira (expérimental)
Suite du lot 62 — David a confirmé vouloir aller jusqu'à un vrai rendu 3D (pas juste simulé en
SVG) pour l'icône de Kira, préparé maintenant pour être installé au prochain rebuild (David ne
peut pas rebuilder ces jours-ci).

**⚠️ Nouveau module natif — rebuild obligatoire, PAS un simple `eas update`.**
**⚠️ Expérimental — n'a pas pu être testé sur un vrai appareil avant livraison.**

**Choix technique :** `expo-gl` (contexte OpenGL dans une vue React Native) + `expo-three`
(pont vers un renderer three.js) + `three` (moteur 3D pur JS). Sphère avec matériau
`MeshPhysicalMaterial` (clearcoat, léger effet cristal), lumière ponctuelle qui se déplace
réellement autour de la sphère (calcul réel, plus une simulation comme au lot 62), anneau fin
en tore, deux particules en orbite — reprend la même composition visuelle que la version SVG du
lot 62, mais avec un vrai relief et une vraie lumière calculés.

**Décisions de prudence prises :**
- Contrôlé par un interrupteur "🔮 Rendu 3D (expérimental)" dans Paramètres → 🌟 Kira,
  **désactivé par défaut** — l'utilisateur l'active volontairement une fois le rebuild fait.
- Le sélecteur des 8 icônes (grille de choix) reste toujours en version SVG plate (lot 62),
  quel que soit l'état de l'interrupteur, via un nouveau prop `apercu` sur `KiraIcon` — éviter
  de faire tourner 8 scènes 3D simultanément dans la grille de sélection.
- Le rendu 3D est aussi automatiquement désactivé en Mode Éco (lot 50), comme le reste des
  animations.
- Risque connu documenté dans le code et le guide d'installation : la transparence de fond
  d'`expo-gl` peut être limitée sur certains GPU/pilotes Android — un correctif simple (changer
  la couleur de fond) est prévu si besoin après le premier test de David.

**Fichiers créés :** `components/KiraOrb3D.js`

**Fichiers modifiés :** `components/KiraIcon.js` (bascule conditionnelle SVG/3D),
`utils/apiKeys.js` (préférence `rendu3DActif`), `screens/ParametresScreen.js` (interrupteur +
`apercu` sur la grille de sélection).

**À faire avant de builder** : `npx expo install expo-gl expo-three three` puis `npm install`
(remet `package-lock.json` en phase, réflexe du lot 59).

**Reste en attente de retour de David après son prochain rebuild** — ce lot est probablement à
itérer une fois testé sur un vrai appareil (voir avertissements ci-dessus).

### [29/07/2026] — Lot 64 : correctif double lecture vocale du briefing audio
Passe de vérification volontaire sur `KiraChatScreen.js` (relu en entier, fichier critique
possédé intégralement depuis le lot 56/60). Bug trouvé : le bloc "briefing audio" (lot 48)
appelait `Speech.speak()` directement en plus de `persistChat()`, qui lit déjà automatiquement
toute réponse de Kira à voix haute (et respecte le réglage `voixActivee`). Conséquence : le
briefing était lu deux fois en même temps, et le deuxième appel ignorait complètement le
réglage "Voix de Kira" désactivé.

**JS seulement**, livré par `eas update`.

**Fichiers modifiés :** `screens/KiraChatScreen.js` (suppression de l'appel `Speech.speak()`
redondant dans le bloc de détection de demande de briefing).

**Note pour Claude (sessions futures)** : le reste de `KiraChatScreen.js` a été relu en entier à
cette occasion, aucun autre problème identifié dans les blocs de détection d'intention
(traduction, actualités, agenda, mémorisation, courses, notes, Géo-Kira).

[29/07/2026] — Vérification sécurité : chiffrement des clés API confirmé

Suite à la relecture de apiKeys.js (passe de vérification, pas un lot de code), doute soulevé sur la cohérence entre le commentaire de dataBackup.js (lot 58, "clés API chiffrées depuis le lot 30") et le fait que apiKeys.js appelle simplement getData/setData de storage.js sans rien de visiblement chiffré. David a envoyé storage.js et secureStorage.js pour vérification.

Confirmé sans ambiguïté : aucun bug. storage.js redirige getData/setData/removeData de façon transparente vers secureStorage.js (Keystore Android via expo-secure-store) pour toute clé listée dans CLES_SENSIBLES (api_keys, google_jetons, spotify_jetons, hue_config) — mécanisme invisible pour tout le reste du code, exactement comme documenté. expo-secure-store est un module natif entièrement séparé d'AsyncStorage (pas juste un préfixe différent) : l'export JSON du lot 58 (AsyncStorage.getAllKeys()) ne peut donc structurellement pas voir ni inclure ces données. Le commentaire de dataBackup.js était exact.

Aucun fichier modifié — vérification pure, résultat positif.

### [31/07/2026] — Lot 65 : correctifs Courses/Notes/Potager/Réveil (listes vidées), dictons répétitifs, recettes Cuisine répétitives

David a remonté 3 bugs après usage réel : recettes Cuisine toujours identiques, dicton de
l'accueil qui semble toujours le même, liste de Courses qui revient aux exemples par défaut.
**Aucun rebuild natif — pur JavaScript, déployé par `eas update`.**

**Bug 1 — listes qui reviennent aux exemples (Courses signalé, mais bug identique trouvé
et corrigé aussi dans Notes/Potager/Réveil) :**
La condition de chargement (`c && c.length ? c : DEFAULT`) traitait un tableau VIDE (donc
`.length === 0`, falsy) comme une absence de données, et réaffichait les exemples. Une fois
que l'utilisateur vide complètement sa liste, elle ne devait pourtant plus jamais réafficher
les exemples. Corrigé partout par `Array.isArray(x) ? x : DEFAULT` (un tableau vide reste
un tableau vide). Les 4 écrans sont passés de `useEffect` à `useFocusEffect` au passage,
pour rester cohérents avec le reste de l'app (rafraîchissement à chaque retour sur l'écran).

**Bug 2 — dicton du jour répétitif :**
`HomeScreen.js` tirait le dicton au hasard (`Math.random()`) à CHAQUE ouverture de l'écran,
pas une fois par jour — avec seulement 5 dictons, deux tirages consécutifs tombaient souvent
sur le même. `widgetUpdater.js` avait sa PROPRE copie de la liste avec une logique de
sélection différente (basée sur `getDate()`), donc en plus le dicton de l'accueil et celui
du widget pouvaient différer. Créé `utils/dictons.js` : source unique, liste passée à 20
entrées, sélection déterministe par jour de l'année (stable toute la journée, change chaque
jour, identique partout dans l'app).

**Bug 3 — recettes Cuisine toujours similaires (avec IA configurée) :**
Le prompt envoyé à l'IA (`construirePromptRecettes`) ne contenait que le jour de la semaine
et le mois (ex: "ce vendredi de juillet") — texte STRICTEMENT identique à chaque vendredi du
mois, ce qui poussait plusieurs fournisseurs IA à renvoyer des menus très proches pour un
prompt identique. Le prompt contient maintenant la date complète (jamais deux fois
identique), et un nouvel historique (`cuisine_historique_titres`, 10 derniers jours, 3
titres/jour) est explicitement listé dans le prompt avec consigne de ne pas les reproposer.
Le mode hors-ligne (rotation par seed sur la date complète, lot 47) n'avait pas ce problème
et n'a pas été touché.

**Fichiers créés :**
- `utils/dictons.js`

**Fichiers modifiés :**
- `screens/HomeScreen.js` — dicton du jour via `getDictonDuJour()` au lieu du tirage aléatoire
- `utils/widgetUpdater.js` — même source que l'accueil pour le dicton du widget
- `utils/cuisineCaller.js` — prompt avec date complète + anti-répétition sur 10 jours
- `screens/CoursesScreen.js` — fix liste vidée + `useFocusEffect`
- `screens/NotesScreen.js` — fix liste vidée + `useFocusEffect`
- `screens/PotagerScreen.js` — fix liste vidée + `useFocusEffect` (chargement uniquement,
  le reste des états locaux — photo en cours, plante ouverte... — n'est pas affecté)
- `screens/ReveilScreen.js` — fix liste vidée + `useFocusEffect`

**Sujets ouverts, non traités ce lot (rappel) :**
- OAuth Google Agenda (erreur 400) — David va vérifier son Google Cloud Console prochainement.
- Sphère 3D de Kira (lot 63) — toujours pas testée, David ne peut pas rebuilder avant ~2
  jours (échéance posée le 31/07/2026).
- Home Assistant — toujours en attente du serveur physique.
- **Nouveau, en cours côté David** : configuration Tuya/Smart Life (prises déjà en sa
  possession) — driver déjà livré au lot 46, guide de création de projet Tuya IoT Platform +
  liaison compte Smart Life donné à David en conversation (pas dans un fichier — à reporter
  ici si ça devient une vraie étape du projet). En attente de retour (Client ID / Client
  Secret / UID récupérés ou blocage rencontré).

Étape 1 — Compte Tuya IoT Platform
Va sur iot.tuya.com et crée un compte (email + mot de passe), gratuit.
Connecte-toi.
Étape 2 — Créer un projet Cloud
Menu Cloud → Development → Create Cloud Project.
Renseigne : nom libre (ex: "Kira OS"), Industry = Smart Home, Development Method = Smart Home, Data Center = Central Europe Data Center (correspond à la région "eu" déjà pré-sélectionnée dans l'app).
Valide. Sur l'écran d'abonnement aux API qui suit, coche au minimum : IoT Core, Authorization, Device Status Notification — abonnement gratuit (essai).
Étape 3 — Récupérer Client ID / Client Secret

Une fois le projet créé, sur sa page "Overview" tu verras directement :

Access ID / Client ID
Access Secret / Client Secret

Garde ces deux valeurs sous la main (ne les partage à personne d'autre que dans l'app).

Étape 4 — Lier ton compte Smart Life (pour récupérer l'UID)
Dans le projet Cloud → onglet Devices → Link Tuya App Account (ou "Link Devices By App Account").
Choisis Automatic Link, un QR code apparaît.
Ouvre l'app Smart Life sur ton téléphone (celle où sont déjà tes prises) → Profil → icône scan (en haut à droite) → scanne le QR code.
Une fois lié, ton compte + tes appareils apparaissent dans la liste. À côté de ton compte lié, Tuya affiche un UID — copie-le aussi.
Étape 5 — Entrer les 3 valeurs dans Kira OS

Dans l'app : Paramètres → 🔑 API → section "🔵 Tuya / Smart Life", renseigne Client ID, Client Secret, UID, région "eu", puis Enregistrer.

Étape 6 — Activer le driver

Va dans le module Domotique → Écosystèmes disponibles → active le toggle "Tuya / Smart Life". Tes prises devraient apparaître dans "Mes appareils" avec bouton marche/arrêt.

### [31/07/2026] — Lot 66 : dictons étoffés (103) + Géo-Kira anti faux-positifs (rayon, notif différée, scène opt-in + cooldown)

David a testé le lot 65 et remonté deux nouveaux points : 20 dictons c'est encore trop peu
(sensation de redondance), et Géo-Kira (lot 54/57) réagit trop facilement — "Bon retour"
reçu en passant simplement dans la rue, avec la crainte que la scène domotique (lumières)
s'active trop souvent pour la même raison. **Toujours du pur JavaScript, `eas update`.**

**Dictons (suite du lot 65) :**
Liste passée de 20 à **217 entrées** (David a demandé d'en mettre encore plus, "même 200",
après avoir vu le premier passage à 103), classées par thème (musique, sagesse générale,
proverbes internationaux, santé, cuisine, jardin, organisation, météo, motivation, bien-être,
voyage/curiosité, famille/amitié, simplicité/technologie) pour rester cohérente avec
l'univers de l'app. Sélection toujours stable sur une journée, mais mélangée par un petit
hash (année + jour de l'année) plutôt qu'un simple modulo — évite qu'un dicton donné tombe
systématiquement à la même date calendaire chaque année. Vérifié : 217 textes tous uniques
(aucun doublon), 195 dictons distincts vus sur une simulation de 400 jours consécutifs.

**Géo-Kira — 3 garde-fous ajoutés (utils/geoKira.js, utils/geofencingTask.js,
components/GeoKiraCard.js) :**
1. Nouveau préréglage de rayon **50m** (en plus de 100/200/500), avec texte d'aide expliquant
   de choisir le plus petit rayon qui couvre la maison sans déborder sur la rue/voisins.
2. La notification "Bon retour" est désormais **différée de 2 minutes**
   (`DELAI_CONFIRMATION_SECONDES`) via `Notifications.scheduleNotificationAsync({ trigger:
   { seconds: 120 } })` au lieu d'un affichage immédiat (`trigger: null`). Si une sortie de
   zone est détectée avant l'écoulement du délai, la notification programmée est annulée
   (`cancelScheduledNotificationAsync`) — un simple passage dans la rue ne déclenche donc plus
   la notification.
3. La **scène domotique passe opt-in** (`getSceneActiveArrivee`/`setSceneActiveArrivee`,
   désactivée par défaut même si des appareils sont déjà cochés) + un **cooldown de 30 minutes**
   entre deux déclenchements (`peutDeclencherScene`/`marquerSceneDeclenchee`,
   `COOLDOWN_SCENE_MS`). David doit réactiver explicitement l'interrupteur "⚡ Activer la scène
   automatique" après installation.

**Limite connue, assumée pour ce lot :** la notification bénéficie d'une vraie confirmation
différée (2 min, annulable), mais la scène domotique elle-même reste déclenchée dès l'entrée
détectée (pas de délai de confirmation identique) — exécuter du code JS personnalisé après un
délai en arrière-plan Android de façon fiable demanderait une tâche `expo-background-fetch`
dédiée (nécessiterait un rebuild, granularité mini ~15 min côté Android, pas assez réactif).
Les garde-fous 1 et 3 (rayon + opt-in + cooldown) compensent en attendant une éventuelle
évolution native future.

**Fichiers modifiés :**
- `utils/dictons.js` (remplace la version du lot 65)
- `utils/geoKira.js` — nouvelles constantes/fonctions : `DELAI_CONFIRMATION_SECONDES`,
  `COOLDOWN_SCENE_MS`, `getSceneActiveArrivee`, `setSceneActiveArrivee`,
  `peutDeclencherScene`, `marquerSceneDeclenchee`, `getNotifAttente`, `setNotifAttente`
- `utils/geofencingTask.js` — notification différée/annulable, scène gardée par opt-in + cooldown
- `components/GeoKiraCard.js` — rayon 50m, interrupteur "Activer la scène automatique", textes d'aide

**Sujets ouverts, non traités ce lot (rappel) :**
- OAuth Google Agenda (erreur 400) — David va vérifier son Google Cloud Console prochainement.
- Sphère 3D de Kira (lot 63) — toujours pas testée, rebuild possible d'ici ~2 jours.
- Home Assistant — en attente du serveur.
- Configuration Tuya/Smart Life en cours côté David (driver déjà livré au lot 46, guide de
  configuration donné en conversation le 31/07 — pas encore de retour sur Client ID/Secret/UID).
