import { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api.login(login, password);
      setToken(r.token);
      onLogin();
    } catch (e: any) {
      setErr(e.message || 'Kirish xatosi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <h1>Autostart Admin</h1>
        <p>Boshqaruv paneliga kirish</p>
        <div className="field">
          <label>Login</label>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} />
        </div>
        <div className="field">
          <label>Parol</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Kirilyapti…' : 'Kirish'}
        </button>
        {err && <div className="err">{err}</div>}
        <p style={{ marginTop: 16 }}>
          Namuna: <b>admin</b> / <b>admin123</b>
        </p>
      </form>
    </div>
  );
}
