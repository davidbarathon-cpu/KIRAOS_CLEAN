// ═══════════════════════════════════════════
//  PARAMETRESSCREEN.JS — Le "deuxième cœur" de Kira
//  MISE À JOUR LOT 6 : nouvelle section "🔑 API"
//  pour saisir les clés (météo + IA), avec lien
//  de création sous chaque fournisseur.
// ═══════════════════════════════════════════

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import KiraIcon from '../components/KiraIcon';
import { BackButton, SectionLabel, Toggle } from '../components/Shared';
import {
  ACTUALITES_PROVIDERS,
  AI_PROVIDERS,
  getActiveAiProvider,
  getActiveKiraIcon,
  getActiveTraductionProvider,
  getActualitesProvidersActifs,
  getAllApiKeys,
  KIRA_ICONS,
  removeApiKey,
  setActiveAiProvider,
  setActiveKiraIcon,
  setActiveTraductionProvider,
  setActualitesProvidersActifs,
  setApiKey,
  TRADUCTION_PROVIDERS,
  WEATHER_PROVIDER,
} from '../utils/apiKeys';
import { getCustomModules, supprimerCustomModule } from '../utils/customModules';
import { apparierAvecBridge } from '../utils/driverPhilipsHue';
import { deconnecterGoogle, estConnecteAGoogle, getGoogleClientId, setGoogleClientId } from '../utils/googleAuth';
import {
  annulerParCle,
  annulerToutesLesNotifications,
  demanderPermissionNotifications,
  reprogrammerQuotidienne,
  verifierPermissionNotifications,
} from '../utils/notifications';
import { deconnecterSpotify, estConnecteASpotify, getSpotifyClientId, setSpotifyClientId } from '../utils/spotifyAuth';
import { getData, resetAllData, setData } from '../utils/storage';
import { getTheme, PALETTE, THEMES } from '../utils/theme';

const SECTIONS = [
  { id: 'profil', l: '👤 Profil' },
  { id: 'apparence', l: '🎨 Apparence' },
  { id: 'modules', l: '🧩 Modules' },
  { id: 'api', l: '🔑 API' },
  { id: 'kira', l: '🌟 Kira' },
  { id: 'notifs', l: '🔔 Notifs' },
  { id: 'securite', l: '🔒 Sécurité' },
];

const TOUS_MODULES = [
  { id: 'agenda', icon: '📅', label: 'Agenda' }, { id: 'sante', icon: '❤️', label: 'Santé' },
  { id: 'guitare', icon: '🎸', label: 'Guitare & Chant' }, { id: 'cuisine', icon: '🍳', label: 'Cuisine' },
  { id: 'courses', icon: '🛒', label: 'Courses' }, { id: 'meteo', icon: '⛅', label: 'Météo' },
  { id: 'horoscope', icon: '✨', label: 'Horoscope' }, { id: 'notes', icon: '📝', label: 'Notes' },
  { id: 'potager', icon: '🌱', label: 'Potager' }, { id: 'parking', icon: '🅿️', label: 'Parking' },
  { id: 'actualites', icon: '📰', label: 'Actualités' }, { id: 'traduction', icon: '🌍', label: 'Traduction' },
  { id: 'musique', icon: '🎵', label: 'Musique' }, { id: 'reveil', icon: '⏰', label: 'Réveil' },
  { id: 'domotique', icon: '🏠', label: 'Domotique' },
];

const COULEURS_ACCENT = [PALETTE.purple, PALETTE.teal, PALETTE.pink, PALETTE.orange, PALETTE.blue, PALETTE.violet, PALETTE.magenta, PALETTE.green, PALETTE.yellow, PALETTE.cyan];

