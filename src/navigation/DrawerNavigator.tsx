import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useMeasurement } from '../context/MeasurementContext';
import { COLORS, DRAWER_ITEMS } from '../constants';

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

  const restrictedPages = ['MeasurementResults', 'QualitativeData', 'ExternalEvents', 'PhotoRegistry', 'ResultsSummary', 'Export'];

  const isTechnicalInfoComplete = () => {
    const technicalInfo = measurementState.currentFormat?.technicalInfo;
    if (!technicalInfo) return false;
    
    return !!(
      technicalInfo.measurementType &&
      (technicalInfo.schedule.diurnal || technicalInfo.schedule.nocturnal) &&
      technicalInfo.soundMeter.selected &&
      (technicalInfo.soundMeter.selected !== 'other' || technicalInfo.soundMeter.other) &&
      technicalInfo.calibrator.selected &&
      (technicalInfo.calibrator.selected !== 'other' || technicalInfo.calibrator.other) &&
      technicalInfo.weatherStation.selected &&
      (technicalInfo.weatherStation.selected !== 'other' || technicalInfo.weatherStation.other) &&
      technicalInfo.scanningMethod
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

  const canAccessPage = (pageName: string) => {
    if (!restrictedPages.includes(pageName)) return true;
    return isTechnicalInfoComplete() && areAllInspectionFieldsTrue();
  };

  const showAccessDeniedAlert = () => {
    Alert.alert(
      'Acceso Restringido',
      'Para acceder a esta sección debe:\n\n• Completar y guardar toda la información técnica\n• Marcar como completados todos los campos de inspección previa',
      [{ text: 'Entendido', style: 'default' }]
    );
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
                    showAccessDeniedAlert();
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