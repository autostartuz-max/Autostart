import { useEffect, useState } from 'react';

/**
 * Tarif holati (ilova va sayt bir xil): joriy tarif darajasi va media kaliti.
 * /api/me va /api/tarif javoblaridan yoziladi (api.ts). Bu faqat ko'rinish uchun:
 * haqiqiy ruxsatni server tekshiradi (audio/video manzilidagi ?k= kalit, apps/api/src/tarif.ts).
 *
 * Daraja: 0 — tarifsiz (faqat testlar), 1 — Standart, 2 — Silver, 3 — Premium.
 */
export type TarifKod = 'standart' | 'silver' | 'premium';
export type Imkoniyat = 'audio' | 'belgilar' | 'video' | 'mavzu' | 'avtodrom';

export interface Tarif {
  kod: TarifKod;
  nom: string;
  narx: number;
  oy: number;
  daraja: number;
  imkoniyatlar: string[];
}

export interface TarifHolat {
  daraja: number;
  joriy: { kod: TarifKod; nom: string; tugaydi: string } | null;
  kalit: string;
  /** Kalit qachon olingan (ms) — 24 soatda eskiradi, oldinroq yangilanadi */
  olingan?: number;
}

/** Server bilan bir xil (apps/api/src/tarif.ts) */
export const IMKONIYAT_DARAJA: Record<Imkoniyat, number> = { audio: 1, belgilar: 1, video: 2, mavzu: 3, avtodrom: 3 };
export const IMKONIYAT_TARIF: Record<Imkoniyat, TarifKod> = {
  audio: 'standart', belgilar: 'standart', video: 'silver', mavzu: 'premium', avtodrom: 'premium',
};
export const IMKONIYAT_NOMI: Record<Imkoniyat, string> = {
  audio: 'Audio sharh',
  belgilar: 'Yo‘l belgilari va qidiruv',
  video: 'Video darslar',
  mavzu: 'Mavzu bo‘yicha video darslar',
  avtodrom: 'Avtodrom amaliy mashg‘ulotlari',
};
export const TARIF_NOMI: Record<TarifKod, string> = { standart: 'Standart', silver: 'Silver', premium: 'Premium' };

/** Server javobi kelguncha (yoki internet yo'q bo'lsa) ko'rsatiladigan ro'yxat — server bilan bir xil */
export const TARIFLAR_ZAXIRA: Tarif[] = [
  {
    kod: 'standart', nom: 'Standart', narx: 59000, oy: 3, daraja: 1,
    imkoniyatlar: [
      'Har bir testga Autostart mutaxassislari tayyorlagan audio sharh',
      'Yo‘l belgilari va ularni qulay qidiruv orqali ma’lumotlardan, sharhlardan foydalanish',
      'Ushbu tarifdan 3 oy muddatgacha foydalanish',
    ],
  },
  {
    kod: 'silver', nom: 'Silver', narx: 99000, oy: 3, daraja: 2,
    imkoniyatlar: [
      'Har bir testga Autostart mutaxassislari tayyorlagan audio sharh',
      'Yo‘l belgilari va ularni qulay qidiruv orqali ma’lumotlardan, sharhlardan foydalanish',
      'Autostart tajribali ustozlari tomonidan har bir testga yozilgan video darslar',
      'Ushbu tarifdan 3 oy muddatgacha foydalanish',
    ],
  },
  {
    kod: 'premium', nom: 'Premium', narx: 119000, oy: 6, daraja: 3,
    imkoniyatlar: [
      'Har bir testga Autostart mutaxassislari tayyorlagan audio sharh',
      'Yo‘l belgilari va ularni qulay qidiruv orqali ma’lumotlardan, sharhlardan foydalanish',
      'Autostart tajribali ustozlari tomonidan har bir testga yozilgan video darslar',
      'Ustozlarimiz zarur mavzularga tayyorlagan video darslar (tez orada)',
      'Autostart avtodromida mutaxassislar tomonidan tayyorlangan A, B, BC, D, CE toifalar uchun imtihon amaliy mashg‘ulotlari',
      'Ushbu tarifdan 6 oy muddatgacha foydalanish',
    ],
  },
];

export const TOLOV_KONTAKT_ZAXIRA = { telefon: '78 555 07 17', tel: '+998785550717' };

