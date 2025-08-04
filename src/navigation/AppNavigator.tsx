import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import SavedFormatsScreen from '../screens/SavedFormatsScreen';
import DrawerNavigator from './DrawerNavigator';

export type RootStackParamList = {
  Home: undefined;
  SavedFormats: undefined;
  MeasurementForm: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SavedFormats" component={SavedFormatsScreen} />
      <Stack.Screen name="MeasurementForm" component={DrawerNavigator} />
    </Stack.Navigator>
  );
};

export default AppNavigator;