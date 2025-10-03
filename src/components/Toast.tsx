import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible && opacity._value === 0) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'x-circle';
      case 'info':
        return 'info';
      default:
        return 'check-circle';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return COLORS.primary;
      case 'error':
        return COLORS.error;
      case 'info':
        return COLORS.secondary || '#6B7280';
      default:
        return COLORS.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Feather name={getIcon()} size={24} color={COLORS.surface} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});

export default Toast;
