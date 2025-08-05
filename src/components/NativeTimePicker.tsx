import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface NativeTimePickerProps {
  label: string;
  value: string;
  onTimeChange: (time: string) => void;
  placeholder?: string;
  required?: boolean;
  horizontal?: boolean;
}

const NativeTimePicker: React.FC<NativeTimePickerProps> = ({
  label,
  value,
  onTimeChange,
  placeholder = "Seleccionar hora",
  required = false,
  horizontal = false,
}) => {
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());

  // Parse initial value and set date
  useEffect(() => {
    if (value) {
      const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
      const match = value.match(timeRegex);
      if (match) {
        const hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const period = match[3].toUpperCase();
        
        // Convert to 24-hour format for Date object
        let hour24 = hour;
        if (period === 'AM' && hour === 12) {
          hour24 = 0;
        } else if (period === 'PM' && hour !== 12) {
          hour24 = hour + 12;
        }
        
        const newDate = new Date();
        newDate.setHours(hour24, minute, 0, 0);
        setDate(newDate);
        setTempDate(newDate);
      }
    }
  }, [value]);

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    if (hours === 0) hours = 12;
    
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${hours}:${formattedMinutes} ${period}`;
  };

  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        setDate(selectedDate);
        setTempDate(selectedDate);
        const formattedTime = formatTime(selectedDate);
        onTimeChange(formattedTime);
      }
    } else {
      // iOS - just update temp date, don't close modal or update value yet
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const showTimePicker = () => {
    setTempDate(date); // Initialize temp date with current value
    setShow(true);
  };

  const handleConfirm = () => {
    setDate(tempDate);
    const formattedTime = formatTime(tempDate);
    onTimeChange(formattedTime);
    setShow(false);
  };

  const handleCancel = () => {
    setTempDate(date); // Reset temp date to current value
    setShow(false);
  };

  const displayValue = value || placeholder;

  if (horizontal) {
    return (
      <View style={styles.horizontalContainer}>
        <View style={styles.horizontalLabelContainer}>
          <Text style={styles.horizontalLabel}>
            {label}
            {required && <Text style={styles.asterisk}> *</Text>}
          </Text>
        </View>
        
        <View style={styles.horizontalInputContainer}>
          <TouchableOpacity
            style={[styles.horizontalInput, !value && styles.inputPlaceholder]}
            onPress={showTimePicker}
          >
            <Text style={[styles.inputText, !value && styles.placeholderText]}>
              {displayValue}
            </Text>
            <Feather name="clock" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, required && styles.labelRequired]}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.input, !value && styles.inputPlaceholder]}
        onPress={showTimePicker}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {displayValue}
        </Text>
        <Feather name="clock" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {show && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={show}
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
                    <Text style={styles.confirmButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={tempDate}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={onChange}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            testID="dateTimePicker"
            value={tempDate}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={onChange}
          />
        )
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  labelRequired: {
    fontWeight: '600',
  },
  asterisk: {
    color: COLORS.error,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputPlaceholder: {
    borderColor: COLORS.border,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  picker: {
    backgroundColor: COLORS.surface,
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalLabelContainer: {
    flexDirection: 'row',
    flex: 0.25,
  },
  horizontalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  horizontalInputContainer: {
    flex: 0.75,
    marginLeft: 12,
  },
  horizontalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    minHeight: 36,
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
  pickerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  iosPicker: {
    backgroundColor: 'transparent',
  },
});

export default NativeTimePicker;