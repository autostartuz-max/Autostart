import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Menu, X } from 'lucide-react';
import { adminApi, hasAdmin, isOwner, clearAdmin, ROLE_LABEL, type Role } from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const ROLES: Role[] = ['owner', 'admin', 'user'];
const ROLE_IZOH: Record<Role, string> = {
  owner: 'to‘liq huquq: savollar va rollarni tayinlash',
  admin: 'faqat savollarni ko‘rish, qo‘shish va tahrirlash',
  user: 'oddiy talaba — admin bo‘limlariga kira olmaydi',
};

export default function AdminUserForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const tahrir = !!id; // id bo'lsa — tahrirlash, aks holda yangi
  const uid = Number(id);

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isOwner() || hasAdmin());
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!authed || !tahrir) return;
    setLoading(true);
    adminApi
      .user(uid)
      .then((r) => {
        setFirstName(r.user.firstName || '');
        setPhone(r.user.phone || '');
        setEmail(r.user.email || '');
        setRole((r.user.role === 'owner' || r.user.role === 'admin' ? r.user.role : 'user') as Role);
      })
      .catch((e: any) => {
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Owner uchun.');
        else setErr(e?.message || 'Ma’lumotni yuklab bo‘lmadi');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, uid]);

  const saqlash = async () => {
    setErr('');
    if (!firstName.trim()) return setErr('Ismni kiriting');
    if (!phone.trim() && !email.trim()) return setErr('Telefon yoki pochtadan kamida bittasini kiriting');
    if (!tahrir && password.length < 4) return setErr('Parol kamida 4 ta belgidan iborat bo‘lsin');
    if (tahrir && password && password.length < 4) return setErr('Yangi parol kamida 4 ta belgidan iborat bo‘lsin');

    setBusy(true);
    try {
      if (tahrir) {
        await adminApi.updateUser(uid, {
          firstName: firstName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          ...(password ? { password } : {}),
        });
        nav('/foydalanuvchilar/' + uid);
      } else {
        const r = await adminApi.createUser({
          firstName: firstName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          role,
        });
        nav('/foydalanuvchilar/' + r.user.id);
      }
    } catch (e: any) {
      setErr(e?.message || 'Saqlab bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const orqaga = () => nav(tahrir ? '/foydalanuvchilar/' + uid : '/foydalanuvchilar');

  return (
    <div className="db">
      <AppSidebar active="/foydalanuvchilar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={orqaga}><ChevronLeft size={18} /> Orqaga</button>
          <div className="qf-htitle">
            <b>{tahrir ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}</b>
            <span>Telefon yoki pochtadan kamida bittasi bo‘lishi shart</span>
          </div>
          {authed && (
            <div className="qf-top-actions">
              <button className="adm-btn sec" onClick={orqaga}><X size={16} /> Bekor qilish</button>
              <button className="adm-btn primary" onClick={saqlash} disabled={busy || loading}>
                {busy ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          )}
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : loading ? (
            <div className="adm-empty">Yuklanmoqda…</div>
          ) : (
            <div className="adm-form">
              <label className="adm-f-lab">Ism <span className="auth-req">*</span></label>
              <input className="adm-f-inp" value={firstName} placeholder="Foydalanuvchi ismi"
                onChange={(e) => setFirstName(e.target.value)} />

              <label className="adm-f-lab">Telefon</label>
              <input className="adm-f-inp" type="tel" inputMode="tel" value={phone} placeholder="+998 90 123 45 67"
                onChange={(e) => setPhone(e.target.value)} />

              <label className="adm-f-lab">Pochta</label>
              <input className="adm-f-inp" type="email" inputMode="email" value={email} placeholder="ism@example.com"
                onChange={(e) => setEmail(e.target.value)} />

              <label className="adm-f-lab">
                {tahrir ? 'Yangi parol' : 'Parol'} {!tahrir && <span className="auth-req">*</span>}
              </label>
              <input className="adm-f-inp" type="password" value={password}
                placeholder={tahrir ? 'Bo‘sh qoldirilsa parol o‘zgarmaydi' : 'Kamida 4 ta belgi'}
                onChange={(e) => setPassword(e.target.value)} />

              {!tahrir && (
                <>
                  <label className="adm-f-lab">Rol</label>
                  <select className="adm-f-inp" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    {ROLES.map((x) => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}
                  </select>
                  <div className="adm-f-hint">{ROLE_LABEL[role]} — {ROLE_IZOH[role]}</div>
                </>
              )}
              {tahrir && (
                <div className="adm-f-hint">Rolni foydalanuvchi sahifasidan o‘zgartirasiz.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
