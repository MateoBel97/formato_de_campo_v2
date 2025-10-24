import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS, DRAWER_ITEMS } from '../constants';
import ConfirmDialog from '../components/ConfirmDialog';

import GeneralInfoScreen from '../screens/GeneralInfoScreen';
import MeasurementPointsScreen from '../screens/MeasurementPointsScreen';
import WeatherConditionsScreen from '../screens/WeatherConditionsScreen';
import TechnicalInfoScreen from '../screens/TechnicalInfoScreen';
import InspectionScreen from '../screens/InspectionScreen';
import MeasurementResultsScreen from '../screens/MeasurementResultsScreen';
import QualitativeDataScreen from '../screens/QualitativeDataScreen';
import ExternalEventsScreen from '../screens/ExternalEventsScreen';
import PhotoRegistryScreen, { PhotoRegistryScreenRef } from '../screens/PhotoRegistryScreen';
import ResultsSummaryScreen from '../screens/ResultsSummaryScreen';
import ExportScreen from '../screens/ExportScreen';

interface TabNavigatorProps {
  navigation?: any;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = React.useState('GeneralInfo');
  const { state: measurementState } = useMeasurement();
  const photoRegistryRef = useRef<PhotoRegistryScreenRef>(null);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');

  const restrictedPages = ['MeasurementPoints', 'WeatherConditions', 'TechnicalInfo', 'Inspection', 'MeasurementResults', 'QualitativeData', 'ExternalEvents', 'PhotoRegistry', 'ResultsSummary', 'Export'];

  const isTechnicalInfoComplete = () => {
    const technicalInfo = measurementState.currentFormat?.technicalInfo;
    if (!technicalInfo) return false;

    // scanningMethod is only required for emission measurement type
    const scanningMethodValid = technicalInfo.measurementType !== 'emission' || !!technicalInfo.scanningMethod;

    // Check for new array-based structure
    const hasEquipment = technicalInfo.soundMeters && technicalInfo.calibrators && technicalInfo.weatherStations &&
      technicalInfo.soundMeters.length > 0 &&
      technicalInfo.calibrators.length > 0 &&
      technicalInfo.weatherStations.length > 0;

    // Check for old structure (for backward compatibility)
    const hasOldStructure = technicalInfo.soundMeter?.selected &&
      technicalInfo.calibrator?.selected &&
      technicalInfo.weatherStation?.selected;

    return !!(
      technicalInfo.measurementType &&
      (technicalInfo.schedule.diurnal || technicalInfo.schedule.nocturnal) &&
      (hasEquipment || hasOldStructure) &&
      scanningMethodValid
    );
  };

  const areAllInspectionFieldsTrue = () => {
    const inspection = measurementState.currentFormat?.inspection;
    if (!inspection) return false;

    return (
      inspection.pointAssignment &&
      inspection.calibrationVerification &&
      inspection.parametersVerification &&
      inspection.batteryStatus &&
      inspection.timeSynchronization &&
      inspection.weatherStationTests &&
      inspection.weatherConditionsRecord
    );
  };

