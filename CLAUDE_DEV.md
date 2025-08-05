# CLAUDE Development Guide

This file provides development guidance for the Formato de Campo V2 React Native application.

## Development Commands

- **Start development server**: `npm start` or `expo start`
- **Run on Android**: `npm run android` or `expo start --android`  
- **Run on iOS**: `npm run ios` or `expo start --ios`
- **Run on Web**: `npm run web` or `expo start --web`
- **Install dependencies**: `npm install --legacy-peer-deps`

## Architecture Overview

### Technology Stack
- **Framework**: React Native with Expo ~53.0.0
- **Language**: TypeScript
- **Navigation**: React Navigation v6 with Drawer Navigation
- **State Management**: React Context API + useReducer
- **Storage**: AsyncStorage for local persistence
- **Forms**: Formik + Yup validation
- **UI Components**: Custom components with green theme
- **Location**: expo-location for GPS coordinates
- **File System**: expo-file-system and expo-sharing for exports

### Project Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Main application screens
├── navigation/         # Navigation configuration
├── context/           # Global state management
├── types/             # TypeScript type definitions
├── constants/         # App constants and configurations
└── utils/             # Utility functions
```

### Key Features Implemented
1. **Navigation System**: Collapsible drawer menu with icons
2. **Home Screen**: Create new format / View saved formats
3. **General Information**: Company, date, work order, supervisor
4. **Measurement Points**: Dynamic list with GPS integration
5. **Form Components**: Input, picker, date picker, location picker
6. **Data Persistence**: AsyncStorage with JSON structure
7. **State Management**: Context API with reducer pattern

### Development Status

#### ✅ Completed
- Project setup and dependencies
- Navigation system with drawer menu
- TypeScript types and interfaces
- Context API state management
- Reusable form components
- Home screen and saved formats screen
- General information screen (fully functional)
- Measurement points screen (fully functional)
- Basic AsyncStorage integration

#### 🚧 Placeholder Screens Created
- Weather conditions screen
- Technical information screen
- Measurement results screen
- Qualitative data screen
- External events screen
- Export functionality screen

#### 📋 Next Steps
- Complete weather conditions form with initial/final values for diurnal/nocturnal
- Implement technical information with equipment dropdowns
- Build dynamic measurement results forms based on measurement type
- Create qualitative data text areas
- Implement external events management with time picker
- Add comprehensive export and sharing functionality

### Important Notes
- Use `--legacy-peer-deps` flag when installing packages
- GPS permissions required for location functionality
- All data stored locally using AsyncStorage
- Export format: `${company}_${date}_OT-${type}-${number}-${year}.json`