import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.family.gps',
  appName: 'Family GPS',
  // Static shell που περιέχει index.html — το Capacitor απαιτεί ένα webDir
  // με index.html για να τρέξει `npx cap sync`. Ο WebView στην πράξη
  // φορτώνει από το `server.url` παρακάτω (published URL).
  webDir: 'mobile-shell',
  server: {
    url: 'https://family-tracker-spot.lovable.app',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
