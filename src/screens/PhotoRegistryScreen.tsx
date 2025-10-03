import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';
import { Photo, MeasurementPoint, ScheduleType } from '../types';
import { addWatermarkToImage, formatTimestamp, formatCoordinates, copyImageToPermanentStorage } from '../utils/imageUtils';
import WebCameraModal from '../components/WebCameraModal';
import ConfirmDialog from '../components/ConfirmDialog';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export interface PhotoRegistryScreenRef {
  scrollToCroquis: () => void;
}

const PhotoRegistryScreen = forwardRef<PhotoRegistryScreenRef>((props, ref) => {
  const { state, addPhoto, updatePhoto, deletePhoto: removePhoto } = useMeasurement();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
  const [cameraStatus, setCameraStatus] = useState<'unknown' | 'available' | 'unavailable' | 'checking'>('unknown');
  const [webCameraVisible, setWebCameraVisible] = useState(false);
  const [currentPhotoContext, setCurrentPhotoContext] = useState<{
    pointId?: string;
    schedule?: ScheduleType;
    photoType: 'measurement' | 'croquis';
  } | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    requestPermissions();
    checkCameraStatus();
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToCroquis: () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    },
  }));

  // Check camera availability status
  const checkCameraStatus = async () => {
    setCameraStatus('checking');
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status === 'granted') {
        setCameraStatus('available');
      } else {
        setCameraStatus('unavailable');
      }
    } catch (error) {
      console.error('Error checking camera status:', error);
      setCameraStatus('unavailable');
    }
  };

  // Escuchar errores del contexto y mostrar alertas
  useEffect(() => {
    if (state.error) {
      Alert.alert(
        'Error de Almacenamiento',
        state.error,
        [{ text: 'OK' }]
      );
      // No limpiar el error aquí, se limpiará cuando sea necesario en el contexto
    }
  }, [state.error]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    
    if (cameraStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de cámara para tomar fotos.');
    }
    if (galleryStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de galería para seleccionar fotos.');
    }
    if (locationStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de ubicación para agregar coordenadas a las fotos.');
    }
    if (mediaStatus !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de galería para guardar las fotos.');
    }
  };

  // Enhanced permission checking before taking photos
  const checkAndRequestCameraPermissions = async (): Promise<boolean> => {
    try {
      setCameraStatus('checking');
      
      // Check current permission status
      const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
      
      if (currentStatus === 'granted') {
        setCameraStatus('available');
        return true;
      }
      
      // Request permission if not granted
      const { status: requestedStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (requestedStatus !== 'granted') {
        setCameraStatus('unavailable');
        Alert.alert(
          'Permisos de Cámara Requeridos',
          'Para tomar fotos, necesitas habilitar los permisos de cámara en la configuración de tu dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Configuración', 
              onPress: () => {
                // On some devices, this might open settings
                Alert.alert(
                  'Abrir Configuración',
                  'Ve a Configuración > Aplicaciones > Formato de Campo > Permisos > Cámara y habilita el permiso.',
                  [{ text: 'Entendido' }]
                );
              }
            }
          ]
        );
        return false;
      }
      
      setCameraStatus('available');
      return true;
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      setCameraStatus('unavailable');
      Alert.alert(
        'Error de Permisos',
        'No se pudieron verificar los permisos de cámara. Asegúrate de que tu dispositivo soporte esta función.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Check gallery permissions
  const checkAndRequestGalleryPermissions = async (): Promise<boolean> => {
    try {
      // Check current permission status
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (currentStatus === 'granted') {
        return true;
      }
      
      // Request permission if not granted
      const { status: requestedStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (requestedStatus !== 'granted') {
        Alert.alert(
          'Permisos de Galería Requeridos',
          'Para seleccionar fotos de la galería, necesitas habilitar los permisos de galería en la configuración de tu dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Configuración', 
              onPress: () => {
                Alert.alert(
                  'Abrir Configuración',
                  'Ve a Configuración > Aplicaciones > Formato de Campo > Permisos > Fotos/Galería y habilita el permiso.',
                  [{ text: 'Entendido' }]
                );
              }
            }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking gallery permissions:', error);
      Alert.alert(
        'Error de Permisos',
        'No se pudieron verificar los permisos de galería. Asegúrate de que tu dispositivo soporte esta función.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Function to process photo capture common logic
  const processPhotoCapture = async (photoUri: string, pointId?: string, schedule?: ScheduleType, photoType: 'measurement' | 'croquis' = 'measurement', uploadKey?: string) => {
    console.log('📷 [PHOTO] Processing capture - Type:', photoType);

    // Copy image to permanent storage
    let permanentUri: string;
    try {
      permanentUri = await copyImageToPermanentStorage(photoUri);
      console.log('📷 [PHOTO] Copied to storage');
    } catch (copyError) {
      console.error('=== COPY ERROR ===');
      console.error('Failed to copy image to permanent storage:', copyError);
      console.error('Error details:', {
        message: copyError instanceof Error ? copyError.message : 'Unknown',
        stack: copyError instanceof Error ? copyError.stack : 'No stack'
      });
      console.error('=== END COPY ERROR ===');

      const errorMsg = copyError instanceof Error ? copyError.message : 'Error desconocido';

      if (Platform.OS === 'web' || Platform.OS === 'windows') {
        console.error('Showing error to user (Windows/Web)');
      } else {
        Alert.alert(
          'Error al Guardar Imagen',
          `No se pudo guardar la imagen en el almacenamiento permanente: ${errorMsg}`,
          [{ text: 'OK' }]
        );
      }

      throw copyError; // Re-throw to stop processing
    }

    const timestamp = new Date().toISOString();

    // Try to get GPS location immediately
    let location = null;
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        timeInterval: 5000, // 5 second timeout
      });
      location = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      };
      console.log('📍 [PHOTO] GPS obtained');
    } catch (locationError) {
      console.log('📍 [PHOTO] GPS not available, will retry in background');
    }

    // Create photo with location if available (use permanent URI)
    const tempPhoto: Photo = {
      id: Date.now().toString(),
      uri: permanentUri,
      timestamp,
      location,
      pointId,
      schedule,
      type: photoType,
    };

    console.log('📸 [PHOTO] Created photo object with URI type:', permanentUri.substring(0, 50) + '...');
    console.log('📸 [PHOTO] URI length:', permanentUri.length);
    console.log('📸 [PHOTO] Is data URL?', permanentUri.startsWith('data:'));
    console.log('📸 [PHOTO] Is blob URL?', permanentUri.startsWith('blob:'));

    const saveSuccess = await addPhoto(tempPhoto);

    if (saveSuccess) {
      console.log('✅ [PHOTO] Added and saved');
    } else {
      console.warn('⚠️ [PHOTO] Added but may not be saved');
      Alert.alert(
        'Advertencia de Guardado',
        'La foto se agregó pero puede que no se haya guardado correctamente. Asegúrese de guardar manualmente el formulario.',
        [{ text: 'Entendido' }]
      );
    }

    // Try to get GPS location again in background if not obtained immediately
    if (!location) {
      setTimeout(async () => {
        try {
          console.log('Retrying GPS location for photo:', tempPhoto.id);
          const locationResult = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeInterval: 10000, // 10 second timeout for retry
          });
          const backgroundLocation = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
          };

          console.log('📍 [PHOTO] GPS obtained in background');

          // Update photo with location
          const updateSuccess = await updatePhoto(tempPhoto.id, { location: backgroundLocation });
          if (updateSuccess) {
            console.log('✅ [PHOTO] Location updated');
          } else {
            console.warn('Photo location update may not have been saved permanently');
          }

        } catch (error) {
          console.log('GPS not available even in background, photo will remain without location:', error);
        }
      }, 1000); // Wait 1 second before retrying
    }
  };

  const takePhoto = async (pointId?: string, schedule?: ScheduleType, photoType: 'measurement' | 'croquis' = 'measurement') => {
    // For web, use WebCameraModal
    if (Platform.OS === 'web') {
      setCurrentPhotoContext({ pointId, schedule, photoType });
      setWebCameraVisible(true);
      return;
    }

    // For mobile, use native camera
    const uploadKey = photoType === 'croquis' ? 'croquis' : `${pointId}-${schedule}`;

    try {
      setUploadingPhotos(prev => new Set([...prev, uploadKey]));

      // Check permissions first
      const hasPermission = await checkAndRequestCameraPermissions();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
        aspect: [4, 3],
        exif: false,
        base64: false,
      });

      if (result.canceled) {
        return; // User cancelled
      }

      if (!result.assets || !result.assets[0]) {
        throw new Error('No image data received from camera');
      }

      const photoUri = result.assets[0].uri;
      if (!photoUri) {
        throw new Error('Invalid image URI received from camera');
      }

      await processPhotoCapture(photoUri, pointId, schedule, photoType, uploadKey);

    } catch (error) {
      console.error('Error taking photo:', error);
      let errorMessage = 'Error desconocido al tomar la foto';
      let errorTitle = 'Error al Tomar Foto';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('permission') || message.includes('denied') || message.includes('denegado')) {
          errorTitle = 'Permisos de Cámara';
          errorMessage = 'No se tienen permisos para usar la cámara. Ve a la configuración de la aplicación y habilita los permisos de cámara.';
        } else if (message.includes('canceled') || message.includes('cancelled') || message.includes('canceló')) {
          return; // User cancelled, no need to show error
        } else if (message.includes('camera') && (message.includes('not available') || message.includes('unavailable'))) {
          errorTitle = 'Cámara No Disponible';
          errorMessage = 'La cámara no está disponible en este momento. Verifica que no esté siendo usada por otra aplicación.';
        } else {
          errorTitle = 'Error de Cámara';
          errorMessage = `Se produjo un error al acceder a la cámara: ${error.message}`;
        }
      }

      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: 'OK' },
          {
            text: 'Reintentar',
            onPress: () => {
              setTimeout(() => takePhoto(pointId, schedule, photoType), 1000);
            }
          }
        ]
      );
    } finally {
      setUploadingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
    }
  };

  const selectFromGallery = async (pointId?: string, schedule?: ScheduleType, photoType: 'measurement' | 'croquis' = 'measurement') => {
    const uploadKey = photoType === 'croquis' ? 'croquis' : `${pointId}-${schedule}`;

    try {
      setUploadingPhotos(prev => new Set([...prev, uploadKey]));

      // Check permissions first
      const hasPermission = await checkAndRequestGalleryPermissions();
      if (!hasPermission) {
        return;
      }


      let result;
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1.0,
          aspect: [4, 3],
          exif: false,
          base64: false,
        });
      } catch (pickerError) {
        console.error('=== IMAGE PICKER ERROR ===');
        console.error('Error launching image picker:', pickerError);
        console.error('Error type:', typeof pickerError);
        console.error('Error details:', pickerError);
        console.error('=== END PICKER ERROR ===');
        throw pickerError;
      }

      if (result.canceled) {
        return; // User cancelled
      }

      if (!result.assets || !result.assets[0]) {
        console.error('No assets in result');
        throw new Error('No image selected from gallery');
      }

      const photoUri = result.assets[0].uri;
      if (!photoUri) {
        console.error('No URI in asset');
        throw new Error('Invalid image URI received from gallery');
      }


      await processPhotoCapture(photoUri, pointId, schedule, photoType, uploadKey);

    } catch (error) {
      console.error('Error selecting photo:', error);
      let errorMessage = 'Error desconocido al seleccionar la foto';
      let errorTitle = 'Error al Seleccionar Foto';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('permission') || message.includes('denied') || message.includes('denegado')) {
          errorTitle = 'Permisos Requeridos';
          errorMessage = 'No se tienen permisos para acceder a los archivos. Ve a la configuración de la aplicación y habilita los permisos necesarios.';
        } else if (message.includes('canceled') || message.includes('cancelled') || message.includes('canceló')) {
          return; // User cancelled, no error needed
        } else {
          errorTitle = 'Error de Selección';
          errorMessage = `Se produjo un error al seleccionar la foto: ${error.message}`;
        }
      }

      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: 'OK' },
          {
            text: 'Reintentar',
            onPress: () => {
              setTimeout(() => selectFromGallery(pointId, schedule, photoType), 1000);
            }
          }
        ]
      );
    } finally {
      setUploadingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
    }
  };

  const handleWebCameraCapture = async (uri: string) => {
    if (!currentPhotoContext) return;

    const { pointId, schedule, photoType } = currentPhotoContext;
    const uploadKey = photoType === 'croquis' ? 'croquis' : `${pointId}-${schedule}`;

    try {
      setUploadingPhotos(prev => new Set([...prev, uploadKey]));
      await processPhotoCapture(uri, pointId, schedule, photoType, uploadKey);
    } catch (error) {
      console.error('Error processing web camera capture:', error);
      Alert.alert(
        'Error',
        'No se pudo procesar la foto capturada. Intente nuevamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploadingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadKey);
        return newSet;
      });
      setCurrentPhotoContext(null);
    }
  };

  const handleWebCameraClose = () => {
    setWebCameraVisible(false);
    setCurrentPhotoContext(null);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      // Use custom dialog for web/windows
      setPhotoToDelete(photoId);
      setConfirmDeleteVisible(true);
    } else {
      // Use native Alert for mobile
      Alert.alert(
        'Eliminar Foto',
        '¿Estás seguro de que deseas eliminar esta foto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => confirmDeletePhoto(photoId),
          },
        ]
      );
    }
  };

  const confirmDeletePhoto = async (photoId: string) => {
    try {
      console.log('=== Deleting Photo ===');
      console.log('Photo ID to delete:', photoId);
      console.log('Photos before deletion:', state.currentFormat?.photos?.length || 0);
      console.log('Photo IDs before deletion:', state.currentFormat?.photos?.map(p => p.id) || []);

      const deleteSuccess = await removePhoto(photoId);

      console.log('Delete success:', deleteSuccess);
      console.log('Photos after deletion attempt:', state.currentFormat?.photos?.length || 0);
      console.log('Photo IDs after deletion:', state.currentFormat?.photos?.map(p => p.id) || []);
      console.log('=== End Delete Photo ===');

      if (deleteSuccess) {
        console.log('Photo deleted and saved successfully');
      } else {
        if (Platform.OS === 'web' || Platform.OS === 'windows') {
          // For web/windows, we could show another dialog here if needed
          console.warn('Photo deleted but save may have failed');
        } else {
          Alert.alert(
            'Advertencia de Guardado',
            'La foto se eliminó pero puede que el cambio no se haya guardado correctamente. Asegúrese de guardar manualmente el formulario.',
            [{ text: 'Entendido' }]
          );
        }
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      if (Platform.OS === 'web' || Platform.OS === 'windows') {
        // For web/windows, log the error (could show another dialog)
        console.error('Error deleting photo:', error);
      } else {
        Alert.alert(
          'Error',
          'No se pudo eliminar la foto. Intente nuevamente.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const getPhotosForPointSchedule = (pointId: string, schedule: ScheduleType): Photo[] => {
    if (!state.currentFormat?.photos) {
      console.log('No photos in current format');
      return [];
    }
    const filteredPhotos = state.currentFormat.photos.filter(
      photo => photo.pointId === pointId && photo.schedule === schedule && photo.type === 'measurement'
    );
    console.log(`Found ${filteredPhotos.length} photos for point ${pointId} and schedule ${schedule}`);
    return filteredPhotos;
  };

  const getCroquisPhotos = (): Photo[] => {
    if (!state.currentFormat?.photos) {
      console.log('No photos in current format');
      return [];
    }
    const filteredPhotos = state.currentFormat.photos.filter(
      photo => photo.type === 'croquis'
    );
    console.log(`Found ${filteredPhotos.length} croquis photos`);
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
  const croquisPhotos = getCroquisPhotos();
  

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={Platform.OS === 'web' ? { flexGrow: 1 } : undefined}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Registro Fotográfico</Text>
        <Text style={styles.subtitle}>
          Toma fotos de cada punto y horario de medición y del croquis del área
        </Text>
        
        {/* Camera status indicator */}
        {cameraStatus === 'unavailable' && (
          <View style={styles.statusAlert}>
            <Feather name="alert-triangle" size={16} color={COLORS.error} />
            <Text style={styles.statusAlertText}>
              Cámara no disponible. Toca "Cámara no disponible" para verificar permisos.
            </Text>
          </View>
        )}
        
        {cameraStatus === 'checking' && (
          <View style={[styles.statusAlert, styles.statusAlertChecking]}>
            <ActivityIndicator size="small" color={COLORS.warning} />
            <Text style={[styles.statusAlertText, { color: COLORS.warning }]}>
              Verificando disponibilidad de la cámara...
            </Text>
          </View>
        )}
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
                            {photo._blobUrlLost || !photo.uri ? (
                              <View style={[styles.photo, styles.photoPlaceholder]}>
                                <Feather name="image" size={40} color={COLORS.textSecondary} />
                                <Text style={styles.photoLostText}>Foto no disponible</Text>
                                <Text style={styles.photoLostSubtext}>
                                  {formatTimestamp(photo.timestamp)}
                                </Text>
                              </View>
                            ) : (
                              <Image
                                source={{ uri: photo.uri }}
                                style={styles.photo}
                                onError={(error) => {
                                  console.error('Error loading image:', error);
                                  Alert.alert(
                                    'Error de Imagen',
                                    'No se pudo cargar la imagen. Es posible que el archivo se haya movido o eliminado.',
                                    [
                                      { text: 'OK' }
                                    ]
                                  );
                                }}
                                onLoad={() => {
                                }}
                              />
                            )}
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

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton, 
                      styles.galleryButton,
                      isUploading && styles.actionButtonDisabled,
                    ]}
                    onPress={() => selectFromGallery(point.id, schedule)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.surface} />
                        <Text style={styles.actionButtonText}>Guardando...</Text>
                      </>
                    ) : (
                      <>
                        <Feather name={Platform.OS === 'windows' || Platform.OS === 'web' ? "folder" : "image"} size={18} color={COLORS.surface} />
                        <Text style={styles.actionButtonText}>
                          {Platform.OS === 'windows' || Platform.OS === 'web' ? 'Archivos' : 'Galería'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.cameraButton,
                      isUploading && styles.actionButtonDisabled,
                      cameraStatus === 'unavailable' && styles.cameraButtonUnavailable,
                      cameraStatus === 'checking' && styles.cameraButtonChecking
                    ]}
                    onPress={() => {
                      if (cameraStatus === 'unavailable') {
                        checkCameraStatus();
                      } else {
                        takePhoto(point.id, schedule);
                      }
                    }}
                    disabled={isUploading || cameraStatus === 'checking'}
                  >
                    {isUploading ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.surface} />
                        <Text style={styles.actionButtonText}>Guardando...</Text>
                      </>
                    ) : cameraStatus === 'checking' ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.surface} />
                        <Text style={styles.actionButtonText}>Verificando...</Text>
                      </>
                    ) : cameraStatus === 'unavailable' ? (
                      <>
                        <Feather name="camera-off" size={18} color={COLORS.surface} />
                        <Text style={styles.actionButtonText}>No disponible</Text>
                      </>
                    ) : (
                      <>
                        <Feather name="camera" size={18} color={COLORS.surface} />
                        <Text style={styles.actionButtonText}>
                          {Platform.OS === 'windows' || Platform.OS === 'web' ? 'Webcam' : 'Cámara'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Croquis Section */}
      <View style={styles.croquisSection}>
        <View style={styles.croquisHeader}>
          <Text style={styles.croquisTitle}>Registro del Croquis</Text>
          <Text style={styles.croquisSubtitle}>
            Fotos del croquis o plano del área de medición
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.pointName}>Croquis del Área</Text>
            <View style={[styles.scheduleBadge, { backgroundColor: COLORS.info }]}>
              <Text style={styles.scheduleBadgeText}>General</Text>
            </View>
          </View>

          <View style={styles.photosContainer}>
            {croquisPhotos.length === 0 ? (
              <View style={styles.noPhotos}>
                <Feather name="map" size={32} color={COLORS.textSecondary} />
                <Text style={styles.noPhotosText}>Sin croquis</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {croquisPhotos.map((photo) => (
                  <View key={photo.id} style={styles.photoContainer}>
                    <TouchableOpacity
                      onPress={() => setSelectedPhoto(photo)}
                      style={styles.photoThumbnail}
                    >
                      {photo._blobUrlLost || !photo.uri ? (
                        <View style={[styles.photo, styles.photoPlaceholder]}>
                          <Feather name="image" size={40} color={COLORS.textSecondary} />
                          <Text style={styles.photoLostText}>Foto no disponible</Text>
                          <Text style={styles.photoLostSubtext}>
                            {formatTimestamp(photo.timestamp)}
                          </Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photo}
                          onError={(error) => {
                            console.error('Error loading croquis image:', error);
                            Alert.alert(
                              'Error de Imagen',
                              'No se pudo cargar la imagen del croquis. Es posible que el archivo se haya movido o eliminado.',
                              [{ text: 'OK' }]
                            );
                          }}
                          onLoad={() => {
                          }}
                        />
                      )}
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

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.galleryButton,
                uploadingPhotos.has('croquis') && styles.actionButtonDisabled,
              ]}
              onPress={() => selectFromGallery(undefined, undefined, 'croquis')}
              disabled={uploadingPhotos.has('croquis')}
            >
              {uploadingPhotos.has('croquis') ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.surface} />
                  <Text style={styles.actionButtonText}>Guardando...</Text>
                </>
              ) : (
                <>
                  <Feather name={Platform.OS === 'windows' || Platform.OS === 'web' ? "folder" : "image"} size={18} color={COLORS.surface} />
                  <Text style={styles.actionButtonText}>
                    {Platform.OS === 'windows' || Platform.OS === 'web' ? 'Archivos' : 'Galería'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cameraButton,
                uploadingPhotos.has('croquis') && styles.actionButtonDisabled,
                cameraStatus === 'unavailable' && styles.cameraButtonUnavailable,
                cameraStatus === 'checking' && styles.cameraButtonChecking
              ]}
              onPress={() => {
                if (cameraStatus === 'unavailable') {
                  checkCameraStatus();
                } else {
                  takePhoto(undefined, undefined, 'croquis');
                }
              }}
              disabled={uploadingPhotos.has('croquis') || cameraStatus === 'checking'}
            >
              {uploadingPhotos.has('croquis') ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.surface} />
                  <Text style={styles.actionButtonText}>Guardando...</Text>
                </>
              ) : cameraStatus === 'checking' ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.surface} />
                  <Text style={styles.actionButtonText}>Verificando...</Text>
                </>
              ) : cameraStatus === 'unavailable' ? (
                <>
                  <Feather name="camera-off" size={18} color={COLORS.surface} />
                  <Text style={styles.actionButtonText}>No disponible</Text>
                </>
              ) : (
                <>
                  <Feather name="camera" size={18} color={COLORS.surface} />
                  <Text style={styles.actionButtonText}>
                    {Platform.OS === 'windows' || Platform.OS === 'web' ? 'Webcam' : 'Cámara'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

              {selectedPhoto._blobUrlLost || !selectedPhoto.uri ? (
                <View style={[styles.modalPhoto, styles.modalPhotoPlaceholder]}>
                  <Feather name="image" size={80} color={COLORS.textSecondary} />
                  <Text style={styles.modalPhotoLostText}>Foto no disponible</Text>
                  <Text style={styles.modalPhotoLostSubtext}>
                    Esta foto se guardó con un formato temporal que ya no está disponible.
                  </Text>
                  <Text style={styles.modalPhotoLostSubtext}>
                    Para evitar esto en el futuro, asegúrese de exportar los datos regularmente.
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.modalPhoto}
                  onError={(error) => {
                    console.error('Error loading modal image:', error);
                    Alert.alert(
                      'Error de Imagen',
                      'No se pudo cargar la imagen en detalle. Es posible que el archivo se haya movido o eliminado.',
                      [
                        { text: 'OK', onPress: () => setSelectedPhoto(null) }
                      ]
                    );
                  }}
                  resizeMode="contain"
                />
              )}

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

      {/* Web Camera Modal */}
      <WebCameraModal
        visible={webCameraVisible}
        onClose={handleWebCameraClose}
        onCapture={handleWebCameraCapture}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Eliminar Foto"
        message="¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        useHoldToDelete={true}
        onConfirm={() => {
          if (photoToDelete) {
            confirmDeletePhoto(photoToDelete);
            setPhotoToDelete(null);
          }
        }}
        onCancel={() => {
          setConfirmDeleteVisible(false);
          setPhotoToDelete(null);
        }}
        confirmColor={COLORS.error}
        icon="trash-2"
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: Platform.select({
    web: {
      height: '100vh',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      backgroundColor: COLORS.background,
    },
    default: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
  }),
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
  photoPlaceholder: {
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  photoLostText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  photoLostSubtext: {
    fontSize: 7,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  galleryButton: {
    backgroundColor: COLORS.secondary || '#6B7280',
  },
  cameraButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  cameraButtonUnavailable: {
    backgroundColor: COLORS.error,
  },
  cameraButtonChecking: {
    backgroundColor: COLORS.warning,
  },
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  statusAlertChecking: {
    backgroundColor: '#FFF8E1',
    borderColor: COLORS.warning,
  },
  statusAlertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
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
  modalPhotoPlaceholder: {
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPhotoLostText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalPhotoLostSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
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
  croquisSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  croquisHeader: {
    marginBottom: 16,
  },
  croquisTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  croquisSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default PhotoRegistryScreen;