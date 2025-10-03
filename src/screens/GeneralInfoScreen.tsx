import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import DatePicker from '../components/DatePicker';
import FormButton from '../components/FormButton';
import Toast from '../components/Toast';
import { COLORS, WORK_ORDER_TYPES, RESCHEDULE_REASONS } from '../constants';
import { GeneralInfo } from '../types';
import { generateRescheduleEmailBody, generateRescheduleEmailSubject, copyToClipboard, openEmailClient } from '../utils/emailUtils';

const validationSchema = Yup.object({
  company: Yup.string().required('El nombre de la empresa es requerido'),
  date: Yup.string().required('La fecha es requerida'),
  workOrder: Yup.object({
    type: Yup.string().required('El tipo de orden es requerido'),
    number: Yup.string().required('El número de orden es requerido'),
    year: Yup.string()
      .required('El año es requerido')
      .matches(/^\d{2}$/, 'El año debe tener 2 dígitos'),
  }),
  supervisor: Yup.string().required('El encargado de la medición es requerido'),
});

const GeneralInfoScreen: React.FC = () => {
  const { state, updateGeneralInfo, saveCurrentFormat, markGeneralInfoAsSaved } = useMeasurement();
  const [isSaving, setIsSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<GeneralInfo | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const currentFormat = state.currentFormat;

  // Initialize form values only once
  useEffect(() => {
    if (currentFormat?.generalInfo && !initialValues) {
      setInitialValues(currentFormat.generalInfo);
    } else if (!currentFormat?.generalInfo && !initialValues) {
      setInitialValues({
        company: '',
        date: new Date().toISOString().split('T')[0],
        workOrder: {
          type: 'RUI',
          number: '',
          year: new Date().getFullYear().toString().slice(-2),
        },
        supervisor: '',
      });
    }
  }, [currentFormat?.generalInfo, initialValues]);

  const handleSubmit = async (values: GeneralInfo) => {
    try {
      setIsSaving(true);

      // Update the general info in the reducer first
      updateGeneralInfo(values);

      // Build the updated format manually to pass to saveCurrentFormat
      if (!currentFormat) {
        throw new Error('No current format available');
      }

      const updatedFormat = {
        ...currentFormat,
        generalInfo: values,
        updatedAt: new Date().toISOString()
      };

      // Save with the updated format
      await saveCurrentFormat(updatedFormat);

      // Mark as saved
      markGeneralInfoAsSaved();

      setShowToast(true);
      console.log('✅ Información general guardada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la información');
      console.error('Error saving general info:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenRescheduleModal = () => {
    if (!currentFormat?.generalInfo) {
      Alert.alert('Atención', 'Por favor, completa la información general antes de reprogramar.');
      return;
    }
    setShowRescheduleModal(true);
  };

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleReason('');
    setAdditionalDetails('');
    setClientEmail('');
  };

  const handleCopyAndOpenEmail = async () => {
    if (!rescheduleReason) {
      Alert.alert('Atención', 'Por favor, selecciona un motivo de reprogramación.');
      return;
    }

    if (!currentFormat?.generalInfo) {
      Alert.alert('Error', 'No se pudo acceder a la información general.');
      return;
    }

    const emailBody = generateRescheduleEmailBody({
      generalInfo: currentFormat.generalInfo,
      reason: rescheduleReason,
      additionalDetails,
      clientEmail,
    });

    const emailSubject = generateRescheduleEmailSubject(currentFormat.generalInfo);

    // Try to copy to clipboard
    const copied = await copyToClipboard(emailBody);

    if (copied) {
      Alert.alert(
        'Texto copiado',
        'El texto del correo ha sido copiado al portapapeles. ¿Deseas abrir el cliente de correo?',
        [
          { text: 'Solo copiar', style: 'cancel', onPress: handleCloseRescheduleModal },
          {
            text: 'Abrir correo',
            onPress: async () => {
              await openEmailClient(emailSubject, emailBody, clientEmail);
              handleCloseRescheduleModal();
            },
          },
        ]
      );
    } else {
      // If copy failed, just try to open email client
      await openEmailClient(emailSubject, emailBody, clientEmail);
      handleCloseRescheduleModal();
    }
  };

  if (!currentFormat) {
    return (
      <View style={styles.errorContainer}>
        <FormButton
          title="Volver al inicio"
          onPress={() => {}}
          variant="outline"
        />
      </View>
    );
  }

  return (
    <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.content}>
        <Text style={styles.title}>Información General</Text>
        <Text style={styles.subtitle}>
          Datos básicos del estudio de medición acústica
        </Text>
      </View>
      {initialValues && (
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
          <View style={styles.form}>
            <FormInput
              label="Nombre de la empresa"
              value={values.company}
              onChangeText={handleChange('company')}
              error={touched.company && errors.company ? errors.company : undefined}
              placeholder="Ingrese el nombre de la empresa"
              required
            />

            <DatePicker
              label="Fecha"
              value={values.date}
              onChange={(date) => setFieldValue('date', date)}
              error={touched.date && errors.date ? errors.date : undefined}
              required
            />

            <View style={styles.workOrderContainer}>
              <View style={styles.workOrderRow}>
                <View style={styles.workOrderType}>
                  <FormPicker
                    label="Tipo de orden"
                    value={values.workOrder.type}
                    options={WORK_ORDER_TYPES}
                    onSelect={(value) => setFieldValue('workOrder.type', value)}
                    error={
                      touched.workOrder?.type && errors.workOrder?.type
                        ? errors.workOrder.type
                        : undefined
                    }
                    required
                  />
                </View>
                
                <View style={styles.workOrderNumber}>
                  <FormInput
                    label="Número"
                    value={values.workOrder.number}
                    onChangeText={(text) => {
                      // Only allow numeric input
                      const numericText = text.replace(/[^0-9]/g, '');
                      setFieldValue('workOrder.number', numericText);
                    }}
                    onBlur={() => {
                      // Format to 3 digits with leading zeros when user finishes editing
                      if (values.workOrder.number) {
                        const formatted = values.workOrder.number.padStart(3, '0');
                        setFieldValue('workOrder.number', formatted);
                      }
                    }}
                    error={
                      touched.workOrder?.number && errors.workOrder?.number
                        ? errors.workOrder.number
                        : undefined
                    }
                    keyboardType="numeric"
                    placeholder="000"
                    maxLength={3}
                    required
                  />
                </View>
                
                <View style={styles.workOrderYear}>
                  <FormInput
                    label="Año"
                    value={values.workOrder.year}
                    onChangeText={(text) => setFieldValue('workOrder.year', text)}
                    error={
                      touched.workOrder?.year && errors.workOrder?.year
                        ? errors.workOrder.year
                        : undefined
                    }
                    keyboardType="numeric"
                    placeholder="24"
                    maxLength={2}
                    required
                  />
                </View>
              </View>
              
              <View style={styles.previewContainer}>
                <FormInput
                  label="Orden de trabajo (Vista previa)"
                  value={`OT-${values.workOrder.type}-${values.workOrder.number}-${values.workOrder.year}`}
                  editable={false}
                  style={styles.previewInput}
                />
              </View>
            </View>

            <FormInput
              label="Encargado de la medición"
              value={values.supervisor}
              onChangeText={handleChange('supervisor')}
              error={touched.supervisor && errors.supervisor ? errors.supervisor : undefined}
              placeholder="Ingrese el nombre del encargado"
              required
            />

            <FormButton
              title={isSaving ? 'Guardando...' : 'Guardar información'}
              onPress={() => handleSubmit()}
              loading={isSaving}
              size="large"
              style={styles.submitButton}
            />

            <FormButton
              title="📅 Reprogramar Medición"
              onPress={handleOpenRescheduleModal}
              variant="outline"
              size="large"
              style={styles.rescheduleButton}
            />

            <View style={styles.bottomSpacing} />
          </View>
        )}
      </Formik>
      )}

      <Toast
        visible={showToast}
        message="Información general guardada correctamente"
        type="success"
        onHide={() => setShowToast(false)}
      />
      
      {!initialValues && (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Cargando información general...</Text>
        </View>
      )}

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseRescheduleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reprogramar Medición</Text>
              <TouchableOpacity onPress={handleCloseRescheduleModal} style={styles.closeButton}>
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Motivo de reprogramación *</Text>
              <View style={styles.pickerContainer}>
                <FormPicker
                  label=""
                  value={rescheduleReason}
                  onSelect={setRescheduleReason}
                  options={RESCHEDULE_REASONS}
                />
              </View>

              <Text style={styles.modalLabel}>Correo del cliente (opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={clientEmail}
                onChangeText={setClientEmail}
                placeholder="cliente@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Detalles adicionales (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
                placeholder="Agrega información adicional sobre la reprogramación..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <FormButton
                  title="Cancelar"
                  onPress={handleCloseRescheduleModal}
                  variant="outline"
                  style={styles.modalButton}
                />
                <FormButton
                  title="Copiar y Abrir"
                  onPress={handleCopyAndOpenEmail}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  form: {
    padding: 16,
    paddingTop: 0,
  },
  workOrderContainer: {
    marginBottom: 16,
  },
  workOrderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  workOrderType: {
    flex: 2,
  },
  workOrderNumber: {
    flex: 2,
  },
  workOrderYear: {
    flex: 1,
  },
  previewContainer: {
    opacity: 0.7,
  },
  previewInput: {
    backgroundColor: COLORS.border,
    color: COLORS.textSecondary,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  rescheduleButton: {
    marginBottom: 32,
  },
  bottomSpacing: {
    height: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default GeneralInfoScreen;