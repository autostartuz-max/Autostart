import { type V, GRAD, chekla, lokal } from '../asos/geom';
import type { MashinaTuri, Uzatma } from '../mashinalar';
import type { Devor, FizikDunyo } from './dunyo';

/** Haydovchi boshqaruvi (pedallar, rul, uzatma, qo'l tormozi) */
export interface Boshqaruv {
  gaz: number;          // 0..1
  tormoz: number;       // 0..1
  rul: number;          // rul g'ildiragi burchagi, gradus (+ soat mili bo'yicha = o'ngga)
  rulUshlangan: boolean;
  uzatma: Uzatma;
  qolTormoz: boolean;
}

export type Hodisa =
  | { tur: 'urildi'; tezlik: number; devor: Devor }
  | { tur: 'ochdi'; sabab: 'ikkinchi' | 'qolTormoz' | 'urilish' | 'uzatma' }
  | { tur: 'uzatmaXato' };

const G = 9.81;
const MUFTA = 0.05;        // sirpanayotgan mufta: N·m har bir ayl/min farqiga
const SALT_MOMENT = 26;    // salt regulyatori bera oladigan moment, N·m
const FOYDALI = 0.9;       // transmissiya FIK

/** Moment egri chizig'idan chiziqli interpolyatsiya */
function moment(t: MashinaTuri, ayl: number): number {
  const m = t.moment;
  if (ayl <= m[0][0]) return m[0][1];
  for (let i = 1; i < m.length; i++)
    if (ayl <= m[i][0]) {
      const [a0, t0] = m[i - 1], [a1, t1] = m[i];
      return t0 + ((t1 - t0) * (ayl - a0)) / (a1 - a0);
    }
  return m[m.length - 1][1];
}

/**
 * Avtomobil: kinematik "velosiped" modeli (past tezlikda shinalar sirpanmaydi) + bo'ylama dinamika.
 * Holat nuqtasi — orqa o'q markazi. Burchak: 0 = sharq, chapga burilish musbat.
 */
export class Mashina {
  x: number;
  y: number;
  th: number;
  v = 0;                // m/s (+ oldinga)
  delta = 0;            // old g'ildirak burchagi, rad (+ chapga)
  ayl = 0;              // dvigatel aylanishi, ayl/min
  ishlayapti = true;
  sirpanish = true;     // mufta sirpanyaptimi (avtomatik ilashish)
  gildirakBurchak = 0;  // g'ildirak aylanishi (vizual), rad
  tezlanish = 0;        // bo'ylama tezlanish, m/s²
  // Kuzov holati (vizual): yer bo'yicha va dinamik og'ish
  balandlik = 0;        // kuzov o'rtacha balandligi (estakada)
  pitch = 0;            // + burun ko'tarilgan
  roll = 0;             // + o'ng tomon pastga
  qiyalik = 0;          // bo'ylama qiyalik (sin), + tepaga
  /** Yer bo'yicha og'ish (butun mashina) va dinamik og'ish (faqat kuzov) */
  yerPitch = 0; yerRoll = 0;
  dinPitch = 0; dinRoll = 0;
  private dinPitchV = 0; private dinRollV = 0;
  private oldingiUzatma: Uzatma = 'N';
  private ikkinchiTaymer = 0;
  private qolTormozTaymer = 0;
  private aylSilliq = 0;

  constructor(readonly t: MashinaTuri, p: V, th: number) {
    // p — kuzov markazi; ichkarida orqa o'q markazi saqlanadi
    const o = this.markazdanOrqaga();
    this.x = p.x - Math.cos(th) * o;
    this.y = p.y - Math.sin(th) * o;
    this.th = th;
    this.ayl = t.salt;
  }

  /** Orqa o'qdan kuzov markazigacha masofa */
  private markazdanOrqaga() { return (this.t.bazasi + this.t.oldiOsilma - this.t.orqaOsilma) / 2; }

  joyla(p: V, th: number) {
    const o = this.markazdanOrqaga();
    this.x = p.x - Math.cos(th) * o;
    this.y = p.y - Math.sin(th) * o;
    this.th = th;
    this.v = 0;
    this.delta = 0;
    this.ishlayapti = true;
    this.ayl = this.t.salt;
    this.dinPitch = this.dinPitchV = this.dinRoll = this.dinRollV = 0;
  }

  get tezlikKmh() { return Math.abs(this.v) * 3.6; }
  get orqaOq(): V { return { x: this.x, y: this.y }; }
  /** Kuzov markazi */
  get markaz(): V { return lokal(this.orqaOq, this.th, this.markazdanOrqaga(), 0); }
  /** Old bamper markazi */
  get old(): V { return lokal(this.orqaOq, this.th, this.t.bazasi + this.t.oldiOsilma, 0); }
  /** Orqa bamper markazi */
  get orqa(): V { return lokal(this.orqaOq, this.th, -this.t.orqaOsilma, 0); }

