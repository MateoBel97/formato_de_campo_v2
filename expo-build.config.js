// Configuration for Expo build targeting Windows/Web
module.exports = {
  web: {
    build: {
      babel: {
        include: ['node_modules/react-native-web'],
      },
    },
    bundler: 'metro',
  },
};