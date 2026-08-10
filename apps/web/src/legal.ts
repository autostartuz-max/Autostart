/**
 * HUJJATLAR UCHUN REKVIZITLAR — shu yerni to'ldiring.
 *
 * Bu qiymatlar uchala hujjatda (maxfiylik siyosati, foydalanish shartlari,
 * ommaviy oferta) avtomat ishlatiladi. Faqat shu faylni tahrirlang.
 *
 * To'ldirilmagan joylar saytda sariq rangda "[to'ldirilmagan]" bo'lib ko'rinadi —
 * shunda nima qolganini darrov ko'rasiz.
 */
export const TASHKILOT = {
  /** To'liq nomi, masalan: «AUTOSTART EDU» MChJ */
  nom: '',
  /** Soliq to'lovchining identifikatsiya raqami */
  stir: '',
  /** Yuridik manzil */
  manzil: '',
  /** Aloqa uchun pochta */
  pochta: '',
  /** Aloqa uchun telefon */
  telefon: '',
  /** Bank nomi */
  bank: '',
  /** Hisob raqami */
  hisob: '',
  /** MFO */
  mfo: '',
  /** Direktor F.I.Sh. */
  rahbar: '',
  /** Sayt manzili */
  sayt: 'autostart.uz',
  /** Hujjat oxirgi yangilangan sana */
  sana: '2026-yil 10-avgust',
};

/** Ma'lumotlar qancha saqlanadi (hujjatlarda ishlatiladi) */
export const SAQLASH_MUDDATI = 'hisob o‘chirilgunga qadar, o‘chirilgandan keyin 30 kun ichida butunlay yo‘q qilinadi';
