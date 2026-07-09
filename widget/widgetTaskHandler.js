// ═══════════════════════════════════════════
//  WIDGETTASKHANDLER.JS — Gestionnaire de tâches du widget (lot 41)
//
//  C'est le point d'entrée qu'Android appelle en arrière-plan (app
//  fermée ou ouverte, peu importe) chaque fois qu'il faut :
//  - dessiner le widget la première fois qu'il est ajouté à l'écran
//    d'accueil (WIDGET_ADDED)
//  - le redessiner périodiquement, au minimum toutes les 30 minutes
//    (WIDGET_UPDATE, voir updatePeriodMillis dans app.json)
//  - le redessiner après un redimensionnement par l'utilisateur
//    (WIDGET_RESIZED)
//
//  On ne gère pas WIDGET_CLICK ici car tous les boutons du widget
//  utilisent les actions spéciales "OPEN_APP" / "OPEN_URI" (voir
//  KiraMaxiWidget.js), qui sont gérées nativement par la librairie
//  sans repasser par ce gestionnaire.
// ═══════════════════════════════════════════

import * as React from 'react';

import { getKiraWidgetSnapshot } from '../utils/widgetUpdater';
import { KiraMaxiWidget } from './KiraMaxiWidget';

const NOM_VERS_WIDGET = {
  KiraMaxi: KiraMaxiWidget,
};

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const Widget = NOM_VERS_WIDGET[widgetInfo.widgetName];
  if (!Widget) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getKiraWidgetSnapshot();
      props.renderWidget(<Widget data={data} />);
      break;
    }

    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
