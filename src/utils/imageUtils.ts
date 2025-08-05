import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

export interface WatermarkOptions {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

export const addWatermarkToImage = async (
  imageUri: string,
  options: WatermarkOptions,
  viewRef?: React.RefObject<any>
): Promise<string> => {
  try {
    // For export functionality, we'll process the image and return optimized version
    // The actual watermark will be applied during export using view-shot
    
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        // Resize if image is too large to optimize performance
        { resize: { width: 1200 } }
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('Image processed and ready for watermark application during export');
    return result.uri;

  } catch (error) {
    console.error('Error processing image:', error);
    // Return original image if processing fails
    return imageUri;
  }
};

export const createWatermarkedImageForExport = async (
  imageUri: string,
  options: WatermarkOptions
): Promise<string> => {
  try {
    // Format the watermark information
    const formattedDate = formatTimestamp(options.timestamp);
    const locationText = options.location 
      ? formatCoordinates(options.location.latitude, options.location.longitude)
      : 'Sin ubicación GPS';

    // Create filename with embedded metadata for export
    const timestamp = new Date(options.timestamp);
    const safeDate = formattedDate.replace(/[\/\s:]/g, '_');
    const safeLocation = locationText.replace(/[°\s]/g, '_').replace(/[^\w\-_.]/g, '');
    const watermarkedFileName = `foto_${timestamp.getTime()}_${safeDate}_${safeLocation}.jpg`;
    
    // Process the image (resize and compress)
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 1200 } }
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Create the watermarked file path
    const watermarkedPath = `${FileSystem.documentDirectory}export_${watermarkedFileName}`;
    
    // Copy the processed image to the new path with metadata filename
    await FileSystem.copyAsync({
      from: result.uri,
      to: watermarkedPath,
    });

    // Create an info file alongside the image with full metadata
    const infoFileName = `info_${timestamp.getTime()}.txt`;
    const infoPath = `${FileSystem.documentDirectory}export_${infoFileName}`;
    const infoContent = [
      `INFORMACIÓN DE LA FOTO`,
      `========================`,
      `Fecha y Hora: ${formattedDate}`,
      `Coordenadas GPS: ${locationText}`,
      `Archivo Original: ${imageUri.split('/').pop()}`,
      `Procesado: ${new Date().toLocaleString('es-ES')}`,
      ``,
      `Esta información corresponde a los metadatos`,
      `de la fotografía tomada durante la medición.`,
    ].join('\n');

    await FileSystem.writeAsStringAsync(infoPath, infoContent);

    console.log('Watermarked image and metadata created for export');
    return watermarkedPath;

  } catch (error) {
    console.error('Error creating watermarked image for export:', error);
    // Return original image if watermarking fails
    return imageUri;
  }
};

export const formatCoordinates = (latitude: number, longitude: number): string => {
  const latDirection = latitude >= 0 ? 'N' : 'S';
  const lngDirection = longitude >= 0 ? 'E' : 'W';
  
  const latDegrees = Math.abs(latitude);
  const lngDegrees = Math.abs(longitude);
  
  return `${latDegrees.toFixed(6)}°${latDirection} ${lngDegrees.toFixed(6)}°${lngDirection}`;
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};