import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppAction, MeasurementFormat, GeneralInfo, MeasurementPoint, WeatherConditions, TechnicalInfo, InspectionData, MeasurementResults, QualitativeData, ExternalEvent, Photo, MeasurementType } from '../types';
import { STORAGE_KEYS } from '../constants';
import { normalizeWeatherConditionsForExport } from '../utils/numberUtils';

// Deep comparison utility function
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return obj1 === obj2;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object') return obj1 === obj2;

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

// Function to create a deep copy for comparison purposes
const createDeepCopy = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(createDeepCopy);

  const copy: any = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = createDeepCopy(obj[key]);
    }
  }
  return copy;
};

// Function to normalize format for comparison (excluding timestamps)
const normalizeFormatForComparison = (format: MeasurementFormat): Omit<MeasurementFormat, 'updatedAt' | 'createdAt'> => {
  const { updatedAt, createdAt, ...rest } = format;
  return rest;
};

const initialState: AppState = {
  currentFormat: null,
  savedFormats: [],
  isLoading: false,
  error: null,
  selectedPointForNavigation: null,
  selectedScheduleForNavigation: null,
};

// Store clean copy for comparison
let cleanFormatCopy: MeasurementFormat | null = null;

// Function to check if format has actually changed
const hasFormatChanged = (currentFormat: MeasurementFormat | null): boolean => {
  if (!currentFormat || !cleanFormatCopy) return true;

  const currentNormalized = normalizeFormatForComparison(currentFormat);
  const cleanNormalized = normalizeFormatForComparison(cleanFormatCopy);

  return !deepEqual(currentNormalized, cleanNormalized);
};

