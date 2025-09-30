import * as FileSystem from 'expo-file-system';
import {
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  copyAsync
} from 'expo-file-system/legacy';
import { MeasurementFormat } from '../types';

export const generateFileName = (format: MeasurementFormat, type: string): string => {
  const { company, date, workOrder } = format.generalInfo;
  const sanitizedCompany = company.replace(/[^a-zA-Z0-9]/g, '_');
  const orderCode = `${workOrder.type}-${workOrder.number}-${workOrder.year}`;
  return `${sanitizedCompany}_${date}_OT-${orderCode}_${type}`;
};

export const createDirectoryIfNotExists = async (path: string): Promise<void> => {
  try {
    const dirInfo = await getInfoAsync(path);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(path, { intermediates: true });
    }
  } catch (error) {
    await makeDirectoryAsync(path, { intermediates: true });
  }
};

export const cleanupTempDirectory = async (path: string): Promise<void> => {
  try {
    await deleteAsync(path, { idempotent: true });
  } catch (error) {
    console.warn('No se pudo limpiar directorio temporal:', error);
  }
};

export const copyFileWithErrorHandling = async (from: string, to: string): Promise<boolean> => {
  try {
    await copyAsync({ from, to });
    return true;
  } catch (error) {
    console.warn(`No se pudo copiar archivo de ${from} a ${to}:`, error);
    return false;
  }
};