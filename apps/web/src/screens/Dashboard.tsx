import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, FileText, BookOpen, CircleAlert, HeartCrack, Heart, TriangleAlert, SignpostBig,
  Video, Info, ChartBar, TrendingUp, Trophy, Settings, LifeBuoy, MessageCircle,
  Search, Moon, Menu, Play, ClipboardCheck, Grid3x3, Flame, Check, Zap, Award, ShieldCheck,
  LogOut, User, Shuffle, ChevronDown,
} from 'lucide-react';
import { api, clearToken, forgetAdmin, isOwner, type RatingRow, type DailyStat } from '../api';
import AppSidebar from '../components/AppSidebar';
import '../dashboard.css';

export default function Dashboard() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [umenu, setUmenu] = useState(false);
  const [me, setMe] = useState<any>(null);
  // Reyting — haqiqiy foydalanuvchilar (avval bu yerda qo'lda yozilgan ismlar turardi)
  const [reyting, setReyting] = useState<RatingRow[]>([]);
  // 7 kunlik statistika — avval bu yerda qotirib yozilgan raqamlar turardi
  const [kunlik, setKunlik] = useState<{ list: DailyStat[]; best: number | null; worst: number | null } | null>(null);
  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.rating(50).then((r) => setReyting(r.list || [])).catch(() => {});
    api.dailyStats(7).then(setKunlik).catch(() => {});
  }, []);

  const name = me?.user?.firstName || 'Foydalanuvchi';
  const total = me?.stats?.totalQuestions ?? 0;
  const acc = me?.stats?.accuracy ?? 0;
  // Har kim o'ziga tegishli raqamlarni ko'radi
  const solved = me?.stats?.solvedQuestions ?? 0;
  const correct = me?.stats?.correct ?? 0;
  const answered = me?.stats?.answered ?? 0;
  const streak = me?.stats?.streak ?? 0;
  const wrong = me?.stats?.wrong ?? 0;

  // Grafik: javob berilgan kunlargina nuqta bo'ladi
  const kunList = kunlik?.list ?? [];
  const nuqtalar = kunList
    .map((d, i) => ({ ...d, x: kunList.length > 1 ? (i / (kunList.length - 1)) * 100 : 50 }))
    .filter((d) => d.accuracy != null);
  const chartPts = nuqtalar.map((d) => `${d.x},${100 - (d.accuracy as number)}`).join(' ');

  // Owner o'z sahifasini admin ko'rinishida (statistika bilan) ko'radi,
  // qolganlar oddiy profilga tushadi — /foydalanuvchilar ular uchun 403.
  const ozId = (me as any)?.user?.id as number | undefined;
  const ozSahifa = isOwner() && ozId ? '/foydalanuvchilar/' + ozId : '/profil';
  const ozOrni = reyting.find((r) => r.userId === ozId);

  return (
    <div className="db">
      <AppSidebar active="/" open={open} onClose={() => setOpen(false)} wrong={wrong} />

      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search"><Search size={17} /><input placeholder="Qidirish…" /></div>
          <div className="db-top-right">
            <div className="db-userwrap">
              {/* Ism ustiga bosilsa — o'sha foydalanuvchi sahifasiga o'tadi.
                  Owner uchun admin ko'rinishi, qolganlar uchun o'z profili. */}
              <div className="db-userchip" onClick={() => nav(ozSahifa)} title="Mening sahifam">
                <span className="db-uava"><ShieldCheck size={18} /></span>
                <span className="db-uname"><b>{name}</b><span>Pro</span></span>
              </div>
              <button className="db-uarrow" onClick={() => setUmenu((v) => !v)} title="Menyu">
                <ChevronDown size={16} />
              </button>
              {umenu && (
                <>
                  <div className="db-umenu-ov" onClick={() => setUmenu(false)} />
                  <div className="db-umenu">
                    <button onClick={() => { setUmenu(false); nav(ozSahifa); }}><User size={15} /> Mening sahifam</button>
                    <button className="danger" onClick={() => { clearToken(); forgetAdmin(); localStorage.removeItem('yhq_entered'); window.location.href = '/'; }}><LogOut size={15} /> Chiqish</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="db-content">
          {/* Hero */}
          <div className="db-hero">
            <img src="/car.jpg" alt="" className="db-hero-car" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <h1>Eng yaxshi haydovchi bo‘lish sari <b className="hero-brand">AUTOSTART</b> bilan <span>ilk qadam!</span></h1>
            <p>Rasmiy testlar bazasi, tushunarli izohlar va batafsil statistika bilan imtihonga mukammal tayyorlaning.</p>
            <div className="db-hero-btns">
              <button className="db-btn primary" onClick={() => nav('/shablon')}><Play size={17} /> Test yechishni boshlash</button>
              <button className="db-btn ghost" onClick={() => nav('/test?mode=practice')}><BookOpen size={17} /> O‘rganishni davom ettirish</button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="db-stats">
            <div className="db-stat db-stat-link" onClick={() => nav('/yechilgan')} title="Yechilgan savollarni ko‘rish"><div className="si p"><FileText size={24} /></div><div><div className="sl">Yechilgan testlar</div><div className="sv">{solved.toLocaleString()}</div><div className="sd">jami {total.toLocaleString()} tadan</div></div></div>
            <div className="db-stat"><div className="si b"><Check size={24} /></div><div><div className="sl">To‘g‘ri javoblar</div><div className="sv">{correct.toLocaleString()}</div><div className="sd">{answered.toLocaleString()} ta javobdan</div></div></div>
            <div className="db-stat"><div className="si g"><TrendingUp size={24} /></div><div><div className="sl">O‘rtacha natija</div><div className="sv">{acc}%</div><div className="sd">{answered ? (acc >= 90 ? 'Zo‘r natija! 🔥' : acc >= 70 ? 'Yaxshi ketyapti 👍' : 'Mashq qiling 💪') : 'Hali test yechilmagan'}</div></div></div>
            <div className="db-stat"><div className="si o"><Flame size={24} /></div><div><div className="sl">Ketma-ketlik</div><div className="sv">{streak} kun</div><div className="sd">{streak > 0 ? 'Davom eting! 💪' : 'Bugun boshlang'}</div></div></div>
          </div>

          {/* 3 panel */}
          <div className="db-grid3">
            <div className="db-panel">
              <div className="db-ph"><h3>Test yechish</h3></div>
              {[
                { Icon: FileText, c: 'p', t: 'Shablon testlar', s: '63 ta imtihon bileti', b: '63 ta', to: '/shablon' },
                { Icon: Shuffle, c: 'g', t: 'Random testlar', s: 'Barcha shablonlardan aralash', b: '20–200', to: '/random' },
                { Icon: Grid3x3, c: 'g', t: "Mavzular bo'yicha", s: 'Mavzular kesimida', b: '10 mavzu', to: '/mavzular' },
                { Icon: HeartCrack, c: 'o', t: 'Xato qilgan savollarim', s: 'Xatolar ustida ishlash', b: 'Shaxsiy', to: '/xatolarim' },
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
              {nuqtalar.length === 0 ? (
                <div className="db-rempty">Oxirgi 7 kunda test yechilmagan.</div>
              ) : (
                <svg className="db-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(124,108,245,.14)" strokeWidth="0.5" />)}
                  {nuqtalar.length > 1 && (
                    <polyline points={chartPts} fill="none" stroke="#7c6cf5" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {nuqtalar.map((d) => (
                    <circle key={d.date} cx={d.x} cy={100 - (d.accuracy as number)} r="1.6" fill="#b3a6ff">
                      <title>{d.date}: {d.accuracy}% ({d.correct}/{d.answered})</title>
                    </circle>
                  ))}
                </svg>
              )}
              <div className="db-cstats">
                <div className="db-cstat"><b style={{ color: '#4ade80' }}>{kunlik?.best != null ? kunlik.best + '%' : '—'}</b><span>Eng yaxshi</span></div>
                <div className="db-cstat"><b style={{ color: '#fb7185' }}>{kunlik?.worst != null ? kunlik.worst + '%' : '—'}</b><span>Eng yomon</span></div>
                <div className="db-cstat"><b>{acc}%</b><span>O‘rtacha</span></div>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>Reyting</h3><div className="db-tabs"><button className="db-tab on">Umumiy</button><button className="db-tab">Do‘stlar</button></div></div>
              {reyting.length === 0 ? (
                <div className="db-rempty">Hali hech kim test yechmagan.</div>
              ) : (
                reyting.slice(0, 5).map((r) => (
                  <div className={'db-ri' + (r.userId === ozId ? ' me' : '')} key={r.userId}>
                    <div className="db-rank">{r.rank}</div>
                    <div className="db-riav">{(r.firstName || '?')[0].toUpperCase()}</div>
                    <div className="db-riname">{r.firstName}</div>
                    <div className="db-ripct">{r.accuracy}%</div>
                  </div>
                ))
              )}
              {/* O'zi birinchi beshlikka kirmasa — pastda alohida ko'rsatamiz */}
              {ozOrni && ozOrni.rank > 5 && (
                <div className="db-ri me">
                  <div className="db-rank">{ozOrni.rank}</div>
                  <div className="db-riav">{(ozOrni.firstName || '?')[0].toUpperCase()}</div>
                  <div className="db-riname">{ozOrni.firstName}</div>
                  <div className="db-ripct">{ozOrni.accuracy}%</div>
                </div>
              )}
              <button className="db-full" onClick={() => nav('/reyting')}>To‘liq reyting →</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
