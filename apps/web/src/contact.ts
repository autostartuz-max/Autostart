/**
 * ALOQA SAHIFASI MA'LUMOTLARI — shu yerni tahrirlang.
 * Telefon raqamlar, manzil va matnlar faqat shu fayldan o'zgartiriladi.
 */

export interface Telefon {
  raqam: string;
  izoh: string;
  /** true bo'lsa yashil WhatsApp belgisi bilan ko'rsatiladi */
  whatsapp?: boolean;
}

export const TELEFONLAR: Telefon[] = [
  { raqam: '94 039 11 11', izoh: 'Quva sh' },
  { raqam: '91 108 86 68', izoh: 'Quva' },
  { raqam: '(33) 051-58-58', izoh: 'Farg‘ona', whatsapp: true },
  { raqam: '(95) 838-07-17', izoh: 'Toshloq' },
];

export interface Manzil {
  /** Shahar / tuman nomi */
  shahar: string;
  /** Aniq joy */
  joy: string;
}

export const MANZILLAR: Manzil[] = [
  { shahar: 'Quva sh', joy: 'Sobiq avtobaza' },
  { shahar: 'Farg‘ona sh', joy: 'O‘lkashunoslik muzeyi' },
  { shahar: 'Toshloq tumani', joy: 'Pochta binosi, 2-qavat' },
];

/** "Nima uchun AUTOSTART avtomaktabi?" bo'limi */
export const AFZALLIKLAR = [
  'Ishsiz yoshlar va xotin-qizlar uchun',
  'Rasmiy guvohnoma va kafolat',
  'Sifatli ta’lim va amaliyot',
  'Ishonchli va xavfsiz ta’lim',
];

/** Uchta ma'lumot kartasi */
export const KARTALAR = [
  {
    sarlavha: 'Shu toifalarga to‘g‘ri keladi',
    matn: 'Shartnoma BHM × 8 barobari miqdorida.',
    rang: 'k' as const,
  },
  {
    sarlavha: 'To‘lov shartlari',
    matn: 'Ushbu summa davlatimiz tomonidan to‘lab beriladi.',
    rang: 's' as const,
  },
  {
    sarlavha: 'Sizdan endi',
    matn: 'B toifani 1 800 000 so‘mdan ko‘pi bilan 2 300 000 so‘m evaziga.',
    rang: 'v' as const,
  },
];

export const CTA = {
  yuqori: 'Kelajakdagi kasbingiz sari birinchi qadamni',
  past: '«AUTOSTART» bilan boshlang!',
};

/** Futer: tezkor havolalar */
export const FUTER_HAVOLALAR: { t: string; to: string }[] = [
  { t: 'Bosh sahifa', to: '/' },
  { t: 'Shablon testlar', to: '/shablon' },
  { t: 'Random testlar', to: '/random' },
  { t: 'Hujjatlar', to: '/hujjat/maxfiylik' },
];

/** Futerdagi qisqa tavsif */
export const FUTER_TAVSIF =
  'Sifatli ta’lim, amaliyot va kafolat bilan kelajagingizni biz bilan boshlang.';

/**
 * Ijtimoiy tarmoqlar. Bo'sh qoldirilsa belgisi ko'rsatilmaydi —
 * havolangiz bo'lsa shu yerga yozing.
 */
export const IJTIMOIY = {
  telegram: '',
  instagram: '',
};
