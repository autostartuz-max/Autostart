import { type V, Panjara, chegara, ichida, kesishadi, lokal } from '../asos/geom';
import type { Boyoq, Estakada, Maydon } from '../dunyo/turlar';

export interface Devor { a: V; b: V; tur: 'bordyur' | 'tosiq' }

/** To'siq qalinligi (estakada yon to'siqlari) */
const TOSIQ = 0.3;

/**
 * Fizika uchun dunyo: to'qnashuv devorlari (bordyur, to'siqlar), xato hisoblanadigan bo'yoqlar,
 * yer balandligi (estakada). Panjara bilan tez so'rovlar.
 */
export class FizikDunyo {
  readonly devorlar = new Panjara<Devor>(4);
  readonly boyoqlar = new Panjara<Boyoq>(3);
  readonly estakadalar: Estakada[];

  constructor(readonly m: Maydon) {
    for (const h of m.chegaralar)
      for (let i = 0; i < h.length; i++) this.devor(h[i], h[(i + 1) % h.length], 'bordyur');
    this.estakadalar = m.estakadalar;
    for (const e of m.estakadalar) {
      const L = 2 * e.qiya + e.tepa;
      for (const tomon of [1, -1]) {
        const ich = (e.eni / 2) * tomon, tash = (e.eni / 2 + TOSIQ) * tomon;
        const a = lokal(e.boshi, e.th, 0, ich), b = lokal(e.boshi, e.th, L, ich);
        const c = lokal(e.boshi, e.th, L, tash), d = lokal(e.boshi, e.th, 0, tash);
        this.devor(a, b, 'tosiq'); this.devor(b, c, 'tosiq'); this.devor(c, d, 'tosiq'); this.devor(d, a, 'tosiq');
      }
    }
    for (const b of m.boyoqlar) {
      if (!b.xato) continue;
      const c = chegara(b.poly);
      this.boyoqlar.qosh(c.minX, c.minY, c.maxX, c.maxY, b);
    }
  }

  private devor(a: V, b: V, tur: Devor['tur']) {
    this.devorlar.qosh(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y), { a, b, tur });
  }

  /** Yer (yo'l) balandligi: estakadada ko'tariladi, boshqa joyda 0 */
  balandlik(p: V): number {
    for (const e of this.estakadalar) {
      const dx = p.x - e.boshi.x, dy = p.y - e.boshi.y;
      const c = Math.cos(e.th), s = Math.sin(e.th);
      const f = dx * c + dy * s, l = -dx * s + dy * c;
      const L = 2 * e.qiya + e.tepa;
      if (f < 0 || f > L || Math.abs(l) > e.eni / 2 + TOSIQ) continue;
      if (f < e.qiya) return f * e.qiyalik;
      if (f < e.qiya + e.tepa) return e.balandlik;
      return (L - f) * e.qiyalik;
    }
    return 0;
  }

  /** Kuzov (ko'pburchak) biror devorga tegadimi — birinchi tekkan devor */
  tegadimi(poly: V[]): Devor | null {
    const c = chegara(poly);
    const nomzod = this.devorlar.sorov(c.minX - 0.1, c.minY - 0.1, c.maxX + 0.1, c.maxY + 0.1);
    for (const d of nomzod) {
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (kesishadi(poly[j], poly[i], d.a, d.b)) return d;
      if (ichida(d.a, poly)) return d;
    }
    return null;
  }

  /** Nuqta (g'ildirak izi) xato bo'yoq ustidami */
  boyoqda(p: V): Boyoq | null {
    for (const b of this.boyoqlar.sorov(p.x, p.y, p.x, p.y)) if (ichida(p, b.poly)) return b;
    return null;
  }
}
