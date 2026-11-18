import { JARIMALAR, TEZLIK_CHEGARA, TEZLIK_OLCHOV_XATOSI, YIQILISH_BALLI, type JarimaKodi } from './sozlamalar';
import type { Maydon } from './yol';

export interface Jarima { kod: JarimaKodi; nom: string; ball: number; vaqt: number }

/** Har qadamda imtihonga beriladigan holat */
export interface Holat {
  s: number; // mashina markazining yo'l bo'yicha masofasi
  sOld: number; // old bamperining masofasi (chiziqni kesib o'tganini bilish uchun)
  tezlikKmh: number;
  v: number; // m/s, orqaga — manfiy
  kamar: boolean;
  chapChiroq: boolean;
  urildi: boolean; // bordyurga tegdi
  chiziqda: boolean; // birorta g'ildirak sariq chegara chizig'ini bosdi
}

export type Bosqich = 'tayyor' | 'start' | 'ilon' | 'finish' | 'tugadi';

const BOSQICH_NOMI: Record<Bosqich, string> = {
  tayyor: 'Harakatni boshlash (Start)',
  start: 'Harakatni boshlash (Start)',
  ilon: 'Ilon izi',
  finish: 'Harakatni yakunlash (Finish)',
  tugadi: 'Mashq tugadi',
};

const KORSATMA: Record<Bosqich, string> = {
  tayyor: 'Kamarni taqing, chap burilish ko‘rsatkichini yoqing, qo‘l tormozini tushiring va 1-uzatmada harakatni boshlang',
  start: 'Tezlik 20 km/soatdan oshmasin. Oldinda — "Ilon izi"',
  ilon: 'Bordyur va sariq chiziqqa tegmasdan S shaklidagi yo‘lakdan o‘ting',
  finish: 'FINISH chizig‘idan o‘tib, to‘xtash maydonida to‘xtang',
  tugadi: '',
};

/**
 * Mashq qoidalari: holatni kuzatib xato (jarima) yozadi. Bir xato davom etsa — bir marta yoziladi;
 * holat tuzalgach (1 soniya) yana yozilishi mumkin.
 */
export class Imtihon {
  jarimalar: Jarima[] = [];
  bosqich: Bosqich = 'tayyor';
  vaqt = 0; // harakat boshlangandan beri, soniya
  private boshlandi = false;
  private toxtabTurish = 0;
  private qayta: Partial<Record<JarimaKodi, number>> = {}; // xato tuzalganidan beri o'tgan vaqt
  private faol: Partial<Record<JarimaKodi, boolean>> = {};
  onJarima?: (j: Jarima) => void;
  onTugadi?: (natija: Natija) => void;

  constructor(private maydon: Maydon) {}

  get jami() { return this.jarimalar.reduce((s, j) => s + j.ball, 0); }
  get bosqichNomi() { return BOSQICH_NOMI[this.bosqich]; }
  get korsatma() { return KORSATMA[this.bosqich]; }

  private yoz(kod: JarimaKodi) {
    const t = JARIMALAR[kod];
    const j: Jarima = { kod, nom: t.nom, ball: t.ball, vaqt: this.vaqt };
    this.jarimalar.push(j);
    this.onJarima?.(j);
    if (this.jami >= YIQILISH_BALLI) this.tugat();
  }

  /** Holat davom etayotgan xato — bir marta yoziladi, tuzalgach 1 s o'tsa qayta yozilishi mumkin */
  private kuzat(kod: JarimaKodi, bor: boolean, dt: number) {
    if (bor) {
      if (!this.faol[kod]) { this.faol[kod] = true; this.yoz(kod); }
      this.qayta[kod] = 0;
    } else if (this.faol[kod]) {
      this.qayta[kod] = (this.qayta[kod] || 0) + dt;
      if ((this.qayta[kod] || 0) > 1) this.faol[kod] = false;
    }
  }

  qadam(dt: number, h: Holat) {
    if ((this.bosqich as Bosqich) === 'tugadi') return; // yoz() tugatib qo'ygan bo'lishi mumkin
    const S = this.maydon.s;

    // Harakat boshlandi — kamar va chap burilish ko'rsatkichi tekshiriladi (bir marta)
    if (!this.boshlandi && h.tezlikKmh > 1) {
      this.boshlandi = true;
      if (!h.kamar) this.yoz('kamar');
      if (!h.chapChiroq) this.yoz('chiroqStart');
    }
    if (this.boshlandi) this.vaqt += dt;
    if ((this.bosqich as Bosqich) === 'tugadi') return; // yoz() tugatib qo'ygan bo'lishi mumkin

    // Bosqichlar — mashina old qismi chiziqlarni kesib o'tganda
    if (this.bosqich === 'tayyor' && h.sOld > S.start) this.bosqich = 'start';
    if (this.bosqich === 'start' && h.sOld > S.ilonBosh) this.bosqich = 'ilon';
    if (this.bosqich === 'ilon' && h.s > S.ilonOxir) this.bosqich = 'finish';

    this.kuzat('tezlik', h.tezlikKmh > TEZLIK_CHEGARA + TEZLIK_OLCHOV_XATOSI, dt);
    this.kuzat('bordyur', h.urildi, dt);
    this.kuzat('chiziq', h.chiziqda, dt);
    if ((this.bosqich as Bosqich) === 'tugadi') return; // yoz() tugatib qo'ygan bo'lishi mumkin

    // Finish: chiziqdan o'tib, to'xtash maydonida to'xtash kerak
    if (this.bosqich === 'finish' && h.sOld > S.finish) {
      this.toxtabTurish = Math.abs(h.v) < 0.1 ? this.toxtabTurish + dt : 0;
      if (this.toxtabTurish > 1) return this.tugat();
      if (h.sOld > S.toxtashOxir) { this.yoz('finish'); this.tugat(); }
    }
  }

  tugat() {
    if ((this.bosqich as Bosqich) === 'tugadi') return; // yoz() tugatib qo'ygan bo'lishi mumkin
    this.bosqich = 'tugadi';
    this.onTugadi?.({ jarimalar: [...this.jarimalar], jami: this.jami, vaqt: this.vaqt, otdi: this.jami < YIQILISH_BALLI });
  }
}

export interface Natija { jarimalar: Jarima[]; jami: number; vaqt: number; otdi: boolean }
