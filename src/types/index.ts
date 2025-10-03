export interface MeasurementPoint {
  id: string;
  name: string;
  coordinatesN: string;
  coordinatesW: string;
}

export interface WeatherCondition {
  windSpeed: { initial: number | string; final: number | string };
  windDirection: { initial: string; final: string };
  temperature: { initial: number | string; final: number | string };
  humidity: { initial: number | string; final: number | string };
  atmosphericPressure: { initial: number | string; final: number | string };
  precipitation: { initial: number | string; final: number | string };
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
  scanningMethod: string;
}

export interface EmissionInterval {
  soundLevel: number;
  percentile90: number;
  fileNumber: string;
  initialTime: string;
  finalTime: string;
  calibrationPre?: string;
  calibrationPost?: string;
  calibrationPrePhoto?: CalibrationPhoto;
  calibrationPostPhoto?: CalibrationPhoto;
  verificationPre?: string;
  verificationPost?: string;
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
  initialTimeN: string;
  finalTimeN: string;
  calibrationPreN: string;
  calibrationPostN: string;
  calibrationPreNPhoto?: CalibrationPhoto;
  calibrationPostNPhoto?: CalibrationPhoto;
  verificationPreN?: string;
  verificationPostN?: string;
  levelS: string;
  fileNumberS: string;
  initialTimeS: string;
  finalTimeS: string;
  calibrationPreS: string;
  calibrationPostS: string;
  calibrationPreSPhoto?: CalibrationPhoto;
  calibrationPostSPhoto?: CalibrationPhoto;
  verificationPreS?: string;
  verificationPostS?: string;
  levelE: string;
  fileNumberE: string;
  initialTimeE: string;
  finalTimeE: string;
  calibrationPreE: string;
  calibrationPostE: string;
  calibrationPreEPhoto?: CalibrationPhoto;
  calibrationPostEPhoto?: CalibrationPhoto;
  verificationPreE?: string;
  verificationPostE?: string;
  levelW: string;
  fileNumberW: string;
  initialTimeW: string;
  finalTimeW: string;
  calibrationPreW: string;
  calibrationPostW: string;
  calibrationPreWPhoto?: CalibrationPhoto;
  calibrationPostWPhoto?: CalibrationPhoto;
  verificationPreW?: string;
  verificationPostW?: string;
  levelV: string;
  fileNumberV: string;
  initialTimeV: string;
  finalTimeV: string;
  calibrationPreV: string;
  calibrationPostV: string;
  calibrationPreVPhoto?: CalibrationPhoto;
  calibrationPostVPhoto?: CalibrationPhoto;
  verificationPreV?: string;
  verificationPostV?: string;
}

export interface ImmissionResults {
  levelLeq: string;
  levelLmax: string;
  levelLmin: string;
  fileNumber: string;
  initialTime: string;
  finalTime: string;
  calibrationPre: string;
  calibrationPost: string;
  calibrationPrePhoto?: CalibrationPhoto;
  calibrationPostPhoto?: CalibrationPhoto;
  verificationPre?: string;
  verificationPost?: string;
}

export interface SonometryResults {
  levelLeq: string;
  levelLmax: string;
  levelLmin: string;
  fileNumber: string;
  initialTime: string;
  finalTime: string;
  calibrationPre: string;
  calibrationPost: string;
  calibrationPrePhoto?: CalibrationPhoto;
  calibrationPostPhoto?: CalibrationPhoto;
  verificationPre?: string;
  verificationPost?: string;
}

export interface MeasurementResults {
  pointId: string;
  schedule: 'diurnal' | 'nocturnal';
  type: MeasurementType;
  date?: string; // Date for this specific point-schedule combination (YYYY-MM-DD format)
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

export interface CalibrationPhoto {
  id: string;
  uri: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface Photo {
  id: string;
  uri: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  pointId?: string; // Optional for Croquis photos
  schedule?: 'diurnal' | 'nocturnal'; // Optional for Croquis photos
  type: 'measurement' | 'croquis'; // New field to distinguish photo types
  _blobUrlLost?: boolean; // Flag to indicate photo was stored as blob URL and is now unavailable
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
  generalInfoSaved: boolean; // Flag to track if general info has been explicitly saved
  selectedPointForNavigation: string | null;
  selectedScheduleForNavigation: ScheduleType | null;
  selectedIntervalForNavigation: number | string | null; // For emission intervals (number) or ambient directions (string)
  selectedIsResidualForNavigation: boolean | null; // For emission type: true if navigating to residual interval
  selectedWeatherScheduleForNavigation: ScheduleType | null;
}

export type AppAction =
  | { type: 'SET_CURRENT_FORMAT'; payload: MeasurementFormat }
  | { type: 'UPDATE_GENERAL_INFO'; payload: GeneralInfo }
  | { type: 'ADD_MEASUREMENT_POINT'; payload: MeasurementPoint }
  | { type: 'UPDATE_MEASUREMENT_POINT'; payload: { id: string; point: MeasurementPoint } }
  | { type: 'REORDER_MEASUREMENT_POINTS'; payload: MeasurementPoint[] }
  | { type: 'DELETE_MEASUREMENT_POINT'; payload: string }
  | { type: 'UPDATE_WEATHER_CONDITIONS'; payload: WeatherConditions }
  | { type: 'UPDATE_TECHNICAL_INFO'; payload: TechnicalInfo }
  | { type: 'UPDATE_INSPECTION_DATA'; payload: InspectionData }
  | { type: 'ADD_MEASUREMENT_RESULT'; payload: MeasurementResults }
  | { type: 'UPDATE_MEASUREMENT_RESULT'; payload: { index: number; result: MeasurementResults } }
  | { type: 'UPDATE_MEASUREMENT_RESULT_DATA'; payload: { pointId: string; schedule: 'diurnal' | 'nocturnal'; type: MeasurementType; data: any } }
  | { type: 'UPDATE_MEASUREMENT_RESULT_DATE'; payload: { pointId: string; schedule: 'diurnal' | 'nocturnal'; type: MeasurementType; date: string } }
  | { type: 'UPDATE_QUALITATIVE_DATA'; payload: QualitativeData }
  | { type: 'ADD_EXTERNAL_EVENT'; payload: ExternalEvent }
  | { type: 'DELETE_EXTERNAL_EVENT'; payload: string }
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'UPDATE_PHOTO'; payload: { id: string; photo: Partial<Photo> } }
  | { type: 'DELETE_PHOTO'; payload: string }
  | { type: 'LOAD_SAVED_FORMATS'; payload: MeasurementFormat[] }
  | { type: 'SAVE_FORMAT'; payload: MeasurementFormat }
  | { type: 'DELETE_FORMAT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GENERAL_INFO_SAVED'; payload: boolean }
  | { type: 'CLEAR_CURRENT_FORMAT' }
  | { type: 'SET_NAVIGATION_SELECTION'; payload: { pointId: string; schedule: ScheduleType; interval?: number | string; isResidual?: boolean } }
  | { type: 'SET_WEATHER_NAVIGATION_SCHEDULE'; payload: ScheduleType };