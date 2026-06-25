// ═══════════════════════════════════════════
//  CUSTOMMODULES.JS — Modules personnalisés (lot 31)
//  NOUVEAU : comble le manque du cahier des charges
//  section 4 ("on devra aussi pouvoir créer de
//  nouveaux modules entièrement personnalisables
//  et connectés avec Kira").
//
//  PRINCIPE : un module personnalisé n'est PAS du
//  code — c'est une DONNÉE (une "définition") que
//  l'utilisateur remplit via un formulaire dans
//  l'app. Un seul écran générique
//  (ModulePersonnaliseScreen.js) sait afficher et
//  faire fonctionner N'IMPORTE QUELLE définition,
//  en lisant sa structure au moment de l'affichage.
//
//  C'est ce qui permet de créer un nouveau module
//  SANS recompiler l'application — exactement ce
//  qu'un utilisateur final doit pouvoir faire seul.
//
//  Structure d'une définition de module personnalisé :
//  {
//    id: string unique (ex: "custom_1719234567890"),
//    nom: string (ex: "Matériel de pêche"),
//    icon: string emoji (ex: "🎣"),
//    color: string couleur hex (depuis PALETTE),
//    desc: string courte description affichée sous le nom,
//    champs: [
//      { id: "nom", label: "Nom de l'article", type: "texte" },
//      { id: "quantite", label: "Quantité", type: "texte" },
//    ],
//    // "type" possibles : "texte" (champ libre) | "checkbox" (coché/non coché,
//    // un seul champ de ce type par module, c'est l'équivalent du "done" de
//    // Courses/Notes) | "nombre" (clavier numérique)
//    afficherSuggestionsRapides: bool,
//    suggestionsRapides: [string] (utilisé seulement si le champ principal
//      est de type "texte" — reproduit le pattern "+ Lait" de Courses),
//    creeLe: string ISO date,
//  }
//
//  Les VALEURS remplies par l'utilisateur dans un module personnalisé sont
//  stockées séparément, sous la clé "custom_data_<id>", structure :
//  [{ id, [champ1]: valeur, [champ2]: valeur, ..., done: bool }]
//  (le tableau de valeurs suit exactement le même pattern que 'courses' ou
//  'notes' dans storage.js — cohérent avec le reste de l'app)
// ═══════════════════════════════════════════

import { getData, setData, removeData } from './storage';

const CLE_DEFINITIONS = 'custom_modules';

// Types de champs disponibles dans le constructeur de module.
// Volontairement limité à 3 types simples : assez pour couvrir la grande
// majorité des besoins (listes de courses, suivis, collections...) sans
// transformer le constructeur en usine à gaz que l'utilisateur novice
// n'arriverait pas à utiliser seul.
export const TYPES_CHAMPS = [
  { id: 'texte', nom: 'Texte libre', icon: '✏️', exemple: 'Ex: nom, marque, lieu...' },
  { id: 'nombre', nom: 'Nombre', icon: '🔢', exemple: 'Ex: quantité, prix, poids...' },
  { id: 'checkbox', nom: 'Case à cocher', icon: '✅', exemple: 'Pour marquer "fait" / "acheté"...' },
];

/**
 * Récupère toutes les définitions de modules personnalisés créés par
 * l'utilisateur. Retourne toujours un tableau (jamais null), pour que
 * tous les appelants puissent faire .map()/.filter() sans vérification.
 */
export async function getCustomModules() {
  const modules = await getData(CLE_DEFINITIONS);
  return modules || [];
}

/**
 * Récupère une seule définition de module par son id.
 * Retourne null si elle n'existe pas (ex: module supprimé entre-temps).
 */
export async function getCustomModuleParId(id) {
  const modules = await getCustomModules();
  return modules.find(m => m.id === id) || null;
}

/**
 * Crée un nouveau module personnalisé à partir d'une définition.
 * Génère automatiquement un id unique et la date de création.
 * Retourne la définition complète créée (avec son id).
 */
export async function creerCustomModule({ nom, icon, color, desc, champs, afficherSuggestionsRapides, suggestionsRapides }) {
  const modules = await getCustomModules();
  const nouveauModule = {
    id: `custom_${Date.now()}`,
    nom: nom.trim(),
    icon: icon || '⭐',
    color: color || '#6C63FF',
    desc: desc?.trim() || '',
    champs: champs && champs.length > 0 ? champs : [{ id: 'nom', label: 'Nom', type: 'texte' }],
    afficherSuggestionsRapides: !!afficherSuggestionsRapides,
    suggestionsRapides: suggestionsRapides || [],
    creeLe: new Date().toISOString(),
  };
  await setData(CLE_DEFINITIONS, [...modules, nouveauModule]);
  return nouveauModule;
}

/**
 * Met à jour la définition d'un module personnalisé existant (ex: changer
 * son icône, sa couleur, ajouter un champ). Ne touche pas aux données déjà
 * saisies par l'utilisateur (les valeurs restent dans custom_data_<id>) —
 * sauf si des champs ont été retirés, les anciennes valeurs resteront
 * simplement ignorées à l'affichage plutôt que supprimées (pour ne jamais
 * perdre de données par accident).
 */
export async function modifierCustomModule(id, modifications) {
  const modules = await getCustomModules();
  const updated = modules.map(m => (m.id === id ? { ...m, ...modifications } : m));
  await setData(CLE_DEFINITIONS, updated);
  return updated.find(m => m.id === id);
}

/**
 * Supprime entièrement un module personnalisé : sa définition ET toutes
 * les données qu'il contenait. Action irréversible — l'écran appelant
 * doit demander confirmation avant d'appeler cette fonction.
 */
export async function supprimerCustomModule(id) {
  const modules = await getCustomModules();
  await setData(CLE_DEFINITIONS, modules.filter(m => m.id !== id));
  await removeData(`custom_data_${id}`);
  return true;
}

/**
 * Récupère les données (la liste d'éléments) d'un module personnalisé.
 */
export async function getCustomModuleData(id) {
  const data = await getData(`custom_data_${id}`);
  return data || [];
}

/**
 * Sauvegarde la liste complète des éléments d'un module personnalisé.
 */
export async function setCustomModuleData(id, liste) {
  await setData(`custom_data_${id}`, liste);
  return true;
}

/**
 * Convertit une définition de module personnalisé au même format que les
 * entrées de TOUS_MODULES dans HomeScreen.js, pour qu'elles puissent être
 * affichées exactement de la même façon dans la grille de l'accueil.
 * Le "screen" cible est toujours 'ModulePersonnalise', avec l'id du module
 * en paramètre de navigation pour que l'écran générique sache lequel afficher.
 */
export function versEntreeModuleAccueil(definition) {
  return {
    id: definition.id,
    icon: definition.icon,
    label: definition.nom,
    desc: definition.desc || 'Module personnalisé',
    color: definition.color,
    screen: 'ModulePersonnalise',
    params: { moduleId: definition.id },
    estPersonnalise: true,
  };
}