  const areCalibrationAndVerificationComplete = () => {
    const currentFormat = measurementState.currentFormat;
    if (!currentFormat) return false;

    const measurementResults = currentFormat.measurementResults || [];
    const measurementPoints = currentFormat.measurementPoints || [];
    const schedules = ['diurnal', 'nocturnal'] as const;

    // If no measurement points, cannot export
    if (measurementPoints.length === 0) return false;

    // Check each point-schedule combination
    for (const point of measurementPoints) {
      for (const schedule of schedules) {
        // Skip if schedule not enabled
        if (schedule === 'diurnal' && !currentFormat.technicalInfo?.schedule.diurnal) continue;
        if (schedule === 'nocturnal' && !currentFormat.technicalInfo?.schedule.nocturnal) continue;

        const result = measurementResults.find(
          r => r.pointId === point.id && r.schedule === schedule
        );

        // If no data for this point-schedule, validation fails
        if (!result) return false;

        // Validate based on measurement type
        switch (result.type) {
          case 'emission':
            if (!result.emission) return false;

            // Must have at least emission intervals
            if (result.emission.emission.intervals === 0) return false;

            // Check emission intervals
            if (result.emission.emission.intervals > 0) {
              const firstInterval = result.emission.emission.data[0];
              const lastInterval = result.emission.emission.data[result.emission.emission.data.length - 1];

              if (!firstInterval?.calibrationPre || !firstInterval?.verificationPre) return false;
              if (!lastInterval?.calibrationPost || !lastInterval?.verificationPost) return false;
            }
            // Check residual intervals (if any)
            if (result.emission.residual.intervals > 0) {
              const firstResidual = result.emission.residual.data[0];
              const lastResidual = result.emission.residual.data[result.emission.residual.data.length - 1];

              if (!firstResidual?.calibrationPre || !firstResidual?.verificationPre) return false;
              if (!lastResidual?.calibrationPost || !lastResidual?.verificationPost) return false;
            }
            break;

          case 'ambient':
            if (!result.ambient) return false;

            // First direction (N) needs PRE, last direction (V) needs POST
            if (!result.ambient.calibrationPreN || !result.ambient.verificationPreN) return false;
            if (!result.ambient.calibrationPostV || !result.ambient.verificationPostV) return false;
            break;

          case 'immission':
            if (!result.immission) return false;

            // Both PRE and POST required
            if (!result.immission.calibrationPre || !result.immission.verificationPre) return false;
            if (!result.immission.calibrationPost || !result.immission.verificationPost) return false;
            break;

          case 'sonometry':
            if (!result.sonometry) return false;

            // Both PRE and POST required
            if (!result.sonometry.calibrationPre || !result.sonometry.verificationPre) return false;
            if (!result.sonometry.calibrationPost || !result.sonometry.verificationPost) return false;
            break;
        }
      }
    }

    return true;
  };

  const canAccessPage = (pageName: string) => {
    if (!restrictedPages.includes(pageName)) return true;

    // Check if general info has been saved
    const generalInfoSaved = measurementState.generalInfoSaved;

    console.log('🔐 [ACCESS] Checking access for:', pageName, {
      generalInfoSaved,
      currentFormatId: measurementState.currentFormat?.id,
      company: measurementState.currentFormat?.generalInfo?.company || 'EMPTY'
    });

    // Pages that require general info to be saved first
    const requiresGeneralInfoPages = ['MeasurementPoints', 'WeatherConditions', 'TechnicalInfo', 'Inspection'];
    if (requiresGeneralInfoPages.includes(pageName)) {
      return generalInfoSaved;
    }

    // Pages that require technical info and inspection
    const requiresTechnicalPages = ['MeasurementResults', 'QualitativeData', 'ExternalEvents', 'PhotoRegistry', 'ResultsSummary'];
    const baseRequirements = generalInfoSaved && isTechnicalInfoComplete() && areAllInspectionFieldsTrue();

    if (requiresTechnicalPages.includes(pageName)) {
      return baseRequirements;
    }

    // Export page has additional requirements
    if (pageName === 'Export') {
      return baseRequirements && areCalibrationAndVerificationComplete();
    }

    return true;
  };

  const showAccessDeniedAlert = (pageName: string) => {
    const requiresGeneralInfoPages = ['MeasurementPoints', 'WeatherConditions', 'TechnicalInfo', 'Inspection'];

    let message = '';

    if (requiresGeneralInfoPages.includes(pageName)) {
      message = 'Para acceder a esta sección debe:\n\n• Completar y guardar la información general usando el botón "Guardar información"';
    } else {
      message = 'Para acceder a esta sección debe:\n\n• Guardar la información general\n• Completar y guardar toda la información técnica\n• Marcar como completados todos los campos de inspección previa';

      if (pageName === 'Export') {
        message += '\n• Completar calibración PRE y verificación PRE del primer intervalo de cada punto-horario\n• Completar calibración POST y verificación POST del último intervalo de cada punto-horario';
      }
    }

    setAccessDeniedMessage(message);
    setShowAccessDialog(true);
  };

