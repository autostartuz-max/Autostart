// Avtomatik haydovchi: imtihonni qoidaga muvofiq bajarib, mashqlar bajarilishi mumkinligini tekshiradi.
import { type V, GRAD, chekla, burchakFarqi, masofa, chapga } from '../src/simulyator/asos/geom';
import type { Maydon, Qadam } from '../src/simulyator/dunyo/turlar';
import type { Mashina, Boshqaruv } from '../src/simulyator/fizika/mashina';
import type { Hakam, Panel } from '../src/simulyator/imtihon/hakam';
import { rulChegara, type Uzatma } from '../src/simulyator/mashinalar';

type Manevr = { tur: string; faza: string; t: number; d: Record<string, number> };
const KMH = 1 / 3.6;

export class Avtopilot {
  k: Boshqaruv = { gaz: 0, tormoz: 1, rul: 0, rulUshlangan: true, uzatma: 'N', qolTormoz: true };
  pnl: Panel = { kamar: false, chapChiroq: false, ongChiroq: false, avariyaChiroq: false, faralar: false };
  qism = 0;
  s = 0;
  private uz: number[][];
  private man: Manevr | null = null;
  private tayyor = 0;
  private integ = 0;
  private R: number;          // eng kichik burilish radiusi (orqa o'q)
  private maxRul: number;
  private yurildi = 0;        // umumiy yurilgan masofa
  private signalOxir = -1;    // ko'rsatkichni o'chirish uchun masofa
  private qilindi = new Set<string>();
  private t = 0;
  log: string[] = [];

  /** Sinov uchun ataylab qilinadigan xatolar */
  readonly xato: Set<string>;
  constructor(readonly m: Maydon, readonly hk: Hakam, readonly mash: Mashina, xatolar: string[] = []) {
    this.xato = new Set(xatolar);
    this.uz = m.yolQismlari.map((ch) => { const u = [0]; for (let i = 1; i < ch.length; i++) u.push(u[i - 1] + masofa(ch[i - 1], ch[i])); return u; });
    this.R = mash.t.bazasi / Math.tan(mash.t.maxBurchak * GRAD);
    this.maxRul = rulChegara(mash.t);
    this.qism = hk.joriyQadam?.qism ?? 0;
    this.s = this.proj(mash.orqaOq, -Infinity, Infinity).s;
  }

