import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Menu, LogOut, ShieldCheck, ClipboardList, GraduationCap, ChevronRight,
  CircleCheck, CircleX, PieChart, CircleHelp, FileText, MessageSquare,
  User, Phone, Mail, CalendarDays, CalendarCheck, Bookmark, Type, SignpostBig,
} from 'lucide-react';
import { api, clearToken, forgetAdmin, ROLE_LABEL, type Role } from '../api';
import AppSidebar from '../components/AppSidebar';
import '../dashboard.css';

const roleOf = (r?: string): Role => (r === 'owner' || r === 'admin' ? r : 'user');
const ROLE_IC: Record<Role, typeof ShieldCheck> = {
  owner: ShieldCheck, admin: ClipboardList, user: GraduationCap,
};
const ALIFBO: Record<string, string> = { lat: 'Lotin', cyr: 'Kirill' };

const sana = (s?: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return '—'; }
};
const sanaVaqt = (s?: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('uz-UZ'); } catch { return '—'; }
};

export default function Profile() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  // Foydalanuvchi o'zi o'zgartira oladigan sozlamalar (rol emas — u faqat Owner qo'lida)
  const update = async (data: any) => {
    setBusy(true);
    try {
      const r = await api.updateMe(data);
      setMe((m: any) => (m ? { ...m, user: { ...m.user, ...r.user } } : m));
    } finally {
      setBusy(false);
    }
  };

  const u = me?.user;
  const s = me?.stats;
  const r = roleOf(u?.role);
  const Ic = ROLE_IC[r];

  return (
    <div className="db">
      <AppSidebar active="/profil" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Bosh sahifa</button>
        </header>

        <div className="db-content">
          {!u || !s ? (
            <div className="adm-empty">Yuklanmoqda…</div>
          ) : (
            <>
              <div className="adm-head ud-head">
                <div className="ud-id">
                  <span className={'ud-ava ' + r}><Ic size={26} /></span>
                  <div className="ud-id-t">
                    <div className="ud-nom">
                      <h1>{u.firstName || 'Foydalanuvchi'}</h1>
                      <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                    </div>
                    <div className="ud-izoh">Mening sahifam</div>
                  </div>
                </div>
                <div className="adm-head-btns">
                  <button
                    className="adm-btn danger"
                    onClick={() => {
                      if (!window.confirm('Hisobdan chiqasizmi?')) return;
                      clearToken();
                      forgetAdmin();
                      localStorage.removeItem('yhq_entered');
                      window.location.href = '/';
                    }}
                  >
                    <LogOut size={16} /> Chiqish
                  </button>
                </div>
              </div>

              <div className="adm-d-sec">Faollik</div>
              <div className="ud-stats">
                {[
                  { Ic: ClipboardList, c: 'v', n: s.answered, t: 'Javob berilgan' },
                  { Ic: CircleCheck, c: 'g', n: s.correct, t: 'To‘g‘ri' },
                  { Ic: CircleX, c: 'q', n: s.wrong, t: 'Xato' },
                  { Ic: PieChart, c: 'k', n: s.accuracy + '%', t: 'Aniqlik' },
                  { Ic: CircleHelp, c: 's', n: s.solvedQuestions, t: 'Yechilgan savol' },
                  { Ic: FileText, c: 'p', n: s.bookmarks, t: 'Saqlangan' },
                  { Ic: MessageSquare, c: 'f', n: s.totalQuestions, t: 'Jami savol' },
                ].map((x) => (
                  <div className="ud-stat" key={x.t}>
                    <span className={'ud-stat-ic ' + x.c}><x.Ic size={20} /></span>
                    <div><b>{x.n}</b><span>{x.t}</span></div>
                  </div>
                ))}
              </div>

              <div className="ud-card">
                <div className="ud-card-h">Sozlamalar</div>
                <div className="ud-grid">
                  <div className="ud-row">
                    <span className="ud-k"><Type size={16} /> Alifbo</span>
                    <div className="ud-vwrap">
                      <div className="ud-seg">
                        {['lat', 'cyr'].map((a) => (
                          <button
                            key={a}
                            type="button"
                            className={'ud-seg-b' + (u.alphabet === a ? ' on' : '')}
                            disabled={busy}
                            onClick={() => update({ alphabet: a })}
                          >
                            {ALIFBO[a]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ud-row">
                    <span className="ud-k"><Bookmark size={16} /> Toifa</span>
                    <div className="ud-vwrap">
                      <div className="ud-seg">
                        {['B', 'C', 'D'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={'ud-seg-b' + (u.category === c ? ' on' : '')}
                            disabled={busy}
                            onClick={() => update({ category: c })}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ud-card" style={{ marginTop: 16 }}>
                <div className="ud-card-h">Hisob ma’lumotlari</div>
                <div className="ud-grid">
                  {[
                    { Ic: User, k: 'Ism', v: u.firstName || '—' },
                    { Ic: Mail, k: 'Pochta', v: u.email || '—' },
                    { Ic: Phone, k: 'Telefon', v: u.phone || '—' },
                    { Ic: CalendarDays, k: 'Ro‘yxatdan o‘tgan', v: sanaVaqt(u.createdAt) },
                    { Ic: CalendarCheck, k: 'Imtihon sanasi', v: sana(u.examDate) },
                    { Ic: FileText, k: 'Saqlangan savollar', v: (s.bookmarks ?? 0) + ' ta' },
                  ].map((x) => (
                    <div className="ud-row" key={x.k}>
                      <span className="ud-k"><x.Ic size={16} /> {x.k}</span>
                      <span className="ud-v">{x.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="pf-link" onClick={() => nav('/belgilar')}>
                <span><SignpostBig size={17} /> Yo‘l belgilari</span>
                <ChevronRight size={17} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
