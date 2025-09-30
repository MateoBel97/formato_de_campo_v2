import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS } from '../constants';
import { MeasurementResults, MeasurementType, ScheduleType, Photo } from '../types';
import { calculateLogarithmicAverage, parseDecimalInput } from '../utils/numberUtils';

// Function to calculate logarithmic subtraction for emission studies
const calculateLogarithmicSubtraction = (values1: number[], values2: number[]): number => {
  if (values1.length === 0 || values2.length === 0) return 0;

  const avg1 = calculateLogarithmicAverage(values1);
  const avg2 = calculateLogarithmicAverage(values2);

  // Logarithmic subtraction: 10 * log10(10^(L1/10) - 10^(L2/10))
  const linear1 = Math.pow(10, avg1 / 10);
  const linear2 = Math.pow(10, avg2 / 10);

  if (linear1 <= linear2) {
    // If emission level is less than or equal to background, return 0 or a small negative value
    return 0;
  }

  const result = 10 * Math.log10(linear1 - linear2);
  return result;
};

interface ValidationResult {
  pointId: string;
  pointName: string;
  schedule: ScheduleType;
  measurementType: MeasurementType;
  logarithmicAverage: number;
  missingFields: string[];
  missingPhotos: string[];
  isComplete: boolean;
  hasData: boolean;
}

