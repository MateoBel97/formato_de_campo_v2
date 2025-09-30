import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import FormInput from './FormInput';
import FormButton from './FormButton';
import { COLORS } from '../constants';
import { convertDecimalToDMS, isValidDMSFormat } from '../utils/numberUtils';

interface LocationPickerProps {
  coordinatesN: string;
  coordinatesW: string;
  onCoordinatesChange: (coordinatesN: string, coordinatesW: string) => void;
  errors?: {
    coordinatesN?: string;
    coordinatesW?: string;
  };
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  coordinatesN,
  coordinatesW,
  onCoordinatesChange,
  errors,
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Se necesitan permisos de ubicación para obtener las coordenadas GPS.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      const latitudeDMS = convertDecimalToDMS(Math.abs(latitude));
      const longitudeDMS = convertDecimalToDMS(Math.abs(longitude));
      
      onCoordinatesChange(latitudeDMS, longitudeDMS);
      
      Alert.alert(
        'Ubicación obtenida',
        `Coordenadas actualizadas:\nN: ${latitudeDMS}\nW: ${longitudeDMS}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo obtener la ubicación. Verifique que el GPS esté activado.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Coordenadas GPS</Text>
      
      <View style={styles.coordinatesContainer}>
        <View style={styles.coordinateInput}>
          <FormInput
            label="Coordenadas N"
            value={coordinatesN}
            onChangeText={(text) => onCoordinatesChange(text, coordinatesW)}
            error={errors?.coordinatesN}
            placeholder="0°00.0'00.00&quot;"
          />
        </View>
        
        <View style={styles.coordinateInput}>
          <FormInput
            label="Coordenadas W"
            value={coordinatesW}
            onChangeText={(text) => onCoordinatesChange(coordinatesN, text)}
            error={errors?.coordinatesW}
            placeholder="0°00.0'00.00&quot;"
          />
        </View>
      </View>

      <FormButton
        title={loadingLocation ? 'Obteniendo ubicación...' : 'Obtener ubicación GPS'}
        onPress={getCurrentLocation}
        loading={loadingLocation}
        variant="outline"
        style={styles.gpsButton}
      />
      
      <View style={styles.infoContainer}>
        <Feather name="info" size={16} color={COLORS.info} />
        <Text style={styles.infoText}>
          Presiona el botón para obtener automáticamente las coordenadas de tu ubicación actual.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  gpsButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '20',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default LocationPicker;