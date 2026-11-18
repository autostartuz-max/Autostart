// 2D geometriya. Dunyo tekisligi: x — sharq, y — shimol (metr).
// Burchak (yo'nalish) — radian, 0 = sharq, soat miliga teskari musbat (chapga burilish = burchak oshadi).
// three.js ga o'tkazish: X = x, Z = -y, mashina rotation.y = burchak + PI/2 (grafika qatlamida).

export interface V { x: number; y: number }

export const GRAD = Math.PI / 180;
export const v = (x: number, y: number): V => ({ x, y });
export const qosh = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
export const ayir = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
export const kop = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
export const skalyar = (a: V, b: V) => a.x * b.x + a.y * b.y;
export const vektorli = (a: V, b: V) => a.x * b.y - a.y * b.x;
export const uzunlik = (a: V) => Math.hypot(a.x, a.y);
export const masofa = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
export const birlik = (a: V): V => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
/** Burchakdan birlik vektor */
export const yon = (th: number): V => ({ x: Math.cos(th), y: Math.sin(th) });
/** Chap normal (90° soat miliga teskari) */
export const chapga = (a: V): V => ({ x: -a.y, y: a.x });
export const aylantir = (a: V, th: number): V => {
  const c = Math.cos(th), s = Math.sin(th);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};
export const oraliq = (a: V, b: V, t: number): V => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
/** Burchaklar farqi [-PI, PI] oralig'ida */
export const burchakFarqi = (a: number, b: number) => {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
export const chekla = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Lokal koordinatadan (oldinga f, chapga l) dunyoga: p nuqtadan th yo'nalishda */
export const lokal = (p: V, th: number, f: number, l: number): V => ({
  x: p.x + Math.cos(th) * f - Math.sin(th) * l,
  y: p.y + Math.sin(th) * f + Math.cos(th) * l,
});

/** Ko'pburchakning ishorali yuzasi (soat miliga teskari bo'lsa musbat) */
export function yuza(poly: V[]): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j].x * poly[i].y - poly[i].x * poly[j].y);
  return s / 2;
}

/** Nuqta ko'pburchak ichidami (nur usuli) */
export function ichida(p: V, poly: V[]): boolean {
  let ich = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ich = !ich;
  }
  return ich;
}

/** Nuqtadan kesmagacha eng qisqa masofa */
export function kesmagacha(p: V, a: V, b: V): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Ikki kesma kesishadimi (uchlari tegishi ham hisob) */
export function kesishadi(a1: V, a2: V, b1: V, b2: V): boolean {
  const d1 = vektorli(ayir(a2, a1), ayir(b1, a1));
  const d2 = vektorli(ayir(a2, a1), ayir(b2, a1));
  const d3 = vektorli(ayir(b2, b1), ayir(a1, b1));
  const d4 = vektorli(ayir(b2, b1), ayir(a2, b1));
  return ((d1 > 0) !== (d2 > 0) || d1 === 0 || d2 === 0) && ((d3 > 0) !== (d4 > 0) || d3 === 0 || d4 === 0)
    && !(d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0 && !ustmaUst(a1, a2, b1, b2));
}
function ustmaUst(a1: V, a2: V, b1: V, b2: V) {
  const ich = (p: V, q: V, r: V) => Math.min(p.x, q.x) - 1e-9 <= r.x && r.x <= Math.max(p.x, q.x) + 1e-9 && Math.min(p.y, q.y) - 1e-9 <= r.y && r.y <= Math.max(p.y, q.y) + 1e-9;
  return ich(a1, a2, b1) || ich(a1, a2, b2) || ich(b1, b2, a1) || ich(b1, b2, a2);
}

/** Ko'pburchaklar kesishadimi (qirralar kesishadi yoki biri ikkinchisi ichida) */
export function kopburchakKesishadi(a: V[], b: V[]): boolean {
  for (let i = 0, j = a.length - 1; i < a.length; j = i++)
    for (let k = 0, m = b.length - 1; k < b.length; m = k++) if (kesishadi(a[j], a[i], b[m], b[k])) return true;
  return ichida(a[0], b) || ichida(b[0], a);
}

