import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Menu, ShieldCheck, ClipboardList, GraduationCap, Pencil, Trash2, KeyRound,
  CircleCheck, CircleX, PieChart, CircleHelp, FileText, MessageSquare, X, Check,
  User, Phone, Mail, Lock, CalendarDays, CalendarCheck, Bookmark, Globe, Type, TrendingUp, Clock,
} from 'lucide-react';
import {
  adminApi, hasAdmin, isOwner, clearAdmin, ROLE_LABEL,
  type AdminUserDetail as UserDetail, type AdminUserStats, type Role,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const ROLES: Role[] = ['owner', 'admin', 'user'];
const ROLE_IZOH: Record<Role, string> = {
  owner: 'to‘liq huquq: savollar va rollarni tayinlash',
  admin: 'faqat savollarni ko‘rish, qo‘shish va tahrirlash',
  user: 'oddiy talaba — admin bo‘limlariga kira olmaydi',
};
const ROLE_IC: Record<Role, typeof ShieldCheck> = {
  owner: ShieldCheck, admin: ClipboardList, user: GraduationCap,
};
const TIL: Record<string, string> = { uz: 'O‘zbek', ru: 'Rus' };
const ALIFBO: Record<string, string> = { lat: 'Lotin', cyr: 'Kirill' };

const sana = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return '—'; }
};
const sanaVaqt = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('uz-UZ'); } catch { return '—'; }
};
const roleOf = (r: string): Role => (r === 'owner' || r === 'admin' ? r : 'user');

