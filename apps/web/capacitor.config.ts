import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Mobil ilova (App Store / Play Market) sozlamasi.
 *
 * Web fayllar `dist` dan olinadi va ilova ichiga joylanadi — ya'ni interfeys
 * telefonda, ma'lumot esa https://autostart.uz/api dan keladi (.env.mobile).
 * `appId` do'konlarda o'zgarmas identifikator — bir marta chiqqach o'zgartirib
 * bo'lmaydi.
 */
const config: CapacitorConfig = {
  appId: 'uz.autostart.app',
  appName: 'Autostart',
  webDir: 'dist',
  android: {
    backgroundColor: '#0f1117',
  },
  ios: {
    backgroundColor: '#0f1117',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0f1117',
      showSpinner: false,
      launchAutoHide: true,
      launchShowDuration: 1200,
    },
    StatusBar: {
      style: 'DARK', // oq matnli status bar (qorong'i fon uchun)
      backgroundColor: '#0f1117',
    },
  },
};

export default config;
