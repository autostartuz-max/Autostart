import { type V, ichida, kesishadi, masofa, kopburchakKesishadi } from '../asos/geom';
import type { Maydon, Qadam, MashqKodi } from '../dunyo/turlar';
import type { Mashina, Boshqaruv, Hodisa } from '../fizika/mashina';
import type { FizikDunyo } from '../fizika/dunyo';
import { type ImtihonSozlama, type JarimaKodi, JARIMA_TURLARI } from './qoidalar';
import { Svetoforlar } from './svetofor';
import { Piyoda } from './piyoda';

/** Panel tugmalari (kamar, chiroqlar) */
export interface Panel { kamar: boolean; chapChiroq: boolean; ongChiroq: boolean; avariyaChiroq: boolean; faralar: boolean }

export interface Jarima { kod: JarimaKodi; nom: string; ball: number; vaqt: number; mashq: string; izoh?: string; p: V }

export interface Natija {
  jarimalar: Jarima[];
  jami: number;
  vaqt: number;
  otdi: boolean;
  bajarildi: string[];
  jamiQadam: number;
  /** Imtihon nima sababdan tugadi */
  sabab: string;
  rejim: Rejim;
}

export type Rejim = { tur: 'imtihon' } | { tur: 'mashq'; qadam: number };

/** Nuqta a→b harakatida [c, d] kesmani kesib o'tdimi */
const kesdi = (a: V, b: V, ch: [V, V]) => (a.x !== b.x || a.y !== b.y) && kesishadi(a, b, ch[0], ch[1]);
/** Kesmani yo'nalish bo'ylab siljitish */
const siljiganKesma = (ch: [V, V], d: V, k: number): [V, V] => [{ x: ch[0].x + d.x * k, y: ch[0].y + d.y * k }, { x: ch[1].x + d.x * k, y: ch[1].y + d.y * k }];

/**
 * Hakam: imtihon (yoki bitta mashq) davomida qoidalarni kuzatadi, xatolarni qayd etadi, mashqlar bajarilishini tekshiradi.
 * Har bir fizika qadamidan keyin `qadam()` chaqiriladi.
 */
export class Hakam {
  readonly sv = new Svetoforlar();
  readonly piyoda = new Piyoda();
  /** Avariya to'xtash signal qurilmasi yoniqmi */
  avariyaSignal = false;

  jarimalar: Jarima[] = [];
  vaqt = 0;
  boshlandi = false;
  tugadi = false;
  natija: Natija | null = null;
  readonly qadamlar: Qadam[];
  joriy = 0;
  /** Joriy qadam kirish chizig'idan o'tildimi */
  faol = false;
  bajarildi: string[] = [];
  korsatma = '';
  onJarima?: (j: Jarima) => void;
  onTugadi?: (n: Natija) => void;
  onXabar?: (matn: string, tur: 'yaxshi' | 'ogoh') => void;

  // Global holatlar
  private oldOld: V;
  private orqaOld: V;
  private kamarBuzildi = false;
  private tezlikBuzildi = false; private tezlikTiklanish = 0;
  private chiziqda = false; private chiziqTiklanish = 0;
  private bordyurTiklanish = 0;
  private qolTormozMasofa = 0; private qolTormozBuzildi = false;
  private orqagaMasofa = 0; private orqagaBuzildi = false; private oldingaMasofa = 0;
  private turish = 0; private toxtashJarima = false; private ochganiga = 99;
  private qadamVaqti = 0; private qadamVaqtJarima = false;
  private yonalishTaymer = 0;
  // Marshrut kuzatuvi (yo'l qismi va undagi masofa)
  private yq = 0; private ys = 0;
  private uzunliklar: number[][];
  // Joriy mashq holati
  private h: Record<string, any> = {};

  constructor(
    readonly m: Maydon,
    readonly s: ImtihonSozlama,
    readonly rejim: Rejim,
    mashina: Mashina,
  ) {
    this.qadamlar = rejim.tur === 'mashq'
      ? [m.marshrut[rejim.qadam]]
      : m.marshrut.filter((q) => s.mashqlar[q.kod]?.faol !== false);
    this.oldOld = mashina.old;
    this.orqaOld = mashina.orqa;
    this.uzunliklar = m.yolQismlari.map((ch) => {
      const u = [0];
      for (let i = 1; i < ch.length; i++) u.push(u[i - 1] + masofa(ch[i - 1], ch[i]));
      return u;
    });
    const q0 = this.qadamlar[0];
    this.yq = q0?.qism ?? 0;
    this.ys = this.proyeksiya(mashina.markaz, 0, Infinity).s;
    // Birinchi qadam: imtihonda "Start" — boshidanoq faol; mashqda — kirish chizig'idan o'tilganda
    if (q0 && (q0.kod === 'start' || rejim.tur === 'imtihon')) this.qadamBoshla();
  }

