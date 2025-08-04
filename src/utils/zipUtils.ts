import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';

export interface FileToZip {
  path: string;
  name: string; // Nombre dentro del ZIP
}

export const createZipFile = async (
  files: FileToZip[],
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const zip = new JSZip();
  
  // Agregar archivos al ZIP
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Leer el archivo como base64
      const fileContent = await FileSystem.readAsStringAsync(file.path, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Agregar al ZIP
      zip.file(file.name, fileContent, { base64: true });
      
      // Reportar progreso
      if (onProgress) {
        const progress = ((i + 1) / files.length) * 0.8; // 80% para agregar archivos
        onProgress(progress);
      }
    } catch (error) {
      console.warn(`No se pudo agregar el archivo ${file.path} al ZIP:`, error);
    }
  }
  
  // Generar el ZIP
  if (onProgress) onProgress(0.9); // 90%
  
  const zipContent = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6, // Compresión media para balance entre tamaño y velocidad
    },
  });
  
  // Escribir el archivo ZIP
  await FileSystem.writeAsStringAsync(outputPath, zipContent, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  if (onProgress) onProgress(1.0); // 100%
  
  return outputPath;
};

export const createPhotosZip = async (
  photos: Array<{ uri: string; pointName: string; schedule: string; index: number; timestamp: string }>,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const filesToZip: FileToZip[] = [];
  
  // Organizar archivos por carpetas
  photos.forEach((photo) => {
    const folderName = `${photo.pointName}_${photo.schedule === 'diurnal' ? 'Diurno' : 'Nocturno'}`;
    const fileName = `foto_${photo.index + 1}_${new Date(photo.timestamp).getTime()}.jpg`;
    const zipPath = `${folderName}/${fileName}`;
    
    filesToZip.push({
      path: photo.uri,
      name: zipPath,
    });
  });
  
  // Agregar archivo de información
  const infoText = `Exportación de Fotos
Total de fotos: ${photos.length}
Estructura de carpetas por punto y horario de medición.
Generado: ${new Date().toLocaleString('es-ES')}
`;
  
  // Crear archivo temporal de información
  const tempInfoPath = `${FileSystem.documentDirectory}temp_info.txt`;
  await FileSystem.writeAsStringAsync(tempInfoPath, infoText);
  
  filesToZip.push({
    path: tempInfoPath,
    name: 'informacion.txt',
  });
  
  // Crear ZIP
  const zipPath = await createZipFile(filesToZip, outputPath, onProgress);
  
  // Limpiar archivo temporal
  await FileSystem.deleteAsync(tempInfoPath, { idempotent: true });
  
  return zipPath;
};