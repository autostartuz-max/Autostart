import { MASHINA, SILJISH_TEZLIGI, UZATMALAR, type Uzatma } from './sozlamalar';
import type { Nuqta } from './yol';

/** Haydovchi boshqaruvi (ekrandagi rul/pedallar yoki klaviatura) */
export interface Kirish {
  gaz: number; // 0..1
  tormoz: number; // 0..1
  rul: number; // gradus: + soat mili bo'yicha (o'ngga), −MASHINA.rulAylanish..+
  rulUshlangan: boolean; // barmoq/klavisha rulni ushlab turibdimi (qo'yib yuborilsa o'zi markazga qaytadi)
  uzatma: Uzatma;
  qolTormoz: boolean;
}

/** To'qnashuv chegarasi — kesma (bordyurning ichki qirrasi) */
export interface Kesma { a: Nuqta; b: Nuqta }

/**
 * Velosiped modeli (kinematik): orqa o'q markazi (x, z), yo'nalish yaw, tezlik v (m/s, orqaga — manfiy).
 * yaw tezligi = v / baza · tan(δ); δ > 0 — chapga.
 */
export class Mashina {
  x = 0;
  z = 0;
  yaw = 0;
  v = 0;
  delta = 0; // old g'ildiraklar burchagi (rad)
  gildirakAylanish = 0; // g'ildirak yurgan yo'l (aylanishini chizish uchun)
  urildi = false; // shu qadamda bordyurga tegdimi

  joyla(x: number, z: number, yaw: number) {
    this.x = x; this.z = z; this.yaw = yaw; this.v = 0; this.delta = 0; this.urildi = false;
  }

  /** Mashina tanasining markazi (orqa o'qdan oldinga) */
  get markaz(): Nuqta {
    const d = (MASHINA.bazasi + MASHINA.oldiOsilma - MASHINA.orqaOsilma) / 2;
    return { x: this.x + Math.sin(this.yaw) * d, z: this.z + Math.cos(this.yaw) * d };
  }

  get tezlikKmh() { return Math.abs(this.v) * 3.6; }

  /** G'ildiraklarning yerga tegish nuqtalari: [old-chap, old-o'ng, orqa-chap, orqa-o'ng] */
  gildiraklar(): Nuqta[] {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const k = MASHINA.koleya / 2;
    const nuqta = (oldinga: number, chapga: number) => ({ x: this.x + s * oldinga + c * chapga, z: this.z + c * oldinga - s * chapga });
    return [nuqta(MASHINA.bazasi, k), nuqta(MASHINA.bazasi, -k), nuqta(0, k), nuqta(0, -k)];
  }

  /** Bir qadam (dt soniya). Chegaralar berilsa — urilganda oldingi joyga qaytadi va to'xtaydi */
  qadam(dt: number, k: Kirish, chegaralar: Kesma[]) {
    // Rul qo'yib yuborilsa — harakatlanayotganda o'zi markazga qaytadi (haqiqiy mashinadagidek)
    if (!k.rulUshlangan && k.rul !== 0) {
      const q = 220 * Math.min(1, Math.abs(this.v) / 3) * dt;
      k.rul = Math.abs(k.rul) <= q ? 0 : k.rul - Math.sign(k.rul) * q;
    }
    this.delta = (-k.rul / MASHINA.rulAylanish) * MASHINA.maxGildirakBurchak;

    // Tezlanish
    let a = 0;
    const v = this.v;
    if (k.uzatma !== 'N') {
      const u = UZATMALAR[k.uzatma];
      const yon = k.uzatma === 'R' ? -1 : 1;
      const vYon = v * yon; // uzatma yo'nalishidagi tezlik
      if (k.gaz > 0) a += yon * k.gaz * u.kuch * Math.max(0, 1 - vYon / u.max);
      else if (k.tormoz < 0.05 && !k.qolTormoz && vYon < SILJISH_TEZLIGI) a += yon * 0.7 * (1 - Math.max(0, vYon) / SILJISH_TEZLIGI);
      // Teskari yo'nalishda dumalayotgan bo'lsa — dvigatel tormozlaydi
      if (vYon < -0.2) a += yon * 1.2;
    }
    const belgi = Math.sign(v);
    a -= belgi * (0.12 + 0.015 * v * v); // havo va dumalash qarshiligi
    a -= belgi * (7 * k.tormoz + (k.qolTormoz ? 4.5 : 0));

    let yangiV = v + a * dt;
    // Tormoz/qarshilik tezlikni teskari yo'nalishga o'tkazib yubormasin
    const tortadi = k.uzatma !== 'N' && (k.gaz > 0 || (k.tormoz < 0.05 && !k.qolTormoz));
    if (belgi !== 0 && Math.sign(yangiV) !== belgi && !(tortadi && Math.sign(yangiV) === (k.uzatma === 'R' ? -1 : 1))) yangiV = 0;
    if (Math.abs(yangiV) < 0.005 && (k.tormoz > 0.05 || k.qolTormoz || k.uzatma === 'N')) yangiV = 0;
    this.v = yangiV;

    // Harakat
    const oldin = { x: this.x, z: this.z, yaw: this.yaw };
    const yawTezlik = (this.v / MASHINA.bazasi) * Math.tan(this.delta);
    this.yaw += yawTezlik * dt;
    this.x += Math.sin(this.yaw) * this.v * dt;
    this.z += Math.cos(this.yaw) * this.v * dt;

    this.urildi = chegaralar.length > 0 && this.tegadimi(chegaralar);
    if (this.urildi) {
      this.x = oldin.x; this.z = oldin.z; this.yaw = oldin.yaw;
      this.v = 0;
    } else {
      this.gildirakAylanish += this.v * dt;
    }
  }

  /** Mashina tanasi (to'rtburchak) birorta kesmaga tegadimi */
  tegadimi(kesmalar: Kesma[]): boolean {
    const m = this.markaz;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const hl = MASHINA.uzunlik / 2 + 0.02, hw = MASHINA.eni / 2 + 0.02;
    // Nuqtani mashina koordinatasiga: u — oldinga, w — chapga
    const mahalliy = (p: Nuqta) => {
      const dx = p.x - m.x, dz = p.z - m.z;
      return { u: dx * s + dz * c, w: dx * c - dz * s };
    };
    const yaqin = (MASHINA.uzunlik + 2) ** 2;
    for (const k of kesmalar) {
      // Uzoqdagilarni tez tashlab ketish
      if ((k.a.x - m.x) ** 2 + (k.a.z - m.z) ** 2 > yaqin * 4 && (k.b.x - m.x) ** 2 + (k.b.z - m.z) ** 2 > yaqin * 4) continue;
      const A = mahalliy(k.a), B = mahalliy(k.b);
      if (kesmaTortburchak(A.u, A.w, B.u, B.w, hl, hw)) return true;
    }
    return false;
  }
}

/** Kesma [-hl,hl]×[-hw,hw] to'rtburchagini kesib o'tadimi (Liang–Barsky) */
function kesmaTortburchak(x0: number, y0: number, x1: number, y1: number, hx: number, hy: number): boolean {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 + hx, hx - x0, y0 + hy, hy - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
  }
  return true;
}