const KALIT = 'yhq_tarif';
export const TARIF_OZGARDI = 'tarif:ozgardi';

function oqi(): TarifHolat {
  try {
    const r = JSON.parse(localStorage.getItem(KALIT) || 'null');
    if (r && typeof r.daraja === 'number') return r;
  } catch { /* buzilgan yozuv */ }
  return { daraja: 0, joriy: null, kalit: '' };
}

let holat: TarifHolat = oqi();

/** /me yoki /tarif javobidagi tarif qismini yozish */
export function tarifniYoz(t: { daraja?: number; joriy?: TarifHolat['joriy']; kalit?: string } | null | undefined) {
  if (!t || typeof t.daraja !== 'number') return;
  // Kalit har /me javobida yangi keladi. Daraja o'zgarmagan va eski kalit hali yangi (6 soatdan kam) bo'lsa —
  // eskisi qoladi: aks holda audio/video manzili o'zgarib, ijro etilayotgan video boshidan boshlanardi.
  const eskisiYaroqli = !!holat.kalit && !!holat.olingan && Date.now() - holat.olingan < 6 * 3600_000 && holat.daraja === t.daraja;
  const yangi: TarifHolat = eskisiYaroqli
    ? { daraja: t.daraja, joriy: t.joriy ?? null, kalit: holat.kalit, olingan: holat.olingan }
    : { daraja: t.daraja, joriy: t.joriy ?? null, kalit: t.kalit || '', olingan: Date.now() };
  const ozgardi = yangi.daraja !== holat.daraja || yangi.kalit !== holat.kalit || yangi.joriy?.kod !== holat.joriy?.kod
    || yangi.joriy?.tugaydi !== holat.joriy?.tugaydi;
  holat = yangi;
  try { localStorage.setItem(KALIT, JSON.stringify(yangi)); } catch { /* joy yo'q */ }
  if (ozgardi) {
    try { window.dispatchEvent(new Event(TARIF_OZGARDI)); } catch { /* ignore */ }
  }
}

/** Chiqishda — boshqa foydalanuvchi kirsa avvalgisining tarifi qolmasin */
export function tarifniTozala() {
  holat = { daraja: 0, joriy: null, kalit: '' };
  try { localStorage.removeItem(KALIT); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(TARIF_OZGARDI)); } catch { /* ignore */ }
}

export const tarifHolati = () => holat;

/** Kalit 6 soatdan eski bo'lsa — yangilash kerak (24 soatda eskiradi) */
export const kalitEskirdimi = () => !holat.kalit || !holat.olingan || Date.now() - holat.olingan > 6 * 3600_000;

/** Imkoniyat ochiqmi (namuna holatlari alohida tekshiriladi) */
export const ruxsat = (i: Imkoniyat) => holat.daraja >= IMKONIYAT_DARAJA[i];

/** Himoyalangan media manziliga kalit qo'shish (audio sharh, video darslar) */
export function kalitli(u: string): string;
export function kalitli(u: string | null | undefined): string | undefined;
export function kalitli(u: string | null | undefined) {
  if (!u) return u ?? undefined;
  if (!holat.kalit) return u;
  return u + (u.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(holat.kalit);
}

/** Komponentlar uchun: tarif o'zgarsa qayta chiziladi */
export function useTarif() {
  const [h, setH] = useState<TarifHolat>(holat);
  useEffect(() => {
    const f = () => setH(holat);
    f();
    window.addEventListener(TARIF_OZGARDI, f);
    return () => window.removeEventListener(TARIF_OZGARDI, f);
  }, []);
  return h;
}

/* ── Tarif taklifi oynasi: istalgan joydan chaqiriladi, App ichidagi <TarifTaklif /> ko'rsatadi ── */
export const TARIF_TAKLIF = 'tarif:taklif';
export function tarifTaklif(imkoniyat: Imkoniyat) {
  try { window.dispatchEvent(new CustomEvent(TARIF_TAKLIF, { detail: { imkoniyat } })); } catch { /* ignore */ }
}

/** 59000 → "59 000 so‘m" */
export const narxMatn = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' so‘m';

/** "2027-02-21T…" → "21.02.2027" */
export const sanaMatn = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
