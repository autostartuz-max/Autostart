// Avtodrom xaritasini SVG ga chizish (tekshirish uchun).
// Ishga tushirish: npx tsx apps/web/sim-sinov/xarita-svg.ts <chiqish.svg> [qism: minX,minY,maxX,maxY]
import { writeFileSync } from 'node:fs';
import { avtodromQur } from '../src/simulyator/dunyo/avtodrom';
import type { V } from '../src/simulyator/asos/geom';

const [out = 'xarita.svg', qismArg] = process.argv.slice(2);
const t0 = performance.now();
const m = avtodromQur({ B: 1.735, D: 4.48, K: 1.48, S: 0.91, qiyalik: 0.14 });
const vaqt = performance.now() - t0;

const r = qismArg ? qismArg.split(',').map(Number) : [m.ramka.minX, m.ramka.minY, m.ramka.maxX, m.ramka.maxY];
const [x0, y0, x1, y1] = r;
const K = qismArg ? 24 : 9; // px / m
const W = (x1 - x0) * K, H = (y1 - y0) * K;
const P = (p: V) => `${((p.x - x0) * K).toFixed(1)},${((y1 - p.y) * K).toFixed(1)}`;
const yol = (pts: V[], yopiq = true) => 'M' + pts.map(P).join('L') + (yopiq ? 'Z' : '');

const s: string[] = [];
s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial">`);
s.push(`<rect width="100%" height="100%" fill="#5f8f45"/>`);
// Asfalt (teshiklar bilan)
for (const poly of m.asfalt) s.push(`<path d="${poly.map((h) => yol(h)).join('')}" fill="#4a4d52" fill-rule="evenodd"/>`);
// Bordyur
for (const h of m.chegaralar) s.push(`<path d="${yol(h)}" fill="none" stroke="#111" stroke-width="${0.25 * K}" stroke-dasharray="${K},${K}"/><path d="${yol(h)}" fill="none" stroke="#eee" stroke-width="${0.25 * K}" stroke-dasharray="${K},${K}" stroke-dashoffset="${K}"/>`);
// Bo'yoqlar
for (const b of m.boyoqlar) s.push(`<path d="${yol(b.poly)}" fill="${b.rang === 'sariq' ? '#f2c200' : b.tur === 'markaz' ? '#fff' : '#f4f4f4'}"/>`);
// Estakada
for (const e of m.estakadalar) {
  const L = 2 * e.qiya + e.tepa;
  const pts = [[0, -e.eni / 2 - 0.3], [L, -e.eni / 2 - 0.3], [L, e.eni / 2 + 0.3], [0, e.eni / 2 + 0.3]].map(([f, l]) => ({ x: e.boshi.x + Math.cos(e.th) * f - Math.sin(e.th) * l, y: e.boshi.y + Math.sin(e.th) * f + Math.cos(e.th) * l }));
  s.push(`<path d="${yol(pts)}" fill="rgba(200,200,190,.55)" stroke="#222" stroke-width="2"/>`);
}
// Temir yo'l
for (const t of m.temirYollar) {
  const a = { x: t.markaz.x - Math.cos(t.th) * t.uzunlik / 2, y: t.markaz.y - Math.sin(t.th) * t.uzunlik / 2 };
  const b = { x: t.markaz.x + Math.cos(t.th) * t.uzunlik / 2, y: t.markaz.y + Math.sin(t.th) * t.uzunlik / 2 };
  s.push(`<path d="${yol([a, b], false)}" stroke="#7a5a3a" stroke-width="${2.4 * K}" fill="none"/><path d="${yol([a, b], false)}" stroke="#ccc" stroke-width="${1.6 * K}" stroke-dasharray="2,${K * 0.6}" fill="none"/>`);
}
// Marshrut qadamlari
const ranglar = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e', '#ffffff', '#8e8e93', '#ff6482', '#64d2ff'];
m.marshrut.forEach((q, i) => {
  const c = ranglar[i % ranglar.length];
  s.push(`<path d="${yol(q.yol, false)}" fill="none" stroke="${c}" stroke-width="2.2" opacity=".9"/>`);
  s.push(`<path d="${yol(q.kirish, false)}" stroke="#00ff66" stroke-width="3"/><path d="${yol(q.chiqish, false)}" stroke="#ff2222" stroke-width="3"/>`);
  const o = q.yol[Math.floor(q.yol.length / 2)];
  s.push(`<text x="${P(o).split(',')[0]}" y="${P(o).split(',')[1]}" font-size="${K * 1.6}" fill="#fff" stroke="#000" stroke-width="0.8">${i + 1}</text>`);
});
// Belgilar, svetoforlar, avariya, piyoda
for (const b of m.belgilar) s.push(`<circle cx="${P(b.p).split(',')[0]}" cy="${P(b.p).split(',')[1]}" r="${0.6 * K}" fill="#e33" stroke="#fff"/><text x="${P(b.p).split(',')[0]}" y="${+P(b.p).split(',')[1] - K}" font-size="${K * 0.9}" fill="#fff">${b.kod}</text>`);
for (const sv of m.svetoforlar) s.push(`<rect x="${+P(sv.p).split(',')[0] - K / 2}" y="${+P(sv.p).split(',')[1] - K / 2}" width="${K}" height="${K}" fill="#111" stroke="#0f0"/>`);
for (const a of m.avariya) for (const p of a.p) s.push(`<circle cx="${P(p).split(',')[0]}" cy="${P(p).split(',')[1]}" r="${0.5 * K}" fill="#f00"/>`);
for (const y of m.yozuvlar) s.push(`<text x="${P(y.p).split(',')[0]}" y="${P(y.p).split(',')[1]}" font-size="${K}" fill="#fff" font-weight="bold">${y.matn}</text>`);
const bp = m.boshlash.p;
s.push(`<circle cx="${P(bp).split(',')[0]}" cy="${P(bp).split(',')[1]}" r="${K}" fill="#0af" stroke="#fff" stroke-width="2"/>`);
s.push('</svg>');
writeFileSync(out, s.join('\n'));
console.log(`maydon: ${vaqt.toFixed(0)} ms | asfalt ko'pburchaklari: ${m.asfalt.length}, halqalar: ${m.chegaralar.length}, nuqtalar: ${m.chegaralar.reduce((a, h) => a + h.length, 0)} | bo'yoqlar: ${m.boyoqlar.length} | belgilar: ${m.belgilar.length} | qadamlar: ${m.marshrut.length}`);
console.log(`ramka: ${m.ramka.minX.toFixed(0)}..${m.ramka.maxX.toFixed(0)} x ${m.ramka.minY.toFixed(0)}..${m.ramka.maxY.toFixed(0)} m → ${out}`);
