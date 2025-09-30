import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS } from '../constants';
import WebCameraModal from './WebCameraModal';
import ConfirmDialog from './ConfirmDialog';
import { copyImageToPermanentStorage } from '../utils/imageUtils';

interface CalibrationPhoto {
  id: string;
  uri: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

interface CalibrationPhotoButtonProps {
  label: string;
  photo: CalibrationPhoto | null;
  onPhotoSelected: (photo: CalibrationPhoto) => void;
  onPhotoRemoved: () => void;
  disabled?: boolean;
}

const CalibrationPhotoButton: React.FC<CalibrationPhotoButtonProps> = ({
  label,
  photo,
  onPhotoSelected,
  onPhotoRemoved,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'available' | 'unavailable' | 'checking'>('available');
  const [webCameraVisible, setWebCameraVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const checkAndRequestCameraPermissions = async (): Promise<boolean> => {
    try {
      setCameraStatus('checking');
      
      const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
      
      if (currentStatus === 'granted') {
        setCameraStatus('available');
        return true;
      }
      
      const { status: requestedStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (requestedStatus !== 'granted') {
        setCameraStatus('unavailable');
        Alert.alert(
          'Permisos de Cámara Requeridos',
          'Para tomar fotos, necesitas habilitar los permisos de cámara en la configuración de tu dispositivo.',
          [{ text: 'OK' }]
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
        'No se pudieron verificar los permisos de cámara.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const checkAndRequestGalleryPermissions = async (): Promise<boolean> => {
    try {
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (currentStatus === 'granted') {
        return true;
      }
      
      const { status: requestedStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (requestedStatus !== 'granted') {
        Alert.alert(
          'Permisos de Galería Requeridos',
          'Para seleccionar fotos de la galería, necesitas habilitar los permisos de galería en la configuración de tu dispositivo.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking gallery permissions:', error);
      Alert.alert(
        'Error de Permisos',
        'No se pudieron verificar los permisos de galería.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const processPhotoCapture = async (photoUri: string) => {
    // Copy image to permanent storage
    let permanentUri: string;
    try {
      permanentUri = await copyImageToPermanentStorage(photoUri);
      console.log('Calibration photo copied to permanent storage:', permanentUri);
    } catch (copyError) {
      console.error('Failed to copy calibration image to permanent storage:', copyError);
      const errorMsg = copyError instanceof Error ? copyError.message : 'Error desconocido';
      Alert.alert(
        'Error al Guardar Imagen',
        `No se pudo guardar la imagen de calibración: ${errorMsg}`,
        [{ text: 'OK' }]
      );
      throw copyError; // Re-throw to stop processing
    }

    const timestamp = new Date().toISOString();

    let location = null;
    try {
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        timeInterval: 5000,
      });
      location = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      };
    } catch (locationError) {
      console.log('Could not get GPS location:', locationError);
    }

    const calibrationPhoto: CalibrationPhoto = {
      id: Date.now().toString(),
      uri: permanentUri,
      timestamp,
      location,
    };

    onPhotoSelected(calibrationPhoto);
  };

  const takePhoto = async () => {
    if (disabled) return;

    // For web, use WebCameraModal
    if (Platform.OS === 'web') {
      setWebCameraVisible(true);
      return;
    }

    // For mobile, use native camera
    try {
      setIsUploading(true);

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
        return;
      }

      if (!result.assets || !result.assets[0]) {
        throw new Error('No image data received from camera');
      }

      const photoUri = result.assets[0].uri;
      if (!photoUri) {
        throw new Error('Invalid image URI received from camera');
      }

      await processPhotoCapture(photoUri);

    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        'Error al Tomar Foto',
        'Se produjo un error al acceder a la cámara. Intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleWebCameraCapture = async (uri: string) => {
    try {
      setIsUploading(true);
      await processPhotoCapture(uri);
    } catch (error) {
      console.error('Error processing web camera capture:', error);
      Alert.alert(
        'Error',
        'No se pudo procesar la foto capturada. Intente nuevamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleWebCameraClose = () => {
    setWebCameraVisible(false);
  };

  const selectFromGallery = async () => {
    if (disabled) return;
    
    try {
      setIsUploading(true);
      
      const hasPermission = await checkAndRequestGalleryPermissions();
      if (!hasPermission) {
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
        aspect: [4, 3],
        exif: false,
        base64: false,
      });

      if (result.canceled) {
        return;
      }

      if (!result.assets || !result.assets[0]) {
        throw new Error('No image selected from gallery');
      }

      const photoUri = result.assets[0].uri;
      if (!photoUri) {
        throw new Error('Invalid image URI received from gallery');
      }

      // Process the photo (copy to permanent storage, add location, etc.)
      await processPhotoCapture(photoUri);
      
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert(
        'Error al Seleccionar Foto',
        'Se produjo un error al acceder a la galería. Intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    if (disabled) return;

    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      // Use custom dialog for web/windows
      setConfirmDeleteVisible(true);
    } else {
      // Use native Alert for mobile
      Alert.alert(
        'Eliminar Foto de Calibración',
        '¿Estás seguro de que deseas eliminar esta foto de calibración?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: onPhotoRemoved,
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.content}>
        {photo ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeletePhoto}
              disabled={disabled}
            >
              <Feather name="trash-2" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Feather name="camera" size={24} color={COLORS.textSecondary} />
            <Text style={styles.placeholderText}>Sin foto</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.galleryButton,
              (isUploading || disabled) && styles.actionButtonDisabled,
            ]}
            onPress={selectFromGallery}
            disabled={isUploading || disabled}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Feather name="image" size={16} color={COLORS.surface} />
            )}
            <Text style={styles.actionButtonText}>
              {isUploading ? 'Guardando...' : Platform.OS === 'web' ? 'Archivos' : 'Galería'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cameraButton,
              (isUploading || disabled || cameraStatus === 'unavailable') && styles.actionButtonDisabled,
              cameraStatus === 'unavailable' && styles.cameraButtonUnavailable,
              cameraStatus === 'checking' && styles.cameraButtonChecking
            ]}
            onPress={takePhoto}
            disabled={isUploading || disabled || cameraStatus === 'checking'}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : cameraStatus === 'checking' ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : cameraStatus === 'unavailable' ? (
              <Feather name="camera-off" size={16} color={COLORS.surface} />
            ) : (
              <Feather name="camera" size={16} color={COLORS.surface} />
            )}
            <Text style={styles.actionButtonText}>
              {isUploading ? 'Guardando...' :
               cameraStatus === 'checking' ? 'Verificando...' :
               cameraStatus === 'unavailable' ? 'No disponible' :
               Platform.OS === 'web' ? 'Webcam' : 'Cámara'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Web Camera Modal */}
      <WebCameraModal
        visible={webCameraVisible}
        onClose={handleWebCameraClose}
        onCapture={handleWebCameraCapture}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Eliminar Foto de Calibración"
        message="¿Estás seguro de que deseas eliminar esta foto de calibración? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          onPhotoRemoved();
        }}
        onCancel={() => {
          setConfirmDeleteVisible(false);
        }}
        confirmColor={COLORS.error}
        icon="trash-2"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background,
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
  placeholderContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  placeholderText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    minHeight: 36,
  },
  galleryButton: {
    backgroundColor: COLORS.secondary || '#6B7280',
  },
  cameraButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: 12,
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
});

export default CalibrationPhotoButton;