import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Menu, ShieldCheck, ClipboardList, GraduationCap,
  CircleCheck, CircleX, PieChart, CircleHelp, FileText, MessageSquare,
  User, Phone, Mail, CalendarDays, CalendarCheck, Bookmark, Trash2, TriangleAlert,
} from 'lucide-react';
import { api, clearToken, ROLE_LABEL, type Role } from '../api';
import AppSidebar from '../components/AppSidebar';
import { mobilIlova } from '../native';
import '../dashboard.css';

const roleOf = (r?: string): Role => (r === 'owner' || r === 'admin' ? r : 'user');
const ROLE_IC: Record<Role, typeof ShieldCheck> = {
  owner: ShieldCheck, admin: ClipboardList, user: GraduationCap,
};
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
  // Akkauntni o'chirish (App Store/Play Market talabi) — ikki bosqichli tasdiq
  const [ochirish, setOchirish] = useState(false);
  const [parol, setParol] = useState('');
  const [ochirXato, setOchirXato] = useState('');
  const [ochirilmoqda, setOchirilmoqda] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  // Sahifa faqat KO'RISH uchun: alifbo, toifa va rolni foydalanuvchi
  // o'zgartira olmaydi — ularni Owner admin panelidan qo'yadi.
  async function akkauntniOchir() {
    setOchirXato('');
    setOchirilmoqda(true);
    try {
      await api.deleteMe(parol);
      clearToken();
      // Butun holat tozalansin — sahifani qaytadan ochamiz
      window.location.href = '/';
    } catch (e: any) {
      setOchirXato(e?.message || "Akkauntni o'chirib bo'lmadi");
      setOchirilmoqda(false);
    }
  }

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
                <div className="ud-card-h">Hisob ma’lumotlari</div>
                <div className="ud-grid">
                  {[
                    { Ic: User, k: 'Ism', v: u.firstName || '—' },
                    { Ic: Mail, k: 'Pochta', v: u.email || '—' },
                    { Ic: Phone, k: 'Telefon', v: u.phone || '—' },
                    { Ic: Bookmark, k: 'Toifa', v: u.category || '—' },
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

              {/* App Store va Play Market talabi: foydalanuvchi akkauntini
                  ilovaning o'zida o'chira olishi kerak. Saytda ko'rinmaydi —
                  u yerda hech narsa o'zgarmasligi kerak. */}
              {mobilIlova() && (
              <div className="ud-card ud-danger">
                <div className="ud-card-h"><TriangleAlert size={16} /> Akkauntni o‘chirish</div>
                <p className="ud-danger-p">
                  Akkaunt o‘chirilsa — natijalaringiz, xato qilgan savollaringiz va
                  saqlangan savollar <b>butunlay</b> yo‘qoladi. Buni qaytarib bo‘lmaydi.
                </p>

                {!ochirish ? (
                  <button className="ud-del" onClick={() => setOchirish(true)}>
                    <Trash2 size={16} /> Akkauntni o‘chirish
                  </button>
                ) : (
                  <div className="ud-del-form">
                    {u.hasPassword && (
                      <input
                        className="adm-inp"
                        type="password"
                        placeholder="Tasdiqlash uchun parolingiz"
                        value={parol}
                        onChange={(e) => setParol(e.target.value)}
                        autoFocus
                      />
                    )}
                    {ochirXato && <div className="adm-err">{ochirXato}</div>}
                    <div className="ud-del-row">
                      <button className="ud-del" disabled={ochirilmoqda} onClick={akkauntniOchir}>
                        {ochirilmoqda ? 'O‘chirilmoqda…' : 'Ha, butunlay o‘chirilsin'}
                      </button>
                      <button
                        className="adm-btn sec"
                        disabled={ochirilmoqda}
                        onClick={() => { setOchirish(false); setParol(''); setOchirXato(''); }}
                      >
                        Bekor qilish
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
