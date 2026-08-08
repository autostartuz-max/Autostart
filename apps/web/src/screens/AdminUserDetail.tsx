import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Menu, ShieldCheck, ClipboardList, GraduationCap, Pencil, Trash2 } from 'lucide-react';
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
  const uid = Number(id);

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isOwner() || hasAdmin());
  const [data, setData] = useState<{ user: UserDetail; stats: AdminUserStats } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [meId, setMeId] = useState<number | null>(null);

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
  const hisobTuri =
    u?.phone && u?.email ? 'Telefon + pochta'
      : u?.phone ? 'Telefon + parol'
        : u?.email ? 'Pochta + parol'
          : mehmon ? 'Mehmon (qurilma)' : 'Telegram';

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
              <div className="adm-head">
                <div className="adm-head-l">
                  <span className={'adm-role-ic ' + r}><Ic size={20} /></span>
                  <h1 className="adm-title">{u.firstName}{ozi ? ' (siz)' : ''}</h1>
                  <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                </div>
                <div className="adm-head-btns">
                  <select
                    className="adm-role-sel"
                    value={r}
                    disabled={busy || ozi}
                    title={ozi ? 'O‘z rolingizni o‘zgartira olmaysiz' : 'Rolni o‘zgartirish'}
                    onChange={(e) => almashtir(e.target.value as Role)}
                  >
                    {ROLES.map((x) => (
                      <option key={x} value={x} disabled={mehmon && x !== 'user'}>
                        {ROLE_LABEL[x]}
                      </option>
                    ))}
                  </select>
                  <button className="adm-btn sec" onClick={() => nav('/foydalanuvchilar/' + u.id + '/tahrir')}>
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
                </div>
              </div>
              <div className="adm-d-sub">{ROLE_LABEL[r]} — {ROLE_IZOH[r]}</div>

              <div className="adm-d-sec">Faollik</div>
              <div className="adm-d-stats">
                <div className="adm-d-stat"><b>{s.answered}</b><span>Javob berilgan</span></div>
                <div className="adm-d-stat ok"><b>{s.correct}</b><span>To‘g‘ri</span></div>
                <div className="adm-d-stat no"><b>{s.wrong}</b><span>Xato</span></div>
                <div className="adm-d-stat"><b>{s.accuracy}%</b><span>Aniqlik</span></div>
                <div className="adm-d-stat"><b>{s.solvedQuestions}</b><span>Yechilgan savol</span></div>
                <div className="adm-d-stat"><b>{s.bookmarks}</b><span>Saqlangan</span></div>
                <div className="adm-d-stat"><b>{s.complaints}</b><span>Shikoyat</span></div>
              </div>

              <div className="adm-d-sec">Hisob</div>
              <dl className="adm-d-list adm-d-card">
                <div><dt>ID</dt><dd>{u.id}</dd></div>
                <div><dt>Ism</dt><dd>{u.firstName}</dd></div>
                <div><dt>Telefon</dt><dd>{u.phone || '—'}</dd></div>
                <div><dt>Pochta</dt><dd>{u.email || '—'}</dd></div>
                <div><dt>Hisob turi</dt><dd>{hisobTuri}</dd></div>
                <div><dt>Ro‘yxatdan o‘tgan</dt><dd>{sanaVaqt(u.createdAt)}</dd></div>
                <div><dt>Toifa</dt><dd>{u.category || '—'}</dd></div>
                <div><dt>Til</dt><dd>{TIL[u.lang] || u.lang || '—'}</dd></div>
                <div><dt>Alifbo</dt><dd>{ALIFBO[u.alphabet] || u.alphabet || '—'}</dd></div>
                <div><dt>Imtihon sanasi</dt><dd>{sana(u.examDate)}</dd></div>
                <div><dt>Birinchi faollik</dt><dd>{sanaVaqt(s.firstActive)}</dd></div>
                <div><dt>Oxirgi faollik</dt><dd>{sanaVaqt(s.lastActive)}</dd></div>
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
