import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
import FormButton from '../components/FormButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { MeasurementFormat } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateFileName } from '../utils/exportUtils';
import { createPhotosZip, createZipFile, FileToZip } from '../utils/zipUtils';

type SavedFormatsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SavedFormats'>;

interface ExportOption {
  id: 'all' | 'format' | 'photos';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const SavedFormatsScreen: React.FC = () => {
  const navigation = useNavigation<SavedFormatsScreenNavigationProp>();
  const { state, loadFormat, deleteFormat, loadSavedFormats } = useMeasurement();
  const [selectedFormat, setSelectedFormat] = useState<MeasurementFormat | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [formatToDelete, setFormatToDelete] = useState<MeasurementFormat | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadSavedFormats();
  }, []);

  const handleSelectFormat = (measurementFormat: MeasurementFormat) => {
    loadFormat(measurementFormat);
    navigation.navigate('MeasurementForm');
  };

  const handleDeleteFormat = (measurementFormat: MeasurementFormat) => {
    setFormatToDelete(measurementFormat);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (formatToDelete) {
      deleteFormat(formatToDelete.id);
      setFormatToDelete(null);
    }
  };

  const handleShareFormat = (measurementFormat: MeasurementFormat) => {
    setSelectedFormat(measurementFormat);
    setShowExportModal(true);
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
      title: 'Exportar JSON',
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

  const exportFormat = async (measurementFormat: MeasurementFormat): Promise<string> => {
    const fileName = generateFileName(measurementFormat, 'formato');
    const jsonContent = JSON.stringify(measurementFormat, null, 2);

    // For web, download directly using browser API
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return `${fileName}.json`;
    }

    // For mobile, use file system
    const fileUri = `${documentDirectory}${fileName}.json`;
    await writeAsStringAsync(fileUri, jsonContent);
    return fileUri;
  };

  const exportPhotos = async (measurementFormat: MeasurementFormat): Promise<string> => {
    if (!measurementFormat.photos.length) {
      throw new Error('No hay fotos para exportar');
    }

    const baseName = generateFileName(measurementFormat, 'fotos');
    const zipPath = `${documentDirectory}${baseName}.zip`;

    // Clean up any existing ZIP file (mobile only)
    if (Platform.OS !== 'web' && Platform.OS !== 'windows') {
      try {
        await deleteAsync(zipPath, { idempotent: true });
      } catch (error) {
        console.warn('Could not delete existing ZIP file:', error);
      }
    }

    const photosForZip: Array<{ uri: string; pointName: string; schedule: string; index: number; timestamp: string; location?: { latitude: number; longitude: number } | null }> = [];

    // Separar fotos por tipo
    const measurementPhotos = measurementFormat.photos.filter(photo => photo.type === 'measurement');
    const croquisPhotos = measurementFormat.photos.filter(photo => photo.type === 'croquis');

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
      const point = measurementFormat.measurementPoints.find(p => p.id === pointId);
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
    const result = await createPhotosZip(photosForZip, zipPath, (progress) => {
      setExportProgress(progress * 100);
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

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return `${baseName}.zip`;
    }

    return result;
  };

  const exportAll = async (measurementFormat: MeasurementFormat): Promise<string> => {
    const baseName = generateFileName(measurementFormat, 'completo');
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

    const jsonContent = JSON.stringify(measurementFormat, null, 2);

    // For web, create JSON as data URL
    if (Platform.OS === 'web') {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      filesToZip.push({
        path: dataUrl,
        name: 'formato_campo.json',
      });
    } else {
      // For native platforms, write to file system
      const tempJsonPath = `${documentDirectory}temp_formato_complete.json`;
      await writeAsStringAsync(tempJsonPath, jsonContent);
      filesToZip.push({
        path: tempJsonPath,
        name: 'formato_campo.json',
      });
    }

    if (measurementFormat.photos.length > 0) {
      // Separar fotos por tipo
      const measurementPhotos = measurementFormat.photos.filter(photo => photo.type === 'measurement');
      const croquisPhotos = measurementFormat.photos.filter(photo => photo.type === 'croquis');

      // Organizar fotos de medición por punto y horario
      const photosByPointSchedule = measurementPhotos.reduce((acc, photo) => {
        const key = `${photo.pointId}_${photo.schedule}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(photo);
        return acc;
      }, {} as Record<string, typeof measurementPhotos>);

      for (const [key, photos] of Object.entries(photosByPointSchedule)) {
        const [pointId, schedule] = key.split('_');
        const point = measurementFormat.measurementPoints.find(p => p.id === pointId);
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
            // For mobile, validate file exists
            try {
              const photoInfo = await getInfoAsync(photo.uri);
              if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
                const fileName = `foto_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
                filesToZip.push({
                  path: photo.uri,
                  name: `${folderName}/${fileName}`,
                });
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
          const fileName = `croquis_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
          filesToZip.push({
            path: photo.uri,
            name: `fotos/Croquis/${fileName}`,
          });
        } else {
          try {
            const photoInfo = await getInfoAsync(photo.uri);
            if (photoInfo.exists && photoInfo.size && photoInfo.size > 0) {
              const fileName = `croquis_${index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
              filesToZip.push({
                path: photo.uri,
                name: `fotos/Croquis/${fileName}`,
              });
            }
          } catch (error) {
            console.warn(`Error validating croquis photo ${photo.uri}:`, error);
          }
        }
      }
    }

    const infoContent = `Exportación Completa - ${measurementFormat.generalInfo.company}
Fecha: ${measurementFormat.generalInfo.date}
Orden de Trabajo: ${measurementFormat.generalInfo.workOrder.type}-${measurementFormat.generalInfo.workOrder.number}-${measurementFormat.generalInfo.workOrder.year}

Archivos incluidos:
- formato_campo.json: Datos completos del formulario
- fotos/: Carpeta con fotos organizadas por punto y horario

Generado: ${new Date().toLocaleString('es-ES')}`;

    // For web, create info file as data URL
    if (Platform.OS === 'web') {
      const blob = new Blob([infoContent], { type: 'text/plain' });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      filesToZip.push({
        path: dataUrl,
        name: 'informacion.txt',
      });
    } else {
      // For native platforms, write to file system
      const tempInfoPath = `${documentDirectory}temp_info_complete.txt`;
      await writeAsStringAsync(tempInfoPath, infoContent);
      filesToZip.push({
        path: tempInfoPath,
        name: 'informacion.txt',
      });
    }

    const result = await createZipFile(filesToZip, zipPath, (progress) => {
      setExportProgress(progress * 100);
    });

    // Clean up temp files (only for native platforms)
    if (Platform.OS !== 'web') {
      try {
        const tempJsonPath = `${documentDirectory}temp_formato_complete.json`;
        const tempInfoPath = `${documentDirectory}temp_info_complete.txt`;
        await deleteAsync(tempJsonPath, { idempotent: true });
        await deleteAsync(tempInfoPath, { idempotent: true });
      } catch (error) {
        console.warn('Error cleaning up temporary files:', error);
      }
    }

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

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return `${baseName}.zip`;
    }

    return result;
  };

  const handleExport = async (optionId: 'all' | 'format' | 'photos') => {
    if (!selectedFormat) return;

    setLoading(optionId);
    setExportProgress(0);
    
    try {
      let fileToShare: string;
      
      switch (optionId) {
        case 'all':
          fileToShare = await exportAll(selectedFormat);
          break;
        case 'format':
          fileToShare = await exportFormat(selectedFormat);
          break;
        case 'photos':
          fileToShare = await exportPhotos(selectedFormat);
          break;
        default:
          throw new Error('Opción de exportación no válida');
      }

      const fileInfo = await getInfoAsync(fileToShare);
      if (!fileInfo.exists) {
        throw new Error('El archivo exportado no se creó correctamente');
      }

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
      
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Error en exportación:', error);
      
      let errorMessage = 'No se pudo completar la exportación';
      if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error de Exportación', errorMessage, [
        {
          text: 'Reintentar',
          onPress: () => handleExport(optionId),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setShowExportModal(false),
        }
      ]);
    } finally {
      setLoading(null);
      setExportProgress(0);
    }
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
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteFormat(item);
            }}
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

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={(e) => {
              e.stopPropagation();
              handleShareFormat(item);
            }}
          >
            <Feather name="share-2" size={16} color={COLORS.primary} />
            <Text style={styles.shareButtonText}>Compartir</Text>
          </TouchableOpacity>
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
    <View style={styles.container}>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.content}>
          {state.savedFormats.length === 0 ? (
            renderEmptyState()
          ) : (
            state.savedFormats
              .sort((a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime())
              .map((item) => (
                <View key={item.id}>
                  {renderFormatItem({ item })}
                </View>
              ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compartir Formato</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowExportModal(false)}
                disabled={loading !== null}
              >
                <Feather name="x" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Selecciona qué información deseas compartir
            </Text>

            <View style={styles.exportOptionsContainer}>
              {exportOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.exportOptionCard, { borderLeftColor: option.color }]}
                  onPress={() => handleExport(option.id)}
                  disabled={loading !== null}
                >
                  <View style={styles.exportOptionContent}>
                    <View style={[styles.exportIconContainer, { backgroundColor: option.color + '20' }]}>
                      <Feather name={option.icon as any} size={20} color={option.color} />
                    </View>
                    <View style={styles.exportOptionText}>
                      <Text style={styles.exportOptionTitle}>{option.title}</Text>
                      <Text style={styles.exportOptionSubtitle}>{option.subtitle}</Text>
                    </View>
                    {loading === option.id ? (
                      <View style={styles.exportLoadingContainer}>
                        <ActivityIndicator size="small" color={option.color} />
                        {(option.id === 'photos' || option.id === 'all') && exportProgress > 0 && (
                          <Text style={styles.exportProgressText}>{Math.round(exportProgress)}%</Text>
                        )}
                      </View>
                    ) : (
                      <Feather name="arrow-right" size={16} color={COLORS.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Confirmar eliminación"
        message={`¿Está seguro de que desea eliminar el formato "${formatToDelete?.generalInfo.company || 'Sin nombre'}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        useHoldToDelete={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setFormatToDelete(null);
        }}
        confirmColor={COLORS.error}
        icon="trash-2"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: Platform.select({
    web: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: COLORS.background,
    },
    default: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
  }),
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
  scrollView: Platform.select({
    web: {
      flex: 1,
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
    },
    default: {
      flex: 1,
    },
  }),
  scrollContentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
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
  actionButtonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 6,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  exportOptionsContainer: {
    gap: 12,
  },
  exportOptionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 16,
  },
  exportOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  exportOptionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  exportLoadingContainer: {
    alignItems: 'center',
    gap: 4,
  },
  exportProgressText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
});

export default SavedFormatsScreen;