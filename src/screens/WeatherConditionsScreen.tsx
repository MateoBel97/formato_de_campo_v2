import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormButton from '../components/FormButton';
import { COLORS, WIND_DIRECTIONS, RESCHEDULE_REASONS } from '../constants';
import { WeatherConditions, WeatherCondition } from '../types';
import { parseDecimalInput } from '../utils/numberUtils';
import { generateRescheduleEmailBody, generateRescheduleEmailSubject, copyToClipboard, openEmailClient } from '../utils/emailUtils';

const validationSchema = Yup.object({
  diurnal: Yup.object({
    windSpeed: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
    }),
    windDirection: Yup.object({
      initial: Yup.string(),
      final: Yup.string(),
    }),
    temperature: Yup.object({
      initial: Yup.string().matches(/^(-?\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(-?\d*\.?\d*|)$/, 'Formato inválido'),
    }),
    humidity: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido').test('range', 'Debe estar entre 0 y 100', (value) => {
        if (!value) return true;
        const num = parseFloat(value);
        return num >= 0 && num <= 100;
      }),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido').test('range', 'Debe estar entre 0 y 100', (value) => {
        if (!value) return true;
        const num = parseFloat(value);
        return num >= 0 && num <= 100;
      }),
    }),
    atmosphericPressure: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
    }),
    precipitation: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
    }),
  }),
  nocturnal: Yup.object({
    windSpeed: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
    }),
    windDirection: Yup.object({
      initial: Yup.string(),
      final: Yup.string(),
    }),
    temperature: Yup.object({
      initial: Yup.string().matches(/^(-?\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(-?\d*\.?\d*|)$/, 'Formato inválido'),
    }),
    humidity: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido').test('range', 'Debe estar entre 0 y 100', (value) => {
        if (!value) return true;
        const num = parseFloat(value);
        return num >= 0 && num <= 100;
      }),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido').test('range', 'Debe estar entre 0 y 100', (value) => {
        if (!value) return true;
        const num = parseFloat(value);
        return num >= 0 && num <= 100;
      }),
    }),
    atmosphericPressure: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
    }),
    precipitation: Yup.object({
      initial: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
      final: Yup.string().matches(/^(\d*\.?\d*|)$/, 'Formato inválido'),
    }),
  }),
});

