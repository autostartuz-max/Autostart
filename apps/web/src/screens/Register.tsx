import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import '../auth.css';

export default function Register({ onAuthed }: { onAuthed: () => void }) {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [email, setEmail] = useState('');
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
  // Maydonda faqat "+998" tursa — bu bo'sh hisoblanadi
  const telefonBor = phone.replace(/\D/g, '').replace(/^998$/, '').length > 0;
  const pochtaToOgri = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr('');
    setBad('');

    if (!name.trim()) { setBad('name'); return setErr('Ismingizni kiriting'); }

    // Telefon YOKI pochta — kamida bittasi
    const pochtaBor = !!email.trim();
    if (!telefonBor && !pochtaBor) {
      setBad('phone');
      return setErr('Telefon raqami yoki pochta manzilini kiriting');
    }
    if (telefonBor && !telefonToOgri(phone)) {
      setBad('phone');
      return setErr('Telefon raqami noto‘g‘ri. +998 va 9 ta raqam kiriting');
    }
    if (pochtaBor && !pochtaToOgri(email)) {
      setBad('email');
      return setErr('Pochta manzili noto‘g‘ri. Namuna: ism@example.com');
    }

    if (!password) { setBad('password'); return setErr('Parol kiriting'); }
    if (password.length < 4) { setBad('password'); return setErr('Parol kamida 4 ta belgidan iborat bo‘lsin'); }
    if (!confirm) { setBad('confirm'); return setErr('Parolni tasdiqlang'); }
    if (password !== confirm) { setBad('confirm'); return setErr('Parollar mos kelmadi'); }

    setBusy(true);
    try {
      const r = await api.register(name, telefonBor ? phone : '', password, email.trim());
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
        <input className={inpClass('phone')} type="tel" name="phone" autoComplete="tel" inputMode="tel"
          placeholder="+998 90 123 45 67" value={phone} onChange={(e) => { setPhone(e.target.value); setBad(''); }} />

        <div className="auth-or">yoki</div>

        <label className="auth-lab">Pochta <span className="auth-req">*</span></label>
        <input className={inpClass('email')} type="email" name="email" autoComplete="email" inputMode="email"
          placeholder="ism@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setBad(''); }} />
        <div className="auth-hint">Telefon yoki pochta — kamida bittasi to‘ldirilishi shart.</div>

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
