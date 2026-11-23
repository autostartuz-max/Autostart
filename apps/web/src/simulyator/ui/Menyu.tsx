import { MASHINALAR } from '../mashinalar';
import { MASHQ_NOMI } from '../imtihon/qoidalar';
import type { MashqKodi } from '../dunyo/turlar';
import type { ImtihonSozlama } from '../imtihon/qoidalar';
import { ArrowLeft, Play, Volume2, VolumeX } from 'lucide-react';
import { MashqRasm, OquvMashinasi } from './MashqRasmlari';

export const RANGLAR = ['#e9ebee', '#b9bec5', '#1c1f24', '#1f3a66', '#9c1f24'];

/** Rasmiy tartib (Toshkent imtihon markazi) — mashq rejimi ro'yxati uchun */
export const MASHQ_ROYXAT: { indeks: number; kod: MashqKodi; nom: string }[] = [
  { indeks: 0, kod: 'start', nom: MASHQ_NOMI.start },
  { indeks: 1, kod: 'piyoda', nom: MASHQ_NOMI.piyoda },
  { indeks: 2, kod: 'estakada', nom: MASHQ_NOMI.estakada },
  { indeks: 3, kod: 'burilish90', nom: MASHQ_NOMI.burilish90 },
  { indeks: 4, kod: 'chorraha', nom: 'Chorraha (to‘g‘riga)' },
  { indeks: 5, kod: 'ilon', nom: MASHQ_NOMI.ilon },
  { indeks: 7, kod: 'boks', nom: MASHQ_NOMI.boks },
  { indeks: 8, kod: 'chorraha', nom: 'Chorraha (chapga burilish)' },
  { indeks: 9, kod: 'temir', nom: MASHQ_NOMI.temir },
  { indeks: 10, kod: 'tezlashish', nom: MASHQ_NOMI.tezlashish },
  { indeks: 11, kod: 'avariya', nom: MASHQ_NOMI.avariya },
  { indeks: 12, kod: 'parallel', nom: MASHQ_NOMI.parallel },
  { indeks: 13, kod: 'chorraha', nom: 'Chorraha (o‘ngga burilish)' },
  { indeks: 14, kod: 'finish', nom: MASHQ_NOMI.finish },
];

export interface MenyuTanlov { mashinaId: string; rang: string; rejim: 'imtihon' | 'mashq'; mashq: number; sifat: 'avto' | 0 | 1 | 2; ovoz: boolean }

export function Menyu({ t, setT, sozlama, onBoshla, onChiq, rasmiy }: {
  t: MenyuTanlov; setT: (t: MenyuTanlov) => void; sozlama: ImtihonSozlama | null;
  onBoshla: () => void; onChiq: () => void; rasmiy: boolean;
}) {
  const q = (o: Partial<MenyuTanlov>) => setT({ ...t, ...o });
  const faolMashq = (kod: MashqKodi) => !sozlama || sozlama.mashqlar[kod]?.faol !== false;
  return (
    <div className="sim-menyu">
      <div className="sim-menyu-ich">
        <div className="sim-menyu-bosh">
          <button className="sim-tugma-yumaloq" onClick={onChiq} aria-label="Chiqish"><ArrowLeft size={20} /></button>
          <OquvMashinasi className="sim-menyu-mashina" />
          <div>
            <h1>3D Avtodrom</h1>
            <p>Amaliy imtihon simulyatori · “B” toifa · 3494-son qaror maydonchasi</p>
          </div>
        </div>
        <div className="sim-menyu-tana">
          <section>
            <h2>Avtomobil</h2>
            <div className="sim-mashinalar">
              {MASHINALAR.filter((m) => !sozlama || sozlama.mashinalar[m.id] !== false).map((m) => (
                <button key={m.id} className={'sim-karta' + (t.mashinaId === m.id ? ' tanlangan' : '')} onClick={() => q({ mashinaId: m.id })}>
                  <b>{m.nom}</b>
                  <span>{m.uzunlik.toFixed(2)} × {m.eni.toFixed(2)} m · {m.massa} kg</span>
                </button>
              ))}
            </div>
            <div className="sim-ranglar">
              {RANGLAR.map((r) => (
                <button key={r} className={'sim-rang' + (t.rang === r ? ' tanlangan' : '')} style={{ background: r }} onClick={() => q({ rang: r })} aria-label={'Rang ' + r} />
              ))}
            </div>
            <h2>Sozlamalar</h2>
            <div className="sim-qator">
              <span>Grafika</span>
              <div className="sim-segment">
                {(['avto', 0, 1, 2] as const).map((s) => (
                  <button key={String(s)} className={t.sifat === s ? 'tanlangan' : ''} onClick={() => q({ sifat: s })}>
                    {s === 'avto' ? 'Avto' : ['Past', 'O‘rta', 'Yuqori'][s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="sim-qator">
              <span>Ovoz</span>
              <button className={'sim-tugma-yumaloq' + (t.ovoz ? ' yoniq' : '')} onClick={() => q({ ovoz: !t.ovoz })} aria-label="Ovoz">
                {t.ovoz ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>
          </section>
          <section>
            <h2>Rejim</h2>
            <div className="sim-segment keng">
              <button className={t.rejim === 'imtihon' ? 'tanlangan' : ''} onClick={() => q({ rejim: 'imtihon' })}>To‘liq imtihon</button>
              <button className={t.rejim === 'mashq' ? 'tanlangan' : ''} onClick={() => q({ rejim: 'mashq' })}>Bitta mashq</button>
            </div>
            {t.rejim === 'imtihon' ? (
              <div className="sim-izoh">
                Rasmiy ketma-ketlik: Start → piyodalar o‘tish joyi → estakada → 90° burilishlar → chorraha → ilon izi → chorraha → boks →
                chorraha (chapga) → temir yo‘l → tezlashish → avariya to‘xtash → parallel parkovka → chorraha (o‘ngga) → Finish.
                {sozlama && <> Vaqt: {sozlama.vaqtDaqiqa} daqiqa. Jarima {sozlama.otishChegarasi} ballga yetsa — o‘tilmaydi.</>}
              </div>
            ) : (
              <div className="sim-mashqlar">
                {MASHQ_ROYXAT.filter((m) => faolMashq(m.kod)).map((m) => (
                  <button key={m.indeks} className={t.mashq === m.indeks ? 'tanlangan' : ''} onClick={() => q({ mashq: m.indeks })}>
                    <MashqRasm kod={m.kod} indeks={m.indeks} />
                    <span>{m.nom}</span>
                  </button>
                ))}
              </div>
            )}
            {!rasmiy && <div className="sim-izoh kichik">Jarima ballari taxminiy: rasmiy jadval e’lon qilinmagan, administrator sozlaydi.</div>}
            <div className="sim-izoh kichik klaviatura">
              Kompyuterda: ↑/W — gaz, ↓/S — tormoz, ←/→ — rul, Probel — qo‘l tormozi, R/N/1/2 — uzatma, B — kamar, Q/E — ko‘rsatkich,
              H — avariya chirog‘i, L — fara, C — kamera, P — pauza.
            </div>
          </section>
        </div>
        <button className="sim-boshla" onClick={onBoshla}><Play size={20} /> Boshlash</button>
      </div>
    </div>
  );
}
