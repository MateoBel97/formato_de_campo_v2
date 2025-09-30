import React from 'react';
import { Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  copyAsync,
  deleteAsync,
  documentDirectory
} from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { createWatermarkedImageForExport, formatTimestamp, formatCoordinates } from './imageUtils';
import { Photo } from '../types';

export interface WatermarkedPhoto extends Photo {
  watermarkedUri?: string;
}

export const processPhotosForExport = async (
  photos: Photo[],
  onProgress?: (progress: number, message: string) => void
): Promise<WatermarkedPhoto[]> => {
  const processedPhotos: WatermarkedPhoto[] = [];
  const totalPhotos = photos.length;

  if (onProgress) {
    onProgress(0, 'Iniciando procesamiento de fotos...');
  }

  for (let i = 0; i < totalPhotos; i++) {
    const photo = photos[i];
    
    try {
      if (onProgress) {
        onProgress((i / totalPhotos) * 0.9, `Procesando foto ${i + 1} de ${totalPhotos}...`);
      }

      // Create watermarked version using canvas-like approach
      const watermarkedUri = await createWatermarkedImageFile(photo);
      
      processedPhotos.push({
        ...photo,
        watermarkedUri,
      });

    } catch (error) {
      console.error(`Error processing photo ${photo.id}:`, error);
      // Include original photo if watermarking fails
      processedPhotos.push(photo);
    }
  }

  if (onProgress) {
    onProgress(1, 'Procesamiento completado');
  }

  return processedPhotos;
};

const createWatermarkedImageFile = async (photo: Photo): Promise<string> => {
  try {
    // Create a simple text overlay using ImageManipulator
    // Since we can't easily render React components in background,
    // we'll use a different approach: create a simple overlay
    
    // For now, we'll copy the original file and add metadata to filename
    const timestamp = new Date(photo.timestamp);
    const formattedDate = formatTimestamp(photo.timestamp);
    const locationText = photo.location 
      ? formatCoordinates(photo.location.latitude, photo.location.longitude)
      : 'Sin_ubicacion_GPS';
    
    // Create filename with metadata embedded
    const watermarkedFileName = `foto_${timestamp.getTime()}_${formattedDate.replace(/[\/\s:]/g, '_')}_${locationText.replace(/[°\s]/g, '_')}.jpg`;
    const watermarkedPath = `${documentDirectory}temp_watermarked_${watermarkedFileName}`;
    
    // Copy original file (for now - will be enhanced to add actual visual watermark)
    await copyAsync({
      from: photo.uri,
      to: watermarkedPath,
    });

    // TODO: Add actual image manipulation to overlay text
    // This would require a more complex implementation using either:
    // 1. Canvas-based approach (react-native-canvas or similar)
    // 2. Native module for image editing
    // 3. Server-side processing
    
    return watermarkedPath;

  } catch (error) {
    console.error('Error creating watermarked image file:', error);
    return photo.uri; // Return original if watermarking fails
  }
};

export const cleanupWatermarkedImages = async (photos: WatermarkedPhoto[]): Promise<void> => {
  for (const photo of photos) {
    if (photo.watermarkedUri && photo.watermarkedUri !== photo.uri) {
      try {
        await deleteAsync(photo.watermarkedUri, { idempotent: true });
      } catch (error) {
        console.warn(`Failed to cleanup watermarked image: ${photo.watermarkedUri}`, error);
      }
    }
  }
};