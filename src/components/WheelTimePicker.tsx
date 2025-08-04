import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface WheelTimePickerProps {
  label: string;
  value: string;
  onTimeChange: (time: string) => void;
  placeholder?: string;
  required?: boolean;
}

interface WheelProps {
  data: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  height?: number;
}

const ITEM_HEIGHT = 40;

const WheelPicker: React.FC<WheelProps> = ({ 
  data, 
  selectedValue, 
  onValueChange, 
  height = 160 
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const selectedIndex = data.indexOf(selectedValue);
  const centerOffset = (height - ITEM_HEIGHT) / 2;

  useEffect(() => {
    if (!isScrolling && scrollViewRef.current && selectedIndex >= 0) {
      const offsetY = selectedIndex * ITEM_HEIGHT;
      scrollViewRef.current.scrollTo({ y: offsetY, animated: true });
    }
  }, [selectedValue, selectedIndex, isScrolling]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    
    if (data[clampedIndex] !== selectedValue) {
      onValueChange(data[clampedIndex]);
    }
  };

  const handleScrollBeginDrag = () => {
    setIsScrolling(true);
  };

  const handleScrollEndDrag = () => {
    setIsScrolling(false);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ 
        y: clampedIndex * ITEM_HEIGHT, 
        animated: true 
      });
    }
    
    onValueChange(data[clampedIndex]);
    setIsScrolling(false);
  };

  const renderItem = (item: string, index: number) => {
    const offsetY = index * ITEM_HEIGHT;
    const distanceFromCenter = Math.abs(offsetY - (selectedIndex * ITEM_HEIGHT));
    const isSelected = index === selectedIndex;
    
    return (
      <View key={index} style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
        <Text style={[
          styles.wheelItemText,
          isSelected && styles.wheelItemTextSelected,
          { opacity: distanceFromCenter === 0 ? 1 : 0.4 }
        ]}>
          {item}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.wheelContainer, { height }]}>
      <View style={[styles.wheelHighlight, { 
        top: centerOffset, 
        height: ITEM_HEIGHT 
      }]} />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.wheelScrollView}
        contentContainerStyle={{
          paddingTop: centerOffset,
          paddingBottom: centerOffset,
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {data.map(renderItem)}
      </ScrollView>
    </View>
  );
};

const WheelTimePicker: React.FC<WheelTimePickerProps> = ({
  label,
  value,
  onTimeChange,
  placeholder = "Seleccionar hora",
  required = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState('1');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  // Parse initial value
  useEffect(() => {
    if (value) {
      const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
      const match = value.match(timeRegex);
      if (match) {
        setSelectedHour(match[1]);
        setSelectedMinute(match[2]);
        setSelectedPeriod(match[3].toUpperCase());
      }
    }
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const handleConfirm = () => {
    const formattedTime = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onTimeChange(formattedTime);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  const displayValue = value || placeholder;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, required && styles.labelRequired]}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      
      <TouchableOpacity
        style={[styles.input, !value && styles.inputPlaceholder]}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {displayValue}
        </Text>
        <Feather name="clock" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            
            <View style={styles.pickersContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Hora</Text>
                <WheelPicker
                  data={hours}
                  selectedValue={selectedHour}
                  onValueChange={setSelectedHour}
                />
              </View>

              <Text style={styles.separator}>:</Text>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Min</Text>
                <WheelPicker
                  data={minutes}
                  selectedValue={selectedMinute}
                  onValueChange={setSelectedMinute}
                />
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}></Text>
                <WheelPicker
                  data={periods}
                  selectedValue={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  pickerColumn: {
    flex: 2,
    alignItems: 'center',
    minWidth: 80,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  wheelContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    minWidth: 100,
  },
  wheelScrollView: {
    flex: 1,
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.primary,
    zIndex: 1,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
  },
  wheelItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 8,
    marginTop: 20,
    flex: 0.3,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
});

export default WheelTimePicker;