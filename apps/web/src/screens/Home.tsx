import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListChecks, HeartCrack, BookOpen, Ticket, ListOrdered, ClipboardCheck,
  CircleAlert, Bookmark, TriangleAlert, Hash, Swords, Play, Trophy, Search,
  Settings, Check, X, Zap, Pencil, ChevronRight, User, Layers, GraduationCap,
  CarFront, MessageCircleQuestion,
} from 'lucide-react';
import { api } from '../api';
import { getLang } from '../i18n';
import LangTheme from '../components/LangTheme';
import PastkiOyna from '../components/PastkiOyna';
import type { Me } from '../types';
import '../ilova-ekran.css';

/**
 * Ilovaning bosh sahifasi (saytda Dashboard). Namuna — Oson Prava ilovasining
 * bosh sahifasi: progress + "Sizga savol bor", Darslik + Avtodrom,
 * Test yechish + Oktagon va pastda 2 ustunli kartochkalar.
 */

// "50/100 talik" darhol test ochmaydi — savol sonini so'raydi
const SAVOL_SONI = '#savol-soni';
// Imtihon testi: til ilova sozlamasidan olinadi (alohida so'ralmaydi)
const IMTIHON = '#imtihon';

const TILES = [
  { to: '/mavzular', Icon: BookOpen, cls: 'purple', title: 'Mavzular' },
  { to: '/shablon', Icon: Layers, cls: 'blue', title: 'Shablon testlar' },
  { to: SAVOL_SONI, Icon: ListOrdered, cls: 'green', title: '50/100 talik' },
  { to: IMTIHON, Icon: ClipboardCheck, cls: 'green', title: 'Real imtihon' },
  { to: '/test?mode=tricky', Icon: CircleAlert, cls: 'red', title: "Chalg'ituvchi" },
  { to: '/test?mode=saved', Icon: Bookmark, cls: 'amber', title: 'Saralangan' },
  { to: '/belgilar', Icon: TriangleAlert, cls: 'blue', title: "Yo'l belgilari" },
  { to: '/test?mode=numeric', Icon: Hash, cls: 'purple', title: 'Raqamli savollar' },
  { to: '/biletlar', Icon: Ticket, cls: 'amber', title: 'Biletlar' },
  { to: '/xatolarim', Icon: HeartCrack, cls: 'red', title: 'Xatolarim' },
];

// Random test uchun savol soni (server bir so'rovda 200 tagacha beradi)
const SONLAR = [50, 100, 200, 500];

function daysLeft(d?: string | null) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Test oynasi tili: ilovadagi "Uzbek" — lotin
const testTili = () => {
  const l = getLang();
  return l === 'uz' ? 'lat' : l;
};

