import { MeasurementType } from '../types';

export const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#81C784',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',
  // Schedule colors
  diurnal: '#FFA726',
  diurnalLight: '#FFB74D',
  nocturnal: '#42A5F5',
  nocturnalLight: '#64B5F6',
  // Point colors - Optimized for maximum differentiation between consecutive points
  pointColors: [
    '#E53E3E', // Red
    '#38A169', // Green 
    '#3182CE', // Blue
    '#D69E2E', // Yellow/Orange
    '#805AD5', // Purple
    '#DD6B20', // Orange
    '#319795', // Teal
    '#E91E63', // Pink/Magenta
    '#4A5568', // Gray
    '#C53030', // Dark Red
  ],
};

export const MEASUREMENT_TYPES: { label: string; value: MeasurementType | '' }[] = [
  { label: 'Seleccione el tipo de medición', value: '' },
  { label: 'Emisión de Ruido', value: 'emission' },
  { label: 'Ruido Ambiental', value: 'ambient' },
  { label: 'Inmisión de Ruido', value: 'immission' },
  { label: 'Sonometría', value: 'sonometry' },
];

export const WORK_ORDER_TYPES = [
  { label: 'RUI', value: 'RUI' },
  { label: 'ACU', value: 'ACU' },
];

export const SOUND_METERS = [
  { label: 'Seleccione el sonómetro', value: '' },
  { label: 'ACU-11', value: 'ACU-11' },
  { label: 'ACU-22A', value: 'ACU-22A' },
  { label: 'ACU-23A', value: 'ACU-23A' },
  { label: 'ACU-24A', value: 'ACU-24A' },
];

export const CALIBRATORS = [
  { label: 'Seleccione el calibrador', value: '' },
  { label: 'ACU-06', value: 'ACU-06' },
  { label: 'ACU-22B', value: 'ACU-22B' },
  { label: 'ACU-25B', value: 'ACU-25B' },
  { label: 'ACU-24B', value: 'ACU-24B' },
];

export const WEATHER_STATIONS = [
  { label: 'Seleccione la estación meteorológica', value: '' },
  { label: 'ACU-26', value: 'ACU-26' },
  { label: 'ACU-27', value: 'ACU-27' },
  { label: 'ACU-28', value: 'ACU-28' },
  { label: 'N/A', value: 'N/A' },
];

export const SCANNING_METHODS = [
  { label: 'Seleccione el método de barrido usado', value: '' },
  { label: 'Cinta métrica', value: 'tape_measure' },
  { label: 'Tiza o cinta visible', value: 'chalk_tape' },
  { label: 'Cuerda guía', value: 'guide_rope' },
];

export const COORDINATE_ORIGINS = [
  { label: 'Seleccione el origen', value: '' },
  { label: 'Origen Bogotá', value: 'BOGOTA' },
  { label: 'Origen Este-Este', value: 'ESTE_ESTE' },
  { label: 'Origen Este', value: 'ESTE' },
  { label: 'Origen Oeste', value: 'OESTE' },
  { label: 'Origen Oeste-Oeste', value: 'OESTE_OESTE' },
  { label: 'Origen Arauca', value: 'ARAUCA' },
];

