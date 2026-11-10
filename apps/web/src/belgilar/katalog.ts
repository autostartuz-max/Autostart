/**
 * Yo'l belgilari katalogi — Yo'l harakati qoidalari (O'zR VM 2022-yil 12-apreldagi 172-son qarori),
 * 1-ilova "Yo'l belgilari": toifalar, raqam, nom va tavsif aynan qarordagidek.
 * Rasmlar public/belgi-rasm/ da (manbalari — public/belgi-rasm/MANBA.txt).
 */
import data from './belgilar.json';

export interface BelgiRasm {
  raqam: string;
  /** public/belgi-rasm/ ichidagi fayl; rasm topilmagan bo'lsa null */
  fayl: string | null;
}
export interface Belgi {
  toifa: number;
  /** "1.1", "1.11.1, 1.11.2" yoki "1.4.1 — 1.4.6" */
  raqam: string;
  nom: string;
  tavsif: string;
  rasmlar: BelgiRasm[];
}
export interface Toifa {
  n: number;
  nom: string;
  tavsif: string;
}

export const TOIFALAR = data.toifalar as Toifa[];
export const BELGILAR = data.belgilar as Belgi[];

/** Rasm manzili (saytda ham, ilovada ham ildizdan) */
export const belgiRasm = (fayl: string) => `${(import.meta as any).env?.BASE_URL || '/'}belgi-rasm/${fayl}`;
