/**
 * Utility functions for handling numeric input with decimal separators
 */

/**
 * Normalizes decimal input by converting comma to dot for JavaScript parsing
 * @param value - Input string that may contain comma as decimal separator
 * @returns Normalized string with dot as decimal separator
 */
export const normalizeDecimalInput = (value: string): string => {
  if (!value) return '';
  // Replace comma with dot for JavaScript parseFloat compatibility
  return value.replace(',', '.');
};

/**
 * Formats a number for display, optionally using comma as decimal separator
 * @param value - Numeric value to format
 * @param useComma - Whether to use comma as decimal separator (for iOS compatibility)
 * @returns Formatted string
 */
export const formatDecimalForDisplay = (value: number | string, useComma: boolean = false): string => {
  if (value === null || value === undefined || value === '') return '';
  
  const stringValue = value.toString();
  
  if (useComma) {
    return stringValue.replace('.', ',');
  }
  
  return stringValue;
};

/**
 * Parses a decimal input string to a number, handling both comma and dot separators
 * @param value - Input string with potential comma or dot decimal separator
 * @returns Parsed number or 0 if invalid
 */
export const parseDecimalInput = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  
  // Normalize comma to dot and parse
  const normalizedValue = normalizeDecimalInput(value.trim());
  const parsed = parseFloat(normalizedValue);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validates if a string is a valid decimal number (with comma or dot)
 * @param value - Input string to validate
 * @returns True if valid decimal number
 */
export const isValidDecimalInput = (value: string): boolean => {
  if (!value || value.trim() === '') return true; // Empty is valid
  
  // Allow numbers with either comma or dot as decimal separator
  // Also allow negative numbers
  const decimalRegex = /^-?\d*[,.]?\d*$/;
  return decimalRegex.test(value.trim());
};

/**
 * Cleans decimal input to ensure only one decimal separator
 * @param value - Input string
 * @returns Cleaned string with at most one decimal separator
 */
export const cleanDecimalInput = (value: string): string => {
  if (!value) return '';
  
  // Remove multiple decimal separators, keeping only the first one
  let cleaned = value;
  let hasDecimalSeparator = false;
  let result = '';
  
  for (const char of cleaned) {
    if ((char === ',' || char === '.') && !hasDecimalSeparator) {
      result += char;
      hasDecimalSeparator = true;
    } else if (char !== ',' && char !== '.') {
      result += char;
    }
  }
  
  return result;
};

/**
 * Converts decimal degrees to DMS (Degrees, Minutes, Seconds) format
 * @param decimal - Decimal degrees as number
 * @returns DMS formatted string in format: 0°00.0'00.00"
 */
export const convertDecimalToDMS = (decimal: number): string => {
  const absoluteDecimal = Math.abs(decimal);
  
  const degrees = Math.floor(absoluteDecimal);
  const minutesDecimal = (absoluteDecimal - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = (minutesDecimal - minutes) * 60;
  
  const minutesWithDecimal = (minutes + ((seconds / 60))).toFixed(1);
  const secondsFormatted = seconds.toFixed(2);
  
  return `${degrees}°${minutesWithDecimal}'${secondsFormatted}"`;
};

/**
 * Converts DMS format string back to decimal degrees
 * @param dms - DMS formatted string
 * @returns Decimal degrees as number
 */
export const convertDMSToDecimal = (dms: string): number => {
  if (!dms || dms.trim() === '') return 0;
  
  try {
    // Parse format: 0°00.0'00.00"
    const match = dms.match(/(\d+)°(\d+\.\d+)'(\d+\.\d+)"/);
    if (!match) return 0;
    
    const degrees = parseInt(match[1], 10);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);
    
    return degrees + (minutes / 60) + (seconds / 3600);
  } catch (error) {
    return 0;
  }
};

/**
 * Validates if a string is in valid DMS format
 * @param dms - DMS formatted string to validate
 * @returns True if valid DMS format
 */
export const isValidDMSFormat = (dms: string): boolean => {
  if (!dms || dms.trim() === '') return true; // Empty is valid
  
  // Check for DMS format: 0°00.0'00.00"
  const dmsRegex = /^\d+°\d+\.\d+'\d+\.\d+"$/;
  return dmsRegex.test(dms.trim());
};

/**
 * Converts weather conditions from string/number format to pure numbers for export
 * @param weatherConditions - Weather conditions with mixed string/number values
 * @returns Weather conditions with all numeric values as numbers
 */
export const normalizeWeatherConditionsForExport = (weatherConditions: any) => {
  if (!weatherConditions) return weatherConditions;
  
  const normalizeCondition = (condition: any) => ({
    windSpeed: {
      initial: parseDecimalInput(condition.windSpeed?.initial) || 0,
      final: parseDecimalInput(condition.windSpeed?.final) || 0,
    },
    windDirection: {
      initial: condition.windDirection?.initial || '',
      final: condition.windDirection?.final || '',
    },
    temperature: {
      initial: parseDecimalInput(condition.temperature?.initial) || 0,
      final: parseDecimalInput(condition.temperature?.final) || 0,
    },
    humidity: {
      initial: parseDecimalInput(condition.humidity?.initial) || 0,
      final: parseDecimalInput(condition.humidity?.final) || 0,
    },
    atmosphericPressure: {
      initial: parseDecimalInput(condition.atmosphericPressure?.initial) || 0,
      final: parseDecimalInput(condition.atmosphericPressure?.final) || 0,
    },
    precipitation: {
      initial: parseDecimalInput(condition.precipitation?.initial) || 0,
      final: parseDecimalInput(condition.precipitation?.final) || 0,
    },
  });

  return {
    diurnal: normalizeCondition(weatherConditions.diurnal),
    nocturnal: normalizeCondition(weatherConditions.nocturnal),
  };
};

/**
 * Calculates the logarithmic average of LAeq values
 * Formula: LAeq_total = 10 * log10((1/n) * Σ(10^(LAeq_i/10)))
 * @param values - Array of LAeq values in dB
 * @returns Logarithmic average in dB, rounded to 1 decimal place
 */
export const calculateLogarithmicAverage = (values: number[]): number => {
  if (!values || values.length === 0) return 0;
  
  // Filter out zero or invalid values
  const validValues = values.filter(value => value > 0);
  if (validValues.length === 0) return 0;
  
  // Calculate: (1/n) * Σ(10^(LAeq_i/10))
  const sumOfPowers = validValues.reduce((sum, value) => {
    return sum + Math.pow(10, value / 10);
  }, 0);
  
  const meanPower = sumOfPowers / validValues.length;
  
  // Calculate: 10 * log10(meanPower)
  const result = 10 * Math.log10(meanPower);
  
  // Round to 1 decimal place
  return Math.round(result * 10) / 10;
};