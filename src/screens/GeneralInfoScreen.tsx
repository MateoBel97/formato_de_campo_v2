import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import DatePicker from '../components/DatePicker';
import FormButton from '../components/FormButton';
import { COLORS, WORK_ORDER_TYPES } from '../constants';
import { GeneralInfo } from '../types';

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
  const { state, updateGeneralInfo, saveCurrentFormat } = useMeasurement();
  const [isSaving, setIsSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<GeneralInfo | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-save function with change detection
  const autoSave = async (values: GeneralInfo) => {
    // Check if values have actually changed from the initial values
    if (!initialValues || JSON.stringify(values) === JSON.stringify(initialValues)) {
      console.log('General info auto-save skipped: no changes detected');
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        updateGeneralInfo(values);
        setTimeout(async () => {
          try {
            await saveCurrentFormat();
            console.log('General info auto-saved successfully');
          } catch (error) {
            console.error('Error auto-saving general info:', error);
          }
        }, 100);
      } catch (error) {
        console.error('Error updating general info:', error);
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

  const handleSubmit = async (values: GeneralInfo) => {
    try {
      setIsSaving(true);
      updateGeneralInfo(values);
      await saveCurrentFormat();
      Alert.alert('Éxito', 'Información general guardada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la información');
      console.error('Error saving general info:', error);
    } finally {
      setIsSaving(false);
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
        {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => {
          // Auto-save when values change
          useEffect(() => {
            autoSave(values);
          }, [values]);

          return (
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
                    onChangeText={(text) => setFieldValue('workOrder.number', text)}
                    error={
                      touched.workOrder?.number && errors.workOrder?.number
                        ? errors.workOrder.number
                        : undefined
                    }
                    keyboardType="numeric"
                    placeholder="000"
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
            <View style={styles.bottomSpacing} />
          </View>
          );
        }}
      </Formik>
      )}
      
      {!initialValues && (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Cargando información general...</Text>
        </View>
      )}
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
    marginBottom: 32,
  },
  bottomSpacing: {
    height: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default GeneralInfoScreen;