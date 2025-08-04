import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useMeasurement } from '../context/MeasurementContext';
import FormCheckbox from '../components/FormCheckbox';
import { COLORS } from '../constants';

const InspectionScreen: React.FC = () => {
  const { state, updateInspectionData } = useMeasurement();

  const handleCheckboxChange = (field: string, value: boolean) => {
    if (!state.currentFormat) return;
    
    const updatedInspection = {
      ...state.currentFormat.inspection,
      [field]: value,
    };
    
    updateInspectionData(updatedInspection);
  };

  const inspectionItems = [
    {
      key: 'pointAssignment',
      label: 'Barrido para asignación de puntos a 1.5m (Según aplique)',
    },
    {
      key: 'calibrationVerification',
      label: 'Verificación de calibración acústica previa',
    },
    {
      key: 'parametersVerification',
      label: 'Verificación los parámetros requeridos',
    },
    {
      key: 'batteryStatus',
      label: 'Confirmar estado de baterías al 100%',
    },
    {
      key: 'timeSynchronization',
      label: 'Asegurar sincronización de hora y fecha con las actuales.',
    },
    {
      key: 'weatherStationTests',
      label: 'Pruebas funcionales de la estación meteorológica',
    },
    {
      key: 'weatherConditionsRecord',
      label: 'Registro de valores de condiciones meteorológicas',
    },
  ];

  if (!state.currentFormat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>No hay formato activo</Text>
          <Text style={styles.subtitle}>
            Crea un nuevo formato o carga uno existente para continuar
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Inspección Previa</Text>
            <Text style={styles.subtitle}>
              Verificaciones técnicas antes de iniciar las mediciones
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lista de Verificación</Text>
            
            {inspectionItems.map((item, index) => (
              <View key={item.key} style={styles.checkboxContainer}>
                <FormCheckbox
                  label={item.label}
                  value={state.currentFormat.inspection[item.key] || false}
                  onValueChange={(value) => handleCheckboxChange(item.key, value)}
                  style={styles.checkbox}
                />
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Complete todas las verificaciones antes de proceder con las mediciones
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  checkboxContainer: {
    marginBottom: 16,
  },
  checkbox: {
    paddingVertical: 8,
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.info + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default InspectionScreen;