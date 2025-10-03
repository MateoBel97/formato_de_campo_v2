import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormCheckbox from '../components/FormCheckbox';
import { COLORS, MEASUREMENT_TYPES, SOUND_METERS, CALIBRATORS, WEATHER_STATIONS, SCANNING_METHODS } from '../constants';
import { TechnicalInfo, MeasurementType } from '../types';

const validationSchema = Yup.object({
  measurementType: Yup.string().required('El tipo de medición es requerido'),
  schedule: Yup.object({
    diurnal: Yup.boolean(),
    nocturnal: Yup.boolean(),
  }).test('at-least-one', 'Debe seleccionar al menos un horario', (value) => {
    return value.diurnal || value.nocturnal;
  }),
  soundMeter: Yup.object({
    selected: Yup.string().required('El sonómetro es requerido'),
    other: Yup.string().when('selected', {
      is: 'other',
      then: (schema) => schema.required('Especifique el sonómetro'),
    }),
  }),
  calibrator: Yup.object({
    selected: Yup.string().required('El calibrador es requerido'),
    other: Yup.string().when('selected', {
      is: 'other',
      then: (schema) => schema.required('Especifique el calibrador'),
    }),
  }),
  weatherStation: Yup.object({
    selected: Yup.string().required('La estación meteorológica es requerida'),
    other: Yup.string().when('selected', {
      is: 'other',
      then: (schema) => schema.required('Especifique la estación meteorológica'),
    }),
  }),
  scanningMethod: Yup.string().when('measurementType', {
    is: 'emission',
    then: (schema) => schema.required('El método de barrido usado es requerido'),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const TechnicalInfoScreen: React.FC = () => {
  const { state, updateTechnicalInfo, saveCurrentFormat } = useMeasurement();
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const lastSavedValuesRef = useRef<TechnicalInfo | null>(null);

  const currentFormat = state.currentFormat;
  const technicalInfo = currentFormat?.technicalInfo;

  // Get initial values from technicalInfo or use defaults
  const initialValues: TechnicalInfo = technicalInfo || {
    measurementType: 'emission',
    schedule: {
      diurnal: false,
      nocturnal: false,
    },
    soundMeter: {
      selected: '',
      other: '',
    },
    calibrator: {
      selected: '',
      other: '',
    },
    weatherStation: {
      selected: '',
      other: '',
    },
    scanningMethod: '',
  };

  // Initialize lastSavedValuesRef with current values
  useEffect(() => {
    if (technicalInfo && !lastSavedValuesRef.current) {
      lastSavedValuesRef.current = technicalInfo;
    }
  }, [technicalInfo]);

  const handleAutoSave = async (values: any) => {
    // Compare with last saved values, not initial values
    const compareWith = lastSavedValuesRef.current || initialValues;

    if (JSON.stringify(values) === JSON.stringify(compareWith)) {
      console.log('Technical info auto-save skipped: no changes detected');
      return;
    }

    // Cast values to TechnicalInfo type
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        // Ensure values match TechnicalInfo interface
        const technicalInfoData: TechnicalInfo = {
          measurementType: values.measurementType as MeasurementType,
          schedule: values.schedule,
          soundMeter: values.soundMeter,
          calibrator: values.calibrator,
          weatherStation: values.weatherStation,
          scanningMethod: values.scanningMethod,
        };
        updateTechnicalInfo(technicalInfoData);
        await saveCurrentFormat();

        // Update the ref with the saved values
        lastSavedValuesRef.current = technicalInfoData;

        console.log('Technical info auto-saved successfully');
      } catch (error) {
        console.error('Error auto-saving technical info:', error);
        Alert.alert(
          'Error de Almacenamiento',
          'No se pudo guardar la información técnica. Por favor, intente nuevamente.',
          [{ text: 'OK' }]
        );
      }
    }, 500);

    setSaveTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      // When unmounting, save immediately if there's a pending save
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        // Force immediate save on unmount
        if (currentFormat && technicalInfo) {
          saveCurrentFormat().catch(error => {
            console.error('Error saving on unmount:', error);
          });
        }
      }
    };
  }, [saveTimeout, currentFormat, technicalInfo]);

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
        <Text style={styles.title}>Información Técnica</Text>
        <Text style={styles.subtitle}>
          Configure el tipo de medición, horarios y equipos utilizados
        </Text>

        <Formik
          key={JSON.stringify(initialValues)}
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize={true}
          onSubmit={() => {}}
        >
          {({ values, errors, touched, handleChange, setFieldValue }) => {
            useEffect(() => {
              handleAutoSave(values);
            }, [values]);

            return (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tipo de Medición</Text>
                <FormPicker
                  label="Tipo de medición"
                  value={values.measurementType}
                  onSelect={(value) => setFieldValue('measurementType', value)}
                  options={MEASUREMENT_TYPES}
                  error={touched.measurementType && errors.measurementType ? errors.measurementType : undefined}
                  required
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Horarios de Medición</Text>
                <View style={styles.checkboxContainer}>
                  <View style={styles.checkboxRow}>
                    <FormCheckbox
                      label="Horario Diurno"
                      value={values.schedule.diurnal}
                      onValueChange={(value) => setFieldValue('schedule.diurnal', value)}
                    />
                  </View>
                  <View style={styles.checkboxRow}>
                    <FormCheckbox
                      label="Horario Nocturno"
                      value={values.schedule.nocturnal}
                      onValueChange={(value) => setFieldValue('schedule.nocturnal', value)}
                    />
                  </View>
                </View>
                {touched.schedule && errors.schedule && typeof errors.schedule === 'string' && (
                  <Text style={styles.errorText}>{errors.schedule}</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sonómetro</Text>
                <FormPicker
                  label="Sonómetro"
                  value={values.soundMeter.selected}
                  onSelect={(value) => setFieldValue('soundMeter.selected', value)}
                  options={SOUND_METERS}
                  error={touched.soundMeter?.selected && errors.soundMeter?.selected ? errors.soundMeter.selected : undefined}
                  required
                />
                {values.soundMeter.selected === 'other' && (
                  <FormInput
                    label="Especifique el sonómetro"
                    value={values.soundMeter.other || ''}
                    onChangeText={(text) => setFieldValue('soundMeter.other', text)}
                    error={touched.soundMeter?.other && errors.soundMeter?.other ? errors.soundMeter.other : undefined}
                    placeholder="Ingrese el modelo del sonómetro"
                    required
                  />
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Calibrador</Text>
                <FormPicker
                  label="Calibrador"
                  value={values.calibrator.selected}
                  onSelect={(value) => setFieldValue('calibrator.selected', value)}
                  options={CALIBRATORS}
                  error={touched.calibrator?.selected && errors.calibrator?.selected ? errors.calibrator.selected : undefined}
                  required
                />
                {values.calibrator.selected === 'other' && (
                  <FormInput
                    label="Especifique el calibrador"
                    value={values.calibrator.other || ''}
                    onChangeText={(text) => setFieldValue('calibrator.other', text)}
                    error={touched.calibrator?.other && errors.calibrator?.other ? errors.calibrator.other : undefined}
                    placeholder="Ingrese el modelo del calibrador"
                    required
                  />
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estación Meteorológica</Text>
                <FormPicker
                  label="Estación meteorológica"
                  value={values.weatherStation.selected}
                  onSelect={(value) => setFieldValue('weatherStation.selected', value)}
                  options={WEATHER_STATIONS}
                  error={touched.weatherStation?.selected && errors.weatherStation?.selected ? errors.weatherStation.selected : undefined}
                  required
                />
                {values.weatherStation.selected === 'other' && (
                  <FormInput
                    label="Especifique la estación meteorológica"
                    value={values.weatherStation.other || ''}
                    onChangeText={(text) => setFieldValue('weatherStation.other', text)}
                    error={touched.weatherStation?.other && errors.weatherStation?.other ? errors.weatherStation.other : undefined}
                    placeholder="Ingrese el modelo de la estación"
                    required
                  />
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Método de Barrido Usado</Text>
                <FormPicker
                  label="Método de barrido usado"
                  value={values.scanningMethod}
                  onSelect={(value) => setFieldValue('scanningMethod', value)}
                  options={SCANNING_METHODS}
                  error={touched.scanningMethod && errors.scanningMethod ? errors.scanningMethod : undefined}
                  required
                  disabled={values.measurementType !== 'emission'}
                />
              </View>

            </View>
            );
          }}
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
  checkboxContainer: {
    gap: 12,
  },
  checkboxRow: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 4,
  },
});

export default TechnicalInfoScreen;