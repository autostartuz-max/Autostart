// Grafikani rasmga olish uchun sinov sahifasi (faqat dev):
//   http://localhost:5173/sim-sinov/sahna-rasm.html?k=start&m=cobalt
// k — kamera: start | estakada | umumiy | orqa (mashina ortidan, o'yindagidek)
// Tayyor bo'lgach document.title = 'TAYYOR' (headless brauzer shuni kutadi).
import * as THREE from 'three';
import { avtodromQur } from '../src/simulyator/dunyo/avtodrom';
import { FizikDunyo } from '../src/simulyator/fizika/dunyo';
import { Mashina, type Boshqaruv } from '../src/simulyator/fizika/mashina';
import { Hakam, type Panel } from '../src/simulyator/imtihon/hakam';
import { sozlamaBirlashtir } from '../src/simulyator/imtihon/qoidalar';
import { mashinaTop } from '../src/simulyator/mashinalar';
import { Grafika, type Sifat } from '../src/simulyator/grafika/sahna';

const q = new URLSearchParams(location.search);
const kam = q.get('k') || 'start';
const t = mashinaTop(q.get('m') || 'cobalt');
const sz = sozlamaBirlashtir();
const m = avtodromQur({ B: t.eni, D: t.uzunlik, K: t.koleya, S: t.orqaOsilma, qiyalik: sz.qiyalik });
const d = new FizikDunyo(m);
const mash = new Mashina(t, m.boshlash.p, m.boshlash.th);
const hk = new Hakam(m, sz, { tur: 'imtihon' }, mash);
const k: Boshqaruv = { gaz: 0, tormoz: 0, rul: 0, rulUshlangan: false, uzatma: 'N', qolTormoz: true };
const pnl: Panel = { kamar: true, chapChiroq: false, ongChiroq: false, avariyaChiroq: false, faralar: true };
const sifat = Number(q.get('s') ?? 2) as Sifat;
const g = new Grafika(document.getElementById('c') as HTMLCanvasElement, m, d, t, '#d9dde2', sifat);
(window as any).__g = g;

const W = (x: number, y: number, h: number) => new THREE.Vector3(x, h, -y);
const b = m.boshlash;
const f = { x: Math.cos(b.th), y: Math.sin(b.th) };
const e = m.estakadalar[0];
if (kam === 'start') {
  // Start: mashinaning chap-old tomonidan, mashina va start chizig'i ko'rinadi
  g.erkin = { poz: W(b.p.x - f.x * 10 - f.y * 5, b.p.y - f.y * 10 + f.x * 5, 2.4), nishon: W(b.p.x + f.x * 6, b.p.y + f.y * 6, 0.8) };
} else if (kam === 'estakada' && e) {
  const ef = { x: Math.cos(e.th), y: Math.sin(e.th) };
  const o = { x: e.boshi.x + ef.x * (e.qiya + e.tepa / 2), y: e.boshi.y + ef.y * (e.qiya + e.tepa / 2) };
  g.erkin = { poz: W(o.x - ef.x * 15 + ef.y * 13, o.y - ef.y * 15 - ef.x * 13, 4.5), nishon: W(o.x, o.y, 0.8) };
} else if (kam === 'umumiy') {
  const r = m.ramka;
  const cx = (r.minX + r.maxX) / 2, cy = (r.minY + r.maxY) / 2;
  g.erkin = { poz: W(cx - 40, r.minY - 70, 70), nishon: W(cx, cy, 0) };
}
// kam === 'orqa' — o'yindagi orqa kamera (erkin = null)

let n = 0, oldin = performance.now();
const kutish = Number(q.get('kadr') ?? 40);
function kadr() {
  const hoz = performance.now();
  const dt = Math.min(0.05, (hoz - oldin) / 1000); oldin = hoz;
  g.chiz(dt || 1 / 60, mash, k, pnl, hk);
  if (++n === kutish) document.title = 'TAYYOR';
  requestAnimationFrame(kadr);
}
// Modellar (GLB) yuklanishini kutish uchun Grafika `tayyor` va'dasini bersa — kutamiz
Promise.resolve((g as any).tayyor).finally(() => requestAnimationFrame(kadr));
