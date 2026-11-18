/**
 * Avtodrom maydonini Unity loyihasi (avtodrom-unity) uchun eksport qiladi. Manba three.js simulyatori
 * bilan BITTA: dunyo/avtodrom.ts (3494-son qaror chizmalari) — ikkala versiyada maydon bir xil bo'ladi.
 *
 * Natija:
 *   <unity>/Assets/Avtodrom/Maydon/maydon.json  — geometriya (uchburchaklarga bo'lingan) va obyektlar
 *   <unity>/Assets/Avtodrom/Belgilar/*.png      — yo'l belgilari va yo'l yozuvlari (Edge headless chizadi)
 *
 * Ishga tushirish (yhq-test ildizidan):
 *   npx tsx apps/web/sim-sinov/unity-eksport.ts [unity-loyiha] [cobalt|gentra]
 *
 * Koordinatalar: dunyo (x, y) → Unity (x, balandlik, y). th — dunyo burchagi (+x dan soat miliga teskari).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { avtodromQur } from '../src/simulyator/dunyo/avtodrom';
import { ayirma } from '../src/simulyator/dunyo/birlashtir';
import { FizikDunyo } from '../src/simulyator/fizika/dunyo';
import { sozlamaBirlashtir } from '../src/simulyator/imtihon/qoidalar';
import { mashinaTop } from '../src/simulyator/mashinalar';
import { type V, siljit, masofa, lokal } from '../src/simulyator/asos/geom';

const UNITY = process.argv[2] || 'C:/Users/user/Projects/avtodrom-unity';
const TUR = process.argv[3] || 'cobalt';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BELGI_RASM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/belgi-rasm');

// three.js maydonModel.ts dagi qiymatlar bilan bir xil
const BORDYUR_ENI = 0.18;
const BOYOQ_Y = 0.012;

const t = mashinaTop(TUR);
const sz = sozlamaBirlashtir();
const m = avtodromQur({ B: t.eni, D: t.uzunlik, K: t.koleya, S: t.orqaOsilma, qiyalik: sz.qiyalik });
const d = new FizikDunyo(m);

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const xy = (ps: V[]) => ps.flatMap((p) => [r3(p.x), r3(p.y)]);

/** Ko'pburchaklar (teshiklari bilan) → bitta 2D to'r: v = [x, y, ...], i = uchburchaklar */
function tor2(polylar: V[][][]) {
  const v: number[] = [], i: number[] = [];
  for (const poly of polylar) {
    if (!poly.length || poly[0].length < 3) continue;
    const tashqi = poly[0].map((p) => new THREE.Vector2(p.x, p.y));
    const teshiklar = poly.slice(1).map((h) => h.map((p) => new THREE.Vector2(p.x, p.y)));
    const uch = THREE.ShapeUtils.triangulateShape(tashqi, teshiklar); // massivlarni o'zi tozalaydi
    const asos = v.length / 2;
    for (const p of [tashqi, ...teshiklar].flat()) v.push(r3(p.x), r3(p.y));
    for (const u of uch) i.push(asos + u[0], asos + u[1], asos + u[2]);
  }
  return { v, i };
}

/** Estakada qiyaligida bo'yoq sirtdan "ko'tarilmasin" — uzun qirralarni bo'lamiz (maydonModel.ts dagidek) */
function zichPoly(poly: V[]): V[] {
  const out: V[] = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length];
    const n = d.balandlik(a) > 0 || d.balandlik(b) > 0 ? Math.max(1, Math.ceil(masofa(a, b) / 0.5)) : 1;
    for (let s = 0; s < n; s++) out.push({ x: a.x + ((b.x - a.x) * s) / n, y: a.y + ((b.y - a.y) * s) / n });
  }
  return out;
}

/** Bo'yoqlar → 3D to'r: v3 = [x, balandlik, y, ...] */
function tor3(polylar: V[][]) {
  const v3: number[] = [], i: number[] = [];
  for (const p0 of polylar) {
    if (p0.length < 3) continue;
    const kontur = zichPoly(p0).map((p) => new THREE.Vector2(p.x, p.y));
    const uch = THREE.ShapeUtils.triangulateShape(kontur, []);
    const asos = v3.length / 3;
    for (const p of kontur) {
      const h = d.balandlik(p);
      v3.push(r3(p.x), r3(h + BOYOQ_Y + (h > 0 ? 0.03 : 0)), r3(p.y));
    }
    for (const u of uch) i.push(asos + u[0], asos + u[1], asos + u[2]);
  }
  return { v3, i };
}

