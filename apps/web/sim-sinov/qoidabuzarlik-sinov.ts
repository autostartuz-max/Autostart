// Hakam qoidabuzarliklarni ushlashini tekshirish: har bir ssenariyda avtopilot ataylab xato qiladi.
// npx tsx apps/web/sim-sinov/qoidabuzarlik-sinov.ts
import { avtodromQur } from '../src/simulyator/dunyo/avtodrom';
import { FizikDunyo } from '../src/simulyator/fizika/dunyo';
import { Mashina } from '../src/simulyator/fizika/mashina';
import { Hakam, type Jarima } from '../src/simulyator/imtihon/hakam';
import { sozlamaBirlashtir, type JarimaKodi } from '../src/simulyator/imtihon/qoidalar';
import { mashinaTop } from '../src/simulyator/mashinalar';
import { Avtopilot } from './avtopilot';

const SSENARIY: { nom: string; xato: string[]; kutiladi: JarimaKodi[]; sozlama?: Record<string, unknown> }[] = [
  { nom: 'Kamarsiz', xato: ['kamarsiz'], kutiladi: ['kamar'] },
  { nom: 'Ko‘rsatkichsiz', xato: ['signalsiz'], kutiladi: ['chiroq'] },
  { nom: 'Qo‘l tormozi tortilgan', xato: ['qolTormoz'], kutiladi: ['qolTormoz'] },
  { nom: '2-uzatmada qo‘zg‘alish', xato: ['ikkinchi'], kutiladi: ['dvigatel'] },
  { nom: 'Tezlik oshirish', xato: ['tez'], kutiladi: ['tezlik'] },
  { nom: 'Qizil chiroqda o‘tish', xato: ['qizil'], kutiladi: ['qizil'], sozlama: { qizilEhtimol: 1 } },
  { nom: 'STOP belgisida to‘xtamaslik', xato: ['stopsiz'], kutiladi: ['stopBelgi'] },
  { nom: 'Estakadada to‘xtamaslik', xato: ['estakadaToxtamas'], kutiladi: ['toxtamadi'] },
  { nom: 'Estakadada orqaga sirpanish', xato: ['sirpanish'], kutiladi: ['orqagaSirpanish'] },
  { nom: 'Piyodaga yo‘l bermaslik', xato: ['piyodaga'], kutiladi: ['piyoda'], sozlama: { piyodaEhtimol: 1 } },
  { nom: 'Avariya chirog‘isiz', xato: ['avariyaChiroqsiz'], kutiladi: ['avariyaChiroq'] },
  { nom: 'Parkovkasiz', xato: ['parkovkasiz'], kutiladi: ['mashq'] },
  { nom: 'Bordyur (90° kech burilish)', xato: ['bordyur'], kutiladi: ['bordyur'] },
  { nom: 'Sababsiz to‘xtash', xato: ['toxtash'], kutiladi: ['noqonuniyToxtash'] },
];

let xatoSoni = 0;
for (const sc of SSENARIY) {
  let u = 7;
  Math.random = () => { u = (u + 0x6d2b79f5) >>> 0; let t = u; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const t = mashinaTop('cobalt');
  const sz = sozlamaBirlashtir({ ...sc.sozlama, otishChegarasi: 1000 });
  const m = avtodromQur({ B: t.eni, D: t.uzunlik, K: t.koleya, S: t.orqaOsilma, qiyalik: sz.qiyalik });
  const d = new FizikDunyo(m);
  const mash = new Mashina(t, m.boshlash.p, m.boshlash.th);
  const hk = new Hakam(m, sz, { tur: 'imtihon' }, mash);
  const ap = new Avtopilot(m, hk, mash, sc.xato);
  const js: Jarima[] = [];
  hk.onJarima = (j) => js.push(j);
  for (let i = 0; i < 120 * 60 * 12 && !hk.tugadi; i++) {
    ap.qadam(1 / 120);
    const hod = mash.qadam(1 / 120, ap.k, d);
    hk.qadam(1 / 120, mash, ap.k, ap.pnl, hod, d);
  }
  const kodlar = [...new Set(js.map((j) => j.kod))];
  const yetishmaydi = sc.kutiladi.filter((k) => !kodlar.includes(k));
  const ok = yetishmaydi.length === 0;
  if (!ok) xatoSoni++;
  console.log(`${ok ? '✓' : '✗'} ${sc.nom.padEnd(30)} → ${js.map((j) => j.kod + (j.izoh ? ` (${j.izoh})` : '')).join('; ') || 'jarima yo‘q'}${ok ? '' : `  [KUTILGAN: ${yetishmaydi.join(', ')}]`}`);
}
console.log(xatoSoni ? `\n${xatoSoni} ta ssenariy muvaffaqiyatsiz` : '\nBarcha qoidabuzarliklar aniqlandi');
process.exit(xatoSoni ? 1 : 0);