  get joriyQadam(): Qadam | undefined { return this.qadamlar[this.joriy]; }
  get jami() { return this.jarimalar.reduce((a, j) => a + j.ball, 0); }
  get jamiQadam() { return this.qadamlar.length; }

  /** Joriy tezlik chegarasi (km/soat) */
  tezlikChegara(): number {
    const q = this.joriyQadam;
    if (q?.kod === 'tezlashish' && this.faol && (this.h.faza === 'zona' || this.h.faza === 'sekin')) return this.s.tezlik.tezlashish;
    return this.s.tezlik.asosiy;
  }

  private jarima(kod: JarimaKodi, p: V, izoh?: string) {
    if (this.tugadi) return;
    const sz = this.s.jarimalar[kod];
    if (!sz?.faol) return;
    const j: Jarima = { kod, nom: JARIMA_TURLARI[kod].nom, ball: sz.ball, vaqt: this.vaqt, mashq: this.joriyQadam?.nom || '', izoh, p };
    this.jarimalar.push(j);
    this.onJarima?.(j);
    if (JARIMA_TURLARI[kod].yakunlovchi) this.tugat(false, izoh || j.nom);
    else if (this.jami >= this.s.otishChegarasi) this.tugat(false, `Jarima ballari ${this.s.otishChegarasi} ga yetdi`);
  }

  tugat(otdi: boolean, sabab: string) {
    if (this.tugadi) return;
    this.tugadi = true;
    this.avariyaSignal = false;
    this.natija = {
      jarimalar: [...this.jarimalar], jami: this.jami, vaqt: this.vaqt, otdi: otdi && this.jami < this.s.otishChegarasi,
      bajarildi: [...this.bajarildi], jamiQadam: this.jamiQadam, sabab, rejim: this.rejim,
    };
    this.onTugadi?.(this.natija);
  }

  // ───────────────────────── Marshrut kuzatuvi ─────────────────────────
  private proyeksiya(p: V, sMin: number, sMax: number) {
    const ch = this.m.yolQismlari[this.yq], u = this.uzunliklar[this.yq];
    let eng = { s: this.ys, d: Infinity };
    for (let i = 1; i < ch.length; i++) {
      if (u[i] < sMin || u[i - 1] > sMax) continue;
      const a = ch[i - 1], b = ch[i];
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
      if (d < eng.d) eng = { s: u[i - 1] + (u[i] - u[i - 1]) * t, d };
    }
    return eng;
  }

  /** Marshrutdagi joriy nuqtadan oldinga qarab yo'l (xarita va yo'naltiruvchi strelka uchun) */
  oldindagiYol(uzun = 60): V[] {
    const ch = this.m.yolQismlari[this.yq], u = this.uzunliklar[this.yq];
    const out: V[] = [];
    for (let i = 0; i < ch.length; i++) if (u[i] >= this.ys - 2 && u[i] <= this.ys + uzun) out.push(ch[i]);
    return out;
  }
  get marshrutUlush() {
    const umumiy = this.uzunliklar.reduce((a, u) => a + u[u.length - 1], 0);
    const otildi = this.uzunliklar.slice(0, this.yq).reduce((a, u) => a + u[u.length - 1], 0) + this.ys;
    return Math.min(1, otildi / umumiy);
  }

