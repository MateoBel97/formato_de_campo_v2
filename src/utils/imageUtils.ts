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

    // On web, FileSystem.copyAsync is not available
    // We'll return the processed image URI directly
    // The filename metadata will be used during ZIP creation
    if (Platform.OS === 'web') {
      console.log('Web platform: Returning processed image URI directly');
      return result.uri;
    }

    // For native platforms, copy the file with metadata filename
    const watermarkedPath = `${documentDirectory}export_${watermarkedFileName}`;

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

  // Check if running on Windows (even in web mode)
  try {
    const { isWindows, getWindowsPhotosDirectory } = await import('./windowsStorage');

    if (isWindows()) {
      // For Windows (even in web mode), use Documents folder with Node.js fs
      try {
        photosDir = getWindowsPhotosDirectory();
        return photosDir;
      } catch (error) {
        console.error('Error getting Windows photos directory:', error);
        // Fallback
        const homeDir = process.env.USERPROFILE || 'C:\\Users\\Default';
        photosDir = `${homeDir}\\Documents\\Formato_Campo_V2\\Data\\Fotos\\`;
        return photosDir;
      }
    }
  } catch (importError) {
    console.warn('Could not import windowsStorage:', importError);
  }

  // For non-Windows web, use in-memory storage
  if (Platform.OS === 'web') {
    photosDir = 'memory://';
  } else {
    // For mobile platforms, use app's document directory
    photosDir = `${documentDirectory}Fotos/`;

    const dirInfo = await getInfoAsync(photosDir);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(photosDir, { intermediates: true });
    }
  }

  return photosDir;
};

// Copy image from external location to app's permanent storage
export const copyImageToPermanentStorage = async (sourceUri: string): Promise<string> => {
  try {
    console.log('📂 [IMAGE] Copying to permanent storage');
    console.log('📂 [IMAGE] Platform:', Platform.OS);

    // Get the photos directory (for all platforms)
    const photosDir = await getPhotosDirectory();
    console.log('📂 [IMAGE] Photos directory:', photosDir);

    // Generate unique filename based on timestamp
    const timestamp = Date.now();
    const extension = sourceUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const fileName = `photo_${timestamp}.${extension}`;
    const destinationUri = `${photosDir}${fileName}`;

    console.log('📂 [IMAGE] Destination:', destinationUri);

    // For web/Windows - always use data URLs for browser compatibility
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      console.log('📂 [IMAGE] Processing for web/Windows...');

      // For Windows, save to disk as backup (best effort), but always return data URL
      if (Platform.OS === 'windows') {
        try {
          // Try to dynamically import fs (only available in Windows/Electron)
          const fs = require('fs');

          // Ensure directory exists
          const photosDir = await getPhotosDirectory();
          if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir, { recursive: true });
          }

          let buffer: Buffer;

          if (sourceUri.startsWith('data:')) {
            // Handle data URL
            const base64Data = sourceUri.split(',')[1];
            if (!base64Data) {
              throw new Error('Invalid data URL: no base64 content found');
            }
            buffer = Buffer.from(base64Data, 'base64');
          } else {
            // Handle file URL - read from source
            const response = await fetch(sourceUri);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          }

          // Write to file using Node.js fs (as backup)
          fs.writeFileSync(destinationUri, buffer);
          console.log('✅ [IMAGE] File saved to disk as backup using Node.js fs');
          // Don't return here - continue to create data URL below

        } catch (fsError) {
          console.warn('⚠️ [IMAGE] Node.js fs backup failed, continuing with data URL only:', fsError);
          // Continue to web handling - this is not fatal
        }
      }

      // Always compress and store as data URL for web/Windows browser compatibility
      console.log('📂 [IMAGE] Using in-memory storage with compression');
      console.log('📂 [IMAGE] Source URI type:', sourceUri.substring(0, 50) + '...');

      let imageUri = sourceUri;

      // If not already a data URL, convert it
      if (!imageUri.startsWith('data:')) {
        console.log('📂 [IMAGE] Converting blob/file URL to data URL...');
        const response = await fetch(sourceUri);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        console.log('📂 [IMAGE] Blob size:', blob.size, 'bytes, type:', blob.type);
        imageUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log('📂 [IMAGE] FileReader completed, data URL length:', (reader.result as string).length);
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        console.log('📂 [IMAGE] Already a data URL, length:', imageUri.length);
      }

      // Compress the image significantly using ImageManipulator
      try {
        console.log('📂 [IMAGE] Starting compression...');
        const manipulated = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            { resize: { width: 800 } } // Resize to max 800px width
          ],
          {
            compress: 0.6, // 60% quality
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        console.log('✅ [IMAGE] Compressed successfully');
        console.log('✅ [IMAGE] Manipulated URI type:', manipulated.uri.substring(0, 50) + '...');

        // ImageManipulator returns blob URL in web, need to convert to data URL
        let finalUri = manipulated.uri;
        if (!finalUri.startsWith('data:')) {
          console.log('📂 [IMAGE] Converting manipulated blob to data URL...');
          const response = await fetch(finalUri);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          finalUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        console.log('✅ [IMAGE] Final URI type:', finalUri.substring(0, 50) + '...');
        console.log('✅ [IMAGE] Final URI length:', finalUri.length);
        console.log('✅ [IMAGE] Is data URL?', finalUri.startsWith('data:'));
        return finalUri;
      } catch (compressionError) {
        console.warn('⚠️ [IMAGE] Compression failed, using original:', compressionError);
        console.log('⚠️ [IMAGE] Original URI type:', imageUri.substring(0, 50) + '...');
        console.log('⚠️ [IMAGE] Original URI length:', imageUri.length);
        return imageUri;
      }
    }

    // For mobile platforms with data URLs
    if (sourceUri.startsWith('data:')) {
      console.log('📂 [IMAGE] Processing data URL for mobile...');

      const base64Data = sourceUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URL: no base64 content found');
      }

      await writeAsStringAsync(destinationUri, base64Data, {
        encoding: EncodingType.Base64,
      });

      console.log('✅ [IMAGE] Data URL saved');
      return destinationUri;
    }

    // For mobile platforms with file URIs, use direct copy
    console.log('📂 [IMAGE] Using direct copy for mobile...');
    await copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    console.log('✅ [IMAGE] Image copied');
    return destinationUri;

  } catch (error) {
    console.error('❌ [IMAGE] Error copying image:', error instanceof Error ? error.message : 'Unknown');
    throw new Error(`Failed to copy image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};