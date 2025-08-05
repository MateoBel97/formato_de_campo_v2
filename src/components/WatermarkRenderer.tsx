import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';

interface WatermarkRendererProps {
  imageUri: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  imageWidth?: number;
  imageHeight?: number;
}

const WatermarkRenderer: React.FC<WatermarkRendererProps> = ({
  imageUri,
  timestamp,
  location,
  imageWidth = 1200,
  imageHeight = 900,
}) => {
  const formatTimestamp = (timestamp: string): string => {
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

  const formatCoordinates = (latitude: number, longitude: number): string => {
    const latDirection = latitude >= 0 ? 'N' : 'S';
    const lngDirection = longitude >= 0 ? 'E' : 'W';
    
    const latDegrees = Math.abs(latitude);
    const lngDegrees = Math.abs(longitude);
    
    return `${latDegrees.toFixed(6)}°${latDirection} ${lngDegrees.toFixed(6)}°${lngDirection}`;
  };

  const formattedDate = formatTimestamp(timestamp);
  const locationText = location 
    ? formatCoordinates(location.latitude, location.longitude)
    : 'Sin ubicación GPS';

  return (
    <View style={[styles.container, { width: imageWidth, height: imageHeight }]}>
      <Image 
        source={{ uri: imageUri }} 
        style={[styles.image, { width: imageWidth, height: imageHeight }]}
        resizeMode="cover"
      />
      
      {/* Watermark overlay */}
      <View style={styles.watermarkContainer}>
        <View style={styles.watermarkBackground}>
          <Text style={styles.watermarkText}>{formattedDate}</Text>
          <Text style={styles.watermarkText}>{locationText}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  watermarkBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    fontFamily: 'System',
  },
});

export default WatermarkRenderer;