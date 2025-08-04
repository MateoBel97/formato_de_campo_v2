export interface MeasurementPoint {
  id: string;
  name: string;
  coordinatesN: string;
  coordinatesW: string;
}

export interface WeatherCondition {
  windSpeed: { initial: number; final: number };
  windDirection: { initial: string; final: string };
  temperature: { initial: number; final: number };
  humidity: { initial: number; final: number };
  atmosphericPressure: { initial: number; final: number };
  precipitation: { initial: number; final: number };
}

export interface WeatherConditions {
  diurnal: WeatherCondition;
  nocturnal: WeatherCondition;
}

export interface TechnicalInfo {
  measurementType: MeasurementType;
  schedule: {
    diurnal: boolean;
    nocturnal: boolean;
  };
  soundMeter: {
    selected: string;
    other?: string;
  };
  calibrator: {
    selected: string;
    other?: string;
  };
  weatherStation: {
    selected: string;
    other?: string;
  };
}

export interface EmissionInterval {
  soundLevel: number;
  percentile90: number;
  fileNumber: number;
  initialTime: string;
  finalTime: string;
}

export interface EmissionResults {
  emission: {
    intervals: number;
    data: EmissionInterval[];
  };
  residual: {
    intervals: number;
    data: EmissionInterval[];
  };
}

export interface AmbientResults {
  levelN: string;
  fileNumberN: string;
  levelS: string;
  fileNumberS: string;
  levelE: string;
  fileNumberE: string;
  levelW: string;
  fileNumberW: string;
  levelV: string;
  fileNumberV: string;
  initialTime: string;
  finalTime: string;
}

export interface ImmissionResults {
  levelLeq: string;
  levelLmax: string;
  levelLmin: string;
  initialTime: string;
  finalTime: string;
}

export interface SonometryResults {
  levelLeq: string;
  levelLmax: string;
  levelLmin: string;
  initialTime: string;
  finalTime: string;
}

export interface MeasurementResults {
  pointId: string;
  schedule: 'diurnal' | 'nocturnal';
  type: MeasurementType;
  emission?: EmissionResults;
  ambient?: AmbientResults;
  immission?: ImmissionResults;
  sonometry?: SonometryResults;
  comments?: string;
}

export interface ExternalEvent {
  id: string;
  name: string;
  level: number;
  time: string;
  duration: number;
}

export interface Photo {
  id: string;
  uri: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  pointId: string;
  schedule: 'diurnal' | 'nocturnal';
}

export interface GeneralInfo {
  company: string;
  date: string;
  workOrder: {
    type: 'RUI' | 'ACU' | 'AMB';
    number: string;
    year: string;
  };
  supervisor: string;
}

export interface QualitativeData {
  conditionsDescription: string;
  noiseSourceInfo: string;
}

export interface InspectionData {
  pointAssignment: boolean;
  calibrationVerification: boolean;
  parametersVerification: boolean;
  batteryStatus: boolean;
  timeSynchronization: boolean;
  weatherStationTests: boolean;
  weatherConditionsRecord: boolean;
}

export interface MeasurementFormat {
  id: string;
  generalInfo: GeneralInfo;
  measurementPoints: MeasurementPoint[];
  weatherConditions: WeatherConditions;
  technicalInfo: TechnicalInfo;
  inspection: InspectionData;
  measurementResults: MeasurementResults[];
  qualitativeData: QualitativeData;
  externalEvents: ExternalEvent[];
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

export type MeasurementType = 'emission' | 'ambient' | 'immission' | 'sonometry';

export type ScheduleType = 'diurnal' | 'nocturnal';

export interface AppState {
  currentFormat: MeasurementFormat | null;
  savedFormats: MeasurementFormat[];
  isLoading: boolean;
  error: string | null;
}

export type AppAction = 
  | { type: 'SET_CURRENT_FORMAT'; payload: MeasurementFormat }
  | { type: 'UPDATE_GENERAL_INFO'; payload: GeneralInfo }
  | { type: 'ADD_MEASUREMENT_POINT'; payload: MeasurementPoint }
  | { type: 'UPDATE_MEASUREMENT_POINT'; payload: { id: string; point: MeasurementPoint } }
  | { type: 'DELETE_MEASUREMENT_POINT'; payload: string }
  | { type: 'UPDATE_WEATHER_CONDITIONS'; payload: WeatherConditions }
  | { type: 'UPDATE_TECHNICAL_INFO'; payload: TechnicalInfo }
  | { type: 'UPDATE_INSPECTION_DATA'; payload: InspectionData }
  | { type: 'ADD_MEASUREMENT_RESULT'; payload: MeasurementResults }
  | { type: 'UPDATE_MEASUREMENT_RESULT'; payload: { index: number; result: MeasurementResults } }
  | { type: 'UPDATE_QUALITATIVE_DATA'; payload: QualitativeData }
  | { type: 'ADD_EXTERNAL_EVENT'; payload: ExternalEvent }
  | { type: 'DELETE_EXTERNAL_EVENT'; payload: string }
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'DELETE_PHOTO'; payload: string }
  | { type: 'LOAD_SAVED_FORMATS'; payload: MeasurementFormat[] }
  | { type: 'SAVE_FORMAT'; payload: MeasurementFormat }
  | { type: 'DELETE_FORMAT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CURRENT_FORMAT' };