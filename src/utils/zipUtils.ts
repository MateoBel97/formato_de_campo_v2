import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import {
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  readAsStringAsync,
  documentDirectory,
  EncodingType
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { createWatermarkedImageForExport, DetailedProgressInfo } from './imageUtils';

export interface FileToZip {
  path: string;
  name: string; // Nombre dentro del ZIP
  pointName?: string; // For detailed progress reporting
  schedule?: string; // For detailed progress reporting
  imageIndex?: number; // For detailed progress reporting
}

// Helper function to add delay for better progress tracking
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createZipFile = async (
  files: FileToZip[],
  outputPath: string,
  onProgress?: (progress: number, detailedInfo?: DetailedProgressInfo) => void
): Promise<string> => {
  const zip = new JSZip();

  // Initialize progress
  if (onProgress) {
    onProgress(0.01, {
      progress: 0.01,
      currentTask: 'Iniciando creación del archivo ZIP...',
      stage: 'preparing',
    });
  }

  // Use smaller batch size for Android tablets to reduce memory pressure
  const batchSize = Platform.OS === 'android' ? 3 : 5;
  const totalFiles = files.length;
  
  for (let batchStart = 0; batchStart < totalFiles; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalFiles);
    const batch = files.slice(batchStart, batchEnd);
    
    // Process batch
    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const globalIndex = batchStart + i;

      try {
        let fileContent: string;

        // For web/Windows, handle data URLs differently
        if ((Platform.OS === 'web' || Platform.OS === 'windows') && file.path.startsWith('data:')) {
          // It's a data URL, extract base64 part
          fileContent = file.path.split(',')[1];
        } else {
          // Check if file exists before reading (mobile only)
          if (Platform.OS !== 'web' && Platform.OS !== 'windows') {
            const fileInfo = await getInfoAsync(file.path);
            if (!fileInfo.exists) {
              console.warn(`File does not exist: ${file.path}`);
              continue;
            }
          }

          // Read file with error handling
          fileContent = await readAsStringAsync(file.path, {
            encoding: EncodingType.Base64,
          });
        }

        // Check file content is valid
        if (!fileContent || fileContent.length === 0) {
          console.warn(`Empty or invalid file content: ${file.path}`);
          continue;
        }

        // Add to ZIP with error handling
        zip.file(file.name, fileContent, { base64: true });

        // Report progress more frequently with detailed information
        if (onProgress) {
          const progress = ((globalIndex + 1) / totalFiles) * 0.7; // 70% for adding files
          const detailedInfo: DetailedProgressInfo = {
            progress,
            currentTask: `Agregando archivo al ZIP: ${file.name}`,
            currentPoint: file.pointName,
            currentSchedule: file.schedule,
            imageNumber: file.imageIndex ? file.imageIndex + 1 : undefined,
            totalImages: totalFiles,
            stage: 'creating_zip',
          };
          onProgress(progress, detailedInfo);
        }

        // Small delay to prevent blocking UI
        if (globalIndex % 3 === 0) {
          await delay(10);
        }

      } catch (error) {
        console.error(`Failed to process file ${file.path}:`, error);
        // Continue with other files instead of failing completely
      }
    }
    
    // Delay between batches to allow UI updates
    await delay(50);
  }

  // Generate ZIP with progress tracking - THIS IS THE CRITICAL 70-80% SECTION
  if (onProgress) {
    onProgress(0.72, {
      progress: 0.72,
      currentTask: 'Preparando compresión del archivo ZIP...',
      stage: 'creating_zip',
    });
  }

  // Add small delay before ZIP generation to ensure UI updates
  await delay(100);

  if (onProgress) {
    onProgress(0.75, {
      progress: 0.75,
      currentTask: 'Iniciando compresión del archivo ZIP...',
      stage: 'creating_zip',
    });
  }

  try {
    const zipContent = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 3, // Lower compression for faster processing
      },
    }, (metadata) => {
      // Track ZIP generation progress - 75% to 90%
      if (onProgress && metadata.percent) {
        const zipProgress = 0.75 + (metadata.percent / 100) * 0.15; // 75-90%
        const detailedInfo: DetailedProgressInfo = {
          progress: zipProgress,
          currentTask: `Comprimiendo archivo ZIP... ${Math.round(metadata.percent)}%`,
          stage: 'creating_zip',
        };
        onProgress(zipProgress, detailedInfo);
      }
    });

    if (onProgress) {
      onProgress(0.92, {
        progress: 0.92,
        currentTask: 'Compresión completada, preparando para guardar...',
        stage: 'writing_file',
      });
    }

    // For web, return the base64 content directly (will be handled by caller)
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      if (onProgress) {
        onProgress(1.0, {
          progress: 1.0,
          currentTask: 'Exportación completada',
          stage: 'complete',
        });
      }
      return zipContent; // Return base64 content for web
    }

    // For mobile, write file with error handling
    if (onProgress) {
      onProgress(0.95, {
        progress: 0.95,
        currentTask: 'Guardando archivo ZIP...',
        stage: 'writing_file',
      });
    }

    await writeAsStringAsync(outputPath, zipContent, {
      encoding: EncodingType.Base64,
    });

    if (onProgress) {
      onProgress(1.0, {
        progress: 1.0,
        currentTask: 'Exportación completada',
        stage: 'complete',
      });
    }

    return outputPath;
    
  } catch (error) {
    console.error('Failed to generate or write ZIP file:', error);
    throw new Error(`ZIP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createPhotosZip = async (
  photos: Array<{ uri: string; pointName: string; schedule: string; index: number; timestamp: string; location?: { latitude: number; longitude: number } | null }>,
  outputPath: string,
  onProgress?: (progress: number, detailedInfo?: DetailedProgressInfo) => void
): Promise<string> => {
  try {
    // Validate input
    if (!photos || photos.length === 0) {
      throw new Error('No photos provided for ZIP creation');
    }

    if (onProgress) {
      onProgress(0.05, {
        progress: 0.05,
        currentTask: 'Iniciando procesamiento de fotos...',
        stage: 'preparing',
      });
    }

    const filesToZip: FileToZip[] = [];

    // Process photos with watermarks
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];

      try {
        // Check if photo file exists (handle Windows/Web differently)
        let photoExists = false;

        if (Platform.OS === 'windows') {
          // For Windows, try using Node.js fs
          try {
            const fs = require('fs');
            photoExists = photo.uri.startsWith('data:') || fs.existsSync(photo.uri);
          } catch (fsError) {
            // If fs is not available, assume data URL exists
            photoExists = photo.uri.startsWith('data:');
          }
        } else if (Platform.OS === 'web') {
          // For web, data URLs always "exist"
          photoExists = photo.uri.startsWith('data:');
        } else {
          // For mobile, use getInfoAsync
          const photoInfo = await getInfoAsync(photo.uri);
          photoExists = photoInfo.exists;
        }

        if (!photoExists) {
          console.warn(`Photo file does not exist: ${photo.uri}`);
          continue;
        }

        // Update progress for photo processing
        if (onProgress) {
          const photoProgress = 0.1 + (i / photos.length) * 0.4; // 10% to 50%
          const scheduleName = photo.schedule === 'diurnal' ? 'Diurno' : photo.schedule === 'nocturnal' ? 'Nocturno' : 'General';
          onProgress(photoProgress, {
            progress: photoProgress,
            currentTask: `Procesando foto ${i + 1} de ${photos.length}`,
            currentPoint: photo.pointName,
            currentSchedule: scheduleName,
            imageNumber: i + 1,
            totalImages: photos.length,
            stage: 'processing_images',
          });
        }

        // Create watermarked version for export
        const watermarkedUri = await createWatermarkedImageForExport(
          photo.uri,
          {
            timestamp: photo.timestamp,
            location: photo.location || null,
          },
          {
            pointName: photo.pointName,
            schedule: photo.schedule,
            imageNumber: i,
            totalImages: photos.length,
          }
        );
        
        let folderName: string;
        let fileName: string;
        let scheduleName: string;

        if (photo.pointName === 'Croquis') {
          folderName = 'Croquis';
          fileName = `croquis_${photo.index + 1}_con_metadatos.jpg`;
          scheduleName = 'General';
        } else {
          scheduleName = photo.schedule === 'diurnal' ? 'Diurno' : 'Nocturno';
          folderName = `${photo.pointName}_${scheduleName}`;
          fileName = `foto_${photo.index + 1}_con_metadatos.jpg`;
        }

        const zipPath = `${folderName}/${fileName}`;

        filesToZip.push({
          path: watermarkedUri,
          name: zipPath,
          pointName: photo.pointName,
          schedule: scheduleName,
          imageIndex: photo.index,
        });

        // Also add the metadata info file
        const infoFileName = `info_foto_${photo.index + 1}.txt`;
        const infoZipPath = `${folderName}/${infoFileName}`;
        const infoPath = watermarkedUri.replace('.jpg', '_info.txt');
        
        if (await getInfoAsync(infoPath.replace('export_foto_', 'export_info_'))) {
          filesToZip.push({
            path: infoPath.replace('export_foto_', 'export_info_'),
            name: infoZipPath,
          });
        }

      } catch (error) {
        console.warn(`Error processing photo ${photo.uri}:`, error);
        
        // Fallback: add original photo if watermarking fails
        let folderName: string;
        let fileName: string;
        
        if (photo.pointName === 'Croquis') {
          folderName = 'Croquis';
          fileName = `croquis_${photo.index + 1}_original.jpg`;
        } else {
          folderName = `${photo.pointName}_${photo.schedule === 'diurnal' ? 'Diurno' : 'Nocturno'}`;
          fileName = `foto_${photo.index + 1}_original.jpg`;
        }
        
        const zipPath = `${folderName}/${fileName}`;
        
        filesToZip.push({
          path: photo.uri,
          name: zipPath,
        });
      }
    }
    
    if (filesToZip.length === 0) {
      throw new Error('No valid photos found for ZIP creation');
    }

    if (onProgress) {
      onProgress(0.55, {
        progress: 0.55,
        currentTask: 'Fotos procesadas, creando archivo de información...',
        stage: 'creating_zip',
      });
    }
    
    // Create info file
    const infoText = `Exportación de Fotos con Metadatos
Total de fotos procesadas: ${filesToZip.length / 2} fotos (cada una con archivo de metadatos)
Total de fotos originales: ${photos.length}
Estructura de carpetas por punto y horario de medición.
Cada foto incluye información de fecha, hora y coordenadas GPS.
Generado: ${new Date().toLocaleString('es-ES')}

FORMATO DE ARCHIVOS:
- foto_X_con_metadatos.jpg: Imagen procesada
- info_foto_X.txt: Archivo con metadatos detallados
`;

    // On web, create a data URL for the text file instead of using writeAsStringAsync
    if (Platform.OS === 'web') {
      const blob = new Blob([infoText], { type: 'text/plain' });
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
      // For native platforms, use writeAsStringAsync
      const tempInfoPath = `${documentDirectory}temp_photos_info.txt`;
      await writeAsStringAsync(tempInfoPath, infoText);

      filesToZip.push({
        path: tempInfoPath,
        name: 'informacion.txt',
      });
    }

    if (onProgress) {
      onProgress(0.6, {
        progress: 0.6,
        currentTask: 'Iniciando creación del archivo ZIP...',
        stage: 'creating_zip',
      });
    }

    // Create ZIP with progress tracking
    const zipPath = await createZipFile(filesToZip, outputPath, (progress, detailedInfo) => {
      // Map progress from 60% to 100%
      const mappedProgress = 0.6 + (progress * 0.4);
      if (onProgress) {
        if (detailedInfo) {
          onProgress(mappedProgress, {
            ...detailedInfo,
            progress: mappedProgress,
          });
        } else {
          onProgress(mappedProgress);
        }
      }
    });
    
    // Clean up temporary file (only for native platforms)
    if (Platform.OS !== 'web') {
      try {
        const tempInfoPath = `${documentDirectory}temp_photos_info.txt`;
        await deleteAsync(tempInfoPath, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete temporary info file:', error);
      }
    }

    return zipPath;
    
  } catch (error) {
    console.error('Error in createPhotosZip:', error);
    throw new Error(`Photos ZIP creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};