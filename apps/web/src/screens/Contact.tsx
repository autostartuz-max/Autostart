import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Menu, Phone, MapPin, Send, Mail, Check, MessageCircle,
  Users, Wallet, CreditCard, Camera,
} from 'lucide-react';
import { api, hasToken } from '../api';
import AppSidebar from '../components/AppSidebar';
import {
  TELEFONLAR, MANZILLAR, AFZALLIKLAR, KARTALAR,
  FUTER_HAVOLALAR, FUTER_TAVSIF, IJTIMOIY,
} from '../contact';
import '../dashboard.css';

const KARTA_IC = { k: Users, s: Wallet, v: CreditCard };

export default function Contact() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const kirgan = hasToken();

  const [ism, setIsm] = useState('');
  const [tel, setTel] = useState('');
  const [mavzu, setMavzu] = useState('');
  const [matn, setMatn] = useState('');
  const [bad, setBad] = useState('');
  const [err, setErr] = useState('');
  const [yuborildi, setYuborildi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nusxa, setNusxa] = useState('');
  const inp = (f: string) => 'ct-inp' + (bad === f ? ' bad' : '');

  // Kompyuterda "tel:" havolasi begona dasturni (Skype, brauzer so'rovi) ochib
  // yuboradi — bu chalkash. Shuning uchun u yerda raqam buferga nusxalanadi.
  // Telefon/planshetda (pointer: coarse) esa odatdagidek qo'ng'iroqqa o'tadi.
  const telBos = (e: React.MouseEvent, raqam: string) => {
    let teginish = false;
    try { teginish = window.matchMedia('(pointer: coarse)').matches; } catch { /* ignore */ }
    if (teginish || !navigator.clipboard) return; // havola o'z ishini qilsin
    e.preventDefault();
    navigator.clipboard
      .writeText(raqam)
      .then(() => {
        setNusxa(raqam);
        setTimeout(() => setNusxa((r) => (r === raqam ? '' : r)), 1600);
      })
      .catch(() => { /* bufer ishlamasa — jim qolamiz */ });
  };

  const yubor = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr('');
    setBad('');
    if (!ism.trim()) { setBad('ism'); return setErr('Ismingizni kiriting'); }
    if (!tel.trim()) { setBad('tel'); return setErr('Telefon raqamingizni kiriting'); }
    if (matn.trim().length < 5) { setBad('matn'); return setErr('Xabaringizni yozing (kamida 5 ta belgi)'); }

    setBusy(true);
    try {
      await api.contact({ name: ism.trim(), phone: tel.trim(), subject: mavzu.trim(), text: matn.trim() });
      setYuborildi(true);
      setIsm(''); setTel(''); setMavzu(''); setMatn('');
    } catch (e: any) {
      setErr(e?.message || 'Xabar yuborilmadi. Keyinroq urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="db">
      {kirgan && <AppSidebar active="/aloqa" open={open} onClose={() => setOpen(false)} />}
      <div className="db-main">
        <header className="db-top">
          {kirgan && <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>}
          <button className="adm-back" onClick={() => nav(kirgan ? '/' : '/kirish')}>
            <ChevronLeft size={18} /> {kirgan ? 'Bosh sahifa' : 'Kirish'}
          </button>
        </header>

        <div className="db-content ct-page">
         <div className="ct-wrap">
          {/* Sarlavha banneri: matn chapda, avtomobil o'ngda — bitta yaxlit fon */}
          <section className="ct-hero">
            <img className="ct-hero-car" src="/car-banner.webp" alt="AUTOSTART avtomaktabi" loading="eager"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <div className="ct-hero-t">
              <h1>Biz bilan <span>bog‘laning</span></h1>
              <p className="ct-hero-lead">Savollaringiz bormi? Biz sizga yordam berishga tayyormiz!</p>
              <p>
                Quyidagi telefon raqamlar yoki manzil orqali biz bilan bog‘lanishingiz mumkin.
                Yoki pastdagi formani to‘ldirib, bizga xabar yuboring.
              </p>
            </div>
          </section>

          <div className="ct-panel">
            {/* Chap: aloqa ma'lumotlari */}
            <div className="ct-col ct-col-l">
              <div className="ct-h"><Phone size={18} /> To‘liq ma’lumot</div>

              {TELEFONLAR.map((t) => (
                <a className="ct-tel" key={t.raqam} href={'tel:' + t.raqam.replace(/[^\d+]/g, '')}
                  onClick={(e) => telBos(e, t.raqam)} title="Bosing: raqamdan nusxa olinadi">
                  <span className={'ct-tel-ic' + (t.whatsapp ? ' wa' : '')}>
                    {t.whatsapp ? <MessageCircle size={22} /> : <Phone size={22} />}
                  </span>
                  <span className="ct-tel-t">
                    <b>{t.raqam}</b>
                    <span className={nusxa === t.raqam ? 'ct-nusxa' : ''}>
                      {nusxa === t.raqam ? 'Nusxa olindi' : t.izoh}
                    </span>
                  </span>
                </a>
              ))}

              <div className="ct-manzil">
                <span className="ct-manzil-h"><MapPin size={18} /> Manzillar:</span>
                {MANZILLAR.map((m) => (
                  <span className="ct-manzil-r" key={m.shahar}>
                    <b>{m.shahar}</b> — {m.joy}
                  </span>
                ))}
              </div>
            </div>

            {/* O'ng: xabar yuborish */}
            <form className="ct-col" onSubmit={yubor}>
              <div className="ct-h"><Mail size={18} /> Bizga xabar yuboring</div>

              {yuborildi ? (
                <div className="ct-ok">
                  <Check size={38} />
                  <b>Xabaringiz yuborildi</b>
                  <span>Tez orada siz bilan bog‘lanamiz.</span>
                  <button type="button" className="adm-btn sec" onClick={() => setYuborildi(false)}>
                    Yana xabar yuborish
                  </button>
                </div>
              ) : (
                <>
                  <input className={inp('ism')} placeholder="Ismingiz" value={ism}
                    onChange={(e) => { setIsm(e.target.value); setBad(''); }} />
                  <input className={inp('tel')} type="tel" inputMode="tel" placeholder="Telefon raqamingiz" value={tel}
                    onChange={(e) => { setTel(e.target.value); setBad(''); }} />
                  <input className={inp('mavzu')} placeholder="Xabar mavzusi (ixtiyoriy)" value={mavzu}
                    onChange={(e) => { setMavzu(e.target.value); setBad(''); }} />
                  <textarea className={inp('matn') + ' ct-area'} rows={5} placeholder="Xabaringizni yozing…" value={matn}
                    onChange={(e) => { setMatn(e.target.value); setBad(''); }} />

                  {err && <div className="adm-err ct-err">{err}</div>}

                  <button className="ct-btn" type="submit" disabled={busy}>
                    {busy ? 'Yuborilmoqda…' : 'Xabarni yuborish'} <Send size={20} />
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Nima uchun */}
          <div className="ct-card ct-why">
            <div className="ct-why-h">Nima uchun «AUTOSTART» avtomaktabi?</div>
            <div className="ct-why-grid">
              {AFZALLIKLAR.map((a) => (
                <div className="ct-why-i" key={a}><Check size={18} /> <span>{a}</span></div>
              ))}
            </div>
          </div>

          {/* Uchta karta */}
          <div className="ct-info">
            {KARTALAR.map((k) => {
              const Ic = KARTA_IC[k.rang];
              return (
                <div className="ct-info-c" key={k.sarlavha}>
                  <span className={'ct-info-ic ' + k.rang}><Ic size={24} /></span>
                  <div>
                    <b>{k.sarlavha}:</b>
                    <span>{k.matn}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Futer */}
          <footer className="ct-footer">
            <div className="ct-f-grid">
              <div className="ct-f-brand">
                <div className="ct-f-logo">
                  <img src="/mark.png" alt="" />
                  <span><b>AUTO</b><i>START</i><small>Avtomaktab</small></span>
                </div>
                <p>{FUTER_TAVSIF}</p>
              </div>

              <div>
                <div className="ct-f-h">Tezkor havolalar</div>
                {FUTER_HAVOLALAR.map((h) => (
                  <button key={h.to} className="ct-f-link" onClick={() => nav(h.to)}>{h.t}</button>
                ))}
              </div>

              <div>
                <div className="ct-f-h">Biz bilan bog‘laning</div>
                {TELEFONLAR.map((t) => (
                  <a key={t.raqam} className="ct-f-row" href={'tel:' + t.raqam.replace(/[^\d+]/g, '')}
                    onClick={(e) => telBos(e, t.raqam)} title="Bosing: raqamdan nusxa olinadi">
                    {t.whatsapp ? <MessageCircle size={14} /> : <Phone size={14} />}
                    <span><b>{t.raqam}</b> {t.izoh}</span>
                  </a>
                ))}
                {MANZILLAR.map((m) => (
                  <div className="ct-f-row" key={m.shahar}>
                    <MapPin size={14} /> <span><b>{m.shahar}</b> {m.joy}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ct-f-bottom">
              <span>© {new Date().getFullYear()} AUTOSTART Avtomaktabi. Barcha huquqlar himoyalangan.</span>
              {(IJTIMOIY.telegram || IJTIMOIY.instagram) && (
                <div className="ct-f-soc">
                  {IJTIMOIY.telegram && (
                    <a href={IJTIMOIY.telegram} target="_blank" rel="noopener noreferrer" title="Telegram">
                      <Send size={16} />
                    </a>
                  )}
                  {IJTIMOIY.instagram && (
                    <a href={IJTIMOIY.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                      <Camera size={16} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </footer>
         </div>
        </div>
      </div>
    </div>
  );
}