  // ─────────── yordamchilar ───────────
  private proj(p: V, a: number, b: number) {
    const ch = this.m.yolQismlari[this.qism], u = this.uz[this.qism];
    let eng = { s: this.s, d: Infinity };
    for (let i = 1; i < ch.length; i++) {
      if (u[i] < a || u[i - 1] > b) continue;
      const A = ch[i - 1], B = ch[i], dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy;
      let t = l2 ? ((p.x - A.x) * dx + (p.y - A.y) * dy) / l2 : 0;
      t = chekla(t, 0, 1);
      const d = Math.hypot(p.x - A.x - dx * t, p.y - A.y - dy * t);
      if (d < eng.d) eng = { s: u[i - 1] + (u[i] - u[i - 1]) * t, d };
    }
    return eng;
  }
  private nuqta(s: number): V {
    const ch = this.m.yolQismlari[this.qism], u = this.uz[this.qism];
    if (s <= 0) return ch[0];
    for (let i = 1; i < ch.length; i++) if (u[i] >= s) { const t = (s - u[i - 1]) / (u[i] - u[i - 1] || 1); return { x: ch[i - 1].x + (ch[i].x - ch[i - 1].x) * t, y: ch[i - 1].y + (ch[i].y - ch[i - 1].y) * t }; }
    return ch[ch.length - 1];
  }
  private rulQoy(delta: number) { this.k.rul = chekla((-delta / GRAD) * this.mash.t.rulNisbati, -this.maxRul, this.maxRul); }
  /** Uzatma qo'yish: harakat to'xtamaguncha tormoz */
  private uzatma(u: Uzatma): boolean {
    if (this.k.uzatma === u) return true;
    if (Math.abs(this.mash.v) > 0.03) { this.k.gaz = 0; this.k.tormoz = 1; return false; }
    this.k.uzatma = u;
    return true;
  }
  /** Tezlikni ushlash (vt — m/s, ishorasi yo'nalish) */
  private tezlik(vt: number, dt: number) {
    if (Math.abs(vt) < 0.005) { this.k.gaz = 0; this.k.tormoz = Math.abs(this.mash.v) < 0.4 ? 1 : 0.6; this.integ = 0; return; }
    if (!this.uzatma(vt > 0 ? (this.xato.has('ikkinchi') ? '2' : '1') : 'R')) return;
    const ev = (vt - this.mash.v) * Math.sign(vt);
    this.integ = chekla(this.integ + ev * dt * 0.4, -0.2, 0.7);
    if (ev > -0.1) { this.k.gaz = chekla(0.22 * ev + this.integ, 0, 1); this.k.tormoz = 0; }
    else { this.k.gaz = 0; this.k.tormoz = chekla(-ev * 0.4, 0.05, 1); this.integ = Math.min(this.integ, 0.1); }
  }
  /** Marshrut chizig'iga ergashish (pure pursuit, orqa o'q) */
  private ergash(vt: number, dt: number) {
    const R = this.mash.orqaOq;
    const pr = this.proj(R, this.s - 3, this.s + 15);
    this.s = pr.s;
    const L = chekla(2.2 + Math.abs(this.mash.v) * 0.55, 2.4, 6);
    const P = this.nuqta(this.s + L);
    this.rulQoy(Math.atan2(2 * this.mash.t.bazasi * Math.sin(Math.atan2(P.y - R.y, P.x - R.x) - this.mash.th), L));
    this.tezlik(vt, dt);
  }
  /** To'g'ri chiziqqa (p nuqtadan th yo'nalishda) ergashish */
  private togri(p: V, th: number, vt: number, dt: number) {
    const R = this.mash.orqaOq;
    const f = (R.x - p.x) * Math.cos(th) + (R.y - p.y) * Math.sin(th);
    const L = 2.5;
    const sgn = vt >= 0 ? 1 : -1;
    const P = { x: p.x + Math.cos(th) * (f + L * sgn), y: p.y + Math.sin(th) * (f + L * sgn) };
    if (sgn > 0) this.rulQoy(Math.atan2(2 * this.mash.t.bazasi * Math.sin(Math.atan2(P.y - R.y, P.x - R.x) - this.mash.th), L));
    else {
      // orqaga: orqa o'q chiziqqa qarab — teskari pure pursuit
      const a = burchakFarqi(Math.atan2(R.y - P.y, R.x - P.x), this.mash.th);
      this.rulQoy(-Math.atan2(2 * this.mash.t.bazasi * Math.sin(a), L));
    }
    this.tezlik(vt, dt);
  }
  /** Old bamperdan chiziqqacha masofa (harakat yo'nalishi bo'yicha) */
  private oldgacha(ch: [V, V]) {
    const n = chapga({ x: (ch[1].x - ch[0].x) / (masofa(ch[0], ch[1]) || 1), y: (ch[1].y - ch[0].y) / (masofa(ch[0], ch[1]) || 1) });
    const h = { x: Math.cos(this.mash.th), y: Math.sin(this.mash.th) };
    const d = n.x * h.x + n.y * h.y >= 0 ? n : { x: -n.x, y: -n.y };
    const o = this.mash.old;
    return (ch[0].x - o.x) * d.x + (ch[0].y - o.y) * d.y;
  }
  /** Aniq nuqtada to'xtash: qolgan masofaga qarab sekinlashadi, yetganda — 0 */
  private nuqtagacha(qoldi: number, vmax: number) {
    if (qoldi <= 0.05) return 0;
    return Math.min(vmax, Math.max(1.3 * KMH, Math.sqrt(2 * 0.7 * qoldi)));
  }
  /** Chiziq oldida to'xtash uchun tezlik (masofa — to'xtash nuqtasigacha) */
  private toxtashV(vt: number, masofa: number) {
    if (masofa <= 0.05) return 0;
    return Math.min(vt, Math.sqrt(2 * 1.3 * masofa) + 0.15);
  }