const validateMeasurementResult = (
  pointId: string,
  pointName: string,
  schedule: ScheduleType,
  result: MeasurementResults,
  photos: Photo[]
): ValidationResult => {
  const missingFields: string[] = [];
  const laeqValues: number[] = [];
  const emissionLaeqValues: number[] = [];
  const residualLaeqValues: number[] = [];
  const l90Values: number[] = [];
  let hasData = false;

  // Validate based on measurement type
  switch (result.type) {
    case 'emission':
      if (result.emission) {
        hasData = true;
        // Check emission intervals
        if (result.emission.emission.intervals > 0) {
          result.emission.emission.data.forEach((interval, index) => {
            const intervalMissing: string[] = [];

            if (!interval.soundLevel) {
              intervalMissing.push('Nivel sonoro');
            } else {
              emissionLaeqValues.push(parseDecimalInput(interval.soundLevel.toString()));
            }
            if (!interval.percentile90) {
              intervalMissing.push('Percentil 90');
            } else {
              l90Values.push(parseDecimalInput(interval.percentile90.toString()));
            }
            if (!interval.fileNumber) intervalMissing.push('Número de archivo');
            if (!interval.initialTime) intervalMissing.push('Hora inicial');
            if (!interval.finalTime) intervalMissing.push('Hora final');
            if (!interval.calibrationPre) intervalMissing.push('Calibración PRE');
            if (!interval.calibrationPost) intervalMissing.push('Calibración POST');
            if (!interval.calibrationPrePhoto) intervalMissing.push('Foto calibración PRE');
            if (!interval.calibrationPostPhoto) intervalMissing.push('Foto calibración POST');

            if (intervalMissing.length > 0) {
              missingFields.push(`Emisión - Intervalo ${index + 1}:\n${intervalMissing.map(field => `• ${field}`).join('\n')}`);
            }
          });
        }

        // Check residual intervals
        if (result.emission.residual.intervals > 0) {
          result.emission.residual.data.forEach((interval, index) => {
            const intervalMissing: string[] = [];

            if (!interval.soundLevel) {
              intervalMissing.push('Nivel sonoro');
            } else {
              residualLaeqValues.push(parseDecimalInput(interval.soundLevel.toString()));
            }
            if (!interval.percentile90) intervalMissing.push('Percentil 90');
            if (!interval.fileNumber) intervalMissing.push('Número de archivo');
            if (!interval.initialTime) intervalMissing.push('Hora inicial');
            if (!interval.finalTime) intervalMissing.push('Hora final');
            if (!interval.calibrationPre) intervalMissing.push('Calibración PRE');
            if (!interval.calibrationPost) intervalMissing.push('Calibración POST');
            if (!interval.calibrationPrePhoto) intervalMissing.push('Foto calibración PRE');
            if (!interval.calibrationPostPhoto) intervalMissing.push('Foto calibración POST');

            if (intervalMissing.length > 0) {
              missingFields.push(`Residual - Intervalo ${index + 1}:\n${intervalMissing.map(field => `• ${field}`).join('\n')}`);
            }
          });
        }
      } else {
        missingFields.push('Datos de emisión completos');
      }
      break;

    case 'ambient':
      if (result.ambient) {
        hasData = true;
        const directions = ['N', 'S', 'E', 'W', 'V'];
        directions.forEach(dir => {
          const levelKey = `level${dir}` as keyof typeof result.ambient;
          const fileKey = `fileNumber${dir}` as keyof typeof result.ambient;
          const calibrationPreKey = `calibrationPre${dir}` as keyof typeof result.ambient;
          const calibrationPostKey = `calibrationPost${dir}` as keyof typeof result.ambient;
          const calibrationPrePhotoKey = `calibrationPre${dir}Photo` as keyof typeof result.ambient;
          const calibrationPostPhotoKey = `calibrationPost${dir}Photo` as keyof typeof result.ambient;

          const directionMissing: string[] = [];

          if (!result.ambient![levelKey]) {
            directionMissing.push('Nivel');
          } else {
            laeqValues.push(parseDecimalInput(result.ambient![levelKey] as string));
          }
          if (!result.ambient![fileKey]) directionMissing.push('Número de archivo');
          if (!result.ambient![calibrationPreKey]) directionMissing.push('Calibración PRE');
          if (!result.ambient![calibrationPostKey]) directionMissing.push('Calibración POST');
          if (!result.ambient![calibrationPrePhotoKey]) directionMissing.push('Foto calibración PRE');
          if (!result.ambient![calibrationPostPhotoKey]) directionMissing.push('Foto calibración POST');

          if (directionMissing.length > 0) {
            missingFields.push(`Ambiental - Dirección ${dir}:\n${directionMissing.map(field => `• ${field}`).join('\n')}`);
          }
        });

        const generalMissing: string[] = [];
        if (!result.ambient.initialTimeN) generalMissing.push('Hora inicial');
        if (!result.ambient.finalTimeN) generalMissing.push('Hora final');

        if (generalMissing.length > 0) {
          missingFields.push(`Ambiental - General:\n${generalMissing.map(field => `• ${field}`).join('\n')}`);
        }
      } else {
        missingFields.push('Datos de ruido ambiental completos');
      }
      break;

    case 'immission':
      if (result.immission) {
        hasData = true;
        const immissionMissing: string[] = [];

        if (!result.immission.levelLeq) {
          immissionMissing.push('Nivel Leq');
        } else {
          laeqValues.push(parseDecimalInput(result.immission.levelLeq));
        }
        if (!result.immission.levelLmax) immissionMissing.push('Nivel Lmax');
        if (!result.immission.levelLmin) immissionMissing.push('Nivel Lmin');
        if (!result.immission.fileNumber) immissionMissing.push('Número de archivo');
        if (!result.immission.initialTime) immissionMissing.push('Hora inicial');
        if (!result.immission.finalTime) immissionMissing.push('Hora final');
        if (!result.immission.calibrationPre) immissionMissing.push('Calibración PRE');
        if (!result.immission.calibrationPost) immissionMissing.push('Calibración POST');
        if (!result.immission.calibrationPrePhoto) immissionMissing.push('Foto calibración PRE');
        if (!result.immission.calibrationPostPhoto) immissionMissing.push('Foto calibración POST');

        if (immissionMissing.length > 0) {
          missingFields.push(`Inmisión:\n${immissionMissing.map(field => `• ${field}`).join('\n')}`);
        }
      } else {
        missingFields.push('Datos de inmisión completos');
      }
      break;

    case 'sonometry':
      if (result.sonometry) {
        hasData = true;
        const sonometryMissing: string[] = [];

        if (!result.sonometry.levelLeq) {
          sonometryMissing.push('Nivel Leq');
        } else {
          laeqValues.push(parseDecimalInput(result.sonometry.levelLeq));
        }
        if (!result.sonometry.levelLmax) sonometryMissing.push('Nivel Lmax');
        if (!result.sonometry.levelLmin) sonometryMissing.push('Nivel Lmin');
        if (!result.sonometry.fileNumber) sonometryMissing.push('Número de archivo');
        if (!result.sonometry.initialTime) sonometryMissing.push('Hora inicial');
        if (!result.sonometry.finalTime) sonometryMissing.push('Hora final');
        if (!result.sonometry.calibrationPre) sonometryMissing.push('Calibración PRE');
        if (!result.sonometry.calibrationPost) sonometryMissing.push('Calibración POST');
        if (!result.sonometry.calibrationPrePhoto) sonometryMissing.push('Foto calibración PRE');
        if (!result.sonometry.calibrationPostPhoto) sonometryMissing.push('Foto calibración POST');

        if (sonometryMissing.length > 0) {
          missingFields.push(`Sonometría:\n${sonometryMissing.map(field => `• ${field}`).join('\n')}`);
        }
      } else {
        missingFields.push('Datos de sonometría completos');
      }
      break;
  }

  const missingPhotos = getMissingPhotos(pointId, schedule, photos, result.type);

  // Calculate logarithmic average based on measurement type
  let logarithmicAverage = 0;

  if (result.type === 'emission') {
    // For emission studies, calculate logarithmic subtraction
    if (residualLaeqValues.length > 0) {
      // If residual measurements exist, subtract residual from emission
      logarithmicAverage = calculateLogarithmicSubtraction(emissionLaeqValues, residualLaeqValues);
    } else if (l90Values.length > 0) {
      // If no residual measurements, subtract L90 from emission LAeq
      logarithmicAverage = calculateLogarithmicSubtraction(emissionLaeqValues, l90Values);
    } else {
      // If no background measurements, just show emission average
      logarithmicAverage = calculateLogarithmicAverage(emissionLaeqValues);
    }
  } else {
    // For other measurement types, use regular logarithmic average
    logarithmicAverage = calculateLogarithmicAverage(laeqValues);
  }

  return {
    pointId,
    pointName,
    schedule,
    measurementType: result.type,
    logarithmicAverage,
    missingFields,
    missingPhotos,
    isComplete: missingFields.length === 0 && missingPhotos.length === 0,
    hasData,
  };
};