// Helper function to conditionally update timestamp only if changes exist
const updateWithTimestamp = (format: MeasurementFormat, newData: any): MeasurementFormat => {
  const updatedFormat = { ...format, ...newData };

  // Check if there are actual changes by comparing with clean copy
  if (cleanFormatCopy) {
    const currentNormalized = normalizeFormatForComparison(updatedFormat);
    const cleanNormalized = normalizeFormatForComparison(cleanFormatCopy);

    if (!deepEqual(currentNormalized, cleanNormalized)) {
      return {
        ...updatedFormat,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return updatedFormat;
};

const createEmptyFormat = (): MeasurementFormat => ({
  id: Date.now().toString(),
  generalInfo: {
    company: '',
    date: new Date().toISOString().split('T')[0],
    workOrder: {
      type: 'RUI',
      number: '',
      year: new Date().getFullYear().toString().slice(-2),
    },
    supervisor: '',
  },
  measurementPoints: [],
  weatherConditions: {
    diurnal: {
      windSpeed: { initial: 0, final: 0 },
      windDirection: { initial: '', final: '' },
      temperature: { initial: 0, final: 0 },
      humidity: { initial: 0, final: 0 },
      atmosphericPressure: { initial: 0, final: 0 },
      precipitation: { initial: 0, final: 0 },
    },
    nocturnal: {
      windSpeed: { initial: 0, final: 0 },
      windDirection: { initial: '', final: '' },
      temperature: { initial: 0, final: 0 },
      humidity: { initial: 0, final: 0 },
      atmosphericPressure: { initial: 0, final: 0 },
      precipitation: { initial: 0, final: 0 },
    },
  },
  technicalInfo: {
    measurementType: 'emission',
    schedule: {
      diurnal: false,
      nocturnal: false,
    },
    soundMeter: {
      selected: '',
      other: '',
    },
    calibrator: {
      selected: '',
      other: '',
    },
    weatherStation: {
      selected: '',
      other: '',
    },
    scanningMethod: '',
  },
  inspection: {
    pointAssignment: false,
    calibrationVerification: false,
    parametersVerification: false,
    batteryStatus: false,
    timeSynchronization: false,
    weatherStationTests: false,
    weatherConditionsRecord: false,
  },
  measurementResults: [],
  qualitativeData: {
    conditionsDescription: 'La empresa se dedica a ',
    noiseSourceInfo: 'Se ubica el sonómetro a ',
  },
  externalEvents: [],
  photos: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const measurementReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_FORMAT':
      return {
        ...state,
        currentFormat: action.payload,
      };
    
    case 'UPDATE_GENERAL_INFO':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          generalInfo: action.payload,
        }),
      };

    case 'ADD_MEASUREMENT_POINT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          measurementPoints: [...state.currentFormat.measurementPoints, action.payload],
        }),
      };

    case 'UPDATE_MEASUREMENT_POINT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          measurementPoints: state.currentFormat.measurementPoints.map(point =>
            point.id === action.payload.id ? { ...point, ...action.payload.point } : point
          ),
        }),
      };

    case 'DELETE_MEASUREMENT_POINT':
      if (!state.currentFormat) return state;
      const deletedPointId = action.payload;
      
      // Count items that will be deleted for logging
      const measurementResultsToDelete = state.currentFormat.measurementResults?.filter(
        result => result.pointId === deletedPointId
      ) || [];
      const photosToDelete = state.currentFormat.photos?.filter(
        photo => photo.pointId === deletedPointId
      ) || [];
      
      console.log(`Deleting point ${deletedPointId} and cleaning up:`, {
        measurementResults: measurementResultsToDelete.length,
        photos: photosToDelete.length
      });
      
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          measurementPoints: state.currentFormat.measurementPoints.filter(
            point => point.id !== deletedPointId
          ),
          // Clean up measurement results for the deleted point
          measurementResults: state.currentFormat.measurementResults?.filter(
            result => result.pointId !== deletedPointId
          ) || [],
          // Clean up photos for the deleted point
          photos: state.currentFormat.photos?.filter(
            photo => photo.pointId !== deletedPointId
          ) || [],
        }),
      };

    case 'UPDATE_WEATHER_CONDITIONS':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          weatherConditions: action.payload,
        }),
      };

    case 'UPDATE_TECHNICAL_INFO':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          technicalInfo: action.payload,
        }),
      };

    case 'UPDATE_INSPECTION_DATA':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          inspection: action.payload,
        }),
      };

    case 'ADD_MEASUREMENT_RESULT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          measurementResults: [...state.currentFormat.measurementResults, action.payload],
        }),
      };

    case 'UPDATE_MEASUREMENT_RESULT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          measurementResults: state.currentFormat.measurementResults.map((result, index) =>
            index === action.payload.index ? action.payload.result : result
          ),
        }),
      };

    case 'UPDATE_MEASUREMENT_RESULT_DATA':
      if (!state.currentFormat) return state;
      const { pointId, schedule, type, data } = action.payload;
      const existingResultIndex = state.currentFormat.measurementResults.findIndex(
        result => result.pointId === pointId && result.schedule === schedule && result.type === type
      );
      
      if (existingResultIndex !== -1) {
        // Update existing result
        return {
          ...state,
          currentFormat: updateWithTimestamp(state.currentFormat, {
            measurementResults: state.currentFormat.measurementResults.map((result, index) =>
              index === existingResultIndex ? { ...result, [type]: data } : result
            ),
          }),
        };
      } else {
        // Create new result
        const newResult: MeasurementResults = {
          pointId,
          schedule,
          type,
          [type]: data,
        };
        return {
          ...state,
          currentFormat: updateWithTimestamp(state.currentFormat, {
            measurementResults: [...state.currentFormat.measurementResults, newResult],
          }),
        };
      }

    case 'UPDATE_QUALITATIVE_DATA':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          qualitativeData: action.payload,
        }),
      };

    case 'ADD_EXTERNAL_EVENT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          externalEvents: [...state.currentFormat.externalEvents, action.payload],
        }),
      };

    case 'DELETE_EXTERNAL_EVENT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          externalEvents: state.currentFormat.externalEvents.filter(
            event => event.id !== action.payload
          ),
        }),
      };

    case 'ADD_PHOTO':
      if (!state.currentFormat) return state;
      const newState = {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          photos: [...state.currentFormat.photos, action.payload],
        }),
      };
      console.log('Photo added to context, total photos:', newState.currentFormat.photos.length);
      console.log('Photo IDs in format:', newState.currentFormat.photos.map(p => p.id));
      // Update cleanFormatCopy immediately in reducer
      if (cleanFormatCopy) {
        cleanFormatCopy = createDeepCopy(newState.currentFormat);
        console.log('CleanFormatCopy updated in ADD_PHOTO reducer');
      }
      return newState;

    case 'UPDATE_PHOTO':
      if (!state.currentFormat) return state;
      const updatedState = {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          photos: state.currentFormat.photos.map(photo =>
            photo.id === action.payload.id
              ? { ...photo, ...action.payload.photo }
              : photo
          ),
        }),
      };
      console.log('Photo updated in context:', action.payload.id);
      // Update cleanFormatCopy immediately in reducer
      if (cleanFormatCopy) {
        cleanFormatCopy = createDeepCopy(updatedState.currentFormat);
        console.log('CleanFormatCopy updated in UPDATE_PHOTO reducer');
      }
      return updatedState;

    case 'DELETE_PHOTO':
      if (!state.currentFormat) return state;
      const deletedState = {
        ...state,
        currentFormat: updateWithTimestamp(state.currentFormat, {
          photos: state.currentFormat.photos.filter(
            photo => photo.id !== action.payload
          ),
        }),
      };
      console.log('Photo deleted from context:', action.payload);
      console.log('Remaining photos:', deletedState.currentFormat.photos.length);
      console.log('Remaining photo IDs:', deletedState.currentFormat.photos.map(p => p.id));
      // Update cleanFormatCopy immediately in reducer
      if (cleanFormatCopy) {
        cleanFormatCopy = createDeepCopy(deletedState.currentFormat);
        console.log('CleanFormatCopy updated in DELETE_PHOTO reducer');
      }
      return deletedState;

    case 'LOAD_SAVED_FORMATS':
      return {
        ...state,
        savedFormats: action.payload,
      };

    case 'SAVE_FORMAT':
      const existingIndex = state.savedFormats.findIndex(f => f.id === action.payload.id);
      let updatedFormats;
      
      if (existingIndex !== -1) {
        updatedFormats = [...state.savedFormats];
        updatedFormats[existingIndex] = action.payload;
      } else {
        updatedFormats = [...state.savedFormats, action.payload];
      }

      return {
        ...state,
        savedFormats: updatedFormats,
      };

    case 'DELETE_FORMAT':
      return {
        ...state,
        savedFormats: state.savedFormats.filter(format => format.id !== action.payload),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_CURRENT_FORMAT':
      return {
        ...state,
        currentFormat: null,
      };

    case 'SET_NAVIGATION_SELECTION':
      return {
        ...state,
        selectedPointForNavigation: action.payload.pointId,
        selectedScheduleForNavigation: action.payload.schedule,
      };

    default:
      return state;
  }
};