  /** Kuzov ko'pburchagi (burchaklari biroz yumaloqlangan — bamperlar) */
  kuzov(x = this.x, y = this.y, th = this.th): V[] {
    const t = this.t, p = { x, y };
    const f0 = -t.orqaOsilma, f1 = t.bazasi + t.oldiOsilma, w = t.eni / 2, k = 0.14;
    return [
      lokal(p, th, f0 + k, -w), lokal(p, th, f1 - k, -w), lokal(p, th, f1, -w + k), lokal(p, th, f1, w - k),
      lokal(p, th, f1 - k, w), lokal(p, th, f0 + k, w), lokal(p, th, f0, w - k), lokal(p, th, f0, -w + k),
    ];
  }

  /** G'ildiraklar yerga tegadigan nuqtalari: [old-chap, old-o'ng, orqa-chap, orqa-o'ng] */
  gildiraklar(): V[] {
    const t = this.t, k = t.koleya / 2;
    return [lokal(this.orqaOq, this.th, t.bazasi, k), lokal(this.orqaOq, this.th, t.bazasi, -k), lokal(this.orqaOq, this.th, 0, k), lokal(this.orqaOq, this.th, 0, -k)];
  }

  /** Dvigatelni qayta yurgizish */
  yurgiz() {
    this.ishlayapti = true;
    this.ayl = this.t.salt;
  }

  private ochir(sabab: 'ikkinchi' | 'qolTormoz' | 'urilish' | 'uzatma', hod: Hodisa[]) {
    if (!this.ishlayapti) return;
    this.ishlayapti = false;
    hod.push({ tur: 'ochdi', sabab });
  }

