import type { V } from './asos/geom';
import { avtodromQur } from './dunyo/avtodrom';
import type { Maydon } from './dunyo/turlar';
import { FizikDunyo } from './fizika/dunyo';
import { Mashina, type Boshqaruv } from './fizika/mashina';
import { Hakam, type Jarima, type Natija, type Panel, type Rejim } from './imtihon/hakam';
import type { ImtihonSozlama } from './imtihon/qoidalar';
import { Grafika, type Sifat } from './grafika/sahna';
import { Ovoz } from './ovoz';
import { type MashinaTuri, rulChegara } from './mashinalar';

export interface DvigatelSozlama {
  mashina: MashinaTuri;
  rang: string;
  rejim: Rejim;
  sozlama: ImtihonSozlama;
  sifat: Sifat;
  ovoz: boolean;
}

/** Ekran paneli uchun ma'lumot (har ~0,1 s) */
export interface Hud {
  tezlik: number;
  ayl: number;
  vaqt: number;
  jami: number;
  chegara: number;
  bajarildi: number;
  jamiQadam: number;
  xatolar: number;
  qadam: string;
  korsatma: string;
  miltilla: boolean;
  rul: number;
  ishlayapti: boolean;
  tezlikChegara: number;
  x: number;
  y: number;
  th: number;
  oldinda: V[];
}

export interface Chaqiruvlar {
  onHud: (h: Hud) => void;
  onJarima: (j: Jarima) => void;
  onXabar: (matn: string, tur: 'yaxshi' | 'ogoh') => void;
  onTugadi: (n: Natija) => void;
}

const QADAM = 1 / 120;

export class Dvigatel {
  readonly maydon: Maydon;
  readonly dunyo: FizikDunyo;
  readonly grafika: Grafika;
  readonly ovoz = new Ovoz();
  mashina!: Mashina;
  hakam!: Hakam;
  readonly k: Boshqaruv = { gaz: 0, tormoz: 0, rul: 0, rulUshlangan: false, uzatma: 'N', qolTormoz: true };
  readonly pnl: Panel = { kamar: false, chapChiroq: false, ongChiroq: false, avariyaChiroq: false, faralar: false };
  pauzada = false;
  private kadr = 0;
  private oxirgi = 0;
  private yigindi = 0;
  private hudVaqt = 0;
  private miltillaOld = false;
  private signalOld = false;
  private chegaraRul: number;

  constructor(canvas: HTMLCanvasElement, readonly s: DvigatelSozlama, private cb: Chaqiruvlar) {
    const t = s.mashina;
    this.maydon = avtodromQur({ B: t.eni, D: t.uzunlik, K: t.koleya, S: t.orqaOsilma, qiyalik: s.sozlama.qiyalik });
    this.dunyo = new FizikDunyo(this.maydon);
    this.grafika = new Grafika(canvas, this.maydon, this.dunyo, t, s.rang, s.sifat);
    this.ovoz.yoqilgan = s.ovoz;
    this.chegaraRul = rulChegara(t);
    this.boshlash();
    if ((import.meta as any).env?.DEV) (window as any).__sim = this; // sinov skriptlari uchun
    this.oxirgi = performance.now();
    this.kadr = requestAnimationFrame(this.aylanish);
  }

  /** Mashina va hakamni (qayta) yaratish */
  private boshlash() {
    const s = this.s;
    const b = s.rejim.tur === 'mashq' ? this.maydon.marshrut[s.rejim.qadam].m.boshlash : this.maydon.boshlash;
    this.mashina = new Mashina(s.mashina, b.p, b.th);
    Object.assign(this.k, { gaz: 0, tormoz: 0, rul: 0, rulUshlangan: false, uzatma: 'N', qolTormoz: true });
    Object.assign(this.pnl, { kamar: false, chapChiroq: false, ongChiroq: false, avariyaChiroq: false, faralar: false });
    const hk = new Hakam(this.maydon, s.sozlama, s.rejim, this.mashina);
    hk.onJarima = (j) => { this.ovoz.jarima(); this.cb.onJarima(j); };
    hk.onXabar = (m, tur) => { if (tur === 'yaxshi') this.ovoz.yaxshi(); this.cb.onXabar(m, tur); };
    hk.onTugadi = (n) => { this.ovoz.signal(false); this.cb.onTugadi(n); };
    this.hakam = hk;
    this.yigindi = 0;
    this.hudVaqt = 1;
  }

