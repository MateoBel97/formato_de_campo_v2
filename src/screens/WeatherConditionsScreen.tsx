import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import { COLORS } from '../constants';
import { WeatherConditions, WeatherCondition } from '../types';

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
  const { state, updateWeatherConditions } = useMeasurement();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState('diurnal');

  const currentFormat = state.currentFormat;
  const weatherConditions = currentFormat?.weatherConditions;
  const technicalInfo = currentFormat?.technicalInfo;

  // Always default to diurnal for weather conditions
  React.useEffect(() => {
    if (selectedSchedule !== 'diurnal' && selectedSchedule !== 'nocturnal') {
      setSelectedSchedule('diurnal');
    }
  }, [selectedSchedule]);

  const getDisplayValue = (value: any) => {
    if (value === 0 || value === '' || value === null || value === undefined) {
      return '';
    }
    return value.toString();
  };

  const convertToNumbers = (values: any): WeatherConditions => {
    const convertCondition = (condition: any) => ({
      windSpeed: {
        initial: condition.windSpeed.initial === '' ? 0 : parseFloat(condition.windSpeed.initial) || 0,
        final: condition.windSpeed.final === '' ? 0 : parseFloat(condition.windSpeed.final) || 0,
      },
      windDirection: {
        initial: condition.windDirection.initial,
        final: condition.windDirection.final,
      },
      temperature: {
        initial: condition.temperature.initial === '' ? 0 : parseFloat(condition.temperature.initial) || 0,
        final: condition.temperature.final === '' ? 0 : parseFloat(condition.temperature.final) || 0,
      },
      humidity: {
        initial: condition.humidity.initial === '' ? 0 : parseFloat(condition.humidity.initial) || 0,
        final: condition.humidity.final === '' ? 0 : parseFloat(condition.humidity.final) || 0,
      },
      atmosphericPressure: {
        initial: condition.atmosphericPressure.initial === '' ? 0 : parseFloat(condition.atmosphericPressure.initial) || 0,
        final: condition.atmosphericPressure.final === '' ? 0 : parseFloat(condition.atmosphericPressure.final) || 0,
      },
      precipitation: {
        initial: condition.precipitation.initial === '' ? 0 : parseFloat(condition.precipitation.initial) || 0,
        final: condition.precipitation.final === '' ? 0 : parseFloat(condition.precipitation.final) || 0,
      },
    });

    return {
      diurnal: convertCondition(values.diurnal),
      nocturnal: convertCondition(values.nocturnal),
    };
  };

  const handleSave = async (values: any) => {
    try {
      setIsSaving(true);
      const convertedValues = convertToNumbers(values);
      updateWeatherConditions(convertedValues);
      Alert.alert('Éxito', 'Condiciones meteorológicas guardadas correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar las condiciones meteorológicas');
    } finally {
      setIsSaving(false);
    }
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
                onPress={() => setSelectedSchedule(option.key)}
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
    handleChange: any
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
            keyboardType="numeric"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Velocidad del viento final (m/s)"
            value={getDisplayValue(values[prefix].windSpeed.final)}
            onChangeText={handleChange(`${prefix}.windSpeed.final`)}
            error={touched[prefix]?.windSpeed?.final && errors[prefix]?.windSpeed?.final}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <FormInput
            label="Dirección del viento inicial"
            value={values[prefix].windDirection.initial}
            onChangeText={handleChange(`${prefix}.windDirection.initial`)}
            error={touched[prefix]?.windDirection?.initial && errors[prefix]?.windDirection?.initial}
            placeholder="Ej: N, NE, E, SE, S, SW, W, NW"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Dirección del viento final"
            value={values[prefix].windDirection.final}
            onChangeText={handleChange(`${prefix}.windDirection.final`)}
            error={touched[prefix]?.windDirection?.final && errors[prefix]?.windDirection?.final}
            placeholder="Ej: N, NE, E, SE, S, SW, W, NW"
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
            keyboardType="numeric"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Temperatura final (°C)"
            value={getDisplayValue(values[prefix].temperature.final)}
            onChangeText={handleChange(`${prefix}.temperature.final`)}
            error={touched[prefix]?.temperature?.final && errors[prefix]?.temperature?.final}
            keyboardType="numeric"
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
            keyboardType="numeric"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Humedad final (%)"
            value={getDisplayValue(values[prefix].humidity.final)}
            onChangeText={handleChange(`${prefix}.humidity.final`)}
            error={touched[prefix]?.humidity?.final && errors[prefix]?.humidity?.final}
            keyboardType="numeric"
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
            keyboardType="numeric"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Presión atmosférica final (hPa)"
            value={getDisplayValue(values[prefix].atmosphericPressure.final)}
            onChangeText={handleChange(`${prefix}.atmosphericPressure.final`)}
            error={touched[prefix]?.atmosphericPressure?.final && errors[prefix]?.atmosphericPressure?.final}
            keyboardType="numeric"
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
            keyboardType="numeric"
          />
        </View>
        <View style={styles.column}>
          <FormInput
            label="Precipitación final (mm)"
            value={getDisplayValue(values[prefix].precipitation.final)}
            onChangeText={handleChange(`${prefix}.precipitation.final`)}
            error={touched[prefix]?.precipitation?.final && errors[prefix]?.precipitation?.final}
            keyboardType="numeric"
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Condiciones Meteorológicas</Text>
        <Text style={styles.subtitle}>
          Registra las condiciones meteorológicas iniciales y finales para cada horario
        </Text>

        {renderScheduleButtons()}

        <Formik
          initialValues={weatherConditions || {
            diurnal: {
              windSpeed: { initial: '', final: '' },
              windDirection: { initial: '', final: '' },
              temperature: { initial: '', final: '' },
              humidity: { initial: '', final: '' },
              atmosphericPressure: { initial: '', final: '' },
              precipitation: { initial: '', final: '' },
            },
            nocturnal: {
              windSpeed: { initial: '', final: '' },
              windDirection: { initial: '', final: '' },
              temperature: { initial: '', final: '' },
              humidity: { initial: '', final: '' },
              atmosphericPressure: { initial: '', final: '' },
              precipitation: { initial: '', final: '' },
            },
          }}
          validationSchema={validationSchema}
          onSubmit={handleSave}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleSubmit }) => (
            <View>
              {renderWeatherSection(
                selectedSchedule === 'diurnal' ? 'Horario Diurno' : 'Horario Nocturno',
                selectedSchedule as 'diurnal' | 'nocturnal',
                values,
                errors,
                touched,
                handleChange
              )}

              <FormButton
                title={isSaving ? 'Guardando...' : 'Guardar Condiciones'}
                onPress={handleSubmit}
                loading={isSaving}
                size="large"
                style={styles.saveButton}
              />
            </View>
          )}
        </Formik>
      </View>
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
});

export default WeatherConditionsScreen;