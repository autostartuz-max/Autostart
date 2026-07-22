import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, ClipboardList, Layers, BookOpen, Ticket, TriangleAlert, HeartCrack,
  Bookmark, Swords, Trophy, Car, ChevronLeft, Bell, Search, Moon, Globe, User, Menu,
} from 'lucide-react';
import { api } from '../api';
import '../shablon.css';

const NAV = [
  { Icon: Home, label: 'Bosh sahifa', to: '/' },
  { Icon: ClipboardList, label: 'Barcha testlar', to: '/test?mode=all' },
  { Icon: Layers, label: 'Shablon testlar', to: '/shablon', active: true },
  { Icon: BookOpen, label: 'Mavzular', to: '/mavzular' },
  { Icon: Ticket, label: 'Biletlar', to: '/biletlar' },
  { Icon: TriangleAlert, label: "Yo'l belgilari", to: '/belgilar' },
  { Icon: HeartCrack, label: 'Xatolar', to: '/test?mode=mistakes' },
  { Icon: Bookmark, label: 'Saqlanganlar', to: '/test?mode=saved' },
  { Icon: Swords, label: 'Oktagon', to: '/oktagon' },
  { Icon: Trophy, label: 'Reyting', to: '/reyting' },
];

const COUNT = 63;
const LANGS: [string, string][] = [['lat', '🇺🇿 O‘zbek'], ['cyr', '🇺🇿 Кирилл'], ['rus', '🇷🇺 Рус']];

export default function Shablon() {
  const nav = useNavigate();
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false); // mobil menyu
  const [name, setName] = useState('Mehmon');
  const [selected, setSelected] = useState<number | null>(null); // ochilgan shablon (modal)
  const [cfgLang, setCfgLang] = useState<'lat' | 'cyr' | 'rus'>('lat');
  const [shuffle, setShuffle] = useState(false);

  useEffect(() => {
    api.me().then((m: any) => setName(m?.user?.firstName || 'Mehmon')).catch(() => {});
  }, []);

  const toggleSave = (n: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((s) => {
      const x = new Set(s);
      x.has(n) ? x.delete(n) : x.add(n);
      return x;
    });
  };

  const start = () => {
    nav(`/test?mode=exam&exam=1&lang=${cfgLang}&shuffle=${shuffle ? 1 : 0}`);
  };

  return (
    <div className="wl">
      {/* Sidebar */}
      <aside className={'wl-side' + (open ? ' open' : '')}>
        <div className="wl-logo"><span className="wl-logo-ic"><Car size={20} /></span> Autostart</div>
        <nav className="wl-nav">
          {NAV.map((n) => (
            <button key={n.label} className={'wl-navi' + (n.active ? ' active' : '')} onClick={() => { setOpen(false); nav(n.to); }}>
              <n.Icon size={19} /> <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      {open && <div className="wl-backdrop" onClick={() => setOpen(false)} />}

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
            {Array.from({ length: COUNT }, (_, i) => i + 1).map((n) => (
              <div className="wl-card" key={n} onClick={() => { setSelected(n); setCfgLang('lat'); setShuffle(false); }}>
                <button className={'wl-bm' + (saved.has(n) ? ' on' : '')} onClick={(e) => toggleSave(n, e)} title="Saqlash">
                  <Bookmark size={18} fill={saved.has(n) ? 'currentColor' : 'none'} />
                </button>
                <div className="wl-cnum">{n} SHABLON</div>
                <div className="wl-crow">
                  <div className="wl-ring">
                    <svg viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" className="wl-ring-bg" />
                      <circle cx="22" cy="22" r="18" className="wl-ring-fg" strokeDasharray="113" strokeDashoffset="113" />
                    </svg>
                    <span>0%</span>
                  </div>
                  <div className="wl-cinfo">
                    <div>To‘g‘ri javoblar soni: <b>0</b></div>
                    <div>Vaqt: <b>25 daqiqa</b></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Til tanlash MODAL (grid ustida) */}
      {selected != null && (
        <div className="cfg-overlay" onClick={() => setSelected(null)}>
          <div className="cfg" onClick={(e) => e.stopPropagation()}>
            {name && <div className="cfg-name">{name.toUpperCase()}</div>}
            <div className="cfg-title">TILNI TANLANG!</div>
            <div className="cfg-langs">
              {LANGS.map(([v, label], i) => (
                <button key={v} className={'cfg-lang' + (cfgLang === v ? ' on' : '')} onClick={() => setCfgLang(v as any)}>
                  <span className="cfg-num">{i + 1}</span>
                  <span className="cfg-lname">{label}</span>
                </button>
              ))}
            </div>
            <div className="cfg-shuffle">
              <button className={'cfg-sh' + (shuffle ? ' on' : '')} onClick={() => setShuffle(true)}>Variantlar aralashsin</button>
              <button className={'cfg-sh' + (!shuffle ? ' on' : '')} onClick={() => setShuffle(false)}>Variantlar aralashmasin</button>
            </div>
            <div className="cfg-info">
              <b>20 ta aralash savoldan iborat imtihon bileti.</b> Barcha mavzulardan tasodifiy tuzilgan testlar bilan tanishib,
              REAL IMTIHON JARAYONIGA tayyorlaning. Natija (javob holati) har bir javobdan so‘ng ko‘rinadi.
              <b> 3 tadan ortiq xato</b> javobda imtihondan yiqilgan hisoblanasiz.
            </div>
            <div className="cfg-btns">
              <button className="cfg-back" onClick={() => setSelected(null)}>← Orqaga</button>
              <button className="cfg-start" onClick={start}>Boshlash →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
