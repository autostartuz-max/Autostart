import { type V, lokal, yoyNuqtalari, bant, masofa, GRAD } from '../asos/geom';

/**
 * Yo'l markaziy chizig'ini "toshbaqa" usulida chizish: to'g'ri bo'lak va yoylar.
 * Yo'nalish — radian (0 = sharq, chapga burilish — musbat).
 */
export class Yol {
  n: V[];
  p: V;
  th: number;
  constructor(p: V, th: number) {
    this.p = p;
    this.th = th;
    this.n = [p];
  }
  /** To'g'ri L metr */
  togri(L: number) {
    this.p = lokal(this.p, this.th, L, 0);
    this.n.push(this.p);
    return this;
  }
  /** Joriy yo'nalish bo'ylab berilgan x (yoki y) koordinatagacha to'g'ri */
  xGacha(x: number) { return this.togri(Math.abs(x - this.p.x)); }
  yGacha(y: number) { return this.togri(Math.abs(y - this.p.y)); }
  /** Yoy: R radius, gradus (+ chapga, − o'ngga) */
  yoy(R: number, gradus: number) {
    const tomon = gradus >= 0 ? 1 : -1;
    const m = lokal(this.p, this.th, 0, tomon * R); // markaz: chapda yoki o'ngda
    const a0 = Math.atan2(this.p.y - m.y, this.p.x - m.x);
    const nuqt = yoyNuqtalari(m, R, a0, gradus * GRAD, 0.3);
    for (let i = 1; i < nuqt.length; i++) this.n.push(nuqt[i]);
    this.p = nuqt[nuqt.length - 1];
    this.th += gradus * GRAD;
    return this;
  }
  /** Ixtiyoriy nuqtaga to'g'ri (yo'nalish ham shunga o'zgaradi) */
  ga(q: V) {
    this.th = Math.atan2(q.y - this.p.y, q.x - this.p.x);
    this.p = q;
    this.n.push(q);
    return this;
  }
  /** Shu paytgacha chizilgan nuqtalardan nusxa va yangi boshlash (bo'laklarga ajratish uchun) */
  kesib(): V[] {
    const out = this.n;
    this.n = [this.p];
    return out;
  }
}

/** Yo'l bo'lagi ko'pburchagi: markaziy chiziq va eni */
export const yolBant = (ch: V[], eni: number) => bant(tozala(ch), eni / 2, eni / 2);

/** Yoy bandi (halqa sektori) — aniq: tashqi va ichki radius bo'yicha */
export function yoyBantAniq(m: V, r: number, a0: number, burilish: number, eni: number): V[] {
  const tashqi = yoyNuqtalari(m, r + eni / 2, a0, burilish, 0.3);
  const ichki = yoyNuqtalari(m, r - eni / 2, a0, burilish, 0.3);
  return [...tashqi, ...ichki.reverse()];
}

/** Ketma-ket juda yaqin nuqtalarni olib tashlash */
export function tozala(ch: V[]): V[] {
  const out: V[] = [];
  for (const p of ch) if (!out.length || masofa(out[out.length - 1], p) > 1e-3) out.push(p);
  return out;
}

/** To'g'ri to'rtburchak: [minX, minY, maxX, maxY] */
export const quti = (x0: number, y0: number, x1: number, y1: number): V[] => [
  { x: Math.min(x0, x1), y: Math.min(y0, y1) },
  { x: Math.max(x0, x1), y: Math.min(y0, y1) },
  { x: Math.max(x0, x1), y: Math.max(y0, y1) },
  { x: Math.min(x0, x1), y: Math.max(y0, y1) },
];

/** Uzuq chiziq bo'laklari (kesma bo'ylab): bo'lak uzunligi, oraliq, eni */
export function uzuqChiziq(a: V, b: V, eni: number, bolak: number, oraliq: number): V[][] {
  const L = masofa(a, b);
  const th = Math.atan2(b.y - a.y, b.x - a.x);
  const out: V[][] = [];
  for (let s = 0; s < L - 1e-6; s += bolak + oraliq) {
    const e = Math.min(L, s + bolak);
    out.push([lokal(a, th, s, -eni / 2), lokal(a, th, e, -eni / 2), lokal(a, th, e, eni / 2), lokal(a, th, s, eni / 2)]);
  }
  return out;
}

/** Kesma bo'ylab yaxlit chiziq (to'rtburchak) */
export function yaxlitChiziq(a: V, b: V, eni: number): V[] {
  const th = Math.atan2(b.y - a.y, b.x - a.x);
  const L = masofa(a, b);
  return [lokal(a, th, 0, -eni / 2), lokal(a, th, L, -eni / 2), lokal(a, th, L, eni / 2), lokal(a, th, 0, eni / 2)];
}
