import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { COLORS } from '../constants';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  error?: string;
  required?: boolean;
  mode?: 'date' | 'time';
  placeholder?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  mode = 'date',
  placeholder = 'Seleccionar...',
}) => {
  const [show, setShow] = useState(false);
  const [dateValue, setDateValue] = useState(value ? new Date(value) : new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    
    if (selectedDate) {
      setDateValue(selectedDate);
      
      if (mode === 'date') {
        onChange(format(selectedDate, 'yyyy-MM-dd'));
      } else {
        onChange(format(selectedDate, 'HH:mm'));
      }
    }
  };

  const showDatePicker = () => {
    setShow(true);
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return placeholder;
    
    try {
      if (mode === 'date') {
        return format(new Date(val), 'dd/MM/yyyy', { locale: es });
      } else {
        const [hours, minutes] = val.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return format(date, 'hh:mm a', { locale: es });
      }
    } catch {
      return placeholder;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          error && styles.dateButtonError,
        ]}
        onPress={showDatePicker}
      >
        <Text
          style={[
            styles.dateText,
            !value && styles.placeholderText,
          ]}
        >
          {formatDisplayValue(value)}
        </Text>
        <Feather 
          name={mode === 'date' ? 'calendar' : 'clock'} 
          size={20} 
          color={COLORS.textSecondary} 
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {show && (
        <DateTimePicker
          value={dateValue}
          mode={mode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
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
  dateButton: {
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
  dateButtonError: {
    borderColor: COLORS.error,
  },
  dateText: {
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
});

export default DatePicker;