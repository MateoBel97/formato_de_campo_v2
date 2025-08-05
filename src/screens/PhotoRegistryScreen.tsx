import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';
import { Photo, MeasurementPoint, ScheduleType } from '../types';
import { addWatermarkToImage, formatTimestamp, formatCoordinates } from '../utils/imageUtils';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const PhotoRegistryScreen: React.FC = () => {
  const { state, addPhoto, deletePhoto: removePhoto } = useMeasurement();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    
    if (cameraStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de cámara para tomar fotos.');
    }
    if (locationStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de ubicación para agregar coordenadas a las fotos.');
    }
    if (mediaStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de galería para guardar las fotos.');
    }
  };


  const takePhoto = async (pointId: string, schedule: ScheduleType) => {
    const uploadKey = `${pointId}-${schedule}`;
    
    try {
      setUploadingPhotos(prev => new Set([...prev, uploadKey]));
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const timestamp = new Date().toISOString();
        const photoUri = result.assets[0].uri;
        
        // Create photo immediately for UI without watermark
        const tempPhoto: Photo = {
          id: Date.now().toString(),
          uri: photoUri,
          timestamp,
          location: null, // Se actualizará después
          pointId,
          schedule,
        };

        console.log('Adding new photo:', tempPhoto);
        addPhoto(tempPhoto);
        console.log('Photo added successfully');

        // Get GPS location in background for export metadata
        setTimeout(async () => {
          try {
            const locationResult = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
              timeInterval: 1000,
              distanceInterval: 0,
            });
            const location = {
              latitude: locationResult.coords.latitude,
              longitude: locationResult.coords.longitude,
            };

            console.log('GPS obtained for export metadata:', location);
            // Update photo with location for export
            // This would need to be implemented in the context to update existing photo
            
          } catch (error) {
            console.log('GPS not available, will export without location:', error);
          }
        }, 100);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
      console.error('Error taking photo:', error);
    } finally {
      setUploadingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert(
      'Eliminar Foto',
      '¿Estás seguro de que deseas eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removePhoto(photoId),
        },
      ]
    );
  };

  const getPhotosForPointSchedule = (pointId: string, schedule: ScheduleType): Photo[] => {
    if (!state.currentFormat?.photos) {
      console.log('No photos in current format');
      return [];
    }
    const filteredPhotos = state.currentFormat.photos.filter(
      photo => photo.pointId === pointId && photo.schedule === schedule
    );
    console.log(`Found ${filteredPhotos.length} photos for point ${pointId} and schedule ${schedule}`);
    return filteredPhotos;
  };

  const getPointScheduleCombinations = () => {
    if (!state.currentFormat?.measurementPoints || !state.currentFormat?.technicalInfo) {
      return [];
    }

    const combinations: Array<{ point: MeasurementPoint; schedule: ScheduleType }> = [];
    const { diurnal, nocturnal } = state.currentFormat.technicalInfo.schedule;

    state.currentFormat.measurementPoints.forEach(point => {
      if (diurnal) {
        combinations.push({ point, schedule: 'diurnal' });
      }
      if (nocturnal) {
        combinations.push({ point, schedule: 'nocturnal' });
      }
    });

    return combinations;
  };

  const formatLocation = (location: { latitude: number; longitude: number } | null) => {
    if (!location) return 'Sin ubicación';
    return formatCoordinates(location.latitude, location.longitude);
  };

  const getScheduleColor = (schedule: ScheduleType) => {
    return schedule === 'diurnal' ? COLORS.diurnal : COLORS.nocturnal;
  };

  const getScheduleLabel = (schedule: ScheduleType) => {
    return schedule === 'diurnal' ? 'Diurno' : 'Nocturno';
  };

  const combinations = getPointScheduleCombinations();
  
  console.log('Current format photos:', state.currentFormat?.photos?.length || 0);
  console.log('Point-schedule combinations:', combinations.length);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registro Fotográfico</Text>
        <Text style={styles.subtitle}>
          Toma fotos de cada punto y horario de medición
        </Text>
      </View>

      {combinations.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="camera-off" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            Configura primero los puntos de medición y horarios en las secciones anteriores
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {combinations.map(({ point, schedule }) => {
            const photos = getPhotosForPointSchedule(point.id, schedule);
            const uploadKey = `${point.id}-${schedule}`;
            const isUploading = uploadingPhotos.has(uploadKey);
            
            return (
              <View key={`${point.id}-${schedule}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.pointName}>{point.name}</Text>
                  <View
                    style={[
                      styles.scheduleBadge,
                      { backgroundColor: getScheduleColor(schedule) },
                    ]}
                  >
                    <Text style={styles.scheduleBadgeText}>
                      {getScheduleLabel(schedule)}
                    </Text>
                  </View>
                </View>

                <View style={styles.photosContainer}>
                  {photos.length === 0 ? (
                    <View style={styles.noPhotos}>
                      <Feather name="image" size={32} color={COLORS.textSecondary} />
                      <Text style={styles.noPhotosText}>Sin fotos</Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {photos.map((photo) => (
                        <View key={photo.id} style={styles.photoContainer}>
                          <TouchableOpacity
                            onPress={() => setSelectedPhoto(photo)}
                            style={styles.photoThumbnail}
                          >
                            <Image 
                              source={{ uri: photo.uri }} 
                              style={styles.photo}
                              onError={(error) => {
                                console.error('Error loading image:', error);
                              }}
                              onLoad={() => {
                                console.log('Image loaded successfully:', photo.uri);
                              }}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeletePhoto(photo.id)}
                          >
                            <Feather name="trash-2" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.cameraButton, isUploading && styles.cameraButtonDisabled]}
                  onPress={() => takePhoto(point.id, schedule)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <ActivityIndicator size="small" color={COLORS.surface} />
                      <Text style={styles.cameraButtonText}>Guardando...</Text>
                    </>
                  ) : (
                    <>
                      <Feather name="camera" size={20} color={COLORS.surface} />
                      <Text style={styles.cameraButtonText}>Tomar Foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={selectedPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalBackground}
              onPress={() => setSelectedPhoto(null)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalles de la Foto</Text>
                <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                  <Feather name="x" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              
              <Image 
                source={{ uri: selectedPhoto.uri }} 
                style={styles.modalPhoto}
                onError={(error) => {
                  console.error('Error loading modal image:', error);
                }}
                resizeMode="contain"
              />
              
              <View style={styles.photoDetails}>
                <Text style={styles.detailLabel}>Fecha y Hora:</Text>
                <Text style={styles.detailValue}>
                  {formatTimestamp(selectedPhoto.timestamp)}
                </Text>
                
                <Text style={styles.detailLabel}>Ubicación:</Text>
                <Text style={styles.detailValue}>
                  {formatLocation(selectedPhoto.location)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  grid: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  scheduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleBadgeText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  photosContainer: {
    minHeight: 80,
    marginBottom: 12,
  },
  noPhotos: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  noPhotosText: {
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  photoContainer: {
    marginRight: 8,
    position: 'relative',
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cameraButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cameraButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraButtonDisabled: {
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    width: width - 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  photoDetails: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
});

export default PhotoRegistryScreen;