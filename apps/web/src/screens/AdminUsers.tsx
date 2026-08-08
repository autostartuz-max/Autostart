import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, ShieldCheck, ClipboardList, GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  adminApi, hasAdmin, isOwner, clearAdmin, ROLE_LABEL,
  type AdminUserRow, type Role,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const ROLES: Role[] = ['owner', 'admin', 'user'];

// Rolning nima berishini qisqacha tushuntirish (tasdiqlash oynasida ishlatiladi)
const ROLE_IZOH: Record<Role, string> = {
  owner: 'to‘liq huquq: savollar va rollarni tayinlash',
  admin: 'faqat savollarni ko‘rish, qo‘shish va tahrirlash',
  user: 'oddiy talaba — admin bo‘limlariga kira olmaydi',
};

const ROLE_IC: Record<Role, typeof ShieldCheck> = {
  owner: ShieldCheck,
  admin: ClipboardList,
  user: GraduationCap,
};

const sana = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return '—'; }
};
const roleOf = (r: string): Role => (r === 'owner' || r === 'admin' ? r : 'user');

export default function AdminUsers() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isOwner() || hasAdmin());
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Batafsil — alohida sahifa (/foydalanuvchilar/:id)
  const ochish = (id: number) => nav('/foydalanuvchilar/' + id);

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi
      .users(q)
      .then((r) => { setList(r.users || []); setMeId(r.meId ?? null); })
      .catch((e: any) => {
        // Xatoni jimgina yutmaymiz — aks holda ro'yxat "bo'sh" bo'lib ko'rinadi
        if (e?.status === 401) {
          clearAdmin();
          setAuthed(false);
          setList([]);
          setErr('Sessiya tugagan. Qaytadan kiring.');
        } else if (e?.status === 403) {
          setList([]);
          setErr('Bu bo‘lim faqat Owner uchun.');
        } else {
          setErr(e?.message || 'Foydalanuvchilarni yuklab bo‘lmadi');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Rolni o'zgartirish — faqat foydalanuvchi sahifasida (ro'yxatda emas)
  const ochir = async (u: AdminUserRow) => {
    const savol = `${u.firstName} o‘chirilsinmi?\n\nUning barcha javoblari, saqlangan savollari va shikoyatlari ham o‘chadi. Buni qaytarib bo‘lmaydi.`;
    if (!window.confirm(savol)) return;
    setBusyId(u.id);
    setErr('');
    try {
      await adminApi.deleteUser(u.id);
      setList((l) => l.filter((x) => x.id !== u.id));
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const mehmon = (u: AdminUserRow) => !!u.tgId?.startsWith('guest-');

  return (
    <div className="db">
      <AppSidebar active="/foydalanuvchilar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search">
            <Search size={17} />
            <input
              placeholder="Ism yoki telefon bo‘yicha qidirish…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <h1 className="adm-title">Foydalanuvchilar ({list.length})</h1>
                <div className="adm-head-btns">
                  <button className="adm-btn primary" onClick={() => nav('/foydalanuvchilar/yangi')}>
                    <Plus size={17} /> Yangi foydalanuvchi
                  </button>
                </div>
              </div>

              <div className="adm-roles-legend">
                {ROLES.map((r) => {
                  const Ic = ROLE_IC[r];
                  return (
                    <span key={r} className={'adm-rl ' + r}>
                      <Ic size={14} /> <b>{ROLE_LABEL[r]}</b> — {ROLE_IZOH[r]}
                    </span>
                  );
                })}
              </div>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && !err && list.length === 0 && (
                <div className="adm-empty">Foydalanuvchi topilmadi.</div>
              )}

              <div className="adm-list">
                {list.map((u) => {
                  const r = roleOf(u.role);
                  const Ic = ROLE_IC[r];
                  const ozi = meId != null && meId === u.id;
                  const g = mehmon(u);
                  return (
                    <div className="adm-row adm-u-row" key={u.id} onClick={() => ochish(u.id)} title="Batafsil">
                      <span className={'adm-role-ic ' + r}><Ic size={18} /></span>
                      <div className="adm-u-main">
                        <b>{u.firstName}{ozi ? ' (siz)' : ''}</b>
                        <span>
                          {u.phone || u.email || (g ? 'Mehmon (qurilma hisobi)' : 'Telegram')}
                          {' · '}{sana(u.createdAt)}
                        </span>
                      </div>
                      <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                      <button
                        className="adm-mini"
                        title="Tahrirlash"
                        onClick={(e) => { e.stopPropagation(); nav('/foydalanuvchilar/' + u.id + '?tahrir=1'); }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="adm-mini danger"
                        title={ozi ? 'O‘z hisobingizni o‘chira olmaysiz' : 'O‘chirish'}
                        disabled={ozi || busyId === u.id}
                        onClick={(e) => { e.stopPropagation(); ochir(u); }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
