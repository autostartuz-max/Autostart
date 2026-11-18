/**
 * AVTODROM SIMULYATORI — sozlamalar.
 *
 * Mashq maydonlari: Vazirlar Mahkamasining 3494-son qarori (01.02.2024, 2-ilova, "B" toifa chizmalari)
 * va "Toshkent imtihon markazi"ning mashqlar ketma-ketligi. Avtodromda tezlik 20 km/soat
 * (o'lchov xatosi 5 km/soat), "Tezlashish bo'lagi"da 40 km/soat.
 *
 * JARIMA BALLARI: rasmiy jadval ochiq e'lon qilinmagan — quyidagilar TAXMINIY. Haqiqiy jadval
 * olingach faqat shu yerda o'zgartiriladi. 100 ball va undan ko'p — imtihon yiqilgan.
 */

/** Mashina (Chevrolet Cobalt o'lchamlariga yaqin), metr */
export const MASHINA = {
  uzunlik: 4.48,
  eni: 1.735,
  balandlik: 1.47,
  bazasi: 2.62, // old va orqa o'q orasi
  koleya: 1.48, // chap va o'ng g'ildirak orasi
  oldiOsilma: 0.95, // old o'qdan old bamperigacha
  orqaOsilma: 0.91, // orqa o'qdan orqa bamperigacha
  gildirakR: 0.31,
  maxGildirakBurchak: (35 * Math.PI) / 180,
  rulAylanish: 540, // rul bir tomonga necha gradus buriladi (1,5 aylanish)
};

/** Uzatmalar: eng katta tezlik (m/s) va tortish kuchi (m/s²) */
export type Uzatma = 'R' | 'N' | '1' | '2';
export const UZATMALAR: Record<Exclude<Uzatma, 'N'>, { max: number; kuch: number }> = {
  R: { max: 9 / 3.6, kuch: 1.8 },
  '1': { max: 24 / 3.6, kuch: 2.6 },
  '2': { max: 48 / 3.6, kuch: 2.1 },
};
/** Gaz bosilmasa ham uzatmada sekin siljish (avtomat qutidagidek) — yangi boshlovchiga qulay */
export const SILJISH_TEZLIGI = 4 / 3.6;

export const TEZLIK_CHEGARA = 20; // km/soat
export const TEZLIK_OLCHOV_XATOSI = 5; // km/soat

export interface JarimaTuri {
  ball: number;
  nom: string;
}

/** TAXMINIY jarima ballari (rasmiy jadval kelganda almashtiriladi) */
export const JARIMALAR = {
  kamar: { ball: 20, nom: 'Xavfsizlik kamari taqilmagan' },
  chiroqStart: { ball: 10, nom: 'Harakatni boshlashda chap burilish ko‘rsatkichi yoqilmagan' },
  tezlik: { ball: 10, nom: 'Ruxsat etilgan tezlikdan oshirildi' },
  bordyur: { ball: 20, nom: 'Bordyurga tegildi' },
  chiziq: { ball: 10, nom: 'G‘ildirak chegara chizig‘ini bosdi' },
  finish: { ball: 10, nom: 'Finish maydonida to‘xtamadi' },
} satisfies Record<string, JarimaTuri>;
export type JarimaKodi = keyof typeof JARIMALAR;

/** Shuncha ball yig'ilsa — imtihon yiqilgan */
export const YIQILISH_BALLI = 100;
