import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
import PhotoRegistryScreen from '../screens/PhotoRegistryScreen';
import ExportScreen from '../screens/ExportScreen';

interface TabNavigatorProps {
  navigation?: any;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = React.useState('GeneralInfo');
  const { state: measurementState } = useMeasurement();

  const getIcon = (iconName: string, iconType: string, focused: boolean) => {
    const color = focused ? COLORS.surface : COLORS.surface + '80';
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
        return <InspectionScreen />;
      case 'MeasurementResults':
        return <MeasurementResultsScreen />;
      case 'QualitativeData':
        return <QualitativeDataScreen />;
      case 'ExternalEvents':
        return <ExternalEventsScreen />;
      case 'PhotoRegistry':
        return <PhotoRegistryScreen />;
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
            
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.tab,
                  focused && styles.activeTab,
                ]}
                onPress={() => setActiveTab(item.name)}
              >
                {getIcon(item.icon, item.iconType, focused)}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  content: {
    flex: 1,
  },
});

export default DrawerNavigator;