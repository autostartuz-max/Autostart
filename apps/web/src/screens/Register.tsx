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
  const [bad, setBad] = useState(''); // qaysi qator xato — o'sha ajratib ko'rsatiladi
  const [busy, setBusy] = useState(false);
  const inpClass = (f: string) => 'auth-inp' + (bad === f ? ' bad' : '');

  // Telefon: 9 ta raqam (90XXXXXXX) yoki 998 bilan 12 ta — serverdagi normPhone bilan bir xil
  const telefonToOgri = (p: string) => {
    const d = p.replace(/\D/g, '');
    return d.length === 9 || (d.length === 12 && d.startsWith('998'));
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr('');
    setBad('');

    // Hamma qator MAJBURIY — bo'sh qoldirilganini aniq aytamiz
    if (!name.trim()) { setBad('name'); return setErr('Ismingizni kiriting'); }
    if (!phone.replace(/\D/g, '')) { setBad('phone'); return setErr('Telefon raqamini kiriting'); }
    if (!telefonToOgri(phone)) { setBad('phone'); return setErr('Telefon raqami noto‘g‘ri. +998 va 9 ta raqam kiriting'); }
    if (!password) { setBad('password'); return setErr('Parol kiriting'); }
    if (password.length < 4) { setBad('password'); return setErr('Parol kamida 4 ta belgidan iborat bo‘lsin'); }
    if (!confirm) { setBad('confirm'); return setErr('Parolni tasdiqlang'); }
    if (password !== confirm) { setBad('confirm'); return setErr('Parollar mos kelmadi'); }

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

        <label className="auth-lab">Ism <span className="auth-req">*</span></label>
        <input className={inpClass('name')} name="name" autoComplete="name" required placeholder="Ismingizni kiriting"
          value={name} onChange={(e) => { setName(e.target.value); setBad(''); }} />

        <label className="auth-lab">Telefon <span className="auth-req">*</span></label>
        <input className={inpClass('phone')} type="tel" name="phone" autoComplete="username" inputMode="tel" required
          placeholder="+998 90 123 45 67" value={phone} onChange={(e) => { setPhone(e.target.value); setBad(''); }} />

        <label className="auth-lab">Yangi parol <span className="auth-req">*</span></label>
        <input className={inpClass('password')} type="password" name="new-password" autoComplete="new-password" required
          placeholder="Parolingizni kiriting" value={password} onChange={(e) => { setPassword(e.target.value); setBad(''); }} />

        <label className="auth-lab">Parolni tasdiqlang <span className="auth-req">*</span></label>
        <input className={inpClass('confirm')} type="password" name="confirm-password" autoComplete="new-password" required
          placeholder="Tasdiqlash parolini kiriting" value={confirm} onChange={(e) => { setConfirm(e.target.value); setBad(''); }} />

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
