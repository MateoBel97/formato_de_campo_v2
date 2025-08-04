import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';

const QualitativeDataScreen: React.FC = () => {
  const { state, dispatch } = useMeasurement();
  const [activeTab, setActiveTab] = useState('qualitative');
  const [qualitativeData, setQualitativeData] = useState('');
  const [sourceReceptorData, setSourceReceptorData] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const qualitativeInputRef = useRef<TextInput>(null);
  const sourceReceptorInputRef = useRef<TextInput>(null);
  const currentFormat = state.currentFormat;

  // Load existing data
  useEffect(() => {
    if (currentFormat?.qualitativeData) {
      setQualitativeData(currentFormat.qualitativeData.description || 'La empresa se dedica a ');
      setSourceReceptorData(currentFormat.qualitativeData.sourceReceptorInfo || 'Se ubica el sonómetro a ');
    } else {
      // Set default values if no qualitative data exists
      setQualitativeData('La empresa se dedica a ');
      setSourceReceptorData('Se ubica el sonómetro a ');
    }
  }, [currentFormat]);

  // Auto-save when data changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if ((qualitativeData !== '' || sourceReceptorData !== '') && dispatch && typeof dispatch === 'function') {
        try {
          dispatch({
            type: 'UPDATE_QUALITATIVE_DATA',
            payload: {
              description: qualitativeData,
              sourceReceptorInfo: sourceReceptorData,
            },
          });
        } catch (error) {
          console.log('Error saving qualitative data:', error);
        }
      }
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(saveTimeout);
  }, [qualitativeData, sourceReceptorData, dispatch]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const renderTabButtons = () => {
    const tabs = [
      { key: 'qualitative', label: 'Datos Cualitativos', icon: 'file-text' },
      { key: 'sourceReceptor', label: 'Naturaleza fuente/receptor', icon: 'radio' }
    ];

    return (
      <View style={styles.tabButtonsContainer}>
        <Text style={styles.tabLabel}>Seleccione el tipo de datos:</Text>
        <View style={styles.tabButtonsRow}>
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { borderColor: COLORS.primary }
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Feather 
                  name={tab.icon as any} 
                  size={18} 
                  color={isSelected ? COLORS.surface : COLORS.primary} 
                />
                <Text style={[
                  styles.tabButtonText,
                  { color: isSelected ? COLORS.surface : COLORS.primary }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputFocus = (inputRef: React.RefObject<TextInput>) => {
    // Prevent frequent scrolling
    if (isScrolling) return;
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      try {
        if (inputRef.current && scrollViewRef.current) {
          setIsScrolling(true);
          
          inputRef.current.measure((x, y, width, height, pageX, pageY) => {
            // Only scroll if the input is near the top or bottom of the screen
            const screenHeight = 600; // Approximate screen height
            const keyboardHeight = 300; // Approximate keyboard height
            const visibleHeight = screenHeight - keyboardHeight;
            
            if (pageY < 100 || pageY > visibleHeight - 100) {
              const scrollToY = Math.max(0, pageY - 150); // More space above
              scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
            }
            
            // Reset scrolling flag after animation
            setTimeout(() => setIsScrolling(false), 500);
          });
        }
      } catch (error) {
        console.log('Error in handleInputFocus:', error);
        setIsScrolling(false);
      }
    }, 200); // Longer delay to prevent frequent triggers
  };

  const renderQualitativeForm = () => {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Datos Cualitativos</Text>
        <Text style={styles.formSubtitle}>
          Describa las condiciones generales del entorno, características del lugar de medición, 
          observaciones relevantes y cualquier información adicional que considere importante para el estudio.
        </Text>
        
        <TextInput
          ref={qualitativeInputRef}
          style={styles.textArea}
          value={qualitativeData}
          onChangeText={setQualitativeData}
          placeholder="Ingrese aquí la descripción detallada de las condiciones y características del entorno..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          textAlignVertical="top"
          scrollEnabled
          onFocus={() => handleInputFocus(qualitativeInputRef)}
        />
      </View>
    );
  };

  const renderSourceReceptorForm = () => {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Naturaleza fuente/receptor</Text>
        <Text style={styles.formSubtitle}>
          Describa las características de la fuente de ruido y del receptor, incluyendo tipo de fuente, 
          distancias, obstáculos, condiciones de propagación sonora y cualquier factor que pueda 
          influir en la transmisión del ruido.
        </Text>
        
        <TextInput
          ref={sourceReceptorInputRef}
          style={styles.textArea}
          value={sourceReceptorData}
          onChangeText={setSourceReceptorData}
          placeholder="Ingrese aquí la descripción de la fuente de ruido, receptor y condiciones de propagación sonora..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          textAlignVertical="top"
          scrollEnabled
          onFocus={() => handleInputFocus(sourceReceptorInputRef)}
        />
      </View>
    );
  };

  if (!currentFormat) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No hay formato seleccionado</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        <Text style={styles.title}>Datos Cualitativos</Text>
        {renderTabButtons()}
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollableContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.formContent}>
          {activeTab === 'qualitative' ? renderQualitativeForm() : renderSourceReceptorForm()}
        </View>
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollableContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  formContent: {
    padding: 16,
    paddingTop: 8,
  },
  bottomSpacing: {
    height: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  tabButtonsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  tabButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  tabButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 180,
    flexDirection: 'row',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'justify',
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 300,
    maxHeight: 500,
    textAlign: 'justify',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    textAlign: 'center',
  },
});

export default QualitativeDataScreen;