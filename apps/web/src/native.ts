/**
 * Mobil ilova (Capacitor) uchun sozlashlar.
 *
 * Brauzerda hech narsa qilmaydi — `Capacitor.isNativePlatform()` false bo'lsa
 * funksiya darrov qaytadi. Shuning uchun bitta kod bazasi ham saytda, ham
 * App Store/Play Market ilovasida ishlayveradi.
 */
import { Capacitor } from '@capacitor/core';
import { navbatniYubor } from './api';

/**
 * Faqat ishlab chiqishda (npm run dev): brauzerda ilova ko'rinishini sinash.
 * localStorage'da yhq_ilova_preview=1 bo'lsa brauzer o'zini ilova deb biladi.
 * Production build'da import.meta.env.DEV = false — bu kod umuman ishlamaydi.
 */
const ilovaSinovi = () => {
  try {
    return !!(import.meta as any).env?.DEV && localStorage.getItem('yhq_ilova_preview') === '1';
  } catch {
    return false;
  }
};

/** Ilova ichidamizmi (App Store / Play Market build'i) */
export const mobilIlova = () => Capacitor.isNativePlatform() || ilovaSinovi();

export async function initNative() {
  // Tarmoq tiklanganda offline yechilgan javoblar serverga jo'natiladi.
  // Bu brauzerda ham kerak — shuning uchun native tekshiruvdan oldin turadi.
  window.addEventListener('online', () => { navbatniYubor(); });
  navbatniYubor();

  if (!mobilIlova()) return;

  // Notch va pastki chiziq ostiga kontent kirib ketmasligi uchun
  document.documentElement.classList.add('cap');

  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);

  // Qorong'i fon — status bar matni oq bo'lsin
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#0f1117' }).catch(() => {});

  // Android'dagi "orqaga" tugmasi: sahifa bo'lsa orqaga, bosh sahifada esa
  // ilovadan chiqadi (aks holda oq ekranda qotib qoladi).
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.location.pathname !== '/') window.history.back();
    else App.exitApp();
  });

  // Ilova orqa fondan qaytganda ham kutayotgan javoblarni jo'natamiz
  App.addListener('resume', () => { navbatniYubor(); });

  SplashScreen.hide().catch(() => {});
}
