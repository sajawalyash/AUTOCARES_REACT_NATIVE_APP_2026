const expoConfig = require('./app.json').expo;
const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  ...expoConfig,
  android: {
    ...expoConfig.android,
    config: {
      ...expoConfig.android?.config,
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  ios: {
    ...expoConfig.ios,
    config: {
      ...expoConfig.ios?.config,
      googleMapsApiKey: googleMapsApiKey,
    },
  },
  plugins: [
    ...expoConfig.plugins,
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
        iosGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
  ],
});

