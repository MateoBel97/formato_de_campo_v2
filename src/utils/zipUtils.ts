import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import { createWatermarkedImageForExport } from './imageUtils';

export interface FileToZip {
  path: string;
  name: string; // Nombre dentro del ZIP
}

// Helper function to add delay for better progress tracking
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createZipFile = async (
  files: FileToZip[],
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const zip = new JSZip();
  
  // Initialize progress
  if (onProgress) onProgress(0.01);
  
  // Process files in smaller batches to prevent memory issues
  const batchSize = 5;
  const totalFiles = files.length;
  
  for (let batchStart = 0; batchStart < totalFiles; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalFiles);
    const batch = files.slice(batchStart, batchEnd);
    
    // Process batch
    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const globalIndex = batchStart + i;
      
      try {
        // Check if file exists before reading
        const fileInfo = await FileSystem.getInfoAsync(file.path);
        if (!fileInfo.exists) {
          console.warn(`File does not exist: ${file.path}`);
          continue;
        }
        
        // Read file with error handling
        const fileContent = await FileSystem.readAsStringAsync(file.path, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Check file content is valid
        if (!fileContent || fileContent.length === 0) {
          console.warn(`Empty or invalid file content: ${file.path}`);
          continue;
        }
        
        // Add to ZIP with error handling
        zip.file(file.name, fileContent, { base64: true });
        
        // Report progress more frequently
        if (onProgress) {
          const progress = ((globalIndex + 1) / totalFiles) * 0.7; // 70% for adding files
          onProgress(progress);
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
  
  // Generate ZIP with progress tracking
  if (onProgress) onProgress(0.8); // 80%
  
  try {
    const zipContent = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 3, // Lower compression for faster processing
      },
    }, (metadata) => {
      // Track ZIP generation progress
      if (onProgress && metadata.percent) {
        const zipProgress = 0.8 + (metadata.percent / 100) * 0.15; // 80-95%
        onProgress(zipProgress);
      }
    });
    
    if (onProgress) onProgress(0.95); // 95%
    
    // Write file with error handling
    await FileSystem.writeAsStringAsync(outputPath, zipContent, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    if (onProgress) onProgress(1.0); // 100%
    
    return outputPath;
    
  } catch (error) {
    console.error('Failed to generate or write ZIP file:', error);
    throw new Error(`ZIP generation failed: ${error.message}`);
  }
};

export const createPhotosZip = async (
  photos: Array<{ uri: string; pointName: string; schedule: string; index: number; timestamp: string; location?: { latitude: number; longitude: number } | null }>,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Validate input
    if (!photos || photos.length === 0) {
      throw new Error('No photos provided for ZIP creation');
    }
    
    if (onProgress) onProgress(0.05);
    
    const filesToZip: FileToZip[] = [];
    
    // Process photos with watermarks
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // Check if photo file exists
        const photoInfo = await FileSystem.getInfoAsync(photo.uri);
        if (!photoInfo.exists) {
          console.warn(`Photo file does not exist: ${photo.uri}`);
          continue;
        }

        // Update progress for photo processing
        if (onProgress) {
          const photoProgress = 0.1 + (i / photos.length) * 0.4; // 10% to 50%
          onProgress(photoProgress);
        }

        // Create watermarked version for export
        const watermarkedUri = await createWatermarkedImageForExport(photo.uri, {
          timestamp: photo.timestamp,
          location: photo.location || null,
        });
        
        const folderName = `${photo.pointName}_${photo.schedule === 'diurnal' ? 'Diurno' : 'Nocturno'}`;
        const fileName = `foto_${photo.index + 1}_con_metadatos.jpg`;
        const zipPath = `${folderName}/${fileName}`;
        
        filesToZip.push({
          path: watermarkedUri,
          name: zipPath,
        });

        // Also add the metadata info file
        const infoFileName = `info_foto_${photo.index + 1}.txt`;
        const infoZipPath = `${folderName}/${infoFileName}`;
        const infoPath = watermarkedUri.replace('.jpg', '_info.txt');
        
        if (await FileSystem.getInfoAsync(infoPath.replace('export_foto_', 'export_info_'))) {
          filesToZip.push({
            path: infoPath.replace('export_foto_', 'export_info_'),
            name: infoZipPath,
          });
        }

      } catch (error) {
        console.warn(`Error processing photo ${photo.uri}:`, error);
        
        // Fallback: add original photo if watermarking fails
        const folderName = `${photo.pointName}_${photo.schedule === 'diurnal' ? 'Diurno' : 'Nocturno'}`;
        const fileName = `foto_${photo.index + 1}_original.jpg`;
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
    
    if (onProgress) onProgress(0.55); // After watermark processing
    
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
    
    const tempInfoPath = `${FileSystem.documentDirectory}temp_photos_info.txt`;
    await FileSystem.writeAsStringAsync(tempInfoPath, infoText);
    
    filesToZip.push({
      path: tempInfoPath,
      name: 'informacion.txt',
    });
    
    if (onProgress) onProgress(0.6); // After info file creation
    
    // Create ZIP with progress tracking
    const zipPath = await createZipFile(filesToZip, outputPath, (progress) => {
      // Map progress from 60% to 100%
      const mappedProgress = 0.6 + (progress * 0.4);
      if (onProgress) onProgress(mappedProgress);
    });
    
    // Clean up temporary file
    try {
      await FileSystem.deleteAsync(tempInfoPath, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete temporary info file:', error);
    }
    
    return zipPath;
    
  } catch (error) {
    console.error('Error in createPhotosZip:', error);
    throw new Error(`Photos ZIP creation failed: ${error.message}`);
  }
};