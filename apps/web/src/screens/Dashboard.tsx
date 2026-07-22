import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, FileText, BookOpen, CircleAlert, HeartCrack, Heart, TriangleAlert, SignpostBig,
  Video, Info, ChartBar, TrendingUp, Trophy, Settings, LifeBuoy, MessageCircle,
  Search, Bell, Moon, Menu, Play, ClipboardCheck, Grid3x3, Flame, Check, Zap, Award, ShieldCheck,
} from 'lucide-react';
import { api } from '../api';
import '../dashboard.css';

const TESTLAR = [
  { Icon: FileText, label: 'Rasmiy testlar', to: '/shablon' },
  { Icon: BookOpen, label: "Mavzular bo'yicha", to: '/mavzular' },
  { Icon: CircleAlert, label: 'Qiyin savollar', to: '/test?mode=tricky' },
  { Icon: HeartCrack, label: 'Xatolarim', to: '/test?mode=mistakes', badge: true },
  { Icon: Heart, label: 'Sevimlilar', to: '/test?mode=saved' },
];
const ORGANISH = [
  { Icon: TriangleAlert, label: 'Yo‘l harakati qoidalari', to: '/belgilar' },
  { Icon: SignpostBig, label: 'Belgilar', to: '/belgilar' },
  { Icon: SignpostBig, label: "Yo'l belgilari", to: '/belgilar' },
  { Icon: Video, label: 'Videodarslar', to: '/oktagon' },
  { Icon: Info, label: "Foydali ma'lumotlar", to: '/oktagon' },
];
const STAT = [
  { Icon: ChartBar, label: 'Natijalarim', to: '/profil' },
  { Icon: TrendingUp, label: 'Progress', to: '/profil' },
  { Icon: Trophy, label: 'Reyting', to: '/reyting' },
];
const BOSHQA = [
  { Icon: Settings, label: 'Sozlamalar', to: '/profil' },
  { Icon: LifeBuoy, label: 'Yordam / FAQ', to: '/oktagon' },
  { Icon: MessageCircle, label: "Biz bilan bog'lanish", to: '/oktagon' },
];
const RANK = [
  { n: 'Asadbek', p: '98.7%' }, { n: 'Malika', p: '97.2%' },
  { n: 'Javohir', p: '96.1%' }, { n: 'Sardor', p: '95.4%' },
];
const CHART = [72, 74, 68, 76, 73, 82, 80, 88, 90];

