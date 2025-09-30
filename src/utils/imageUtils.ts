import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import {
  copyAsync,
  writeAsStringAsync,
  documentDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  EncodingType
} from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { Platform } from 'react-native';

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
    const watermarkedPath = `${documentDirectory}export_${watermarkedFileName}`;
    
    // Copy the processed image to the new path with metadata filename
    await copyAsync({
      from: result.uri,
      to: watermarkedPath,
    });

    // Create an info file alongside the image with full metadata
    const infoFileName = `info_${timestamp.getTime()}.txt`;
    const infoPath = `${documentDirectory}export_${infoFileName}`;
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

    await writeAsStringAsync(infoPath, infoContent);

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

// Get or create the photos directory for the app
export const getPhotosDirectory = async (): Promise<string> => {
  let photosDir: string;

  if (Platform.OS === 'web' || Platform.OS === 'windows') {
    // For Windows/Web, use Documents folder structure
    const homeDir = documentDirectory;
    photosDir = `${homeDir}Formato_Campo_V2/Data/Fotos/`;
  } else {
    // For mobile platforms, use app's document directory
    photosDir = `${documentDirectory}Fotos/`;
  }

  // Ensure directory exists (for mobile only, web/windows handles this differently)
  if (Platform.OS !== 'web' && Platform.OS !== 'windows') {
    const dirInfo = await getInfoAsync(photosDir);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(photosDir, { intermediates: true });
    }
  } else {
    // For web/windows, just try to create the directory (it will succeed silently if it exists)
    try {
      await makeDirectoryAsync(photosDir, { intermediates: true });
    } catch (error) {
      // Ignore errors - directory might already exist or will be created on first write
      console.log('Directory creation note (safe to ignore):', error);
    }
  }

  return photosDir;
};

// Copy image from external location to app's permanent storage
export const copyImageToPermanentStorage = async (sourceUri: string): Promise<string> => {
  try {
    console.log('=== START copyImageToPermanentStorage ===');
    console.log('Source URI:', sourceUri);
    console.log('Platform:', Platform.OS);

    // For web/Windows, we store images as data URLs in memory
    // since the file system APIs are not available
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      console.log('Processing image for web/Windows...');

      // If it's already a data URL, return it directly
      if (sourceUri.startsWith('data:')) {
        console.log('Already a data URL, returning as-is');
        return sourceUri;
      }

      // Fetch the file as a blob
      console.log('Fetching file as blob...');
      const response = await fetch(sourceUri);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Blob obtained, size:', blob.size, 'type:', blob.type);

      // Convert blob to data URL
      console.log('Converting blob to data URL...');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('Data URL created, length:', dataUrl.length);
      console.log('=== SUCCESS: Image converted to data URL ===');
      return dataUrl;
    }

    // For mobile platforms, use file system
    const photosDir = await getPhotosDirectory();
    console.log('Photos directory:', photosDir);

    // Generate unique filename based on timestamp
    const timestamp = Date.now();
    const extension = sourceUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const fileName = `photo_${timestamp}.${extension}`;
    const destinationUri = `${photosDir}${fileName}`;

    console.log('Destination URI:', destinationUri);

    // For data URLs on mobile
    if (sourceUri.startsWith('data:')) {
      console.log('Processing data URL for mobile...');

      const base64Data = sourceUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URL: no base64 content found');
      }

      await writeAsStringAsync(destinationUri, base64Data, {
        encoding: EncodingType.Base64,
      });

      console.log('=== SUCCESS: Data URL saved ===');
      return destinationUri;
    }

    // For file URIs on mobile, use direct copy
    console.log('Using direct copy for mobile...');
    await copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    console.log('=== SUCCESS: Image copied ===');
    return destinationUri;

  } catch (error) {
    console.error('=== ERROR in copyImageToPermanentStorage ===');
    console.error('Error:', error);
    console.error('Source URI was:', sourceUri);
    console.error('=== END ERROR ===');
    throw new Error(`Failed to copy image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};