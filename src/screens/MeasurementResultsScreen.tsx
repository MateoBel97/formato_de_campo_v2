import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormPicker from '../components/FormPicker';
import FormInput from '../components/FormInput';
import NativeTimePicker from '../components/NativeTimePicker';
import { COLORS, EMISSION_INTERVALS, RESIDUAL_INTERVALS } from '../constants';
import { MeasurementType } from '../types';

const MeasurementResultsScreen: React.FC = () => {
  const { state, dispatch } = useMeasurement();
  const [selectedPoint, setSelectedPoint] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedMeasurementType, setSelectedMeasurementType] = useState('emission');
  const [selectedEmissionInterval, setSelectedEmissionInterval] = useState(0);
  const [selectedResidualInterval, setSelectedResidualInterval] = useState(0);
  const [selectedAmbientDirection, setSelectedAmbientDirection] = useState('N');
  const [selectedAmbientInterval, setSelectedAmbientInterval] = useState(0);
  const [measurementData, setMeasurementData] = useState<any>({});
  const [toastOpacity] = useState(new Animated.Value(0));
  const [toastMessage, setToastMessage] = useState('');

  const currentFormat = state.currentFormat;
  const measurementPoints = currentFormat?.measurementPoints || [];
  const technicalInfo = currentFormat?.technicalInfo;

  if (!currentFormat) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No hay formato seleccionado</Text>
      </View>
    );
  }

  // Set default selections
  React.useEffect(() => {
    if (measurementPoints.length > 0 && !selectedPoint) {
      setSelectedPoint('0');
    }
    if (technicalInfo?.schedule && !selectedSchedule) {
      if (technicalInfo.schedule.diurnal) {
        setSelectedSchedule('diurnal');
      } else if (technicalInfo.schedule.nocturnal) {
        setSelectedSchedule('nocturnal');
      }
    }
  }, [measurementPoints, technicalInfo, selectedPoint, selectedSchedule]);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const adjustEndTime = (startTime: string, intervals: number): string => {
    if (!startTime) return '';
    
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match = startTime.match(timeRegex);
    if (!match) return '';
    
    const hour = parseInt(match[1]);
    const minute = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    let hour24 = hour;
    if (period === 'AM' && hour === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    }
    
    const startDate = new Date();
    startDate.setHours(hour24, minute, 0, 0);
    
    // Add time based on intervals
    const endDate = new Date(startDate);
    if (intervals === 1) {
      endDate.setHours(endDate.getHours() + 1); // Add 1 hour
    } else if (intervals === 3) {
      endDate.setMinutes(endDate.getMinutes() + 5); // Add 5 minutes
    } else {
      return ''; // No auto-adjustment for other intervals
    }
    
    // Convert back to 12-hour format
    let endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    
    endHour = endHour % 12;
    if (endHour === 0) endHour = 12;
    
    const formattedMinute = endMinute.toString().padStart(2, '0');
    return `${endHour}:${formattedMinute} ${endPeriod}`;
  };

  // Generate unique key for storing measurement data
  const getDataKey = (pointIndex: string, schedule: string, type: string, intervalIndex: number) => {
    return `${pointIndex}_${schedule}_${type}_${intervalIndex}`;
  };

  // Get measurement data for current selection
  const getCurrentMeasurement = (type: string, intervalIndex: number) => {
    const key = getDataKey(selectedPoint, selectedSchedule, type, intervalIndex);
    return measurementData[key] || {
      soundLevel: '',
      percentile90: '',
      fileNumber: '',
      startTime: '',
      endTime: '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Save measurement data
  const saveMeasurementData = (type: string, intervalIndex: number, field: string, value: string) => {
    const key = getDataKey(selectedPoint, selectedSchedule, type, intervalIndex);
    setMeasurementData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  // Get number of intervals for current data
  const getIntervalsCount = (type: string) => {
    const prefix = `${selectedPoint}_${selectedSchedule}_${type}_intervals`;
    return measurementData[prefix] || (type === 'emission' ? 1 : 0);
  };

  // Save intervals count
  const saveIntervalsCount = (type: string, count: number) => {
    const prefix = `${selectedPoint}_${selectedSchedule}_${type}_intervals`;
    setMeasurementData(prev => ({
      ...prev,
      [prefix]: count,
    }));
  };

  const renderPointButtons = () => {
    if (measurementPoints.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay puntos de medición configurados</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.buttonScrollView}
        contentContainerStyle={styles.buttonScrollContent}
      >
        {measurementPoints.map((point, index) => {
          const pointColor = COLORS.pointColors[index % COLORS.pointColors.length];
          const isSelected = selectedPoint === index.toString();
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.pointButton,
                isSelected ? { backgroundColor: pointColor, borderColor: pointColor } : { borderColor: pointColor }
              ]}
              onPress={() => setSelectedPoint(index.toString())}
            >
              <Text style={[
                styles.pointButtonText,
                { color: isSelected ? COLORS.surface : pointColor }
              ]}>
                {point.name || `Punto ${index + 1}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderScheduleButtons = () => {
    const scheduleOptions = [];
    
    if (technicalInfo?.schedule.diurnal) {
      scheduleOptions.push({ key: 'diurnal', label: 'Diurno', icon: 'sun' });
    }
    if (technicalInfo?.schedule.nocturnal) {
      scheduleOptions.push({ key: 'nocturnal', label: 'Nocturno', icon: 'moon' });
    }

    if (scheduleOptions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay horarios configurados</Text>
        </View>
      );
    }

    return (
      <View style={styles.scheduleButtonsContainer}>
        {scheduleOptions.map((option) => {
          const buttonColor = option.key === 'diurnal' ? COLORS.diurnal : COLORS.nocturnal;
          const isSelected = selectedSchedule === option.key;
          
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.scheduleButton,
                isSelected ? { backgroundColor: buttonColor, borderColor: buttonColor } : { borderColor: buttonColor }
              ]}
              onPress={() => setSelectedSchedule(option.key)}
            >
              <Feather 
                name={option.icon as any} 
                size={18} 
                color={isSelected ? COLORS.surface : buttonColor} 
              />
              <Text style={[
                styles.scheduleButtonText,
                { color: isSelected ? COLORS.surface : buttonColor }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMeasurementTypeButtons = () => {
    const measurementTypes = [
      { key: 'emission', label: 'Emisión', icon: 'power' },
      { key: 'residual', label: 'Residual', icon: 'power-off' }
    ];

    return (
      <View style={styles.scheduleButtonsContainer}>
        {measurementTypes.map((option) => {
          const isSelected = selectedMeasurementType === option.key;
          
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.scheduleButton,
                isSelected ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary } : { borderColor: COLORS.primary }
              ]}
              onPress={() => setSelectedMeasurementType(option.key)}
            >
              <Feather 
                name={option.icon as any} 
                size={18} 
                color={isSelected ? COLORS.surface : COLORS.primary} 
              />
              <Text style={[
                styles.scheduleButtonText,
                { color: isSelected ? COLORS.surface : COLORS.primary }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMeasurementForm = () => {
    if (!selectedPoint || !selectedSchedule || !technicalInfo?.measurementType) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            Seleccione un punto de medición y horario para comenzar
          </Text>
        </View>
      );
    }

    if (technicalInfo.measurementType === 'ambient') {
      return renderAmbientForm();
    }

    if (technicalInfo.measurementType === 'immission') {
      return renderImmissionForm();
    }

    if (technicalInfo.measurementType === 'sonometry') {
      return renderSonometryForm();
    }

    const intervals = getIntervalsCount(selectedMeasurementType);
    const selectedInterval = selectedMeasurementType === 'emission' ? selectedEmissionInterval : selectedResidualInterval;
    const setSelectedInterval = selectedMeasurementType === 'emission' ? setSelectedEmissionInterval : setSelectedResidualInterval;
    const intervalOptions = selectedMeasurementType === 'emission' ? EMISSION_INTERVALS : RESIDUAL_INTERVALS;
    const placeholder = selectedMeasurementType === 'emission' ? '1' : '0';

    return (
      <View style={styles.formContainer}>
        <View style={styles.subsectionContainer}>
          <FormPicker
            label="Número de intervalos"
            value={intervals.toString()}
            onSelect={(value) => {
              const numIntervals = parseInt(value);
              saveIntervalsCount(selectedMeasurementType, numIntervals);
              
              // Adjust selected interval if necessary
              if (selectedInterval >= numIntervals) {
                setSelectedInterval(Math.max(0, numIntervals - 1));
              }
            }}
            options={intervalOptions}
            placeholder={placeholder}
            horizontal
            required
          />

          {renderIntervalButtons(intervals, selectedInterval, setSelectedInterval)}
          
          {intervals > 0 && renderCurrentIntervalFields(selectedMeasurementType, selectedInterval)}
        </View>
      </View>
    );
  };

  const renderFormByType = (measurementType: MeasurementType) => {
    switch (measurementType) {
      case 'emission':
        return renderEmissionForm();
      case 'ambient':
        return renderAmbientForm();
      case 'immission':
        return renderImmissionForm();
      case 'sonometry':
        return renderSonometryForm();
      default:
        return (
          <Text style={styles.errorText}>
            Tipo de medición no reconocido
          </Text>
        );
    }
  };

  const renderIntervalButtons = (numIntervals: number, selectedInterval: number, onSelect: (index: number) => void) => {
    if (numIntervals === 0) return null;
    
    return (
      <View style={styles.intervalButtonsContainer}>
        <Text style={styles.intervalButtonsLabel}>Seleccione el intervalo a editar:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.buttonScrollView}
          contentContainerStyle={styles.buttonScrollContent}
        >
          {Array.from({ length: numIntervals }, (_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.intervalButton,
                selectedInterval === index && styles.intervalButtonSelected
              ]}
              onPress={() => onSelect(index)}
            >
              <Text style={[
                styles.intervalButtonText,
                selectedInterval === index && styles.intervalButtonTextSelected
              ]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAmbientForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.subsectionContainer}>
          {renderDirectionButtons()}
          {renderAmbientIntervalFields(selectedAmbientDirection)}
        </View>
      </View>
    );
  };

  const renderDirectionButtons = () => {
    const directions = [
      { key: 'N', label: 'N', icon: 'arrow-up' },
      { key: 'S', label: 'S', icon: 'arrow-down' },
      { key: 'E', label: 'E', icon: 'arrow-right' },
      { key: 'W', label: 'W', icon: 'arrow-left' },
      { key: 'V', label: 'V', icon: 'circle' }
    ];

    return (
      <View style={styles.directionButtonsContainer}>
        <Text style={styles.intervalButtonsLabel}>Seleccione la dirección:</Text>
        <View style={styles.directionButtonsRow}>
          {directions.map((direction) => {
            const isSelected = selectedAmbientDirection === direction.key;
            
            return (
              <TouchableOpacity
                key={direction.key}
                style={[
                  styles.directionButton,
                  isSelected && styles.directionButtonSelected
                ]}
                onPress={() => setSelectedAmbientDirection(direction.key)}
              >
                <Feather 
                  name={direction.icon as any} 
                  size={16} 
                  color={isSelected ? COLORS.surface : COLORS.primary} 
                />
                <Text style={[
                  styles.directionButtonText,
                  isSelected && styles.directionButtonTextSelected
                ]}>
                  {direction.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAmbientIntervalFields = (direction: string) => {
    const measurement = getCurrentAmbientMeasurement(direction);
    
    return (
      <View style={styles.currentIntervalContainer}>
        <Text style={styles.currentIntervalTitle}>
          Dirección {direction}
        </Text>
        
        <FormInput
          label="LAeq (dBA)"
          value={measurement.soundLevel}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'soundLevel', text)}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={measurement.fileNumber}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'fileNumber', text)}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <NativeTimePicker
          label="Hora inicial"
          value={measurement.startTime}
          onTimeChange={(time) => {
            saveAmbientMeasurementData(direction, 'startTime', time);
            
            // Auto-adjust end time (5 minutes for ambient measurements)
            const adjustedEndTime = adjustEndTime(time, 3); // Using 3 to get 5-minute adjustment
            if (adjustedEndTime) {
              saveAmbientMeasurementData(direction, 'endTime', adjustedEndTime);
              showToast('Hora final ajustada automáticamente');
            }
          }}
          horizontal
        />
        
        <NativeTimePicker
          label="Hora final"
          value={measurement.endTime}
          onTimeChange={(time) => saveAmbientMeasurementData(direction, 'endTime', time)}
          horizontal
        />
        
        <FormInput
          label="Cal PRE (dB)"
          value={measurement.calibrationPre}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'calibrationPre', text)}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
        
        <FormInput
          label="Cal POST (dB)"
          value={measurement.calibrationPost}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'calibrationPost', text)}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
      </View>
    );
  };

  // Get ambient measurement data for current selection
  const getCurrentAmbientMeasurement = (direction: string) => {
    const key = getAmbientDataKey(selectedPoint, selectedSchedule, direction);
    return measurementData[key] || {
      soundLevel: '',
      fileNumber: '',
      startTime: '',
      endTime: '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Generate unique key for storing ambient measurement data
  const getAmbientDataKey = (pointIndex: string, schedule: string, direction: string) => {
    return `${pointIndex}_${schedule}_ambient_${direction}`;
  };

  // Save ambient measurement data
  const saveAmbientMeasurementData = (direction: string, field: string, value: string) => {
    const key = getAmbientDataKey(selectedPoint, selectedSchedule, direction);
    setMeasurementData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  const renderImmissionForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.subsectionContainer}>
          {renderImmissionFields()}
        </View>
      </View>
    );
  };

  const renderImmissionFields = () => {
    const measurement = getCurrentImmissionMeasurement();
    
    return (
      <View style={styles.currentIntervalContainer}>
        <Text style={styles.currentIntervalTitle}>
          Medición de Inmisión
        </Text>
        
        <FormInput
          label="LAeq (dBA)"
          value={measurement.soundLevelLeq}
          onChangeText={(text) => saveImmissionMeasurementData('soundLevelLeq', text)}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="LAmin (dBA)"
          value={measurement.soundLevelMin}
          onChangeText={(text) => saveImmissionMeasurementData('soundLevelMin', text)}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="LAmax (dBA)"
          value={measurement.soundLevelMax}
          onChangeText={(text) => saveImmissionMeasurementData('soundLevelMax', text)}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={measurement.fileNumber}
          onChangeText={(text) => saveImmissionMeasurementData('fileNumber', text)}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <NativeTimePicker
          label="Hora inicial"
          value={measurement.startTime}
          onTimeChange={(time) => {
            saveImmissionMeasurementData('startTime', time);
            
            // Auto-adjust end time (15 minutes for immission measurements)
            const startDate = new Date();
            const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
            const match = time.match(timeRegex);
            if (match) {
              const hour = parseInt(match[1]);
              const minute = parseInt(match[2]);
              const period = match[3].toUpperCase();
              
              let hour24 = hour;
              if (period === 'AM' && hour === 12) {
                hour24 = 0;
              } else if (period === 'PM' && hour !== 12) {
                hour24 = hour + 12;
              }
              
              startDate.setHours(hour24, minute, 0, 0);
              const endDate = new Date(startDate);
              endDate.setMinutes(endDate.getMinutes() + 15); // Add 15 minutes
              
              let endHour = endDate.getHours();
              const endMinute = endDate.getMinutes();
              const endPeriod = endHour >= 12 ? 'PM' : 'AM';
              
              endHour = endHour % 12;
              if (endHour === 0) endHour = 12;
              
              const formattedMinute = endMinute.toString().padStart(2, '0');
              const adjustedEndTime = `${endHour}:${formattedMinute} ${endPeriod}`;
              
              saveImmissionMeasurementData('endTime', adjustedEndTime);
              showToast('Hora final ajustada automáticamente (+15 min)');
            }
          }}
          horizontal
        />
        
        <NativeTimePicker
          label="Hora final"
          value={measurement.endTime}
          onTimeChange={(time) => saveImmissionMeasurementData('endTime', time)}
          horizontal
        />
        
        <FormInput
          label="Cal PRE (dB)"
          value={measurement.calibrationPre}
          onChangeText={(text) => saveImmissionMeasurementData('calibrationPre', text)}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
        
        <FormInput
          label="Cal POST (dB)"
          value={measurement.calibrationPost}
          onChangeText={(text) => saveImmissionMeasurementData('calibrationPost', text)}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
      </View>
    );
  };

  // Get immission measurement data for current selection
  const getCurrentImmissionMeasurement = () => {
    const key = getImmissionDataKey(selectedPoint, selectedSchedule);
    return measurementData[key] || {
      soundLevelLeq: '',
      soundLevelMin: '',
      soundLevelMax: '',
      fileNumber: '',
      startTime: '',
      endTime: '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Generate unique key for storing immission measurement data
  const getImmissionDataKey = (pointIndex: string, schedule: string) => {
    return `${pointIndex}_${schedule}_immission`;
  };

  // Save immission measurement data
  const saveImmissionMeasurementData = (field: string, value: string) => {
    const key = getImmissionDataKey(selectedPoint, selectedSchedule);
    setMeasurementData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  const renderSonometryForm = () => {
    return (
      <View style={styles.formContainer}>
        <View style={styles.subsectionContainer}>
          {renderSonometryFields()}
        </View>
      </View>
    );
  };

  const renderSonometryFields = () => {
    const measurement = getCurrentSonometryMeasurement();
    
    return (
      <View style={styles.currentIntervalContainer}>
        <Text style={styles.currentIntervalTitle}>
          Medición de Sonometría
        </Text>
        
        <FormInput
          label="LAeq (dBA)"
          value={measurement.soundLevelLeq}
          onChangeText={(text) => saveSonometryMeasurementData('soundLevelLeq', text)}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={measurement.fileNumber}
          onChangeText={(text) => saveSonometryMeasurementData('fileNumber', text)}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <NativeTimePicker
          label="Hora inicial"
          value={measurement.startTime}
          onTimeChange={(time) => saveSonometryMeasurementData('startTime', time)}
          horizontal
        />
        
        <NativeTimePicker
          label="Hora final"
          value={measurement.endTime}
          onTimeChange={(time) => saveSonometryMeasurementData('endTime', time)}
          horizontal
        />
        
        <FormInput
          label="Cal PRE (dB)"
          value={measurement.calibrationPre}
          onChangeText={(text) => saveSonometryMeasurementData('calibrationPre', text)}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
        
        <FormInput
          label="Cal POST (dB)"
          value={measurement.calibrationPost}
          onChangeText={(text) => saveSonometryMeasurementData('calibrationPost', text)}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
      </View>
    );
  };

  // Get sonometry measurement data for current selection
  const getCurrentSonometryMeasurement = () => {
    const key = getSonometryDataKey(selectedPoint, selectedSchedule);
    return measurementData[key] || {
      soundLevelLeq: '',
      fileNumber: '',
      startTime: '',
      endTime: '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Generate unique key for storing sonometry measurement data
  const getSonometryDataKey = (pointIndex: string, schedule: string) => {
    return `${pointIndex}_${schedule}_sonometry`;
  };

  // Save sonometry measurement data
  const saveSonometryMeasurementData = (field: string, value: string) => {
    const key = getSonometryDataKey(selectedPoint, selectedSchedule);
    setMeasurementData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

    const renderCurrentIntervalFields = (prefix: string, intervalIndex: number) => {
      const measurement = getCurrentMeasurement(prefix, intervalIndex);
      
      return (
        <View style={styles.currentIntervalContainer}>
          <Text style={styles.currentIntervalTitle}>Intervalo {intervalIndex + 1}</Text>
          
          <FormInput
            label="LAeq (dBA)"
            value={measurement.soundLevel}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'soundLevel', text)}
            keyboardType="numeric"
            placeholder="0.0"
            horizontal
          />
          
          <FormInput
            label="L90 (dBA)"
            value={measurement.percentile90}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'percentile90', text)}
            keyboardType="numeric"
            placeholder="0.0"
            horizontal
          />
          
          <FormInput
            label="# archivo"
            value={measurement.fileNumber}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'fileNumber', text)}
            keyboardType="numeric"
            placeholder="000"
            horizontal
          />
          
          <NativeTimePicker
            label="Hora inicial"
            value={measurement.startTime}
            onTimeChange={(time) => {
              saveMeasurementData(prefix, intervalIndex, 'startTime', time);
              
              // Auto-adjust end time based on intervals
              const intervals = getIntervalsCount(prefix);
              if (intervals === 1 || intervals === 3) {
                const adjustedEndTime = adjustEndTime(time, intervals);
                if (adjustedEndTime) {
                  saveMeasurementData(prefix, intervalIndex, 'endTime', adjustedEndTime);
                  showToast('Hora final ajustada automáticamente');
                }
              }
            }}
            horizontal
          />
          
          <NativeTimePicker
            label="Hora final"
            value={measurement.endTime}
            onTimeChange={(time) => saveMeasurementData(prefix, intervalIndex, 'endTime', time)}
            horizontal
          />
          
          <FormInput
            label="Cal PRE (dB)"
            value={measurement.calibrationPre}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'calibrationPre', text)}
            keyboardType="numeric"
            placeholder=""
            horizontal
          />
          
          <FormInput
            label="Cal POST (dB)"
            value={measurement.calibrationPost}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'calibrationPost', text)}
            keyboardType="numeric"
            placeholder=""
            horizontal
          />
        </View>
      );
    };



  return (
    <View style={styles.screenContainer}>
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        <Text style={styles.title}>Resultados de Medición</Text>

        <View style={styles.selectionSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Puntos de Medición</Text>
          </View>
          {renderPointButtons()}
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Horario</Text>
          </View>
          {renderScheduleButtons()}

          {technicalInfo?.measurementType === 'emission' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tipo de Medición</Text>
              </View>
              {renderMeasurementTypeButtons()}
            </>
          )}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollableContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.formContent}>
          {renderMeasurementForm()}
        </View>
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Toast Message */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollableContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  formContent: {
    padding: 16,
    paddingTop: 8,
  },
  bottomSpacing: {
    height: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  selectionSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    marginBottom: 6,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },
  buttonScrollView: {
    marginBottom: 16,
  },
  buttonScrollContent: {
    paddingHorizontal: 4,
  },
  pointButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  pointButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 2,
  },
  scheduleButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    flex: 1,
    maxWidth: 120,
    flexDirection: 'row',
  },
  scheduleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  subsectionContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  intervalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intervalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  intervalButtonsContainer: {
    marginBottom: 16,
  },
  intervalButtonsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  intervalButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 24,
    width: 40,
    height: 40,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intervalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  intervalButtonTextSelected: {
    color: COLORS.surface,
  },
  currentIntervalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  currentIntervalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  directionButtonsContainer: {
    marginBottom: 16,
  },
  directionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  directionButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 40,
  },
  directionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  directionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  directionButtonTextSelected: {
    color: COLORS.surface,
  },
});

export default MeasurementResultsScreen;