/** Yopiq halqani zichlash (har kesma ≤ qadam) */
function zich(h: V[], qadam: number): V[] {
  const out: V[] = [];
  for (let k = 0; k < h.length; k++) {
    const a = h[k], b = h[(k + 1) % h.length];
    const n = Math.max(1, Math.ceil(masofa(a, b) / qadam));
    for (let s = 0; s < n; s++) out.push({ x: a.x + ((b.x - a.x) * s) / n, y: a.y + ((b.y - a.y) * s) / n });
  }
  return out;
}

// ── Yer: panjara ichida — maysa, tashqarida — quruq yer (maydonModel.ts dagidek)
const rm = m.ramka, Q = 1600;
const ramkaPoly: V[] = [{ x: rm.minX, y: rm.minY }, { x: rm.maxX, y: rm.minY }, { x: rm.maxX, y: rm.maxY }, { x: rm.minX, y: rm.maxY }];
const ichkiYer = ayirma(ramkaPoly, m.asfalt);
const tashqiYer = ayirma(
  [{ x: rm.minX - Q, y: rm.minY - Q }, { x: rm.maxX + Q, y: rm.minY - Q }, { x: rm.maxX + Q, y: rm.maxY + Q }, { x: rm.minX - Q, y: rm.maxY + Q }],
  [[ramkaPoly]],
);

// ── Bo'yoqlar: oq va sariq; estakada ustidagi chet chiziqlari ham
const oqlar: V[][] = [], sariqlar: V[][] = [];
for (const b of m.boyoqlar) (b.rang === 'sariq' ? sariqlar : oqlar).push(b.poly);
for (const e of m.estakadalar) {
  const L = 2 * e.qiya + e.tepa;
  for (const s of [1, -1]) {
    const a = (e.eni / 2 - 0.25) * s, b = (e.eni / 2 - 0.35) * s;
    oqlar.push([lokal(e.boshi, e.th, 0.05, a), lokal(e.boshi, e.th, L - 0.05, a), lokal(e.boshi, e.th, L - 0.05, b), lokal(e.boshi, e.th, 0.05, b)]);
  }
}

// ── Bordyurlar: asfalt chegarasi (asfalt halqaning chap tomonida) va tashqi qirra
const bordyurlar = m.chegaralar.map((h0) => {
  const ich = zich(h0, 0.5);
  const tash = siljit(ich, -BORDYUR_ENI, true);
  return { ich: xy(ich), tash: xy(tash) };
});

// Yozuv tekstura nisbati (1024×256 tekstura, three.js yozuvTekstura dagi formula; Arial bold ~0,62 em)
const yozuvNisbat = (matn: string) => Math.min(4, (matn.length * 200 * 0.62 + 40) / 256);

const belgiKodlari = new Set<string>();
for (const b of m.belgilar) for (const k of [b.kod, b.ikkinchi, b.uchinchi]) if (k) belgiKodlari.add(k);

const natija = {
  versiya: 1,
  mashina: { tur: TUR, B: t.eni, D: t.uzunlik, K: t.koleya, S: t.orqaOsilma },
  qiyalik: sz.qiyalik,
  ramka: rm,
  boshlash: { x: r3(m.boshlash.p.x), y: r3(m.boshlash.p.y), th: r3(m.boshlash.th) },
  asfalt: tor2(m.asfalt),
  ichkiYer: tor2(ichkiYer),
  tashqiYer: tor2(tashqiYer),
  boyoqOq: tor3(oqlar),
  boyoqSariq: tor3(sariqlar),
  bordyurlar,
  yozuvlar: m.yozuvlar.map((y) => ({ matn: y.matn, x: r3(y.p.x), y: r3(y.p.y), th: r3(y.th), balandlik: y.balandlik, nisbat: r3(yozuvNisbat(y.matn)) })),
  belgilar: m.belgilar.map((b) => ({ kod: b.kod, x: r3(b.p.x), y: r3(b.p.y), th: r3(b.th), ikkinchi: b.ikkinchi || '', uchinchi: b.uchinchi || '' })),
  svetoforlar: m.svetoforlar.map((s) => ({ id: s.id, x: r3(s.p.x), y: r3(s.p.y), th: r3(s.th) })),
  estakadalar: m.estakadalar.map((e) => ({ x: r3(e.boshi.x), y: r3(e.boshi.y), th: r3(e.th), eni: e.eni, qiya: e.qiya, tepa: e.tepa, qiyalik: e.qiyalik, balandlik: e.balandlik, stopS: e.stopS })),
  temirYollar: m.temirYollar.map((tt) => ({ x: r3(tt.markaz.x), y: r3(tt.markaz.y), th: r3(tt.th), uzunlik: tt.uzunlik, kesishmaEni: tt.kesishmaEni })),
  avariya: m.avariya.map((a) => ({ v: xy(a.p), th: r3(a.th) })),
  piyodaYollari: m.piyodaYollari.map((p) => ({ v: xy([p.a, p.b]), zebra: xy(p.zebra) })),
  yolQismlari: m.yolQismlari.map((y) => ({ v: xy(y) })),
  mashqZonalari: m.mashqZonalari.map((z) => ({ v: xy(z) })),
  taqiqZonalar: m.taqiqZonalar.map((z) => ({ v: xy(z) })),
  belgiKodlari: [...belgiKodlari],
};

