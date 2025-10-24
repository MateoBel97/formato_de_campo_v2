import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import FormInput from './FormInput';
import FormButton from './FormButton';
import { COLORS } from '../constants';

interface EquipmentOption {
  label: string;
  value: string;
}

interface EquipmentListProps {
  title: string;
  items: string[];
  predefinedOptions: EquipmentOption[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  maxItems?: number;
  required?: boolean;
  error?: string;
  customButtonText?: string; // Text for the custom equipment button
}

const EquipmentList: React.FC<EquipmentListProps> = ({
  title,
  items,
  predefinedOptions,
  onAdd,
  onRemove,
  maxItems = 5,
  required = false,
  error,
  customButtonText = 'Agregar equipo personalizado',
}) => {
  const [customEquipment, setCustomEquipment] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAddPredefined = (value: string, label: string) => {
    if (items.includes(value)) {
      return; // Prevent duplicates
    }
    if (items.length >= maxItems) {
      return; // Reached max limit
    }

    // Use label for display (without placeholder text)
    if (value && label && label !== 'Seleccione el sonómetro' && label !== 'Seleccione el calibrador' && label !== 'Seleccione la estación meteorológica') {
      onAdd(value);
    }
  };

  const handleAddCustom = () => {
    const trimmedValue = customEquipment.trim();
    if (!trimmedValue) return;

    if (items.includes(trimmedValue)) {
      return; // Prevent duplicates
    }
    if (items.length >= maxItems) {
      return; // Reached max limit
    }

    onAdd(trimmedValue);
    setCustomEquipment('');
    setShowCustomInput(false);
  };

  const isAtMaxCapacity = items.length >= maxItems;

  // Filter out placeholder options
  const validOptions = predefinedOptions.filter(
    option => option.value &&
    option.value !== '' &&
    option.label !== 'Seleccione el sonómetro' &&
    option.label !== 'Seleccione el calibrador' &&
    option.label !== 'Seleccione la estación meteorológica'
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.itemCount}>
          {items.length}/{maxItems}
        </Text>
      </View>

      {/* List of added equipment */}
      {items.length > 0 && (
        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.item}>
              <View style={styles.itemContent}>
                <Feather name="check-circle" size={18} color={COLORS.success} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onRemove(item)}
                style={styles.removeButton}
              >
                <Feather name="x" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add equipment section */}
      {!isAtMaxCapacity && (
        <View style={styles.addSection}>
          <Text style={styles.addSectionTitle}>Agregar equipo:</Text>

          {/* Predefined options */}
          <View style={styles.optionsGrid}>
            {validOptions.map((option) => {
              const isAdded = items.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    isAdded && styles.optionButtonDisabled,
                  ]}
                  onPress={() => handleAddPredefined(option.value, option.label)}
                  disabled={isAdded}
                >
                  <Text style={[
                    styles.optionButtonText,
                    isAdded && styles.optionButtonTextDisabled,
                  ]}>
                    {option.label}
                  </Text>
                  {!isAdded && (
                    <Feather name="plus" size={16} color={COLORS.primary} />
                  )}
                  {isAdded && (
                    <Feather name="check" size={16} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom equipment input */}
          {!showCustomInput ? (
            <TouchableOpacity
              style={styles.customButton}
              onPress={() => setShowCustomInput(true)}
            >
              <Feather name="edit" size={16} color={COLORS.primary} />
              <Text style={styles.customButtonText}>{customButtonText}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customInputContainer}>
              <FormInput
                label="Nombre del equipo"
                value={customEquipment}
                onChangeText={setCustomEquipment}
                placeholder="Ej: Modelo XYZ-123"
                autoFocus
              />
              <View style={styles.customInputButtons}>
                <FormButton
                  title="Cancelar"
                  onPress={() => {
                    setCustomEquipment('');
                    setShowCustomInput(false);
                  }}
                  variant="outline"
                  style={styles.customInputButton}
                />
                <FormButton
                  title="Agregar"
                  onPress={handleAddCustom}
                  disabled={!customEquipment.trim()}
                  style={styles.customInputButton}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {isAtMaxCapacity && (
        <View style={styles.maxLimitMessage}>
          <Feather name="alert-circle" size={16} color={COLORS.warning} />
          <Text style={styles.maxLimitText}>
            Límite máximo alcanzado ({maxItems} equipos)
          </Text>
        </View>
      )}

      {items.length === 0 && required && (
        <View style={styles.emptyState}>
          <Feather name="info" size={20} color={COLORS.textSecondary} />
          <Text style={styles.emptyStateText}>
            Debes agregar al menos un equipo
          </Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  required: {
    color: COLORS.error,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemsList: {
    marginBottom: 16,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.success + '15',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  addSection: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  addSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  optionButtonDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  optionButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  optionButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  customButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  customInputContainer: {
    gap: 12,
  },
  customInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  customInputButton: {
    flex: 1,
  },
  maxLimitMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    marginTop: 12,
  },
  maxLimitText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.info + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
});

export default EquipmentList;
