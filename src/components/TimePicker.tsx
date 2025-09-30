import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface TimePickerProps {
  label: string;
  value: string;
  onTimeChange: (time: string) => void;
  error?: string;
  required?: boolean;
  vertical?: boolean; // New prop for vertical layout
  horizontal?: boolean; // Prop for horizontal layout
}

const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onTimeChange,
  error,
  required = false,
  vertical = false,
  horizontal = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [dateValue, setDateValue] = useState(new Date());
  
  // Temporary states for editing - these are used while the modal is open
  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempPeriod, setTempPeriod] = useState('AM');

  // Parse existing time value - only update when value prop changes, not internal states
  React.useEffect(() => {
    if (value && value.includes(':')) {
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':');
      
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period || 'AM');
      
      // Also update temp values when the prop value changes
      setTempHour(hour);
      setTempMinute(minute);
      setTempPeriod(period || 'AM');
      
      // Update dateValue for native picker
      const newDate = new Date();
      let hour24 = parseInt(hour);
      if ((period || 'AM') === 'AM' && hour24 === 12) {
        hour24 = 0;
      } else if ((period || 'AM') === 'PM' && hour24 !== 12) {
        hour24 += 12;
      }
      newDate.setHours(hour24, parseInt(minute), 0, 0);
      setDateValue(newDate);
    }
  }, [value]); // Removed internal state dependencies

  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, '0');
  });

  const minutes = Array.from({ length: 60 }, (_, i) => {
    return i.toString().padStart(2, '0');
  });

  const periods = ['AM', 'PM'];

  const setCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    if (hours === 0) hours = 12;
    
    const hourStr = hours.toString().padStart(2, '0');
    const minuteStr = minutes.toString().padStart(2, '0');
    
    setSelectedHour(hourStr);
    setSelectedMinute(minuteStr);
    setSelectedPeriod(period);
    setTempHour(hourStr);
    setTempMinute(minuteStr);
    setTempPeriod(period);
    setDateValue(now);
  };
  
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

  const handleNativeTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setModalVisible(false);
      if (event.type === 'set' && selectedDate) {
        setDateValue(selectedDate);
        const formattedTime = formatTime(selectedDate);
        
        // Update both internal and temp state to keep component synchronized
        const [time, period] = formattedTime.split(' ');
        const [hour, minute] = time.split(':');
        setSelectedHour(hour);
        setSelectedMinute(minute);
        setSelectedPeriod(period);
        setTempHour(hour);
        setTempMinute(minute);
        setTempPeriod(period);
        
        onTimeChange(formattedTime);
      }
    } else {
      // iOS - just update the value, modal is handled differently
      if (selectedDate) {
        setDateValue(selectedDate);
        const formattedTime = formatTime(selectedDate);
        
        // Update both internal and temp state to keep component synchronized
        const [time, period] = formattedTime.split(' ');
        const [hour, minute] = time.split(':');
        setSelectedHour(hour);
        setSelectedMinute(minute);
        setSelectedPeriod(period);
        setTempHour(hour);
        setTempMinute(minute);
        setTempPeriod(period);
        
        onTimeChange(formattedTime);
      }
    }
  };

  const handleOpenModal = () => {
    // If no value is set, initialize with current time
    if (!value || !value.includes(':')) {
      setCurrentTime();
      // Also set temp values to current time
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12;
      if (hours === 0) hours = 12;
      
      setTempHour(hours.toString().padStart(2, '0'));
      setTempMinute(minutes.toString().padStart(2, '0'));
      setTempPeriod(period);
    } else {
      // Initialize temp values with current value for editing
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':');
      
      setTempHour(hour);
      setTempMinute(minute);
      setTempPeriod(period || 'AM');
      
      // Ensure dateValue is synchronized with current value for Android picker
      if (Platform.OS === 'android') {
        const newDate = new Date();
        let hour24 = parseInt(hour);
        if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        } else if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        }
        newDate.setHours(hour24, parseInt(minute), 0, 0);
        setDateValue(newDate);
      }
    }
    
    setModalVisible(true);
  };

  const handleConfirm = () => {
    // Use temp values for the final time string
    const timeString = `${tempHour}:${tempMinute} ${tempPeriod}`;
    
    // Update main states with temp values
    setSelectedHour(tempHour);
    setSelectedMinute(tempMinute);
    setSelectedPeriod(tempPeriod);
    
    // Call the parent's onTimeChange with the new time
    onTimeChange(timeString);
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Reset temp values to current saved values (don't change main states)
    if (value && value.includes(':')) {
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':');
      setTempHour(hour);
      setTempMinute(minute);
      setTempPeriod(period || 'AM');
    }
    setModalVisible(false);
  };

  // Convert 12-hour format (HH:MM AM/PM) to 24-hour format (HH:MM)
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h || !time12h.includes(':')) return '';

    const [time, period] = time12h.split(' ');
    const [hourStr, minute] = time.split(':');
    let hour = parseInt(hourStr);

    if (period === 'AM' && hour === 12) {
      hour = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour += 12;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  };

  // Convert 24-hour format (HH:MM) to 12-hour format (HH:MM AM/PM)
  const convertTo12Hour = (time24h: string): string => {
    if (!time24h || !time24h.includes(':')) return '';

    const [hourStr, minute] = time24h.split(':');
    let hour = parseInt(hourStr);
    const period = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
  };

  if (horizontal) {
    // Web-specific render for horizontal layout with modal
    if (Platform.OS === 'web') {
      return (
        <View style={styles.container}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[
                styles.timeButton,
                error && styles.timeButtonError,
              ]}
              onPress={handleOpenModal}
            >
              <Text
                style={[
                  styles.timeButtonText,
                  !value && styles.placeholderText,
                ]}
              >
                {value || 'HH:MM AM/PM'}
              </Text>
              <Feather name="clock" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Custom modal for Web */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
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
                      selectedValue={tempHour}
                      onValueChange={setTempHour}
                      style={styles.picker}
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
                      selectedValue={tempMinute}
                      onValueChange={setTempMinute}
                      style={styles.picker}
                    >
                      {minutes.map((minute) => (
                        <Picker.Item key={minute} label={minute} value={minute} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>Período</Text>
                    <Picker
                      selectedValue={tempPeriod}
                      onValueChange={setTempPeriod}
                      style={styles.picker}
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
    }

    return (
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[
              styles.timeButton,
              error && styles.timeButtonError,
            ]}
            onPress={handleOpenModal}
          >
            <Text
              style={[
                styles.timeButtonText,
                !value && styles.placeholderText,
              ]}
            >
              {value || 'HH:MM AM/PM'}
            </Text>
            <Feather name="clock" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Native time picker for Android */}
        {Platform.OS === 'android' && modalVisible && (
          <DateTimePicker
            testID="dateTimePicker"
            value={dateValue}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleNativeTimeChange}
          />
        )}

        {/* Custom modal for iOS */}
        {Platform.OS === 'ios' && (
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
                      selectedValue={tempHour}
                      onValueChange={setTempHour}
                      style={styles.picker}
                      itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
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
                      selectedValue={tempMinute}
                      onValueChange={setTempMinute}
                      style={styles.picker}
                      itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
                    >
                      {minutes.map((minute) => (
                        <Picker.Item key={minute} label={minute} value={minute} />
                      ))}
                    </Picker>
                  </View>
                  
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>Período</Text>
                    <Picker
                      selectedValue={tempPeriod}
                      onValueChange={setTempPeriod}
                      style={styles.picker}
                      itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
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
        )}
      </View>
    );
  }

  if (vertical) {
    // Web-specific render for vertical layout with modal
    if (Platform.OS === 'web') {
      return (
        <View style={styles.verticalContainer}>
          <Text style={styles.verticalLabel}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>

          <TouchableOpacity
            style={[
              styles.verticalTimeButton,
              error && styles.timeButtonError,
            ]}
            onPress={handleOpenModal}
          >
            <Text
              style={[
                styles.timeButtonText,
                !value && styles.placeholderText,
              ]}
            >
              {value || 'HH:MM AM/PM'}
            </Text>
            <Feather name="clock" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Custom modal for Web */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
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
                      selectedValue={tempHour}
                      onValueChange={setTempHour}
                      style={styles.picker}
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
                      selectedValue={tempMinute}
                      onValueChange={setTempMinute}
                      style={styles.picker}
                    >
                      {minutes.map((minute) => (
                        <Picker.Item key={minute} label={minute} value={minute} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>Período</Text>
                    <Picker
                      selectedValue={tempPeriod}
                      onValueChange={setTempPeriod}
                      style={styles.picker}
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
    }

    return (
      <View style={styles.verticalContainer}>
        <Text style={styles.verticalLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>

        <TouchableOpacity
          style={[
            styles.verticalTimeButton,
            error && styles.timeButtonError,
          ]}
          onPress={handleOpenModal}
        >
          <Text
            style={[
              styles.timeButtonText,
              !value && styles.placeholderText,
            ]}
          >
            {value || 'HH:MM AM/PM'}
          </Text>
          <Feather name="clock" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Android native picker */}
        {Platform.OS === 'android' && modalVisible && (
          <DateTimePicker
            testID="dateTimePicker"
            value={dateValue}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleNativeTimeChange}
          />
        )}

        {/* iOS custom modal */}
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
                    selectedValue={tempHour}
                    onValueChange={setTempHour}
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
                    selectedValue={tempMinute}
                    onValueChange={setTempMinute}
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
                    selectedValue={tempPeriod}
                    onValueChange={setTempPeriod}
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
  }

  // Web-specific render for default layout with modal
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[
              styles.timeButton,
              error && styles.timeButtonError,
            ]}
            onPress={handleOpenModal}
          >
            <Text
              style={[
                styles.timeButtonText,
                !value && styles.placeholderText,
              ]}
            >
              {value || 'HH:MM AM/PM'}
            </Text>
            <Feather name="clock" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Custom modal for Web */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
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
                    selectedValue={tempHour}
                    onValueChange={setTempHour}
                    style={styles.picker}
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
                    selectedValue={tempMinute}
                    onValueChange={setTempMinute}
                    style={styles.picker}
                  >
                    {minutes.map((minute) => (
                      <Picker.Item key={minute} label={minute} value={minute} />
                    ))}
                  </Picker>
                </View>

                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Período</Text>
                  <Picker
                    selectedValue={tempPeriod}
                    onValueChange={setTempPeriod}
                    style={styles.picker}
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
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[
            styles.timeButton,
            error && styles.timeButtonError,
          ]}
          onPress={handleOpenModal}
        >
          <Text
            style={[
              styles.timeButtonText,
              !value && styles.placeholderText,
            ]}
          >
            {value || 'HH:MM AM/PM'}
          </Text>
          <Feather name="clock" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Native time picker for Android */}
      {Platform.OS === 'android' && modalVisible && (
        <DateTimePicker
          testID="dateTimePicker"
          value={dateValue}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleNativeTimeChange}
        />
      )}

      {/* Custom modal for iOS */}
      {Platform.OS === 'ios' && (
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
                  selectedValue={tempHour}
                  onValueChange={setTempHour}
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
                  selectedValue={tempMinute}
                  onValueChange={setTempMinute}
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
                  selectedValue={tempPeriod}
                  onValueChange={setTempPeriod}
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
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelContainer: {
    flex: 0.25,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    flex: 0.75,
    marginLeft: 12,
  },
  timeButton: {
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
  // Vertical layout styles
  verticalContainer: {
    marginBottom: 16,
  },
  verticalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  verticalTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    minHeight: 48,
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
    maxWidth: 450,
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
    height: Platform.OS === 'ios' ? 150 : 50,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: Platform.OS === 'ios' ? 18 : 16,
    color: COLORS.text,
    height: Platform.OS === 'ios' ? 150 : 50,
    textAlign: 'center',
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