import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import FormInput from './FormInput';
import FormButton from './FormButton';
import FormPicker from './FormPicker';
import { COLORS, COORDINATE_ORIGINS } from '../constants';
import { convertDecimalToDMS, isValidDMSFormat } from '../utils/numberUtils';
import {
  geographicToPlane,
  formatPlaneCoordinates,
  parseCoordinate,
  MAGNA_SIRGAS_ORIGINS
} from '../utils/coordinateUtils';

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
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [planeCoordinates, setPlaneCoordinates] = useState<{ east: number; north: number } | null>(null);

  // Calculate plane coordinates when coordinates or origin change
  useEffect(() => {
    if (coordinatesN && coordinatesW && selectedOrigin) {
      try {
        // Parse DMS coordinates to decimal degrees
        const latDecimal = parseCoordinate(coordinatesN);
        const lonDecimal = parseCoordinate(coordinatesW);

        if (latDecimal !== null && lonDecimal !== null) {
          // Find the selected origin
          const origin = MAGNA_SIRGAS_ORIGINS.find(o => o.code === selectedOrigin);

          if (origin) {
            // Convert to plane coordinates (longitude should be negative for West)
            const plane = geographicToPlane(latDecimal, -lonDecimal, origin);
            setPlaneCoordinates(plane);
          }
        } else {
          setPlaneCoordinates(null);
        }
      } catch (error) {
        console.error('Error calculating plane coordinates:', error);
        setPlaneCoordinates(null);
      }
    } else {
      setPlaneCoordinates(null);
    }
  }, [coordinatesN, coordinatesW, selectedOrigin]);

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

      {/* Coordinate Origin Selector and Plane Coordinates */}
      {coordinatesN && coordinatesW && (
        <View style={styles.planeCoordinatesSection}>
          <Text style={styles.sectionTitle}>Coordenadas Planas MAGNA-SIRGAS</Text>

          <FormPicker
            label="Origen de Coordenadas"
            selectedValue={selectedOrigin}
            onValueChange={setSelectedOrigin}
            items={COORDINATE_ORIGINS}
            placeholder="Seleccione el origen"
          />

          {planeCoordinates && selectedOrigin && (
            <View style={styles.planeCoordinatesDisplay}>
              <View style={styles.planeCoordinateRow}>
                <Text style={styles.planeCoordinateLabel}>Este:</Text>
                <Text style={styles.planeCoordinateValue}>
                  {planeCoordinates.east.toFixed(2)} m
                </Text>
              </View>
              <View style={styles.planeCoordinateRow}>
                <Text style={styles.planeCoordinateLabel}>Norte:</Text>
                <Text style={styles.planeCoordinateValue}>
                  {planeCoordinates.north.toFixed(2)} m
                </Text>
              </View>
            </View>
          )}

          {!selectedOrigin && (
            <View style={[styles.infoContainer, { marginTop: 12 }]}>
              <Feather name="info" size={16} color={COLORS.info} />
              <Text style={styles.infoText}>
                Selecciona un origen para calcular las coordenadas planas.
              </Text>
            </View>
          )}
        </View>
      )}
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
  planeCoordinatesSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  planeCoordinatesDisplay: {
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  planeCoordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planeCoordinateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  planeCoordinateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default LocationPicker;