import { Linking, Platform, Alert } from 'react-native';
import { GeneralInfo } from '../types';
import { RESCHEDULE_REASON_LABELS } from '../constants';

interface RescheduleEmailParams {
  generalInfo: GeneralInfo;
  reason: string;
  additionalDetails?: string;
  clientEmail?: string;
}

export const generateRescheduleEmailBody = (params: RescheduleEmailParams): string => {
  const { generalInfo, reason, additionalDetails } = params;
  const reasonLabel = RESCHEDULE_REASON_LABELS[reason] || reason;

  const workOrder = `OT-${generalInfo.workOrder.type}-${generalInfo.workOrder.number}-${generalInfo.workOrder.year}`;

  let body = `Estimado/a cliente,

Por medio de la presente, le informamos que la medición acústica programada requiere ser reprogramada debido a:

${reasonLabel}`;

  if (additionalDetails && additionalDetails.trim()) {
    body += `

Detalles adicionales:
${additionalDetails}`;
  }

  body += `

Detalles de la medición:
- Empresa: ${generalInfo.company || 'N/A'}
- Orden de Trabajo: ${workOrder}
- Fecha programada original: ${generalInfo.date || 'N/A'}
- Encargado: ${generalInfo.supervisor || 'N/A'}

Nos comunicaremos a la brevedad para coordinar una nueva fecha.

Atentamente,
${generalInfo.supervisor || 'Equipo de mediciones'}`;

  return body;
};

export const generateRescheduleEmailSubject = (generalInfo: GeneralInfo): string => {
  const workOrder = `OT-${generalInfo.workOrder.type}-${generalInfo.workOrder.number}-${generalInfo.workOrder.year}`;
  return `Reprogramación de Medición - ${workOrder} - ${generalInfo.company || 'Cliente'}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      // Web clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        return successful;
      }
    } else {
      // For mobile platforms, we'd need expo-clipboard
      // For now, just return false to show the alert dialog
      return false;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const openEmailClient = async (subject: string, body: string, toEmail?: string): Promise<void> => {
  try {
    const to = toEmail || '';
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
    } else {
      Alert.alert(
        'Cliente de correo no disponible',
        'No se pudo abrir el cliente de correo. El texto ha sido copiado al portapapeles.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Failed to open email client:', error);
    Alert.alert(
      'Error',
      'No se pudo abrir el cliente de correo. Por favor, copia el texto manualmente.',
      [{ text: 'OK' }]
    );
  }
};
