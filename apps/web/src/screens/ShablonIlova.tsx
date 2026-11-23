import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrqaga } from '../orqaga';
import { ChevronLeft } from 'lucide-react';
import { api, type ShablonProgress } from '../api';
import { testTili } from './Home';
import '../shablon.css';
import '../ilova-ekran.css';

/**
 * Shablon testlar — MOBIL ILOVA ko'rinishi (saytda Shablon.tsx avvalgidek).
 * Namuna: Oson Prava ilovasidagi "Biletlar" ekrani — bo'limlar (Barchasi /
 * Yangi / Xatolar) va qatorga 3 tadan kartochka. Shablon bosilsa test DARHOL ochiladi
 * (2026-11-24: "Tanlang" — til tanlash oynasi olib tashlandi; til ilova sozlamasidan).
 */
// Rasmiy biletlar 63 ta; admin yangi shablonga savol qo'shsa (64, 65…) — u ham chiqadi
const COUNT = 63;
// Imtihonda 3 ta xato — yiqilgan hisoblanadi
const MAX_XATO = 3;

type Bolim = 'barchasi' | 'yangi' | 'xatolar';
const BOLIMLAR: [Bolim, string][] = [
  ['barchasi', 'Barchasi'],
  ['yangi', 'Yangi'],
  ['xatolar', 'Xatolar'],
];

export default function ShablonIlova() {
  const nav = useNavigate();
  const orqaga = useOrqaga();
  const [sp] = useSearchParams();
  const [bolim, setBolim] = useState<Bolim>('barchasi');
  const [progress, setProgress] = useState<Record<number, ShablonProgress>>({});

  // Testni ochish: til — ilova sozlamasidan, variantlar aralashmaydi (shuffle=0)
  const boshla = (n: number, almashtir = false) =>
    nav(`/test?mode=exam&exam=1&lang=${testTili()}&shuffle=0&n=${n}&shablon=${n}`, { replace: almashtir });

  useEffect(() => {
    api.shablonProgress()
      .then((r) => {
        const x: Record<number, ShablonProgress> = {};
        for (const p of r.list || []) x[p.shablon] = p;
        setProgress(x);
      })
      .catch(() => {});
  }, []);

  // ?open=N — shu shablon testini darhol ochish (boshqa joydan havola bilan kelinsa)
  useEffect(() => {
    const o = sp.get('open');
    if (o && /^\d+$/.test(o)) boshla(Number(o), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Kartochka holati: boshlanmagan (null) yoki natija — 3+ xato qizil,
  // tugallangan yashil, hali yechilayotgan sariq
  const holat = (n: number) => {
    const p = progress[n];
    if (!p || !p.answered) return null;
    const xato = p.answered - p.correct;
    const cls = xato >= MAX_XATO ? 'no' : p.answered < p.total ? 'mid' : 'ok';
    return { p, xato, cls };
  };

  const raqamlar = Array.from({ length: Math.max(COUNT, ...Object.keys(progress).map(Number)) }, (_, i) => i + 1).filter((n) => {
    if (bolim === 'barchasi') return true;
    const h = holat(n);
    return bolim === 'yangi' ? !h : !!h && h.xato > 0;
  });

  return (
    <div className="ie">
      <div className="ie-head">
        <div className="ie-top">
          <button className="ie-back" onClick={orqaga} aria-label="Orqaga"><ChevronLeft size={22} /></button>
          <div className="ie-title">Shablon testlar</div>
        </div>
        <div className="ie-tabs-wrap">
          <div className="ie-tabs">
            {BOLIMLAR.map(([v, label]) => (
              <button key={v} className={'ie-tab' + (bolim === v ? ' on' : '')} onClick={() => setBolim(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {raqamlar.length ? (
        <div className="ie-grid">
          {raqamlar.map((n) => {
            const h = holat(n);
            return (
              <button key={n} className="ie-tile" onClick={() => boshla(n)}>
                {n}-shablon
                {h ? (
                  <span className={'ie-band ' + h.cls}>{h.p.correct}/{h.p.total}</span>
                ) : (
                  bolim === 'yangi' && <span className="ie-band">Yangi</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="ie-empty">Shablonlar topilmadi</div>
      )}

    </div>
  );
}
