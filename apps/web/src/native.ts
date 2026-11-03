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
 * Manzilga ?ilova=1 qo'shilsa yoqiladi, ?ilova=0 — o'chiriladi (telefonda ham qulay).
 * Production build'da import.meta.env.DEV = false — bu kod umuman ishlamaydi.
 */
const ilovaSinovi = () => {
  try {
    if (!(import.meta as any).env?.DEV) return false;
    const q = new URLSearchParams(window.location.search).get('ilova');
    if (q === '1') localStorage.setItem('yhq_ilova_preview', '1');
    if (q === '0') localStorage.removeItem('yhq_ilova_preview');
    return localStorage.getItem('yhq_ilova_preview') === '1';
  } catch {
    return false;
  }
};

/** Ilova ichidamizmi (App Store / Play Market build'i) */
export const mobilIlova = () => Capacitor.isNativePlatform() || ilovaSinovi();

// Tizim chiziqlari (tepadagi soat qatori va pastki tugmalar) rangi: yangi ilova ekranlari
// (Bosh sahifa, Testlar, O'rganish, Profil — Ekran qobig'i) fonida #2B2A29, qolganlarida #0f1117.
const ODDIY_BAR = '#0f1117';
const ILV_BAR = '#2b2a29';
let ilvEkranlar = 0;
let barTaymer: ReturnType<typeof setTimeout> | undefined;
const joriyBar = () => (ilvEkranlar > 0 ? ILV_BAR : ODDIY_BAR);

async function barRangi(color: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [{ EdgeToEdge }, { StatusBar }] = await Promise.all([
      import('@capawesome/capacitor-android-edge-to-edge-support'),
      import('@capacitor/status-bar'),
    ]);
    EdgeToEdge.setBackgroundColor({ color }).catch(() => {});
    StatusBar.setBackgroundColor({ color }).catch(() => {});
  } catch { /* plagin bu platformada yo'q */ }
}

/** Ekran qobig'i ochilganda true, yopilganda false — tizim chiziqlari ekran rangiga moslanadi */
export function ilovaEkrani(ochiq: boolean) {
  ilvEkranlar = Math.max(0, ilvEkranlar + (ochiq ? 1 : -1));
  // Ekranlar orasida o'tganda (biri yopilib, keyingisi ochiladi) rang miltillamasin
  clearTimeout(barTaymer);
  barTaymer = setTimeout(() => { barRangi(joriyBar()); }, 30);
}

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
  StatusBar.setBackgroundColor({ color: joriyBar() }).catch(() => {});
  if (ilvEkranlar > 0) barRangi(ILV_BAR);

  // Android'dagi "orqaga" tugmasi: sahifa bo'lsa orqaga, bosh sahifada esa
  // ilovadan chiqadi (aks holda oq ekranda qotib qoladi).
  App.addListener('backButton', ({ canGoBack }) => {
    // Ochiq oyna (pastki oyna, til tanlash) bo'lsa — avval o'sha yopiladi.
    // Oyna 'ilova:orqaga' hodisasini preventDefault() qilsa, shu yerda to'xtaymiz.
    if (!window.dispatchEvent(new Event('ilova:orqaga', { cancelable: true }))) return;
    if (window.location.pathname === '/') App.exitApp();
    else if (canGoBack) window.history.back();
    // Tarix yo'q (ilova shu sahifada ochilgan) — chiqib ketmasdan bosh sahifaga (App.tsx tinglaydi)
    else window.dispatchEvent(new Event('ilova:bosh'));
  });

  // Ilova orqa fondan qaytganda ham kutayotgan javoblarni jo'natamiz
  App.addListener('resume', () => { navbatniYubor(); });

  SplashScreen.hide().catch(() => {});
}