  /** Bir fizika qadami */
  qadam(dt: number, k: Boshqaruv, d: FizikDunyo): Hodisa[] {
    const t = this.t;
    const hod: Hodisa[] = [];
    const m = t.massa, r = t.gildirakR, L = t.bazasi;

    // ── Rul: rul g'ildiragidan old g'ildirak burchagi (soat mili bo'yicha — o'ngga, ya'ni manfiy)
    const maxD = t.maxBurchak * GRAD;
    this.delta = chekla((-k.rul / t.rulNisbati) * GRAD, -maxD, maxD);

    // ── Yer: g'ildiraklar ostidagi balandlik → qiyalik va kuzov og'ishi
    const gl = this.gildiraklar();
    const h = gl.map((p) => d.balandlik(p));
    const hOld = (h[0] + h[1]) / 2, hOrqa = (h[2] + h[3]) / 2;
    this.qiyalik = chekla((hOld - hOrqa) / L, -0.5, 0.5);
    const yerPitch = (this.yerPitch = Math.atan2(hOld - hOrqa, L));
    const yerRoll = (this.yerRoll = Math.atan2((h[0] + h[2]) / 2 - (h[1] + h[3]) / 2, t.koleya));
    this.balandlik = (h[0] + h[1] + h[2] + h[3]) / 4;

    // ── Uzatma almashganda: harakat yo'nalishiga teskari uzatma — xato va dvigatel o'chadi
    if (k.uzatma !== this.oldingiUzatma) {
      if (this.ishlayapti && ((k.uzatma === 'R' && this.v > 0.8) || ((k.uzatma === '1' || k.uzatma === '2') && this.v < -0.8))) {
        hod.push({ tur: 'uzatmaXato' });
        this.ochir('uzatma', hod);
      }
      this.oldingiUzatma = k.uzatma;
    }

    // ── Dvigatel va transmissiya
    const tishli = k.uzatma === 'N' ? 0 : t.uzatmalar[k.uzatma] * t.bosh;
    const yon = k.uzatma === 'R' ? -1 : 1;
    let F = 0;           // haydovchi kuch (+ oldinga)
    let ushlab = 0;      // o'chgan dvigatel uzatmada mashinani ushlab turadi
    const gAyl = (Math.abs(this.v) / r) * (60 / (2 * Math.PI)) * tishli; // g'ildirakdan dvigatelga
    if (this.ishlayapti && tishli > 0) {
      const maqsad = t.salt + k.gaz * 2200;  // sirpanishda dvigatel shu aylanishga intiladi
      const mos = this.v * yon >= -0.05;     // mashina uzatma yo'nalishida (yoki turibdi)
      let T: number;
      // Mufta g'ildiraklar dvigatelni saltdan yuqori aylantira boshlagach to'liq ulanadi
      const qulf = mos && gAyl >= t.salt * 1.1;
      if (!qulf) {
        // Mufta sirpanadi: uzatiladigan moment aylanishlar farqiga bog'liq, dvigatel imkoniyati bilan cheklangan
        this.sirpanish = true;
        const farq = mos ? maqsad - gAyl : maqsad + gAyl;
        const imkon = k.gaz * moment(t, maqsad) + SALT_MOMENT;
        T = Math.min(MUFTA * farq, imkon);
        if (k.uzatma === '2') T *= 0.55; // 2-uzatmada joyidan qo'zg'alish og'ir
        this.aylSilliq = maqsad;
      } else {
        // Mufta ulangan: dvigatel g'ildiraklar bilan birga aylanadi
        this.sirpanish = false;
        T = k.gaz * moment(t, gAyl) - (1 - k.gaz) * (8 + gAyl * 0.006); // dvigatel bilan tormozlash
        if (gAyl > t.maxAyl) T = Math.min(T, -(gAyl - t.maxAyl) * 0.2); // cheklagich
        this.aylSilliq = gAyl;
      }
      F = (yon * T * tishli * FOYDALI) / r;

      // 2-uzatmada joyidan qo'zg'alishga urinish — dvigatel o'chadi
      if (k.uzatma === '2' && this.v * yon < 1.2 && k.gaz > 0.05 && !k.qolTormoz) this.ikkinchiTaymer += dt;
      else this.ikkinchiTaymer = 0;
      if (this.ikkinchiTaymer > 0.9) { this.ikkinchiTaymer = 0; this.ochir('ikkinchi', hod); }
      // Qo'l tormozi tortilgan holda kuchli gaz — dvigatel o'chadi
      if (k.qolTormoz && k.gaz > 0.4 && Math.abs(this.v) < 0.2) this.qolTormozTaymer += dt;
      else this.qolTormozTaymer = 0;
      if (this.qolTormozTaymer > 2.0) { this.qolTormozTaymer = 0; this.ochir('qolTormoz', hod); }
    } else {
      this.sirpanish = true;
      this.aylSilliq = this.ishlayapti ? t.salt + k.gaz * 3800 : 0;
      if (!this.ishlayapti && tishli > 0) ushlab = 0.35 * m * G; // o'chgan dvigatel uzatmada — g'ildiraklar qotadi
    }
    this.ayl += (this.aylSilliq - this.ayl) * Math.min(1, dt * 10);

    // ── Kuchlar
    const Fog = -m * G * this.qiyalik;                      // qiyalikdagi og'irlik kuchi
    const Fhavo = -0.42 * this.v * Math.abs(this.v);        // havo qarshiligi
    const qarshilik = k.tormoz * 0.85 * m * G               // asosiy tormoz (~8 m/s²)
      + (k.qolTormoz ? 0.32 * m * G : 0)                   // qo'l tormozi (orqa g'ildiraklar)
      + 0.013 * m * G                                      // g'ildirash qarshiligi
      + ushlab;
    const tashqi = F + Fog + Fhavo;
    const vOld = this.v;
    if (Math.abs(this.v) < 0.02) {
      // Turibdi: statik ishqalanish — tashqi kuch qarshilikdan oshmasa, joyida qoladi
      if (Math.abs(tashqi) <= qarshilik) this.v = 0;
      else this.v += ((tashqi - Math.sign(tashqi) * qarshilik) / m) * dt;
    } else {
      const yangi = this.v + ((tashqi - Math.sign(this.v) * qarshilik) / m) * dt;
      // Qarshilik kuchlari mashinani teskari yo'nalishga surmaydi
      this.v = Math.sign(yangi) !== Math.sign(this.v) && Math.abs(tashqi) <= qarshilik ? 0 : yangi;
    }
    this.tezlanish += ((this.v - vOld) / dt - this.tezlanish) * Math.min(1, dt * 8);

    // ── Harakat (kinematik velosiped modeli, orqa o'q markazi)
    const dth = ((this.v * Math.tan(this.delta)) / L) * dt;
    const thY = this.th + dth;
    const thO = this.th + dth / 2;
    const xY = this.x + Math.cos(thO) * this.v * dt;
    const yY = this.y + Math.sin(thO) * this.v * dt;
    if (this.v !== 0) {
      const devor = d.tegadimi(this.kuzov(xY, yY, thY));
      if (devor) {
        const urilish = Math.abs(this.v);
        hod.push({ tur: 'urildi', tezlik: urilish, devor });
        if (urilish > 2.2) this.ochir('urilish', hod);
        this.v = 0;
        this.tezlanish = 0;
      } else {
        this.x = xY; this.y = yY; this.th = thY;
      }
    }
    this.gildirakBurchak += (this.v / r) * dt;

    // ── Kuzov og'ishi (prujina-amortizator): tezlanishda burun ko'tariladi, tormozda egiladi, burilishda tashqariga og'adi
    const aLat = (this.v * this.v * Math.tan(this.delta)) / L;
    const w = 9, z = 0.55;
    this.dinPitchV += (w * w * (chekla(this.tezlanish, -9, 9) * 0.006 - this.dinPitch) - 2 * z * w * this.dinPitchV) * dt;
    this.dinPitch += this.dinPitchV * dt;
    this.dinRollV += (w * w * (chekla(aLat, -6, 6) * 0.009 - this.dinRoll) - 2 * z * w * this.dinRollV) * dt;
    this.dinRoll += this.dinRollV * dt;
    this.pitch = yerPitch + this.dinPitch;
    this.roll = yerRoll + this.dinRoll;
    return hod;
  }
}
