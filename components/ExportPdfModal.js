// ═══════════════════════════════════════════
//  EXPORTPDFMODAL.JS — Composant réutilisable
//  pour générer un PDF (santé ou guitare) et
//  l'envoyer par email, ou simplement le partager
//  via le partage natif Android (Bluetooth, Drive,
//  WhatsApp...) si l'utilisateur préfère.
// ═══════════════════════════════════════════

import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { envoyerEmailAvecPdf, genererCorpsEmail } from '../utils/emailSender';
import { getProgression } from '../utils/guitareProgression';
import { genererPdfBilanSante, genererPdfSuiviGuitare } from '../utils/pdfGenerator';
import { getData } from '../utils/storage';
import { getTheme, PALETTE } from '../utils/theme';

/**
 * type = 'sante' | 'guitare'
 * visible, onClose = contrôle d'affichage de la modal (composant parent)
 */
export default function ExportPdfModal({ visible, onClose, type }) {
  const theme = getTheme('cosmos');
  const [etape, setEtape] = useState('choix'); // 'choix' | 'generation' | 'fait' | 'erreur'
  const [messageErreur, setMessageErreur] = useState(null);
  const [pdfUri, setPdfUri] = useState(null);

  const reinitialiser = () => {
    setEtape('choix');
    setMessageErreur(null);
    setPdfUri(null);
  };

  const fermer = () => {
    reinitialiser();
    onClose();
  };

  const genererLePdf = async () => {
    setEtape('generation');
    try {
      const profil = (await getData('profil')) || {};
      let resultat;

      if (type === 'sante') {
        const sante = (await getData('sante')) || {};
        const historique = (await getData('sante_historique')) || [];
        resultat = await genererPdfBilanSante(profil, sante, historique);
      } else {
        const progression = await getProgression();
        const progressionFinale = progression.length > 0
          ? progression
          : [{ exercice: 'Aucun exercice pratiqué encore', bpmActuel: 0, bpmObjectif: 0, derniereSession: '-' }];
        resultat = await genererPdfSuiviGuitare(profil, progressionFinale);
      }

      setPdfUri(resultat.uri);
      setEtape('fait');
    } catch (e) {
      setMessageErreur(e.message);
      setEtape('erreur');
    }
  };

  const partagerNativement = async () => {
    const disponible = await Sharing.isAvailableAsync();
    if (!disponible) {
      Alert.alert('Partage indisponible', "Le partage natif n'est pas disponible sur cet appareil.");
      return;
    }
    await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', dialogTitle: 'Partager le PDF' });
  };

  const envoyerParEmail = async () => {
    const [profil, apiKeys] = await Promise.all([getData('profil'), getData('api_keys')]);
    const resendKey = apiKeys?.resend;

    if (!resendKey) {
      Alert.alert(
        'Configuration requise',
        "Configure ta clé Resend dans Paramètres → 🔑 API pour envoyer des emails automatiquement.",
        [{ text: 'OK' }]
      );
      return;
    }

    if (!profil?.email) {
      Alert.alert('Email manquant', "Renseigne ton adresse email dans Paramètres → Profil.");
      return;
    }

    setEtape('generation'); // réutilise l'état de chargement
    const nom = profil.prenom || profil.nom || '';
    const typeDoc = type === 'sante' ? 'bilan santé' : 'suivi guitare & chant';
    const sujet = type === 'sante' ? '🌟 Ton bilan santé Kira OS' : '🌟 Ton suivi guitare & chant Kira OS';
    const nomFichier = type === 'sante' ? 'bilan-sante.pdf' : 'suivi-guitare.pdf';

    const { succes, erreur } = await envoyerEmailAvecPdf(
      resendKey, profil.email, sujet, genererCorpsEmail(nom, typeDoc), pdfUri, nomFichier
    );

    if (succes) {
      Alert.alert('✅ Envoyé !', `Le PDF a été envoyé à ${profil.email}.`);
      setEtape('fait');
    } else {
      Alert.alert('Erreur d\'envoi', erreur);
      setEtape('fait');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={fermer}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
          <Text style={styles.modalTitle}>
            {type === 'sante' ? '📄 Exporter le bilan santé' : '📄 Exporter le suivi guitare'}
          </Text>

          {etape === 'choix' && (
            <View>
              <Text style={styles.modalText}>
                Kira va générer un document PDF avec tes statistiques actuelles.
              </Text>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.accent }]} onPress={genererLePdf}>
                <Text style={styles.btnPrimaryText}>Générer le PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={fermer}>
                <Text style={styles.btnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}

          {etape === 'generation' && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.accent} size="large" />
              <Text style={styles.modalText}>Préparation en cours...</Text>
            </View>
          )}

          {etape === 'fait' && (
            <View>
              <Text style={[styles.modalText, { color: PALETTE.green }]}>✅ PDF généré avec succès !</Text>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.accent }]} onPress={envoyerParEmail}>
                <Text style={styles.btnPrimaryText}>📧 Envoyer par email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={partagerNativement}>
                <Text style={[styles.btnPrimaryText, { color: '#fff' }]}>📤 Partager autrement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={fermer}>
                <Text style={styles.btnSecondaryText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}

          {etape === 'erreur' && (
            <View>
              <Text style={[styles.modalText, { color: PALETTE.pink }]}>⚠️ Erreur : {messageErreur}</Text>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.accent }]} onPress={genererLePdf}>
                <Text style={styles.btnPrimaryText}>Réessayer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={fermer}>
                <Text style={styles.btnSecondaryText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 14 },
  modalText: { fontSize: 13, color: '#aaa', lineHeight: 19, marginBottom: 18 },
  loadingBox: { alignItems: 'center', paddingVertical: 20, gap: 14 },
  btnPrimary: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: { padding: 12, alignItems: 'center' },
  btnSecondaryText: { color: '#888899', fontSize: 13 },
});
