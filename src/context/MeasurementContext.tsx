import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppAction, MeasurementFormat, GeneralInfo, MeasurementPoint, WeatherConditions, TechnicalInfo, InspectionData, MeasurementResults, QualitativeData, ExternalEvent, Photo } from '../types';
import { STORAGE_KEYS } from '../constants';

const initialState: AppState = {
  currentFormat: null,
  savedFormats: [],
  isLoading: false,
  error: null,
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
      diurnal: true,
      nocturnal: false,
    },
    soundMeter: {
      selected: 'ACU-11',
    },
    calibrator: {
      selected: 'ACU-06',
    },
    weatherStation: {
      selected: 'ACU-26',
    },
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
        currentFormat: {
          ...state.currentFormat,
          generalInfo: action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'ADD_MEASUREMENT_POINT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          measurementPoints: [...state.currentFormat.measurementPoints, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };

    case 'UPDATE_MEASUREMENT_POINT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          measurementPoints: state.currentFormat.measurementPoints.map(point =>
            point.id === action.payload.id ? action.payload.point : point
          ),
          updatedAt: new Date().toISOString(),
        },
      };

    case 'DELETE_MEASUREMENT_POINT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          measurementPoints: state.currentFormat.measurementPoints.filter(
            point => point.id !== action.payload
          ),
          updatedAt: new Date().toISOString(),
        },
      };

    case 'UPDATE_WEATHER_CONDITIONS':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          weatherConditions: action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'UPDATE_TECHNICAL_INFO':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          technicalInfo: action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'UPDATE_INSPECTION_DATA':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          inspection: action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'ADD_MEASUREMENT_RESULT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          measurementResults: [...state.currentFormat.measurementResults, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };

    case 'UPDATE_MEASUREMENT_RESULT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          measurementResults: state.currentFormat.measurementResults.map((result, index) =>
            index === action.payload.index ? action.payload.result : result
          ),
          updatedAt: new Date().toISOString(),
        },
      };

    case 'UPDATE_QUALITATIVE_DATA':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          qualitativeData: action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'ADD_EXTERNAL_EVENT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          externalEvents: [...state.currentFormat.externalEvents, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };

    case 'DELETE_EXTERNAL_EVENT':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          externalEvents: state.currentFormat.externalEvents.filter(
            event => event.id !== action.payload
          ),
          updatedAt: new Date().toISOString(),
        },
      };

    case 'ADD_PHOTO':
      if (!state.currentFormat) return state;
      const newState = {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          photos: [...state.currentFormat.photos, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };
      console.log('Photo added to context, total photos:', newState.currentFormat.photos.length);
      return newState;

    case 'DELETE_PHOTO':
      if (!state.currentFormat) return state;
      return {
        ...state,
        currentFormat: {
          ...state.currentFormat,
          photos: state.currentFormat.photos.filter(
            photo => photo.id !== action.payload
          ),
          updatedAt: new Date().toISOString(),
        },
      };

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

    default:
      return state;
  }
};

interface MeasurementContextType {
  state: AppState;
  createNewFormat: () => void;
  loadFormat: (format: MeasurementFormat) => void;
  updateGeneralInfo: (info: GeneralInfo) => void;
  addMeasurementPoint: (point: MeasurementPoint) => void;
  updateMeasurementPoint: (id: string, point: MeasurementPoint) => void;
  deleteMeasurementPoint: (id: string) => void;
  updateWeatherConditions: (conditions: WeatherConditions) => void;
  updateTechnicalInfo: (info: TechnicalInfo) => void;
  updateInspectionData: (data: InspectionData) => void;
  addMeasurementResult: (result: MeasurementResults) => void;
  updateMeasurementResult: (index: number, result: MeasurementResults) => void;
  updateQualitativeData: (data: QualitativeData) => void;
  addExternalEvent: (event: ExternalEvent) => void;
  deleteExternalEvent: (id: string) => void;
  addPhoto: (photo: Photo) => void;
  deletePhoto: (id: string) => void;
  saveCurrentFormat: () => Promise<void>;
  loadSavedFormats: () => Promise<void>;
  deleteFormat: (id: string) => Promise<void>;
  exportFormat: (format: MeasurementFormat) => Promise<string>;
  clearCurrentFormat: () => void;
}

const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

