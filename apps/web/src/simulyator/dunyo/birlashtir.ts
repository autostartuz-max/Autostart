import * as pcNs from 'polygon-clipping';
import { type V, yuza, siljit, ichida, masofa } from '../asos/geom';
import type { Boyoq } from './turlar';

// Paket ESM'da faqat default eksport qiladi, CJS'da (Node sinovlari) — nomli. Ikkalasiga ham mos.
const pc: typeof pcNs = ((pcNs as any).default ?? pcNs) as typeof pcNs;

type Juft = [number, number];

/** Asfalt bo'laklarini birlashtirish. Natija: [tashqi halqa (soat miliga teskari), ...teshiklar (soat mili bo'yicha)] */
export function birlashtir(bolaklar: V[][]): V[][][] {
  const geom = bolaklar
    .filter((p) => p.length >= 3 && Math.abs(yuza(p)) > 1e-4)
    .map((p) => [p.map((q) => [q.x, q.y] as Juft)]);
  const natija = pc.union(geom[0] as any, ...(geom.slice(1) as any[]));
  return natija.map((poly) =>
    poly.map((halqa, i) => {
      const r = soddalashtir(halqa.slice(0, -1).map(([x, y]) => ({ x, y })));
      const a = yuza(r);
      if ((i === 0 && a < 0) || (i > 0 && a > 0)) r.reverse();
      return r;
    }),
  );
}

/** Bir chiziqda yotgan va juda yaqin nuqtalarni olib tashlash */
function soddalashtir(r: V[]): V[] {
  const out: V[] = [];
  for (const p of r) if (!out.length || masofa(out[out.length - 1], p) > 0.02) out.push(p);
  if (out.length > 2 && masofa(out[0], out[out.length - 1]) < 0.02) out.pop();
  const n = out.length;
  const qoldi: V[] = [];
  for (let i = 0; i < n; i++) {
    const a = out[(i - 1 + n) % n], b = out[i], c = out[(i + 1) % n];
    const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    const l = masofa(a, b) * masofa(b, c);
    if (l > 0 && Math.abs(cr) / l < 1e-4 && masofa(a, c) < 12) continue; // to'g'ri chiziq ustidagi ortiqcha nuqta
    qoldi.push(b);
  }
  return tikansiz(qoldi);
}

/** Birlashma chegarasidagi mayda tikan/pog'onalarni olib tashlash (yo'nalish keskin qaytadigan qisqa bo'laklar) */
function tikansiz(r: V[]): V[] {
  let h = r;
  for (let takror = 0; takror < 4; takror++) {
    const n = h.length;
    if (n < 4) return h;
    const out: V[] = [];
    let ozgardi = false;
    for (let i = 0; i < n; i++) {
      const a = h[(i - 1 + n) % n], b = h[i], c = h[(i + 1) % n];
      const ab = masofa(a, b), bc = masofa(b, c);
      const dot = ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) / (ab * bc || 1);
      if (Math.min(ab, bc) < 0.15 && dot < -0.2) { ozgardi = true; continue; }
      out.push(b);
    }
    h = out;
    if (!ozgardi) break;
  }
  return h;
}

/** Asfalt chegaralari (barcha halqalar) — asfalt har doim halqaning chap tomonida */
export const chegaralar = (asfalt: V[][][]): V[][] => asfalt.flat();

/**
 * Chet chiziqlari: chegaradan `ichkari` metr ichkarida, `eni` qalinlikda.
 * Mashq hududida (zonalar) — sariq (1.4), qolgan joyda — oq (1.1). Bo'laklarga bo'linadi (tekshiruv tez bo'lsin).
 */
export function chetChiziqlari(halqalar: V[][], zonalar: V[][], ichkari = 0.25, eni = 0.1): Boyoq[] {
  const out: Boyoq[] = [];
  for (const hAsl of halqalar) {
    const h = zichla(hAsl, 0.5); // rang zona chegarasida aniq almashsin
    const n = h.length;
    if (n < 3) continue;
    const a = siljit(h, ichkari, true);
    const b = siljit(h, ichkari + eni, true);
    const rang: ('oq' | 'sariq')[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const orta = { x: (a[i].x + a[j].x) / 2, y: (a[i].y + a[j].y) / 2 };
      rang.push(zonalar.some((z) => ichida(orta, z)) ? 'sariq' : 'oq');
    }
    // Rang o'zgaradigan joydan boshlaymiz (yopiq halqa)
    let bosh = 0;
    for (let i = 0; i < n; i++) if (rang[i] !== rang[(i - 1 + n) % n]) { bosh = i; break; }
    let i0 = bosh;
    let sanoq = 0;
    for (let k = 0; k < n; k++) {
      const i = (bosh + k) % n;
      const keyingi = (i + 1) % n;
      sanoq++;
      const oxir = k === n - 1 || rang[keyingi] !== rang[i] || sanoq >= 24;
      if (oxir) {
        const idx: number[] = [];
        for (let t = 0; t <= sanoq; t++) idx.push((i0 + t) % n);
        const poly = [...idx.map((t) => a[t]), ...idx.reverse().map((t) => b[t])];
        out.push({ poly, rang: rang[i0], tur: 'chet', xato: true });
        i0 = keyingi;
        sanoq = 0;
      }
    }
  }
  return out;
}

/** Yopiq halqani zichlash: har bir kesma `qadam` dan uzun bo'lmasin */
function zichla(h: V[], qadam: number): V[] {
  const out: V[] = [];
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const k = Math.max(1, Math.ceil(masofa(a, b) / qadam));
    for (let t = 0; t < k; t++) out.push({ x: a.x + ((b.x - a.x) * t) / k, y: a.y + ((b.y - a.y) * t) / k });
  }
  return out;
}

/** Ayirma: asos ko'pburchakdan (bitta halqa) asfalt ko'pburchaklarini ayirish (o't qatlami uchun) */
export function ayirma(asos: V[], kesuvchi: V[][][]): V[][][] {
  const a = [asos.map((p) => [p.x, p.y] as Juft)];
  const b = kesuvchi.map((poly) => poly.map((h) => h.map((p) => [p.x, p.y] as Juft)));
  const natija = pc.difference(a as any, ...(b as any[]));
  return natija.map((poly) => poly.map((h) => h.slice(0, -1).map(([x, y]) => ({ x, y }))));
}
