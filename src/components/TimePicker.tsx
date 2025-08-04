import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface TimePickerProps {
  label: string;
  value: string;
  onTimeChange: (time: string) => void;
  error?: string;
  required?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({
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
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':');
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period || 'AM');
    }
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, '0');
  });

  const minutes = Array.from({ length: 60 }, (_, i) => {
    return i.toString().padStart(2, '0');
  });

  const periods = ['AM', 'PM'];

  const handleConfirm = () => {
    const timeString = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onTimeChange(timeString);
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Reset to original values
    if (value && value.includes(':')) {
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':');
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period || 'AM');
    }
    setModalVisible(false);
  };

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
            
            <View style={styles.pickersContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hora</Text>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={setSelectedHour}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {hours.map((hour) => (
                    <Picker.Item key={hour} label={hour} value={hour} />
                  ))}
                </Picker>
              </View>
              
              <View style={styles.separator}>
                <Text style={styles.separatorText}>:</Text>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minuto</Text>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={setSelectedMinute}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {minutes.map((minute) => (
                    <Picker.Item key={minute} label={minute} value={minute} />
                  ))}
                </Picker>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Período</Text>
                <Picker
                  selectedValue={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {periods.map((period) => (
                    <Picker.Item key={period} label={period} value={period} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width } = Dimensions.get('window');

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
    maxHeight: '50%',
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
  pickersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  picker: {
    width: '100%',
    height: 150,
  },
  pickerItem: {
    fontSize: 18,
    color: COLORS.text,
    height: 150,
  },
  separator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 24,
  },
  separatorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default TimePicker;