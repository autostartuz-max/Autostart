import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import '../auth.css';

export default function Register({ onAuthed }: { onAuthed: () => void }) {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr('');
    if (!name.trim()) return setErr('Ismingizni kiriting');
    if (password.length < 4) return setErr('Parol kamida 4 ta belgidan iborat bo‘lsin');
    if (password !== confirm) return setErr('Parollar mos kelmadi');
    setBusy(true);
    try {
      const r = await api.register(name, phone, password);
      setToken(r.token);
      onAuthed();
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e.message || 'Ro‘yxatdan o‘tishda xato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="auth-title">Ro‘yxatdan o‘tish</h1>

        <label className="auth-lab">Ism</label>
        <input className="auth-inp" name="name" autoComplete="name" placeholder="Ismingizni kiriting"
          value={name} onChange={(e) => setName(e.target.value)} />

        <label className="auth-lab">Telefon</label>
        <input className="auth-inp" type="tel" name="phone" autoComplete="username" inputMode="tel"
          placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label className="auth-lab">Yangi parol</label>
        <input className="auth-inp" type="password" name="new-password" autoComplete="new-password"
          placeholder="Parolingizni kiriting" value={password} onChange={(e) => setPassword(e.target.value)} />

        <label className="auth-lab">Parolni tasdiqlang</label>
        <input className="auth-inp" type="password" name="confirm-password" autoComplete="new-password"
          placeholder="Tasdiqlash parolini kiriting" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {err && <div className="auth-err">{err}</div>}

        <button className="auth-btn" type="submit" disabled={busy}>
          {busy ? 'Yuborilmoqda…' : 'Ro‘yxatdan o‘tish'}
        </button>

        <div className="auth-alt">
          Akkountingiz bormi?{' '}
          <span className="auth-link" onClick={() => nav('/kirish')}>Kirish</span>
        </div>
      </form>
    </div>
  );
}