  qaytaBoshlash() { this.boshlash(); this.pauza(false); }

  pauza(t: boolean) {
    this.pauzada = t;
    this.ovoz.pauza(t);
    this.oxirgi = performance.now();
  }

  /** Dvigatelni yurgizish (o'chib qolganda) */
  yurgiz() { this.mashina.yurgiz(); }

  private aylanish = (vaqt: number) => {
    this.kadr = requestAnimationFrame(this.aylanish);
    const dt = Math.min(0.1, Math.max(0, (vaqt - this.oxirgi) / 1000));
    this.oxirgi = vaqt;
    const m = this.mashina, k = this.k, hk = this.hakam;
    if (!this.pauzada) {
      this.yigindi += dt;
      while (this.yigindi >= QADAM) {
        this.yigindi -= QADAM;
        // Rul qo'yib yuborilsa — harakat tezligiga qarab markazga qaytadi
        if (!k.rulUshlangan && k.rul !== 0) {
          const qaytish = Math.min(720, Math.abs(m.v) * 180) * QADAM;
          k.rul = Math.abs(k.rul) <= qaytish ? 0 : k.rul - Math.sign(k.rul) * qaytish;
        }
        k.rul = Math.max(-this.chegaraRul, Math.min(this.chegaraRul, k.rul));
        if (hk.tugadi) { k.gaz = 0; }
        const hod = m.qadam(QADAM, k, this.dunyo);
        for (const h of hod) if (h.tur === 'urildi' && h.tezlik > 0.3) this.ovoz.zarba();
        hk.qadam(QADAM, m, k, this.pnl, hod, this.dunyo);
      }
      // Ovozlar
      this.ovoz.dvigatel(m.ayl, k.gaz, m.ishlayapti);
      const miltilla = Math.floor(performance.now() / 333) % 2 === 0;
      if ((this.pnl.chapChiroq || this.pnl.ongChiroq || this.pnl.avariyaChiroq) && miltilla !== this.miltillaOld) this.ovoz.chiqillash(miltilla);
      this.miltillaOld = miltilla;
      if (hk.avariyaSignal !== this.signalOld) { this.signalOld = hk.avariyaSignal; }
      this.ovoz.signal(hk.avariyaSignal && Math.floor(performance.now() / 250) % 2 === 0);
    }
    this.grafika.chiz(this.pauzada ? 0 : dt, m, k, this.pnl, hk);
    // Ekran paneli
    this.hudVaqt += dt;
    if (this.hudVaqt >= 0.1) {
      this.hudVaqt = 0;
      const q = hk.joriyQadam;
      this.cb.onHud({
        tezlik: m.tezlikKmh, ayl: m.ayl, vaqt: hk.vaqt, jami: hk.jami, chegara: this.s.sozlama.otishChegarasi,
        bajarildi: hk.bajarildi.length, jamiQadam: hk.jamiQadam, xatolar: hk.jarimalar.length,
        qadam: q?.nom || '', korsatma: hk.korsatma, miltilla: Math.floor(performance.now() / 333) % 2 === 0, rul: k.rul,
        ishlayapti: m.ishlayapti, tezlikChegara: hk.tezlikChegara(), x: m.markaz.x, y: m.markaz.y, th: m.th,
        oldinda: hk.oldindagiYol(70),
      });
    }
  };

  dispose() {
    cancelAnimationFrame(this.kadr);
    this.grafika.dispose();
    this.ovoz.dispose();
  }
}