export const DRAWER_ITEMS = [
  {
    name: 'GeneralInfo',
    title: 'Información General',
    icon: 'info-circle',
    iconType: 'FontAwesome',
  },
  {
    name: 'MeasurementPoints',
    title: 'Puntos de Medición',
    icon: 'map-pin',
    iconType: 'Feather',
  },
  {
    name: 'WeatherConditions',
    title: 'Condiciones Meteorológicas',
    icon: 'cloud',
    iconType: 'Feather',
  },
  {
    name: 'TechnicalInfo',
    title: 'Información Técnica',
    icon: 'settings',
    iconType: 'Feather',
  },
  {
    name: 'Inspection',
    title: 'Inspección Previa',
    icon: 'check-square',
    iconType: 'Feather',
  },
  {
    name: 'MeasurementResults',
    title: 'Resultados',
    icon: 'bar-chart',
    iconType: 'Feather',
  },
  {
    name: 'QualitativeData',
    title: 'Datos Cualitativos',
    icon: 'file-text',
    iconType: 'Feather',
  },
  {
    name: 'ExternalEvents',
    title: 'Eventos Externos',
    icon: 'alert-triangle',
    iconType: 'Feather',
  },
  {
    name: 'PhotoRegistry',
    title: 'Registro Fotográfico',
    icon: 'camera',
    iconType: 'Feather',
  },
  {
    name: 'ResultsSummary',
    title: 'Resumen de Resultados',
    icon: 'pie-chart',
    iconType: 'Feather',
  },
  {
    name: 'Export',
    title: 'Exportar',
    icon: 'download',
    iconType: 'Feather',
  },
];

export const EMISSION_INTERVALS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
];

export const RESIDUAL_INTERVALS = [
  { label: '0', value: '0' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
];

export const WEATHER_PARAMETERS = [
  { key: 'windSpeed', label: 'Velocidad del viento', unit: 'm/s' },
  { key: 'windDirection', label: 'Dirección del viento', unit: '' },
  { key: 'temperature', label: 'Temperatura', unit: '°C' },
  { key: 'humidity', label: 'Humedad', unit: '%' },
  { key: 'atmosphericPressure', label: 'Presión Atmosférica', unit: 'hPa' },
  { key: 'precipitation', label: 'Precipitación', unit: 'mm' },
];

export const WIND_DIRECTIONS = [
  { label: 'Seleccione la dirección', value: '' },
  { label: '-', value: '-' },
  { label: 'N (Norte)', value: 'N' },
  { label: 'NNE (Norte-Noreste)', value: 'NNE' },
  { label: 'NE (Noreste)', value: 'NE' },
  { label: 'ENE (Este-Noreste)', value: 'ENE' },
  { label: 'E (Este)', value: 'E' },
  { label: 'ESE (Este-Sureste)', value: 'ESE' },
  { label: 'SE (Sureste)', value: 'SE' },
  { label: 'SSE (Sur-Sureste)', value: 'SSE' },
  { label: 'S (Sur)', value: 'S' },
  { label: 'SSW (Sur-Suroeste)', value: 'SSW' },
  { label: 'SW (Suroeste)', value: 'SW' },
  { label: 'WSW (Oeste-Suroeste)', value: 'WSW' },
  { label: 'W (Oeste)', value: 'W' },
  { label: 'WNW (Oeste-Noroeste)', value: 'WNW' },
  { label: 'NW (Noroeste)', value: 'NW' },
  { label: 'NNW (Norte-Noroeste)', value: 'NNW' },
];

export const RESCHEDULE_REASONS = [
  { label: 'Seleccione el motivo', value: '' },
  { label: 'Condiciones climáticas adversas', value: 'weather' },
  { label: 'Imposibilidad de acceso al punto de medición', value: 'access' },
  { label: 'Solicitud del cliente', value: 'client_request' },
  { label: 'Falta de equipos o instrumentos', value: 'equipment' },
  { label: 'Problema técnico con equipos de medición', value: 'technical' },
  { label: 'Otro motivo', value: 'other' },
];

export const RESCHEDULE_REASON_LABELS: { [key: string]: string } = {
  weather: 'Condiciones climáticas adversas (lluvia, viento excesivo, etc.)',
  access: 'Imposibilidad de acceso al punto de medición',
  client_request: 'Solicitud del cliente',
  equipment: 'Falta de equipos o instrumentos necesarios',
  technical: 'Problema técnico con equipos de medición',
  other: 'Otro motivo',
};

export const STORAGE_KEYS = {
  MEASUREMENT_FORMATS: '@measurement_formats',
  CURRENT_FORMAT: '@current_format',
};