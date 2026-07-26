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