  // ───────────────────────── Asosiy qadam ─────────────────────────
  qadam(dt: number, mash: Mashina, k: Boshqaruv, pnl: Panel, hod: Hodisa[], d: FizikDunyo) {
    this.sv.qadam(dt);
    this.piyoda.qadam(dt);
    if (this.tugadi) return;
    const old = mash.old, orqa = mash.orqa, kmh = mash.tezlikKmh, v = mash.v;
    const q = this.joriyQadam;

    // Harakat boshlanishi: kamar va (Start'da) chap ko'rsatkich
    if (!this.boshlandi && Math.abs(v) > 0.15) {
      this.boshlandi = true;
      if (!pnl.kamar) { this.jarima('kamar', old, 'Harakat kamarsiz boshlandi'); this.kamarBuzildi = true; }
      if (q?.kod === 'start' && this.faol && !pnl.chapChiroq) this.jarima('chiroq', old, 'Harakatni boshlashda chap ko‘rsatkich yoqilmagan');
    }
    if (this.boshlandi) this.vaqt += dt;

    // ── Kamar harakat davomida
    if (this.boshlandi && kmh > 1 && !pnl.kamar && !this.kamarBuzildi) { this.kamarBuzildi = true; this.jarima('kamar', old); }
    if (pnl.kamar) this.kamarBuzildi = false;

    // ── Tezlik
    const chegara = this.tezlikChegara();
    if (kmh > chegara + this.s.tezlik.xato) {
      if (!this.tezlikBuzildi) { this.tezlikBuzildi = true; this.jarima('tezlik', old, `${Math.round(kmh)} km/soat (chegara ${chegara})`); }
      this.tezlikTiklanish = 0;
    } else if (this.tezlikBuzildi && kmh <= chegara) {
      this.tezlikTiklanish += dt;
      if (this.tezlikTiklanish > 2) this.tezlikBuzildi = false;
    }

    // ── Chiziq bosish (g'ildirak izi: markaz va ikki cheti)
    let bosdi = false;
    const yonV = { x: -Math.sin(mash.th) * 0.09, y: Math.cos(mash.th) * 0.09 };
    for (const g of mash.gildiraklar()) {
      if (d.boyoqda(g) || d.boyoqda({ x: g.x + yonV.x, y: g.y + yonV.y }) || d.boyoqda({ x: g.x - yonV.x, y: g.y - yonV.y })) { bosdi = true; break; }
    }
    if (bosdi) {
      if (!this.chiziqda) this.jarima('chiziq', old);
      this.chiziqda = true;
      this.chiziqTiklanish = 0;
    } else if (this.chiziqda) {
      this.chiziqTiklanish += dt;
      if (this.chiziqTiklanish > 1) this.chiziqda = false;
    }

    // ── Fizika hodisalari: urilish, dvigatel o'chishi, noto'g'ri uzatma
    this.bordyurTiklanish = Math.max(0, this.bordyurTiklanish - dt);
    for (const e of hod) {
      if (e.tur === 'urildi' && this.bordyurTiklanish <= 0) {
        this.bordyurTiklanish = 1.5;
        this.jarima('bordyur', old, e.devor.tur === 'tosiq' ? 'Estakada to‘sig‘iga tegildi' : undefined);
      } else if (e.tur === 'ochdi') {
        this.ochganiga = 0;
        const sabab = { ikkinchi: '2-uzatmada joyidan qo‘zg‘alib bo‘lmaydi', qolTormoz: 'Qo‘l tormozi tortilgan holda gaz berildi', urilish: 'Urilish', uzatma: 'Harakatga teskari uzatma qo‘shildi' }[e.sabab];
        this.jarima('dvigatel', old, sabab);
      } else if (e.tur === 'uzatmaXato') this.jarima('uzatma', old, 'Harakatga teskari uzatma qo‘shildi');
    }
    if (mash.ishlayapti) this.ochganiga += dt;
    else this.ochganiga = 0;

    // ── Qo'l tormozi tortilgan holda harakat
    if (k.qolTormoz && Math.abs(v) > 0.3) {
      this.qolTormozMasofa += Math.abs(v) * dt;
      if (this.qolTormozMasofa > 1.5 && !this.qolTormozBuzildi) { this.qolTormozBuzildi = true; this.jarima('qolTormoz', old); }
    } else if (!k.qolTormoz) { this.qolTormozMasofa = 0; this.qolTormozBuzildi = false; }

    // ── Orqaga harakat (boks, parkovka va estakadadan tashqarida)
    const orqagaRuxsat = q && this.faol && (q.kod === 'boks' || q.kod === 'parallel' || q.kod === 'estakada');
    if (v < -0.05 && !orqagaRuxsat) {
      this.orqagaMasofa += -v * dt;
      this.oldingaMasofa = 0;
      if (this.orqagaMasofa > 1.0 && !this.orqagaBuzildi) { this.orqagaBuzildi = true; this.jarima('orqaga', old); }
    } else if (v > 0.05) {
      this.oldingaMasofa += v * dt;
      if (this.oldingaMasofa > 2) { this.orqagaMasofa = 0; this.orqagaBuzildi = false; }
    }

    // ── To'xtab turish
    if (Math.abs(v) < 0.03) this.turish += dt;
    else { this.turish = 0; this.toxtashJarima = false; }
    if (this.boshlandi && !this.toxtashJarima && this.ochganiga > 6) {
      const kuzov = mash.kuzov();
      const taqiq = this.m.taqiqZonalar.some((z) => kopburchakKesishadi(kuzov, z));
      const ruxsat = this.faol && this.toxtashRuxsat(q!, mash);
      if ((taqiq && this.turish > 2.5 && !this.taqiqdaRuxsat(q, mash)) || (!taqiq && !ruxsat && this.turish > this.s.toxtashSoniya)) {
        this.toxtashJarima = true;
        this.jarima('noqonuniyToxtash', old, taqiq ? 'Piyodalar o‘tish joyi, chorraha yoki temir yo‘lda to‘xtab turildi' : undefined);
      }
    }

    // ── Vaqt
    if (this.vaqt > this.s.vaqtDaqiqa * 60) {
      this.jarima('vaqt', old, 'Imtihon vaqti tugadi');
      this.tugat(false, 'Imtihon uchun ajratilgan vaqt tugadi');
      return;
    }
    if (this.faol && q) {
      this.qadamVaqti += dt;
      if (!this.qadamVaqtJarima && this.qadamVaqti > (this.s.mashqlar[q.kod]?.vaqt ?? 180)) {
        this.qadamVaqtJarima = true;
        this.jarima('vaqt', old, `"${q.nom}" uchun vaqt tugadi`);
      }
    }

    // ── Marshrutdan chiqish
    const pr = this.proyeksiya(mash.markaz, this.ys - 6, this.ys + 25);
    if (pr.d < 4) this.ys = pr.s;
    const zonada = !!(q?.zona && ichida(mash.markaz, q.zona));
    if (pr.d > 6.5 && !zonada && this.boshlandi) {
      this.yonalishTaymer += dt;
      if (this.yonalishTaymer > 1.2) { this.jarima('yonalish', old, 'Marshrutdan chiqib ketildi'); return; }
    } else this.yonalishTaymer = 0;

    // ── Burilishdan oldin ko'rsatkich
    for (const sn of this.m.signalNuqtalar) {
      if (kesdi(this.oldOld, old, sn.chiziq) && v > 0) {
        const yoniq = sn.tomon === 'chap' ? pnl.chapChiroq : pnl.ongChiroq;
        if (!yoniq) this.jarima('chiroq', old, `${sn.nom}: ${sn.tomon === 'chap' ? 'chap' : 'o‘ng'} ko‘rsatkich yoqilmagan`);
      }
    }

    // ── Mashqlar
    if (q && !this.tugadi) {
      if (!this.faol && kesdi(this.oldOld, old, q.kirish)) this.qadamBoshla();
      if (this.faol && this.mashqKuzat(q, dt, mash, k, pnl, old, orqa)) this.qadamTugat(q);
    }
    this.korsatma = this.korsatmaTop(q, mash, k, pnl);
    this.oldOld = old;
    this.orqaOld = orqa;
  }

