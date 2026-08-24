import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Menu, Phone, MapPin, Send, Mail, Check, MessageCircle,
  Users, Wallet, CreditCard, Car,
} from 'lucide-react';
import { api, hasToken } from '../api';
import AppSidebar from '../components/AppSidebar';
import { TELEFONLAR, MANZIL, AFZALLIKLAR, KARTALAR, CTA } from '../contact';
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
  const inp = (f: string) => 'ct-inp' + (bad === f ? ' bad' : '');

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

        <div className="db-content">
          <div className="ct-hero">
            <div className="ct-hero-t">
              <h1>Biz bilan <span>bog‘laning</span></h1>
              <p className="ct-hero-lead">Savollaringiz bormi? Biz sizga yordam berishga tayyormiz!</p>
              <p>
                Quyidagi telefon raqamlar yoki manzil orqali biz bilan bog‘lanishingiz mumkin.
                Yoki pastdagi formani to‘ldirib, bizga xabar yuboring.
              </p>
            </div>
            {/* 3D tasvir — matn HTML bo'lib qoladi, shuning uchun tarjima va
                kichik ekranda ham to'g'ri ko'rinadi */}
            <img
              className="ct-hero-img"
              src="/aloqa-3d.webp"
              alt=""
              loading="lazy"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          </div>

          <div className="ct-grid">
            {/* Chap: aloqa ma'lumotlari */}
            <div className="ct-card">
              <div className="ct-h"><Phone size={15} /> To‘liq ma’lumot</div>

              {TELEFONLAR.map((t) => (
                <a className="ct-tel" key={t.raqam} href={'tel:' + t.raqam.replace(/[^\d+]/g, '')}>
                  <span className={'ct-tel-ic' + (t.whatsapp ? ' wa' : '')}>
                    {t.whatsapp ? <MessageCircle size={17} /> : <Phone size={17} />}
                  </span>
                  <span className="ct-tel-t">
                    <b>{t.raqam}</b>
                    <span>{t.izoh}</span>
                  </span>
                </a>
              ))}

              <div className="ct-manzil">
                <span className="ct-manzil-h"><MapPin size={15} /> Manzil:</span>
                <span>{MANZIL}</span>
              </div>
            </div>

            {/* O'ng: xabar yuborish */}
            <form className="ct-card" onSubmit={yubor}>
              <div className="ct-h"><Mail size={15} /> Bizga xabar yuboring</div>

              {yuborildi ? (
                <div className="ct-ok">
                  <Check size={30} />
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
                    {busy ? 'Yuborilmoqda…' : 'Xabarni yuborish'} <Send size={16} />
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
                <div className="ct-why-i" key={a}><Check size={16} /> <span>{a}</span></div>
              ))}
            </div>
          </div>

          {/* Uchta karta */}
          <div className="ct-info">
            {KARTALAR.map((k) => {
              const Ic = KARTA_IC[k.rang];
              return (
                <div className="ct-info-c" key={k.sarlavha}>
                  <span className={'ct-info-ic ' + k.rang}><Ic size={20} /></span>
                  <div>
                    <b>{k.sarlavha}:</b>
                    <span>{k.matn}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chaqiruv */}
          <div className="ct-cta">
            <span className="ct-cta-ic"><Car size={30} /></span>
            <div>
              <span>{CTA.yuqori}</span>
              <b>{CTA.past}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
