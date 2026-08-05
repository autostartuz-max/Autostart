import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Bell, Search, Moon, Globe, User, Menu, Shuffle, X, Clock, ListChecks,
} from 'lucide-react';
import { api } from '../api';
import AppSidebar from '../components/AppSidebar';
import '../shablon.css';

// Random test variantlari — barcha shablonlardagi savollardan aralashtirib olinadi
const COUNTS = [20, 50, 100, 200];
// Imtihon me'yori: 20 savolga 25 daqiqa (1.25 daq/savol), 15% xatoga ruxsat
const minutesFor = (n: number) => Math.round(n * 1.25);
const allowedWrong = (n: number) => Math.max(3, Math.round(n * 0.15));

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

export default function RandomTests() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false); // mobil menyu
  const [name, setName] = useState('Mehmon');
  const [picking, setPicking] = useState(false); // "Tanlang" oynasi
  const [count, setCount] = useState(20);
  const [cfgLang, setCfgLang] = useState<'lat' | 'cyr' | 'rus' | null>(null);

  useEffect(() => {
    api.me().then((m: any) => setName(m?.user?.firstName || 'Mehmon')).catch(() => {});
  }, []);

  const openPicker = (n: number) => {
    setCount(n);
    setCfgLang(null);
    setPicking(true);
  };

  const start = () => {
    if (!cfgLang) return; // til tanlanmasa boshlanmaydi
    // shuffle=0 — variantlar aralashmasin (avvalgi standart holat)
    nav(`/test?mode=random&limit=${count}&exam=1&lang=${cfgLang}&shuffle=0`);
  };

  return (
    <div className="wl">
      <AppSidebar active="/random" open={open} onClose={() => setOpen(false)} />

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
          <h1 className="wl-h1">Random testlar</h1>
          <p className="rnd-lead">
            Savollar <b>barcha shablonlardan</b> aralashtirib olinadi — har safar yangi to‘plam.
          </p>

          <div className="wl-grid">
            {COUNTS.map((n) => (
              <div className="wl-card rnd-card" key={n} onClick={() => openPicker(n)}>
                <div className="rnd-ic"><Shuffle size={20} /></div>
                <div className="wl-cnum">RANDOM {n}</div>
                <div className="wl-cinfo">
                  <div><ListChecks size={14} /> Savollar: <b>{n} ta</b></div>
                  <div><Clock size={14} /> Vaqt: <b>{minutesFor(n)} daqiqa</b></div>
                  <div>Ruxsat etilgan xato: <b>{allowedWrong(n)} ta</b></div>
                </div>
                <button className="rnd-go" onClick={(e) => { e.stopPropagation(); openPicker(n); }}>
                  Boshlash
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* "Tanlang" oynasi — savollar soni + til */}
      {picking && (
        <div className="cfg-overlay" onClick={() => setPicking(false)}>
          <div className="rnd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rnd-mhead">
              <span>Tanlang</span>
              <button className="rnd-x" onClick={() => setPicking(false)} title="Yopish"><X size={20} /></button>
            </div>

            <div className="rnd-mbody">
              <div className="rnd-meta">
                <span><ListChecks size={14} /> {count} ta savol</span>
                <span><Clock size={14} /> {minutesFor(count)} daqiqa</span>
                <span>Ruxsat etilgan xato: {allowedWrong(count)} ta</span>
              </div>

              <div className="cfg-title">TILNI TANLANG!</div>
              <div className="cfg-langs">
                {LANGS.map(([v, label, flag], i) => (
                  <button key={v} className={'cfg-lang' + (cfgLang === v ? ' on' : '')} onClick={() => setCfgLang(v as any)}>
                    <span className="cfg-num">{i + 1}</span>
                    <span className="cfg-lname"><Flag c={flag} />{label}</span>
                  </button>
                ))}
              </div>

              <button className="rnd-start" disabled={!cfgLang} onClick={start}>
                {cfgLang ? `${count} ta savolni boshlash` : 'Avval tilni tanlang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
