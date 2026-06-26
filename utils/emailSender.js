// ═══════════════════════════════════════════
//  EMAILSENDER.JS — Envoi d'email via Resend
//  Resend ne supporte pas directement les pièces
//  jointes binaires depuis une simple requête REST
//  mobile sans backend — on utilise donc le format
//  attachments en base64, supporté par leur API.
//
//  CORRECTIF LOT 32 : FileSystem.readAsStringAsync()
//  (API "legacy") jette désormais une erreur de
//  dépréciation au runtime sur Expo SDK 54+. Remplacé
//  par la classe File de la nouvelle API
//  expo-file-system, stable depuis le SDK 54.
// ═══════════════════════════════════════════

import { File } from 'expo-file-system';

const RESEND_API_URL = 'https://api.resend.com/emails';

// Domaine de test fourni par Resend, fonctionne immédiatement sans
// configuration de domaine personnalisé — parfait pour un usage personnel.
const EXPEDITEUR_PAR_DEFAUT = 'Kira OS <onboarding@resend.dev>';

/**
 * Envoie un email avec un PDF en pièce jointe via Resend.
 * destinataire = adresse email (celle du profil utilisateur)
 * sujet, corps = texte de l'email
 * pdfUri = chemin local du fichier PDF généré par pdfGenerator.js
 * nomFichier = nom donné à la pièce jointe (ex: "bilan-sante.pdf")
 */
export async function envoyerEmailAvecPdf(apiKey, destinataire, sujet, corpsHtml, pdfUri, nomFichier) {
  if (!apiKey) {
    return { succes: false, erreur: 'NON_CONFIGURE' };
  }
  if (!destinataire) {
    return { succes: false, erreur: 'Aucune adresse email configurée dans ton profil.' };
  }

  try {
    // Lit le PDF local et le convertit en base64 pour l'envoyer en pièce jointe
    const fichier = new File(pdfUri);
    const base64 = await fichier.base64();

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EXPEDITEUR_PAR_DEFAUT,
        to: [destinataire],
        subject: sujet,
        html: corpsHtml,
        attachments: [
          { filename: nomFichier, content: base64 },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend erreur ${res.status} : ${body.slice(0, 200)}`);
    }

    return { succes: true, erreur: null };
  } catch (e) {
    return { succes: false, erreur: e.message };
  }
}

/**
 * Génère le corps HTML simple de l'email accompagnant le PDF.
 */
export function genererCorpsEmail(nom, typeDocument) {
  return `
    <div style="font-family: -apple-system, Arial, sans-serif; color: #1a1a2e;">
      <p>Bonjour ${nom || ''},</p>
      <p>Voici ton ${typeDocument} généré par Kira OS, en pièce jointe.</p>
      <p style="color: #888; font-size: 13px; margin-top: 24px;">— Kira 🌟</p>
    </div>
  `;
}