interface MeasurementContextType {
  state: AppState;
  createNewFormat: () => void;
  loadFormat: (format: MeasurementFormat) => void;
  updateGeneralInfo: (info: GeneralInfo) => void;
  addMeasurementPoint: (point: MeasurementPoint) => Promise<boolean>;
  updateMeasurementPoint: (id: string, point: MeasurementPoint) => void;
  deleteMeasurementPoint: (id: string) => void;
  updateWeatherConditions: (conditions: WeatherConditions) => void;
  updateTechnicalInfo: (info: TechnicalInfo) => void;
  updateInspectionData: (data: InspectionData) => void;
  addMeasurementResult: (result: MeasurementResults) => void;
  updateMeasurementResult: (index: number, result: MeasurementResults) => void;
  updateMeasurementResultData: (pointId: string, schedule: 'diurnal' | 'nocturnal', type: MeasurementType, data: any) => void;
  updateQualitativeData: (data: QualitativeData) => void;
  addExternalEvent: (event: ExternalEvent) => void;
  deleteExternalEvent: (id: string) => void;
  addPhoto: (photo: Photo) => Promise<boolean>;
  updatePhoto: (id: string, updates: Partial<Photo>) => Promise<boolean>;
  deletePhoto: (id: string) => Promise<boolean>;
  saveCurrentFormat: (formatOverride?: MeasurementFormat) => Promise<void>;
  loadSavedFormats: () => Promise<void>;
  deleteFormat: (id: string) => Promise<void>;
  exportFormat: (format: MeasurementFormat) => Promise<string>;
  clearCurrentFormat: () => void;
  setNavigationSelection: (pointId: string, schedule: ScheduleType) => void;
}

