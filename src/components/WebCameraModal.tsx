import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

// Declare div and other HTML elements for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      video: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
      canvas: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
      img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
    }
  }
}

interface WebCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}

const WebCameraModal: React.FC<WebCameraModalProps> = ({
  visible,
  onClose,
  onCapture,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Callback ref to ensure video element is captured
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      console.log('Video element ref set');
      videoRef.current = node;

      // If we already have a stream, attach it
      if (stream && node.srcObject !== stream) {
        console.log('Attaching existing stream to newly mounted video element');
        node.srcObject = stream;
        node.play().catch(err => console.error('Error playing video:', err));
      }
    }
  }, [stream]);

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      // Small delay to ensure the video element is rendered
      setTimeout(() => {
        startCamera();
      }, 100);
    }

    return () => {
      stopCamera();
    };
  }, [visible, facingMode]);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop previous stream if any
      stopCamera();

      console.log('Requesting camera access...');

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      console.log('Camera access granted, stream obtained:', mediaStream);
      console.log('Video tracks:', mediaStream.getVideoTracks());

      setStream(mediaStream);

      // Wait a bit for refs to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Attach stream to video element
      if (videoRef.current) {
        console.log('Attaching stream to video element');
        videoRef.current.srcObject = mediaStream;

        // Try to play
        try {
          await videoRef.current.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.error('Error playing video:', playError);
        }
      } else {
        console.error('Video ref is null!');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsLoading(false);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en tu navegador.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No se encontró ninguna cámara en tu dispositivo.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('La cámara está siendo usada por otra aplicación. Cierra otras aplicaciones que puedan estar usando la cámara.');
        } else {
          setError(`Error al acceder a la cámara: ${err.message}`);
        }
      } else {
        setError('Error desconocido al acceder a la cámara.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageDataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cámara Web</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Camera view */}
          <View style={styles.cameraContainer}>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Iniciando cámara...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={48} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={startCamera}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isLoading && !error && (
              <>
                {/* Video element for camera stream */}
                {!capturedImage && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#000',
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <video
                      ref={setVideoRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      autoPlay
                      playsInline
                      muted
                    />
                  </div>
                )}

                {/* Canvas for capturing photo (hidden) */}
                <canvas
                  ref={(ref) => { canvasRef.current = ref; }}
                  style={{ display: 'none' }}
                />

                {/* Captured image preview */}
                {capturedImage && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#000',
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={capturedImage}
                      alt="Captured"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </View>

          {/* Controls */}
          {!error && (
            <View style={styles.controls}>
              {!capturedImage ? (
                <>
                  {/* Camera toggle button */}
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={toggleCamera}
                    disabled={isLoading}
                  >
                    <Feather name="rotate-cw" size={24} color={COLORS.primary} />
                    <Text style={styles.controlButtonText}>Cambiar</Text>
                  </TouchableOpacity>

                  {/* Capture button */}
                  <TouchableOpacity
                    style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
                    onPress={capturePhoto}
                    disabled={isLoading}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>

                  {/* Spacer for symmetry */}
                  <View style={styles.controlButton} />
                </>
              ) : (
                <>
                  {/* Retake button */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleRetake}
                  >
                    <Feather name="rotate-ccw" size={20} color={COLORS.surface} />
                    <Text style={styles.actionButtonText}>Retomar</Text>
                  </TouchableOpacity>

                  {/* Confirm button */}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={handleConfirm}
                  >
                    <Feather name="check" size={20} color={COLORS.surface} />
                    <Text style={styles.actionButtonText}>Usar Foto</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const modalWidth = Math.min(screenWidth - 40, 600);
const cameraHeight = Math.min(screenHeight * 0.6, 450);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: modalWidth,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  cameraContainer: {
    width: '100%',
    height: cameraHeight,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    minWidth: 60,
  },
  controlButtonText: {
    fontSize: 12,
    color: COLORS.text,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary || '#6B7280',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WebCameraModal;
