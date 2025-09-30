import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { MeasurementProvider } from './src/context/MeasurementContext';
import AppNavigator from './src/navigation/AppNavigator';

// Simplified web utils without problematic imports
const enableWebScrollSimple = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.webkitOverflowScrolling = 'touch';
    const root = document.getElementById('root');
    if (root) {
      root.style.height = '100%';
      root.style.overflow = 'auto';
    }
  }
};

export default function App() {
  useEffect(() => {
    // Initialize web-specific fixes with error handling
    if (Platform.OS === 'web') {
      try {
        enableWebScrollSimple();
        console.log('Web scroll enabled successfully');
      } catch (error) {
        console.error('Error enabling web scroll:', error);
      }
    }
  }, []);

  // Add error boundary for web debugging
  if (Platform.OS === 'web') {
    try {
      return (
        <GestureHandlerRootView style={styles.container}>
          <MeasurementProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </MeasurementProvider>
        </GestureHandlerRootView>
      );
    } catch (error) {
      console.error('App rendering error:', error);
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
            Error al cargar la aplicación
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
            Error: {error?.toString() || 'Error desconocido'}
          </Text>
        </View>
      );
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <MeasurementProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </MeasurementProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: Platform.select({
    web: {
      height: '100vh',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
    },
    default: {
      flex: 1,
    },
  }),
});