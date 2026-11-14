/**
 * ALOQA SAHIFASI MA'LUMOTLARI — shu yerni tahrirlang.
 * Telefon raqamlar, manzil va matnlar faqat shu fayldan o'zgartiriladi.
 */

export interface Telefon {
  raqam: string;
  /** Raqam yonida, shu qatorning o'zida chiqadigan manzil */
  manzil: string;
  /** true bo'lsa yashil WhatsApp belgisi bilan ko'rsatiladi */
  whatsapp?: boolean;
}

/** Yagona aloqa markazi (call markaz) — sahifada eng tepada, filiallardan alohida */
export const ALOQA_MARKAZI = { nom: 'Call markaz', raqam: '78 555 07 17' };

/** Bizning filiallarimiz (har biri o'z telefoni bilan) */
export const TELEFONLAR: Telefon[] = [
  { raqam: '94 039 11 11', manzil: 'Quva shahar sobiq avtobaza' },
  { raqam: '(33) 051-58-58', manzil: 'Farg‘ona shahar O‘lkashunoslik muzeyi' },
  { raqam: '(95) 838-07-17', manzil: 'Toshloq tumani pochta binosi 2-qavat' },
];

/** tel: havolasi — 9 xonali O'zbekiston raqamiga +998 qo'shiladi (har qanday telefondan qo'ng'iroq bo'lsin) */
export function telHavola(raqam: string): string {
  const r = raqam.replace(/\D/g, '');
  return 'tel:' + (r.length === 9 ? '+998' + r : r);
}

/** "«Autostart» avtomaktab haqida qisqacha" bo'limi */
export const HAQIDA = {
  sarlavha: '«Autostart» avtomaktab haqida qisqacha',
  bandlar: [
    'Autostart avtomaktab 2009-yilda Farg‘ona viloyati Quva tumanida tashkil etilgan.',
    '18 yildan ortiq tajribaga ega ishonchli avtomaktab hisoblanadi.',
    'Autostartda ko‘p yillik tajribaga ega ustozlar bo‘lajak haydovchilarga ta’lim berib kelishadi.',
    'Avtomaktab o‘zining avtodromi, avtomashinalari va moddiy-texnik bazasiga ega.',
    'Barcha filiallarimiz litsenziya talablari asosida faoliyat yuritadi.',
  ],
  talimSarlavha: 'Ta’lim',
  talim: [
    'Avtomaktabimizda zamonaviy metodlar asosida sifatli ta’lim beriladi.',
    'Amaliy mashg‘ulotlar imtihon markazi bilan birma-bir standart talablar asosida jihozlangan, litsenziyali avtodromimizda olib boriladi.',
    'Barcha toifalarda belgilangan nazariy va amaliy mashg‘ulotlarga 80% qatnashgan o‘quvchilarga imtihondan o‘tishlari kafolatlanadi.',
    'Ayol-qizlarimiz uchun alohida ayol instruktorlar faoliyat yuritadi.',
  ],
  shior: 'Autostart — professionallardan o‘rganing!',
};

/** Futerning eng pastki qatori: tovar belgisi guvohnomasi */
export const GUVOHNOMA = '«Autostart» © 2026. Tovar belgisi guvohnomasi № MGU 68484, 11.03.2026-yilda berilgan.';

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