export const MeasurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(measurementReducer, initialState);

  useEffect(() => {
    loadSavedFormats();
  }, []);

  // Removemos el guardado automático para mejorar rendimiento
  // El guardado ahora será manual cuando sea necesario

  // Debounced save para evitar guardado excesivo
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedsave = () => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    debouncedSaveRef.current = setTimeout(() => {
      if (state.currentFormat) {
        saveCurrentFormat();
      }
    }, 1000); // Esperar 1 segundo antes de guardar
  };

  const createNewFormat = () => {
    const newFormat = createEmptyFormat();
    dispatch({ type: 'SET_CURRENT_FORMAT', payload: newFormat });
  };

  const loadFormat = (format: MeasurementFormat) => {
    dispatch({ type: 'SET_CURRENT_FORMAT', payload: format });
  };

  const updateGeneralInfo = (info: GeneralInfo) => {
    dispatch({ type: 'UPDATE_GENERAL_INFO', payload: info });
  };

  const addMeasurementPoint = (point: MeasurementPoint) => {
    dispatch({ type: 'ADD_MEASUREMENT_POINT', payload: point });
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

  const updateQualitativeData = (data: QualitativeData) => {
    dispatch({ type: 'UPDATE_QUALITATIVE_DATA', payload: data });
  };

  const addExternalEvent = (event: ExternalEvent) => {
    dispatch({ type: 'ADD_EXTERNAL_EVENT', payload: event });
  };

  const deleteExternalEvent = (id: string) => {
    dispatch({ type: 'DELETE_EXTERNAL_EVENT', payload: id });
  };

  const addPhoto = (photo: Photo) => {
    dispatch({ type: 'ADD_PHOTO', payload: photo });
    // Guardar después de agregar foto pero con debounce
    debouncedsave();
  };

  const deletePhoto = (id: string) => {
    dispatch({ type: 'DELETE_PHOTO', payload: id });
  };

  const saveCurrentFormat = async () => {
    if (!state.currentFormat) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SAVE_FORMAT', payload: state.currentFormat });
      
      const updatedFormats = [...state.savedFormats];
      const existingIndex = updatedFormats.findIndex(f => f.id === state.currentFormat.id);
      
      if (existingIndex !== -1) {
        updatedFormats[existingIndex] = state.currentFormat;
      } else {
        updatedFormats.push(state.currentFormat);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENT_FORMATS, JSON.stringify(updatedFormats));
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_FORMAT, JSON.stringify(state.currentFormat));
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al guardar el formato' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadSavedFormats = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
      const currentFormatJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_FORMAT);
      
      if (savedFormatsJson) {
        const savedFormats = JSON.parse(savedFormatsJson).map((format: any) => {
          if (!format.photos) {
            format.photos = [];
          }
          if (!format.inspection) {
            format.inspection = {
              pointAssignment: false,
              calibrationVerification: false,
              parametersVerification: false,
              batteryStatus: false,
              timeSynchronization: false,
              weatherStationTests: false,
              weatherConditionsRecord: false,
            };
          }
          return format;
        });
        dispatch({ type: 'LOAD_SAVED_FORMATS', payload: savedFormats });
      }

      if (currentFormatJson) {
        const currentFormat = JSON.parse(currentFormatJson);
        if (!currentFormat.photos) {
          currentFormat.photos = [];
        }
        if (!currentFormat.inspection) {
          currentFormat.inspection = {
            pointAssignment: false,
            calibrationVerification: false,
            parametersVerification: false,
            batteryStatus: false,
            timeSynchronization: false,
            weatherStationTests: false,
            weatherConditionsRecord: false,
          };
        }
        dispatch({ type: 'SET_CURRENT_FORMAT', payload: currentFormat });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error al cargar los formatos guardados' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteFormat = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'DELETE_FORMAT', payload: id });
      
      const updatedFormats = state.savedFormats.filter(format => format.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENT_FORMATS, JSON.stringify(updatedFormats));
      
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
    
    return JSON.stringify(format, null, 2);
  };

  const clearCurrentFormat = () => {
    dispatch({ type: 'CLEAR_CURRENT_FORMAT' });
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
    updateQualitativeData,
    addExternalEvent,
    deleteExternalEvent,
    addPhoto,
    deletePhoto,
    saveCurrentFormat,
    loadSavedFormats,
    deleteFormat,
    exportFormat,
    clearCurrentFormat,
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