const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

export const MeasurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(measurementReducer, initialState);

  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    try {
      console.log('Loading saved formats...');
      await loadSavedFormats();
    } catch (error) {
      console.error('Error initializing storage:', error);
      // Fallback to loading saved formats anyway
      await loadSavedFormats();
    }
  };

  // Removemos el guardado automático para mejorar rendimiento
  // El guardado ahora será manual cuando sea necesario

  // Debounced save para evitar guardado excesivo
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedsave = async (showErrorAlert = false) => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    debouncedSaveRef.current = setTimeout(async () => {
      if (state.currentFormat) {
        try {
          await saveCurrentFormat();
          console.log('Debounced save completed successfully');
        } catch (error) {
          console.error('Error in debounced save:', error);
          if (showErrorAlert) {
            // Dispatch error for UI handling
            dispatch({ type: 'SET_ERROR', payload: 'Error al guardar los cambios. La información podría perderse al cerrar la app.' });
          }
        }
      }
    }, 1000); // Esperar 1 segundo antes de guardar
  };

  const createNewFormat = () => {
    const newFormat = createEmptyFormat();
    dispatch({ type: 'SET_CURRENT_FORMAT', payload: newFormat });
    // Store clean copy for change detection
    cleanFormatCopy = createDeepCopy(newFormat);
    console.log('Clean copy stored for new format:', newFormat.id);
  };

  const loadFormat = (format: MeasurementFormat) => {
    console.log('🔄 Loading format:', format.id);
    console.log('📷 Format photos count:', format.photos?.length || 0);
    console.log('📷 Format photo IDs:', format.photos?.map(p => p.id) || []);
    console.log('📷 Photo types:', format.photos?.map(p => `${p.id}:${p.type}`) || []);

    dispatch({ type: 'SET_CURRENT_FORMAT', payload: format });

    // Store clean copy for change detection
    cleanFormatCopy = createDeepCopy(format);
    console.log('💾 Clean copy stored for format:', format.id, 'with', cleanFormatCopy?.photos?.length || 0, 'photos');
    console.log('✅ Format loaded successfully in context');
  };

  const updateGeneralInfo = (info: GeneralInfo) => {
    dispatch({ type: 'UPDATE_GENERAL_INFO', payload: info });
  };

  const addMeasurementPoint = async (point: MeasurementPoint): Promise<boolean> => {
    try {
      if (!state.currentFormat) {
        console.error('No current format available');
        dispatch({ type: 'SET_ERROR', payload: 'No hay formato actual disponible' });
        return false;
      }
      
      // Crear el nuevo formato con el punto agregado
      const updatedFormat: MeasurementFormat = {
        ...state.currentFormat,
        measurementPoints: [...state.currentFormat.measurementPoints, point],
        updatedAt: new Date().toISOString(),
      };
      
      dispatch({ type: 'ADD_MEASUREMENT_POINT', payload: point });
      
      // Intentar guardar inmediatamente con el formato actualizado
      try {
        await saveCurrentFormat(updatedFormat);
        return true;
      } catch (saveError) {
        console.error('Error saving point immediately, trying debounced save:', saveError);
        // Si falla el guardado inmediato, usar debounced save con alerta
        debouncedsave(true);
        return false;
      }
    } catch (error) {
      console.error('Error adding point to context:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al agregar el punto de medición al formato' });
      return false;
    }
  };

  const updateMeasurementPoint = (id: string, point: MeasurementPoint) => {
    dispatch({ type: 'UPDATE_MEASUREMENT_POINT', payload: { id, point } });
  };

  const deleteMeasurementPoint = (id: string) => {
    dispatch({ type: 'DELETE_MEASUREMENT_POINT', payload: id });
  };

  const updateWeatherConditions = (conditions: WeatherConditions) => {
    dispatch({ type: 'UPDATE_WEATHER_CONDITIONS', payload: conditions });
  };

  const updateTechnicalInfo = (info: TechnicalInfo) => {
    dispatch({ type: 'UPDATE_TECHNICAL_INFO', payload: info });
  };

  const updateInspectionData = (data: InspectionData) => {
    dispatch({ type: 'UPDATE_INSPECTION_DATA', payload: data });
  };

  const addMeasurementResult = (result: MeasurementResults) => {
    dispatch({ type: 'ADD_MEASUREMENT_RESULT', payload: result });
  };

  const updateMeasurementResult = (index: number, result: MeasurementResults) => {
    dispatch({ type: 'UPDATE_MEASUREMENT_RESULT', payload: { index, result } });
  };

  const updateMeasurementResultData = (pointId: string, schedule: 'diurnal' | 'nocturnal', type: MeasurementType, data: any) => {
    dispatch({ type: 'UPDATE_MEASUREMENT_RESULT_DATA', payload: { pointId, schedule, type, data } });
  };

  const updateQualitativeData = (data: QualitativeData) => {
    dispatch({ type: 'UPDATE_QUALITATIVE_DATA', payload: data });
  };

  const addExternalEvent = (event: ExternalEvent) => {
    dispatch({ type: 'ADD_EXTERNAL_EVENT', payload: event });
  };

  const deleteExternalEvent = (id: string) => {
    dispatch({ type: 'DELETE_EXTERNAL_EVENT', payload: id });
  };

  const addPhoto = async (photo: Photo): Promise<boolean> => {
    try {
      if (!state.currentFormat) {
        console.error('No current format available to add photo');
        dispatch({ type: 'SET_ERROR', payload: 'No hay formato actual disponible para agregar la foto' });
        return false;
      }

      // Calculate the new format state with the added photo
      const newFormatWithPhoto = {
        ...state.currentFormat,
        photos: [...state.currentFormat.photos, photo],
        updatedAt: new Date().toISOString()
      };

      console.log('Photo being added:', photo.id);
      console.log('Photos before addition:', state.currentFormat.photos.length);
      console.log('Photos after addition (calculated):', newFormatWithPhoto.photos.length);

      // Dispatch the action to update context
      dispatch({ type: 'ADD_PHOTO', payload: photo });

      // Intentar guardar inmediatamente usando el estado calculado
      try {
        await saveCurrentFormat(newFormatWithPhoto);
        console.log('Photo saved successfully to storage with calculated state');
        return true;
      } catch (saveError) {
        console.error('Error saving photo immediately, trying debounced save:', saveError);
        // Si falla el guardado inmediato, usar debounced save con alerta
        debouncedsave(true);
        return false;
      }
    } catch (error) {
      console.error('Error adding photo to context:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al agregar la foto al formato' });
      return false;
    }
  };

  const updatePhoto = async (id: string, updates: Partial<Photo>): Promise<boolean> => {
    try {
      if (!state.currentFormat) {
        console.error('No current format available to update photo');
        dispatch({ type: 'SET_ERROR', payload: 'No hay formato actual disponible para actualizar la foto' });
        return false;
      }

      // Calculate the new format state with the updated photo
      const newFormatWithUpdatedPhoto = {
        ...state.currentFormat,
        photos: state.currentFormat.photos.map(photo =>
          photo.id === id ? { ...photo, ...updates } : photo
        ),
        updatedAt: new Date().toISOString()
      };

      console.log('Photo being updated:', id, updates);
      console.log('Photos before update:', state.currentFormat.photos.length);
      console.log('Updated photo found:', newFormatWithUpdatedPhoto.photos.find(p => p.id === id) ? 'Yes' : 'No');

      // Dispatch the action to update context
      dispatch({ type: 'UPDATE_PHOTO', payload: { id, photo: updates } });

      // Intentar guardar inmediatamente usando el estado calculado
      try {
        await saveCurrentFormat(newFormatWithUpdatedPhoto);
        console.log('Photo update saved successfully to storage with calculated state');
        return true;
      } catch (saveError) {
        console.error('Error saving photo update immediately, trying debounced save:', saveError);
        debouncedsave(true);
        return false;
      }
    } catch (error) {
      console.error('Error updating photo in context:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al actualizar la foto' });
      return false;
    }
  };

  const deletePhoto = async (id: string): Promise<boolean> => {
    try {
      if (!state.currentFormat) {
        console.error('No current format available to delete photo');
        dispatch({ type: 'SET_ERROR', payload: 'No hay formato actual disponible para eliminar la foto' });
        return false;
      }

      // Find the photo to get its URI
      const photoToDelete = state.currentFormat.photos.find(photo => photo.id === id);

      // Calculate the new format state with the deleted photo removed
      const newFormatWithoutPhoto = {
        ...state.currentFormat,
        photos: state.currentFormat.photos.filter(photo => photo.id !== id),
        updatedAt: new Date().toISOString()
      };

      console.log('Photo being deleted:', id);
      console.log('Photos before deletion:', state.currentFormat.photos.length);
      console.log('Photos after deletion (calculated):', newFormatWithoutPhoto.photos.length);
      console.log('Photo was found and will be removed:', state.currentFormat.photos.some(p => p.id === id) ? 'Yes' : 'No');

      // Try to delete the physical file if it exists
      if (photoToDelete?.uri) {
        try {
          const { deleteAsync, getInfoAsync } = await import('expo-file-system/legacy');
          const fileInfo = await getInfoAsync(photoToDelete.uri);
          if (fileInfo.exists) {
            await deleteAsync(photoToDelete.uri, { idempotent: true });
            console.log('Physical photo file deleted:', photoToDelete.uri);
          }
        } catch (fileError) {
          console.warn('Could not delete physical photo file:', fileError);
          // Continue even if file deletion fails - the reference will be removed from the format
        }
      }

      // Dispatch the action to update context
      dispatch({ type: 'DELETE_PHOTO', payload: id });

      // Intentar guardar inmediatamente usando el estado calculado
      try {
        await saveCurrentFormat(newFormatWithoutPhoto);
        console.log('Photo deletion saved successfully to storage with calculated state');
        return true;
      } catch (saveError) {
        console.error('Error saving after photo deletion:', saveError);
        // Si falla el guardado inmediato, usar debounced save con alerta
        debouncedsave(true);
        return false;
      }
    } catch (error) {
      console.error('Error deleting photo from context:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al eliminar la foto del formato' });
      return false;
    }
  };

  const saveCurrentFormat = async (formatToSaveOverride?: MeasurementFormat) => {
    const formatToUse = formatToSaveOverride || state.currentFormat;
    if (!formatToUse) {
      console.log('No current format to save');
      const errorMsg = 'No hay formato actual para guardar';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      throw new Error(errorMsg);
    }

    // Check if format has actually changed
    const hasChanged = hasFormatChanged(formatToUse);

    try {
      console.log('Saving current format:', formatToUse.id, hasChanged ? '(with changes)' : '(no changes)');
      console.log('Format being saved has', formatToUse.photos?.length || 0, 'photos');
      console.log('Photo IDs being saved:', formatToUse.photos?.map(p => p.id) || []);
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null }); // Limpiar errores previos

      // Only update timestamp if there are actual changes
      const formatToSave = hasChanged ? {
        ...formatToUse,
        updatedAt: new Date().toISOString()
      } : formatToUse;
      
      // Save format to storage
      const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
      let savedFormats: MeasurementFormat[] = [];

      if (savedFormatsJson) {
        try {
          savedFormats = JSON.parse(savedFormatsJson);
          if (!Array.isArray(savedFormats)) {
            savedFormats = [];
          }
        } catch (parseError) {
          console.error('Error parsing saved formats:', parseError);
          savedFormats = [];
        }
      }

      // Update or add format
      const existingIndex = savedFormats.findIndex(f => f.id === formatToSave.id);
      if (existingIndex !== -1) {
        savedFormats[existingIndex] = formatToSave;
      } else {
        savedFormats.push(formatToSave);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENT_FORMATS, JSON.stringify(savedFormats));

      // Also save as current format
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_FORMAT, JSON.stringify(formatToSave));

      // Verification for the new storage system
      const verification = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
      if (!verification) {
        throw new Error('No se pudo verificar que el formato se guardó correctamente');
      }

      // Additional verification: check saved photos in both storage locations
      const verificationCurrentFormat = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_FORMAT);
      const verificationSavedFormats = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);

      if (verificationCurrentFormat) {
        const parsedCurrentFormat = JSON.parse(verificationCurrentFormat);
        console.log('✅ Verification: Current format saved with', parsedCurrentFormat.photos?.length || 0, 'photos');
        console.log('✅ Verification: Current format photo IDs:', parsedCurrentFormat.photos?.map((p: any) => p.id) || []);
      }

      if (verificationSavedFormats) {
        const parsedSavedFormats = JSON.parse(verificationSavedFormats);
        const verificationFormat = parsedSavedFormats.find((f: any) => f.id === formatToSave.id);
        if (verificationFormat) {
          console.log('✅ Verification: Saved formats updated with', verificationFormat.photos?.length || 0, 'photos');
          console.log('✅ Verification: Saved formats photo IDs:', verificationFormat.photos?.map((p: any) => p.id) || []);

          // Cross-check both storage locations have the same photo count
          const currentFormatPhotos = JSON.parse(verificationCurrentFormat || '{}').photos || [];
          const savedFormatPhotos = verificationFormat.photos || [];

          if (currentFormatPhotos.length !== savedFormatPhotos.length) {
            console.warn('⚠️ MISMATCH: Current format has', currentFormatPhotos.length, 'photos but saved format has', savedFormatPhotos.length, 'photos');
          } else {
            console.log('✅ MATCH: Both storage locations have', currentFormatPhotos.length, 'photos');
          }
        }
      }
      
      // Actualizar solo la lista de formatos guardados, no el formato actual
      // para evitar sobrescribir cambios pendientes
      dispatch({ type: 'SAVE_FORMAT', payload: formatToSave });

      // Update clean copy after successful save, but only if there were changes
      if (hasChanged) {
        cleanFormatCopy = createDeepCopy(formatToSave);
        console.log('Clean copy updated after save');
      }

      console.log('Format saved successfully with verification');
    } catch (error) {
      console.error('Error saving format:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido al guardar el formato';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      throw error; // Re-throw para que las pantallas puedan manejarlo
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadSavedFormats = async () => {
    try {
      console.log('Loading saved formats...');
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null }); // Limpiar errores previos
      
      const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
      const currentFormatJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_FORMAT);
      
      let savedFormats: MeasurementFormat[] = [];
      
      if (savedFormatsJson) {
        try {
          const parsedFormats = JSON.parse(savedFormatsJson);
          
          if (Array.isArray(parsedFormats)) {
            savedFormats = parsedFormats.map((format: any) => {
              // Validar y normalizar cada formato
              const normalizedFormat = {
                ...format,
                photos: format.photos || [],
                inspection: format.inspection || {
                  pointAssignment: false,
                  calibrationVerification: false,
                  parametersVerification: false,
                  batteryStatus: false,
                  timeSynchronization: false,
                  weatherStationTests: false,
                  weatherConditionsRecord: false,
                },
                technicalInfo: {
                  ...format.technicalInfo,
                  scanningMethod: format.technicalInfo?.scanningMethod || '',
                },
                updatedAt: format.updatedAt || format.createdAt || new Date().toISOString(),
                createdAt: format.createdAt || new Date().toISOString(),
              };
              return normalizedFormat;
            });
            console.log(`Loaded ${savedFormats.length} saved formats`);
          } else {
            console.warn('Saved formats is not an array, resetting to empty array');
            savedFormats = [];
          }
        } catch (parseError) {
          console.error('Error parsing saved formats:', parseError);
          dispatch({ type: 'SET_ERROR', payload: 'Error al leer los formatos guardados. Se inicializará una lista vacía.' });
          savedFormats = [];
        }
      }
      
      dispatch({ type: 'LOAD_SAVED_FORMATS', payload: savedFormats });

      // Cargar formato actual si existe
      if (currentFormatJson) {
        try {
          const currentFormat = JSON.parse(currentFormatJson);
          console.log('💾 Loading current format from AsyncStorage:', currentFormat.id);
          console.log('📷 Current format from storage has', currentFormat.photos?.length || 0, 'photos');
          console.log('📷 Current format photo IDs from storage:', currentFormat.photos?.map((p: any) => p.id) || []);
          console.log('📷 Photo types from storage:', currentFormat.photos?.map((p: any) => `${p.id}:${p.type}`) || []);
          const normalizedCurrentFormat = {
            ...currentFormat,
            photos: currentFormat.photos || [],
            inspection: currentFormat.inspection || {
              pointAssignment: false,
              calibrationVerification: false,
              parametersVerification: false,
              batteryStatus: false,
              timeSynchronization: false,
              weatherStationTests: false,
              weatherConditionsRecord: false,
            },
            technicalInfo: {
              ...currentFormat.technicalInfo,
              scanningMethod: currentFormat.technicalInfo?.scanningMethod || '',
            },
          };
          dispatch({ type: 'SET_CURRENT_FORMAT', payload: normalizedCurrentFormat });
          // Store clean copy for change detection when loading from storage
          cleanFormatCopy = createDeepCopy(normalizedCurrentFormat);
          console.log('✅ Loaded current format with clean copy:', normalizedCurrentFormat.id);
          console.log('💾 Clean copy has', cleanFormatCopy?.photos?.length || 0, 'photos');
          console.log('💾 Clean copy photo IDs:', cleanFormatCopy?.photos?.map(p => p.id) || []);
        } catch (parseError) {
          console.error('Error parsing current format:', parseError);
          // No establecer error aquí ya que es opcional
        }
      }
    } catch (error) {
      console.error('Error loading saved formats:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido al cargar los formatos';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteFormat = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'DELETE_FORMAT', payload: id });

      // Delete format from storage
      const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
      if (savedFormatsJson) {
        try {
          const savedFormats = JSON.parse(savedFormatsJson);
          if (Array.isArray(savedFormats)) {
            const updatedFormats = savedFormats.filter(f => f.id !== id);
            await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENT_FORMATS, JSON.stringify(updatedFormats));
          }
        } catch (error) {
          console.error('Error deleting format:', error);
        }
      }

      if (state.currentFormat?.id === id) {
        dispatch({ type: 'CLEAR_CURRENT_FORMAT' });
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_FORMAT);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al eliminar el formato' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const exportFormat = async (format: MeasurementFormat): Promise<string> => {
    const { company, date, workOrder } = format.generalInfo;
    const fileName = `${company}_${date}_OT-${workOrder.type}-${workOrder.number}-${workOrder.year}.json`;
    
    // Normalize weather conditions to ensure numbers for export
    const normalizedFormat = {
      ...format,
      weatherConditions: normalizeWeatherConditionsForExport(format.weatherConditions)
    };
    
    return JSON.stringify(normalizedFormat, null, 2);
  };

  const clearCurrentFormat = () => {
    dispatch({ type: 'CLEAR_CURRENT_FORMAT' });
    // Clear clean copy as well
    cleanFormatCopy = null;
    console.log('Current format and clean copy cleared');
  };

  const setNavigationSelection = (pointId: string, schedule: ScheduleType) => {
    dispatch({ type: 'SET_NAVIGATION_SELECTION', payload: { pointId, schedule } });
  };

  const contextValue: MeasurementContextType = {
    state,
    createNewFormat,
    loadFormat,
    updateGeneralInfo,
    addMeasurementPoint,
    updateMeasurementPoint,
    deleteMeasurementPoint,
    updateWeatherConditions,
    updateTechnicalInfo,
    updateInspectionData,
    addMeasurementResult,
    updateMeasurementResult,
    updateMeasurementResultData,
    updateQualitativeData,
    addExternalEvent,
    deleteExternalEvent,
    addPhoto,
    updatePhoto,
    deletePhoto,
    saveCurrentFormat,
    loadSavedFormats,
    deleteFormat,
    exportFormat,
    clearCurrentFormat,
    setNavigationSelection,
  };

  return (
    <MeasurementContext.Provider value={contextValue}>
      {children}
    </MeasurementContext.Provider>
  );
};

export const useMeasurement = () => {
  const context = useContext(MeasurementContext);
  if (context === undefined) {
    throw new Error('useMeasurement must be used within a MeasurementProvider');
  }
  return context;
};