const WeatherConditionsScreen: React.FC = () => {
  const { state, updateWeatherConditions, saveCurrentFormat, setWeatherNavigationSchedule } = useMeasurement();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState('diurnal');
  const [initialValues, setInitialValues] = useState<WeatherConditions | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedInitialData = useRef(false);

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const currentFormat = state.currentFormat;
  const weatherConditions = currentFormat?.weatherConditions;
  const technicalInfo = currentFormat?.technicalInfo;

  // Initialize selected schedule from navigation state
  useEffect(() => {
    if (state.selectedWeatherScheduleForNavigation) {
      setSelectedSchedule(state.selectedWeatherScheduleForNavigation);
      // Clear the navigation state after using it
      setWeatherNavigationSchedule(null as any);
    }
  }, [state.selectedWeatherScheduleForNavigation]);

  // Initialize form values only once
  useEffect(() => {
    if (weatherConditions && !initialValues) {
      setInitialValues(weatherConditions);
      hasLoadedInitialData.current = true;
    } else if (!weatherConditions && !initialValues) {
      setInitialValues({
        diurnal: {
          windSpeed: { initial: 0, final: 0 },
          windDirection: { initial: '', final: '' },
          temperature: { initial: 0, final: 0 },
          humidity: { initial: 0, final: 0 },
          atmosphericPressure: { initial: 0, final: 0 },
          precipitation: { initial: 0, final: 0 },
        },
        nocturnal: {
          windSpeed: { initial: 0, final: 0 },
          windDirection: { initial: '', final: '' },
          temperature: { initial: 0, final: 0 },
          humidity: { initial: 0, final: 0 },
          atmosphericPressure: { initial: 0, final: 0 },
          precipitation: { initial: 0, final: 0 },
        },
      });
      hasLoadedInitialData.current = true;
    }
  }, [weatherConditions, initialValues]);

  // Auto-save function
  const autoSave = async (values: any) => {

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        // Save as strings to preserve decimal format during editing
        updateWeatherConditions(values);
        setTimeout(async () => {
          try {
            await saveCurrentFormat();
            console.log('Weather conditions auto-saved successfully');
          } catch (error) {
            console.error('Error auto-saving weather conditions:', error);
          }
        }, 100);
      } catch (error) {
        console.error('Error updating weather conditions:', error);
      }
    }, 1000); // Save after 1 second of inactivity
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Always default to diurnal for weather conditions
  React.useEffect(() => {
    if (selectedSchedule !== 'diurnal' && selectedSchedule !== 'nocturnal') {
      setSelectedSchedule('diurnal');
    }
  }, [selectedSchedule]);

  const handleOpenRescheduleModal = () => {
    if (!currentFormat?.generalInfo) {
      Alert.alert('Atención', 'Por favor, completa la información general antes de reprogramar.');
      return;
    }
    // Set default reason to weather
    setRescheduleReason('weather');
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

  const hasRainfall = (values: WeatherConditions) => {
    const diurnalHasRain = parseDecimalInput(values.diurnal.precipitation.initial) > 0 || parseDecimalInput(values.diurnal.precipitation.final) > 0;
    const nocturnalHasRain = parseDecimalInput(values.nocturnal.precipitation.initial) > 0 || parseDecimalInput(values.nocturnal.precipitation.final) > 0;
    return diurnalHasRain || nocturnalHasRain;
  };

  const getDisplayValue = (value: any) => {
    if (value === 0 || value === '' || value === null || value === undefined) {
      return '';
    }
    return value.toString();
  };

  const convertToNumbers = (values: any): WeatherConditions => {
    const convertCondition = (condition: any) => ({
      windSpeed: {
        initial: parseDecimalInput(condition.windSpeed.initial),
        final: parseDecimalInput(condition.windSpeed.final),
      },
      windDirection: {
        initial: condition.windDirection.initial,
        final: condition.windDirection.final,
      },
      temperature: {
        initial: parseDecimalInput(condition.temperature.initial),
        final: parseDecimalInput(condition.temperature.final),
      },
      humidity: {
        initial: parseDecimalInput(condition.humidity.initial),
        final: parseDecimalInput(condition.humidity.final),
      },
      atmosphericPressure: {
        initial: parseDecimalInput(condition.atmosphericPressure.initial),
        final: parseDecimalInput(condition.atmosphericPressure.final),
      },
      precipitation: {
        initial: parseDecimalInput(condition.precipitation.initial),
        final: parseDecimalInput(condition.precipitation.final),
      },
    });

    return {
      diurnal: convertCondition(values.diurnal),
      nocturnal: convertCondition(values.nocturnal),
    };
  };

  const handleAutoSave = async (values: any) => {
    try {
      // Don't convert to numbers immediately - save as strings to preserve decimal format
      updateWeatherConditions(values);
      await saveCurrentFormat();
    } catch (error) {
      console.error('Error auto-saving weather conditions:', error);
      Alert.alert(
        'Error de Almacenamiento',
        'No se pudieron guardar las condiciones meteorológicas. Por favor, intente nuevamente.',
        [{ text: 'OK' }]
      );
    }
  };

  // Create a debounced version that doesn't trigger immediately on blur
  const debouncedAutoSave = React.useCallback(
    (values: any) => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(values);
      }, 1500); // Wait 1.5s after last change before saving
    },
    [handleAutoSave]
  );

  // Create a combined change handler that triggers auto-save
  const createChangeHandler = (fieldPath: string, formikHandleChange: any, currentValues: any) => {
    return (value: string) => {
      // Update Formik field immediately
      formikHandleChange(fieldPath)(value);
      
      // Trigger debounced auto-save with updated values
      const updatedValues = { ...currentValues };
      const pathParts = fieldPath.split('.');
      let target = updatedValues;
      for (let i = 0; i < pathParts.length - 1; i++) {
        target = target[pathParts[i]];
      }
      target[pathParts[pathParts.length - 1]] = value;
      
      debouncedAutoSave(updatedValues);
    };
  };

  const renderScheduleButtons = () => {
    // Always show both diurnal and nocturnal options for weather conditions
    const scheduleOptions = [
      { key: 'diurnal', label: 'Diurno', icon: 'sun' },
      { key: 'nocturnal', label: 'Nocturno', icon: 'moon' }
    ];

    return (
      <View style={styles.scheduleButtonsContainer}>
        <Text style={styles.scheduleLabel}>Seleccione el horario:</Text>
        <View style={styles.scheduleButtonsRow}>
          {scheduleOptions.map((option) => {
            const buttonColor = option.key === 'diurnal' ? COLORS.diurnal : COLORS.nocturnal;
            const isSelected = selectedSchedule === option.key;
            
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.scheduleButton,
                  isSelected ? { backgroundColor: buttonColor, borderColor: buttonColor } : { borderColor: buttonColor }
                ]}
                onPress={() => {
                  setSelectedSchedule(option.key);
                }}
              >
                <Feather 
                  name={option.icon as any} 
                  size={18} 
                  color={isSelected ? COLORS.surface : buttonColor} 
                />
                <Text style={[
                  styles.scheduleButtonText,
                  { color: isSelected ? COLORS.surface : buttonColor }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeatherSection = (
    title: string,
    prefix: 'diurnal' | 'nocturnal',
    values: any,
    errors: any,
    touched: any,
    handleChange: any,
    handleAutoSave: any
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      
      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            label="Velocidad del viento inicial (m/s)"
            value={getDisplayValue(values[prefix].windSpeed.initial)}
            onChangeText={handleChange(`${prefix}.windSpeed.initial`)}
            error={touched[prefix]?.windSpeed?.initial && errors[prefix]?.windSpeed?.initial}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Velocidad del viento final (m/s)"
            value={getDisplayValue(values[prefix].windSpeed.final)}
            onChangeText={handleChange(`${prefix}.windSpeed.final`)}
            error={touched[prefix]?.windSpeed?.final && errors[prefix]?.windSpeed?.final}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormPicker
            label="Dirección del viento inicial"
            value={values[prefix].windDirection.initial}
            onSelect={(value) => handleChange(`${prefix}.windDirection.initial`)(value)}
            options={WIND_DIRECTIONS}
            error={touched[prefix]?.windDirection?.initial && errors[prefix]?.windDirection?.initial}
          />
        </View>
        <View style={styles.column}>
          <FormPicker
            label="Dirección del viento final"
            value={values[prefix].windDirection.final}
            onSelect={(value) => handleChange(`${prefix}.windDirection.final`)(value)}
            options={WIND_DIRECTIONS}
            error={touched[prefix]?.windDirection?.final && errors[prefix]?.windDirection?.final}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            label="Temperatura inicial (°C)"
            value={getDisplayValue(values[prefix].temperature.initial)}
            onChangeText={handleChange(`${prefix}.temperature.initial`)}
            error={touched[prefix]?.temperature?.initial && errors[prefix]?.temperature?.initial}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Temperatura final (°C)"
            value={getDisplayValue(values[prefix].temperature.final)}
            onChangeText={handleChange(`${prefix}.temperature.final`)}
            error={touched[prefix]?.temperature?.final && errors[prefix]?.temperature?.final}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            label="Humedad inicial (%)"
            value={getDisplayValue(values[prefix].humidity.initial)}
            onChangeText={handleChange(`${prefix}.humidity.initial`)}
            error={touched[prefix]?.humidity?.initial && errors[prefix]?.humidity?.initial}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Humedad final (%)"
            value={getDisplayValue(values[prefix].humidity.final)}
            onChangeText={handleChange(`${prefix}.humidity.final`)}
            error={touched[prefix]?.humidity?.final && errors[prefix]?.humidity?.final}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            label="Presión atmosférica inicial (hPa)"
            value={getDisplayValue(values[prefix].atmosphericPressure.initial)}
            onChangeText={handleChange(`${prefix}.atmosphericPressure.initial`)}
            error={touched[prefix]?.atmosphericPressure?.initial && errors[prefix]?.atmosphericPressure?.initial}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Presión atmosférica final (hPa)"
            value={getDisplayValue(values[prefix].atmosphericPressure.final)}
            onChangeText={handleChange(`${prefix}.atmosphericPressure.final`)}
            error={touched[prefix]?.atmosphericPressure?.final && errors[prefix]?.atmosphericPressure?.final}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            label="Precipitación inicial (mm)"
            value={getDisplayValue(values[prefix].precipitation.initial)}
            onChangeText={handleChange(`${prefix}.precipitation.initial`)}
            error={touched[prefix]?.precipitation?.initial && errors[prefix]?.precipitation?.initial}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Precipitación final (mm)"
            value={getDisplayValue(values[prefix].precipitation.final)}
            onChangeText={handleChange(`${prefix}.precipitation.final`)}
            error={touched[prefix]?.precipitation?.final && errors[prefix]?.precipitation?.final}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
        </View>
      </View>
    </View>
  );

  if (!currentFormat) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No hay formato seleccionado</Text>
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
        <Text style={styles.title}>Condiciones Meteorológicas</Text>
        <Text style={styles.subtitle}>
          Registra las condiciones meteorológicas iniciales y finales para cada horario
        </Text>

        {renderScheduleButtons()}

        {initialValues && (
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={() => {}}
        >
          {({ values, errors, touched, handleChange }) => {
            // Trigger auto-save when values change
            React.useEffect(() => {
              if (hasLoadedInitialData.current && values !== initialValues) {
                autoSave(values);
              }
            }, [values]);

            return (
              <View>
                {renderWeatherSection(
                  selectedSchedule === 'diurnal' ? 'Horario Diurno' : 'Horario Nocturno',
                  selectedSchedule as 'diurnal' | 'nocturnal',
                  values,
                  errors,
                  touched,
                  handleChange,
                  handleAutoSave
                )}

                {/* Rainfall Warning */}
                {hasRainfall(values) && (
                  <View style={styles.rainfallWarningContainer}>
                    <View style={styles.rainfallWarningHeader}>
                      <Feather name="alert-triangle" size={20} color={COLORS.error} />
                      <Text style={styles.rainfallWarningTitle}>Condiciones Inadecuadas</Text>
                    </View>
                    <Text style={styles.rainfallWarningText}>
                      No se pueden realizar mediciones de ruido bajo condiciones de lluvia. Debe reprogramar medición.
                    </Text>
                    <FormButton
                      title="📅 Reprogramar Medición"
                      onPress={handleOpenRescheduleModal}
                      variant="outline"
                      size="large"
                      style={styles.rescheduleButton}
                    />
                  </View>
                )}

                <View style={styles.bottomSpacing} />
              </View>
            );
          }}
        </Formik>
        )}
        
        {!initialValues && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>Cargando condiciones meteorológicas...</Text>
          </View>
        )}
      </View>

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
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 32,
  },
  bottomSpacing: {
    height: 280, // Increased by 40% (200 * 1.4 = 280)
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
  },
  scheduleButtonsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  scheduleButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  scheduleButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    flex: 1,
    maxWidth: 120,
    flexDirection: 'row',
  },
  scheduleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  rainfallWarningContainer: {
    backgroundColor: COLORS.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rainfallWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rainfallWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  rainfallWarningText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  rescheduleButton: {
    marginTop: 8,
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
});

export default WeatherConditionsScreen;