import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, FileText, BookOpen, CircleAlert, HeartCrack, Heart, TriangleAlert, SignpostBig,
  Video, Info, ChartBar, TrendingUp, Trophy, Settings, LifeBuoy, MessageCircle,
  Search, Moon, Menu, Play, ClipboardCheck, Grid3x3, Flame, Check, Zap, Award, ShieldCheck,
  LogOut, User, Shuffle, ChevronDown,
} from 'lucide-react';
import { api, clearToken, forgetAdmin, isOwner, ROLE_LABEL, type RatingRow, type DailyStat, type OnlineRow } from '../api';
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
  // Hozir nechta odam ishlayapti — har 60 soniyada yangilanadi
  const [onlayn, setOnlayn] = useState<number | null>(null);
  const [onlaynList, setOnlaynList] = useState<OnlineRow[]>([]);
  const [onlaynOchiq, setOnlaynOchiq] = useState(false);
  // Oxirgi 2 haftada qo'shilgan amaliy mashg'ulotlar — sarlavhadagi tabletka uchun
  const [yangiDars, setYangiDars] = useState(0);
  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.rating(50).then((r) => setReyting(r.list || [])).catch(() => {});
    // 14 kun so'raymiz: grafik oxirgi 7 kunni, mikro-ustunlar esa hammasini ko'rsatadi
    api.dailyStats(14).then(setKunlik).catch(() => {});
    api.lessons()
      .then((r) => {
        const chegara = Date.now() - 14 * 864e5;
        setYangiDars((r.list || []).filter((l) => new Date(l.createdAt).getTime() > chegara).length);
      })
      .catch(() => {});

    const onlaynYukla = () =>
      api.online()
        .then((r) => { setOnlayn(r.count); setOnlaynList(r.list || []); })
        .catch(() => {});
    onlaynYukla();
    const t = setInterval(onlaynYukla, 60_000);
    return () => clearInterval(t);
  }, []);

  const name = me?.user?.firstName || 'Foydalanuvchi';
  const total = me?.stats?.totalQuestions ?? 0;
  const acc = me?.stats?.accuracy ?? 0;
  // Har kim o'ziga tegishli raqamlarni ko'radi
  const solved = me?.stats?.solvedQuestions ?? 0;
  const correct = me?.stats?.correct ?? 0;
  const answered = me?.stats?.answered ?? 0;
  const streak = me?.stats?.streak ?? 0;
  // Menyudagi nishon — "Xato qilgan savollarim" sahifasidagi son bilan bir xil:
  // har savolning OXIRGI javobi xato bo'lganlar soni (stats.wrong esa qayta
  // urinishlarni ham sanaydi, shuning uchun u bu yerga to'g'ri kelmaydi).
  const wrong = me?.stats?.mistakes ?? 0;

  // Grafik: javob berilgan kunlargina nuqta bo'ladi.
  // 14 kunlik oynani ikkiga bo'lamiz — shu hafta va o'tgan hafta ustma-ust chiziladi.
  const kunList = kunlik?.list ?? [];
  const hafta = kunList.slice(-7);
  const oldingi = kunList.slice(0, Math.max(0, kunList.length - 7));

  const nuqtalash = (rows: DailyStat[]) =>
    rows
      .map((d, i) => ({ ...d, x: rows.length > 1 ? (i / (rows.length - 1)) * 100 : 50 }))
      .filter((d) => d.accuracy != null);

  const nuqtalar = nuqtalash(hafta);
  const oldingiNuqta = nuqtalash(oldingi);
  // Y o'qi 0–100 emas, ma'lumot oralig'iga moslanadi: 60–80% oralig'idagi
  // natijalar to'liq balandlikda ochiladi, aks holda chiziq tep-tekis ko'rinardi.
  const barchaFoiz = [...nuqtalar, ...oldingiNuqta].map((d) => d.accuracy as number).concat(acc || 0);
  const yMin = Math.max(0, Math.min(...barchaFoiz) - 8);
  const yMax = Math.min(100, Math.max(...barchaFoiz) + 8);
  const Y = (v: number) => ((yMax - v) / Math.max(1, yMax - yMin)) * 100;
  const chiziq = (pts: typeof nuqtalar) => pts.map((d) => `${d.x},${Y(d.accuracy as number)}`).join(' ');
  const chartPts = chiziq(nuqtalar);
  const oldingiPts = chiziq(oldingiNuqta);

  // Eng yaxshi/yomon — grafikda ko'rinayotgan 7 kun bo'yicha (API 14 kunni qaytaradi)
  const haftaFoiz = nuqtalar.map((d) => d.accuracy as number);
  const engYaxshi = haftaFoiz.length ? Math.max(...haftaFoiz) : null;
  const engYomon = haftaFoiz.length ? Math.min(...haftaFoiz) : null;

  const kunBelgi = (d: string) => { try { return new Date(d).getDate() + '-kun'; } catch { return ''; } };

  /** Stat kartochkasidagi mikro-ustunlar — 14 kunlik haqiqiy qiymatlar */
  const spark = (vals: number[], cls: string) => {
    const oxirgi = vals.slice(-10);
    if (!oxirgi.some((v) => v > 0)) return null;
    const max = Math.max(1, ...oxirgi);
    return (
      <div className={'db-spark ' + cls} aria-hidden>
        {oxirgi.map((v, i) => <i key={i} style={{ height: Math.max(3, Math.round((v / max) * 42)) + 'px' }} />)}
      </div>
    );
  };

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
            {yangiDars > 0 && (
              <button className="db-newles" onClick={() => nav('/amaliy')} title="Amaliy mashg‘ulotlar">
                <Video size={16} /> <span>Yangi darsliklar:</span> <b>{yangiDars} ta</b>
              </button>
            )}
            {onlayn != null && (
              <div className="db-onlwrap">
                <button
                  className={'db-online' + (onlaynList.length ? ' bosiladi' : '')}
                  title={onlaynList.length ? 'Kimlar onlayn — ko‘rish' : 'Oxirgi 5 daqiqada faol foydalanuvchilar'}
                  onClick={() => onlaynList.length && setOnlaynOchiq((v) => !v)}
                >
                  <span className="db-online-dot" />
                  <b>{onlayn}</b> <span>onlayn</span>
                </button>
                {onlaynOchiq && onlaynList.length > 0 && (
                  <>
                    <div className="db-umenu-ov" onClick={() => setOnlaynOchiq(false)} />
                    <div className="db-onlmenu">
                      <div className="db-onlmenu-h">Hozir onlayn ({onlaynList.length})</div>
                      {onlaynList.map((u) => (
                        <div className="db-onli" key={u.id}>
                          <span className="db-onli-av">{(u.firstName || '?')[0].toUpperCase()}</span>
                          <span className="db-onli-t">
                            <b>{u.firstName}{u.id === ozId ? ' (siz)' : ''}</b>
                            <span>{u.mehmon ? 'Mehmon' : ROLE_LABEL[u.role]}</span>
                          </span>
                          <span className="db-onli-dot" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
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
            <div className="db-stat db-stat-link" onClick={() => nav('/yechilgan')} title="Yechilgan savollarni ko‘rish">
              <div className="si p"><FileText size={24} /></div>
              <div className="db-stat-in"><div className="sl">Yechilgan testlar</div><div className="sv">{solved.toLocaleString()}</div><div className="sd">jami {total.toLocaleString()} tadan</div></div>
              {spark(kunList.map((d) => d.answered), 'gr')}
            </div>
            <div className="db-stat">
              <div className="si b"><Check size={24} /></div>
              <div className="db-stat-in"><div className="sl">To‘g‘ri javoblar</div><div className="sv">{correct.toLocaleString()}</div><div className="sd">{answered.toLocaleString()} ta javobdan</div></div>
              {spark(kunList.map((d) => d.correct), 'gr')}
            </div>
            <div className="db-stat">
              <div className="si g"><TrendingUp size={24} /></div>
              <div className="db-stat-in"><div className="sl">O‘rtacha natija</div><div className="sv">{acc}%</div><div className="sd">{answered ? (acc >= 90 ? 'Zo‘r natija! 🔥' : acc >= 70 ? 'Yaxshi ketyapti 👍' : 'Mashq qiling 💪') : 'Hali test yechilmagan'}</div></div>
              {spark(kunList.map((d) => d.accuracy ?? 0), 'ye')}
            </div>
            <div className="db-stat">
              <div className="si o"><Flame size={24} /></div>
              <div className="db-stat-in"><div className="sl">Ketma-ketlik</div><div className="sv">{streak} kun</div><div className="sd">{streak > 0 ? 'Davom eting! 💪' : 'Bugun boshlang'}</div></div>
              {spark(kunList.map((d) => (d.answered > 0 ? 1 : 0)), 're')}
            </div>
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
                { Icon: CircleAlert, c: 'o', t: 'Qiyin savollar', s: 'Talabalar ko‘p xato qiladigan', b: 'Statistika', to: '/test?mode=tricky' },
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
                <>
                  <div className="db-legend">
                    <span><i style={{ background: 'var(--db-green)' }} /> O‘z natijam</span>
                    {oldingiNuqta.length > 0 && <span><i style={{ background: 'var(--db-yellow)' }} /> O‘tgan hafta</span>}
                    <span><i style={{ background: 'var(--db-red)' }} /> Umumiy o‘rtacha</span>
                  </div>
                  <svg className="db-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--db-grid)" strokeWidth="0.5" />
                    ))}
                    {/* Umumiy o'rtacha — solishtirish uchun tekis chiziq */}
                    <line x1="0" y1={Y(acc)} x2="100" y2={Y(acc)} stroke="var(--db-red)" strokeWidth="1.2" strokeDasharray="3 3" opacity=".75" />
                    {oldingiNuqta.length > 1 && (
                      <polyline points={oldingiPts} fill="none" stroke="var(--db-yellow)" strokeWidth="1.6"
                        strokeLinejoin="round" strokeLinecap="round" opacity=".8" />
                    )}
                    {nuqtalar.length > 1 && (
                      <polyline points={chartPts} fill="none" stroke="var(--db-green)" strokeWidth="2.2"
                        strokeLinejoin="round" strokeLinecap="round" />
                    )}
                    {nuqtalar.map((d) => (
                      <circle key={d.date} cx={d.x} cy={Y(d.accuracy as number)} r="1.6" fill="var(--db-green)">
                        <title>{d.date}: {d.accuracy}% ({d.correct}/{d.answered})</title>
                      </circle>
                    ))}
                  </svg>
                  {hafta.length > 1 && (
                    <div className="db-xaxis">
                      <span>{kunBelgi(hafta[0].date)}</span>
                      <span>{kunBelgi(hafta[Math.floor(hafta.length / 2)].date)}</span>
                      <span>{kunBelgi(hafta[hafta.length - 1].date)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="db-cstats">
                <div className="db-cstat"><b style={{ color: 'var(--db-green)' }}>{engYaxshi != null ? engYaxshi + '%' : '—'}</b><span>Eng yaxshi</span></div>
                <div className="db-cstat"><b style={{ color: 'var(--db-red)' }}>{engYomon != null ? engYomon + '%' : '—'}</b><span>Eng yomon</span></div>
                <div className="db-cstat"><b style={{ color: 'var(--db-yellow)' }}>{acc}%</b><span>O‘rtacha</span></div>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>Reyting</h3><div className="db-tabs"><button className="db-tab on">Umumiy</button><button className="db-tab">Do‘stlar</button></div></div>
              {reyting.length >= 3 && (
                <div className="db-podium">
                  {reyting.slice(0, 3).map((r, i) => (
                    <div className={'db-pod p' + (i + 1)} key={r.userId}>
                      <div className="db-pod-av">{(r.firstName || '?')[0].toUpperCase()}</div>
                      <b>{r.firstName}</b>
                      <span>{r.rank}-o‘rin · {r.accuracy}%</span>
                    </div>
                  ))}
                </div>
              )}
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
