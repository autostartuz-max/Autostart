import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api, setToken } from '../api';
import { mobilIlova } from '../native';
import '../auth.css';

/** 901234567 -> "90 123 45 67" */
const telKorinish = (r: string) =>
  [r.slice(0, 2), r.slice(2, 5), r.slice(5, 7), r.slice(7, 9)].filter(Boolean).join(' ');
const OXIRGI_TEL = 'yhq_oxirgi_tel';

export default function Login({ onAuthed, onHome }: { onAuthed: () => void; onHome?: () => void }) {
  const nav = useNavigate();
  // Ilovada faqat telefon: +998 o'zgarmas, foydalanuvchi 9 ta raqamni kiritadi
  const mobil = mobilIlova();
  const [raqam, setRaqam] = useState(() => {
    try { return localStorage.getItem(OXIRGI_TEL) || ''; } catch { return ''; }
  });
  // Telefon yoki pochta — bittasi yetadi
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr('');
    if (mobil && raqam.length !== 9) return setErr('Telefon raqamini to‘liq kiriting: 9 ta raqam');
    if (!mobil && !login.trim()) return setErr('Telefon yoki pochta manzilini kiriting');
    if (!password) return setErr('Parolni kiriting');
    setBusy(true);
    try {
      const r = await api.login(mobil ? '+998' + raqam : login.trim(), password);
      setToken(r.token);
      // Keyingi safar raqam tayyor tursin
      if (mobil) try { localStorage.setItem(OXIRGI_TEL, raqam); } catch { /* ignore */ }
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
        {onHome && !mobil && (
          <button type="button" className="auth-back" onClick={onHome}>
            <ChevronLeft size={17} /> Bosh sahifa
          </button>
        )}

        <h1 className="auth-title">Tizimga kirish</h1>

        {mobil ? (
          <>
            <label className="auth-lab">Telefon raqam</label>
            <div className="auth-tel">
              <span className="auth-tel-k">+998</span>
              <input
                className="auth-inp"
                type="tel"
                inputMode="numeric"
                name="username"
                autoComplete="tel-national"
                placeholder="90 123 45 67"
                value={telKorinish(raqam)}
                onChange={(e) => {
                  // Faqat raqamlar; +998 ni qayta yozib yuborsa ham olib tashlanadi
                  let d = e.target.value.replace(/\D/g, '');
                  if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
                  setRaqam(d.slice(0, 9));
                }}
              />
            </div>
          </>
        ) : (
          <>
            <label className="auth-lab">Telefon yoki pochta</label>
            <input
              className="auth-inp"
              type="text"
              name="login"
              autoComplete="username"
              placeholder="+998 90 123 45 67  yoki  ism@example.com"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </>
        )}

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
