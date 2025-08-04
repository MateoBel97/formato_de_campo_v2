import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import NativeTimePicker from '../components/NativeTimePicker';
import { COLORS } from '../constants';
import { ExternalEvent } from '../types';

const validationSchema = Yup.object({
  name: Yup.string().required('El nombre del evento es requerido'),
  level: Yup.string()
    .matches(/^\d+\.?\d*$/, 'Formato de nivel inválido')
    .required('El nivel es requerido'),
  time: Yup.string().required('La hora es requerida'),
  duration: Yup.string()
    .matches(/^\d+\.?\d*$/, 'Formato de duración inválido')
    .required('La duración es requerida'),
});

const ExternalEventsScreen: React.FC = () => {
  const { state, addExternalEvent, deleteExternalEvent, updateExternalEvent } = useMeasurement();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExternalEvent | null>(null);

  const currentFormat = state.currentFormat;
  const externalEvents = currentFormat?.externalEvents || [];

  const getInitialValues = () => {
    if (editingEvent) {
      return {
        name: editingEvent.name,
        level: editingEvent.level.toString(),
        time: editingEvent.time,
        duration: editingEvent.duration.toString(),
      };
    }
    return {
      name: '',
      level: '',
      time: '',
      duration: '',
    };
  };

  const handleSubmitEvent = async (values: ReturnType<typeof getInitialValues>) => {
    try {
      setIsAdding(true);
      
      if (editingEvent) {
        // Editar evento existente
        const updatedEvent: ExternalEvent = {
          ...editingEvent,
          name: values.name,
          level: parseFloat(values.level) || 0,
          time: values.time,
          duration: parseFloat(values.duration) || 0,
        };

        updateExternalEvent(editingEvent.id, updatedEvent);
        setEditingEvent(null);
        Alert.alert('Éxito', 'Evento externo actualizado correctamente');
      } else {
        // Agregar nuevo evento
        const newEvent: ExternalEvent = {
          id: Date.now().toString(),
          name: values.name,
          level: parseFloat(values.level) || 0,
          time: values.time,
          duration: parseFloat(values.duration) || 0,
        };

        addExternalEvent(newEvent);
        setShowAddForm(false);
        Alert.alert('Éxito', 'Evento externo agregado correctamente');
      }
    } catch (error) {
      Alert.alert('Error', editingEvent ? 'No se pudo actualizar el evento externo' : 'No se pudo agregar el evento externo');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteEvent = (event: ExternalEvent) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el evento "${event.name}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteExternalEvent(event.id),
        },
      ]
    );
  };

  const handleEditEvent = (event: ExternalEvent) => {
    setEditingEvent(event);
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    setShowAddForm(false);
  };

  const renderEventCard = (event: ExternalEvent, index: number) => (
    <View key={event.id} style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIndex}>
          <Text style={styles.eventIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventDetails}>
            Nivel: {event.level} dBA • Hora: {event.time} • Duración: {event.duration} min
          </Text>
        </View>
        <View style={styles.eventActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditEvent(event)}
          >
            <Feather name="edit-2" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteEvent(event)}
          >
            <Feather name="trash-2" size={18} color={COLORS.error} />
          </TouchableOpacity>
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
        <Text style={styles.title}>Eventos Externos</Text>
        <Text style={styles.subtitle}>
          Registre los eventos externos que puedan afectar las mediciones acústicas
        </Text>

        {/* Lista de eventos */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Eventos registrados ({externalEvents.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Feather name="plus" size={20} color={COLORS.surface} />
              <Text style={styles.addButtonText}>Agregar evento</Text>
            </TouchableOpacity>
          </View>

          {externalEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="alert-triangle" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No hay eventos externos registrados</Text>
              <Text style={styles.emptyText}>
                Toque "Agregar evento" para registrar el primer evento externo
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {externalEvents.map((event, index) => renderEventCard(event, index))}
            </View>
          )}
        </View>

        {/* Formulario de agregar/editar */}
        {showAddForm && (
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingEvent ? 'Editar evento externo' : 'Agregar evento externo'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancelEdit}
              >
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Formik
              initialValues={getInitialValues()}
              validationSchema={validationSchema}
              onSubmit={handleSubmitEvent}
              enableReinitialize
            >
              {({ values, errors, touched, handleChange, handleSubmit, setFieldValue }) => (
                <View style={styles.form}>
                  <FormInput
                    label="Nombre del evento"
                    value={values.name}
                    onChangeText={handleChange('name')}
                    error={touched.name && errors.name}
                    placeholder="Ej: Paso de vehículo pesado"
                    required
                  />

                  <FormInput
                    label="Nivel (dBA)"
                    value={values.level}
                    onChangeText={handleChange('level')}
                    error={touched.level && errors.level}
                    keyboardType="numeric"
                    placeholder="0.0"
                    required
                  />

                  <NativeTimePicker
                    label="Hora del evento"
                    value={values.time}
                    onTimeChange={(time) => setFieldValue('time', time)}
                    required
                  />

                  <FormInput
                    label="Duración (minutos)"
                    value={values.duration}
                    onChangeText={handleChange('duration')}
                    error={touched.duration && errors.duration}
                    keyboardType="numeric"
                    placeholder="0.0"
                    required
                  />

                  <View style={styles.formActions}>
                    <FormButton
                      title="Cancelar"
                      onPress={handleCancelEdit}
                      variant="secondary"
                      style={styles.cancelButton}
                    />
                    <FormButton
                      title={isAdding ? 'Guardando...' : (editingEvent ? 'Actualizar' : 'Agregar')}
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
  eventsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventIndexText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '10',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
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
    textAlign: 'center',
  },
});

export default ExternalEventsScreen;