/** Polilinaning umumiy uzunligi */
export function chiziqUzunligi(ch: V[]): number {
  let s = 0;
  for (let i = 1; i < ch.length; i++) s += masofa(ch[i - 1], ch[i]);
  return s;
}

/** Har bir nuqtadagi birlik yo'nalish (urinma) */
export function urinmalar(ch: V[], yopiq = false): V[] {
  const n = ch.length;
  return ch.map((p, i) => {
    const old = yopiq ? ch[(i - 1 + n) % n] : ch[Math.max(0, i - 1)];
    const keyin = yopiq ? ch[(i + 1) % n] : ch[Math.min(n - 1, i + 1)];
    const a = birlik(ayir(p, old)), b = birlik(ayir(keyin, p));
    if (!yopiq && i === 0) return b;
    if (!yopiq && i === n - 1) return a;
    return birlik(qosh(a, b));
  });
}

/**
 * Polilinani chap tomonga d metr siljitish (manfiy — o'ngga). Burchaklarda miter (cheklangan),
 * shunda to'g'ri burchakli chegaralar ham to'g'ri siljiydi.
 */
export function siljit(ch: V[], d: number, yopiq = false): V[] {
  const n = ch.length;
  const out: V[] = [];
  for (let i = 0; i < n; i++) {
    const p = ch[i];
    const oldi = yopiq || i > 0 ? ch[(i - 1 + n) % n] : null;
    const keyin = yopiq || i < n - 1 ? ch[(i + 1) % n] : null;
    const n1 = oldi ? chapga(birlik(ayir(p, oldi))) : null;
    const n2 = keyin ? chapga(birlik(ayir(keyin, p))) : null;
    if (n1 && n2) {
      const m = birlik(qosh(n1, n2));
      const c = skalyar(m, n1);
      const k = Math.min(3, 1 / Math.max(c, 0.2)); // miter uzunligi cheklangan
      out.push(qosh(p, kop(m, d * k)));
    } else out.push(qosh(p, kop(uchNormal(ch, i === 0) ?? (n1 || n2)!, d)));
  }
  return out;
}

/** Ochiq polilina uchidagi normal: yoy bo'lsa, vatar burchagini yarim qadamga to'g'rilaymiz */
function uchNormal(ch: V[], boshi: boolean): V | null {
  const n = ch.length;
  if (n < 3) return null;
  const [a, b, c] = boshi ? [ch[0], ch[1], ch[2]] : [ch[n - 1], ch[n - 2], ch[n - 3]];
  const t1 = Math.atan2(b.y - a.y, b.x - a.x), t2 = Math.atan2(c.y - b.y, c.x - b.x);
  const d = burchakFarqi(t2, t1);
  if (Math.abs(d) > 20 * GRAD) return null;
  const t = t1 - d / 2;
  const tangens = boshi ? t : t + Math.PI; // oxirida yo'nalish teskari (oxiridan boshiga qarab o'lchangan)
  return chapga(yon(tangens));
}

/** Markaziy chiziq bo'ylab yo'lak (bant) ko'pburchagi: chapga `chap`, o'ngga `ong` metr */
export function bant(ch: V[], chap: number, ong: number): V[] {
  const l = siljit(ch, chap);
  const r = siljit(ch, -ong);
  return [...r, ...l.reverse()];
}

/** Ikki nuqta orasidagi to'g'ri to'rtburchak (kesma o'qi, eni) */
export function tortburchak(a: V, b: V, eni: number): V[] {
  const n = kop(chapga(birlik(ayir(b, a))), eni / 2);
  return [ayir(a, n), ayir(b, n), qosh(b, n), qosh(a, n)];
}

/** Markaz, yo'nalish, uzunlik (oldinga) va eni bo'yicha to'rtburchak (markazdan oldinga/orqaga yarim) */
export function qutiMarkaz(m: V, th: number, uzun: number, eni: number): V[] {
  return [lokal(m, th, -uzun / 2, -eni / 2), lokal(m, th, uzun / 2, -eni / 2), lokal(m, th, uzun / 2, eni / 2), lokal(m, th, -uzun / 2, eni / 2)];
}

