import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bookmark, ChevronLeft, Bell, Search, Moon, Globe, User, Menu,
} from 'lucide-react';
import { api } from '../api';
import AppSidebar from '../components/AppSidebar';
import '../shablon.css';

const COUNT = 63;
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
  const [shuffle, setShuffle] = useState(false);

  useEffect(() => {
    api.me().then((m: any) => setName(m?.user?.firstName || 'Mehmon')).catch(() => {});
  }, []);

  // ?open=N — shablon modalini avtomatik ochish
  useEffect(() => {
    const o = sp.get('open');
    if (o && /^\d+$/.test(o)) { setSelected(Number(o)); setCfgLang(null); setShuffle(false); }
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
    nav(`/test?mode=exam&exam=1&lang=${cfgLang}&shuffle=${shuffle ? 1 : 0}${selected ? `&n=${selected}` : ''}`);
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
            {Array.from({ length: COUNT }, (_, i) => i + 1).map((n) => (
              <div className="wl-card" key={n} onClick={() => { setSelected(n); setCfgLang(null); setShuffle(false); }}>
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
              {LANGS.map(([v, label, flag], i) => (
                <button key={v} className={'cfg-lang' + (cfgLang === v ? ' on' : '')} onClick={() => setCfgLang(v as any)}>
                  <span className="cfg-num">{i + 1}</span>
                  <span className="cfg-lname"><Flag c={flag} />{label}</span>
                </button>
              ))}
            </div>
            <div className="cfg-shuffle">
              <button className={'cfg-sh' + (shuffle ? ' on' : '')} onClick={() => setShuffle(true)}>Variantlar aralashsin</button>
              <button className={'cfg-sh' + (!shuffle ? ' on' : '')} onClick={() => setShuffle(false)}>Variantlar aralashmasin</button>
            </div>
            <button className="cfg-review" disabled={!cfgLang} onClick={start}>
              <span className="cfg-num">‹</span>
              <span className="cfg-lname">Javoblarni ko‘rib ketish</span>
            </button>
            <div className="cfg-info">
              <b>20 ta savollarga ajratilgan aralash savollar mavjud bo‘lgan biletlar.</b> Ushbu bo‘limda barcha fanlardan aralash
              va tasodifiy shaklda tuzilgan testlar bilan tanishib, testlarga javob berish orqali REAL IMTIHON JARAYONIGA
              tayyorlaning. Natijalar (berilgan javobning holati) har bir javob berilgandan so‘ng ko‘rinadi.
              <b> 3 tadan ortiq xato</b> javob berilganda imtihondan yiqilgan hisoblanasiz.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