export default function AdminUserDetailScreen() {
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const uid = Number(id);

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isOwner() || hasAdmin());
  const [data, setData] = useState<{ user: UserDetail; stats: AdminUserStats } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [meId, setMeId] = useState<number | null>(null);
  const [rolOchiq, setRolOchiq] = useState(false);

  // Inline tahrirlash — boshqa sahifaga o'tmasdan, shu yerning o'zida
  const [tahrir, setTahrir] = useState(false);
  const [fIsm, setFIsm] = useState('');
  const [fTel, setFTel] = useState('');
  const [fPochta, setFPochta] = useState('');
  const [fParol, setFParol] = useState('');

  const tahrirBoshla = () => {
    if (!data) return;
    setFIsm(data.user.firstName || '');
    setFTel(data.user.phone || '');
    setFPochta(data.user.email || '');
    setFParol('');
    setErr('');
    setTahrir(true);
  };
  const tahrirBekor = () => { setTahrir(false); setFParol(''); setErr(''); };

  const tahrirSaqla = async () => {
    if (!data) return;
    setErr('');
    if (!fIsm.trim()) return setErr('Ismni kiriting');
    if (!fTel.trim() && !fPochta.trim()) return setErr('Telefon yoki pochtadan kamida bittasini kiriting');
    if (fParol && fParol.length < 4) return setErr('Yangi parol kamida 4 ta belgidan iborat bo‘lsin');

    setBusy(true);
    try {
      const r = await adminApi.updateUser(data.user.id, {
        firstName: fIsm.trim(),
        phone: fTel.trim(),
        email: fPochta.trim(),
        ...(fParol ? { password: fParol } : {}),
      });
      setData((d) => (d ? { ...d, user: { ...d.user, ...r.user } } : d));
      setTahrir(false);
      setFParol('');
    } catch (e: any) {
      setErr(e?.message || 'Saqlab bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const load = () => {
    if (!Number.isInteger(uid)) { setErr('ID noto‘g‘ri'); return; }
    setLoading(true);
    setErr('');
    adminApi
      .user(uid)
      .then(setData)
      .catch((e: any) => {
        if (e?.status === 401) {
          clearAdmin();
          setAuthed(false);
          setErr('Sessiya tugagan. Qaytadan kiring.');
        } else if (e?.status === 403) {
          setErr('Bu bo‘lim faqat Owner uchun.');
        } else {
          setErr(e?.message || 'Ma’lumotni yuklab bo‘lmadi');
        }
      })
      .finally(() => setLoading(false));
    // O'z ID'imizni bilish uchun (o'z rolini o'zgartirishni to'sish)
    adminApi.users('').then((r) => setMeId(r.meId ?? null)).catch(() => {});
  };

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, uid]);

  // Ro'yxatdagi qalam tugmasi ?tahrir=1 bilan keladi — darhol tahrirlash rejimi
  useEffect(() => {
    if (data && sp.get('tahrir') === '1' && !tahrir) tahrirBoshla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const almashtir = async (yangi: Role) => {
    if (!data) return;
    const eski = roleOf(data.user.role);
    if (yangi === eski) return;
    const savol = `${data.user.firstName} uchun rol "${ROLE_LABEL[yangi]}" qilinsinmi?\n\n${ROLE_LABEL[yangi]} — ${ROLE_IZOH[yangi]}.`;
    if (!window.confirm(savol)) return;
    setBusy(true);
    setErr('');
    try {
      const r = await adminApi.setUserRole(data.user.id, yangi);
      setData((d) => (d ? { ...d, user: { ...d.user, role: r.user.role } } : d));
    } catch (e: any) {
      setErr(e?.message || 'Rolni o‘zgartirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const ochir = async () => {
    if (!data) return;
    const savol = `${data.user.firstName} o‘chirilsinmi?\n\nUning barcha javoblari, saqlangan savollari va shikoyatlari ham o‘chadi. Buni qaytarib bo‘lmaydi.`;
    if (!window.confirm(savol)) return;
    setBusy(true);
    setErr('');
    try {
      await adminApi.deleteUser(data.user.id);
      nav('/foydalanuvchilar');
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
      setBusy(false);
    }
  };

  const u = data?.user;
  const s = data?.stats;
  const r = u ? roleOf(u.role) : 'user';
  const Ic = ROLE_IC[r];
  const ozi = meId != null && u != null && meId === u.id;
  const mehmon = !!u?.tgId?.startsWith('guest-');

  return (
    <div className="db">
      <AppSidebar active="/foydalanuvchilar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/foydalanuvchilar')}>
            <ChevronLeft size={18} /> Foydalanuvchilar
          </button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : loading ? (
            <div className="adm-empty">Yuklanmoqda…</div>
          ) : !u || !s ? (
            !err && <div className="adm-empty">Foydalanuvchi topilmadi.</div>
          ) : (
            <>
              <div className="adm-head ud-head">
                <div className="ud-id">
                  <span className={'ud-ava ' + r}><Ic size={26} /></span>
                  <div className="ud-id-t">
                    <div className="ud-nom">
                      <h1>{u.firstName}{ozi ? ' (siz)' : ''}</h1>
                      <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                    </div>
                    <div className="ud-izoh">{ROLE_LABEL[r]} — {ROLE_IZOH[r]}</div>
                  </div>
                </div>
                <div className="adm-head-btns">
                  <div className="adm-rolebox">
                    <button
                      className="adm-btn sec"
                      disabled={busy || ozi}
                      title={ozi ? 'O‘z rolingizni o‘zgartira olmaysiz' : 'Rolni o‘zgartirish'}
                      onClick={() => setRolOchiq((v) => !v)}
                    >
                      <ShieldCheck size={16} /> Rolni o‘zgartirish
                    </button>
                    {rolOchiq && (
                      <>
                        <div className="adm-rolebg" onClick={() => setRolOchiq(false)} />
                        <div className="adm-rolemenu">
                          {ROLES.map((x) => (
                            <button
                              key={x}
                              className={'adm-rolemi' + (x === r ? ' on' : '')}
                              disabled={mehmon && x !== 'user'}
                              onClick={() => { setRolOchiq(false); almashtir(x); }}
                            >
                              <b>{ROLE_LABEL[x]}</b>
                              <span>{ROLE_IZOH[x]}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {tahrir ? (
                    <>
                      <button className="adm-btn sec" onClick={tahrirBekor} disabled={busy}>
                        <X size={16} /> Bekor qilish
                      </button>
                      <button className="adm-btn primary" onClick={tahrirSaqla} disabled={busy}>
                        <Check size={16} /> {busy ? 'Saqlanmoqda…' : 'Saqlash'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="adm-btn sec" onClick={tahrirBoshla}>
                        <Pencil size={16} /> Tahrirlash
                      </button>
                      <button
                        className="adm-btn danger"
                        disabled={busy || ozi}
                        title={ozi ? 'O‘z hisobingizni o‘chira olmaysiz' : ''}
                        onClick={ochir}
                      >
                        <Trash2 size={16} /> O‘chirish
                      </button>
                    </>
                  )}
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
                  { Ic: MessageSquare, c: 'f', n: s.complaints, t: 'Shikoyat' },
                ].map((x) => (
                  <div className="ud-stat" key={x.t}>
                    <span className={'ud-stat-ic ' + x.c}><x.Ic size={20} /></span>
                    <div>
                      <b>{x.n}</b>
                      <span>{x.t}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ud-card">
                <div className="ud-card-h">Hisob ma’lumotlari</div>
                <div className="ud-grid">
                  {[
                    { Ic: User, k: 'Ism', v: u.firstName, edit: 'ism' },
                    { Ic: Phone, k: 'Telefon', v: u.phone || '—', link: u.phone ? 'tel:' + u.phone : '', edit: 'tel' },
                    { Ic: Mail, k: 'Pochta', v: u.email || '—', link: u.email ? 'mailto:' + u.email : '', edit: 'pochta' },
                    { Ic: Lock, k: 'Parol', parol: true, edit: 'parol' },
                    { Ic: CalendarDays, k: 'Ro‘yxatdan o‘tgan', v: sanaVaqt(u.createdAt) },
                    { Ic: Bookmark, k: 'Toifa', v: u.category || '—' },
                    { Ic: Globe, k: 'Til', v: TIL[u.lang] || u.lang || '—' },
                    { Ic: Type, k: 'Alifbo', v: ALIFBO[u.alphabet] || u.alphabet || '—' },
                    { Ic: CalendarCheck, k: 'Imtihon sanasi', v: sana(u.examDate) },
                    { Ic: TrendingUp, k: 'Birinchi faollik', v: sanaVaqt(s.firstActive) },
                    { Ic: Clock, k: 'Oxirgi faollik', v: sanaVaqt(s.lastActive) },
                  ].map((x: any) => (
                    <div className={'ud-row' + (tahrir && x.edit ? ' ud-editing' : '')} key={x.k}>
                      <span className="ud-k"><x.Ic size={16} /> {x.k}</span>

                      {tahrir && x.edit === 'ism' && (
                        <input className="ud-inp" value={fIsm} placeholder="Ism"
                          onChange={(e) => setFIsm(e.target.value)} />
                      )}
                      {tahrir && x.edit === 'tel' && (
                        <input className="ud-inp" type="tel" inputMode="tel" value={fTel} placeholder="+998 90 123 45 67"
                          onChange={(e) => setFTel(e.target.value)} />
                      )}
                      {tahrir && x.edit === 'pochta' && (
                        <input className="ud-inp" type="email" inputMode="email" value={fPochta} placeholder="ism@example.com"
                          onChange={(e) => setFPochta(e.target.value)} />
                      )}
                      {tahrir && x.edit === 'parol' && (
                        <input className="ud-inp" type="password" value={fParol}
                          placeholder="Bo‘sh qoldirilsa parol o‘zgarmaydi"
                          onChange={(e) => setFParol(e.target.value)} />
                      )}

                      {!tahrir && (
                        x.parol ? (
                          <span className="ud-v ud-parol">
                            <i title="Parol bir tomonlama shifrlangan — ochib bo‘lmaydi">••••••••</i>
                            <button className="adm-mini" onClick={tahrirBoshla}>
                              <KeyRound size={13} /> Almashtirish
                            </button>
                          </span>
                        ) : x.link ? (
                          <a className="ud-v lnk" href={x.link}>{x.v}</a>
                        ) : (
                          <span className="ud-v">{x.v}</span>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="adm-f-hint">
                Parol bazada bir tomonlama shifrlangan holda saqlanadi va ochib bo‘lmaydi —
                bu baza o‘g‘irlansa ham parollar oshkor bo‘lmasligi uchun. Foydalanuvchi parolini
                unutgan bo‘lsa, «Almashtirish» orqali yangi parol qo‘yib bering.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