const maydonPapka = path.join(UNITY, 'Assets/Avtodrom/Maydon');
fs.mkdirSync(maydonPapka, { recursive: true });
const jsonYoli = path.join(maydonPapka, 'maydon.json');
fs.writeFileSync(jsonYoli, JSON.stringify(natija));
console.log(`maydon.json: ${(fs.statSync(jsonYoli).size / 1024).toFixed(0)} KB — asfalt ${natija.asfalt.i.length / 3} uchburchak, ` +
  `bordyur ${bordyurlar.length} halqa, belgi ${natija.belgilar.length}, svetofor ${natija.svetoforlar.length}`);

// ── Teksturalar: Edge headless (shaffof fon) bilan PNG
const belgiPapka = path.join(UNITY, 'Assets/Avtodrom/Belgilar');
fs.mkdirSync(belgiPapka, { recursive: true });
const vaqtinchalik = fs.mkdtempSync(path.join(os.tmpdir(), 'avtodrom-tekstura-'));
const profil = path.join(vaqtinchalik, 'profil');

function chiz(html: string, chiqish: string, w: number, h: number) {
  const fayl = path.join(vaqtinchalik, path.basename(chiqish, '.png') + '.html');
  fs.writeFileSync(fayl, `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:transparent;overflow:hidden;width:${w}px;height:${h}px}
</style></head><body>${html}</body></html>`);
  execFileSync(EDGE, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${profil}`,
    '--default-background-color=00000000', `--window-size=${w},${h}`, `--screenshot=${chiqish}`,
    pathToFileURL(fayl).href,
  ], { stdio: 'ignore', timeout: 60000 });
}

const faylNomi = (kod: string) => kod.replace(/[:]/g, '-');
for (const kod of belgiKodlari) {
  const chiqish = path.join(belgiPapka, `belgi-${faylNomi(kod)}.png`);
  if (kod.startsWith('tezlik:') || kod.startsWith('eng:')) {
    // three.js tezlikBelgisi bilan bir xil: 3.24 (qizil halqa) yoki 4.6 (ko'k doira)
    const son = kod.split(':')[1], eng = kod.startsWith('eng:');
    const doira = eng
      ? '<circle cx="128" cy="128" r="124" fill="#1f5fbf" stroke="#fff" stroke-width="6"/>'
      : '<circle cx="128" cy="128" r="124" fill="#fff"/><circle cx="128" cy="128" r="108" fill="none" stroke="#d7191c" stroke-width="30"/>';
    chiz(`<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">${doira}
<text x="128" y="136" font-family="Arial" font-weight="bold" font-size="118" text-anchor="middle" dominant-baseline="middle" fill="${eng ? '#fff' : '#111'}">${son}</text></svg>`, chiqish, 256, 256);
  } else {
    const svg = path.join(BELGI_RASM, `${kod}.svg`);
    if (!fs.existsSync(svg)) { console.warn(`belgi rasmi yo'q: ${kod}`); continue; }
    chiz(`<img src="${pathToFileURL(svg).href}" style="width:256px;height:256px;object-fit:contain;display:block">`, chiqish, 256, 256);
  }
  console.log('belgi:', path.basename(chiqish));
}
for (const matn of new Set(m.yozuvlar.map((y) => y.matn))) {
  const chiqish = path.join(belgiPapka, `yozuv-${matn}.png`);
  chiz(`<div style="width:1024px;height:256px;display:flex;align-items:center;justify-content:center;color:#fff;
font:bold 200px Arial,sans-serif;padding-top:20px;box-sizing:border-box">${matn}</div>`, chiqish, 1024, 256);
  console.log('yozuv:', path.basename(chiqish));
}
fs.rmSync(vaqtinchalik, { recursive: true, force: true });
console.log('tayyor');
