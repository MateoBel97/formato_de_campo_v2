import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Dimensions, Alert } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Feather } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import LocationPicker from '../components/LocationPicker';
import ConfirmDialog from '../components/ConfirmDialog';
import { COLORS } from '../constants';
import { MeasurementPoint } from '../types';
import { isValidDMSFormat } from '../utils/numberUtils';

const validationSchema = Yup.object({
  name: Yup.string().required('El nombre del punto es requerido'),
  coordinatesN: Yup.string()
    .test('is-dms-format', 'Formato DMS inválido (0°00.0\'00.00")', isValidDMSFormat),
  coordinatesW: Yup.string()
    .test('is-dms-format', 'Formato DMS inválido (0°00.0\'00.00")', isValidDMSFormat),
});

const MeasurementPointsScreen: React.FC = () => {
  const { state, addMeasurementPoint, deleteMeasurementPoint, updateMeasurementPoint, reorderMeasurementPoints, saveCurrentFormat } = useMeasurement();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MeasurementPoint | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [pointToDelete, setPointToDelete] = useState<MeasurementPoint | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const formContainerRef = useRef<View>(null);
  const nameInputRef = useRef<View>(null);

  const currentFormat = state.currentFormat;
  const measurementPoints = currentFormat?.measurementPoints || [];

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Function to scroll to form when it opens - always executes
  const scrollToForm = () => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        if (formContainerRef.current) {
          // Try to use measureInWindow for precise positioning
          formContainerRef.current.measureInWindow((x, y, width, height) => {
            if (y !== undefined && y > 0) {
              // Position the form title at the top with some margin
              const marginFromTop = 80; // Margin to show title clearly
              const scrollPosition = Math.max(0, y - marginFromTop);
              
              scrollViewRef.current?.scrollTo({ 
                y: scrollPosition, 
                animated: true 
              });
            } else {
              // Fallback: scroll to where the form typically appears
              const approximateFormPosition = measurementPoints.length * 120 + 200; // Approximate position
              scrollViewRef.current?.scrollTo({ 
                y: approximateFormPosition, 
                animated: true 
              });
            }
          });
        } else {
          // Final fallback: scroll to where the form typically appears
          const approximateFormPosition = measurementPoints.length * 120 + 200; // Approximate position
          scrollViewRef.current?.scrollTo({ 
            y: approximateFormPosition, 
            animated: true 
          });
        }
      }, 400); // Increase timeout to ensure form is fully rendered
    }
  };
  

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
        setShowAddForm(false);
      } else {
        // Agregar nuevo punto
        const newPoint: MeasurementPoint = {
          id: Date.now().toString(),
          name: values.name,
          coordinatesN: values.coordinatesN,
          coordinatesW: values.coordinatesW,
        };

        const saveSuccess = await addMeasurementPoint(newPoint);
        if (saveSuccess) {
          setShowAddForm(false);
        } else {
          Alert.alert('Advertencia de Guardado', 'El punto se agregó pero puede que no se haya guardado correctamente. Revisa la lista de puntos.');
          setShowAddForm(false);
        }
      }
    } catch (error) {
      console.error('Error in handleSubmitPoint:', error);
      Alert.alert('Error', editingPoint ? 'No se pudo actualizar el punto de medición' : 'No se pudo agregar el punto de medición');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePoint = (point: MeasurementPoint) => {
    setPointToDelete(point);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (pointToDelete) {
      await deleteMeasurementPoint(pointToDelete.id);
      setPointToDelete(null);
    }
  };

  const handleEditPoint = (point: MeasurementPoint) => {
    setEditingPoint(point);
    setShowAddForm(false);
    // Scroll to form after state update
    setTimeout(scrollToForm, 150);
  };

  const renderPointItem = ({ item, drag, isActive, getIndex }: RenderItemParams<MeasurementPoint>) => {
    const index = getIndex();
    return (
    <ScaleDecorator>
      <TouchableOpacity
        style={[
          styles.pointItem,
          isActive && styles.pointItemActive,
        ]}
        onPress={() => handleEditPoint(item)}
        activeOpacity={0.7}
        disabled={isActive}
      >
        <View style={styles.pointHeader}>
          <View style={styles.pointNumber}>
            <Text style={styles.pointNumberText}>{(index !== undefined ? index : 0) + 1}</Text>
          </View>
          <View style={styles.pointInfo}>
            <Text style={styles.pointName}>{item.name}</Text>
            <Text style={styles.pointCoordinates}>
              N: {item.coordinatesN} | W: {item.coordinatesW}
            </Text>
          </View>
          <View style={styles.pointActions}>
            <TouchableOpacity
              style={styles.editPointButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditPoint(item);
              }}
            >
              <Feather name="edit-2" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deletePointButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeletePoint(item);
              }}
            >
              <Feather name="trash-2" size={20} color={COLORS.error} />
            </TouchableOpacity>
            {/* Drag handle removed from UI - functionality preserved in code */}
          </View>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
    );
  };

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

  const renderListHeader = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Puntos de Medición</Text>
        <Text style={styles.subtitle}>
          {measurementPoints.length} punto{measurementPoints.length !== 1 ? 's' : ''} agregado{measurementPoints.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  const renderListFooter = () => (
    <View style={styles.content}>
      {!showAddForm && !editingPoint ? (
          <FormButton
            title="Agregar Punto de Medición"
            onPress={() => {
              setShowAddForm(true);
              // Scroll to form after state update
              setTimeout(scrollToForm, 150);
            }}
            size="large"
            style={styles.addButton}
          />
        ) : (
          <View ref={formContainerRef} style={styles.addForm}>
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
                  <View ref={nameInputRef}>
                    <FormInput
                      label="Nombre del punto"
                      value={values.name}
                      onChangeText={handleChange('name')}
                      error={touched.name && errors.name ? errors.name : undefined}
                      placeholder="Ej: Punto 1, Entrada principal, etc."
                      required
                      selectTextOnFocus={false}
                    />
                  </View>

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
                      onPress={() => handleSubmit()}
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
  );

  if (measurementPoints.length === 0) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 50 : 50 }
          ]}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Puntos de Medición</Text>
              <Text style={styles.subtitle}>
                0 puntos agregados
              </Text>
            </View>
            {renderEmptyState()}
            {renderListFooter()}
          </View>
        </ScrollView>

        <ConfirmDialog
          visible={showDeleteDialog}
          title="Confirmar eliminación"
          message={`¿Está seguro de que desea eliminar el punto "${pointToDelete?.name || 'Sin nombre'}"?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setPointToDelete(null);
          }}
          confirmColor={COLORS.error}
          icon="trash-2"
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraggableFlatList
        data={measurementPoints}
        renderItem={renderPointItem}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => reorderMeasurementPoints(data)}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 50 : 50 }}
        showsVerticalScrollIndicator={false}
      />

      <ConfirmDialog
      visible={showDeleteDialog}
      title="Confirmar eliminación"
      message={`¿Está seguro de que desea eliminar el punto "${pointToDelete?.name || 'Sin nombre'}"?`}
      confirmText="Eliminar"
      cancelText="Cancelar"
      useHoldToDelete={true}
      onConfirm={confirmDelete}
      onCancel={() => {
        setShowDeleteDialog(false);
        setPointToDelete(null);
      }}
      confirmColor={COLORS.error}
      icon="trash-2"
    />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
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
  pointItemActive: {
    opacity: 0.8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
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
  dragHandle: {
    padding: 8,
    marginLeft: 4,
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