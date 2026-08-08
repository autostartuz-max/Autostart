import { useEffect, useState } from 'react';
import { Menu, Search, ShieldCheck, GraduationCap } from 'lucide-react';
import { adminApi, hasAdmin, isAdminRole, clearAdmin, type AdminUserRow } from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const sana = (s: string) => {
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return ''; }
};

export default function AdminUsers() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isAdminRole() || hasAdmin());
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi
      .users(q)
      .then((r) => { setList(r.users || []); setMeId(r.meId ?? null); })
      .catch((e: any) => {
        // Xatoni jimgina yutmaymiz — aks holda ro'yxat "bo'sh" bo'lib ko'rinadi
        if (e?.status === 401 || e?.status === 403) {
          clearAdmin();
          setAuthed(false);
          setList([]);
          setErr('Ruxsat yo‘q yoki sessiya tugagan. Qaytadan kiring.');
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

  const almashtir = async (u: AdminUserRow) => {
    const yangi = u.role === 'admin' ? 'student' : 'admin';
    const savol =
      yangi === 'admin'
        ? `${u.firstName} admin qilinsinmi? U barcha savollarni tahrirlashi va rollarni o‘zgartirishi mumkin bo‘ladi.`
        : `${u.firstName} adminlikdan olinsinmi?`;
    if (!window.confirm(savol)) return;
    setBusyId(u.id);
    setErr('');
    try {
      const r = await adminApi.setUserRole(u.id, yangi);
      setList((l) => l.map((x) => (x.id === u.id ? { ...x, role: r.user.role } : x)));
    } catch (e: any) {
      setErr(e?.message || 'Rolni o‘zgartirib bo‘lmadi');
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
              </div>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && !err && list.length === 0 && (
                <div className="adm-empty">Foydalanuvchi topilmadi.</div>
              )}

              <div className="adm-list">
                {list.map((u) => {
                  const admin = u.role === 'admin';
                  const ozi = meId != null && meId === u.id;
                  return (
                    <div className="adm-row" key={u.id}>
                      <span className={'adm-role-ic' + (admin ? ' on' : '')}>
                        {admin ? <ShieldCheck size={18} /> : <GraduationCap size={18} />}
                      </span>
                      <div className="adm-u-main">
                        <b>{u.firstName}{ozi ? ' (siz)' : ''}</b>
                        <span>
                          {u.phone || (mehmon(u) ? 'Mehmon (qurilma hisobi)' : 'Telegram')}
                          {' · '}{sana(u.createdAt)}
                        </span>
                      </div>
                      <span className={'adm-badge' + (admin ? ' admin' : '')}>
                        {admin ? 'Admin' : 'O‘quvchi'}
                      </span>
                      <button
                        className={'adm-btn ' + (admin ? 'danger' : 'sec')}
                        disabled={busyId === u.id || ozi || (!admin && mehmon(u))}
                        title={
                          ozi
                            ? 'O‘z rolingizni o‘zgartira olmaysiz'
                            : !admin && mehmon(u)
                              ? 'Mehmon hisobini admin qilib bo‘lmaydi'
                              : ''
                        }
                        onClick={() => almashtir(u)}
                      >
                        {busyId === u.id ? '…' : admin ? 'Adminlikdan olish' : 'Admin qilish'}
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
