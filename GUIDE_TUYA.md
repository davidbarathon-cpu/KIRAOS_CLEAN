# Guide — Connecter Kira OS à Tuya / Smart Life

Ce guide t'accompagne pas à pas pour relier tes appareils Tuya (ou toute marque générique qui
utilise la puce/le cloud Tuya en coulisses — beaucoup de prises et ampoules pas chères sont
dans ce cas) à Kira OS. Compte environ 15-20 minutes la première fois.

**Ce qu'il te faut avant de commencer** : tes appareils déjà configurés et fonctionnels dans
l'app **Tuya Smart** ou **Smart Life** sur ton téléphone (celle que tu utilises déjà au
quotidien pour les piloter).

---

## Étape 1 — Créer un compte développeur Tuya

1. Va sur **https://iot.tuya.com** et crée un compte (c'est **gratuit**, mais c'est un compte
   **différent** de celui de ton app Tuya Smart/Smart Life — ne te connecte pas avec les mêmes
   identifiants, crée un nouveau compte séparé).
2. Confirme ton e-mail si demandé.

---

## Étape 2 — Créer un projet Cloud

1. Une fois connecté, va dans **Cloud → Development** (ou "Cloud → Mes projets Cloud" selon la
   traduction) puis clique sur **Create Cloud Project** ("Créer un projet Cloud").
2. Remplis le formulaire :
   - **Project Name** : ce que tu veux, ex. "Kira OS"
   - **Description** : libre, ex. "Assistant personnel"
   - **Industry** (secteur) : **Smart Home**
   - **Development Method** : **Smart Home** ⚠️ important, ne choisis pas "Custom"
   - **Data Center** (centre de données) : **choisis la même région que celle utilisée par ton
     compte dans l'app Tuya Smart/Smart Life** (regarde dans l'app : Profil → Réglages →
     Compte et sécurité, la région y est indiquée). Pour la France/l'Europe, c'est en général
     **Central Europe** ou **Western Europe** selon les cas.
     **C'est le point de blocage le plus fréquent** : si cette région ne correspond pas à
     celle de ton compte app, la liaison à l'étape 4 échouera avec un message "no permission".
3. Clique sur **Create**.

---

## Étape 3 — Autoriser les bonnes APIs

Juste après la création, un assistant de configuration ("Configuration Wizard") s'affiche.

1. Vérifie que ces services sont cochés (ajoute ceux qui manquent) :
   - **IoT Core**
   - **Authorization** (parfois listé "Authorization Token Management")
   - **Device Status Notification**
   - **Smart Home Scene Linkage** (si disponible dans la liste)
2. Clique sur **Authorize**.

⚠️ **À savoir pour plus tard** : le premier abonnement à ces services n'offre qu'**un mois
d'essai gratuit**. Passé ce délai, il faudra le renouveler (gratuitement) tous les
**6 mois environ**, dans **Cloud → Cloud Services → IoT Core → Subscribe**. Si Kira OS
n'arrive plus à parler à tes appareils Tuya du jour au lendemain sans raison apparente,
**c'est la première chose à vérifier**. Un rappel dans ton agenda tous les 6 mois n'est pas
une mauvaise idée.

---

## Étape 4 — Lier ton compte de l'app (pour voir tes vrais appareils)

Sans cette étape, le projet Cloud existe mais ne "voit" aucun de tes appareils réels.

1. Sur la page de ton projet, va dans l'onglet **Devices** ("Appareils").
2. Clique sur **Link Tuya App Account** ("Lier un compte d'app") → **Add App Account**.
3. Un QR code apparaît. Ouvre l'app **Tuya Smart** ou **Smart Life** sur ton téléphone (celle
   où tes appareils sont déjà configurés), et scanne ce QR code (bouton "+" ou icône scanner
   en haut de l'app).
4. Confirme la liaison sur ton téléphone.
5. Une fois lié, un **UID** apparaît dans la liste à côté de ton compte — **note-le**, tu en
   auras besoin à l'étape 6.
6. Va dans l'onglet **All Devices** ("Tous les appareils") du projet pour vérifier que tes
   appareils apparaissent bien dans la liste. S'ils n'apparaissent pas, la région choisie à
   l'étape 2 est probablement en cause.

---

## Étape 5 — Récupérer le Client ID et le Client Secret

1. Retourne sur l'onglet **Overview** ("Aperçu") de ton projet.
2. Dans la section **Authorization Key** ("Clé d'autorisation"), tu trouveras :
   - **Access ID / Client ID**
   - **Access Secret / Client Secret** (parfois masqué derrière une icône "œil" à cliquer
     pour l'afficher)
3. Note ces deux valeurs précieusement (le Client Secret ne doit être partagé avec personne).

---

## Étape 6 — Entrer les informations dans Kira OS

Tu as maintenant 4 informations :
- **Client ID** (étape 5)
- **Client Secret** (étape 5)
- **UID** (étape 4)
- **Région** : `eu` (Europe), `us` (Amérique), `cn` (Chine) ou `in` (Inde) — selon le Data
  Center choisi à l'étape 2. Pour la France/l'Europe : `eu`.

Dans Kira OS :
1. Va dans **Paramètres → 🌟 Cerveau de Kira (IA)** — le bloc Tuya se trouve dans cette
   section (à côté des clés des fournisseurs d'IA).
2. Renseigne **Client ID**, **Client Secret**, **UID**, et choisis la **région**.
3. Appuie sur **Enregistrer**.

---

## Étape 7 — Activer le driver dans Domotique

1. Va dans le module **Domotique → Écosystèmes disponibles**.
2. Active **"Tuya / Smart Life"**.
3. Tes appareils devraient apparaître automatiquement dans la liste, avec leur état actuel.

---

## En cas de problème

| Symptôme | Piste à vérifier |
|---|---|
| Aucun appareil n'apparaît dans Kira | Vérifie l'étape 4 (liaison du compte app) — l'appareil doit d'abord apparaître dans **All Devices** sur le site Tuya avant de pouvoir apparaître dans Kira |
| Erreur "no permission" ou "1106" | La région (Data Center) du projet Cloud ne correspond pas à celle de ton compte app — recommence l'étape 2 avec la bonne région, ou crée un nouveau projet |
| Ça fonctionnait puis a arrêté du jour au lendemain | L'abonnement aux APIs a expiré (voir l'avertissement de l'étape 3) — va renouveler dans Cloud → Cloud Services → IoT Core |
| Un appareil précis ne répond pas bien (mais d'autres oui) | Certains appareils très spécifiques utilisent des codes internes non standards — signale-le-moi avec le nom exact du modèle, le driver pourra être ajusté |

---

## Bon à savoir

- Une fois configuré, tu n'as normalement plus jamais besoin de retoucher à cette procédure —
  seul le renouvellement de l'étape 3 est à refaire périodiquement.
- Tes appareils Tuya deviennent utilisables partout où Kira propose de choisir un appareil :
  scènes d'arrivée/départ de Géo-Kira, module Domotique, et bientôt depuis le chat.
