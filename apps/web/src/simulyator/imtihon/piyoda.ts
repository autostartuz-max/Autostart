import { type V, masofa, oraliq } from '../asos/geom';
import type { PiyodaYoli } from '../dunyo/turlar';

/** Tartibga solinmagan o'tish joyidagi piyoda: kutadi → mashina yaqinlashganda o'tadi → o'tib bo'ldi */
export class Piyoda {
  holat: 'yoq' | 'kutyapti' | 'otyapti' | 'otdi' = 'yoq';
  p: V = { x: 0, y: 0 };
  th = 0;
  /** Yurish animatsiyasi fazasi */
  faza = 0;
  /** O'tib bo'lganiga necha soniya */
  otganiga = 0;
  private a: V = { x: 0, y: 0 };
  private b: V = { x: 0, y: 0 };
  private t = 0;
  private tezlik = 1.3;

  boshla(yol: PiyodaYoli, tomon: 1 | -1) {
    this.a = tomon > 0 ? yol.a : yol.b;
    this.b = tomon > 0 ? yol.b : yol.a;
    this.p = this.a;
    this.th = Math.atan2(this.b.y - this.a.y, this.b.x - this.a.x);
    this.t = 0;
    this.otganiga = 0;
    this.tezlik = 1.15 + Math.random() * 0.3;
    this.holat = 'kutyapti';
  }

  yoq() { this.holat = 'yoq'; }

  yur() { if (this.holat === 'kutyapti') this.holat = 'otyapti'; }

  qadam(dt: number) {
    if (this.holat === 'otyapti') {
      this.t += (dt * this.tezlik) / Math.max(0.1, masofa(this.a, this.b));
      this.faza += dt * 7.5;
      if (this.t >= 1) { this.t = 1; this.holat = 'otdi'; }
      this.p = oraliq(this.a, this.b, this.t);
    } else if (this.holat === 'otdi') this.otganiga += dt;
  }
}
