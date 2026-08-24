import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bookmark, ChevronLeft, Bell, Search, Moon, Globe, User, Menu, X,
} from 'lucide-react';
import { api, type ShablonProgress } from '../api';
import AppSidebar from '../components/AppSidebar';
import '../shablon.css';

const COUNT = 63;
// Progress doirasi uzunligi (r=18)
const RING = 2 * Math.PI * 18;
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

export default function Shablon() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false); // mobil menyu
  const [name, setName] = useState('Mehmon');
  const [selected, setSelected] = useState<number | null>(null); // ochilgan shablon (modal)
  const [cfgLang, setCfgLang] = useState<'lat' | 'cyr' | 'rus' | null>(null);

  // Har shablon bo'yicha progress — avval kartalarda 0% qotirib yozilgandi
  const [progress, setProgress] = useState<Record<number, ShablonProgress>>({});

  useEffect(() => {
    api.me().then((m: any) => setName(m?.user?.firstName || 'Mehmon')).catch(() => {});
    api.shablonProgress()
      .then((r) => {
        const x: Record<number, ShablonProgress> = {};
        for (const p of r.list || []) x[p.shablon] = p;
        setProgress(x);
      })
      .catch(() => {});
  }, []);

  // ?open=N — shablon modalini avtomatik ochish
  useEffect(() => {
    const o = sp.get('open');
    if (o && /^\d+$/.test(o)) { setSelected(Number(o)); setCfgLang(null); }
  }, [sp]);

  const toggleSave = (n: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((s) => {
      const x = new Set(s);
      x.has(n) ? x.delete(n) : x.add(n);
      return x;
    });
  };

  const start = () => {
    if (!cfgLang) return; // til tanlanmasa boshlanmaydi
    // shuffle=0 — variantlar aralashmasin (avvalgi standart holat)
    nav(`/test?mode=exam&exam=1&lang=${cfgLang}&shuffle=0${selected ? `&n=${selected}&shablon=${selected}` : ''}`);
  };

  return (
    <div className="wl">
      <AppSidebar active="/shablon" open={open} onClose={() => setOpen(false)} />

      {/* Main */}
      <div className="wl-main">
        <header className="wl-top">
          <button className="wl-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="wl-icard" onClick={() => nav('/')}><ChevronLeft size={20} /></button>
          <div className="wl-top-right">
            <div className="wl-lang"><Globe size={16} /> O‘zbek (lotin)</div>
            <button className="wl-icard"><Search size={18} /></button>
            <button className="wl-icard"><Moon size={18} /></button>
            <button className="wl-icard"><Bell size={18} /></button>
            <div className="wl-user"><span className="wl-uava"><User size={16} /></span> <span>{name}</span></div>
          </div>
        </header>

        <div className="wl-content">
          <h1 className="wl-h1">Shablon testlar (Imtihon)</h1>
          <div className="wl-grid">
            {Array.from({ length: COUNT }, (_, i) => i + 1).map((n) => {
              const pr = progress[n] || { shablon: n, total: 0, answered: 0, correct: 0, percent: 0 };
              return (
              <div className={'wl-card' + (pr.answered ? ' boshlangan' : '')} key={n} onClick={() => { setSelected(n); setCfgLang(null); }}>
                <button className={'wl-bm' + (saved.has(n) ? ' on' : '')} onClick={(e) => toggleSave(n, e)} title="Saqlash">
                  <Bookmark size={18} fill={saved.has(n) ? 'currentColor' : 'none'} />
                </button>
                <div className="wl-cnum">{n} SHABLON</div>
                <div className="wl-crow">
                  <div className="wl-ring">
                    <svg viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" className="wl-ring-bg" />
                      <circle
                        cx="22" cy="22" r="18"
                        className={'wl-ring-fg' + (pr.percent >= 90 ? ' ok' : pr.percent > 0 ? ' mid' : '')}
                        strokeDasharray={RING}
                        strokeDashoffset={RING * (1 - pr.percent / 100)}
                      />
                    </svg>
                    <span>{pr.percent}%</span>
                  </div>
                  <div className="wl-cinfo">
                    <div>To‘g‘ri javoblar: <b>{pr.correct}</b>{pr.total ? ` / ${pr.total}` : ''}</div>
                    <div>Yechilgan: <b>{pr.answered}</b>{pr.total ? ` / ${pr.total}` : ''}</div>
                    <div>Vaqt: <b>25 daqiqa</b></div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Til tanlash MODAL (grid ustida) */}
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