  private qadamBoshla() {
    const q = this.joriyQadam;
    if (!q) return;
    this.faol = true;
    this.qadamVaqti = 0;
    this.qadamVaqtJarima = false;
    this.h = {};
    const r = Math.random;
    switch (q.kod) {
      case 'piyoda': {
        const yol = this.m.piyodaYollari[0];
        if (yol && r() < this.s.piyodaEhtimol) { this.piyoda.boshla(yol, r() < 0.5 ? 1 : -1); this.h.bor = true; }
        else this.piyoda.yoq();
        break;
      }
      case 'chorraha':
        if (r() < this.s.qizilEhtimol) this.sv.qizilQil(q.m.svetofor, 7 + r() * 5);
        else this.sv.yashilQil(q.m.svetofor, 10 + r() * 4);
        break;
      case 'avariya': {
        const [a, b] = q.m.signalOraliq as [number, number];
        this.h.trigX = b + r() * (a - b);
        this.h.faza = 'kutish';
        break;
      }
      case 'estakada': this.h.faza = 'yaqin'; break;
      case 'tezlashish': this.h.faza = 'oldin'; this.h.max = 0; break;
      case 'boks': this.h.faza = 'kirish'; break;
    }
  }

  private qadamTugat(q: Qadam) {
    this.faol = false;
    this.bajarildi.push(q.nom);
    this.onXabar?.(`✓ ${q.nom}`, 'yaxshi');
    if (q.kod === 'avariya') this.avariyaSignal = false;
    const keyingi = this.qadamlar[this.joriy + 1];
    // Boksdan keyin marshrutning ikkinchi qismiga o'tamiz
    if (keyingi && keyingi.qism !== this.yq) { this.yq = keyingi.qism; this.ys = 0; }
    this.joriy++;
    if (this.joriy >= this.qadamlar.length) {
      this.tugat(true, this.rejim.tur === 'mashq' ? 'Mashq bajarildi' : 'Imtihon yakunlandi');
    }
  }