/** Yoy nuqtalari: markaz, radius, boshlang'ich burchak (markazdan), burilish (ishorali, radian) */
export function yoyNuqtalari(m: V, r: number, a0: number, burilish: number, qadam = 0.35): V[] {
  const n = Math.max(2, Math.ceil((Math.abs(burilish) * r) / qadam));
  const out: V[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (burilish * i) / n;
    out.push({ x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r });
  }
  return out;
}

/** Ichki burchakni yumaloqlash bo'lagi: burchak nuqtasi, ikki chegara yo'nalishi (burchakdan tashqariga), radius */
export function yumaloqBurchak(c: V, u1: V, u2: V, r: number): V[] {
  const a = birlik(u1), b = birlik(u2);
  const t1 = qosh(c, kop(a, r)), t2 = qosh(c, kop(b, r));
  const m = qosh(c, qosh(kop(a, r), kop(b, r))); // yoy markazi (to'g'ri burchak uchun)
  const s = Math.atan2(t1.y - m.y, t1.x - m.x);
  let e = Math.atan2(t2.y - m.y, t2.x - m.x);
  let d = burchakFarqi(e, s);
  // Yoy burchak nuqtasi tomonidan o'tmasligi kerak: c dan uzoq tomondagi qisqa yoy
  const orta = s + d / 2;
  const oq = { x: m.x + Math.cos(orta) * r, y: m.y + Math.sin(orta) * r };
  if (masofa(oq, c) > masofa(m, c)) d = d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI;
  return [c, ...yoyNuqtalari(m, r, s, d, 0.25)];
}

/** Chiziqli interpolyatsiya bilan polilinada s masofadagi nuqta va yo'nalish */
export function chiziqdaNuqta(ch: V[], s: number): { p: V; th: number } {
  let qoldi = s;
  for (let i = 1; i < ch.length; i++) {
    const l = masofa(ch[i - 1], ch[i]);
    if (qoldi <= l || i === ch.length - 1) {
      const t = l ? chekla(qoldi / l, 0, 1) : 0;
      return { p: oraliq(ch[i - 1], ch[i], t), th: Math.atan2(ch[i].y - ch[i - 1].y, ch[i].x - ch[i - 1].x) };
    }
    qoldi -= l;
  }
  return { p: ch[0], th: 0 };
}

/** Polilinaga eng yaqin nuqta: masofa bo'ylab s, yon siljish (chap +), yo'nalish */
export function proyeksiya(ch: V[], p: V): { s: number; yon: number; th: number; d: number } {
  let eng = { s: 0, yon: 0, th: 0, d: Infinity };
  let s0 = 0;
  for (let i = 1; i < ch.length; i++) {
    const a = ch[i - 1], b = ch[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const l = Math.sqrt(l2);
    let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + dx * t, qy = a.y + dy * t;
    const d = Math.hypot(p.x - qx, p.y - qy);
    if (d < eng.d) {
      const yonish = l ? ((p.y - a.y) * dx - (p.x - a.x) * dy) / l : 0;
      eng = { s: s0 + l * t, yon: yonish, th: Math.atan2(dy, dx), d };
    }
    s0 += l;
  }
  return eng;
}

/** Oddiy fazoviy panjara: to'qnashuv va chiziq tekshiruvini tezlashtiradi */
export class Panjara<T> {
  private h = new Map<number, T[]>();
  constructor(private hujayra = 4) {}
  private kalit(i: number, j: number) { return (i + 4096) * 8192 + (j + 4096); }
  qosh(minX: number, minY: number, maxX: number, maxY: number, t: T) {
    const k = this.hujayra;
    for (let i = Math.floor(minX / k); i <= Math.floor(maxX / k); i++)
      for (let j = Math.floor(minY / k); j <= Math.floor(maxY / k); j++) {
        const key = this.kalit(i, j);
        let l = this.h.get(key);
        if (!l) this.h.set(key, (l = []));
        l.push(t);
      }
  }
  sorov(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const k = this.hujayra;
    const out = new Set<T>();
    for (let i = Math.floor(minX / k); i <= Math.floor(maxX / k); i++)
      for (let j = Math.floor(minY / k); j <= Math.floor(maxY / k); j++) {
        const l = this.h.get(this.kalit(i, j));
        if (l) for (const t of l) out.add(t);
      }
    return [...out];
  }
}

/** Ko'pburchakning chegaralovchi to'rtburchagi */
export function chegara(pts: V[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