  // ─────────── asosiy ───────────
  qadam(dt: number) {
    this.t += dt;
    const hk = this.hk, m = this.mash;
    this.yurildi += Math.abs(m.v) * dt;
    // Tayyorgarlik: kamar, chap ko'rsatkich, qo'l tormozi, 1-uzatma
    if (this.tayyor < 1.2) {
      this.tayyor += dt;
      this.pnl.kamar = !this.xato.has('kamarsiz');
      this.k.tormoz = 1; this.k.gaz = 0;
      if (hk.joriyQadam?.kod === 'start' && !this.xato.has('signalsiz')) this.pnl.chapChiroq = true;
      if (this.tayyor > 0.4 && !this.xato.has('qolTormoz')) this.k.qolTormoz = false;
      if (this.tayyor > 0.7) this.k.uzatma = this.xato.has('ikkinchi') ? '2' : '1';
      return;
    }
    if (!m.ishlayapti) { m.yurgiz(); this.log.push(`${this.t.toFixed(1)}s: dvigatel qayta yurgizildi`); if (this.xato.has('ikkinchi')) { this.k.uzatma = 'N'; this.xato.delete('ikkinchi'); } }
    if (this.xato.has('qolTormoz') && this.yurildi > 4) { this.k.qolTormoz = false; this.xato.delete('qolTormoz'); }
    if (this.xato.has('signalsiz')) { this.pnl.chapChiroq = false; this.pnl.ongChiroq = false; }
    if (this.xato.has('toxtash') && m.y < -30 && m.x > 60 && !this.qilindi.has('toxtash') && !this.man) {
      this.man = { tur: 'kut', faza: 'kut', t: 0, d: { soniya: 12 } }; this.qilindi.add('toxtash');
    }
    if (this.signalOxir > 0 && this.yurildi > this.signalOxir) { this.pnl.chapChiroq = false; this.pnl.ongChiroq = false; this.signalOxir = -1; }
    if (this.man) { this.manevr(dt); return; }

    const q = hk.joriyQadam;
    let vt = (this.xato.has('tez') && q?.kod === 'start' && hk.faol ? 32 : 14) * KMH;
    // T-chorrahalardagi burilish ko'rsatkichlari
    for (const sn of this.m.signalNuqtalar) {
      const d = this.oldgacha(sn.chiziq);
      const h = { x: Math.cos(m.th), y: Math.sin(m.th) };
      const ln = { x: sn.chiziq[1].x - sn.chiziq[0].x, y: sn.chiziq[1].y - sn.chiziq[0].y };
      const yaqin = masofa(m.old, { x: (sn.chiziq[0].x + sn.chiziq[1].x) / 2, y: (sn.chiziq[0].y + sn.chiziq[1].y) / 2 }) < 16;
      if (yaqin && d > 0 && d < 14 && Math.abs(h.x * ln.x + h.y * ln.y) < 0.5 * Math.hypot(ln.x, ln.y)) {
        if (!this.xato.has('signalsiz')) { if (sn.tomon === 'chap') this.pnl.chapChiroq = true; else this.pnl.ongChiroq = true; }
        this.signalOxir = this.yurildi + d + 14;
      }
    }
    if (q?.kod === 'start' && hk.faol && this.yurildi > 6 && !this.qilindi.has('startSignal')) { this.qilindi.add('startSignal'); this.pnl.chapChiroq = false; }

    switch (q?.kod) {
      case 'piyoda': {
        const z = q.m.zebra as V[];
        const yaqinChet: [V, V] = [z[3], z[2]]; // shimoliy chet (janubga harakatda yaqin)
        const d = this.oldgacha(yaqinChet);
        if ((hk.piyoda.holat === 'otyapti' || hk.piyoda.holat === 'kutyapti') && d > -0.2 && !this.xato.has('piyodaga')) vt = this.toxtashV(vt, d - 1.2);
        break;
      }
      case 'estakada': {
        if (!hk.faol && this.oldgacha(q.kirish) > 0) break;
        const st = q.m.stopChiziq as [V, V];
        const d = this.oldgacha(st) - 0.2; // yaqin chetgacha
        if (this.xato.has('estakadaToxtamas')) { vt = 8 * KMH; break; }
        if (!this.qilindi.has('est')) {
          vt = Math.min(8 * KMH, this.toxtashV(vt, d - 0.45));
          if (Math.abs(m.v) < 0.02 && d < 1.2) {
            this.man = { tur: 'tepalik', faza: 'kut', t: 0, d: {} };
            this.qilindi.add('est');
            return this.manevr(dt);
          }
        } else vt = 8 * KMH;
        break;
      }
      case 'burilish90':
        if (hk.faol && !this.qilindi.has('z90')) { this.qilindi.add('z90'); this.man = { tur: 'z90', faza: 'kirish', t: 0, d: this.z90Hisob(q) }; return this.manevr(dt); }
        vt = this.toxtashV(8 * KMH, this.oldgacha(q.kirish) + 3) || 4 * KMH;
        break;
      case 'chorraha': {
        const id = q.m.svetofor as string;
        const st = q.m.stop as [V, V];
        const d = this.oldgacha(st) - 0.2;
        if (q.m.yonalish !== 'togri' && d < 30 && d > -12 && !this.xato.has('signalsiz')) { if (q.m.yonalish === 'chap') this.pnl.chapChiroq = true; else this.pnl.ongChiroq = true; this.signalOxir = this.yurildi + Math.max(0, d) + 25; }
        const ish = hk.sv.ishora(id);
        const toxta = hk.sv.taqiqlovchi(id, 0) || ish === 'sariq' || (ish === 'miltillash' && d > 8);
        if (toxta && d > 0.3 && !this.xato.has('qizil')) vt = this.toxtashV(vt, d - 0.7);
        if (q.m.yonalish !== 'togri' && d < 6) vt = Math.min(vt, 10 * KMH);
        break;
      }
      case 'ilon':
        vt = hk.faol ? 5 * KMH : this.toxtashV(10 * KMH, this.oldgacha(q.kirish)) + 5 * KMH;
        break;
      case 'boks':
        if (hk.faol && !this.qilindi.has('boks')) { this.qilindi.add('boks'); this.man = { tur: 'boks', faza: 'kirish', t: 0, d: this.boksHisob(q) }; return this.manevr(dt); }
        vt = Math.max(5 * KMH, this.toxtashV(12 * KMH, this.oldgacha(q.kirish)));
        break;
      case 'temir': {
        const st = q.m.stopChiziq as [V, V];
        const d = this.oldgacha(st) - 0.2;
        if (!this.qilindi.has('temir') && !this.xato.has('stopsiz')) {
          if (d > -0.1) vt = this.toxtashV(vt, d - 0.6);
          if (Math.abs(m.v) < 0.02 && d < 3) { this.man = { tur: 'kut', faza: 'kut', t: 0, d: { soniya: 1.3 } }; this.qilindi.add('temir'); return this.manevr(dt); }
        }
        break;
      }
      case 'tezlashish': {
        const dBosh = this.oldgacha(q.m.boshi), dOxir = this.oldgacha(q.m.oxiri);
        if (dBosh < 0 && dOxir > 6) vt = 31 * KMH;
        else if (dOxir <= 6) vt = 14 * KMH;
        break;
      }
      case 'avariya':
        if (hk.faol || this.oldgacha(q.kirish) < 8) {
          if (hk.avariyaSignal && !this.qilindi.has('av')) { this.man = { tur: 'avariya', faza: 'tormoz', t: 0, d: {} }; this.qilindi.add('av'); return this.manevr(dt); }
          vt = 18 * KMH;
        }
        break;
      case 'parallel':
        if (hk.faol && !this.qilindi.has('parallel') && !this.xato.has('parkovkasiz')) { this.qilindi.add('parallel'); this.man = { tur: 'parallel', faza: 'yaqin', t: 0, d: this.parallelHisob(q) }; return this.manevr(dt); }
        break;
      case 'finish': {
        const f = q.m.finishChiziq as [V, V];
        const d = this.oldgacha(f);
        vt = this.toxtashV(12 * KMH, d + 4.5);
        break;
      }
    }
    this.ergash(vt, dt);
  }

