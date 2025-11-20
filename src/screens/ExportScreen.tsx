import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import {
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  documentDirectory
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';
import { MeasurementFormat, CalibrationPhoto } from '../types';
import { generateFileName, createDirectoryIfNotExists, cleanupTempDirectory, copyFileWithErrorHandling } from '../utils/exportUtils';
import { createPhotosZip, createZipFile, FileToZip } from '../utils/zipUtils';
import { DetailedProgressInfo } from '../utils/imageUtils';

// Helper function to download files in web browser
const downloadFileInBrowser = (content: string | Blob, fileName: string, mimeType: string) => {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mimeType })
    : content;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface ExportOption {
  id: 'all' | 'format' | 'photos';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const ExportScreen: React.FC = () => {
  const { state } = useMeasurement();
  const [loading, setLoading] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [progressDetails, setProgressDetails] = useState<DetailedProgressInfo | null>(null);

  // Helper function to collect all calibration photos from measurement results
  const collectCalibrationPhotos = (format: MeasurementFormat) => {
    const calibrationPhotos: Array<{
      photo: CalibrationPhoto;
      pointName: string;
      schedule: string;
      measurementType: string;
      photoType: 'PRE' | 'POST';
      intervalIndex?: number;
      direction?: string;
    }> = [];

    // Get all measurement results
    format.measurementResults.forEach((result) => {
      const point = format.measurementPoints.find(p => p.id === result.pointId);
      const pointName = point?.name || `Punto_${result.pointId}`;
      const scheduleName = result.schedule === 'diurnal' ? 'Diurno' : 'Nocturno';

      // Process emission measurements
      if (result.emission) {
        // Emission intervals
        result.emission.emission.data.forEach((interval, index) => {
          if (interval.calibrationPrePhoto) {
            calibrationPhotos.push({
              photo: interval.calibrationPrePhoto,
              pointName,
              schedule: scheduleName,
              measurementType: 'Emision',
              photoType: 'PRE',
              intervalIndex: index,
            });
          }
          if (interval.calibrationPostPhoto) {
            calibrationPhotos.push({
              photo: interval.calibrationPostPhoto,
              pointName,
              schedule: scheduleName,
              measurementType: 'Emision',
              photoType: 'POST',
              intervalIndex: index,
            });
          }
        });

        // Residual intervals
        result.emission.residual.data.forEach((interval, index) => {
          if (interval.calibrationPrePhoto) {
            calibrationPhotos.push({
              photo: interval.calibrationPrePhoto,
              pointName,
              schedule: scheduleName,
              measurementType: 'Residual',
              photoType: 'PRE',
              intervalIndex: index,
            });
          }
          if (interval.calibrationPostPhoto) {
            calibrationPhotos.push({
              photo: interval.calibrationPostPhoto,
              pointName,
              schedule: scheduleName,
              measurementType: 'Residual',
              photoType: 'POST',
              intervalIndex: index,
            });
          }
        });
      }

      // Process ambient measurements
      if (result.ambient) {
        const directions = ['N', 'S', 'E', 'W', 'V'];
        directions.forEach((direction) => {
          const prePhotoKey = `calibrationPre${direction}Photo` as keyof typeof result.ambient;
          const postPhotoKey = `calibrationPost${direction}Photo` as keyof typeof result.ambient;

          if (result.ambient![prePhotoKey]) {
            calibrationPhotos.push({
              photo: result.ambient![prePhotoKey] as CalibrationPhoto,
              pointName,
              schedule: scheduleName,
              measurementType: 'Ambiental',
              photoType: 'PRE',
              direction,
            });
          }
          if (result.ambient![postPhotoKey]) {
            calibrationPhotos.push({
              photo: result.ambient![postPhotoKey] as CalibrationPhoto,
              pointName,
              schedule: scheduleName,
              measurementType: 'Ambiental',
              photoType: 'POST',
              direction,
            });
          }
        });
      }

      // Process immission measurements
      if (result.immission) {
        if (result.immission.calibrationPrePhoto) {
          calibrationPhotos.push({
            photo: result.immission.calibrationPrePhoto,
            pointName,
            schedule: scheduleName,
            measurementType: 'Inmision',
            photoType: 'PRE',
          });
        }
        if (result.immission.calibrationPostPhoto) {
          calibrationPhotos.push({
            photo: result.immission.calibrationPostPhoto,
            pointName,
            schedule: scheduleName,
            measurementType: 'Inmision',
            photoType: 'POST',
          });
        }
      }

      // Process sonometry measurements
      if (result.sonometry) {
        if (result.sonometry.calibrationPrePhoto) {
          calibrationPhotos.push({
            photo: result.sonometry.calibrationPrePhoto,
            pointName,
            schedule: scheduleName,
            measurementType: 'Sonometria',
            photoType: 'PRE',
          });
        }
        if (result.sonometry.calibrationPostPhoto) {
          calibrationPhotos.push({
            photo: result.sonometry.calibrationPostPhoto,
            pointName,
            schedule: scheduleName,
            measurementType: 'Sonometria',
            photoType: 'POST',
          });
        }
      }
    });

    return calibrationPhotos;
  };

  const exportOptions: ExportOption[] = [
    {
      id: 'all',
      title: 'Exportar Todo',
      subtitle: 'Archivo ZIP con formato de campo + fotos organizadas',
      icon: 'package',
      color: COLORS.primary,
    },
    {
      id: 'format',
      title: 'Exportar Formato de Campo',
      subtitle: 'Solo datos del formulario en archivo JSON',
      icon: 'file-text',
      color: COLORS.info,
    },
    {
      id: 'photos',
      title: 'Exportar Fotos',
      subtitle: 'Archivo ZIP con fotos organizadas por punto y horario',
      icon: 'camera',
      color: COLORS.success,
    },
  ];


  const exportFormat = async (): Promise<string> => {
    if (!state.currentFormat) throw new Error('No hay formato activo');

    const fileName = generateFileName(state.currentFormat, 'formato');
    const jsonContent = JSON.stringify(state.currentFormat, null, 2);

    // For web, download directly using browser API
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      downloadFileInBrowser(jsonContent, `${fileName}.json`, 'application/json');
      return `${fileName}.json`; // Return filename for success message
    }

    // For mobile, use file system
    const fileUri = `${documentDirectory}${fileName}.json`;
    await writeAsStringAsync(fileUri, jsonContent);
    return fileUri;
  };

  const exportPhotos = async (): Promise<string> => {
    if (!state.currentFormat || !state.currentFormat.photos.length) {
      throw new Error('No hay fotos para exportar');
    }

    const baseName = generateFileName(state.currentFormat, 'fotos');
    const zipPath = `${documentDirectory}${baseName}.zip`;

    // Clean up any existing ZIP file (mobile only)
    if (Platform.OS !== 'web' && Platform.OS !== 'windows') {
      try {
        await deleteAsync(zipPath, { idempotent: true });
      } catch (error) {
        console.warn('Could not delete existing ZIP file:', error);
      }
    }

    // Preparar fotos para ZIP
    const photosForZip: Array<{ uri: string; pointName: string; schedule: string; index: number; timestamp: string; location?: { latitude: number; longitude: number } | null }> = [];

    // Separar fotos por tipo
    const measurementPhotos = state.currentFormat.photos.filter(photo => photo.type === 'measurement');
    const croquisPhotos = state.currentFormat.photos.filter(photo => photo.type === 'croquis');

    // Organizar fotos de medición por punto y horario
    const photosByPointSchedule = measurementPhotos.reduce((acc, photo) => {
      const key = `${photo.pointId}_${photo.schedule}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(photo);
      return acc;
    }, {} as Record<string, typeof measurementPhotos>);

    // Preparar array para ZIP
    for (const [key, photos] of Object.entries(photosByPointSchedule)) {
      const [pointId, schedule] = key.split('_');
      const point = state.currentFormat!.measurementPoints.find(p => p.id === pointId);
      const pointName = point?.name || `Punto_${pointId}`;

      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];

        // For web, skip validation (data URLs are already in memory)
        if (Platform.OS === 'web' || Platform.OS === 'windows') {
          photosForZip.push({
            uri: photo.uri,
            pointName,
            schedule,
            index,
            timestamp: photo.timestamp,
            location: photo.location,
          });
        } else {
          // Validate photo file exists before adding to queue (mobile only)
          try {
            const photoInfo = await getInfoAsync(photo.uri);
            if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
              photosForZip.push({
                uri: photo.uri,
                pointName,
                schedule,
                index,
                timestamp: photo.timestamp,
                location: photo.location,
              });
            } else {
              console.warn(`Skipping invalid photo: ${photo.uri}`);
            }
          } catch (error) {
            console.warn(`Error validating photo ${photo.uri}:`, error);
          }
        }
      }
    }

    // Agregar fotos de croquis
    for (let index = 0; index < croquisPhotos.length; index++) {
      const photo = croquisPhotos[index];

      // For web, skip validation
      if (Platform.OS === 'web' || Platform.OS === 'windows') {
        photosForZip.push({
          uri: photo.uri,
          pointName: 'Croquis',
          schedule: 'general',
          index,
          timestamp: photo.timestamp,
          location: photo.location,
        });
      } else {
        try {
          const photoInfo = await getInfoAsync(photo.uri);
          if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
            photosForZip.push({
              uri: photo.uri,
              pointName: 'Croquis',
              schedule: 'general',
              index,
              timestamp: photo.timestamp,
              location: photo.location,
            });
          } else {
            console.warn(`Skipping invalid croquis photo: ${photo.uri}`);
          }
        } catch (error) {
          console.warn(`Error validating croquis photo ${photo.uri}:`, error);
        }
      }
    }

    if (photosForZip.length === 0) {
      throw new Error('No se encontraron fotos válidas para exportar');
    }

    // Crear ZIP con progreso
    const result = await createPhotosZip(photosForZip, zipPath, (progress, detailedInfo) => {
      setZipProgress(progress * 100);
      if (detailedInfo) {
        setProgressDetails(detailedInfo);
      }
    });

    // For web, download the base64 ZIP
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      // Convert base64 to blob and download
      const byteCharacters = atob(result);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });

      downloadFileInBrowser(blob, `${baseName}.zip`, 'application/zip');
      return `${baseName}.zip`;
    }

    return result;
  };

  const exportAll = async (): Promise<string> => {
    if (!state.currentFormat) throw new Error('No hay formato activo');

    const baseName = generateFileName(state.currentFormat, 'completo');
    const zipPath = `${documentDirectory}${baseName}.zip`;

    // Clean up any existing ZIP file (mobile only)
    if (Platform.OS !== 'web' && Platform.OS !== 'windows') {
      try {
        await deleteAsync(zipPath, { idempotent: true });
      } catch (error) {
        console.warn('Could not delete existing ZIP file:', error);
      }
    }

    const filesToZip: FileToZip[] = [];

    // 1. Crear archivo JSON - for web, add directly to ZIP without file system
    const jsonContent = JSON.stringify(state.currentFormat, null, 2);

    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      // For web, we'll add JSON as base64 directly
      const base64Json = btoa(unescape(encodeURIComponent(jsonContent)));
      filesToZip.push({
        path: `data:application/json;base64,${base64Json}`,
        name: 'formato_campo.json',
      });
    } else {
      // For mobile, write to temp file
      const tempJsonPath = `${documentDirectory}temp_formato_complete.json`;
      await writeAsStringAsync(tempJsonPath, jsonContent);
      filesToZip.push({
        path: tempJsonPath,
        name: 'formato_campo.json',
      });
    }

    // Separar fotos por tipo para toda la función
    const measurementPhotos = state.currentFormat.photos.filter(photo => photo.type === 'measurement');
    const croquisPhotos = state.currentFormat.photos.filter(photo => photo.type === 'croquis');

    // 2. Agregar fotos del registro fotográfico organizadas por carpetas con validación
    if (measurementPhotos.length > 0) {
      // Organizar fotos de medición por punto y horario
      const photosByPointSchedule = measurementPhotos.reduce((acc, photo) => {
        const key = `${photo.pointId}_${photo.schedule}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(photo);
        return acc;
      }, {} as Record<string, typeof measurementPhotos>);

      // Agregar cada foto al ZIP con validación
      for (const [key, photos] of Object.entries(photosByPointSchedule)) {
        const [pointId, schedule] = key.split('_');
        const point = state.currentFormat!.measurementPoints.find(p => p.id === pointId);
        const pointName = point?.name || `Punto_${pointId}`;
        const scheduleName = schedule === 'diurnal' ? 'Diurno' : 'Nocturno';
        const folderName = `fotos/${pointName}_${scheduleName}`;
        
        for (let index = 0; index < photos.length; index++) {
          const photo = photos[index];

          // For web, skip validation
          if (Platform.OS === 'web' || Platform.OS === 'windows') {
            const fileName = `foto_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
            filesToZip.push({
              path: photo.uri,
              name: `${folderName}/${fileName}`,
            });
          } else {
            try {
              // Validate photo file exists and has valid size (mobile only)
              const photoInfo = await getInfoAsync(photo.uri);
              if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
                const fileName = `foto_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
                filesToZip.push({
                  path: photo.uri,
                  name: `${folderName}/${fileName}`,
                });
              } else {
                console.warn(`Skipping invalid photo in complete export: ${photo.uri}`);
              }
            } catch (error) {
              console.warn(`Error validating photo in complete export ${photo.uri}:`, error);
            }
          }
        }
      }
    }

    // 3. Agregar fotos de calibración organizadas en carpeta Calibraciones
    const calibrationPhotos = collectCalibrationPhotos(state.currentFormat);
    let validCalibrationPhotosCount = 0;

    if (calibrationPhotos.length > 0) {
      for (const calibPhoto of calibrationPhotos) {
        // For web, skip validation
        if (Platform.OS === 'web' || Platform.OS === 'windows') {
          // Create folder structure: Calibraciones/PointName_Schedule/MeasurementType/
          let folderPath = `Calibraciones/${calibPhoto.pointName}_${calibPhoto.schedule}/${calibPhoto.measurementType}`;

          // Add additional path elements based on measurement type
          if (calibPhoto.intervalIndex !== undefined) {
            folderPath += `/Intervalo_${calibPhoto.intervalIndex + 1}`;
          }
          if (calibPhoto.direction) {
            folderPath += `/Direccion_${calibPhoto.direction}`;
          }

          // Create filename with descriptive information
          let fileName = `Calibracion_${calibPhoto.photoType}`;
          if (calibPhoto.intervalIndex !== undefined) {
            fileName += `_Intervalo${calibPhoto.intervalIndex + 1}`;
          }
          if (calibPhoto.direction) {
            fileName += `_${calibPhoto.direction}`;
          }
          fileName += '_' + new Date(calibPhoto.photo.timestamp).getTime() + '.jpg';

          filesToZip.push({
            path: calibPhoto.photo.uri,
            name: `${folderPath}/${fileName}`,
          });

          validCalibrationPhotosCount++;
        } else {
          try {
            // Validate calibration photo file exists and has valid size (mobile only)
            const photoInfo = await getInfoAsync(calibPhoto.photo.uri);
            if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
              // Create folder structure: Calibraciones/PointName_Schedule/MeasurementType/
              let folderPath = `Calibraciones/${calibPhoto.pointName}_${calibPhoto.schedule}/${calibPhoto.measurementType}`;

              // Add additional path elements based on measurement type
              if (calibPhoto.intervalIndex !== undefined) {
                folderPath += `/Intervalo_${calibPhoto.intervalIndex + 1}`;
              }
              if (calibPhoto.direction) {
                folderPath += `/Direccion_${calibPhoto.direction}`;
              }

              // Create filename with descriptive information
              let fileName = `Calibracion_${calibPhoto.photoType}`;
              if (calibPhoto.intervalIndex !== undefined) {
                fileName += `_Intervalo${calibPhoto.intervalIndex + 1}`;
              }
              if (calibPhoto.direction) {
                fileName += `_${calibPhoto.direction}`;
              }
              fileName += '_' + new Date(calibPhoto.photo.timestamp).getTime() + '.jpg';

              filesToZip.push({
                path: calibPhoto.photo.uri,
                name: `${folderPath}/${fileName}`,
              });

              validCalibrationPhotosCount++;
            } else {
              console.warn(`Skipping invalid calibration photo in complete export: ${calibPhoto.photo.uri}`);
            }
          } catch (error) {
            console.warn(`Error validating calibration photo in complete export ${calibPhoto.photo.uri}:`, error);
          }
        }
      }
    }

    // 4. Agregar fotos de croquis
    let validCroquisPhotosCount = 0;
    if (croquisPhotos.length > 0) {
      for (let index = 0; index < croquisPhotos.length; index++) {
        const photo = croquisPhotos[index];

        // For web, skip validation
        if (Platform.OS === 'web' || Platform.OS === 'windows') {
          const fileName = `croquis_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
          filesToZip.push({
            path: photo.uri,
            name: `Croquis/${fileName}`,
          });

          validCroquisPhotosCount++;
        } else {
          try {
            // Validate croquis photo file exists and has valid size (mobile only)
            const photoInfo = await getInfoAsync(photo.uri);
            if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
              const fileName = `croquis_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
              filesToZip.push({
                path: photo.uri,
                name: `Croquis/${fileName}`,
              });

              validCroquisPhotosCount++;
            } else {
              console.warn(`Skipping invalid croquis photo in complete export: ${photo.uri}`);
            }
          } catch (error) {
            console.warn(`Error validating croquis photo in complete export ${photo.uri}:`, error);
          }
        }
      }
    }

    const validPhotosCount = filesToZip.length - 1 - validCalibrationPhotosCount - validCroquisPhotosCount; // Subtract 1 for JSON file, calibration photos, and croquis photos

    // 5. Crear archivo de información
    const infoContent = `Exportación Completa - ${state.currentFormat.generalInfo.company}
Fecha: ${state.currentFormat.generalInfo.date}
Orden de Trabajo: ${state.currentFormat.generalInfo.workOrder.type}-${state.currentFormat.generalInfo.workOrder.number}-${state.currentFormat.generalInfo.workOrder.year}

Archivos incluidos:
- formato_campo.json: Datos completos del formulario
- fotos/: Carpeta con fotos del registro fotográfico organizadas por punto y horario
- Calibraciones/: Carpeta con fotos de calibración organizadas por punto, horario e intervalo
- Croquis/: Carpeta con fotos del croquis del área de medición
- Total de fotos del registro válidas: ${validPhotosCount}
${measurementPhotos.length !== validPhotosCount ? `- Fotos del registro originales: ${measurementPhotos.length}` : ''}
- Total de fotos de calibración válidas: ${validCalibrationPhotosCount}
${calibrationPhotos.length !== validCalibrationPhotosCount ? `- Fotos de calibración originales: ${calibrationPhotos.length}` : ''}
- Total de fotos de croquis válidas: ${validCroquisPhotosCount}
${croquisPhotos.length !== validCroquisPhotosCount ? `- Fotos de croquis originales: ${croquisPhotos.length}` : ''}

Estructura de carpetas:
- fotos/: Organizadas por punto y horario de medición
- Calibraciones/: Organizadas por punto, horario, tipo de medición e intervalo
- Croquis/: Croquis o planos del área de medición
  
Generado: ${new Date().toLocaleString('es-ES')}
`;
    
    // Add info file
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      // For web, add as base64 directly
      const base64Info = btoa(unescape(encodeURIComponent(infoContent)));
      filesToZip.push({
        path: `data:text/plain;base64,${base64Info}`,
        name: 'informacion.txt',
      });
    } else {
      // For mobile, write to temp file
      const tempInfoPath = `${documentDirectory}temp_info_complete.txt`;
      await writeAsStringAsync(tempInfoPath, infoContent);
      filesToZip.push({
        path: tempInfoPath,
        name: 'informacion.txt',
      });
    }

    // 5. Crear ZIP con progreso
    const result = await createZipFile(filesToZip, zipPath, (progress, detailedInfo) => {
      setZipProgress(progress * 100);
      if (detailedInfo) {
        setProgressDetails(detailedInfo);
      }
    });

    // 6. For web, download the ZIP
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      // Convert base64 to blob and download
      const byteCharacters = atob(result);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });

      downloadFileInBrowser(blob, `${baseName}.zip`, 'application/zip');
      return `${baseName}.zip`;
    }

    // 7. Limpiar archivos temporales (mobile only)
    const tempJsonPath = `${documentDirectory}temp_formato_complete.json`;
    const tempInfoPath = `${documentDirectory}temp_info_complete.txt`;
    try {
      await FileSystem.deleteAsync(tempJsonPath, { idempotent: true });
      await FileSystem.deleteAsync(tempInfoPath, { idempotent: true });
    } catch (error) {
      console.warn('Error cleaning up temporary files:', error);
    }

    return result;
  };

  const handleExport = async (optionId: 'all' | 'format' | 'photos') => {
    if (!state.currentFormat) {
      Alert.alert('Error', 'No hay formato activo para exportar');
      return;
    }

    setLoading(optionId);
    setZipProgress(0);
    setProgressDetails(null);
    
    // Create timeout for export operations
    const exportTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('La exportación tardó demasiado tiempo. Intente de nuevo.')), 5 * 60 * 1000); // 5 minutes
    });
    
    try {
      let fileToShare: string;
      
      // Add timeout wrapper for export operations
      const exportPromise = (async () => {
        switch (optionId) {
          case 'all':
            return await exportAll();
          case 'format':
            return await exportFormat();
          case 'photos':
            return await exportPhotos();
          default:
            throw new Error('Opción de exportación no válida');
        }
      })();
      
      fileToShare = await Promise.race([exportPromise, exportTimeout]) as string;

      // For web, we already downloaded the file, just show success message
      if (Platform.OS === 'web' || Platform.OS === 'windows') {
        Alert.alert('Éxito', `Archivo descargado correctamente: ${fileToShare}`);
      } else {
        // For mobile, verify file was created successfully
        const fileInfo = await getInfoAsync(fileToShare);
        if (!fileInfo.exists) {
          throw new Error('El archivo exportado no se creó correctamente');
        }

        // Compartir archivo
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          const mimeType = optionId === 'format' ? 'application/json' : 'application/zip';
          const dialogTitle = optionId === 'all'
            ? 'Compartir exportación completa'
            : optionId === 'format'
              ? 'Compartir formato de campo'
              : 'Compartir fotos';

          await Sharing.shareAsync(fileToShare, {
            mimeType,
            dialogTitle,
          });
        } else {
          Alert.alert('Éxito', `Archivo exportado correctamente: ${fileToShare}`);
        }
      }
      
    } catch (error: any) {
      console.error('Error en exportación:', error);
      
      let errorMessage = 'No se pudo completar la exportación';
      
      if (error.message) {
        if (error.message.includes('timeout') || error.message.includes('tardó demasiado')) {
          errorMessage = 'La exportación tardó demasiado tiempo. Si tiene muchas fotos, intente exportar solo el formato o reduzca el número de fotos.';
        } else if (error.message.includes('memory') || error.message.includes('memoria')) {
          errorMessage = 'No hay suficiente memoria para completar la exportación. Intente cerrar otras aplicaciones y vuelva a intentar.';
        } else if (error.message.includes('space') || error.message.includes('espacio')) {
          errorMessage = 'No hay suficiente espacio de almacenamiento. Libere espacio e intente nuevamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Error de Exportación', errorMessage, [
        {
          text: 'Reintentar',
          onPress: () => handleExport(optionId),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        }
      ]);
    } finally {
      setLoading(null);
      setZipProgress(0);
      setProgressDetails(null);
    }
  };

  if (!state.currentFormat) {
    return (
      <ScrollView 
        style={styles.container} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Feather name="file" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No hay formato activo</Text>
            <Text style={styles.emptySubtitle}>
              Crea un nuevo formato o carga uno existente para poder exportar
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Exportar Datos</Text>
          <Text style={styles.subtitle}>
            Selecciona qué información deseas exportar
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {exportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, { borderLeftColor: option.color }]}
              onPress={() => handleExport(option.id)}
              disabled={loading !== null}
            >
              <View style={styles.optionWrapper}>
                <View style={styles.optionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                    <Feather name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {loading === option.id ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={option.color} />
                      {(option.id === 'photos' || option.id === 'all') && zipProgress > 0 && (
                        <Text style={styles.progressText}>{Math.round(zipProgress)}%</Text>
                      )}
                    </View>
                  ) : (
                    <Feather name="arrow-right" size={20} color={COLORS.textSecondary} />
                  )}
                </View>
                {loading === option.id && progressDetails && (
                  <View style={styles.progressDetailsContainer}>
                    <Text style={styles.progressDetailsText}>
                      {progressDetails.currentTask}
                    </Text>
                    {progressDetails.currentPoint && progressDetails.currentSchedule && (
                      <Text style={styles.progressDetailsSubtext}>
                        📍 {progressDetails.currentPoint} - {progressDetails.currentSchedule}
                      </Text>
                    )}
                    {progressDetails.imageNumber && progressDetails.totalImages && (
                      <Text style={styles.progressDetailsSubtext}>
                        🖼️ Imagen {progressDetails.imageNumber} de {progressDetails.totalImages}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Las fotos se comprimen en archivos ZIP organizados por punto y horario. 
            El proceso puede tardar unos segundos dependiendo del número de fotos.
          </Text>
        </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  optionWrapper: {
    width: '100%',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  progressDetailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  progressDetailsText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressDetailsSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: COLORS.info + '15',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
});

export default ExportScreen;