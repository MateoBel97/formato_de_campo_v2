import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { MeasurementFormat } from '../types';

/**
 * Check if Node.js fs module is available
 */
const isFsAvailable = (): boolean => {
  try {
    const fs = require('fs');
    return typeof fs.existsSync === 'function';
  } catch (error) {
    return false;
  }
};

/**
 * Check if we're running on Windows (even in web mode) WITH file system access
 */
export const isWindows = (): boolean => {
  // First check if fs module is available
  if (!isFsAvailable()) {
    return false;
  }

  // Check if we have access to Node.js process (only in Electron/Windows)
  if (typeof process !== 'undefined' && process.env && process.env.USERPROFILE) {
    return true;
  }

  // Check if we're in web mode on Windows
  if (Platform.OS === 'web') {
    // In browser, check user agent
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')) {
      // But only return true if we have fs access
      return isFsAvailable();
    }
  }

  // Check if it's native Windows
  if (Platform.OS === 'windows') {
    return true;
  }

  return false;
};

/**
 * Get the base directory for Windows storage
 */
export const getWindowsStorageBasePath = (): string => {
  // Use Documents folder
  const homeDir = process.env.USERPROFILE || 'C:\\Users\\Default';
  return `${homeDir}\\Documents\\Formato_Campo_V2\\Data\\`;
};

/**
 * Ensure directory exists (Windows only)
 */
const ensureDirectoryExists = (dirPath: string): void => {
  try {
    const fs = require('fs');

    // Simple path normalization without using path module
    const normalizedPath = dirPath.replace(/\//g, '\\').replace(/\\+/g, '\\');

    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log('📁 Created directory:', normalizedPath);
    }
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
};

/**
 * Save formats to JSON file (Windows)
 */
export const saveFormatsToFile = async (formats: MeasurementFormat[]): Promise<void> => {
  if (!isWindows()) return;

  try {
    const fs = require('fs');

    const basePath = getWindowsStorageBasePath();
    const formatosPath = `${basePath}Formatos\\`;

    ensureDirectoryExists(formatosPath);

    // Save each format as a separate file
    for (const format of formats) {
      const fileName = `${format.id}.json`;
      const filePath = `${formatosPath}${fileName}`;

      fs.writeFileSync(filePath, JSON.stringify(format, null, 2), 'utf8');
      console.log('💾 Saved format to file:', filePath);
    }

    // Also save all formats in a single file for backup
    const allFormatsPath = `${formatosPath}_all_formats.json`;
    fs.writeFileSync(allFormatsPath, JSON.stringify(formats, null, 2), 'utf8');

  } catch (error) {
    console.error('Error saving formats to file:', error);
    throw error;
  }
};

/**
 * Load formats from JSON files (Windows)
 */
export const loadFormatsFromFile = async (): Promise<MeasurementFormat[]> => {
  if (!isWindows()) return [];

  try {
    const fs = require('fs');

    const basePath = getWindowsStorageBasePath();
    const formatosPath = `${basePath}Formatos\\`;

    if (!fs.existsSync(formatosPath)) {
      console.log('Formatos directory does not exist yet');
      return [];
    }

    // Read all JSON files
    const files = fs.readdirSync(formatosPath);
    const formats: MeasurementFormat[] = [];

    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('_')) {
        const filePath = `${formatosPath}${file}`;
        const content = fs.readFileSync(filePath, 'utf8');
        const format = JSON.parse(content);
        formats.push(format);
      }
    }

    console.log(`📂 Loaded ${formats.length} formats from files`);
    return formats;

  } catch (error) {
    console.error('Error loading formats from file:', error);
    return [];
  }
};

/**
 * Sync AsyncStorage with file system (Windows)
 */
export const syncStorageToFiles = async (): Promise<void> => {
  if (!isWindows()) return;

  try {
    console.log('🔄 Syncing AsyncStorage to files...');

    const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);

    if (savedFormatsJson) {
      const formats = JSON.parse(savedFormatsJson);
      await saveFormatsToFile(formats);
      console.log('✅ Sync completed');
    } else {
      console.log('⚠️ No formats in AsyncStorage to sync');
    }

  } catch (error) {
    console.error('Error syncing storage:', error);
    throw error;
  }
};

/**
 * Get photos directory path (Windows)
 */
export const getWindowsPhotosDirectory = (): string => {
  const basePath = getWindowsStorageBasePath();
  const photosPath = `${basePath}Fotos\\`;

  ensureDirectoryExists(photosPath);

  return photosPath;
};

/**
 * Auto-sync every time formats are saved
 */
export const setupAutoSync = () => {
  if (!isWindows()) return;

  console.log('🔄 Auto-sync enabled for Windows');

  // You can set up listeners here if needed
  // For now, manual sync will be called after each save
};
