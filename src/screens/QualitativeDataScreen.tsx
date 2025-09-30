import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';

const QualitativeDataScreen: React.FC = () => {
  const { state, updateQualitativeData, saveCurrentFormat } = useMeasurement();
  const [activeTab, setActiveTab] = useState('qualitative');
  const [qualitativeData, setQualitativeData] = useState('');
  const [sourceReceptorData, setSourceReceptorData] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const qualitativeInputRef = useRef<TextInput>(null);
  const sourceReceptorInputRef = useRef<TextInput>(null);
  const hasLoadedInitialData = useRef(false);
  const currentFormat = state.currentFormat;

  // Load existing data only once when format is available and we haven't loaded yet
  useEffect(() => {
    if (currentFormat && !hasLoadedInitialData.current) {
      hasLoadedInitialData.current = true;
      
      if (currentFormat.qualitativeData) {
        setQualitativeData(currentFormat.qualitativeData.conditionsDescription || 'La empresa se dedica a ');
        setSourceReceptorData(currentFormat.qualitativeData.noiseSourceInfo || 'Se ubica el sonómetro a ');
      } else {
        // Set default values if no qualitative data exists
        setQualitativeData('La empresa se dedica a ');
        setSourceReceptorData('Se ubica el sonómetro a ');
      }
    }
  }, [currentFormat]);

  // Auto-save when data changes (but only after initial load)
  useEffect(() => {
    if (!hasLoadedInitialData.current) {
      return; // Don't auto-save until initial data is loaded
    }

    const saveTimeout = setTimeout(async () => {
      if (qualitativeData.trim() !== '' || sourceReceptorData.trim() !== '') {
        try {
          const qualitativeDataObj = {
            conditionsDescription: qualitativeData,
            noiseSourceInfo: sourceReceptorData,
          };
          updateQualitativeData(qualitativeDataObj);
          
          // Small delay to allow state update
          setTimeout(async () => {
            try {
              await saveCurrentFormat();
              console.log('Qualitative data saved successfully');
            } catch (error) {
              console.error('Error saving qualitative data:', error);
              Alert.alert(
                'Error de Almacenamiento',
                'No se pudieron guardar los datos cualitativos. Por favor, intente nuevamente.',
                [{ text: 'OK' }]
              );
            }
          }, 100);
        } catch (error) {
          console.log('Error updating qualitative data:', error);
        }
      }
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(saveTimeout);
  }, [qualitativeData, sourceReceptorData]);

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

  const handleInputFocus = (inputRef: React.RefObject<TextInput | null>) => {
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
          
          inputRef.current.measureInWindow((x, y, width, height) => {
            // Get screen dimensions
            const screenHeight = 700; // Conservative estimate
            const keyboardHeight = 280; // Conservative estimate for keyboard
            const headerHeight = 120; // Approximate header height
            const availableHeight = screenHeight - keyboardHeight - headerHeight;
            
            // Only scroll if the text field is not fully visible
            const fieldBottom = y + height;
            const visibleBottom = headerHeight + availableHeight;
            
            if (y < headerHeight || fieldBottom > visibleBottom) {
              // Calculate scroll position to center the text field
              const targetY = Math.max(0, y - headerHeight - 50);
              scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
            }
            
            // Reset scrolling flag after animation
            setTimeout(() => setIsScrolling(false), 600);
          });
        }
      } catch (error) {
        console.log('Error in handleInputFocus:', error);
        setIsScrolling(false);
      }
    }, 300); // Delay to allow keyboard to appear
  };

  const renderQualitativeForm = () => {
    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Datos Cualitativos</Text>
        <Text style={styles.formSubtitle}>
          Describa las condiciones generales del entorno, características del lugar de medición, 
          observaciones relevantes y cualquier información adicional que considere importante para el estudio.
        </Text>
        <Text style={styles.scrollHint}>
          💡 Puede desplazarse dentro del campo de texto para escribir contenido extenso
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
          scrollEnabled={true}
          nestedScrollEnabled={true}
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
        <Text style={styles.scrollHint}>
          💡 Puede desplazarse dentro del campo de texto para escribir contenido extenso
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
          scrollEnabled={true}
          nestedScrollEnabled={true}
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
    height: 400, // Increased to ensure sufficient space below text fields
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
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'justify',
  },
  scrollHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    opacity: 0.8,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    height: 400, // Fixed height to prevent layout changes
    textAlign: 'justify',
    lineHeight: 22,
    // Enable internal scrolling
    textAlignVertical: 'top',
    // Add subtle shadow to indicate scrollable area
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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