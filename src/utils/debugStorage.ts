import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { documentDirectory } from 'expo-file-system/legacy';
import { getPhotosDirectory } from './imageUtils';

/**
 * Función de depuración para ver el contenido actual de AsyncStorage
 * Imprime en consola los datos guardados
 */
export const debugPrintStorage = async () => {
  console.log('==================== DEBUG STORAGE ====================');

  try {
    // Obtener formatos guardados
    const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
    console.log('\n📦 MEASUREMENT_FORMATS:');
    if (savedFormatsJson) {
      const formats = JSON.parse(savedFormatsJson);
      console.log(`   Total formats: ${formats.length}`);
      formats.forEach((format: any, index: number) => {
        console.log(`\n   Format ${index + 1}:`);
        console.log(`     ID: ${format.id}`);
        console.log(`     Company: ${format.generalInfo?.company || 'N/A'}`);
        console.log(`     Measurement Type: ${format.technicalInfo?.measurementType || 'N/A'}`);
        console.log(`     Updated: ${format.updatedAt || 'N/A'}`);
        console.log(`     Points: ${format.measurementPoints?.length || 0}`);
        console.log(`     Photos: ${format.photos?.length || 0}`);
      });
    } else {
      console.log('   (vacío)');
    }

    // Obtener formato actual
    const currentFormatJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_FORMAT);
    console.log('\n📝 CURRENT_FORMAT:');
    if (currentFormatJson) {
      const currentFormat = JSON.parse(currentFormatJson);
      console.log(`   ID: ${currentFormat.id}`);
      console.log(`   Company: ${currentFormat.generalInfo?.company || 'N/A'}`);
      console.log(`   Measurement Type: ${currentFormat.technicalInfo?.measurementType || 'N/A'}`);
      console.log(`   Updated: ${currentFormat.updatedAt || 'N/A'}`);
      console.log(`   Points: ${currentFormat.measurementPoints?.length || 0}`);
      console.log(`   Photos: ${currentFormat.photos?.length || 0}`);
    } else {
      console.log('   (vacío)');
    }

  } catch (error) {
    console.error('❌ Error reading storage:', error);
  }

  console.log('\n=======================================================\n');
};

/**
 * Función de depuración para exportar todo el contenido de AsyncStorage a un archivo JSON
 */
export const debugExportStorage = async (): Promise<string> => {
  try {
    const savedFormatsJson = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_FORMATS);
    const currentFormatJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_FORMAT);

    const exportData = {
      timestamp: new Date().toISOString(),
      savedFormats: savedFormatsJson ? JSON.parse(savedFormatsJson) : null,
      currentFormat: currentFormatJson ? JSON.parse(currentFormatJson) : null,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting storage:', error);
    throw error;
  }
};

/**
 * Función para mostrar detalles específicos del tipo de medición
 */
export const debugMeasurementType = async () => {
  console.log('========== DEBUG MEASUREMENT TYPE ==========');

  try {
    const currentFormatJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_FORMAT);

    if (currentFormatJson) {
      const currentFormat = JSON.parse(currentFormatJson);
      const techInfo = currentFormat.technicalInfo;

      console.log('\n🔍 Technical Info:');
      console.log('   Raw object:', JSON.stringify(techInfo, null, 2));
      console.log('\n   Measurement Type:', techInfo?.measurementType);
      console.log('   Type of measurementType:', typeof techInfo?.measurementType);
      console.log('   Is defined?', techInfo?.measurementType !== undefined);
      console.log('   Is null?', techInfo?.measurementType === null);
      console.log('   Is empty string?', techInfo?.measurementType === '');

      console.log('\n   Schedule:');
      console.log('     Diurnal:', techInfo?.schedule?.diurnal);
      console.log('     Nocturnal:', techInfo?.schedule?.nocturnal);

      console.log('\n   Sound Meter:');
      console.log('     Selected:', techInfo?.soundMeter?.selected);
      console.log('     Other:', techInfo?.soundMeter?.other);

      console.log('\n   Scanning Method:', techInfo?.scanningMethod);
    } else {
      console.log('❌ No current format in storage');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n============================================\n');
};

/**
 * Función para mostrar las rutas de almacenamiento
 */
export const debugShowStoragePaths = async () => {
  console.log('========== STORAGE PATHS ==========');

  try {
    console.log('\n📂 Document Directory:');
    console.log('   ', documentDirectory);

    const photosDir = await getPhotosDirectory();
    console.log('\n📸 Photos Directory:');
    console.log('   ', photosDir);

    console.log('\n💾 AsyncStorage:');
    console.log('    AsyncStorage no tiene una ruta de archivo accesible.');
    console.log('    Los datos se guardan en una base de datos interna.');
    console.log('    Keys usadas:');
    console.log('      -', STORAGE_KEYS.MEASUREMENT_FORMATS);
    console.log('      -', STORAGE_KEYS.CURRENT_FORMAT);

  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n===================================\n');
};