const getMissingPhotos = (
  pointId: string,
  schedule: ScheduleType,
  photos: Photo[],
  measurementType: MeasurementType
): string[] => {
  const missingPhotos: string[] = [];

  // Check for point photo
  const pointPhoto = photos.find(
    photo => photo.pointId === pointId && photo.schedule === schedule && photo.type === 'measurement'
  );
  if (!pointPhoto) {
    missingPhotos.push('Foto del punto de medición');
  }

  // Check calibration photos (these are embedded in measurement results)
  // For now, we'll assume they might be missing since the structure is complex
  // This would need to be refined based on the actual calibration photo storage

  return missingPhotos;
};

interface ResultsSummaryScreenProps {
  onNavigateToResults: () => void;
  onNavigateToPhotoRegistry: () => void;
}

const ResultsSummaryScreen: React.FC<ResultsSummaryScreenProps> = ({ onNavigateToResults, onNavigateToPhotoRegistry }) => {
  const { state, setNavigationSelection } = useMeasurement();
  const { currentFormat } = state;

  const validationResults = useMemo(() => {
    if (!currentFormat) return [];

    const results: ValidationResult[] = [];
    const { measurementPoints, measurementResults, photos, technicalInfo } = currentFormat;

    // Get all possible point-schedule combinations based on technical info
    const schedules: ScheduleType[] = [];
    if (technicalInfo.schedule.diurnal) schedules.push('diurnal');
    if (technicalInfo.schedule.nocturnal) schedules.push('nocturnal');

    measurementPoints.forEach(point => {
      schedules.forEach(schedule => {
        // Find measurement result for this point-schedule combination
        const measurementResult = measurementResults.find(
          result => result.pointId === point.id && result.schedule === schedule
        );

        if (measurementResult) {
          const validation = validateMeasurementResult(
            point.id,
            point.name,
            schedule,
            measurementResult,
            photos
          );
          results.push(validation);
        } else {
          // Create empty validation for missing results
          results.push({
            pointId: point.id,
            pointName: point.name,
            schedule,
            measurementType: technicalInfo.measurementType,
            logarithmicAverage: 0,
            missingFields: ['Datos de medición completos'],
            missingPhotos: getMissingPhotos(point.id, schedule, [], technicalInfo.measurementType),
            isComplete: false,
            hasData: false,
          });
        }
      });
    });

    // Add global validation for croquis photos
    const croquisPhotos = photos.filter(photo => photo.type === 'croquis');
    if (croquisPhotos.length === 0) {
      // Add a special entry for missing croquis photos
      results.push({
        pointId: 'croquis',
        pointName: 'Croquis del Área',
        schedule: 'diurnal', // Just for UI purposes
        measurementType: technicalInfo.measurementType,
        logarithmicAverage: 0,
        missingFields: [],
        missingPhotos: ['Foto del croquis del área'],
        isComplete: false,
        hasData: false,
      });
    } else {
      // Add a special entry showing croquis is complete
      results.push({
        pointId: 'croquis',
        pointName: 'Croquis del Área',
        schedule: 'diurnal', // Just for UI purposes
        measurementType: technicalInfo.measurementType,
        logarithmicAverage: 0,
        missingFields: [],
        missingPhotos: [],
        isComplete: true,
        hasData: true,
      });
    }

    return results;
  }, [currentFormat]);

  const getScheduleColor = (schedule: ScheduleType) => {
    return schedule === 'diurnal' ? COLORS.diurnal : COLORS.nocturnal;
  };

  const getScheduleLabel = (schedule: ScheduleType) => {
    return schedule === 'diurnal' ? 'Diurno' : 'Nocturno';
  };

  const getMeasurementTypeLabel = (type: MeasurementType) => {
    const labels = {
      emission: 'Emisión',
      ambient: 'Ambiental',
      immission: 'Inmisión',
      sonometry: 'Sonometría',
    };
    return labels[type];
  };

  const handleNavigateToPoint = (pointId: string, schedule: ScheduleType) => {
    // Don't navigate for croquis
    if (pointId === 'croquis') return;

    // Set the navigation selection in context
    setNavigationSelection(pointId, schedule);

    // Navigate to the measurement results page
    onNavigateToResults();
  };

  const handleNavigateToPhotoRegistry = () => {
    // Navigate to photo registry page
    onNavigateToPhotoRegistry();
  };

  const renderValidationCard = (validation: ValidationResult) => {
    const scheduleColor = getScheduleColor(validation.schedule);
    const isCroquis = validation.pointId === 'croquis';

    return (
      <View key={`${validation.pointId}-${validation.schedule}`} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.pointInfo}>
            <View style={styles.pointNameRow}>
              {validation.isComplete ? (
                <Feather name="check-circle" size={20} color={COLORS.success} />
              ) : (
                <Feather name="alert-circle" size={20} color={COLORS.warning} />
              )}
              <Text style={styles.pointName}>{validation.pointName}</Text>
            </View>
            {!isCroquis && (
              <View style={[styles.scheduleTag, { backgroundColor: scheduleColor }]}>
                <Text style={styles.scheduleTagText}>
                  {getScheduleLabel(validation.schedule)}
                </Text>
              </View>
            )}
          </View>
          {!isCroquis ? (
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={() => handleNavigateToPoint(validation.pointId, validation.schedule)}
            >
              <Text style={styles.navigationButtonText}>Ir al punto</Text>
              <Feather name="arrow-right" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={handleNavigateToPhotoRegistry}
            >
              <Text style={styles.navigationButtonText}>Ir a RF</Text>
              <Feather name="camera" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {!isCroquis && (
          <View style={styles.measurementTypeRow}>
            <Text style={styles.measurementTypeLabel}>
              {getMeasurementTypeLabel(validation.measurementType)}
            </Text>
          </View>
        )}

        {!isCroquis && validation.hasData && validation.logarithmicAverage > 0 && (
          <View style={styles.averageContainer}>
            <Text style={styles.averageLabel}>
              {validation.measurementType === 'emission'
                ? 'Nivel de Emisión Corregido:'
                : 'Promedio Logarítmico LAeq:'}
            </Text>
            <Text style={styles.averageValue}>
              {validation.logarithmicAverage.toFixed(1)} dB
            </Text>
          </View>
        )}

        {validation.isComplete ? (
          <View style={styles.completeContainer}>
            <Feather name="check" size={16} color={COLORS.success} />
            <Text style={styles.completeText}>
              {isCroquis ? 'Croquis registrado' : 'Todos los campos completos'}
            </Text>
          </View>
        ) : (
          <View style={styles.incompleteContainer}>
            <Text style={styles.incompleteTitle}>Campos faltantes:</Text>
            {validation.missingFields.map((field, index) => (
              <View key={index} style={styles.missingGroupContainer}>
                <Feather name="minus" size={12} color={COLORS.error} />
                <Text style={styles.missingGroupText}>{field}</Text>
              </View>
            ))}
            {validation.missingPhotos.map((photo, index) => (
              <View key={`photo-${index}`} style={styles.missingFieldRow}>
                <Feather name="camera" size={12} color={COLORS.error} />
                <Text style={styles.missingFieldText}>{photo}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const completeCount = validationResults.filter(v => v.isComplete).length;
  const totalCount = validationResults.length;

  if (!currentFormat) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Feather name="file-text" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No hay formato activo</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Resumen de Resultados</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryText}>
                {completeCount} de {totalCount} elementos completos
              </Text>
              <Text style={styles.percentageText}>
                {totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: totalCount > 0 ? `${(completeCount / totalCount) * 100}%` : '0%',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {validationResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="bar-chart" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              No hay puntos de medición configurados
            </Text>
            <Text style={styles.emptySubtext}>
              Configure los puntos de medición y la información técnica para ver el resumen
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {validationResults.map(renderValidationCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryContainer: {
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
    marginLeft: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  cardsContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pointInfo: {
    flex: 1,
    gap: 8,
  },
  pointNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scheduleTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  scheduleTagText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  navigationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusContainer: {
    marginLeft: 16,
  },
  measurementTypeRow: {
    marginBottom: 12,
  },
  measurementTypeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  averageContainer: {
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  averageLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  averageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  completeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 8,
  },
  completeText: {
    color: COLORS.success,
    fontWeight: '500',
  },
  incompleteContainer: {
    gap: 8,
  },
  incompleteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: 4,
  },
  missingFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  missingFieldText: {
    fontSize: 13,
    color: COLORS.error,
    flex: 1,
  },
  missingGroupContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 8,
    marginVertical: 2,
  },
  missingGroupText: {
    fontSize: 13,
    color: COLORS.error,
    flex: 1,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ResultsSummaryScreen;