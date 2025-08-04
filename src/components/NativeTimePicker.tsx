import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
    const currentDate = selectedDate || date;
    
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setDate(currentDate);
      const formattedTime = formatTime(currentDate);
      onTimeChange(formattedTime);
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  const showTimePicker = () => {
    setShow(true);
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

          {show && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChange}
              style={styles.picker}
            />
          )}
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
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChange}
          style={styles.picker}
        />
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
});

export default NativeTimePicker;