export default function Dashboard() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<any>(null);
  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);

  const name = me?.user?.firstName || 'Foydalanuvchi';
  const total = me?.stats?.totalQuestions ?? 0;
  const acc = me?.stats?.accuracy ?? 0;
  const wrong = me?.stats?.wrong ?? 0;

  const navi = (items: any[]) =>
    items.map((it) => (
      <button key={it.label} className="db-navi" onClick={() => { setOpen(false); nav(it.to); }}>
        <it.Icon size={18} /> <span>{it.label}</span>
        {it.badge && wrong > 0 && <span className="nb">{wrong}</span>}
      </button>
    ));

  const chartPts = CHART.map((v, i) => `${(i / (CHART.length - 1)) * 100},${100 - v}`).join(' ');

  return (
    <div className="db">
      <aside className={'db-side' + (open ? ' open' : '')}>
        <div className="db-logo">
          <img src="/mark.png" alt="" className="db-logo-mark" />
          <span className="db-logo-word"><span className="lg-a">AUTO</span><span className="lg-s">START</span></span>
        </div>
        <button className="db-navi active"><Home size={18} /> <span>Bosh sahifa</span></button>
        <div className="db-sec">Testlar</div>
        {navi(TESTLAR)}
        <div className="db-sec">O‘rganish</div>
        {navi(ORGANISH)}
        <div className="db-sec">Statistika</div>
        {navi(STAT)}
        <div className="db-sec">Boshqa</div>
        {navi(BOSHQA)}
        <div className="db-night"><Moon size={17} /> Tungi rejim <button className="db-toggle" /></div>
      </aside>
      {open && <div className="db-backdrop" onClick={() => setOpen(false)} />}

      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search"><Search size={17} /><input placeholder="Qidirish…" /></div>
          <div className="db-top-right">
            <div className="db-chip">UZ</div>
            <div className="db-chip"><Bell size={17} /><span className="nb">3</span></div>
            <div className="db-userchip">
              <span className="db-uava"><ShieldCheck size={18} /></span>
              <span className="db-uname"><b>{name}</b><span>Pro</span></span>
            </div>
          </div>
        </header>

        <div className="db-content">
          {/* Hero */}
          <div className="db-hero">
            <img src="/car.png" alt="" className="db-hero-car" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <div className="db-hero-decal">
              <img src="/mark.png" alt="" className="db-decal-mark" />
              <span className="db-decal-word"><span className="dw-a">AUTO</span><span className="dw-s">START</span></span>
            </div>
            <h1>Eng yaxshi haydovchi bo‘lish sari <b className="hero-brand">AUTOSTART</b> bilan <span>ilk qadam!</span></h1>
            <p>Rasmiy testlar bazasi, tushunarli izohlar va batafsil statistika bilan imtihonga mukammal tayyorlaning.</p>
            <div className="db-hero-btns">
              <button className="db-btn primary" onClick={() => nav('/shablon')}><Play size={17} /> Test yechishni boshlash</button>
              <button className="db-btn ghost" onClick={() => nav('/test?mode=practice')}><BookOpen size={17} /> O‘rganishni davom ettirish</button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="db-stats">
            <div className="db-stat"><div className="si p"><FileText size={24} /></div><div><div className="sl">Jami testlar</div><div className="sv">{total.toLocaleString()}</div><div className="sd">+128 bu hafta</div></div></div>
            <div className="db-stat"><div className="si b"><Check size={24} /></div><div><div className="sl">To‘g‘ri javoblar</div><div className="sv">{acc}%</div><div className="sd">+5.2% o‘sish</div></div></div>
            <div className="db-stat"><div className="si g"><TrendingUp size={24} /></div><div><div className="sl">O‘rtacha natija</div><div className="sv">{acc}%</div><div className="sd">Zo‘r natija! 🔥</div></div></div>
            <div className="db-stat"><div className="si o"><Flame size={24} /></div><div><div className="sl">Ketma-ketlik</div><div className="sv">15 kun</div><div className="sd">Davom eting! 💪</div></div></div>
          </div>

          {/* 3 panel */}
          <div className="db-grid3">
            <div className="db-panel">
              <div className="db-ph"><h3>Test yechish</h3></div>
              {[
                { Icon: FileText, c: 'p', t: 'Rasmiy testlar', s: 'YHQ rasmiy savollari', b: 'Barchasi', to: '/shablon' },
                { Icon: Grid3x3, c: 'g', t: "Mavzular bo'yicha", s: 'Mavzular kesimida', b: '10 mavzu', to: '/mavzular' },
                { Icon: CircleAlert, c: 'o', t: 'Qiyin savollar', s: 'Ko‘p xato qilinadigan', b: 'Tricky', to: '/test?mode=tricky' },
                { Icon: ClipboardCheck, c: 'b', t: 'Imtihon simulyatori', s: 'Real imtihon sharoiti', b: '20 savol', to: '/shablon' },
              ].map((x) => (
                <div className="db-ti" key={x.t} onClick={() => nav(x.to)}>
                  <div className={'db-tic si ' + x.c}><x.Icon size={20} /></div>
                  <div className="db-tt"><b>{x.t}</b><span>{x.s}</span></div>
                  <span className="db-badge">{x.b}</span>
                </div>
              ))}
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>Statistikam</h3><span className="lnk">7 kunlik</span></div>
              <svg className="db-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#1e2a41" strokeWidth="0.5" />)}
                <polyline points={chartPts} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
                {CHART.map((v, i) => <circle key={i} cx={(i / (CHART.length - 1)) * 100} cy={100 - v} r="1.5" fill="#60a5fa" />)}
              </svg>
              <div className="db-cstats">
                <div className="db-cstat"><b style={{ color: '#4ade80' }}>98%</b><span>Eng yaxshi</span></div>
                <div className="db-cstat"><b style={{ color: '#fb7185' }}>75%</b><span>Eng yomon</span></div>
                <div className="db-cstat"><b>{acc}%</b><span>O‘rtacha</span></div>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>Reyting</h3><div className="db-tabs"><button className="db-tab on">Umumiy</button><button className="db-tab">Do‘stlar</button></div></div>
              {RANK.map((r, i) => (
                <div className="db-ri" key={r.n}>
                  <div className="db-rank">{i + 1}</div>
                  <div className="db-riav">{r.n[0]}</div>
                  <div className="db-riname">{r.n}</div>
                  <div className="db-ripct">{r.p}</div>
                </div>
              ))}
              <div className="db-ri me">
                <div className="db-rank">5</div>
                <div className="db-riav">{name[0]}</div>
                <div className="db-riname">{name}</div>
                <div className="db-ripct">{acc}%</div>
              </div>
              <button className="db-full" onClick={() => nav('/reyting')}>To‘liq reyting →</button>
            </div>
          </div>

          {/* Rules + achievements */}
          <div className="db-grid2">
            <div className="db-panel">
              <div className="db-ph"><h3>Yo‘l harakati qoidalari</h3><span className="lnk" onClick={() => nav('/belgilar')}>Barchasini ko‘rish →</span></div>
              <div className="db-rules">
                {[
                  { Icon: FileText, c: 'o', t: 'Umumiy qoidalar', s: '12 ta qoida' },
                  { Icon: ShieldCheck, c: 'g', t: 'Majburiyatlar', s: '8 ta qoida' },
                  { Icon: SignpostBig, c: 'b', t: 'Yo‘l belgilari', s: '45 ta belgi' },
                  { Icon: TriangleAlert, c: 'p', t: 'Ishtirokchilar', s: '7 ta qoida' },
                ].map((x) => (
                  <div className="db-rule" key={x.t}>
                    <div className={'ri si ' + x.c}><x.Icon size={18} /></div>
                    <div><b>{x.t}</b><span>{x.s}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="db-panel">
              <div className="db-ph"><h3>Yutuqlar</h3></div>
              <div className="db-ach">
                {[
                  { Icon: ShieldCheck, c: 'g', t: 'Birinchi test', s: 'Test yechdi' },
                  { Icon: Check, c: 'b', t: 'Aniq javob', s: '90%+ natija' },
                  { Icon: Zap, c: 'p', t: 'Tezkor', s: '10 ketma-ket' },
                  { Icon: Award, c: 'o', t: 'Mukammal', s: '100% natija' },
                ].map((x) => (
                  <div className="db-achi" key={x.t}>
                    <div className={'ac si ' + x.c}><x.Icon size={26} /></div>
                    <b>{x.t}</b><span>{x.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
