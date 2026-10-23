import type { ExpoConfig } from 'expo/config';

// Gizli anahtar bu dosyaya yazılmaz. EXPO_PUBLIC_* değerleri .env dosyasından okunur
// ve istemciye gömülür; bu yüzden yalnızca herkese açık (anon) değerler kullanılmalıdır.
const config: ExpoConfig = {
  name: 'GÜVENDE',
  slug: 'guvende',
  scheme: 'guvende',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#030B14',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.guvende.mobile',
  },
  android: {
    package: 'app.guvende.mobile',
    adaptiveIcon: {
      backgroundColor: '#030B14',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.POST_NOTIFICATIONS',
    ],
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.WRITE_CONTACTS', 'android.permission.RECORD_AUDIO'],
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    '@maplibre/maplibre-react-native',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'GÜVENDE, size yakın depremleri, toplanma alanlarını ve mesafeleri göstermek için konumunuzu kullanır. Konumunuz siz paylaşmadıkça kimseyle paylaşılmaz.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Bildiriminize fotoğraf eklemek için galeri erişimi gerekir.',
        cameraPermission: 'Bildiriminize fotoğraf çekmek için kamera erişimi gerekir.',
        microphonePermission: false,
      },
    ],
    ['expo-notifications', { color: '#1683FF' }],
    ['expo-local-authentication', { faceIDPermission: 'GÜVENDE uygulama kilidini Face ID ile açmanız için.' }],
    ['expo-contacts', { contactsPermission: 'Acil durum kişilerinizi rehberden seçebilmeniz için. Kişiler yalnızca bu cihazda saklanır.' }],
    // Düdük, ekran kilitliyken de çalabilsin; mikrofon kullanılmaz.
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: true }],
    './plugins/withKandilliCleartext',
  ],
  experiments: { typedRoutes: true },
};

export default config;
