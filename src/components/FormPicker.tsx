import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface PickerOption {
  label: string;
  value: string;
}

interface FormPickerProps {
  label: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  horizontal?: boolean;
}

const FormPicker: React.FC<FormPickerProps> = ({
  label,
  value,
  options,
  onSelect,
  error,
  required = false,
  placeholder = 'Seleccionar...',
  horizontal = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options?.find(option => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setModalVisible(false);
  };

  const renderOption = ({ item }: { item: PickerOption }) => (
    <TouchableOpacity
      style={[
        styles.option,
        item.value === value && styles.selectedOption,
      ]}
      onPress={() => handleSelect(item.value)}
    >
      <Text
        style={[
          styles.optionText,
          item.value === value && styles.selectedOptionText,
        ]}
      >
        {item.label}
      </Text>
      {item.value === value && (
        <Feather name="check" size={20} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  if (horizontal) {
    return (
      <View style={styles.horizontalContainer}>
        <View style={styles.horizontalLabelContainer}>
          <Text style={styles.horizontalLabel}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
        
        <View style={styles.horizontalPickerContainer}>
          <TouchableOpacity
            style={[
              styles.horizontalPicker,
              error && styles.pickerError,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Text
              style={[
                styles.pickerText,
                !selectedOption && styles.placeholderText,
              ]}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </Text>
            <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Modal
            visible={modalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label}</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Feather name="x" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={options || []}
                  renderItem={renderOption}
                  keyExtractor={(item) => item.value}
                  style={styles.optionsList}
                />
              </View>
            </View>
          </Modal>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.pickerText,
            !selectedOption && styles.placeholderText,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options || []}
              renderItem={renderOption}
              keyExtractor={(item) => item.value}
              style={styles.optionsList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  required: {
    color: COLORS.error,
    marginLeft: 4,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  pickerError: {
    borderColor: COLORS.error,
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    maxHeight: '70%',
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedOption: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  horizontalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.5,
    paddingRight: 12,
  },
  horizontalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  horizontalPickerContainer: {
    flex: 0.5,
  },
  horizontalPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    minHeight: 40,
  },
});

export default FormPicker;