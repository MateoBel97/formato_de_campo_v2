import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns';
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
  
  // Parse date safely to avoid timezone issues
  const parseDate = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0); // Local timezone, noon
  };

  const [tempDateValue, setTempDateValue] = useState(value ? parseDate(value) : new Date());
  const [dateValue, setDateValue] = useState(value ? parseDate(value) : new Date());
  const [currentMonth, setCurrentMonth] = useState(value ? parseDate(value) : new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        setDateValue(selectedDate);
        setTempDateValue(selectedDate);
        
        if (mode === 'date') {
          onChange(format(selectedDate, 'yyyy-MM-dd'));
        } else {
          onChange(format(selectedDate, 'HH:mm'));
        }
      }
    } else {
      // iOS - update temporary value for preview
      if (selectedDate) {
        setTempDateValue(selectedDate);
      }
    }
  };

  const handleDone = () => {
    setDateValue(tempDateValue);
    setShow(false);
    
    if (mode === 'date') {
      // Format date safely to avoid timezone issues
      const year = tempDateValue.getFullYear();
      const month = String(tempDateValue.getMonth() + 1).padStart(2, '0');
      const day = String(tempDateValue.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange(format(tempDateValue, 'HH:mm'));
    }
  };

  const handleCancel = () => {
    setTempDateValue(dateValue); // Reset to original value
    setShow(false);
  };

  const showDatePicker = () => {
    const currentDate = value ? parseDate(value) : new Date();
    setTempDateValue(currentDate);
    setDateValue(currentDate);
    setCurrentMonth(currentDate);
    setShow(true);
  };

  const handleDateSelect = (date: Date) => {
    setTempDateValue(date);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const renderCustomCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = monthStart;
    const endDate = monthEnd;
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const startPadding = getDay(monthStart);
    
    // Add empty cells for padding
    const paddingDays = Array(startPadding).fill(null);
    const allDays = [...paddingDays, ...days];
    
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    return (
      <View style={styles.customCalendar}>
        {/* Month/Year Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthButton}>
            <Feather name="chevron-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthButton}>
            <Feather name="chevron-right" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Week Days */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        
        {/* Calendar Days */}
        <View style={styles.calendarGrid}>
          {allDays.map((day, index) => {
            if (!day) {
              return <View key={index} style={styles.emptyDay} />;
            }
            
            const isSelected = isSameDay(day, tempDateValue);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.selectedDay,
                  !isCurrentMonth && styles.otherMonthDay
                ]}
                onPress={() => handleDateSelect(day)}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                  !isCurrentMonth && styles.otherMonthDayText
                ]}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const formatDisplayValue = (val: string) => {
    if (!val) return placeholder;
    
    try {
      if (mode === 'date') {
        const parsedDate = parseDate(val);
        return format(parsedDate, 'dd/MM/yyyy', { locale: es });
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

  // Render web-specific date picker with modal
  if (Platform.OS === 'web') {
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
            name="calendar"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {show && (
          <Modal
            transparent={true}
            animationType="fade"
            visible={show}
            onRequestClose={handleCancel}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleCancel} style={styles.modalButton}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDone} style={styles.modalButton}>
                    <Text style={styles.doneButtonText}>Listo</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContainer}>
                  {renderCustomCalendar()}
                </View>
              </View>
            </View>
          </Modal>
        )}
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

      {show && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={show}
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel} style={styles.modalButton}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone} style={styles.modalButton}>
                  <Text style={styles.doneButtonText}>Listo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                {renderCustomCalendar()}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode={mode}
          is24Hour={false}
          display="default"
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 400,
    minHeight: 460, // Aumentado 15% (400 * 1.15 = 460)
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  doneButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  datePickerContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 24, // Aumentado de 20 a 24
    flex: 1,
  },
  datePicker: {
    backgroundColor: COLORS.surface,
    height: 200,
    width: '100%',
  },
  customCalendar: {
    backgroundColor: COLORS.surface,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
  },
  emptyDay: {
    width: '14.28%',
    height: 44,
  },
  dayButton: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedDayText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  otherMonthDayText: {
    color: COLORS.textSecondary,
  },
});

export default DatePicker;