  /** To'xtab turishga ruxsat (joriy mashq ichida) */
  private toxtashRuxsat(q: Qadam, mash: Mashina): boolean {
    switch (q.kod) {
      case 'start': return !this.h.ketdi;
      case 'piyoda': return this.piyoda.holat === 'otyapti' || this.piyoda.holat === 'kutyapti' || this.piyoda.otganiga < 4;
      case 'chorraha': return this.sv.taqiqlovchi(q.m.svetofor) || this.sv.ishora(q.m.svetofor) === 'sariq';
      case 'avariya': return this.h.faza === 'signal' || this.h.faza === 'toxtadi' || this.h.faza === 'davom';
      default: void mash; return true;
    }
  }
  /** Taqiqlangan joyda (chorraha, o'tish joyi) qisqa to'xtashga ruxsat: piyoda yoki svetofor tufayli */
  private taqiqdaRuxsat(q: Qadam | undefined, _m: Mashina): boolean {
    if (!q || !this.faol) return false;
    if (q.kod === 'piyoda') return this.piyoda.holat === 'otyapti';
    return false;
  }

  // ───────────────────────── Mashqlar ─────────────────────────
  /** Mashq kuzatuvi; true — mashq tugadi */
  private mashqKuzat(q: Qadam, dt: number, mash: Mashina, _k: Boshqaruv, pnl: Panel, old: V, orqa: V): boolean {
    const h = this.h;
    const v = mash.v, kmh = mash.tezlikKmh;
    const turibdi = Math.abs(v) < 0.03;
    h.turish = turibdi ? (h.turish || 0) + dt : 0;
    const oldKesdi = (ch: [V, V]) => kesdi(this.oldOld, old, ch);
    const orqaKesdi = (ch: [V, V]) => kesdi(this.orqaOld, orqa, ch);

    switch (q.kod as MashqKodi) {
      case 'start': {
        if (Math.abs(v) > 0.15) h.ketdi = true;
        return oldKesdi(q.chiqish);
      }

      case 'piyoda': {
        const z = q.m.zebra as V[];
        if (h.bor && this.piyoda.holat === 'kutyapti') {
          const c = { x: (z[0].x + z[2].x) / 2, y: (z[0].y + z[2].y) / 2 };
          if (masofa(old, c) < 16) this.piyoda.yur();
        }
        if (h.bor && this.piyoda.holat === 'otyapti' && !h.jarima && kopburchakKesishadi(mash.kuzov(), z)) {
          h.jarima = true;
          this.jarima('piyoda', old);
        }
        return orqaKesdi(q.chiqish);
      }

      case 'estakada': {
        const e = this.m.estakadalar[q.m.estakada as number];
        const c = Math.cos(e.th), s = Math.sin(e.th);
        const f = (p: V) => (p.x - e.boshi.x) * c + (p.y - e.boshi.y) * s;
        const yaqin = e.stopS - 0.2;          // to'xtash chizig'ining yaqin cheti
        const fOld = f(old);
        if (h.faza === 'yaqin') {
          if (h.turish >= 0.8 && fOld <= yaqin && fOld >= yaqin - 1.5) {
            h.faza = 'toxtadi'; h.s0 = f(mash.orqaOq);
            this.onXabar?.('To‘xtadingiz. Endi orqaga sirpanmasdan yuqoriga harakatlaning', 'yaxshi');
          } else if (h.turish >= 0.8 && fOld > yaqin && fOld <= yaqin + 2.5) {
            this.jarima('stopChiziq', old, 'Estakadada to‘xtash chizig‘idan o‘tib to‘xtaldi');
            h.faza = 'toxtadi'; h.s0 = f(mash.orqaOq);
          } else if (fOld > yaqin + 2.5) {
            this.jarima('toxtamadi', old, 'Estakadada to‘xtash chizig‘i oldida to‘xtalmadi');
            h.faza = 'otdi';
          }
        } else if (h.faza === 'toxtadi') {
          if (!h.sirpandi && f(mash.orqaOq) < h.s0 - this.s.sirpanish) {
            h.sirpandi = true;
            this.jarima('orqagaSirpanish', old, `${this.s.sirpanish} m dan ortiq orqaga ketildi`);
          }
          if (fOld > yaqin + 3) h.faza = 'otdi';
        }
        return orqaKesdi(q.chiqish);
      }

      case 'burilish90':
      case 'ilon':
        return orqaKesdi(q.chiqish);

      case 'chorraha': {
        const id = q.m.svetofor as string;
        const stop = q.m.stop as [V, V];
        // Yaqinlashish yo'nalishi: qadam yo'lining stop chizig'i yaqinidagi yo'nalishi
        const dir = this.yolYonalishi(q, stop);
        const stopYaqin = siljiganKesma(stop, dir, -0.2);
        const zebraYaqin = siljiganKesma(stop, dir, 1.2);
        const taqiq = this.sv.taqiqlovchi(id);
        if (oldKesdi(stopYaqin)) {
          h.stopKesdi = true;
          if (!h.chiroqTekshirildi && q.m.yonalish !== 'togri') {
            h.chiroqTekshirildi = true;
            const yoniq = q.m.yonalish === 'chap' ? pnl.chapChiroq : pnl.ongChiroq;
            if (!yoniq) this.jarima('chiroq', old, `Chorrahada ${q.m.yonalish === 'chap' ? 'chapga' : 'o‘ngga'} burilishda ko‘rsatkich yoqilmagan`);
          }
        }
        if (oldKesdi(zebraYaqin)) {
          h.zebraKesdi = true;
          if (taqiq && !h.qizil) { h.qizil = true; this.jarima('qizil', old); }
        }
        if (h.stopKesdi && !h.zebraKesdi && !h.qizil && !h.stopJarima && h.turish > 0.3 && taqiq) {
          h.stopJarima = true;
          this.jarima('stopChiziq', old, 'Qizil ishorada to‘xtash chizig‘idan o‘tib to‘xtaldi');
        }
        return orqaKesdi(q.chiqish);
      }

      case 'boks': {
        const boks = q.m.boks as V[];
        if (!h.nazorat && orqa.y >= (q.m.nazoratY as number) && ichida(orqa, boks)) {
          h.nazorat = true; h.faza = 'chiqish';
          this.onXabar?.('Nazorat chizig‘idan o‘tildi. Endi boksdan chiqing', 'yaxshi');
        }
        // Tugash: orqa qism g'arb tomon (qaytishda) boshlanish chizig'ini kesib o'tdi
        if (orqaKesdi(q.chiqish) && orqa.x < this.orqaOld.x) {
          if (!h.nazorat) this.jarima('mashq', old, 'Boksga orqa bilan nazorat chizig‘igacha kirilmadi');
          return true;
        }
        return false;
      }

      case 'temir': {
        const stop = q.m.stopChiziq as [V, V];
        const dir = this.yolYonalishi(q, stop);
        const yaqin = siljiganKesma(stop, dir, -0.2);
        const oldinda = this.yonida(old, yaqin, dir) < 0; // old qism chiziqqa yetmagan
        if (h.turish >= 0.5 && !h.toxtadi) {
          const ml = this.chiziqgacha(old, yaqin, dir);
          if (oldinda && ml < 8) h.toxtadi = true;
          else if (!oldinda && ml < 3 && !h.stopJarima) { h.stopJarima = true; h.toxtadi = true; this.jarima('stopChiziq', old, 'Temir yo‘l oldida to‘xtash chizig‘idan o‘tib to‘xtaldi'); }
        }
        if (oldKesdi(yaqin) && !h.toxtadi && !h.jarima) { h.jarima = true; this.jarima('stopBelgi', old); }
        return orqaKesdi(q.chiqish);
      }

      case 'tezlashish': {
        if (h.faza === 'oldin' && oldKesdi(q.m.boshi)) h.faza = 'zona';
        if (h.faza === 'zona') {
          h.max = Math.max(h.max, kmh);
          if (oldKesdi(q.m.oxiri)) {
            h.faza = 'sekin';
            if (h.max < this.s.tezlik.engKam) this.jarima('mashq', old, `Tezlashish bo‘lagida ${this.s.tezlik.engKam} km/soatga erishilmadi (eng ko‘pi ${Math.round(h.max)})`);
          }
        }
        return oldKesdi(q.chiqish);
      }

      case 'avariya': {
        if (h.faza === 'kutish' && old.x <= h.trigX && kmh >= 10) {
          h.faza = 'signal'; h.p0 = old; const v0 = Math.abs(v);
          h.chegara = Math.max(5, v0 * 1.0 + (v0 * v0) / (2 * 5)) + 0.5;
          this.avariyaSignal = true;
          this.onXabar?.('TO‘XTANG!', 'ogoh');
        } else if (h.faza === 'signal' && h.turish >= 0.3) {
          const l = masofa(h.p0, old);
          if (l > h.chegara) this.jarima('mashq', old, `To‘xtash masofasi oshib ketdi: ${l.toFixed(1)} m (ruxsat ${h.chegara.toFixed(1)} m)`);
          h.faza = 'toxtadi'; h.tt = 0;
        } else if (h.faza === 'toxtadi') {
          h.tt += dt;
          if (this.s.avariyaChiroqKerak && !pnl.avariyaChiroq && h.tt > 5 && !h.chiroqJarima) { h.chiroqJarima = true; this.jarima('avariyaChiroq', old); }
          if (h.tt >= 2 && (pnl.avariyaChiroq || !this.s.avariyaChiroqKerak || h.chiroqJarima)) { h.faza = 'davom'; this.avariyaSignal = false; }
        }
        if (oldKesdi(q.chiqish)) {
          if (h.faza === 'kutish') this.jarima('mashq', old, 'Avariya to‘xtash mashqi bajarilmadi (tezlik 10 km/soatdan past)');
          else if (h.faza === 'signal') this.jarima('mashq', old, 'Signal yonganda to‘xtalmadi');
          this.avariyaSignal = false;
          return true;
        }
        return false;
      }

      case 'parallel': {
        if (v < -0.1) h.orqaga = true;
        const joy = q.m.joy as V[];
        const x0 = Math.min(joy[0].x, joy[2].x), x1 = Math.max(joy[0].x, joy[2].x);
        const ogzi = q.m.ogzi as number, tashqi = q.m.tashqiY as number, nazorat = q.m.nazoratY as number;
        if (!h.joylashdi && h.turish >= 1 && h.orqaga) {
          const ichkarida = mash.kuzov().every((p) => p.x >= x0 - 0.02 && p.x <= x1 + 0.02 && p.y >= ogzi - 0.05 && p.y <= tashqi + 0.05);
          const g = mash.gildiraklar();
          const ong = g[1].y >= nazorat && g[3].y >= nazorat;
          const yonalish = Math.abs(Math.cos(mash.th) + 1) < 0.035; // g'arbga qarab (±15°)
          if (ichkarida && ong && yonalish) {
            h.joylashdi = true;
            this.onXabar?.('✓ Avtomobil joyga to‘g‘ri qo‘yildi. Chap ko‘rsatkichni yoqib chiqing', 'yaxshi');
          }
        }
        if (h.joylashdi && !h.chiqishTekshirildi && old.y < ogzi - 0.15 && v > 0) {
          h.chiqishTekshirildi = true;
          if (!pnl.chapChiroq) this.jarima('chiroq', old, 'To‘xtash joyidan chiqishda chap ko‘rsatkich yoqilmagan');
        }
        if (oldKesdi(q.chiqish)) {
          if (!h.joylashdi) this.jarima('mashq', old, 'Avtomobil to‘xtash joyiga to‘g‘ri qo‘yilmadi');
          return true;
        }
        return false;
      }

      case 'finish': {
        if (oldKesdi(q.m.finishChiziq)) h.otdi = true;
        if (h.otdi && h.turish >= 1) return true;
        if (h.otdi && old.x < (q.m.toxtashOxiri as number)) {
          this.jarima('mashq', old, 'Finishdan keyin belgilangan joyda to‘xtalmadi');
          return true;
        }
        return false;
      }
    }
    return false;
  }

