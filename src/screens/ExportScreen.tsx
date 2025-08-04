import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';
import { MeasurementFormat } from '../types';
import { generateFileName, createDirectoryIfNotExists, cleanupTempDirectory, copyFileWithErrorHandling } from '../utils/exportUtils';
import { createPhotosZip, createZipFile, FileToZip } from '../utils/zipUtils';

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
    const fileUri = `${FileSystem.documentDirectory}${fileName}.json`;
    
    await FileSystem.writeAsStringAsync(fileUri, jsonContent);
    return fileUri;
  };

  const exportPhotos = async (): Promise<string> => {
    if (!state.currentFormat || !state.currentFormat.photos.length) {
      throw new Error('No hay fotos para exportar');
    }

    const baseName = generateFileName(state.currentFormat, 'fotos');
    const zipPath = `${FileSystem.documentDirectory}${baseName}.zip`;
    
    // Preparar fotos para ZIP
    const photosForZip: Array<{ uri: string; pointName: string; schedule: string; index: number; timestamp: string }> = [];
    
    // Organizar fotos por punto y horario
    const photosByPointSchedule = state.currentFormat.photos.reduce((acc, photo) => {
      const key = `${photo.pointId}_${photo.schedule}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(photo);
      return acc;
    }, {} as Record<string, typeof state.currentFormat.photos>);

    // Preparar array para ZIP
    Object.entries(photosByPointSchedule).forEach(([key, photos]) => {
      const [pointId, schedule] = key.split('_');
      const point = state.currentFormat!.measurementPoints.find(p => p.id === pointId);
      const pointName = point?.name || `Punto_${pointId}`;
      
      photos.forEach((photo, index) => {
        photosForZip.push({
          uri: photo.uri,
          pointName,
          schedule,
          index,
          timestamp: photo.timestamp,
        });
      });
    });

    // Crear ZIP con progreso
    await createPhotosZip(photosForZip, zipPath, (progress) => {
      setZipProgress(progress * 100);
    });
    
    return zipPath;
  };

  const exportAll = async (): Promise<string> => {
    if (!state.currentFormat) throw new Error('No hay formato activo');

    const baseName = generateFileName(state.currentFormat, 'completo');
    const zipPath = `${FileSystem.documentDirectory}${baseName}.zip`;
    
    const filesToZip: FileToZip[] = [];

    // 1. Crear archivo JSON temporal
    const jsonContent = JSON.stringify(state.currentFormat, null, 2);
    const tempJsonPath = `${FileSystem.documentDirectory}temp_formato.json`;
    await FileSystem.writeAsStringAsync(tempJsonPath, jsonContent);
    filesToZip.push({
      path: tempJsonPath,
      name: 'formato_campo.json',
    });

    // 2. Agregar fotos organizadas por carpetas
    if (state.currentFormat.photos.length > 0) {
      // Organizar fotos por punto y horario
      const photosByPointSchedule = state.currentFormat.photos.reduce((acc, photo) => {
        const key = `${photo.pointId}_${photo.schedule}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(photo);
        return acc;
      }, {} as Record<string, typeof state.currentFormat.photos>);

      // Agregar cada foto al ZIP con su ruta de carpeta
      Object.entries(photosByPointSchedule).forEach(([key, photos]) => {
        const [pointId, schedule] = key.split('_');
        const point = state.currentFormat!.measurementPoints.find(p => p.id === pointId);
        const pointName = point?.name || `Punto_${pointId}`;
        const scheduleName = schedule === 'diurnal' ? 'Diurno' : 'Nocturno';
        const folderName = `fotos/${pointName}_${scheduleName}`;
        
        photos.forEach((photo, index) => {
          const fileName = `foto_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
          filesToZip.push({
            path: photo.uri,
            name: `${folderName}/${fileName}`,
          });
        });
      });
    }

    // 3. Crear archivo de información
    const infoContent = `Exportación Completa - ${state.currentFormat.generalInfo.company}
Fecha: ${state.currentFormat.generalInfo.date}
Orden de Trabajo: ${state.currentFormat.generalInfo.workOrder.type}-${state.currentFormat.generalInfo.workOrder.number}-${state.currentFormat.generalInfo.workOrder.year}

Archivos incluidos:
- formato_campo.json: Datos completos del formulario
- fotos/: Carpeta con fotos organizadas por punto y horario
- Total de fotos: ${state.currentFormat.photos.length}

Estructura de carpetas por punto y horario de medición.
Generado: ${new Date().toLocaleString('es-ES')}
`;
    
    const tempInfoPath = `${FileSystem.documentDirectory}temp_info.txt`;
    await FileSystem.writeAsStringAsync(tempInfoPath, infoContent);
    filesToZip.push({
      path: tempInfoPath,
      name: 'informacion.txt',
    });

    // 4. Crear ZIP con progreso
    await createZipFile(filesToZip, zipPath, (progress) => {
      setZipProgress(progress * 100);
    });

    // 5. Limpiar archivos temporales
    await FileSystem.deleteAsync(tempJsonPath, { idempotent: true });
    await FileSystem.deleteAsync(tempInfoPath, { idempotent: true });
    
    return zipPath;
  };

  const handleExport = async (optionId: 'all' | 'format' | 'photos') => {
    if (!state.currentFormat) {
      Alert.alert('Error', 'No hay formato activo para exportar');
      return;
    }

    setLoading(optionId);
    setZipProgress(0);
    
    try {
      let fileToShare: string;
      
      switch (optionId) {
        case 'all':
          fileToShare = await exportAll();
          break;
        case 'format':
          fileToShare = await exportFormat();
          break;
        case 'photos':
          fileToShare = await exportPhotos();
          break;
        default:
          throw new Error('Opción de exportación no válida');
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
      
    } catch (error: any) {
      console.error('Error en exportación:', error);
      Alert.alert('Error', error.message || 'No se pudo completar la exportación');
    } finally {
      setLoading(null);
      setZipProgress(0);
    }
  };

  if (!state.currentFormat) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <Feather name="file-x" size={48} color={COLORS.textSecondary} />
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
    <ScrollView style={styles.container}>
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
    fontSize: 28,
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
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
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