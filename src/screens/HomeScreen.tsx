import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMeasurement } from '../context/MeasurementContext';
import FormButton from '../components/FormButton';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { createNewFormat } = useMeasurement();

  const handleCreateNewFormat = () => {
    createNewFormat();
    navigation.navigate('MeasurementForm');
  };

  const handleViewSavedFormats = () => {
    navigation.navigate('SavedFormats');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Formato de Campo V2</Text>
          <Text style={styles.subtitle}>
            Aplicación para mediciones acústicas profesionales
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <FormButton
            title="Crear Nuevo Formato"
            onPress={handleCreateNewFormat}
            size="large"
            style={styles.primaryButton}
          />
          
          <FormButton
            title="Ver Formatos Guardados"
            onPress={handleViewSavedFormats}
            variant="outline"
            size="large"
            style={styles.secondaryButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gestiona mediciones de ruido bajo diferentes métodos y condiciones
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    paddingVertical: 16,
  },
  secondaryButton: {
    paddingVertical: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HomeScreen;