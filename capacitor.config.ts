import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.family.gps',
  appName: 'Family GPS',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https',
  },
};

export default config;
