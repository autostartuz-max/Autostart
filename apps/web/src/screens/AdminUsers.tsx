import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, ShieldCheck, ClipboardList, GraduationCap, Plus, Pencil, Trash2, X } from 'lucide-react';
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
const mehmon = (u: AdminUserRow) => !!u.tgId?.startsWith('guest-');

/**
 * Foydalanuvchilar (faqat Owner): chap ustunda Owner va Adminlar (hammasi), o'ngda talabalar
 * (200 tadan, "Yana ko'rsatish"). Qidiruv yozilgan sari ishlaydi — ism, telefon (raqamlari), pochta.
 */
export default function AdminUsers() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isOwner() || hasAdmin());
  const [staff, setStaff] = useState<AdminUserRow[]>([]);
  const [list, setList] = useState<AdminUserRow[]>([]); // talabalar
  const [total, setTotal] = useState<number | null>(null); // talabalar jami (qidiruvga mos)
  const [meId, setMeId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [qYuklangan, setQYuklangan] = useState(''); // ro'yxat qaysi qidiruv bilan olingani
  const [loading, setLoading] = useState(false);
  const [yuklangan, setYuklangan] = useState(false); // birinchi javob keldi
  const [yanaYuklanmoqda, setYanaYuklanmoqda] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  // Tez yozilganda eski so'rov javobi yangisining ustiga yozilmasin
  const sorov = useRef(0);

  const load = (qq: string) => {
    const n = ++sorov.current;
    setLoading(true);
    setErr('');
    adminApi
      .users(qq)
      .then((r) => {
        if (n !== sorov.current) return;
        setStaff(r.staff || []);
        setList(r.users || []);
        setTotal(r.total ?? null);
        setQYuklangan(qq);
        setMeId(r.meId ?? null);
        setYuklangan(true);
      })
      .catch((e: any) => {
        if (n !== sorov.current) return;
        // Xatoni jimgina yutmaymiz — aks holda ro'yxat "bo'sh" bo'lib ko'rinadi
        if (e?.status === 401) {
          clearAdmin();
          setAuthed(false);
          setErr('Sessiya tugagan. Qaytadan kiring.');
        } else if (e?.status === 403) {
          setErr('Bu bo‘lim faqat Owner uchun.');
        } else {
          setErr(e?.message || 'Foydalanuvchilarni yuklab bo‘lmadi');
        }
      })
      .finally(() => { if (n === sorov.current) setLoading(false); });
  };

  // Qidiruv yozilgan sari (biroz kutib) — Enter bosish shart emas
  useEffect(() => {
    if (!authed) return;
    const qq = q.trim();
    const t = setTimeout(() => load(qq), yuklangan ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, q]);

  /** Keyingi 200 ta talaba (o'sha qidiruv bilan) */
  const yanaYukla = () => {
    const n = sorov.current;
    setYanaYuklanmoqda(true);
    setErr('');
    adminApi
      .users(qYuklangan, list.length)
      .then((r) => {
        if (n !== sorov.current) return; // shu orada qidiruv o'zgardi
        setList((l) => [...l, ...(r.users || []).filter((u) => !l.some((x) => x.id === u.id))]);
        if (r.total != null) setTotal(r.total);
      })
      .catch((e: any) => setErr(e?.message || 'Yuklab bo‘lmadi'))
      .finally(() => setYanaYuklanmoqda(false));
  };
  const qoldi = total != null ? Math.max(0, total - list.length) : 0;

  // Rolni o'zgartirish — faqat foydalanuvchi sahifasida (ro'yxatda emas)
  const ochir = async (u: AdminUserRow) => {
    const savol = `${u.firstName} o‘chirilsinmi?\n\nUning barcha javoblari, saqlangan savollari va shikoyatlari ham o‘chadi. Buni qaytarib bo‘lmaydi.`;
    if (!window.confirm(savol)) return;
    setBusyId(u.id);
    setErr('');
    try {
      await adminApi.deleteUser(u.id);
      if (roleOf(u.role) === 'user') {
        setList((l) => l.filter((x) => x.id !== u.id));
        setTotal((t) => (t != null ? t - 1 : t));
      } else {
        setStaff((l) => l.filter((x) => x.id !== u.id));
      }
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const qator = (u: AdminUserRow) => {
    const r = roleOf(u.role);
    const Ic = ROLE_IC[r];
    const ozi = meId != null && meId === u.id;
    return (
      <div className="adm-row adm-u-row" key={u.id} onClick={() => nav('/foydalanuvchilar/' + u.id)} title="Batafsil">
        <span className={'adm-role-ic ' + r}><Ic size={18} /></span>
        <div className="adm-u-main">
          <b>{u.firstName}{ozi ? ' (siz)' : ''}</b>
          <span>
            {u.phone || u.email || (mehmon(u) ? 'Mehmon (qurilma hisobi)' : 'Telegram')}
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
  };

  const qidirilgan = !!qYuklangan;

  return (
    <div className="db">
      <AppSidebar active="/foydalanuvchilar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search ish">
            <Search size={17} />
            <input
              placeholder="Ism, telefon yoki pochta bo‘yicha qidirish…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQ('')}
            />
            {q && (
              <button type="button" className="fy-tozala" onClick={() => setQ('')} title="Qidiruvni tozalash" aria-label="Qidiruvni tozalash">
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <h1 className="adm-title">
                    {qidirilgan ? 'Qidiruv natijasi' : 'Foydalanuvchilar'}
                    {yuklangan && ` (${staff.length + (total ?? list.length)})`}
                  </h1>
                  {loading && yuklangan && <span className="fy-qidirilmoqda">Qidirilmoqda…</span>}
                </div>
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

              {!yuklangan ? (
                loading && <div className="adm-empty">Yuklanmoqda…</div>
              ) : (
                <div className="fy-ustunlar">
                  {/* ---- Owner va Adminlar ---- */}
                  <section className="fy-ustun fy-xodimlar">
                    <div className="fy-ustun-sarlavha">
                      <ShieldCheck size={15} /> Owner va Adminlar <i>{staff.length}</i>
                    </div>
                    <div className="adm-list">
                      {staff.length === 0 && (
                        <div className="fy-bosh">{qidirilgan ? 'Qidiruvga mos xodim yo‘q.' : 'Xodim yo‘q.'}</div>
                      )}
                      {staff.map(qator)}
                    </div>
                  </section>

                  {/* ---- Talabalar ---- */}
                  <section className="fy-ustun">
                    <div className="fy-ustun-sarlavha">
                      <GraduationCap size={15} /> Talabalar <i>{total ?? list.length}</i>
                    </div>
                    <div className="adm-list">
                      {list.length === 0 && (
                        <div className="fy-bosh">{qidirilgan ? `«${qYuklangan}» bo‘yicha talaba topilmadi.` : 'Talaba yo‘q.'}</div>
                      )}
                      {list.map(qator)}
                    </div>
                    {qoldi > 0 && (
                      <div className="adm-yana">
                        <span>Ko‘rsatilgan: {list.length} / {total}</span>
                        <button className="adm-btn sec" disabled={yanaYuklanmoqda} onClick={yanaYukla}>
                          {yanaYuklanmoqda ? 'Yuklanmoqda…' : `Yana ${Math.min(200, qoldi)} ta ko‘rsatish`}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
