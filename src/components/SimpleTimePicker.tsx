import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface TimePickerProps {
  label: string;
  value: string;
  onTimeChange: (time: string) => void;
  error?: string;
  required?: boolean;
}

const SimpleTimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onTimeChange,
  error,
  required = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  // Parse existing time value
  React.useEffect(() => {
    if (value && value.includes(':')) {
      try {
        const [time, period] = value.split(' ');
        const [hour, minute] = time.split(':');
        setSelectedHour(hour);
        setSelectedMinute(minute);
        setSelectedPeriod(period || 'AM');
      } catch (error) {
        console.log('Error parsing time:', error);
      }
    }
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, '0');
  });

  const minutes = ['00', '15', '30', '45']; // Simplified to quarters
  const periods = ['AM', 'PM'];

  const handleConfirm = () => {
    const timeString = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onTimeChange(timeString);
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Reset to original values
    if (value && value.includes(':')) {
      try {
        const [time, period] = value.split(' ');
        const [hour, minute] = time.split(':');
        setSelectedHour(hour);
        setSelectedMinute(minute);
        setSelectedPeriod(period || 'AM');
      } catch (error) {
        console.log('Error resetting time:', error);
      }
    }
    setModalVisible(false);
  };

  const renderSelector = (
    items: string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    title: string
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.selectorItem,
              selectedValue === item && styles.selectorItemSelected,
            ]}
            onPress={() => onSelect(item)}
          >
            <Text
              style={[
                styles.selectorItemText,
                selectedValue === item && styles.selectorItemTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      
      <TouchableOpacity
        style={[
          styles.timeButton,
          error && styles.timeButtonError,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.timeButtonText,
            !value && styles.placeholderText,
          ]}
        >
          {value || 'HH:MM AM/PM'}
        </Text>
        <Feather name="clock" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.selectorsContainer}>
              {renderSelector(hours, selectedHour, setSelectedHour, 'Hora')}
              <View style={styles.separator}>
                <Text style={styles.separatorText}>:</Text>
              </View>
              {renderSelector(minutes, selectedMinute, setSelectedMinute, 'Min')}
              {renderSelector(periods, selectedPeriod, setSelectedPeriod, 'Período')}
            </View>
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
  timeButton: {
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
  timeButtonError: {
    borderColor: COLORS.error,
  },
  timeButtonText: {
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '60%',
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
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectorsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectorContainer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 80,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  selectorScroll: {
    maxHeight: 200,
    width: '100%',
  },
  selectorItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
  selectorItemSelected: {
    backgroundColor: COLORS.primary,
  },
  selectorItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  selectorItemTextSelected: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  separator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 32,
  },
  separatorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default SimpleTimePicker;