  const getIcon = (iconName: string, iconType: string, focused: boolean, isRestricted: boolean = false) => {
    let color = focused ? COLORS.primary : COLORS.surface + '80';
    if (isRestricted) {
      color = COLORS.surface + '40';
    }
    const size = 20;

    if (iconType === 'FontAwesome') {
      return <FontAwesome name={iconName as any} size={size} color={color} />;
    }
    return <Feather name={iconName as any} size={size} color={color} />;
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'GeneralInfo':
        return <GeneralInfoScreen />;
      case 'MeasurementPoints':
        return <MeasurementPointsScreen />;
      case 'WeatherConditions':
        return <WeatherConditionsScreen />;
      case 'TechnicalInfo':
        return <TechnicalInfoScreen />;
      case 'Inspection':
        return <InspectionScreen onContinue={() => setActiveTab('MeasurementResults')} />;
      case 'MeasurementResults':
        return <MeasurementResultsScreen />;
      case 'QualitativeData':
        return <QualitativeDataScreen />;
      case 'ExternalEvents':
        return <ExternalEventsScreen />;
      case 'PhotoRegistry':
        return <PhotoRegistryScreen ref={photoRegistryRef} />;
      case 'ResultsSummary':
        return <ResultsSummaryScreen
          onNavigateToResults={() => setActiveTab('MeasurementResults')}
          onNavigateToPhotoRegistry={() => {
            setActiveTab('PhotoRegistry');
            // Use setTimeout to ensure the tab is switched before scrolling
            setTimeout(() => {
              photoRegistryRef.current?.scrollToCroquis();
            }, 100);
          }}
          onNavigateToWeather={() => setActiveTab('WeatherConditions')}
        />;
      case 'Export':
        return <ExportScreen />;
      default:
        return <GeneralInfoScreen />;
    }
  };

  const getTitle = () => {
    const item = DRAWER_ITEMS.find(item => item.name === activeTab);
    return item?.title || 'Formato de Medición';
  };

  return (
    <View style={styles.container}>
      {/* Header con pestañas */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>
              {measurementState.currentFormat?.generalInfo.company || 'Nuevo Formato'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {getTitle()}
            </Text>
          </View>
          
          {/* Botón Home fijo en el lado derecho */}
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => {
              if (navigation) {
                navigation.navigate('Home');
              }
            }}
          >
            <Feather name="home" size={24} color={COLORS.surface} />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContainer}
        >
          {DRAWER_ITEMS.map((item) => {
            const focused = activeTab === item.name;
            const isRestricted = restrictedPages.includes(item.name);
            const canAccess = canAccessPage(item.name);
            
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.tab,
                  focused && styles.activeTab,
                  isRestricted && !canAccess && styles.restrictedTab,
                ]}
                onPress={() => {
                  if (canAccess) {
                    setActiveTab(item.name);
                  } else {
                    showAccessDeniedAlert(item.name);
                  }
                }}
              >
                {getIcon(item.icon, item.iconType, focused, isRestricted && !canAccess)}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenido de la pantalla activa */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      <ConfirmDialog
        visible={showAccessDialog}
        title="Acceso Restringido"
        message={accessDeniedMessage}
        confirmText="Entendido"
        onConfirm={() => setShowAccessDialog(false)}
        onCancel={() => setShowAccessDialog(false)}
        icon="alert-circle"
        confirmColor={COLORS.primary}
      />
    </View>
  );
};

// Wrapper component that captures navigation from the Stack Navigator
const DrawerNavigatorWrapper: React.FC<{ navigation: any }> = ({ navigation }) => {
  return <TabNavigator navigation={navigation} />;
};

// Export the wrapper as the default export
const DrawerNavigator = DrawerNavigatorWrapper;

const styles = StyleSheet.create({
  container: Platform.select({
    web: {
      height: '100vh',
      backgroundColor: COLORS.background,
      display: 'flex',
      flexDirection: 'column',
    },
    default: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
  }),
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 44, // Status bar height
    paddingBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.surface + 'CC',
    fontSize: 14,
    marginTop: 2,
  },
  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface + '30',
  },
  tabsScrollView: {
    marginTop: 8,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: COLORS.surface,
  },
  restrictedTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  content: Platform.select({
    web: {
      flex: 1,
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      height: 'calc(100vh - 120px)', // Subtract header height
    },
    default: {
      flex: 1,
    },
  }),
});

export default DrawerNavigator;