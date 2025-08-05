import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormPicker from '../components/FormPicker';
import FormInput from '../components/FormInput';
import TimePicker from '../components/TimePicker';
import { COLORS, EMISSION_INTERVALS, RESIDUAL_INTERVALS } from '../constants';
import { MeasurementType } from '../types';

const MeasurementResultsScreen: React.FC = () => {
  const { state, updateMeasurementResultData, saveCurrentFormat } = useMeasurement();
  const [selectedPoint, setSelectedPoint] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedMeasurementType, setSelectedMeasurementType] = useState('emission');
  const [selectedEmissionInterval, setSelectedEmissionInterval] = useState(0);
  const [selectedResidualInterval, setSelectedResidualInterval] = useState(0);
  const [selectedAmbientDirection, setSelectedAmbientDirection] = useState('N');
  const [selectedAmbientInterval, setSelectedAmbientInterval] = useState(0);
  // Remove local state - we'll use context data directly
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

  // Get measurement data from context
  const getMeasurementResult = (pointId: string, schedule: 'diurnal' | 'nocturnal', type: MeasurementType) => {
    if (!currentFormat) return null;
    return currentFormat.measurementResults.find(
      result => result.pointId === pointId && result.schedule === schedule && result.type === type
    );
  };

  // Get measurement data for current selection
  const getCurrentMeasurement = (type: string, intervalIndex: number) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      return {
        soundLevel: '',
        percentile90: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    
    if (!result?.emission) {
      return {
        soundLevel: '',
        percentile90: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    const intervals = type === 'emission' ? result.emission.emission : result.emission.residual;
    const intervalData = intervals.data[intervalIndex];
    
    if (!intervalData) {
      return {
        soundLevel: '',
        percentile90: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    return {
      soundLevel: intervalData.soundLevel?.toString() || '',
      percentile90: intervalData.percentile90?.toString() || '',
      fileNumber: intervalData.fileNumber?.toString() || '',
      startTime: intervalData.initialTime || '',
      endTime: intervalData.finalTime || '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Save measurement data to context
  const saveMeasurementData = (type: string, intervalIndex: number, field: string, value: string) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    
    let emissionData = result?.emission || {
      emission: { intervals: 1, data: [] },
      residual: { intervals: 0, data: [] }
    };

    // Ensure intervals array exists and has correct length
    const intervals = type === 'emission' ? emissionData.emission : emissionData.residual;
    while (intervals.data.length <= intervalIndex) {
      intervals.data.push({
        soundLevel: 0,
        percentile90: 0,
        fileNumber: 0,
        initialTime: '',
        finalTime: '',
      });
    }

    // Update the specific field
    const intervalData = intervals.data[intervalIndex];
    if (field === 'soundLevel' || field === 'percentile90' || field === 'fileNumber') {
      intervalData[field] = parseFloat(value) || 0;
    } else if (field === 'startTime') {
      intervalData.initialTime = value;
    } else if (field === 'endTime') {
      intervalData.finalTime = value;
    }

    // Update context
    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission', emissionData);
    triggerAutoSave();
  };

  // Get number of intervals for current data
  const getIntervalsCount = (type: string) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      return type === 'emission' ? 1 : 0;
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    
    if (!result?.emission) {
      return type === 'emission' ? 1 : 0;
    }

    const intervals = type === 'emission' ? result.emission.emission : result.emission.residual;
    return intervals.intervals;
  };

  // Save intervals count
  const saveIntervalsCount = (type: string, count: number) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    
    let emissionData = result?.emission || {
      emission: { intervals: 1, data: [] },
      residual: { intervals: 0, data: [] }
    };

    // Update intervals count
    if (type === 'emission') {
      emissionData.emission.intervals = count;
      // Adjust data array length
      while (emissionData.emission.data.length < count) {
        emissionData.emission.data.push({
          soundLevel: 0,
          percentile90: 0,
          fileNumber: 0,
          initialTime: '',
          finalTime: '',
        });
      }
      emissionData.emission.data = emissionData.emission.data.slice(0, count);
    } else {
      emissionData.residual.intervals = count;
      // Adjust data array length
      while (emissionData.residual.data.length < count) {
        emissionData.residual.data.push({
          soundLevel: 0,
          percentile90: 0,
          fileNumber: 0,
          initialTime: '',
          finalTime: '',
        });
      }
      emissionData.residual.data = emissionData.residual.data.slice(0, count);
    }

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission', emissionData);
    triggerAutoSave();
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
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={measurement.fileNumber}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'fileNumber', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <TimePicker
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
        
        <TimePicker
          label="Hora final"
          value={measurement.endTime}
          onTimeChange={(time) => saveAmbientMeasurementData(direction, 'endTime', time)}
          horizontal
        />
        
        <FormInput
          label="Cal PRE (dB)"
          value={measurement.calibrationPre}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'calibrationPre', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
        
        <FormInput
          label="Cal POST (dB)"
          value={measurement.calibrationPost}
          onChangeText={(text) => saveAmbientMeasurementData(direction, 'calibrationPost', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
      </View>
    );
  };

  // Get ambient measurement data for current selection
  const getCurrentAmbientMeasurement = (direction: string) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      return {
        soundLevel: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient');
    
    if (!result?.ambient) {
      return {
        soundLevel: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    const directionKey = `level${direction}` as keyof typeof result.ambient;
    const fileKey = `fileNumber${direction}` as keyof typeof result.ambient;
    
    return {
      soundLevel: result.ambient[directionKey] || '',
      fileNumber: result.ambient[fileKey] || '',
      startTime: result.ambient.initialTime || '',
      endTime: result.ambient.finalTime || '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Auto-save function with debounce
  const debouncedSave = useRef<NodeJS.Timeout | null>(null);
  const triggerAutoSave = () => {
    if (debouncedSave.current) {
      clearTimeout(debouncedSave.current);
    }
    debouncedSave.current = setTimeout(async () => {
      try {
        await saveCurrentFormat();
        console.log('Measurement results auto-saved');
      } catch (error) {
        console.error('Error auto-saving measurement results:', error);
      }
    }, 1000);
  };

  const saveAmbientMeasurementData = (direction: string, field: string, value: string) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient');
    
    let ambientData = result?.ambient || {
      levelN: '',
      fileNumberN: '',
      levelS: '',
      fileNumberS: '',
      levelE: '',
      fileNumberE: '',
      levelW: '',
      fileNumberW: '',
      levelV: '',
      fileNumberV: '',
      initialTime: '',
      finalTime: '',
    };

    // Update the specific field
    if (field === 'soundLevel') {
      const directionKey = `level${direction}` as keyof typeof ambientData;
      (ambientData as any)[directionKey] = value;
    } else if (field === 'fileNumber') {
      const fileKey = `fileNumber${direction}` as keyof typeof ambientData;
      (ambientData as any)[fileKey] = value;
    } else if (field === 'startTime') {
      ambientData.initialTime = value;
    } else if (field === 'endTime') {
      ambientData.finalTime = value;
    }

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient', ambientData);
    triggerAutoSave();
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
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="LAmin (dBA)"
          value={measurement.soundLevelMin}
          onChangeText={(text) => saveImmissionMeasurementData('soundLevelMin', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="LAmax (dBA)"
          value={measurement.soundLevelMax}
          onChangeText={(text) => saveImmissionMeasurementData('soundLevelMax', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={measurement.fileNumber}
          onChangeText={(text) => saveImmissionMeasurementData('fileNumber', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <TimePicker
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
        
        <TimePicker
          label="Hora final"
          value={measurement.endTime}
          onTimeChange={(time) => saveImmissionMeasurementData('endTime', time)}
          horizontal
        />
        
        <FormInput
          label="Cal PRE (dB)"
          value={measurement.calibrationPre}
          onChangeText={(text) => saveImmissionMeasurementData('calibrationPre', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
        
        <FormInput
          label="Cal POST (dB)"
          value={measurement.calibrationPost}
          onChangeText={(text) => saveImmissionMeasurementData('calibrationPost', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
      </View>
    );
  };

  // Get immission measurement data for current selection
  const getCurrentImmissionMeasurement = () => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      return {
        soundLevelLeq: '',
        soundLevelMin: '',
        soundLevelMax: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission');
    
    if (!result?.immission) {
      return {
        soundLevelLeq: '',
        soundLevelMin: '',
        soundLevelMax: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    return {
      soundLevelLeq: result.immission.levelLeq || '',
      soundLevelMin: result.immission.levelLmin || '',
      soundLevelMax: result.immission.levelLmax || '',
      fileNumber: '',
      startTime: result.immission.initialTime || '',
      endTime: result.immission.finalTime || '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Save immission measurement data
  const saveImmissionMeasurementData = (field: string, value: string) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission');
    
    let immissionData = result?.immission || {
      levelLeq: '',
      levelLmax: '',
      levelLmin: '',
      initialTime: '',
      finalTime: '',
    };

    // Update the specific field
    if (field === 'soundLevelLeq') {
      immissionData.levelLeq = value;
    } else if (field === 'soundLevelMin') {
      immissionData.levelLmin = value;
    } else if (field === 'soundLevelMax') {
      immissionData.levelLmax = value;
    } else if (field === 'startTime') {
      immissionData.initialTime = value;
    } else if (field === 'endTime') {
      immissionData.finalTime = value;
    }

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission', immissionData);
    triggerAutoSave();
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
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={measurement.fileNumber}
          onChangeText={(text) => saveSonometryMeasurementData('fileNumber', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <TimePicker
          label="Hora inicial"
          value={measurement.startTime}
          onTimeChange={(time) => saveSonometryMeasurementData('startTime', time)}
          horizontal
        />
        
        <TimePicker
          label="Hora final"
          value={measurement.endTime}
          onTimeChange={(time) => saveSonometryMeasurementData('endTime', time)}
          horizontal
        />
        
        <FormInput
          label="Cal PRE (dB)"
          value={measurement.calibrationPre}
          onChangeText={(text) => saveSonometryMeasurementData('calibrationPre', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
        
        <FormInput
          label="Cal POST (dB)"
          value={measurement.calibrationPost}
          onChangeText={(text) => saveSonometryMeasurementData('calibrationPost', text)}
          onBlur={() => triggerAutoSave()}
          keyboardType="numeric"
          placeholder=""
          horizontal
        />
      </View>
    );
  };

  // Get sonometry measurement data for current selection
  const getCurrentSonometryMeasurement = () => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      return {
        soundLevelLeq: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry');
    
    if (!result?.sonometry) {
      return {
        soundLevelLeq: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
      };
    }

    return {
      soundLevelLeq: result.sonometry.levelLeq || '',
      fileNumber: '',
      startTime: result.sonometry.initialTime || '',
      endTime: result.sonometry.finalTime || '',
      calibrationPre: '',
      calibrationPost: '',
    };
  };

  // Save sonometry measurement data
  const saveSonometryMeasurementData = (field: string, value: string) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry');
    
    let sonometryData = result?.sonometry || {
      levelLeq: '',
      levelLmax: '',
      levelLmin: '',
      initialTime: '',
      finalTime: '',
    };

    // Update the specific field
    if (field === 'soundLevelLeq') {
      sonometryData.levelLeq = value;
    } else if (field === 'startTime') {
      sonometryData.initialTime = value;
    } else if (field === 'endTime') {
      sonometryData.finalTime = value;
    }

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry', sonometryData);
    triggerAutoSave();
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
            onBlur={() => triggerAutoSave()}
            keyboardType="numeric"
            placeholder="0.0"
            horizontal
          />
          
          <FormInput
            label="L90 (dBA)"
            value={measurement.percentile90}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'percentile90', text)}
            onBlur={() => triggerAutoSave()}
            keyboardType="numeric"
            placeholder="0.0"
            horizontal
          />
          
          <FormInput
            label="# archivo"
            value={measurement.fileNumber}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'fileNumber', text)}
            onBlur={() => triggerAutoSave()}
            keyboardType="numeric"
            placeholder="000"
            horizontal
          />
          
          <TimePicker
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
          
          <TimePicker
            label="Hora final"
            value={measurement.endTime}
            onTimeChange={(time) => saveMeasurementData(prefix, intervalIndex, 'endTime', time)}
            horizontal
          />
          
          <FormInput
            label="Cal PRE (dB)"
            value={measurement.calibrationPre}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'calibrationPre', text)}
            onBlur={() => triggerAutoSave()}
            keyboardType="numeric"
            placeholder=""
            horizontal
          />
          
          <FormInput
            label="Cal POST (dB)"
            value={measurement.calibrationPost}
            onChangeText={(text) => saveMeasurementData(prefix, intervalIndex, 'calibrationPost', text)}
            onBlur={() => triggerAutoSave()}
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
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    marginBottom: 4,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    gap: 10,
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