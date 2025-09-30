const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web-specific optimizations
if (process.env.EXPO_PLATFORM === 'web') {
  // Add web-specific alias for better scroll handling
  config.resolver.alias = {
    ...config.resolver.alias,
    'react-native$': 'react-native-web',
  };

  // Add web-specific transformations
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-web/dist/babel'),
  };
}

module.exports = config;