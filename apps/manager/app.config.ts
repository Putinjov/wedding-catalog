import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CAIT Bridal Manager',
  slug: 'cait-bridal-manager',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon-opaque.png',
  scheme: 'caitbridal-manager',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'ie.caitbridal.manager',
    icon: './assets/images/icon-opaque.png',
    supportsTablet: false,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FAF8F6',
      foregroundImage: './assets/images/adaptive-icon.png',
    },
    package: 'ie.caitbridal.manager',
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        color: '#7A5E78',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF8F6',
        image: './assets/images/icon.png',
        imageWidth: 140,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://caitbridal.ie',
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
})
