import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { api, type ShablonProgress } from '../api';
import '../shablon.css';
import '../ilova-ekran.css';

/**
 * Shablon testlar — MOBIL ILOVA ko'rinishi (saytda Shablon.tsx avvalgidek).
 * Namuna: Oson Prava ilovasidagi "Biletlar" ekrani — bo'limlar (Barchasi /
 * Yangi / Xatolar) va qatorga 3 tadan kartochka.
 */
const COUNT = 63;
// Imtihonda 3 ta xato — yiqilgan hisoblanadi
const MAX_XATO = 3;

type Bolim = 'barchasi' | 'yangi' | 'xatolar';
const BOLIMLAR: [Bolim, string][] = [
  ['barchasi', 'Barchasi'],
  ['yangi', 'Yangi'],
  ['xatolar', 'Xatolar'],
];

const LANGS: [string, string, 'uz' | 'ru'][] = [
  ['lat', 'O‘zbek', 'uz'],
  ['cyr', 'Кирилл', 'uz'],
  ['rus', 'Рус', 'ru'],
];

// Haqiqiy bayroqlar (emoji Windows'da harf bo'lib ko'rinadi, shuning uchun SVG)
function Flag({ c }: { c: 'uz' | 'ru' }) {
  if (c === 'ru')
    return (
      <svg className="cfg-flag" viewBox="0 0 30 20" aria-hidden="true">
        <rect width="30" height="20" fill="#fff" />
        <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
        <rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
      </svg>
    );
  return (
    <svg className="cfg-flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.2" fill="#0099b5" />
      <rect y="13.8" width="30" height="6.2" fill="#1eb53a" />
      <rect y="6.2" width="30" height="0.7" fill="#ce1126" />
      <rect y="13.1" width="30" height="0.7" fill="#ce1126" />
      <circle cx="5.4" cy="3.1" r="2" fill="#fff" />
      <circle cx="6.3" cy="3.1" r="1.7" fill="#0099b5" />
    </svg>
  );
}

export default function ShablonIlova() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [bolim, setBolim] = useState<Bolim>('barchasi');
  const [progress, setProgress] = useState<Record<number, ShablonProgress>>({});
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number | null>(null); // ochilgan shablon (til tanlash oynasi)
  const [cfgLang, setCfgLang] = useState<'lat' | 'cyr' | 'rus' | null>(null);

  useEffect(() => {
    api.me().then((m: any) => setName(m?.user?.firstName || '')).catch(() => {});
    api.shablonProgress()
      .then((r) => {
        const x: Record<number, ShablonProgress> = {};
        for (const p of r.list || []) x[p.shablon] = p;
        setProgress(x);
      })
      .catch(() => {});
  }, []);

  // ?open=N — til tanlash oynasini avtomatik ochish (saytdagidek)
  useEffect(() => {
    const o = sp.get('open');
    if (o && /^\d+$/.test(o)) { setSelected(Number(o)); setCfgLang(null); }
  }, [sp]);

  // Telefonning "orqaga" tugmasi: avval ochiq oyna yopiladi
  useEffect(() => {
    if (selected == null) return;
    const orqaga = (e: Event) => {
      e.preventDefault();
      setSelected(null);
    };
    window.addEventListener('ilova:orqaga', orqaga);
    return () => window.removeEventListener('ilova:orqaga', orqaga);
  }, [selected]);

  // Kartochka holati: boshlanmagan (null) yoki natija — 3+ xato qizil,
  // tugallangan yashil, hali yechilayotgan sariq
  const holat = (n: number) => {
    const p = progress[n];
    if (!p || !p.answered) return null;
    const xato = p.answered - p.correct;
    const cls = xato >= MAX_XATO ? 'no' : p.answered < p.total ? 'mid' : 'ok';
    return { p, xato, cls };
  };

  const raqamlar = Array.from({ length: COUNT }, (_, i) => i + 1).filter((n) => {
    if (bolim === 'barchasi') return true;
    const h = holat(n);
    return bolim === 'yangi' ? !h : !!h && h.xato > 0;
  });

  const start = () => {
    if (!cfgLang || selected == null) return; // til tanlanmasa boshlanmaydi
    // shuffle=0 — variantlar aralashmasin (avvalgi standart holat)
    nav(`/test?mode=exam&exam=1&lang=${cfgLang}&shuffle=0&n=${selected}&shablon=${selected}`);
  };

  return (
    <div className="ie">
      <div className="ie-head">
        <div className="ie-top">
          <button className="ie-back" onClick={() => nav('/')} aria-label="Orqaga"><ChevronLeft size={22} /></button>
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
              <button key={n} className="ie-tile" onClick={() => { setSelected(n); setCfgLang(null); }}>
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

      {/* Til tanlash oynasi — saytdagi bilan bir xil */}
      {selected != null && (
        <div className="cfg-overlay" onClick={() => setSelected(null)}>
          <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rnd-mhead">
              <span>Tanlang</span>
              <button className="rnd-x" onClick={() => setSelected(null)} title="Yopish"><X size={20} /></button>
            </div>
            <div className="rnd-mbody">
              {name && <div className="cfg-name">{name.toUpperCase()}</div>}
              <div className="cfg-title">TILNI TANLANG!</div>
              <div className="cfg-langs">
                {LANGS.map(([v, label, flag], i) => (
                  <button key={v} className={'cfg-lang' + (cfgLang === v ? ' on' : '')} onClick={() => setCfgLang(v as any)}>
                    <span className="cfg-num">{i + 1}</span>
                    <span className="cfg-lname"><Flag c={flag} />{label}</span>
                  </button>
                ))}
              </div>
              <button className="cfg-review" disabled={!cfgLang} onClick={start}>
                <span className="cfg-num">‹</span>
                <span className="cfg-lname">Javoblarni ko‘rib ketish</span>
              </button>
              <div className="cfg-info">
                <b>20 ta savollarga ajratilgan aralash savollar mavjud bo‘lgan biletlar.</b> Ushbu bo‘limda barcha fanlardan aralash
                va tasodifiy shaklda tuzilgan testlar bilan tanishib, testlarga javob berish orqali REAL IMTIHON JARAYONIGA
                tayyorlaning. Natijalar (berilgan javobning holati) har bir javob berilgandan so‘ng ko‘rinadi.
                <b> 3 ta xato</b> javob berilsa imtihon to‘xtatiladi va yiqilgan hisoblanasiz.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