  /** Qadam yo'lining berilgan chiziq yaqinidagi yo'nalishi (birlik vektor) */
  private yolYonalishi(q: Qadam, ch: [V, V]): V {
    const c = { x: (ch[0].x + ch[1].x) / 2, y: (ch[0].y + ch[1].y) / 2 };
    let eng = 1, d0 = Infinity;
    for (let i = 1; i < q.yol.length; i++) {
      const d = masofa(q.yol[i], c);
      if (d < d0) { d0 = d; eng = i; }
    }
    const a = q.yol[Math.max(0, eng - 1)], b = q.yol[Math.min(q.yol.length - 1, eng)];
    const l = masofa(a, b) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  }
  /** Nuqtaning chiziqqa nisbatan holati: manfiy — yetmagan, musbat — o'tgan (dir bo'yicha) */
  private yonida(p: V, ch: [V, V], dir: V) { return (p.x - ch[0].x) * dir.x + (p.y - ch[0].y) * dir.y; }
  private chiziqgacha(p: V, ch: [V, V], dir: V) { return Math.abs(this.yonida(p, ch, dir)); }

  // ───────────────────────── Ko'rsatmalar ─────────────────────────
  private korsatmaTop(q: Qadam | undefined, mash: Mashina, k: Boshqaruv, pnl: Panel): string {
    if (this.tugadi) return '';
    if (!mash.ishlayapti) return 'Dvigatel o‘chdi — "O‘t oldirish" tugmasini bosing';
    if (!q) return '';
    if (!this.faol) {
      if (!this.boshlandi) return q.nom + ': kirish chizig‘i tomon harakatlaning';
      return `Keyingi mashq: ${q.nom}`;
    }
    const h = this.h;
    switch (q.kod) {
      case 'start':
        if (!this.boshlandi) {
          const kerak: string[] = [];
          if (!pnl.kamar) kerak.push('kamarni taqing');
          if (!pnl.chapChiroq) kerak.push('chap ko‘rsatkichni yoqing');
          if (k.qolTormoz) kerak.push('qo‘l tormozini tushiring');
          if (k.uzatma !== '1') kerak.push('1-uzatmani qo‘shing');
          return kerak.length ? cap(kerak.join(', ')) : 'Gazni bosib harakatni boshlang';
        }
        return 'Tezlik 20 km/soatdan oshmasin';
      case 'piyoda':
        return this.piyoda.holat === 'otyapti' || this.piyoda.holat === 'kutyapti' ? 'Piyodaga yo‘l bering — o‘tish joyi oldida to‘xtang' : 'Piyodalar o‘tish joyi: ehtiyot bo‘ling';
      case 'estakada':
        return h.faza === 'yaqin' ? 'Estakada: to‘xtash chizig‘i oldida to‘xtang (chiziqni bosmang)'
          : h.faza === 'toxtadi' ? 'Orqaga sirpanmasdan harakatlaning: qo‘l tormozi + gaz, so‘ng tormozni tushiring' : 'Estakadadan ehtiyotkorlik bilan tushing';
      case 'burilish90': return 'Sariq chiziq va bordyurga tegmasdan "Z" yo‘lakdan o‘ting';
      case 'ilon': return 'Sariq chiziq va bordyurga tegmasdan ilon izi bo‘ylab o‘ting';
      case 'chorraha': {
        const taqiq = this.sv.taqiqlovchi(q.m.svetofor);
        if (taqiq && !h.stopKesdi) return 'Svetofor taqiqlaydi — to‘xtash chizig‘i oldida to‘xtang';
        const yon = q.m.yonalish === 'chap' ? 'chapga buriling (chap ko‘rsatkich)' : q.m.yonalish === 'ong' ? 'o‘ngga buriling (o‘ng ko‘rsatkich)' : 'to‘g‘riga o‘ting';
        return 'Chorrahada ' + yon;
      }
      case 'boks':
        return h.nazorat ? 'Boksdan chiqib, o‘ngga burilib orqaga qayting' : 'Boks yonidan o‘tib to‘xtang, so‘ng orqa bilan boksga nazorat chizig‘igacha kiring';
      case 'temir': return h.toxtadi ? 'Temir yo‘l kesishmasidan o‘ting' : 'STOP: to‘xtash chizig‘i oldida to‘liq to‘xtang';
      case 'tezlashish':
        return h.faza === 'oldin' ? 'Belgidan keyin tezlikni 20–40 km/soatga oshiring'
          : h.faza === 'zona' ? `Tezlik kamida ${this.s.tezlik.engKam}, ko‘pi bilan ${this.s.tezlik.tezlashish} km/soat` : 'Tezlikni 20 km/soatgacha pasaytiring';
      case 'avariya':
        return h.faza === 'kutish' ? 'Kamida 10–20 km/soat tezlikda harakatlaning. Qizil signal yonsa — darhol to‘xtang!'
          : h.faza === 'signal' ? 'TO‘XTANG!' : h.faza === 'toxtadi' ? (this.s.avariyaChiroqKerak && !pnl.avariyaChiroq ? 'Avariya chirog‘ini yoqing' : 'To‘xtadingiz') : 'Avariya chirog‘ini o‘chirib, harakatni davom ettiring';
      case 'parallel':
        return h.joylashdi ? 'Chap ko‘rsatkichni yoqib, to‘xtash joyidan chiqing' : 'Joydan o‘tib to‘xtang, so‘ng orqaga yurib to‘xtash joyiga parallel kiring';
      case 'finish': return h.otdi ? 'To‘xtang — imtihon yakunlanadi' : 'FINISH chizig‘idan o‘tib, to‘xtash joyida to‘xtang';
    }
    return '';
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
