import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PastkiOyna from './PastkiOyna';
import './imtihon-sana.css';

const OYLAR = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const HAFTA = ['DU', 'SE', 'CHO', 'PA', 'JU', 'SHA', 'YA'];

/** Mahalliy sana → "YYYY-MM-DD" */
export const kunKaliti = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Serverdagi examDate (ISO) → Toshkent vaqti bo'yicha "YYYY-MM-DD" */
export function sanaKaliti(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return kunKaliti(d);
  }
}

/** "2026-12-15" → "15.12.2026" */
export const sanaNuqtali = (k: string) => k.split('-').reverse().join('.');

/** Bugundan shu sanagacha necha kun (bugun — 0; o'tib ketgan — manfiy) */
export function qolganKun(k: string) {
  const [y, m, d] = k.split('-').map(Number);
  const bugun = new Date();
  const a = Date.UTC(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86400_000);
}

/**
 * "Imtihon sanasini kiriting" — pastki oyna: tezkor tanlov (1 hafta / 1 oy / 3 oy ichida) va kalendar
 * (dushanbadan boshlanadi, o'tgan kunlarni tanlab bo'lmaydi). Bosh sahifadagi "Test yechish" kartasidagi
 * "Sanani o'zgartirish" va Profil shu oynani ochadi; sana profilga saqlanadi (PATCH /me examDate).
 */
export default function ImtihonSanasi({ joriy, onClose, onSaqla }: {
  /** Hozirgi sana "YYYY-MM-DD" yoki null */
  joriy: string | null;
  onClose: () => void;
  onSaqla: (sana: string) => Promise<void>;
}) {
  const bugun = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const bugunK = kunKaliti(bugun);
  const [tanlangan, setTanlangan] = useState<string | null>(joriy && joriy >= bugunK ? joriy : null);
  const [oy, setOy] = useState(() => {
    const b = tanlangan ? new Date(tanlangan + 'T00:00:00') : bugun;
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState('');

  // Tezkor tanlov: bugundan 7 kun, 1 oy, 3 oy keyin
  const tezSanalar = useMemo(() => {
    const qosh = (kun: number, oylar: number) => {
      const d = new Date(bugun);
      d.setDate(d.getDate() + kun);
      d.setMonth(d.getMonth() + oylar);
      return kunKaliti(d);
    };
    return [
      { yozuv: '1 hafta ichida', sana: qosh(7, 0) },
      { yozuv: '1 oy ichida', sana: qosh(0, 1) },
      { yozuv: '3 oy ichida', sana: qosh(0, 3) },
    ];
  }, [bugun]);

  const tanla = (k: string) => {
    setTanlangan(k);
    setXato('');
    const d = new Date(k + 'T00:00:00');
    setOy(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // 6 hafta (42 katak) — oy almashganda "Saqlash" tugmasi sakramasin
  const kataklar = useMemo(() => {
    const boshi = new Date(oy);
    const siljish = (boshi.getDay() + 6) % 7; // dushanba — 0
    boshi.setDate(boshi.getDate() - siljish);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(boshi);
      d.setDate(boshi.getDate() + i);
      return { k: kunKaliti(d), kun: d.getDate(), buOy: d.getMonth() === oy.getMonth() };
    });
  }, [oy]);

  const joriyOy = oy.getFullYear() === bugun.getFullYear() && oy.getMonth() === bugun.getMonth();
  // 3 yildan uzoqqa varaqlanmaydi
  const oxirgiOy = oy.getFullYear() * 12 + oy.getMonth() >= bugun.getFullYear() * 12 + bugun.getMonth() + 36;
  const varaqla = (n: number) => setOy(new Date(oy.getFullYear(), oy.getMonth() + n, 1));

  const saqla = async () => {
    if (!tanlangan || saqlanmoqda) return;
    setSaqlanmoqda(true);
    setXato('');
    try {
      await onSaqla(tanlangan);
      onClose();
    } catch (e: any) {
      setXato(e?.message || 'Saqlab bo‘lmadi. Internetni tekshiring.');
      setSaqlanmoqda(false);
    }
  };

  const qoldi = tanlangan ? qolganKun(tanlangan) : 0;

  return (
    <PastkiOyna
      className="is-oyna"
      title="Imtihon sanasini kiriting"
      subtitle="Imtihonga tayyorgarlikni nazorat qilish uchun sanani belgilang"
      ikonka={<CalendarDays />}
      onClose={onClose}
    >
      <div className="is-maydon">
        <CalendarDays aria-hidden="true" />
        {tanlangan ? (
          <>
            <span>{sanaNuqtali(tanlangan)}</span>
            <small>{qoldi === 0 ? 'bugun' : `${qoldi} kun qoldi`}</small>
          </>
        ) : (
          <span className="is-bosh">Sanani tanlang</span>
        )}
      </div>

      <div className="is-tez">
        {tezSanalar.map((t) => (
          <button key={t.yozuv} type="button" className={tanlangan === t.sana ? 'faol' : undefined} onClick={() => tanla(t.sana)}>
            {t.yozuv}
          </button>
        ))}
      </div>

      <div className="is-kal">
        <div className="is-kal-bosh">
          <button type="button" onClick={() => varaqla(-1)} disabled={joriyOy} aria-label="Oldingi oy">
            <ChevronLeft aria-hidden="true" />
          </button>
          <b>{OYLAR[oy.getMonth()]} {oy.getFullYear()}</b>
          <button type="button" onClick={() => varaqla(1)} disabled={oxirgiOy} aria-label="Keyingi oy">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <div className="is-hafta" aria-hidden="true">
          {HAFTA.map((h) => <span key={h}>{h}</span>)}
        </div>
        <div className="is-kunlar" role="grid">
          {kataklar.map((c) => {
            const otgan = c.k < bugunK;
            const sinf = [
              !c.buOy ? 'boshqa' : '',
              otgan ? 'otgan' : '',
              c.k === bugunK ? 'bugun' : '',
              c.k === tanlangan ? 'tanlangan' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={c.k}
                type="button"
                className={sinf || undefined}
                disabled={otgan || !c.buOy}
                onClick={() => tanla(c.k)}
                aria-label={sanaNuqtali(c.k)}
                aria-pressed={c.k === tanlangan}
              >
                <span>{c.kun}</span>
              </button>
            );
          })}
        </div>
      </div>

      {xato && <div className="is-xato" role="alert">{xato}</div>}
      <button type="button" className="is-saqla" disabled={!tanlangan || saqlanmoqda} onClick={saqla}>
        {saqlanmoqda ? 'Saqlanmoqda…' : 'Saqlash'}
      </button>
    </PastkiOyna>
  );
}
