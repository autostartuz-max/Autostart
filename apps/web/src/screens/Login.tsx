import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import '../auth.css';

export default function Login({ onAuthed }: { onAuthed: () => void }) {
  const nav = useNavigate();
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api.login(phone, password);
      setToken(r.token);
      onAuthed();
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e.message || 'Telefon yoki parol xato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="auth-title">Tizimga kirish</h1>

        <label className="auth-lab">Telefon raqam</label>
        <input
          className="auth-inp"
          type="tel"
          name="phone"
          autoComplete="username"
          inputMode="tel"
          placeholder="+998 90 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <label className="auth-lab">Parol</label>
        <input
          className="auth-inp"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Parolingizni kiriting"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <div className="auth-err">{err}</div>}

        <button className="auth-btn" type="submit" disabled={busy}>
          {busy ? 'Kirilmoqda…' : 'Kirish'}
        </button>

        <div className="auth-forgot" title="Tez orada">Parolni unutdingizmi?</div>

        <div className="auth-alt">
          Siz hali ro‘yxatdan o‘tmadingizmi?{' '}
          <span className="auth-link" onClick={() => nav('/royxat')}>Ro‘yxatdan o‘tish</span>
        </div>
      </form>
    </div>
  );
}
