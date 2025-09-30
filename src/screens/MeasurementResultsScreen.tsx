import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import FormPicker from '../components/FormPicker';
import FormInput from '../components/FormInput';
import TimePicker from '../components/TimePicker';
import CalibrationPhotoButton from '../components/CalibrationPhotoButton';
import { COLORS, EMISSION_INTERVALS, RESIDUAL_INTERVALS } from '../constants';
import { MeasurementType, CalibrationPhoto, ScheduleType } from '../types';

const MeasurementResultsScreen: React.FC = () => {
  const { state, updateMeasurementResultData, saveCurrentFormat, setNavigationSelection } = useMeasurement();
  const [selectedPoint, setSelectedPoint] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedMeasurementType, setSelectedMeasurementType] = useState('emission');
  const [selectedEmissionInterval, setSelectedEmissionInterval] = useState(0);
  const [selectedResidualInterval, setSelectedResidualInterval] = useState(0);
  const [selectedAmbientDirection, setSelectedAmbientDirection] = useState('N');
  const [selectedAmbientInterval, setSelectedAmbientInterval] = useState(0);
  // Local temporary state for input values
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [toastOpacity] = useState(new Animated.Value(0));
  const [toastMessage, setToastMessage] = useState('');
  // Force re-render after time changes
  const [forceUpdate, setForceUpdate] = useState(0);
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  // Set default selections or use navigation selection
  React.useEffect(() => {
    console.log('Setting default selections:', {
      measurementPointsLength: measurementPoints.length,
      selectedPoint,
      technicalInfo: technicalInfo?.schedule,
      selectedSchedule,
      measurementType: technicalInfo?.measurementType,
      selectedMeasurementType,
      navigationSelection: {
        pointId: state.selectedPointForNavigation,
        schedule: state.selectedScheduleForNavigation,
      }
    });

    // Check if there's a navigation selection from ResultsSummaryScreen
    if (state.selectedPointForNavigation && state.selectedScheduleForNavigation) {
      // Find the point index from the pointId
      const pointIndex = measurementPoints.findIndex(point => point.id === state.selectedPointForNavigation);
      if (pointIndex !== -1) {
        console.log('Using navigation selection:', pointIndex, state.selectedScheduleForNavigation);
        setSelectedPoint(pointIndex.toString());
        setSelectedSchedule(state.selectedScheduleForNavigation);

        // Clear the navigation selection after using it
        setNavigationSelection('', 'diurnal');
        return;
      }
    }

    // Initialize point selection (default behavior)
    if (measurementPoints.length > 0 && !selectedPoint) {
      console.log('Setting default point to 0');
      setSelectedPoint('0');
    }

    // Initialize schedule selection
    if (technicalInfo?.schedule && !selectedSchedule) {
      if (technicalInfo.schedule.diurnal) {
        console.log('Setting default schedule to diurnal');
        setSelectedSchedule('diurnal');
      } else if (technicalInfo.schedule.nocturnal) {
        console.log('Setting default schedule to nocturnal');
        setSelectedSchedule('nocturnal');
      }
    }

    // Initialize measurement type selection for emission
    if (technicalInfo?.measurementType === 'emission' && !selectedMeasurementType) {
      console.log('Setting default measurement type to emission');
      setSelectedMeasurementType('emission');
    }
  }, [measurementPoints, technicalInfo]);

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
  const getCurrentMeasurement = React.useCallback((type: string, intervalIndex: number) => {
    console.log('getCurrentMeasurement called:', { type, intervalIndex, selectedPoint, selectedSchedule, forceUpdate });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('getCurrentMeasurement: returning empty data');
      return {
        soundLevel: '',
        percentile90: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
        calibrationPrePhoto: null,
        calibrationPostPhoto: null,
      };
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    console.log('getMeasurementResult returned for emission:', result);
    
    if (!result?.emission) {
      console.log('No emission data found, returning empty');
      return {
        soundLevel: '',
        percentile90: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
        calibrationPrePhoto: null,
        calibrationPostPhoto: null,
      };
    }

    const intervals = type === 'emission' ? result.emission.emission : result.emission.residual;
    const intervalData = intervals.data[intervalIndex];
    
    console.log('intervalData content:', intervalData);
    console.log('intervalData.initialTime:', intervalData?.initialTime);
    console.log('intervalData.finalTime:', intervalData?.finalTime);
    
    if (!intervalData) {
      console.log('No intervalData found, returning empty');
      return {
        soundLevel: '',
        percentile90: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
        calibrationPrePhoto: null,
        calibrationPostPhoto: null,
      };
    }

    const returnData = {
      soundLevel: intervalData.soundLevel?.toString() || '',
      percentile90: intervalData.percentile90?.toString() || '',
      fileNumber: intervalData.fileNumber?.toString() || '',
      startTime: intervalData.initialTime || '',
      endTime: intervalData.finalTime || '',
      calibrationPre: intervalData.calibrationPre || '',
      calibrationPost: intervalData.calibrationPost || '',
      calibrationPrePhoto: intervalData.calibrationPrePhoto || null,
      calibrationPostPhoto: intervalData.calibrationPostPhoto || null,
    };
    
    console.log('getCurrentMeasurement returning:', returnData);
    
    return returnData;
  }, [selectedPoint, selectedSchedule, currentFormat, forceUpdate]);

  // Update temporary input value during editing
  // Normalize decimal input to handle both comma and dot separators, allowing negative values
  const normalizeDecimalInput = (value: string): string => {
    // Replace comma with dot for decimal separator
    let normalized = value.replace(',', '.');
    
    // Allow negative sign only at the beginning
    if (normalized.includes('-')) {
      // Remove all minus signs
      normalized = normalized.replace(/-/g, '');
      // Add minus sign at the beginning if the original value started with one
      if (value.trim().startsWith('-')) {
        normalized = '-' + normalized;
      }
    }
    
    return normalized;
  };

  // Filter input for calibration fields to allow only numbers, dots, commas and minus sign
  const filterCalibrationInput = (value: string): string => {
    // Allow only digits, dots, commas, and minus sign
    let filtered = value.replace(/[^0-9.,-]/g, '');
    
    // Allow minus only at the beginning
    if (filtered.includes('-')) {
      const minusCount = (filtered.match(/-/g) || []).length;
      filtered = filtered.replace(/-/g, '');
      if (value.startsWith('-') && minusCount > 0) {
        filtered = '-' + filtered;
      }
    }
    
    return filtered;
  };

  // Check if a field is a decimal field based on its key
  const isDecimalField = (key: string): boolean => {
    const decimalFields = [
      'soundLevel', 'percentile90', 'soundLevelLeq', 'soundLevelMin', 'soundLevelMax',
      'calibrationPre', 'calibrationPost'
    ];
    return decimalFields.some(field => key.includes(field));
  };

  // Validate L90 vs LAeq
  const validateL90VsLAeq = (prefix: string, intervalIndex: number, laeq: string, l90: string) => {
    const laeqNum = parseFloat(laeq);
    const l90Num = parseFloat(l90);

    // Ignore validation if either value is 0 or empty
    if (!laeq || !l90 || laeqNum === 0 || l90Num === 0 || isNaN(laeqNum) || isNaN(l90Num)) {
      // Clear any existing error
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${prefix}_${intervalIndex}_l90_validation`];
        return newErrors;
      });
      return;
    }

    // Check if L90 >= LAeq
    if (l90Num >= laeqNum) {
      setValidationErrors(prev => ({
        ...prev,
        [`${prefix}_${intervalIndex}_l90_validation`]: 'El L90 debe ser menor al LAeq. Verificar resultados'
      }));
    } else {
      // Clear error if validation passes
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${prefix}_${intervalIndex}_l90_validation`];
        return newErrors;
      });
    }
  };

  // Validate calibration difference
  const validateCalibrationDifference = (prefix: string, intervalIndex: number, pre: string, post: string) => {
    const preNum = parseFloat(pre);
    const postNum = parseFloat(post);

    // Calculate even if one value is 0 (as per requirement)
    if (!pre || !post || isNaN(preNum) || isNaN(postNum)) {
      // Clear any existing error
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${prefix}_${intervalIndex}_calibration_validation`];
        return newErrors;
      });
      return;
    }

    // Check if absolute difference > 0.5
    const difference = Math.abs(preNum - postNum);
    if (difference > 0.5) {
      setValidationErrors(prev => ({
        ...prev,
        [`${prefix}_${intervalIndex}_calibration_validation`]: 'La diferencia entre la calibración PRE y POST es mayor a 0.5 dB. Verificar resultados o repetir intervalo de medición'
      }));
    } else {
      // Clear error if validation passes
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${prefix}_${intervalIndex}_calibration_validation`];
        return newErrors;
      });
    }
  };

  const updateTempInputValue = (key: string, value: string) => {
    // Normalize decimal input only for decimal fields
    const normalizedValue = isDecimalField(key) ? normalizeDecimalInput(value) : value;
    setTempInputValues(prev => ({
      ...prev,
      [key]: normalizedValue
    }));
  };

  // Get temporary input value or fallback to saved data
  const getTempInputValue = (key: string, fallbackValue: string) => {
    return tempInputValues[key] !== undefined ? tempInputValues[key] : fallbackValue;
  };

  // Validate and save measurement data to context (called onBlur)
  // Save calibration photo for emission measurements
  const saveCalibrationPhoto = (type: string, intervalIndex: number, photoType: 'calibrationPre' | 'calibrationPost', photo: CalibrationPhoto) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    let emissionData = result?.emission || {
      emission: { intervals: 1, data: [] },
      residual: { intervals: 0, data: [] }
    };

    const intervals = type === 'emission' ? emissionData.emission : emissionData.residual;
    while (intervals.data.length <= intervalIndex) {
      intervals.data.push({
        soundLevel: 0,
        percentile90: 0,
        fileNumber: '',
        initialTime: '',
        finalTime: '',
        calibrationPre: '',
        calibrationPost: '',
      });
    }

    const intervalData = intervals.data[intervalIndex];
    const photoFieldName = `${photoType}Photo` as keyof typeof intervalData;
    (intervalData as any)[photoFieldName] = photo;

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission', emissionData);
    triggerAutoSave();
  };

  // Remove calibration photo for emission measurements
  const removeCalibrationPhoto = (type: string, intervalIndex: number, photoType: 'calibrationPre' | 'calibrationPost') => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
    let emissionData = result?.emission || {
      emission: { intervals: 1, data: [] },
      residual: { intervals: 0, data: [] }
    };

    const intervals = type === 'emission' ? emissionData.emission : emissionData.residual;
    if (intervals.data.length > intervalIndex) {
      const intervalData = intervals.data[intervalIndex];
      const photoFieldName = `${photoType}Photo` as keyof typeof intervalData;
      (intervalData as any)[photoFieldName] = undefined;

      updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission', emissionData);
      triggerAutoSave();
    }
  };

  // Returns the updated intervalData for chaining operations
  const saveMeasurementData = (type: string, intervalIndex: number, field: string, value: string, existingEmissionData?: any) => {
    console.log('saveMeasurementData called:', { type, intervalIndex, field, value, selectedPoint, selectedSchedule });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('Early return: missing selections');
      return null;
    }
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) {
      console.log('Early return: missing pointId');
      return null;
    }

    // Use existing emission data if provided (for chaining operations) or get fresh data
    let emissionData;
    if (existingEmissionData) {
      emissionData = existingEmissionData;
      console.log('Using existing emission data for chaining');
    } else {
      const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission');
      emissionData = result?.emission || {
        emission: { intervals: 1, data: [] },
        residual: { intervals: 0, data: [] }
      };
    }

    // Ensure intervals array exists and has correct length
    const intervals = type === 'emission' ? emissionData.emission : emissionData.residual;
    while (intervals.data.length <= intervalIndex) {
      intervals.data.push({
        soundLevel: 0,
        percentile90: 0,
        fileNumber: '',
        initialTime: '',
        finalTime: '',
        calibrationPre: '',
        calibrationPost: '',
      });
    }

    // Update the specific field
    const intervalData = intervals.data[intervalIndex];
    console.log('Before update - intervalData:', intervalData);
    console.log('Updating field:', field, 'with value:', value);
    
    if (field === 'soundLevel' || field === 'percentile90') {
      // Validate numeric input
      const numericValue = value.trim() === '' ? 0 : parseFloat(value);
      intervalData[field] = isNaN(numericValue) ? 0 : numericValue;
    } else if (field === 'fileNumber') {
      // File number can be text/string, so store as string
      intervalData[field] = value;
    } else if (field === 'startTime') {
      console.log('Setting initialTime to:', value);
      intervalData.initialTime = value;
      console.log('After setting initialTime - intervalData.initialTime:', intervalData.initialTime);
    } else if (field === 'endTime') {
      console.log('Setting finalTime to:', value);
      intervalData.finalTime = value;
      console.log('After setting finalTime - intervalData.finalTime:', intervalData.finalTime);
    } else if (field === 'calibrationPre') {
      intervalData.calibrationPre = value;
    } else if (field === 'calibrationPost') {
      intervalData.calibrationPost = value;
    }
    
    console.log('After update - intervalData:', intervalData);

    // Clear temporary value after saving
    const tempKey = `${type}_${intervalIndex}_${field}`;
    setTempInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[tempKey];
      return newValues;
    });

    // Update context
    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission', emissionData);
    
    console.log('Emission data saved successfully:', { type, intervalIndex, field, value, emissionData });
    
    // Force re-render if time fields were updated to ensure TimePicker shows new values
    if (field === 'startTime' || field === 'endTime') {
      console.log('Forcing re-render for time field');
      
      // Clear any temporary values to force component refresh
      const timeKey = `${type}_${intervalIndex}_${field}`;
      setTempInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[timeKey];
        return newValues;
      });
      
      // Force component re-render
      setForceUpdate(prev => prev + 1);
      
      // Additional force update with small delay to ensure state has updated
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 100);
    }
    
    triggerAutoSave();
    
    // Return the updated emission data for chaining operations
    return emissionData;
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
      const currentData = [...emissionData.emission.data]; // Preserve existing data
      emissionData.emission.intervals = count;
      
      // Adjust data array length - preserve existing data when extending
      if (currentData.length < count) {
        // Add new empty intervals only for the missing slots
        while (currentData.length < count) {
          currentData.push({
            soundLevel: 0,
            percentile90: 0,
            fileNumber: '',
            initialTime: '',
            finalTime: '',
            calibrationPre: '',
            calibrationPost: '',
          });
        }
      }
      // When reducing count, only slice if necessary
      emissionData.emission.data = currentData.slice(0, count);
    } else {
      const currentData = [...emissionData.residual.data]; // Preserve existing data
      emissionData.residual.intervals = count;
      
      // Adjust data array length - preserve existing data when extending
      if (currentData.length < count) {
        // Add new empty intervals only for the missing slots
        while (currentData.length < count) {
          currentData.push({
            soundLevel: 0,
            percentile90: 0,
            fileNumber: '',
            initialTime: '',
            finalTime: '',
            calibrationPre: '',
            calibrationPost: '',
          });
        }
      }
      // When reducing count, only slice if necessary
      emissionData.residual.data = currentData.slice(0, count);
    }

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'emission', emissionData);
    triggerAutoSave();
  };

  const renderCompactSelectors = () => {
    console.log('Rendering compact selectors:', {
      measurementPointsLength: measurementPoints.length,
      selectedPoint,
      selectedSchedule,
      selectedMeasurementType,
      technicalInfo
    });

    if (measurementPoints.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay puntos de medición configurados</Text>
        </View>
      );
    }

    // Prepare point options
    const pointOptions = measurementPoints.map((point, index) => ({
      label: point.name || `Punto ${index + 1}`,
      value: index.toString(),
    }));
    console.log('Point options:', pointOptions);

    // Prepare schedule options
    const scheduleOptions = [];
    if (technicalInfo?.schedule?.diurnal) {
      scheduleOptions.push({ label: 'Diurno', value: 'diurnal' });
    }
    if (technicalInfo?.schedule?.nocturnal) {
      scheduleOptions.push({ label: 'Nocturno', value: 'nocturnal' });
    }
    console.log('Schedule options:', scheduleOptions);

    // Prepare measurement type options (only for emission measurements)
    const measurementTypeOptions = [];
    if (technicalInfo?.measurementType === 'emission') {
      measurementTypeOptions.push(
        { label: 'Emisión', value: 'emission' },
        { label: 'Residual', value: 'residual' }
      );
    }
    console.log('Measurement type options:', measurementTypeOptions);

    return (
      <View style={styles.compactSelectorsContainer}>
        {/* Dropdown row */}
        <View style={styles.dropdownRow}>
          {/* Point dropdown */}
          <View style={[styles.dropdownItem, styles.pointDropdownItem]}>
            <Text style={styles.dropdownLabel}>Punto</Text>
            <FormPicker
              label=""
              selectedValue={selectedPoint}
              onValueChange={(value) => {
                setSelectedPoint(value);
                resetIntervalSelections();
                resetAmbientDirection();
              }}
              options={pointOptions}
              placeholder="Seleccionar punto"
              style={styles.compactDropdown}
            />
          </View>

          {/* Schedule dropdown */}
          <View style={[styles.dropdownItem, styles.scheduleDropdownItem]}>
            <Text style={styles.dropdownLabel}>Horario</Text>
            <FormPicker
              label=""
              selectedValue={selectedSchedule}
              onValueChange={(value) => {
                setSelectedSchedule(value);
                resetIntervalSelections();
                resetAmbientDirection();
              }}
              options={scheduleOptions}
              placeholder="Seleccionar horario"
              style={styles.compactDropdown}
            />
          </View>

          {/* Measurement type dropdown (only for emission) */}
          {technicalInfo?.measurementType === 'emission' && (
            <View style={[styles.dropdownItem, styles.typeDropdownItem]}>
              <Text style={styles.dropdownLabel}>Tipo</Text>
              <FormPicker
                label=""
                selectedValue={selectedMeasurementType}
                onValueChange={(value) => {
                  setSelectedMeasurementType(value);
                  resetIntervalSelections();
                }}
                options={measurementTypeOptions}
                placeholder="Seleccionar tipo"
                style={styles.compactDropdown}
              />
            </View>
          )}
        </View>

        {/* Visual reference lines */}
        <View style={styles.referenceLines}>
          {/* Point color line */}
          {selectedPoint && (
            <View 
              style={[
                styles.referenceLine, 
                styles.pointReferenceLine,
                { 
                  backgroundColor: COLORS.pointColors[parseInt(selectedPoint) % COLORS.pointColors.length],
                }
              ]} 
            />
          )}
          
          {/* Schedule color line */}
          {selectedSchedule && (
            <View 
              style={[
                styles.referenceLine, 
                styles.scheduleReferenceLine,
                { 
                  backgroundColor: selectedSchedule === 'diurnal' ? COLORS.diurnal : COLORS.nocturnal,
                  marginLeft: selectedPoint ? 3 : 0
                }
              ]} 
            />
          )}

          {/* Measurement type color line */}
          {technicalInfo?.measurementType === 'emission' && selectedMeasurementType && (
            <View 
              style={[
                styles.referenceLine, 
                styles.typeReferenceLine,
                { 
                  backgroundColor: selectedMeasurementType === 'emission' ? COLORS.primary : COLORS.textSecondary,
                  marginLeft: (selectedPoint || selectedSchedule) ? 3 : 0
                }
              ]} 
            />
          )}
        </View>
      </View>
    );
  };

  const renderEmissionForm = () => {
    if (!selectedPoint || !selectedSchedule) return null;
    
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
            selectedValue={intervals.toString()}
            onValueChange={(value) => {
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
            selectedValue={intervals.toString()}
            onValueChange={(value) => {
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
          value={getTempInputValue(`ambient_${direction}_soundLevel`, measurement.soundLevel)}
          onChangeText={(text) => updateTempInputValue(`ambient_${direction}_soundLevel`, text)}
          onBlur={() => saveAmbientMeasurementData(direction, 'soundLevel', getTempInputValue(`ambient_${direction}_soundLevel`, measurement.soundLevel))}
          keyboardType="decimal-pad"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={getTempInputValue(`ambient_${direction}_fileNumber`, measurement.fileNumber)}
          onChangeText={(text) => updateTempInputValue(`ambient_${direction}_fileNumber`, text)}
          onBlur={() => saveAmbientMeasurementData(direction, 'fileNumber', getTempInputValue(`ambient_${direction}_fileNumber`, measurement.fileNumber))}
          keyboardType="numeric"
          placeholder="000"
          horizontal
        />
        
        <TimePicker
          label="Hora inicial"
          value={measurement.startTime}
          onTimeChange={(time) => {
            // Save start time and get updated ambient data
            const updatedAmbientData = saveAmbientMeasurementData(direction, 'startTime', time);
            
            // Auto-adjust end time (5 minutes for ambient measurements)
            const adjustedEndTime = adjustEndTime(time, 3); // Using 3 to get 5-minute adjustment
            if (adjustedEndTime && updatedAmbientData) {
              // Use the updated ambient data to preserve the startTime we just saved
              saveAmbientMeasurementData(direction, 'endTime', adjustedEndTime, updatedAmbientData);
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
          value={getTempInputValue(`ambient_${direction}_calibrationPre`, measurement.calibrationPre)}
          onChangeText={(text) => {
            const filtered = filterCalibrationInput(text);
            updateTempInputValue(`ambient_${direction}_calibrationPre`, filtered);
          }}
          onBlur={() => {
            const preValue = getTempInputValue(`ambient_${direction}_calibrationPre`, measurement.calibrationPre);
            const postValue = getTempInputValue(`ambient_${direction}_calibrationPost`, measurement.calibrationPost);
            saveAmbientMeasurementData(direction, 'calibrationPre', preValue);
            validateCalibrationDifference(`ambient_${direction}`, 0, preValue, postValue);
          }}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0.0"
          horizontal
          hideDoneButton
          error={validationErrors[`ambient_${direction}_0_calibration_validation`]}
        />

        <FormInput
          label="Cal POST (dB)"
          value={getTempInputValue(`ambient_${direction}_calibrationPost`, measurement.calibrationPost)}
          onChangeText={(text) => {
            const filtered = filterCalibrationInput(text);
            updateTempInputValue(`ambient_${direction}_calibrationPost`, filtered);
          }}
          onBlur={() => {
            const postValue = getTempInputValue(`ambient_${direction}_calibrationPost`, measurement.calibrationPost);
            const preValue = getTempInputValue(`ambient_${direction}_calibrationPre`, measurement.calibrationPre);
            saveAmbientMeasurementData(direction, 'calibrationPost', postValue);
            validateCalibrationDifference(`ambient_${direction}`, 0, preValue, postValue);
          }}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0.0"
          horizontal
          error={validationErrors[`ambient_${direction}_0_calibration_validation`]}
        />

        <CalibrationPhotoButton
          label="Foto Calibración PRE"
          photo={measurement.calibrationPrePhoto}
          onPhotoSelected={(photo) => saveAmbientCalibrationPhoto(direction, 'calibrationPre', photo)}
          onPhotoRemoved={() => removeAmbientCalibrationPhoto(direction, 'calibrationPre')}
        />

        <CalibrationPhotoButton
          label="Foto Calibración POST"
          photo={measurement.calibrationPostPhoto}
          onPhotoSelected={(photo) => saveAmbientCalibrationPhoto(direction, 'calibrationPost', photo)}
          onPhotoRemoved={() => removeAmbientCalibrationPhoto(direction, 'calibrationPost')}
        />
      </View>
    );
  };

  // Get ambient measurement data for current selection
  const getCurrentAmbientMeasurement = React.useCallback((direction: string) => {
    console.log('getCurrentAmbientMeasurement called:', { direction, selectedPoint, selectedSchedule, forceUpdate });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('getCurrentAmbientMeasurement: returning empty data');
      return {
        soundLevel: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
        calibrationPrePhoto: null,
        calibrationPostPhoto: null,
      };
    }

    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient');
    console.log('getMeasurementResult returned:', result);
    
    if (!result?.ambient) {
      console.log('No ambient data found, returning empty');
      return {
        soundLevel: '',
        fileNumber: '',
        startTime: '',
        endTime: '',
        calibrationPre: '',
        calibrationPost: '',
        calibrationPrePhoto: null,
        calibrationPostPhoto: null,
      };
    }

    const directionKey = `level${direction}` as keyof typeof result.ambient;
    const fileKey = `fileNumber${direction}` as keyof typeof result.ambient;
    const initialTimeKey = `initialTime${direction}` as keyof typeof result.ambient;
    const finalTimeKey = `finalTime${direction}` as keyof typeof result.ambient;
    const calibrationPreKey = `calibrationPre${direction}` as keyof typeof result.ambient;
    const calibrationPostKey = `calibrationPost${direction}` as keyof typeof result.ambient;
    
    const calibrationPrePhotoKey = `calibrationPre${direction}Photo` as keyof typeof result.ambient;
    const calibrationPostPhotoKey = `calibrationPost${direction}Photo` as keyof typeof result.ambient;

    const returnData = {
      soundLevel: result.ambient[directionKey] || '',
      fileNumber: result.ambient[fileKey] || '',
      startTime: result.ambient[initialTimeKey] || '',
      endTime: result.ambient[finalTimeKey] || '',
      calibrationPre: result.ambient[calibrationPreKey] || '',
      calibrationPost: result.ambient[calibrationPostKey] || '',
      calibrationPrePhoto: (result.ambient[calibrationPrePhotoKey] as CalibrationPhoto) || null,
      calibrationPostPhoto: (result.ambient[calibrationPostPhotoKey] as CalibrationPhoto) || null,
    };
    
    console.log('getCurrentAmbientMeasurement returning:', returnData);
    
    return returnData;
  }, [selectedPoint, selectedSchedule, currentFormat, forceUpdate]);

  // Reset interval selections when context changes
  const resetIntervalSelections = () => {
    setSelectedEmissionInterval(0);
    setSelectedResidualInterval(0);
    setSelectedAmbientInterval(0);
    // Clear any temporary input values to avoid conflicts
    setTempInputValues({});
  };

  // Reset direction selection for ambient measurements
  const resetAmbientDirection = () => {
    setSelectedAmbientDirection('N');
    // Clear any temporary input values to avoid conflicts
    setTempInputValues({});
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
        Alert.alert(
          'Error de Almacenamiento',
          'No se pudieron guardar los resultados de medición. Por favor, intente nuevamente.',
          [{ text: 'OK' }]
        );
      }
    }, 1000);
  };

  // Save calibration photo for ambient measurements
  const saveAmbientCalibrationPhoto = (direction: string, photoType: 'calibrationPre' | 'calibrationPost', photo: CalibrationPhoto) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient');
    let ambientData = result?.ambient || {
      levelN: '', fileNumberN: '', initialTimeN: '', finalTimeN: '', calibrationPreN: '', calibrationPostN: '',
      levelS: '', fileNumberS: '', initialTimeS: '', finalTimeS: '', calibrationPreS: '', calibrationPostS: '',
      levelE: '', fileNumberE: '', initialTimeE: '', finalTimeE: '', calibrationPreE: '', calibrationPostE: '',
      levelW: '', fileNumberW: '', initialTimeW: '', finalTimeW: '', calibrationPreW: '', calibrationPostW: '',
      levelV: '', fileNumberV: '', initialTimeV: '', finalTimeV: '', calibrationPreV: '', calibrationPostV: '',
      calibrationPreNPhoto: undefined, calibrationPostNPhoto: undefined,
      calibrationPreSPhoto: undefined, calibrationPostSPhoto: undefined,
      calibrationPreEPhoto: undefined, calibrationPostEPhoto: undefined,
      calibrationPreWPhoto: undefined, calibrationPostWPhoto: undefined,
      calibrationPreVPhoto: undefined, calibrationPostVPhoto: undefined,
    };

    const photoFieldName = `${photoType}${direction}Photo` as keyof typeof ambientData;
    (ambientData as any)[photoFieldName] = photo;

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient', ambientData);
    triggerAutoSave();
  };

  // Remove calibration photo for ambient measurements
  const removeAmbientCalibrationPhoto = (direction: string, photoType: 'calibrationPre' | 'calibrationPost') => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient');
    if (result?.ambient) {
      const photoFieldName = `${photoType}${direction}Photo` as keyof typeof result.ambient;
      (result.ambient as any)[photoFieldName] = undefined;

      updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient', result.ambient);
      triggerAutoSave();
    }
  };

  // Validate and save ambient measurement data (called onBlur)
  const saveAmbientMeasurementData = (direction: string, field: string, value: string, existingAmbientData?: any) => {
    console.log('saveAmbientMeasurementData called:', { direction, field, value, selectedPoint, selectedSchedule });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('Early return: missing selections');
      return;
    }
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) {
      console.log('Early return: missing pointId');
      return;
    }

    // Use existing ambient data if provided (for chaining operations) or get fresh data
    let ambientData;
    if (existingAmbientData) {
      ambientData = existingAmbientData;
      console.log('Using existing ambient data for chaining');
    } else {
      const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient');
      ambientData = result?.ambient || {
      levelN: '', fileNumberN: '', initialTimeN: '', finalTimeN: '', calibrationPreN: '', calibrationPostN: '',
      levelS: '', fileNumberS: '', initialTimeS: '', finalTimeS: '', calibrationPreS: '', calibrationPostS: '',
      levelE: '', fileNumberE: '', initialTimeE: '', finalTimeE: '', calibrationPreE: '', calibrationPostE: '',
      levelW: '', fileNumberW: '', initialTimeW: '', finalTimeW: '', calibrationPreW: '', calibrationPostW: '',
      levelV: '', fileNumberV: '', initialTimeV: '', finalTimeV: '', calibrationPreV: '', calibrationPostV: '',
      calibrationPreNPhoto: undefined, calibrationPostNPhoto: undefined,
      calibrationPreSPhoto: undefined, calibrationPostSPhoto: undefined,
      calibrationPreEPhoto: undefined, calibrationPostEPhoto: undefined,
      calibrationPreWPhoto: undefined, calibrationPostWPhoto: undefined,
      calibrationPreVPhoto: undefined, calibrationPostVPhoto: undefined,
      };
    }

    // Update the specific field
    if (field === 'soundLevel') {
      const directionKey = `level${direction}` as keyof typeof ambientData;
      (ambientData as any)[directionKey] = value;
    } else if (field === 'fileNumber') {
      const fileKey = `fileNumber${direction}` as keyof typeof ambientData;
      (ambientData as any)[fileKey] = value;
    } else if (field === 'startTime') {
      const initialTimeKey = `initialTime${direction}` as keyof typeof ambientData;
      (ambientData as any)[initialTimeKey] = value;
    } else if (field === 'endTime') {
      const finalTimeKey = `finalTime${direction}` as keyof typeof ambientData;
      (ambientData as any)[finalTimeKey] = value;
    } else if (field === 'calibrationPre') {
      const calibrationPreKey = `calibrationPre${direction}` as keyof typeof ambientData;
      (ambientData as any)[calibrationPreKey] = value;
    } else if (field === 'calibrationPost') {
      const calibrationPostKey = `calibrationPost${direction}` as keyof typeof ambientData;
      (ambientData as any)[calibrationPostKey] = value;
    }

    // Clear temporary value after saving
    const tempKey = `ambient_${direction}_${field}`;
    setTempInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[tempKey];
      return newValues;
    });

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'ambient', ambientData);
    
    console.log('Data saved successfully:', { field, value, ambientData });
    
    // Force re-render if time fields were updated to ensure TimePicker shows new values
    if (field === 'startTime' || field === 'endTime') {
      console.log('Forcing re-render for time field');
      setForceUpdate(prev => prev + 1);
    }
    
    triggerAutoSave();
    
    // Return the updated ambient data for chaining operations
    return ambientData;
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
          value={getTempInputValue('immission_soundLevelLeq', measurement.soundLevelLeq)}
          onChangeText={(text) => updateTempInputValue('immission_soundLevelLeq', text)}
          onBlur={() => saveImmissionMeasurementData('soundLevelLeq', getTempInputValue('immission_soundLevelLeq', measurement.soundLevelLeq))}
          keyboardType="decimal-pad"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="LAmin (dBA)"
          value={getTempInputValue('immission_soundLevelMin', measurement.soundLevelMin)}
          onChangeText={(text) => updateTempInputValue('immission_soundLevelMin', text)}
          onBlur={() => saveImmissionMeasurementData('soundLevelMin', getTempInputValue('immission_soundLevelMin', measurement.soundLevelMin))}
          keyboardType="decimal-pad"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="LAmax (dBA)"
          value={getTempInputValue('immission_soundLevelMax', measurement.soundLevelMax)}
          onChangeText={(text) => updateTempInputValue('immission_soundLevelMax', text)}
          onBlur={() => saveImmissionMeasurementData('soundLevelMax', getTempInputValue('immission_soundLevelMax', measurement.soundLevelMax))}
          keyboardType="decimal-pad"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={getTempInputValue('immission_fileNumber', measurement.fileNumber)}
          onChangeText={(text) => updateTempInputValue('immission_fileNumber', text)}
          onBlur={() => saveImmissionMeasurementData('fileNumber', getTempInputValue('immission_fileNumber', measurement.fileNumber))}
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
          value={getTempInputValue('immission_calibrationPre', measurement.calibrationPre)}
          onChangeText={(text) => {
            const filtered = filterCalibrationInput(text);
            updateTempInputValue('immission_calibrationPre', filtered);
          }}
          onBlur={() => {
            const preValue = getTempInputValue('immission_calibrationPre', measurement.calibrationPre);
            const postValue = getTempInputValue('immission_calibrationPost', measurement.calibrationPost);
            saveImmissionMeasurementData('calibrationPre', preValue);
            validateCalibrationDifference('immission', 0, preValue, postValue);
          }}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0.0"
          horizontal
          hideDoneButton
          error={validationErrors['immission_0_calibration_validation']}
        />

        <FormInput
          label="Cal POST (dB)"
          value={getTempInputValue('immission_calibrationPost', measurement.calibrationPost)}
          onChangeText={(text) => {
            const filtered = filterCalibrationInput(text);
            updateTempInputValue('immission_calibrationPost', filtered);
          }}
          onBlur={() => {
            const postValue = getTempInputValue('immission_calibrationPost', measurement.calibrationPost);
            const preValue = getTempInputValue('immission_calibrationPre', measurement.calibrationPre);
            saveImmissionMeasurementData('calibrationPost', postValue);
            validateCalibrationDifference('immission', 0, preValue, postValue);
          }}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0.0"
          horizontal
          error={validationErrors['immission_0_calibration_validation']}
        />

        <CalibrationPhotoButton
          label="Foto Calibración PRE"
          photo={measurement.calibrationPrePhoto}
          onPhotoSelected={(photo) => saveImmissionCalibrationPhoto('calibrationPre', photo)}
          onPhotoRemoved={() => removeImmissionCalibrationPhoto('calibrationPre')}
        />

        <CalibrationPhotoButton
          label="Foto Calibración POST"
          photo={measurement.calibrationPostPhoto}
          onPhotoSelected={(photo) => saveImmissionCalibrationPhoto('calibrationPost', photo)}
          onPhotoRemoved={() => removeImmissionCalibrationPhoto('calibrationPost')}
        />
      </View>
    );
  };

  // Get immission measurement data for current selection
  const getCurrentImmissionMeasurement = React.useCallback(() => {
    console.log('getCurrentImmissionMeasurement called:', { selectedPoint, selectedSchedule, forceUpdate });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('getCurrentImmissionMeasurement: returning empty data');
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
      fileNumber: result.immission.fileNumber || '',
      startTime: result.immission.initialTime || '',
      endTime: result.immission.finalTime || '',
      calibrationPre: result.immission.calibrationPre || '',
      calibrationPost: result.immission.calibrationPost || '',
      calibrationPrePhoto: result.immission.calibrationPrePhoto || null,
      calibrationPostPhoto: result.immission.calibrationPostPhoto || null,
    };
  }, [selectedPoint, selectedSchedule, currentFormat, forceUpdate]);

  // Save calibration photo for immission measurements
  const saveImmissionCalibrationPhoto = (photoType: 'calibrationPre' | 'calibrationPost', photo: CalibrationPhoto) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission');
    let immissionData = result?.immission || {
      levelLeq: '', levelLmax: '', levelLmin: '', fileNumber: '',
      initialTime: '', finalTime: '', calibrationPre: '', calibrationPost: '',
    };

    const photoFieldName = `${photoType}Photo` as keyof typeof immissionData;
    (immissionData as any)[photoFieldName] = photo;

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission', immissionData);
    triggerAutoSave();
  };

  // Remove calibration photo for immission measurements
  const removeImmissionCalibrationPhoto = (photoType: 'calibrationPre' | 'calibrationPost') => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission');
    if (result?.immission) {
      const photoFieldName = `${photoType}Photo` as keyof typeof result.immission;
      (result.immission as any)[photoFieldName] = undefined;

      updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission', result.immission);
      triggerAutoSave();
    }
  };

  // Validate and save immission measurement data (called onBlur)
  const saveImmissionMeasurementData = (field: string, value: string) => {
    console.log('saveImmissionMeasurementData called:', { field, value, selectedPoint, selectedSchedule });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('Early return: missing selections');
      return;
    }
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) {
      console.log('Early return: missing pointId');
      return;
    }

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission');
    
    let immissionData = result?.immission || {
      levelLeq: '',
      levelLmax: '',
      levelLmin: '',
      fileNumber: '',
      initialTime: '',
      finalTime: '',
      calibrationPre: '',
      calibrationPost: '',
    };

    // Update the specific field
    if (field === 'soundLevelLeq') {
      immissionData.levelLeq = value;
    } else if (field === 'soundLevelMin') {
      immissionData.levelLmin = value;
    } else if (field === 'soundLevelMax') {
      immissionData.levelLmax = value;
    } else if (field === 'fileNumber') {
      immissionData.fileNumber = value;
    } else if (field === 'startTime') {
      immissionData.initialTime = value;
    } else if (field === 'endTime') {
      immissionData.finalTime = value;
    } else if (field === 'calibrationPre') {
      immissionData.calibrationPre = value;
    } else if (field === 'calibrationPost') {
      immissionData.calibrationPost = value;
    }

    // Clear temporary value after saving
    const tempKey = `immission_${field}`;
    setTempInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[tempKey];
      return newValues;
    });

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'immission', immissionData);
    
    console.log('Immission data saved successfully:', { field, value, immissionData });
    
    // Force re-render if time fields were updated to ensure TimePicker shows new values
    if (field === 'startTime' || field === 'endTime') {
      console.log('Forcing re-render for time field');
      setForceUpdate(prev => prev + 1);
    }
    
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
          value={getTempInputValue('sonometry_soundLevelLeq', measurement.soundLevelLeq)}
          onChangeText={(text) => updateTempInputValue('sonometry_soundLevelLeq', text)}
          onBlur={() => saveSonometryMeasurementData('soundLevelLeq', getTempInputValue('sonometry_soundLevelLeq', measurement.soundLevelLeq))}
          keyboardType="decimal-pad"
          placeholder="0.0"
          horizontal
        />
        
        <FormInput
          label="# archivo"
          value={getTempInputValue('sonometry_fileNumber', measurement.fileNumber)}
          onChangeText={(text) => updateTempInputValue('sonometry_fileNumber', text)}
          onBlur={() => saveSonometryMeasurementData('fileNumber', getTempInputValue('sonometry_fileNumber', measurement.fileNumber))}
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
          value={getTempInputValue('sonometry_calibrationPre', measurement.calibrationPre)}
          onChangeText={(text) => {
            const filtered = filterCalibrationInput(text);
            updateTempInputValue('sonometry_calibrationPre', filtered);
          }}
          onBlur={() => {
            const preValue = getTempInputValue('sonometry_calibrationPre', measurement.calibrationPre);
            const postValue = getTempInputValue('sonometry_calibrationPost', measurement.calibrationPost);
            saveSonometryMeasurementData('calibrationPre', preValue);
            validateCalibrationDifference('sonometry', 0, preValue, postValue);
          }}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0.0"
          horizontal
          hideDoneButton
          error={validationErrors['sonometry_0_calibration_validation']}
        />

        <FormInput
          label="Cal POST (dB)"
          value={getTempInputValue('sonometry_calibrationPost', measurement.calibrationPost)}
          onChangeText={(text) => {
            const filtered = filterCalibrationInput(text);
            updateTempInputValue('sonometry_calibrationPost', filtered);
          }}
          onBlur={() => {
            const postValue = getTempInputValue('sonometry_calibrationPost', measurement.calibrationPost);
            const preValue = getTempInputValue('sonometry_calibrationPre', measurement.calibrationPre);
            saveSonometryMeasurementData('calibrationPost', postValue);
            validateCalibrationDifference('sonometry', 0, preValue, postValue);
          }}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="0.0"
          horizontal
          error={validationErrors['sonometry_0_calibration_validation']}
        />

        <CalibrationPhotoButton
          label="Foto Calibración PRE"
          photo={measurement.calibrationPrePhoto}
          onPhotoSelected={(photo) => saveSonometryCalibrationPhoto('calibrationPre', photo)}
          onPhotoRemoved={() => removeSonometryCalibrationPhoto('calibrationPre')}
        />

        <CalibrationPhotoButton
          label="Foto Calibración POST"
          photo={measurement.calibrationPostPhoto}
          onPhotoSelected={(photo) => saveSonometryCalibrationPhoto('calibrationPost', photo)}
          onPhotoRemoved={() => removeSonometryCalibrationPhoto('calibrationPost')}
        />
      </View>
    );
  };

  // Get sonometry measurement data for current selection
  const getCurrentSonometryMeasurement = React.useCallback(() => {
    console.log('getCurrentSonometryMeasurement called:', { selectedPoint, selectedSchedule, forceUpdate });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('getCurrentSonometryMeasurement: returning empty data');
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
      fileNumber: result.sonometry.fileNumber || '',
      startTime: result.sonometry.initialTime || '',
      endTime: result.sonometry.finalTime || '',
      calibrationPre: result.sonometry.calibrationPre || '',
      calibrationPost: result.sonometry.calibrationPost || '',
      calibrationPrePhoto: result.sonometry.calibrationPrePhoto || null,
      calibrationPostPhoto: result.sonometry.calibrationPostPhoto || null,
    };
  }, [selectedPoint, selectedSchedule, currentFormat, forceUpdate]);

  // Save calibration photo for sonometry measurements
  const saveSonometryCalibrationPhoto = (photoType: 'calibrationPre' | 'calibrationPost', photo: CalibrationPhoto) => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry');
    let sonometryData = result?.sonometry || {
      levelLeq: '', levelLmax: '', levelLmin: '', fileNumber: '',
      initialTime: '', finalTime: '', calibrationPre: '', calibrationPost: '',
    };

    const photoFieldName = `${photoType}Photo` as keyof typeof sonometryData;
    (sonometryData as any)[photoFieldName] = photo;

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry', sonometryData);
    triggerAutoSave();
  };

  // Remove calibration photo for sonometry measurements
  const removeSonometryCalibrationPhoto = (photoType: 'calibrationPre' | 'calibrationPost') => {
    if (!selectedPoint || !selectedSchedule || !currentFormat) return;
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) return;

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry');
    if (result?.sonometry) {
      const photoFieldName = `${photoType}Photo` as keyof typeof result.sonometry;
      (result.sonometry as any)[photoFieldName] = undefined;

      updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry', result.sonometry);
      triggerAutoSave();
    }
  };

  // Validate and save sonometry measurement data (called onBlur)
  const saveSonometryMeasurementData = (field: string, value: string) => {
    console.log('saveSonometryMeasurementData called:', { field, value, selectedPoint, selectedSchedule });
    if (!selectedPoint || !selectedSchedule || !currentFormat) {
      console.log('Early return: missing selections');
      return;
    }
    
    const pointId = currentFormat.measurementPoints[parseInt(selectedPoint)]?.id;
    if (!pointId) {
      console.log('Early return: missing pointId');
      return;
    }

    const result = getMeasurementResult(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry');
    
    let sonometryData = result?.sonometry || {
      levelLeq: '',
      levelLmax: '',
      levelLmin: '',
      fileNumber: '',
      initialTime: '',
      finalTime: '',
      calibrationPre: '',
      calibrationPost: '',
    };

    // Update the specific field
    if (field === 'soundLevelLeq') {
      sonometryData.levelLeq = value;
    } else if (field === 'fileNumber') {
      sonometryData.fileNumber = value;
    } else if (field === 'startTime') {
      sonometryData.initialTime = value;
    } else if (field === 'endTime') {
      sonometryData.finalTime = value;
    } else if (field === 'calibrationPre') {
      sonometryData.calibrationPre = value;
    } else if (field === 'calibrationPost') {
      sonometryData.calibrationPost = value;
    }

    // Clear temporary value after saving
    const tempKey = `sonometry_${field}`;
    setTempInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[tempKey];
      return newValues;
    });

    updateMeasurementResultData(pointId, selectedSchedule as 'diurnal' | 'nocturnal', 'sonometry', sonometryData);
    
    console.log('Sonometry data saved successfully:', { field, value, sonometryData });
    
    // Force re-render if time fields were updated to ensure TimePicker shows new values
    if (field === 'startTime' || field === 'endTime') {
      console.log('Forcing re-render for time field');
      setForceUpdate(prev => prev + 1);
    }
    
    triggerAutoSave();
  };

    const renderCurrentIntervalFields = (prefix: string, intervalIndex: number) => {
      const measurement = getCurrentMeasurement(prefix, intervalIndex);
      
      return (
        <View style={styles.currentIntervalContainer}>
          <Text style={styles.currentIntervalTitle}>Intervalo {intervalIndex + 1}</Text>
          
          <FormInput
            label="LAeq (dBA)"
            value={getTempInputValue(`${prefix}_${intervalIndex}_soundLevel`, measurement.soundLevel)}
            onChangeText={(text) => updateTempInputValue(`${prefix}_${intervalIndex}_soundLevel`, text)}
            onBlur={() => {
              const laeqValue = getTempInputValue(`${prefix}_${intervalIndex}_soundLevel`, measurement.soundLevel);
              const l90Value = getTempInputValue(`${prefix}_${intervalIndex}_percentile90`, measurement.percentile90);
              saveMeasurementData(prefix, intervalIndex, 'soundLevel', laeqValue);
              validateL90VsLAeq(prefix, intervalIndex, laeqValue, l90Value);
            }}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            placeholder="0.0"
            horizontal
          />

          <FormInput
            label="L90 (dBA)"
            value={getTempInputValue(`${prefix}_${intervalIndex}_percentile90`, measurement.percentile90)}
            onChangeText={(text) => updateTempInputValue(`${prefix}_${intervalIndex}_percentile90`, text)}
            onBlur={() => {
              const l90Value = getTempInputValue(`${prefix}_${intervalIndex}_percentile90`, measurement.percentile90);
              const laeqValue = getTempInputValue(`${prefix}_${intervalIndex}_soundLevel`, measurement.soundLevel);
              saveMeasurementData(prefix, intervalIndex, 'percentile90', l90Value);
              validateL90VsLAeq(prefix, intervalIndex, laeqValue, l90Value);
            }}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            placeholder="0.0"
            horizontal
            error={validationErrors[`${prefix}_${intervalIndex}_l90_validation`]}
          />
          
          <FormInput
            label="# archivo"
            value={getTempInputValue(`${prefix}_${intervalIndex}_fileNumber`, measurement.fileNumber)}
            onChangeText={(text) => updateTempInputValue(`${prefix}_${intervalIndex}_fileNumber`, text)}
            onBlur={() => saveMeasurementData(prefix, intervalIndex, 'fileNumber', getTempInputValue(`${prefix}_${intervalIndex}_fileNumber`, measurement.fileNumber))}
            keyboardType="numeric"
            placeholder="000"
            horizontal
          />
          
          <TimePicker
            label="Hora inicial"
            value={measurement.startTime}
            onTimeChange={(time) => {
              console.log('TimePicker startTime onTimeChange called:', { prefix, intervalIndex, time });
              
              // Save start time and get updated emission data
              const updatedEmissionData = saveMeasurementData(prefix, intervalIndex, 'startTime', time);
              
              // Auto-adjust end time based on intervals using the updated data
              const intervals = getIntervalsCount(prefix);
              console.log('Intervals count for auto-adjust:', intervals);
              if (intervals === 1 || intervals === 3) {
                const adjustedEndTime = adjustEndTime(time, intervals);
                console.log('Adjusted end time:', adjustedEndTime);
                if (adjustedEndTime && updatedEmissionData) {
                  // Use the updated emission data to preserve the startTime we just saved
                  saveMeasurementData(prefix, intervalIndex, 'endTime', adjustedEndTime, updatedEmissionData);
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
            value={getTempInputValue(`${prefix}_${intervalIndex}_calibrationPre`, measurement.calibrationPre)}
            onChangeText={(text) => {
              const filtered = filterCalibrationInput(text);
              updateTempInputValue(`${prefix}_${intervalIndex}_calibrationPre`, filtered);
            }}
            onBlur={() => {
              const preValue = getTempInputValue(`${prefix}_${intervalIndex}_calibrationPre`, measurement.calibrationPre);
              const postValue = getTempInputValue(`${prefix}_${intervalIndex}_calibrationPost`, measurement.calibrationPost);
              saveMeasurementData(prefix, intervalIndex, 'calibrationPre', preValue);
              validateCalibrationDifference(prefix, intervalIndex, preValue, postValue);
            }}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            placeholder="0.0"
            horizontal
            hideDoneButton
            error={validationErrors[`${prefix}_${intervalIndex}_calibration_validation`]}
          />

          <FormInput
            label="Cal POST (dB)"
            value={getTempInputValue(`${prefix}_${intervalIndex}_calibrationPost`, measurement.calibrationPost)}
            onChangeText={(text) => {
              const filtered = filterCalibrationInput(text);
              updateTempInputValue(`${prefix}_${intervalIndex}_calibrationPost`, filtered);
            }}
            onBlur={() => {
              const postValue = getTempInputValue(`${prefix}_${intervalIndex}_calibrationPost`, measurement.calibrationPost);
              const preValue = getTempInputValue(`${prefix}_${intervalIndex}_calibrationPre`, measurement.calibrationPre);
              saveMeasurementData(prefix, intervalIndex, 'calibrationPost', postValue);
              validateCalibrationDifference(prefix, intervalIndex, preValue, postValue);
            }}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            placeholder="0.0"
            horizontal
            error={validationErrors[`${prefix}_${intervalIndex}_calibration_validation`]}
          />

          <CalibrationPhotoButton
            label="Foto Calibración PRE"
            photo={measurement.calibrationPrePhoto}
            onPhotoSelected={(photo) => saveCalibrationPhoto(prefix, intervalIndex, 'calibrationPre', photo)}
            onPhotoRemoved={() => removeCalibrationPhoto(prefix, intervalIndex, 'calibrationPre')}
          />

          <CalibrationPhotoButton
            label="Foto Calibración POST"
            photo={measurement.calibrationPostPhoto}
            onPhotoSelected={(photo) => saveCalibrationPhoto(prefix, intervalIndex, 'calibrationPost', photo)}
            onPhotoRemoved={() => removeCalibrationPhoto(prefix, intervalIndex, 'calibrationPost')}
          />
        </View>
      );
    };



  return (
    <KeyboardAvoidingView 
      style={styles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        <Text style={styles.title}>Resultados de Medición</Text>

        <View style={styles.selectionSection}>
          {renderCompactSelectors()}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollableContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
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
    </KeyboardAvoidingView>
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
    paddingBottom: 4,
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
    borderRadius: 6,
    padding: 0,
    marginTop: 0,
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
  // New compact selector styles
  compactSelectorsContainer: {
    padding: 4,
    marginBottom: 0,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 0,
  },
  dropdownItem: {
    flex: 1,
    minWidth: 0, // Allow flex items to shrink
  },
  pointDropdownItem: {
    flex: 1.3, // 30% más ancho que los otros
  },
  scheduleDropdownItem: {
    flex: 0.85, // Proporcionalmente reducido
  },
  typeDropdownItem: {
    flex: 0.85, // Proporcionalmente reducido
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 0,
    textAlign: 'center',
  },
  compactDropdown: {
    minHeight: 20,
  },
  referenceLines: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  referenceLine: {
    height: 8,
    borderRadius: 4,
  },
  pointReferenceLine: {
    flex: 1.3, // Misma proporción que pointDropdownItem
  },
  scheduleReferenceLine: {
    flex: 0.85, // Misma proporción que scheduleDropdownItem
  },
  typeReferenceLine: {
    flex: 0.85, // Misma proporción que typeDropdownItem
  },
});

export default MeasurementResultsScreen;