  // ─────────── manevrlar ───────────
  private z90Hisob(q: Qadam) {
    const z = q.zona!;
    const t = this.mash.t, R = this.R;
    const tash = Math.hypot(R + t.koleya / 2, t.bazasi) + 0.1; // old tashqi g'ildirak cheti
    const yS = z[0].y + 0.35, v0 = z[5].x, v1 = z[1].x, yN = z[4].y - 0.35, xc = (v0 + v1) / 2;
    const O1x = xc - R, O1y = yS + tash + 0.3;
    const O2x = xc + R, O2y = yN - tash - 0.3;
    return { O1x, O1y, O2x, O2y, xc, yKir: O1y - R, yChiq: O2y + R, xOxir: z[3].x + 3, x0: z[0].x };
  }
  private boksHisob(q: Qadam) {
    const b = q.m.boks as V[];
    const R = this.R, t = this.mash.t;
    const bx0 = Math.min(b[0].x, b[2].x), bx1 = Math.max(b[0].x, b[2].x);
    const bc = (bx0 + bx1) / 2;
    const oxir = (q.m.xb as number) + (q.m.uzun as number);
    let xa = bc - 0.1;                                          // boks ichida orqa o'q
    xa = Math.min(xa, oxir - 0.3 - (t.bazasi + t.oldiOsilma) - R);
    const ye = 0.15;
    return { xr: xa + R, xa, ye, yr: ye + R, nazorat: q.m.nazoratY as number, xb: q.m.xb as number };
  }
  private parallelHisob(q: Qadam) {
    const t = this.mash.t, R = this.R;
    const j = q.m.joy as V[];
    const x0 = Math.min(j[0].x, j[2].x) + 0.35, x1 = Math.max(j[0].x, j[2].x) - 0.35;
    const og = q.m.ogzi as number, tash = q.m.tashqiY as number, naz = q.m.nazoratY as number;
    const lo = Math.max(naz - t.koleya / 2 + 0.04, og + t.eni / 2 + 0.04);
    const hi = Math.min(tash - t.koleya / 2 - 0.12, tash - t.eni / 2 - 0.02);
    const yc = (lo + hi) / 2;
    const yl = Math.max(50.0, 48.15 + Math.hypot(R + t.eni / 2, t.bazasi + t.oldiOsilma) - R);
    const fi = Math.acos(1 - (yc - yl) / (2 * R));
    const dx = 2 * R * Math.sin(fi);
    const markazdan = (t.bazasi + t.oldiOsilma - t.orqaOsilma) / 2;
    const xOxir = (x0 + x1) / 2 + markazdan;     // g'arbga qaraganda orqa o'q markazdan sharqda
    // Chiqish: joydan qatorga S-yoy (kirishdagi kabi burchak)
    const fiChiq = Math.acos(1 - Math.min(2 * R, yc - (yl + 0.3)) / (2 * R));
    return { yl, yc, fi, fiChiq, xBosh: xOxir - dx, xOxir, xOrqa: x1 - 0.4 - t.orqaOsilma };
  }

