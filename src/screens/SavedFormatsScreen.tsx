import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormButton from '../components/FormButton';
import { MeasurementFormat } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type SavedFormatsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SavedFormats'>;

const SavedFormatsScreen: React.FC = () => {
  const navigation = useNavigation<SavedFormatsScreenNavigationProp>();
  const { state, loadFormat, deleteFormat, loadSavedFormats } = useMeasurement();

  useEffect(() => {
    loadSavedFormats();
  }, []);

  const handleSelectFormat = (measurementFormat: MeasurementFormat) => {
    loadFormat(measurementFormat);
    navigation.navigate('MeasurementForm');
  };

  const handleDeleteFormat = (measurementFormat: MeasurementFormat) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el formato "${measurementFormat.generalInfo.company}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteFormat(measurementFormat.id),
        },
      ]
    );
  };

  const renderFormatItem = ({ item }: { item: MeasurementFormat }) => {
    const { company, date, workOrder } = item.generalInfo;
    const formattedDate = format(new Date(date), 'dd/MM/yyyy', { locale: es });
    const workOrderString = `OT-${workOrder.type}-${workOrder.number}-${workOrder.year}`;

    return (
      <TouchableOpacity
        style={styles.formatItem}
        onPress={() => handleSelectFormat(item)}
      >
        <View style={styles.formatHeader}>
          <Text style={styles.companyName}>{company || 'Sin nombre'}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteFormat(item)}
          >
            <Feather name="trash-2" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.formatDetails}>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Fecha: </Text>
            {formattedDate}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Orden: </Text>
            {workOrderString}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Puntos: </Text>
            {item.measurementPoints.length}
          </Text>
        </View>

        <View style={styles.formatFooter}>
          <Text style={styles.updateText}>
            Actualizado: {format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
          </Text>
          <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="folder" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No hay formatos guardados</Text>
      <Text style={styles.emptySubtitle}>
        Crea tu primer formato de medición para comenzar
      </Text>
      <FormButton
        title="Crear Nuevo Formato"
        onPress={() => navigation.navigate('Home')}
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Formatos Guardados</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={state.savedFormats}
        renderItem={renderFormatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  formatItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  formatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  formatDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  formatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    marginBottom: 32,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
});

export default SavedFormatsScreen;