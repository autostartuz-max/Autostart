/**
 * HUJJATLAR UCHUN REKVIZITLAR — shu yerni to'ldiring.
 *
 * Bu qiymatlar uchala hujjatda (maxfiylik siyosati, foydalanish shartlari,
 * ommaviy oferta) avtomat ishlatiladi. Faqat shu faylni tahrirlang.
 *
 * Rekvizitlar jadvalida bo'sh qiymatli qatorlar ko'rsatilmaydi; matn ichidagi bo'sh joy
 * (nom, telefon, pochta) saytda sariq "[to'ldirilmagan]" bo'lib ko'rinadi.
 *
 * 2026-11-24: tashkilot «IZDOSH ACADEMY» NTM ga almashtirildi (davlat ro'yxatidan o'tganlik guvohnomasi
 * bo'yicha). Eski «Mingchinor avto ustoz» MCHJ ning bank rekvizitlari, IFUT va rahbari olib tashlandi —
 * yangi tashkilotniki berilganda shu yerga yoziladi.
 */
export const TASHKILOT = {
  /** To'liq nomi (guvohnoma bo'yicha) */
  nom: '«IZDOSH ACADEMY» nodavlat ta’lim muassasasi',
  /** Qisqartirilgan nomi */
  qisqaNom: '«IZDOSH ACADEMY» NTM',
  /** Tashkiliy-huquqiy shakli */
  shakl: 'Nodavlat ta’lim muassasasi',
  /** Soliq to'lovchining identifikatsiya raqami */
  stir: '311 193 593',
  /** Davlat ro'yxatidan o'tkazilgan sana, raqam va organ */
  royxat: '26.03.2024, № 2419064 (Quva tumani Davlat xizmatlari markazi)',
  /** Faoliyat yuritadigan manzil */
  manzil: 'Farg‘ona viloyati, Quva tumani, Qaqir MFY, Begat ko‘chasi, 14-uy',
  /** Aloqa uchun pochta */
  pochta: 'autostart.uz@gmail.com',
  /** Aloqa uchun telefon */
  telefon: '+998 78 555 07 17',
  /** Bank nomi (yangi tashkilotniki hali berilmagan) */
  bank: '',
  /** Hisob raqami (x/r) */
  hisob: '',
  /** MFO */
  mfo: '',
  /** IFUT (faoliyat turi kodi) */
  ifut: '',
  /** Rahbar F.I.Sh. */
  rahbar: '',
  /** Sayt manzili */
  sayt: 'autostart.uz',
  /** Hujjat oxirgi yangilangan sana */
  sana: '2026-yil 24-noyabr',
};

/** Ma'lumotlar qancha saqlanadi (hujjatlarda ishlatiladi) */
export const SAQLASH_MUDDATI = 'hisob o‘chirilgunga qadar, o‘chirilgandan keyin 30 kun ichida butunlay yo‘q qilinadi';