  private oxirgiFaza = '';
  private manevr(dt: number) {
    const mn = this.man!, d = mn.d, m = this.mash;
    mn.t += dt;
    const kalit = mn.tur + ':' + mn.faza;
    if (kalit !== this.oxirgiFaza && process.env.SIM_DEBUG) {
      this.oxirgiFaza = kalit;
      this.log.push(`${this.t.toFixed(1)}s ${kalit} orqaO'q=(${m.x.toFixed(2)}, ${m.y.toFixed(2)}) th=${(m.th * 57.2958).toFixed(1)}° v=${m.v.toFixed(2)}`);
    }
    const R = m.orqaOq, th = m.th;
    const tugat = () => { this.man = null; this.s = this.proj(m.orqaOq, this.s - 5, this.s + 60).s; };
    switch (mn.tur) {
      case 'kut':
        this.k.gaz = 0; this.k.tormoz = 1;
        if (mn.t > d.soniya) tugat();
        return;
      case 'tepalik': // estakada: to'xtab, orqaga sirpanmasdan qo'zg'alish
        if (mn.faza === 'kut') { this.k.gaz = 0; this.k.tormoz = 1; if (mn.t > 1.5) { mn.faza = 'gaz'; mn.t = 0; } }
        else if (mn.faza === 'gaz') {
          if (this.xato.has('sirpanish') && mn.t < 1.5) { this.k.tormoz = 0; this.k.gaz = 0; return; }
          this.k.tormoz = 1; this.k.gaz = 0.5; if (mn.t > (this.xato.has('sirpanish') ? 1.9 : 0.4)) { mn.faza = 'qoyib'; mn.t = 0; }
        }
        else { this.k.tormoz = 0; this.k.gaz = 0.5; if (m.v > 0.6) tugat(); }
        return;
      case 'avariya':
        if (mn.faza === 'tormoz') { this.k.gaz = 0; this.k.tormoz = 1; if (Math.abs(m.v) < 0.02) { mn.faza = 'chiroq'; mn.t = 0; } }
        else if (mn.faza === 'chiroq') { this.k.tormoz = 1; if (mn.t > 0.8 && !this.xato.has('avariyaChiroqsiz')) this.pnl.avariyaChiroq = true; if (this.xato.has('avariyaChiroqsiz') && mn.t > 7) { mn.faza = 'och'; mn.t = 0; } if (!this.hk.avariyaSignal && mn.t > 2.5) { mn.faza = 'och'; mn.t = 0; } }
        else { this.pnl.avariyaChiroq = false; if (mn.t > 0.6) tugat(); }
        return;
      case 'z90':
        if (mn.faza === 'kirish') {
          this.togri({ x: d.x0, y: d.yKir }, 0, 3.5 * KMH, dt);
          if (R.x >= d.O1x + (this.xato.has('bordyur') ? 1.3 : 0)) { mn.faza = 'chap'; }
        } else if (mn.faza === 'chap') {
          this.k.rul = -this.maxRul; this.tezlik(2.5 * KMH, dt);
          if (burchakFarqi(th, Math.PI / 2) > -0.012) mn.faza = 'tik';
        } else if (mn.faza === 'tik') {
          this.togri({ x: d.xc, y: d.O1y }, Math.PI / 2, 3 * KMH, dt);
          if (R.y >= d.O2y) mn.faza = 'ong';
        } else if (mn.faza === 'ong') {
          this.k.rul = this.maxRul; this.tezlik(2.5 * KMH, dt);
          if (burchakFarqi(th, 0) < 0.012) mn.faza = 'chiqish';
        } else {
          this.togri({ x: d.O2x, y: d.yChiq }, 0, 6 * KMH, dt);
          if (R.x > d.xOxir) tugat();
        }
        return;
      case 'boks':
        if (mn.faza === 'kirish') {
          this.togri({ x: d.xb, y: d.ye }, 0, this.nuqtagacha(d.xr - R.x, 6 * KMH), dt);
          if (R.x >= d.xr - 0.06 && Math.abs(m.v) < 0.02) { mn.faza = 'orqaBur'; this.pnl.ongChiroq = false; }
        } else if (mn.faza === 'orqaBur') {
          this.k.rul = -this.maxRul;
          if (this.uzatma('R')) this.tezlik(-2.2 * KMH, dt);
          if (burchakFarqi(th, -Math.PI / 2) < 0.012) mn.faza = 'orqaTogri';
        } else if (mn.faza === 'orqaTogri') {
          this.togri({ x: R.x, y: R.y }, -Math.PI / 2, -2 * KMH, dt);
          const orqa = m.orqa;
          if (orqa.y >= d.nazorat + 0.3) { mn.faza = 'oldTogri'; }
        } else if (mn.faza === 'oldTogri') {
          if (this.uzatma('1')) this.togri({ x: d.xa, y: R.y }, -Math.PI / 2, 2.5 * KMH, dt);
          if (this.k.uzatma === '1' && R.y <= d.yr) mn.faza = 'oldBur';
        } else if (mn.faza === 'oldBur') {
          this.k.rul = this.maxRul; this.tezlik(2.5 * KMH, dt);
          if (Math.abs(burchakFarqi(th, Math.PI)) < 0.012) mn.faza = 'chiqish';
        } else {
          this.togri({ x: R.x, y: d.yr - this.R }, Math.PI, 6 * KMH, dt);
          if (R.x < d.xb - 3) { this.qism = 1; this.s = 0; this.s = this.proj(R, -Infinity, 30).s; this.man = null; }
        }
        return;
      case 'parallel':
        if (mn.faza === 'yaqin') {
          this.togri({ x: 60, y: d.yl }, Math.PI, this.nuqtagacha(R.x - d.xBosh, 8 * KMH), dt);
          if (R.x <= d.xBosh + 0.06 && Math.abs(m.v) < 0.02) mn.faza = 'bir';
        } else if (mn.faza === 'bir') {
          this.k.rul = this.maxRul;
          if (this.uzatma('R')) this.tezlik(-2.2 * KMH, dt);
          if (burchakFarqi(th, Math.PI + d.fi) > -0.01 && burchakFarqi(th, Math.PI) > 0.2) mn.faza = 'ikki';
        } else if (mn.faza === 'ikki') {
          this.k.rul = -this.maxRul; this.tezlik(-2.2 * KMH, dt);
          if (Math.abs(burchakFarqi(th, Math.PI)) < 0.01) { mn.faza = 'turish'; mn.t = 0; }
        } else if (mn.faza === 'turish') {
          this.k.rul = 0; this.k.gaz = 0; this.k.tormoz = 1;
          if (mn.t > 1.6) { this.pnl.chapChiroq = true; mn.faza = 'tisar'; }
        } else if (mn.faza === 'tisar') {
          // Chiqishdan oldin orqaga tisarilib, oldinda joy olish
          this.togri({ x: R.x, y: R.y }, Math.PI, -this.nuqtagacha(d.xOrqa - R.x, 2 * KMH), dt);
          if (R.x >= d.xOrqa - 0.06 && Math.abs(m.v) < 0.02) mn.faza = 'chiq1';
        } else if (mn.faza === 'chiq1') {
          this.k.rul = -this.maxRul;
          if (this.uzatma('1')) this.tezlik(3 * KMH, dt);
          if (burchakFarqi(th, Math.PI) > d.fiChiq - 0.02 || burchakFarqi(th, Math.PI) < -2) mn.faza = 'chiq2';
        } else if (mn.faza === 'chiq2') {
          this.k.rul = this.maxRul; this.tezlik(3 * KMH, dt);
          if (Math.abs(burchakFarqi(th, Math.PI)) < 0.05) { this.signalOxir = this.yurildi + 6; tugat(); }
        }
        return;
    }
  }
}
