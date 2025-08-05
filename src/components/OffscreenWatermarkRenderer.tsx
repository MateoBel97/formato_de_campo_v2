import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import WatermarkRenderer from './WatermarkRenderer';
import { Photo } from '../types';

interface OffscreenWatermarkRendererProps {
  photos: Photo[];
  onPhotoProcessed: (originalPhoto: Photo, watermarkedUri: string) => void;
  onAllPhotosProcessed: () => void;
  onError: (error: Error) => void;
}

const OffscreenWatermarkRenderer: React.FC<OffscreenWatermarkRendererProps> = ({
  photos,
  onPhotoProcessed,
  onAllPhotosProcessed,
  onError,
}) => {
  const viewRef = useRef<View>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (photos.length > 0 && !isProcessing) {
      processNextPhoto();
    }
  }, [photos, currentPhotoIndex, isProcessing]);

  const processNextPhoto = async () => {
    if (currentPhotoIndex >= photos.length) {
      onAllPhotosProcessed();
      return;
    }

    setIsProcessing(true);
    const currentPhoto = photos[currentPhotoIndex];

    try {
      // Wait a bit for the component to render
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!viewRef.current) {
        throw new Error('View reference not available');
      }

      // Capture the watermarked image
      const watermarkedUri = await captureRef(viewRef.current, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
        width: 1200,
        height: 900,
      });

      onPhotoProcessed(currentPhoto, watermarkedUri);
      
      // Move to next photo
      setCurrentPhotoIndex(prev => prev + 1);

    } catch (error) {
      console.error('Error processing photo:', error);
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentPhotoIndex >= photos.length) {
    return null;
  }

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <View style={styles.container}>
      <View ref={viewRef} style={styles.hiddenContainer}>
        <WatermarkRenderer
          imageUri={currentPhoto.uri}
          timestamp={currentPhoto.timestamp}
          location={currentPhoto.location}
          imageWidth={1200}
          imageHeight={900}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -10000, // Hidden off-screen
    left: -10000,
    width: 1200,
    height: 900,
  },
  hiddenContainer: {
    width: 1200,
    height: 900,
  },
});

export default OffscreenWatermarkRenderer;