import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface WatermarkOptions {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

export const addWatermarkToImage = async (
  imageUri: string,
  options: WatermarkOptions
): Promise<string> => {
  // Skip image manipulation to improve upload speed
  // Return original URI directly
  return imageUri;
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