import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminApi } from '../api';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      await adminApi.login(login.trim(), password);
      onLogin();
    } catch (e: any) {
      setErr(e.message || 'Login yoki parol xato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-ic"><ShieldCheck size={26} /></div>
      <h2>Admin kirish</h2>
      <p>Savollarni boshqarish uchun admin hisobingizga kiring.</p>
      <input
        className="adm-inp"
        placeholder="Login"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
      />
      <input
        className="adm-inp"
        type="password"
        placeholder="Parol"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {err && <div className="adm-err">{err}</div>}
      <button className="adm-btn primary" onClick={submit} disabled={busy}>
        {busy ? 'Kirilmoqda…' : 'Kirish'}
      </button>
    </div>
  );
}
