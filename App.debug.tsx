import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Aplicación de debug super simple
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Formato de Campo Eprodesa</Text>
      <Text style={styles.subtitle}>Aplicación funcionando en {Platform.OS}</Text>
      <Text style={styles.info}>
        Si ves este mensaje, React Native Web está funcionando correctamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
});