// ═══════════════════════════════════════════
//  PDFGENERATOR.JS — Génération de PDF
//  Utilise expo-print, qui transforme du HTML en
//  PDF nativement (méthode recommandée par Expo —
//  pas besoin de librairie PDF complexe, on écrit
//  juste du HTML/CSS comme pour une page web).
// ═══════════════════════════════════════════

import * as Print from 'expo-print';

// ── Styles CSS partagés pour les deux types de PDF (cohérence visuelle) ──
const STYLE_BASE = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6C63FF; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; color: #6C63FF; }
    .date { font-size: 12px; color: #888; }
    h1 { font-size: 26px; margin-bottom: 4px; color: #1a1a2e; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 28px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 15px; font-weight: 700; color: #6C63FF; margin-bottom: 12px; border-left: 3px solid #6C63FF; padding-left: 10px; }
    .stat-grid { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat-box { flex: 1; background: #f4f3ff; border-radius: 10px; padding: 14px; text-align: center; }
    .stat-value { font-size: 22px; font-weight: 800; color: #1a1a2e; }
    .stat-label { font-size: 11px; color: #888; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; font-size: 11px; color: #888; text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid #eee; }
    td { font-size: 13px; padding: 10px 10px; border-bottom: 1px solid #f0f0f0; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
    .kira-note { background: #f4f3ff; border-left: 3px solid #6C63FF; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.6; color: #444; margin-top: 8px; }
    .progress-bar-track { background: #eee; border-radius: 99px; height: 8px; overflow: hidden; margin-top: 4px; }
    .progress-bar-fill { height: 100%; border-radius: 99px; }
  </style>
`;

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Génère le HTML du bilan santé, puis le convertit en PDF.
 * sante = objet santé courant ; historique = tableau optionnel de relevés passés
 * Retourne { uri } — chemin local du fichier PDF généré (utilisable pour partage/email).
 */
export async function genererPdfBilanSante(profil, sante, historique = []) {
  const nom = profil?.prenom || profil?.nom || 'Utilisateur';
  const pctPas = sante.oP ? Math.round((sante.pas / sante.oP) * 100) : 0;
  const pctEau = sante.oEau ? Math.round((sante.eau / sante.oEau) * 100) : 0;
  const imc = sante.poids ? (sante.poids / 1.72 / 1.72).toFixed(1) : '?';

  const ligneshistorique = historique.length > 0
    ? historique.map(h => `<tr><td>${h.date}</td><td>${h.pas}</td><td>${h.som}h</td><td>${h.eau}L</td><td>${h.poids}kg</td></tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#aaa;">Aucun historique disponible pour le moment</td></tr>';

  const html = `
    <html>
      <head>${STYLE_BASE}</head>
      <body>
        <div class="header">
          <span class="logo">🌟 Kira OS</span>
          <span class="date">${formatDate(new Date())}</span>
        </div>

        <h1>Bilan Santé</h1>
        <div class="subtitle">Préparé pour ${nom} par Kira, ta coach personnelle</div>

        <div class="section">
          <div class="section-title">Aujourd'hui</div>
          <div class="stat-grid">
            <div class="stat-box"><div class="stat-value">${sante.pas ?? 0}</div><div class="stat-label">Pas (${pctPas}% objectif)</div></div>
            <div class="stat-box"><div class="stat-value">${sante.som ?? '?'}h</div><div class="stat-label">Sommeil</div></div>
            <div class="stat-box"><div class="stat-value">${sante.eau ?? '?'}L</div><div class="stat-label">Eau (${pctEau}%)</div></div>
            <div class="stat-box"><div class="stat-value">${sante.cal ?? 0}</div><div class="stat-label">Calories</div></div>
          </div>
          <div class="stat-grid">
            <div class="stat-box"><div class="stat-value">${sante.poids ?? '?'} kg</div><div class="stat-label">Poids</div></div>
            <div class="stat-box"><div class="stat-value">${imc}</div><div class="stat-label">IMC</div></div>
            <div class="stat-box"><div class="stat-value">${sante.fc ?? '?'}</div><div class="stat-label">FC repos (bpm)</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Historique récent</div>
          <table>
            <tr><th>Date</th><th>Pas</th><th>Sommeil</th><th>Eau</th><th>Poids</th></tr>
            ${ligneshistorique}
          </table>
        </div>

        <div class="section">
          <div class="section-title">🌟 Analyse de Kira</div>
          <div class="kira-note">
            ${genererAnalyseSante(sante, pctPas, pctEau)}
          </div>
        </div>

        <div class="footer">Généré automatiquement par Kira OS — Document personnel, à usage privé</div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return { uri };
}

function genererAnalyseSante(sante, pctPas, pctEau) {
  const remarques = [];
  if (pctPas >= 100) remarques.push("Objectif de pas atteint, bravo !");
  else if (pctPas < 50) remarques.push("Le niveau d'activité physique pourrait être amélioré.");

  if (sante.som < 7) remarques.push("Le sommeil est en dessous des recommandations (7-9h) — une priorité à surveiller.");
  else remarques.push("Le sommeil est dans une fourchette saine.");

  if (pctEau < 70) remarques.push("L'hydratation pourrait être augmentée pour atteindre l'objectif quotidien.");

  return remarques.join(' ') || "Les indicateurs sont globalement équilibrés aujourd'hui.";
}

/**
 * Génère le HTML du suivi guitare/chant, puis le convertit en PDF.
 * progression = tableau d'objets { exercice, niveau, bpmActuel, bpmObjectif, derniereSession }
 */
export async function genererPdfSuiviGuitare(profil, progression = []) {
  const nom = profil?.prenom || profil?.nom || 'Utilisateur';
  const niveauGuitare = profil?.guitareNiv || 'Intermédiaire';
  const niveauChant = profil?.chantNiv || 'Débutant';

  const lignesProgression = progression.length > 0
    ? progression.map(p => {
        const pct = p.bpmObjectif ? Math.min(Math.round((p.bpmActuel / p.bpmObjectif) * 100), 100) : 0;
        return `
          <tr>
            <td>${p.exercice}</td>
            <td>${p.bpmActuel || '-'} / ${p.bpmObjectif || '-'} BPM</td>
            <td>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%; background:#FF8C32;"></div>
              </div>
            </td>
            <td>${p.derniereSession || '-'}</td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#aaa;">Aucune session enregistrée pour le moment</td></tr>';

  const html = `
    <html>
      <head>${STYLE_BASE}</head>
      <body>
        <div class="header">
          <span class="logo">🌟 Kira OS</span>
          <span class="date">${formatDate(new Date())}</span>
        </div>

        <h1>Suivi Guitare & Chant</h1>
        <div class="subtitle">Préparé pour ${nom} par Kira, ton coach musical</div>

        <div class="section">
          <div class="section-title">Niveaux actuels</div>
          <div class="stat-grid">
            <div class="stat-box"><div class="stat-value">🎸</div><div class="stat-label">Guitare : ${niveauGuitare}</div></div>
            <div class="stat-box"><div class="stat-value">🎤</div><div class="stat-label">Chant : ${niveauChant}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Progression par exercice</div>
          <table>
            <tr><th>Exercice</th><th>BPM actuel / objectif</th><th>Progression</th><th>Dernière session</th></tr>
            ${lignesProgression}
          </table>
        </div>

        <div class="section">
          <div class="section-title">🌟 Conseils de Kira</div>
          <div class="kira-note">
            Continue à pratiquer le métronome quotidiennement, même 10 minutes par jour.
            La régularité prime sur la durée des sessions. Pense à toujours t'échauffer
            avant de monter en tempo pour éviter les tensions.
          </div>
        </div>

        <div class="footer">Généré automatiquement par Kira OS — Document personnel, à usage privé</div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return { uri };
}
