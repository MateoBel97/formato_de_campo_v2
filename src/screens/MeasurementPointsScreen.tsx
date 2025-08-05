import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import LocationPicker from '../components/LocationPicker';
import { COLORS } from '../constants';
import { MeasurementPoint } from '../types';

const validationSchema = Yup.object({
  name: Yup.string().required('El nombre del punto es requerido'),
  coordinatesN: Yup.string()
    .matches(/^\d+\.?\d*$/, 'Formato de coordenadas inválido'),
  coordinatesW: Yup.string()
    .matches(/^\d+\.?\d*$/, 'Formato de coordenadas inválido'),
});

const MeasurementPointsScreen: React.FC = () => {
  const { state, addMeasurementPoint, deleteMeasurementPoint, updateMeasurementPoint, saveCurrentFormat } = useMeasurement();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MeasurementPoint | null>(null);

  const currentFormat = state.currentFormat;
  const measurementPoints = currentFormat?.measurementPoints || [];

  const getInitialValues = () => {
    if (editingPoint) {
      return {
        name: editingPoint.name,
        coordinatesN: editingPoint.coordinatesN,
        coordinatesW: editingPoint.coordinatesW,
      };
    }
    return {
      name: '',
      coordinatesN: '',
      coordinatesW: '',
    };
  };

  const handleSubmitPoint = async (values: ReturnType<typeof getInitialValues>) => {
    try {
      setIsAdding(true);
      
      if (editingPoint) {
        // Editar punto existente
        const updatedPoint: MeasurementPoint = {
          ...editingPoint,
          name: values.name,
          coordinatesN: values.coordinatesN,
          coordinatesW: values.coordinatesW,
        };

        updateMeasurementPoint(editingPoint.id, updatedPoint);
        await saveCurrentFormat();
        setEditingPoint(null);
      } else {
        // Agregar nuevo punto
        const newPoint: MeasurementPoint = {
          id: Date.now().toString(),
          name: values.name,
          coordinatesN: values.coordinatesN,
          coordinatesW: values.coordinatesW,
        };

        addMeasurementPoint(newPoint);
        await saveCurrentFormat();
        setShowAddForm(false);
      }
    } catch (error) {
      Alert.alert('Error', editingPoint ? 'No se pudo actualizar el punto de medición' : 'No se pudo agregar el punto de medición');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePoint = (point: MeasurementPoint) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el punto "${point.name}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            deleteMeasurementPoint(point.id);
            await saveCurrentFormat();
          },
        },
      ]
    );
  };

  const handleEditPoint = (point: MeasurementPoint) => {
    setEditingPoint(point);
    setShowAddForm(false);
  };

  const renderPointItem = (point: MeasurementPoint, index: number) => (
    <TouchableOpacity 
      key={point.id} 
      style={styles.pointItem}
      onPress={() => handleEditPoint(point)}
      activeOpacity={0.7}
    >
      <View style={styles.pointHeader}>
        <View style={styles.pointNumber}>
          <Text style={styles.pointNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.pointInfo}>
          <Text style={styles.pointName}>{point.name}</Text>
          <Text style={styles.pointCoordinates}>
            N: {point.coordinatesN} | W: {point.coordinatesW}
          </Text>
        </View>
        <View style={styles.pointActions}>
          <TouchableOpacity
            style={styles.editPointButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditPoint(point);
            }}
          >
            <Feather name="edit-2" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deletePointButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeletePoint(point);
            }}
          >
            <Feather name="trash-2" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="map-pin" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No hay puntos de medición</Text>
      <Text style={styles.emptySubtitle}>
        Agrega puntos de medición para comenzar a registrar datos
      </Text>
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
        <View style={styles.header}>
          <Text style={styles.title}>Puntos de Medición</Text>
          <Text style={styles.subtitle}>
            {measurementPoints.length} punto{measurementPoints.length !== 1 ? 's' : ''} agregado{measurementPoints.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {measurementPoints.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.pointsList}>
            {measurementPoints.map((point, index) => renderPointItem(point, index))}
          </View>
        )}

        {!showAddForm && !editingPoint ? (
          <FormButton
            title="Agregar Punto de Medición"
            onPress={() => setShowAddForm(true)}
            size="large"
            style={styles.addButton}
          />
        ) : (
          <View style={styles.addForm}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingPoint ? 'Editar Punto de Medición' : 'Nuevo Punto de Medición'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddForm(false);
                  setEditingPoint(null);
                }}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Formik
              key={editingPoint?.id || 'new'}
              initialValues={getInitialValues()}
              validationSchema={validationSchema}
              onSubmit={handleSubmitPoint}
              enableReinitialize
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue, resetForm }) => (
                <View>
                  <FormInput
                    label="Nombre del punto"
                    value={values.name}
                    onChangeText={handleChange('name')}
                    error={touched.name && errors.name ? errors.name : undefined}
                    placeholder="Ej: Punto 1, Entrada principal, etc."
                    required
                  />

                  <LocationPicker
                    coordinatesN={values.coordinatesN}
                    coordinatesW={values.coordinatesW}
                    onCoordinatesChange={(n, w) => {
                      setFieldValue('coordinatesN', n);
                      setFieldValue('coordinatesW', w);
                    }}
                    errors={{
                      coordinatesN: touched.coordinatesN && errors.coordinatesN ? errors.coordinatesN : undefined,
                      coordinatesW: touched.coordinatesW && errors.coordinatesW ? errors.coordinatesW : undefined,
                    }}
                  />

                  <View style={styles.formButtons}>
                    <FormButton
                      title="Cancelar"
                      onPress={() => {
                        resetForm();
                        setShowAddForm(false);
                        setEditingPoint(null);
                      }}
                      variant="outline"
                      style={styles.cancelButton}
                    />
                    <FormButton
                      title={isAdding ? (editingPoint ? 'Actualizando...' : 'Agregando...') : (editingPoint ? 'Actualizar Punto' : 'Agregar Punto')}
                      onPress={handleSubmit}
                      loading={isAdding}
                      style={styles.submitButton}
                    />
                  </View>
                </View>
              )}
            </Formik>
          </View>
        )}
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  pointsList: {
    marginBottom: 24,
  },
  pointItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pointNumberText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  pointCoordinates: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  pointActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPointButton: {
    padding: 8,
    marginRight: 4,
  },
  deletePointButton: {
    padding: 8,
  },
  addButton: {
    marginBottom: 32,
  },
  addForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 32,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
});

export default MeasurementPointsScreen;