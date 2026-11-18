// Butun imtihonni avtopilot bilan haydash: npx tsx apps/web/sim-sinov/imtihon-sinov.ts [urug'] [mashina] [mashq-indeks]
import { avtodromQur } from '../src/simulyator/dunyo/avtodrom';
import { FizikDunyo } from '../src/simulyator/fizika/dunyo';
import { Mashina } from '../src/simulyator/fizika/mashina';
import { Hakam, type Rejim } from '../src/simulyator/imtihon/hakam';
import { sozlamaBirlashtir } from '../src/simulyator/imtihon/qoidalar';
import { mashinaTop } from '../src/simulyator/mashinalar';
import { Avtopilot } from './avtopilot';

const [urugArg = '1', mashinaId = 'cobalt', mashqArg] = process.argv.slice(2);
// Takrorlanadigan tasodif (mulberry32)
let u = Number(urugArg) >>> 0;
Math.random = () => { u = (u + 0x6d2b79f5) >>> 0; let t = u; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const t = mashinaTop(mashinaId);
const sz = sozlamaBirlashtir();
const m = avtodromQur({ B: t.eni, D: t.uzunlik, K: t.koleya, S: t.orqaOsilma, qiyalik: sz.qiyalik });
const d = new FizikDunyo(m);
const rejim: Rejim = mashqArg !== undefined ? { tur: 'mashq', qadam: Number(mashqArg) } : { tur: 'imtihon' };
const boshlash = rejim.tur === 'mashq' ? m.marshrut[rejim.qadam].m.boshlash : m.boshlash;
const mash = new Mashina(t, boshlash.p, boshlash.th);
const hk = new Hakam(m, sz, rejim, mash);
const ap = new Avtopilot(m, hk, mash);
const DT = 1 / 120;
let vaqt = 0, eng = 0, urilish = 0;
hk.onJarima = (j) => console.log(`  ✗ ${vaqt.toFixed(1)}s [${j.mashq}] ${j.nom}${j.izoh ? ' — ' + j.izoh : ''} (+${j.ball})  @(${j.p.x.toFixed(1)}, ${j.p.y.toFixed(1)}) ${mash.tezlikKmh.toFixed(1)} km/soat`);
hk.onXabar = (x) => console.log(`  · ${vaqt.toFixed(1)}s ${x}`);
for (let i = 0; i < 120 * 60 * 30 && !hk.tugadi; i++) {
  ap.qadam(DT);
  const hod = mash.qadam(DT, ap.k, d);
  for (const h of hod) if (h.tur === 'urildi') urilish++;
  hk.qadam(DT, mash, ap.k, ap.pnl, hod, d);
  vaqt += DT;
  eng = Math.max(eng, mash.tezlikKmh);
}
const n = hk.natija;
console.log(ap.log.join('\n'));
if (!n) {
  console.log(`TUGAMADI: ${vaqt.toFixed(0)}s, joriy qadam: ${hk.joriyQadam?.nom} (faol=${hk.faol}), mashina (${mash.x.toFixed(1)}, ${mash.y.toFixed(1)}) th=${(mash.th * 57.3).toFixed(0)}° v=${mash.tezlikKmh.toFixed(1)}`);
  process.exit(1);
}
console.log(`\n${n.otdi ? 'O‘TDI' : 'O‘TMADI'} — ${n.sabab} | jarima ${n.jami} | ${n.bajarildi.length}/${n.jamiQadam} qadam | ${Math.floor(n.vaqt / 60)}:${String(Math.round(n.vaqt % 60)).padStart(2, '0')} | eng katta tezlik ${eng.toFixed(1)} km/soat | urilish hodisalari ${urilish}`);
process.exit(n.otdi && n.jami === 0 ? 0 : 2);