export default function Home() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [soniOyna, setSoniOyna] = useState(false);

  // Ilova versiyasi — telefonda qaysi build o'rnatilganini bilish uchun
  const [versiya, setVersiya] = useState('');

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then((i) => setVersiya(i.version))
      .catch(() => {});
  }, []);

  const total = me?.stats.totalQuestions ?? 0;
  const solved = me?.stats.solvedQuestions ?? 0;
  const correct = me?.stats.correct ?? 0;
  const wrong = me?.stats.wrong ?? 0;
  const mistakes = me?.stats.mistakes ?? 0;
  const saved = me?.stats.bookmarks ?? 0;
  const progressPct = total ? Math.round((solved / total) * 100) : 0;
  const streak = 0;
  const days = daysLeft(me?.user.examDate);
  const name = me?.user.firstName || 'Ismingiz';
  const initial = name[0].toUpperCase();

  const ochish = (to: string) => {
    if (to === SAVOL_SONI) setSoniOyna(true);
    else if (to === IMTIHON) nav(`/test?mode=exam&exam=1&lang=${testTili()}&shuffle=0`);
    else nav(to);
  };

  const randomBoshla = (n: number) => {
    setSoniOyna(false);
    nav(`/test?mode=random&limit=${n}&exam=1&lang=${testTili()}&shuffle=0`);
  };

  const badge = (to: string) => {
    if (to === '/test?mode=saved' && saved > 0) return <span className="ih-badge amber">{saved}</span>;
    return null;
  };

  return (
    <div className="ie ih">
      {/* Header */}
      <div className="ih-hdr">
        <button className="ih-user" onClick={() => nav('/profil')}>
          <span className="ih-ava">
            {initial}
            <span className="ih-dot" />
          </span>
          <span className="ih-who">
            <span className="ih-name">{name}</span>
            <span className="ih-status">
              <User size={13} strokeWidth={2.6} /> YO‘LOVCHI <ChevronRight size={13} strokeWidth={2.6} />
            </span>
          </span>
        </button>
        <div className="ih-icons">
          <button title="Yutuqlar" className="gold" onClick={() => nav('/reyting')}><Trophy size={24} /></button>
          <button title="Qidiruv" onClick={() => nav('/mavzular')}><Search size={24} /></button>
          <button title="Sozlamalar" onClick={() => nav('/profil')}><Settings size={24} /></button>
        </div>
      </div>

      {/* Progress + Sizga savol bor */}
      <div className="ih-row ih-side">
        <div className="ih-prog">
          <div className="ih-prog-top">
            <span className="ih-days">
              {days == null ? 'Sanani o‘zgartirish' : `${days} kun qoldi`} <Pencil size={12} />
            </span>
            <span className="ih-streak"><Zap size={15} fill="currentColor" /> {streak} kun</span>
          </div>
          <div className="ih-prog-mid">
            <span className="ih-pct">{progressPct}%</span>
            <span className="ih-ball">
              <b className="ok"><Check size={13} strokeWidth={3} /> {correct}</b>
              <b className="no"><X size={13} strokeWidth={3} /> {wrong}</b>
              <span className="tot">— {total}</span>
            </span>
          </div>
          <div className="ih-pbar"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
        <button className="ih-ask" onClick={() => nav('/aloqa')}>
          <MessageCircleQuestion size={34} />
          <span>Sizga savol bor</span>
        </button>
      </div>

      {/* Barcha testlar / Xatolarni tuzatish */}
      <div className="ih-row ih-grid">
        <button className="ih-tile blue" onClick={() => nav('/test?mode=all')}>
          <span className="ih-blobw"><span className="ih-blob" /></span>
          <span className="ih-ic"><ListChecks size={24} /></span>
          <span className="ih-tt">Barcha testlar</span>
        </button>
        <button className="ih-tile red" onClick={() => nav('/test?mode=mistakes')}>
          <span className="ih-blobw"><span className="ih-blob" /></span>
          <span className="ih-ic"><HeartCrack size={24} /></span>
          <span className="ih-tt">Xatolarni tuzatish</span>
          {mistakes > 0 && <span className="ih-badge">{mistakes}</span>}
        </button>
      </div>

      {/* Darslik + Avtodrom */}
      <div className="ih-row ih-side">
        <button className="ih-dars" onClick={() => nav('/amaliy')}>
          <span className="ih-dars-t">
            <b>Darslik</b>
            <span>Amaliy mashg‘ulotlar</span>
          </span>
          <span className="ih-circ"><GraduationCap size={26} /></span>
        </button>
        <button className="ih-avto" onClick={() => nav('/avtodrom')}>
          <CarFront size={40} strokeWidth={1.8} />
          <span>Avtodrom</span>
        </button>
      </div>

      {/* Test yechish + Oktagon */}
      <div className="ih-row ih-grid">
        <button className="ih-big green" onClick={() => nav('/test?mode=practice')}>
          <span className="ih-circ"><Play size={24} fill="currentColor" /></span>
          <b>Test yechish</b>
          <span>Sizga mos savollar</span>
        </button>
        <button className="ih-big gray" onClick={() => nav('/oktagon')}>
          <span className="ih-circ"><Swords size={24} /></span>
          <b>Oktagon</b>
          <span>Birga-bir jang</span>
        </button>
      </div>

      {/* Bo'limlar */}
      <div className="ih-row ih-grid">
        {TILES.map((t) => (
          <button key={t.to} className={'ih-tile ' + t.cls} onClick={() => ochish(t.to)}>
            <span className="ih-blobw"><span className="ih-blob" /></span>
            <span className="ih-ic"><t.Icon size={24} /></span>
            <span className="ih-tt">{t.title}</span>
            {badge(t.to)}
          </button>
        ))}
      </div>

      {/* Til va mavzu — ilovada yon menyu yo'q, shuning uchun shu yerda */}
      <div className="hlt"><LangTheme /></div>
      {versiya && <div className="hver">Versiya {versiya}</div>}

      {soniOyna && (
        <PastkiOyna title="Savol sonini tanlang" subtitle="Random savollar bilan test" onClose={() => setSoniOyna(false)}>
          <div className="ie-sh-grid">
            {SONLAR.map((n) => (
              <button key={n} className="ie-sh-opt" onClick={() => randomBoshla(n)}>
                <b>{n}</b>
                <span>ta savol</span>
              </button>
            ))}
          </div>
        </PastkiOyna>
      )}
    </div>
  );
}