export default function ParametresScreen({ navigation }) {
  const [section, setSection] = useState('profil');
  const [profil, setProfil] = useState({});
  const [prefs, setPrefs] = useState({});
  const [modulesActifs, setModulesActifs] = useState([]);
  const [modulesPersonnalises, setModulesPersonnalises] = useState([]);
  const [saved, setSaved] = useState(false);

  // ── État spécifique à la section API ──
  const [apiKeys, setApiKeysState] = useState({});
  const [providerActif, setProviderActif] = useState(null);
  const [editingKey, setEditingKey] = useState(null); // id du fournisseur en cours d'édition
  const [tempKeyValue, setTempKeyValue] = useState('');
  const [keySaved, setKeySaved] = useState(null);
  const [permissionNotifOk, setPermissionNotifOk] = useState(true);
  const [googleClientId, setGoogleClientIdState] = useState('');
  const [googleClientIdSaved, setGoogleClientIdSaved] = useState(false);
  const [googleConnecte, setGoogleConnecte] = useState(false);
  const [spotifyClientId, setSpotifyClientIdState] = useState('');
  const [spotifyClientIdSaved, setSpotifyClientIdSaved] = useState(false);
  const [spotifyConnecte, setSpotifyConnecte] = useState(false);
  const [hueBridgeIp, setHueBridgeIpState] = useState('');
  const [hueConnecte, setHueConnecte] = useState(false);
  const [hueAppairage, setHueAppairage] = useState(false);
  const [hueMessage, setHueMessage] = useState(null);
  const [traductionProviderActif, setTraductionProviderActif] = useState('deepl');
  const [actualitesProvidersActifs, setActualitesProvidersActifsState] = useState(['newsapi']);
  const [kiraIconActive, setKiraIconActiveState] = useState('etoile');

  // Recharge les modules personnalisés chaque fois que l'écran reprend le
  // focus (ex: retour depuis le constructeur après avoir créé/modifié un
  // module) — sans ça, la liste resterait figée à l'état du premier montage.
  const chargerModulesPersonnalises = useCallback(async () => {
    setModulesPersonnalises(await getCustomModules());
  }, []);
  useFocusEffect(useCallback(() => { chargerModulesPersonnalises(); }, [chargerModulesPersonnalises]));

  useEffect(() => {
    (async () => {
      const [p, pr, m, keys, provider] = await Promise.all([
        getData('profil'), getData('prefs'), getData('modules_actifs'),
        getAllApiKeys(), getActiveAiProvider(),
      ]);
      setProfil(p || {});
      setPrefs(pr || {});
      setModulesActifs(m && m.length ? m : TOUS_MODULES.map(x => x.id));
      setApiKeysState(keys || {});
      setProviderActif(provider);
      setPermissionNotifOk(await verifierPermissionNotifications());
      setGoogleClientIdState((await getGoogleClientId()) || '');
      setGoogleConnecte(await estConnecteAGoogle());
      setSpotifyClientIdState((await getSpotifyClientId()) || '');
      setSpotifyConnecte(await estConnecteASpotify());
      const hueConfig = (await getData('hue_config')) || {};
      setHueBridgeIpState(hueConfig.bridgeIp || '');
      setHueConnecte(!!(hueConfig.bridgeIp && hueConfig.username));
      setTraductionProviderActif(await getActiveTraductionProvider());
      setActualitesProvidersActifsState(await getActualitesProvidersActifs());
      setKiraIconActiveState(await getActiveKiraIcon());
    })();
  }, []);

  const theme = getTheme(prefs.theme || 'cosmos');
  const accent = prefs.accent || theme.accent;

  const saveProfil = async () => {
    await setData('profil', profil);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updatePref = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await setData('prefs', updated);
  };

  const toggleModule = async id => {
    const updated = modulesActifs.includes(id) ? modulesActifs.filter(x => x !== id) : [...modulesActifs, id];
    setModulesActifs(updated);
    await setData('modules_actifs', updated);
  };

  // ── Gestion des clés API ──
  const ouvrirLien = url => {
    Linking.openURL(url).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir le lien."));
  };

  const commencerEdition = providerId => {
    setEditingKey(providerId);
    setTempKeyValue(apiKeys[providerId] || '');
  };

  const sauverCle = async providerId => {
    const updated = await setApiKey(providerId, tempKeyValue);
    setApiKeysState(updated);
    setEditingKey(null);
    setKeySaved(providerId);
    setTimeout(() => setKeySaved(null), 2000);
  };

  const supprimerCle = async providerId => {
    const updated = await removeApiKey(providerId);
    setApiKeysState(updated);
    if (providerActif === providerId) {
      await setActiveAiProvider(null);
      setProviderActif(null);
    }
  };

  const choisirProviderActif = async providerId => {
    await setActiveAiProvider(providerId);
    setProviderActif(providerId);
  };

  const toggleActualitesProvider = async providerId => {
    const updated = actualitesProvidersActifs.includes(providerId)
      ? actualitesProvidersActifs.filter(p => p !== providerId)
      : [...actualitesProvidersActifs, providerId];
    setActualitesProvidersActifsState(updated);
    await setActualitesProvidersActifs(updated);
  };

  const choisirTraductionProvider = async providerId => {
    setTraductionProviderActif(providerId);
    await setActiveTraductionProvider(providerId);
  };

  const choisirKiraIcon = async iconId => {
    setKiraIconActiveState(iconId);
    await setActiveKiraIcon(iconId);
  };

  const sauverGoogleClientId = async () => {
    await setGoogleClientId(googleClientId);
    setGoogleClientIdSaved(true);
    setTimeout(() => setGoogleClientIdSaved(false), 2500);
  };

  const deconnecterGoogleDepuisParams = () => {
    Alert.alert('Déconnecter Google Agenda', 'Tu pourras te reconnecter à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => { await deconnecterGoogle(); setGoogleConnecte(false); } },
    ]);
  };

  const sauverSpotifyClientId = async () => {
    await setSpotifyClientId(spotifyClientId);
    setSpotifyClientIdSaved(true);
    setTimeout(() => setSpotifyClientIdSaved(false), 2500);
  };

  const deconnecterSpotifyDepuisParams = () => {
    Alert.alert('Déconnecter Spotify', 'Tu pourras te reconnecter à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => { await deconnecterSpotify(); setSpotifyConnecte(false); } },
    ]);
  };

  const apparierHue = async () => {
    if (!hueBridgeIp.trim()) {
      setHueMessage('⚠️ Renseigne d\'abord l\'adresse IP du bridge.');
      return;
    }
    setHueAppairage(true);
    setHueMessage(null);
    const { succes, erreur } = await apparierAvecBridge(hueBridgeIp.trim());
    setHueAppairage(false);
    if (succes) {
      setHueConnecte(true);
      setHueMessage('✅ Appariement réussi !');
    } else {
      setHueMessage(`⚠️ ${erreur}`);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      "⚠️ Réinitialiser l'application",
      'Toutes tes données (profil, agenda, courses, notes, clés API, conversations Kira, alarmes et notifications...) seront définitivement effacées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: async () => { await annulerToutesLesNotifications(); await resetAllData(); Alert.alert('✅ Application réinitialisée', "Redémarre l'application pour appliquer les changements."); } },
      ]
    );
  };

  // ── Configuration des notifications Kira : clé, titre, corps, heure par défaut ──
  const NOTIFS_KIRA = [
    { key: 'nResume', label: 'Résumé matinal de Kira', titre: '🌟 Bonjour !', corps: 'Ton résumé du jour est prêt — découvre ton planning, la météo et tes objectifs.', heureDefaut: '07:00' },
    { key: 'nGuitare', label: 'Rappel guitare & chant', titre: '🎸 C\'est l\'heure de jouer !', corps: 'Ta session guitare & chant t\'attend. Quelques minutes suffisent pour progresser.', heureDefaut: '17:00' },
    { key: 'nEau', label: 'Rappel hydratation', titre: '💧 Pense à boire !', corps: 'Un petit rappel de Kira pour rester bien hydraté(e).', heureDefaut: '15:00' },
    { key: 'nMed', label: 'Rappel méditation', titre: '🧘 Moment pour toi', corps: 'Quelques minutes de méditation pour relâcher la pression.', heureDefaut: '20:00' },
    { key: 'nCoach', label: 'Check-in bien-être (soir)', titre: '🌙 Comment s\'est passée ta journée ?', corps: 'Kira est là pour faire le point avec toi avant la nuit.', heureDefaut: '21:30' },
  ];

  const demanderPermissionNotifSiBesoin = async () => {
    if (permissionNotifOk) return true;
    const accordee = await demanderPermissionNotifications();
    setPermissionNotifOk(accordee);
    if (!accordee) {
      Alert.alert('Permission refusée', "Sans autorisation, ces rappels seront enregistrés mais ne sonneront pas réellement. Active-la depuis les réglages Android de l'application si tu changes d'avis.");
    }
    return accordee;
  };

  const toggleNotifKira = async (notifConfig, activerMaintenant) => {
    await updatePref(notifConfig.key, activerMaintenant);
    if (!activerMaintenant) {
      await annulerParCle(notifConfig.key);
      return;
    }
    const ok = await demanderPermissionNotifSiBesoin();
    if (!ok) return;
    const heureStr = prefs[`${notifConfig.key}_heure`] || notifConfig.heureDefaut;
    const [h, m] = heureStr.split(':').map(Number);
    await reprogrammerQuotidienne(notifConfig.key, notifConfig.titre, notifConfig.corps, h, m);
  };

  const changerHeureNotifKira = async (notifConfig, nouvelleHeure) => {
    await updatePref(`${notifConfig.key}_heure`, nouvelleHeure);
    if (prefs[notifConfig.key] === false) return; // notification désactivée, pas besoin de reprogrammer
    const ok = await verifierPermissionNotifications();
    if (!ok) return;
    const [h, m] = nouvelleHeure.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      await reprogrammerQuotidienne(notifConfig.key, notifConfig.titre, notifConfig.corps, h, m);
    }
  };

  const PROFIL_FIELDS = [
    ['Prénom', 'prenom', 'Votre prénom'], ['Nom', 'nom', 'Votre nom de famille'],
    ['Email', 'email', 'votremail@exemple.com'], ['Ville', 'ville', 'Votre ville (pour la météo)'],
    ['Date de naissance', 'naissance', 'JJ/MM/AAAA'], ['Niveau guitare', 'guitareNiv', 'Débutant / Intermédiaire / Avancé'],
    ['Niveau chant', 'chantNiv', 'Débutant / Intermédiaire'], ['Style musical', 'style', 'Rock, Blues, Pop...'],
    ['Objectif calorique (kcal)', 'calObj', '2200'], ['Objectif sommeil (h)', 'sleepObj', '8'],
    ['Objectif pas / jour', 'pasObj', '10000'],
  ];

  const renderSection = () => {
    if (section === 'profil') {
      return (
        <View>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarBig, { backgroundColor: accent + '22', borderColor: accent }]}>
              <Text style={{ fontSize: 34 }}>🎸</Text>
            </View>
            <Text style={styles.profileName}>{profil.prenom || profil.nom || 'Mon Profil'}</Text>
            <Text style={styles.profileSub}>{profil.ville || ''}</Text>
          </View>
          {PROFIL_FIELDS.map(([label, key, placeholder]) => (
            <View key={key} style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#555566"
                value={String(profil[key] || '')}
                onChangeText={t => setProfil({ ...profil, [key]: t })}
                keyboardType={['calObj', 'sleepObj', 'pasObj'].includes(key) ? 'numeric' : 'default'}
              />
            </View>
          ))}
          <Text style={styles.infoSmall}>
            💡 Renseigne ta ville pour que le module Météo affiche les conditions réelles de chez toi.
          </Text>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveProfil}>
            <Text style={styles.saveBtnText}>💾 Enregistrer le profil</Text>
          </TouchableOpacity>
          {saved && <Text style={styles.savedText}>✅ Profil enregistré !</Text>}
        </View>
      );
    }

    if (section === 'apparence') {
      return (
        <View>
          <SectionLabel>Thème</SectionLabel>
          <View style={styles.themeRow}>
            {Object.entries(THEMES).map(([key, th]) => (
              <TouchableOpacity
                key={key}
                style={[styles.themeChip, { borderColor: (prefs.theme || 'cosmos') === key ? th.accent : 'rgba(255,255,255,0.1)', backgroundColor: (prefs.theme || 'cosmos') === key ? th.accent + '22' : 'rgba(255,255,255,0.04)' }]}
                onPress={() => updatePref('theme', key)}
              >
                <View style={[styles.themeDot, { backgroundColor: th.accent }]} />
                <Text style={{ fontSize: 12, color: '#fff' }}>{th.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <SectionLabel style={{ marginTop: 18 }}>Couleur d'accent</SectionLabel>
          <View style={styles.colorRow}>
            {COULEURS_ACCENT.map(c => (
              <TouchableOpacity key={c} onPress={() => updatePref('accent', c)} style={[styles.colorDot, { backgroundColor: c, borderWidth: accent === c ? 3 : 0 }]} />
            ))}
          </View>
          <SectionLabel style={{ marginTop: 18 }}>Options visuelles</SectionLabel>
          {[['Animations météo (pluie, givre...)', 'weatherFx'], ['Anneaux de stats rapides', 'quickStats'], ['Dicton du jour', 'dicton']].map(([label, key]) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{label}</Text>
              <Toggle value={prefs[key] !== false} onChange={v => updatePref(key, v)} color={accent} />
            </View>
          ))}
        </View>
      );
    }

    if (section === 'modules') {
      return (
        <View>
          <Text style={styles.infoSmall}>Active ou désactive les modules visibles sur ton accueil.</Text>
          {TOUS_MODULES.map(m => {
            const on = modulesActifs.includes(m.id);
            return (
              <View key={m.id} style={[styles.moduleRow, { opacity: on ? 1 : 0.5 }]}>
                <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                <Text style={styles.moduleLabel}>{m.label}</Text>
                <Toggle value={on} onChange={() => toggleModule(m.id)} color={accent} />
              </View>
            );
          })}

          <SectionLabel style={{ marginTop: 22 }}>✨ Mes modules personnalisés</SectionLabel>
          {modulesPersonnalises.length === 0 ? (
            <Text style={styles.infoSmall}>
              Tu n'as encore créé aucun module personnalisé. Crée le tien ci-dessous : une
              liste avec tes propres champs, comme Courses ou Notes, mais pour ce que tu veux
              (matériel de pêche, suivi d'entretien voiture, collection...).
            </Text>
          ) : (
            modulesPersonnalises.map(m => (
              <View key={m.id} style={[styles.moduleRow, { borderColor: m.color + '33', borderWidth: 1 }]}>
                <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                <Text style={styles.moduleLabel}>{m.nom}</Text>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]}
                  onPress={() => navigation.navigate('CreerModule', { moduleId: m.id })}
                >
                  <Text style={[styles.smallBtnText, { color: accent }]}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallBtnDanger}
                  onPress={() => {
                    Alert.alert(
                      '⚠️ Supprimer ce module',
                      `"${m.nom}" et toutes ses données seront définitivement supprimés.`,
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Supprimer', style: 'destructive',
                          onPress: async () => { await supprimerCustomModule(m.id); chargerModulesPersonnalises(); },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.smallBtnDangerText}>Suppr.</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <TouchableOpacity style={[styles.createModuleBtn, { borderColor: accent + '40' }]} onPress={() => navigation.navigate('CreerModule')}>
            <Text style={{ color: accent, fontWeight: '600', fontSize: 13 }}>✨ Créer un module personnalisé</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── NOUVELLE SECTION : clés API ──
    if (section === 'api') {
      return (
        <View>
          <View style={[styles.securityBox, { borderColor: accent + '20', backgroundColor: accent + '10' }]}>
            <Text style={styles.securityTitle}>🔐 Tes clés restent sur ton téléphone</Text>
            <Text style={styles.securityText}>
              Chaque clé est envoyée uniquement au fournisseur correspondant quand Kira ou la
              météo en ont besoin. Rien n'est partagé ailleurs.
            </Text>
          </View>

          {/* ── Météo (fournisseur unique, clé simple) ── */}
          <SectionLabel style={{ marginTop: 18 }}>⛅ Météo en direct</SectionLabel>
          <View style={[styles.providerCard, { borderColor: apiKeys.openweathermap ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
            <View style={styles.providerHeader}>
              <Text style={{ fontSize: 20 }}>{WEATHER_PROVIDER.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{WEATHER_PROVIDER.nom}</Text>
                <Text style={styles.providerDesc}>{WEATHER_PROVIDER.description}</Text>
              </View>
              {apiKeys.openweathermap && <Text style={styles.connectedTag}>✓ Configuré</Text>}
            </View>
            {editingKey === 'openweathermap' ? (
              <View style={styles.editKeyBox}>
                <TextInput style={styles.keyInput} placeholder="Colle ta clé API ici..." placeholderTextColor="#555566" value={tempKeyValue} onChangeText={setTempKeyValue} autoCapitalize="none" autoCorrect={false} secureTextEntry />
                <View style={styles.editKeyActions}>
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={() => sauverCle('openweathermap')}><Text style={styles.smallBtnTextDark}>Enregistrer</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditingKey(null)}><Text style={styles.smallBtnText}>Annuler</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.providerActions}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]} onPress={() => commencerEdition('openweathermap')}>
                  <Text style={[styles.smallBtnText, { color: accent }]}>{apiKeys.openweathermap ? 'Modifier la clé' : '+ Ajouter ma clé'}</Text>
                </TouchableOpacity>
                {apiKeys.openweathermap && <TouchableOpacity style={styles.smallBtnDanger} onPress={() => supprimerCle('openweathermap')}><Text style={styles.smallBtnDangerText}>Supprimer</Text></TouchableOpacity>}
              </View>
            )}
            {keySaved === 'openweathermap' && <Text style={styles.savedKeyText}>✅ Clé enregistrée !</Text>}
            <TouchableOpacity onPress={() => ouvrirLien(WEATHER_PROVIDER.lienCreationCle)}>
              <Text style={[styles.lienCreation, { color: accent }]}>🔗 Créer une clé gratuite sur {WEATHER_PROVIDER.nom} →</Text>
            </TouchableOpacity>
          </View>

          {/* ── Traduction : PLUSIEURS fournisseurs possibles, un seul ACTIF à la fois ── */}
          <SectionLabel style={{ marginTop: 18 }}>🌍 Traduction — choisis ton fournisseur actif</SectionLabel>
          <Text style={styles.infoSmall}>
            LibreTranslate et MyMemory ne demandent aucune clé. DeepL demande une clé mais
            traduit plus naturellement.
          </Text>
          {TRADUCTION_PROVIDERS.map(provider => {
            const aUneCle = !provider.necessiteCle || !!apiKeys[provider.id];
            const estActif = traductionProviderActif === provider.id;
            return (
              <View key={provider.id} style={[styles.providerCard, { borderColor: estActif ? accent + '50' : aUneCle ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
                <View style={styles.providerHeader}>
                  <Text style={{ fontSize: 20 }}>{provider.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{provider.nom}{!provider.necessiteCle ? ' · Sans clé' : ''}</Text>
                    <Text style={styles.providerDesc}>{provider.description}</Text>
                  </View>
                </View>
                {provider.necessiteCle && (
                  editingKey === provider.id ? (
                    <View style={styles.editKeyBox}>
                      <TextInput style={styles.keyInput} placeholder="Colle ta clé API ici..." placeholderTextColor="#555566" value={tempKeyValue} onChangeText={setTempKeyValue} autoCapitalize="none" autoCorrect={false} secureTextEntry />
                      <View style={styles.editKeyActions}>
                        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={() => sauverCle(provider.id)}><Text style={styles.smallBtnTextDark}>Enregistrer</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditingKey(null)}><Text style={styles.smallBtnText}>Annuler</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.providerActions}>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]} onPress={() => commencerEdition(provider.id)}>
                        <Text style={[styles.smallBtnText, { color: accent }]}>{apiKeys[provider.id] ? 'Modifier' : '+ Ajouter ma clé'}</Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
                <View style={styles.providerActions}>
                  <TouchableOpacity
                    style={[styles.smallBtn, estActif ? { backgroundColor: accent } : { backgroundColor: 'rgba(255,255,255,0.08)' }, !aUneCle && { opacity: 0.4 }]}
                    onPress={() => aUneCle && choisirTraductionProvider(provider.id)}
                    disabled={!aUneCle}
                  >
                    <Text style={estActif ? styles.smallBtnTextDark : styles.smallBtnText}>{estActif ? '🌟 Actif' : 'Utiliser ce fournisseur'}</Text>
                  </TouchableOpacity>
                </View>
                {keySaved === provider.id && <Text style={styles.savedKeyText}>✅ Clé enregistrée !</Text>}
                {provider.necessiteCle && (
                  <TouchableOpacity onPress={() => ouvrirLien(provider.lienCreationCle)}>
                    <Text style={[styles.lienCreation, { color: accent }]}>🔗 Créer une clé sur {provider.nom} →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* ── Actualités : PLUSIEURS fournisseurs activables EN MÊME TEMPS (combinés) ── */}
          <SectionLabel style={{ marginTop: 18 }}>📰 Actualités — active un ou plusieurs fournisseurs</SectionLabel>
          <Text style={styles.infoSmall}>
            Active NewsAPI et GNews ensemble pour combiner leurs résultats et avoir plus d'articles.
          </Text>
          {ACTUALITES_PROVIDERS.map(provider => {
            const aUneCle = !!apiKeys[provider.id];
            const estActif = actualitesProvidersActifs.includes(provider.id);
            return (
              <View key={provider.id} style={[styles.providerCard, { borderColor: estActif && aUneCle ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
                <View style={styles.providerHeader}>
                  <Text style={{ fontSize: 20 }}>{provider.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{provider.nom}</Text>
                    <Text style={styles.providerDesc}>{provider.description}</Text>
                  </View>
                  <Toggle value={estActif} onChange={() => toggleActualitesProvider(provider.id)} color={accent} />
                </View>
                {editingKey === provider.id ? (
                  <View style={styles.editKeyBox}>
                    <TextInput style={styles.keyInput} placeholder="Colle ta clé API ici..." placeholderTextColor="#555566" value={tempKeyValue} onChangeText={setTempKeyValue} autoCapitalize="none" autoCorrect={false} secureTextEntry />
                    <View style={styles.editKeyActions}>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={() => sauverCle(provider.id)}><Text style={styles.smallBtnTextDark}>Enregistrer</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditingKey(null)}><Text style={styles.smallBtnText}>Annuler</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.providerActions}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]} onPress={() => commencerEdition(provider.id)}>
                      <Text style={[styles.smallBtnText, { color: accent }]}>{aUneCle ? 'Modifier la clé' : '+ Ajouter ma clé'}</Text>
                    </TouchableOpacity>
                    {aUneCle && <TouchableOpacity style={styles.smallBtnDanger} onPress={() => supprimerCle(provider.id)}><Text style={styles.smallBtnDangerText}>Supprimer</Text></TouchableOpacity>}
                  </View>
                )}
                {keySaved === provider.id && <Text style={styles.savedKeyText}>✅ Clé enregistrée !</Text>}
                <TouchableOpacity onPress={() => ouvrirLien(provider.lienCreationCle)}>
                  <Text style={[styles.lienCreation, { color: accent }]}>🔗 Créer une clé gratuite sur {provider.nom} →</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* ── Google Agenda (OAuth — configuration différente des autres) ── */}
          <SectionLabel style={{ marginTop: 18 }}>📅 Google Agenda</SectionLabel>
          <View style={[styles.providerCard, { borderColor: googleClientId ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
            <View style={styles.providerHeader}>
              <Text style={{ fontSize: 20 }}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>Google Calendar API</Text>
                <Text style={styles.providerDesc}>
                  Nécessite un "Client ID" créé sur Google Cloud Console (pas une simple clé —
                  voir le guide d'installation pour la procédure complète).
                </Text>
              </View>
              {googleConnecte && <Text style={styles.connectedTag}>✓ Connecté</Text>}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Client ID Android</Text>
            <TextInput
              style={styles.keyInput}
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              placeholderTextColor="#555566"
              value={googleClientId}
              onChangeText={setGoogleClientIdState}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.providerActions}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={sauverGoogleClientId}>
                <Text style={styles.smallBtnTextDark}>Enregistrer</Text>
              </TouchableOpacity>
              {googleConnecte && (
                <TouchableOpacity style={styles.smallBtnDanger} onPress={deconnecterGoogleDepuisParams}>
                  <Text style={styles.smallBtnDangerText}>Déconnecter le compte</Text>
                </TouchableOpacity>
              )}
            </View>
            {googleClientIdSaved && <Text style={styles.savedKeyText}>✅ Client ID enregistré !</Text>}

            <Text style={styles.infoSmall}>
              💡 Une fois le Client ID enregistré ici, connecte ton compte directement depuis
              le module Agenda (bouton "Connecter →" en haut de l'écran).
            </Text>

            <TouchableOpacity onPress={() => ouvrirLien('https://console.cloud.google.com/')}>
              <Text style={[styles.lienCreation, { color: accent }]}>🔗 Ouvrir Google Cloud Console →</Text>
            </TouchableOpacity>
          </View>

          {/* ── Spotify (OAuth — même logique que Google Agenda) ── */}
          <SectionLabel style={{ marginTop: 18 }}>🎵 Spotify</SectionLabel>
          <View style={[styles.providerCard, { borderColor: spotifyClientId ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
            <View style={styles.providerHeader}>
              <Text style={{ fontSize: 20 }}>🎵</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>Spotify Web API</Text>
                <Text style={styles.providerDesc}>
                  Nécessite un "Client ID" créé sur le Spotify Developer Dashboard (voir le
                  guide d'installation pour la procédure complète).
                </Text>
              </View>
              {spotifyConnecte && <Text style={styles.connectedTag}>✓ Connecté</Text>}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Client ID</Text>
            <TextInput
              style={styles.keyInput}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor="#555566"
              value={spotifyClientId}
              onChangeText={setSpotifyClientIdState}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.providerActions}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={sauverSpotifyClientId}>
                <Text style={styles.smallBtnTextDark}>Enregistrer</Text>
              </TouchableOpacity>
              {spotifyConnecte && (
                <TouchableOpacity style={styles.smallBtnDanger} onPress={deconnecterSpotifyDepuisParams}>
                  <Text style={styles.smallBtnDangerText}>Déconnecter le compte</Text>
                </TouchableOpacity>
              )}
            </View>
            {spotifyClientIdSaved && <Text style={styles.savedKeyText}>✅ Client ID enregistré !</Text>}

            <Text style={styles.infoSmall}>
              💡 Une fois le Client ID enregistré ici, connecte ton compte directement depuis
              le module Musique (bouton "Connecter →" en haut de l'écran). Le contrôle de
              lecture à distance nécessite un compte Spotify Premium ; la recherche et les
              playlists fonctionnent avec tout compte.
            </Text>

            <TouchableOpacity onPress={() => ouvrirLien('https://developer.spotify.com/dashboard')}>
              <Text style={[styles.lienCreation, { color: accent }]}>🔗 Ouvrir le Spotify Developer Dashboard →</Text>
            </TouchableOpacity>
          </View>

          {/* ── Resend (envoi d'email — clé simple comme météo/traduction/actu) ── */}
          <SectionLabel style={{ marginTop: 18 }}>📧 Envoi d'email (PDF)</SectionLabel>
          <View style={[styles.providerCard, { borderColor: apiKeys.resend ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
            <View style={styles.providerHeader}>
              <Text style={{ fontSize: 20 }}>📧</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>Resend</Text>
                <Text style={styles.providerDesc}>
                  Gratuit jusqu'à 100 emails/jour. Permet à Kira de t'envoyer tes bilans
                  santé et suivis guitare en PDF par email.
                </Text>
              </View>
              {apiKeys.resend && <Text style={styles.connectedTag}>✓ Configuré</Text>}
            </View>

            {editingKey === 'resend' ? (
              <View style={styles.editKeyBox}>
                <TextInput style={styles.keyInput} placeholder="Colle ta clé API ici (re_xxxxx...)" placeholderTextColor="#555566" value={tempKeyValue} onChangeText={setTempKeyValue} autoCapitalize="none" autoCorrect={false} secureTextEntry />
                <View style={styles.editKeyActions}>
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={() => sauverCle('resend')}><Text style={styles.smallBtnTextDark}>Enregistrer</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditingKey(null)}><Text style={styles.smallBtnText}>Annuler</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.providerActions}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]} onPress={() => commencerEdition('resend')}>
                  <Text style={[styles.smallBtnText, { color: accent }]}>{apiKeys.resend ? 'Modifier la clé' : '+ Ajouter ma clé'}</Text>
                </TouchableOpacity>
                {apiKeys.resend && <TouchableOpacity style={styles.smallBtnDanger} onPress={() => supprimerCle('resend')}><Text style={styles.smallBtnDangerText}>Supprimer</Text></TouchableOpacity>}
              </View>
            )}
            {keySaved === 'resend' && <Text style={styles.savedKeyText}>✅ Clé enregistrée !</Text>}

            <Text style={styles.infoSmall}>
              💡 Renseigne aussi ton email dans Paramètres → Profil — c'est l'adresse à
              laquelle Kira enverra tes documents.
            </Text>

            <TouchableOpacity onPress={() => ouvrirLien('https://resend.com/signup')}>
              <Text style={[styles.lienCreation, { color: accent }]}>🔗 Créer une clé gratuite sur Resend →</Text>
            </TouchableOpacity>
          </View>

          {/* ── Philips Hue (appariement local, différent d'une clé API classique) ── */}
          <SectionLabel style={{ marginTop: 18 }}>💡 Philips Hue (Domotique)</SectionLabel>
          <View style={[styles.providerCard, { borderColor: hueConnecte ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
            <View style={styles.providerHeader}>
              <Text style={{ fontSize: 20 }}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>Philips Hue (Bridge local)</Text>
                <Text style={styles.providerDesc}>
                  Nécessite un Bridge Hue connecté à ton réseau Wi-Fi. Appariement en
                  appuyant sur le bouton physique du bridge — voir le guide d'installation.
                </Text>
              </View>
              {hueConnecte && <Text style={styles.connectedTag}>✓ Apparié</Text>}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Adresse IP du Bridge</Text>
            <TextInput
              style={styles.keyInput}
              placeholder="192.168.1.XX"
              placeholderTextColor="#555566"
              value={hueBridgeIp}
              onChangeText={setHueBridgeIpState}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numeric"
            />
            <View style={styles.providerActions}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: accent }, hueAppairage && { opacity: 0.6 }]}
                onPress={apparierHue}
                disabled={hueAppairage}
              >
                {hueAppairage
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.smallBtnTextDark}>{hueConnecte ? 'Réapparier' : 'Appuie sur le bouton du bridge, puis clique ici'}</Text>}
              </TouchableOpacity>
            </View>
            {hueMessage && <Text style={[styles.savedKeyText, hueMessage.startsWith('⚠️') && { color: PALETTE.pink }]}>{hueMessage}</Text>}

            <Text style={styles.infoSmall}>
              💡 Trouve l'adresse IP de ton bridge via l'app officielle Philips Hue
              (Réglages → Bridge Hue), ou via https://discovery.meethue.com/ depuis un
              navigateur connecté au même Wi-Fi.
            </Text>
          </View>

          {/* IA pour Kira */}
          <SectionLabel style={{ marginTop: 22 }}>🌟 Cerveau de Kira (IA)</SectionLabel>
          <Text style={styles.infoSmall}>
            Configure une ou plusieurs clés, puis choisis ton fournisseur préféré. Sans clé
            configurée, Kira répond avec des messages pré-écrits intelligents (mode hors-ligne).
          </Text>

          {AI_PROVIDERS.map(provider => {
            const aUneCle = !!apiKeys[provider.id];
            const estActif = providerActif === provider.id;
            return (
              <View key={provider.id} style={[styles.providerCard, { borderColor: estActif ? accent + '50' : aUneCle ? PALETTE.green + '35' : 'rgba(255,255,255,0.07)' }]}>
                <View style={styles.providerHeader}>
                  <Text style={{ fontSize: 20 }}>{provider.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.providerNameRow}>
                      <Text style={styles.providerName}>{provider.nom}</Text>
                      {provider.gratuit && <Text style={styles.gratuitTag}>GRATUIT</Text>}
                    </View>
                    <Text style={styles.providerDesc}>{provider.description}</Text>
                  </View>
                  {aUneCle && <Text style={styles.connectedTag}>✓</Text>}
                </View>

                {editingKey === provider.id ? (
                  <View style={styles.editKeyBox}>
                    <TextInput
                      style={styles.keyInput}
                      placeholder="Colle ta clé API ici..."
                      placeholderTextColor="#555566"
                      value={tempKeyValue}
                      onChangeText={setTempKeyValue}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                    <View style={styles.editKeyActions}>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent }]} onPress={() => sauverCle(provider.id)}>
                        <Text style={styles.smallBtnTextDark}>Enregistrer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditingKey(null)}>
                        <Text style={styles.smallBtnText}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.providerActions}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: accent + '20', borderColor: accent + '40', borderWidth: 1 }]} onPress={() => commencerEdition(provider.id)}>
                      <Text style={[styles.smallBtnText, { color: accent }]}>{aUneCle ? 'Modifier' : '+ Ajouter ma clé'}</Text>
                    </TouchableOpacity>
                    {aUneCle && !estActif && (
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: PALETTE.green + '20', borderColor: PALETTE.green + '40', borderWidth: 1 }]} onPress={() => choisirProviderActif(provider.id)}>
                        <Text style={[styles.smallBtnText, { color: PALETTE.green }]}>Utiliser pour Kira</Text>
                      </TouchableOpacity>
                    )}
                    {estActif && (
                      <View style={[styles.activeTag]}>
                        <Text style={styles.activeTagText}>🌟 Actif pour Kira</Text>
                      </View>
                    )}
                    {aUneCle && (
                      <TouchableOpacity style={styles.smallBtnDanger} onPress={() => supprimerCle(provider.id)}>
                        <Text style={styles.smallBtnDangerText}>Supprimer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {keySaved === provider.id && <Text style={styles.savedKeyText}>✅ Clé enregistrée !</Text>}

                <TouchableOpacity onPress={() => ouvrirLien(provider.lienCreationCle)}>
                  <Text style={[styles.lienCreation, { color: accent }]}>
                    🔗 Créer une clé {provider.gratuit ? 'gratuite' : ''} sur {provider.nom} →
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.comingSoon}>
            💡 Astuce : Gemini et Mistral sont les plus simples pour démarrer gratuitement, sans
            carte bancaire. Tu peux configurer plusieurs fournisseurs et changer celui qui est
            actif pour Kira à tout moment.
          </Text>
        </View>
      );
    }

    if (section === 'kira') {
      return (
        <View>
          <View style={[styles.kiraHeader, { backgroundColor: accent + '10', borderColor: accent + '20' }]}>
            <KiraIcon size={64} color={accent} iconId={kiraIconActive} />
            <Text style={styles.kiraTitle}>Kira — Coach IA</Text>
            <Text style={styles.kiraSubtitle}>
              {providerActif ? `Connectée via ${AI_PROVIDERS.find(p => p.id === providerActif)?.nom}` : 'Mode hors-ligne'}
            </Text>
          </View>

          <SectionLabel style={{ marginTop: 18 }}>Icône de Kira</SectionLabel>
          <Text style={styles.infoSmall}>Choisis l'icône qui représente Kira partout dans l'app (bouton flottant, headers, chat).</Text>
          <View style={styles.iconsGrid}>
            {KIRA_ICONS.map(icon => (
              <TouchableOpacity
                key={icon.id}
                style={[styles.iconOption, { borderColor: kiraIconActive === icon.id ? accent : 'rgba(255,255,255,0.08)', backgroundColor: kiraIconActive === icon.id ? accent + '15' : 'rgba(255,255,255,0.03)' }]}
                onPress={() => choisirKiraIcon(icon.id)}
              >
                <KiraIcon size={44} color={accent} iconId={icon.id} emojiSize={20} />
                <Text style={[styles.iconOptionLabel, { color: kiraIconActive === icon.id ? '#fff' : '#888899' }]}>{icon.nom}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionLabel style={{ marginTop: 18 }}>Comportement</SectionLabel>
          {[['Mode proactif (suggestions automatiques)', 'proactif'], ['Voix de Kira (synthèse vocale)', 'voix'], ['Écoute du nom "Kira" (mains libres)', 'micro']].map(([label, key]) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{label}</Text>
              <Toggle value={prefs[key] !== false} onChange={v => updatePref(key, v)} color={accent} />
            </View>
          ))}
          {prefs.micro !== false && (
            <Text style={styles.infoSmall}>
              🚧 L'écoute vocale permanente nécessite un module natif spécifique — ce sera l'un
              des derniers lots techniques.
            </Text>
          )}
          <TouchableOpacity style={[styles.linkToApi, { borderColor: accent + '30' }]} onPress={() => setSection('api')}>
            <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>🔑 Configurer les clés API de Kira →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (section === 'notifs') {
      return (
        <View>
          {!permissionNotifOk && (
            <TouchableOpacity style={styles.permissionBanner} onPress={demanderPermissionNotifSiBesoin}>
              <Text style={styles.permissionBannerText}>
                ⚠️ Notifications désactivées sur ce téléphone — active-les pour que les rappels de Kira sonnent réellement. Appuie ici pour autoriser.
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.infoSmall}>
            Active un rappel et choisis son heure : Kira t'envoie alors une vraie notification, même si l'application est fermée.
          </Text>

          {NOTIFS_KIRA.map(notif => {
            const actif = prefs[notif.key] !== false && prefs[notif.key] !== undefined ? prefs[notif.key] : false;
            // Par défaut tout est désactivé tant que l'utilisateur n'a pas explicitement activé
            // (contrairement aux autres préférences visuelles qui sont activées par défaut) —
            // car on ne veut pas spammer de notifications sans consentement explicite.
            const estActif = prefs[notif.key] === true;
            const heureActuelle = prefs[`${notif.key}_heure`] || notif.heureDefaut;
            return (
              <View key={notif.key} style={[styles.notifCard, { borderColor: estActif ? accent + '30' : 'rgba(255,255,255,0.06)' }]}>
                <View style={styles.notifCardHeader}>
                  <Text style={styles.toggleLabel}>{notif.label}</Text>
                  <Toggle value={estActif} onChange={v => toggleNotifKira(notif, v)} color={accent} />
                </View>
                {estActif && (
                  <View style={styles.heureRow}>
                    <Text style={styles.heureLabel}>Heure :</Text>
                    <TextInput
                      style={styles.heureInput}
                      placeholder="07:00"
                      placeholderTextColor="#555566"
                      value={heureActuelle}
                      onChangeText={t => changerHeureNotifKira(notif, t)}
                    />
                    <Text style={styles.activeRealTag}>🔔 Programmée</Text>
                  </View>
                )}
              </View>
            );
          })}

          {[['Alertes météo', 'nMeteo'], ['Expiration ticket parking', 'nParking'], ['Liste de courses vide', 'nCourses']].map(([label, key]) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{label}</Text>
              <Toggle value={prefs[key] !== false} onChange={v => updatePref(key, v)} color={accent} />
            </View>
          ))}
          <Text style={styles.comingSoon}>
            🚧 Les alertes météo, parking et courses sont déclenchées par événement (pas à heure
            fixe) — leur version réelle arrivera avec les lots correspondants déjà connectés en live.
          </Text>
        </View>
      );
    }

    if (section === 'securite') {
      return (
        <View>
          <View style={[styles.securityBox, { borderColor: accent + '20', backgroundColor: accent + '10' }]}>
            <Text style={styles.securityTitle}>🔒 Vos données restent sur l'appareil</Text>
            <Text style={styles.securityText}>
              • Stockage local : AsyncStorage{'\n'}
              • Clés API stockées localement, jamais partagées sauf avec le fournisseur correspondant{'\n'}
              • Conformité avec ton exigence : rien sur Internet sauf les appels directs que tu as configurés toi-même
            </Text>
          </View>
          <SectionLabel style={{ marginTop: 18 }}>Gestion des données</SectionLabel>
          <TouchableOpacity style={styles.dangerBtn}><Text style={styles.dangerBtnText}>💾 Exporter mes données (JSON)</Text></TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn}><Text style={styles.dangerBtnText}>📥 Importer une sauvegarde</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: 'rgba(255,101,132,0.12)', borderColor: 'rgba(255,101,132,0.3)' }]} onPress={confirmReset}>
            <Text style={[styles.dangerBtnText, { color: PALETTE.pink }]}>⚠️ Réinitialiser l'application</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>⚙️ Paramètres</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow} style={styles.tabsScroll}>
        {SECTIONS.map(s => (
          <TouchableOpacity key={s.id} style={[styles.tabChip, { backgroundColor: section === s.id ? accent : 'rgba(255,255,255,0.06)' }]} onPress={() => setSection(s.id)}>
            <Text style={{ fontSize: 11, color: section === s.id ? '#000' : '#888899', fontWeight: section === s.id ? '700' : '400' }}>{s.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.contenuScroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>{renderSection()}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  // CORRECTIF : la barre d'onglets horizontale ne doit JAMAIS s'étirer —
  // flexGrow: 0 fige sa hauteur à son contenu naturel, pour qu'elle ne vole
  // pas d'espace à la zone de contenu en dessous.
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  // CORRECTIF : sans flex: 1 explicite ici, cette ScrollView (qui affiche
  // tout le contenu de chaque section : Profil, Apparence, API...) pouvait
  // se retrouver comprimée à une hauteur quasi nulle par le View racine en
  // flex: 1 — c'était la cause du bug "on ne voit que la partie supérieure".
  contenuScroll: { flex: 1 },
  tabChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  profileHeader: { alignItems: 'center', paddingVertical: 16 },
  avatarBig: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  profileSub: { fontSize: 11, color: '#666677', marginTop: 2 },
  fieldLabel: { fontSize: 10, fontWeight: '600', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 13, padding: 10 },
  infoSmall: { fontSize: 11, color: '#444455', lineHeight: 17, marginBottom: 12, marginTop: 4 },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  savedText: { textAlign: 'center', color: PALETTE.green, fontSize: 12, marginTop: 10 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11, borderWidth: 2 },
  themeDot: { width: 11, height: 11, borderRadius: 6 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderColor: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  toggleLabel: { fontSize: 13, color: '#ccc' },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: 11, marginBottom: 6 },
  createModuleBtn: { padding: 13, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 14 },
  moduleLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#fff' },
  comingSoon: { fontSize: 11, color: '#333344', textAlign: 'center', marginTop: 14, lineHeight: 16 },
  kiraHeader: { alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1 },
  kiraAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kiraTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  kiraSubtitle: { fontSize: 11, color: '#666677', marginTop: 3 },
  linkToApi: { marginTop: 18, padding: 12, borderRadius: 11, borderWidth: 1, alignItems: 'center' },
  securityBox: { borderRadius: 14, padding: 14, borderWidth: 1 },
  securityTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 8 },
  securityText: { fontSize: 12, color: '#aaa', lineHeight: 19 },
  dangerBtn: { padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  dangerBtnText: { color: '#ccc', fontSize: 12 },
  // ── Styles section API ──
  providerCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 13, marginBottom: 12, borderWidth: 1 },
  providerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  providerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  providerDesc: { fontSize: 11, color: '#666677', marginTop: 2, lineHeight: 15 },
  gratuitTag: { fontSize: 8, color: PALETTE.green, backgroundColor: PALETTE.green + '20', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, fontWeight: '700' },
  connectedTag: { fontSize: 11, color: PALETTE.green, fontWeight: '700' },
  providerActions: { flexDirection: 'row', gap: 7, marginTop: 8, flexWrap: 'wrap' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  smallBtnText: { fontSize: 11, color: '#aaa', fontWeight: '600' },
  smallBtnTextDark: { fontSize: 11, color: '#000', fontWeight: '700' },
  smallBtnDanger: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,101,132,0.12)' },
  smallBtnDangerText: { fontSize: 11, color: PALETTE.pink, fontWeight: '600' },
  activeTag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(108,99,255,0.15)' },
  activeTagText: { fontSize: 11, color: PALETTE.violet, fontWeight: '700' },
  editKeyBox: { marginTop: 8 },
  keyInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 12, padding: 10, marginBottom: 8 },
  editKeyActions: { flexDirection: 'row', gap: 7 },
  savedKeyText: { fontSize: 11, color: PALETTE.green, marginTop: 6, fontWeight: '600' },
  lienCreation: { fontSize: 11, fontWeight: '600', marginTop: 9 },
  iconsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconOption: { width: '30%', alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 2, gap: 6 },
  iconOptionLabel: { fontSize: 10, textAlign: 'center' },
  // ── Styles section notifications ──
  permissionBanner: { backgroundColor: 'rgba(255,101,132,0.12)', borderRadius: 12, padding: 12, marginBottom: 14 },
  permissionBannerText: { fontSize: 11, color: PALETTE.pink, lineHeight: 16 },
  notifCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  notifCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  heureLabel: { fontSize: 11, color: '#888899' },
  heureInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, width: 70 },
  activeRealTag: { fontSize: 10, color: PALETTE.green, marginLeft: 'auto' },
});
