import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings, Swords, Radio, Trophy, Users, ClipboardList, Zap, Target, X, UserRound, Share2, KeyRound } from 'lucide-react';
import { oktagon, type OktagonDaraja } from '../../api';
import PastkiOyna from '../../components/PastkiOyna';
import { MEDAL } from './umumiy';
import '../../ilova-ekran.css';
import '../../oktagon.css';

/**
 * Oktagon — asosiy ekran (faqat ilovada). Ketma-ketlik namunadagidek:
 * "Qidirishni boshlash" → qoidalar (4 soniya) → raqib qidirish (radar) →
 * jang sahifasi (/oktagon/jang/:id: "vs", savollar, natija).
 */

/** Qoidalar oynasi. kutish > 0 — tugma shuncha soniyadan keyin ochiladi */
function Qoidalar({ kutish, tugma, onDavom, onClose }: { kutish: number; tugma: string; onDavom: () => void; onClose: () => void }) {
  const [qoldi, setQoldi] = useState(kutish);
  useEffect(() => {
    if (qoldi <= 0) return;
    const t = setTimeout(() => setQoldi((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [qoldi]);

  return (
    <PastkiOyna title="Oktagon qoidalari" onClose={onClose}>
      <div style={{ height: 18 }} />
      <div className="ok-rule yashil">
        <span className="ok-rule-ic"><Swords size={20} /></span>
        <span>Onlayn o‘yinchi qidiriladi va u bilan bellashasiz. 15 soniyada topilmasa — bot bilan o‘ynaysiz. Savollar ikki tomonga ham bir xil bo‘ladi.</span>
      </div>
      <div className="ok-rule sariq">
        <span className="ok-rule-ic"><Zap size={20} /></span>
        <span>Ko‘proq to‘g‘ri javob bersangiz, ball olasiz: g‘alaba +3, durang +1. Yutqazsangiz −1. O‘yinni tugatmasdan chiqsangiz −2.</span>
      </div>
      <div className="ok-rule olov">
        <span className="ok-rule-ic"><Target size={20} /></span>
        <span>Ballar darajangizni oshiradi: Kumush, Oltin va Brilliant. Reytingda sizni tepaga olib chiqadi.</span>
      </div>
      <div className="ok-hr" />
      <button className={'ok-btn ' + (qoldi > 0 ? 'kut' : 'yashil')} disabled={qoldi > 0} onClick={onDavom}>
        {qoldi > 0 ? `${qoldi} soniya kuting` : tugma}
      </button>
    </PastkiOyna>
  );
}

/** Raqib qidirish — radar. Server har soniyada so'raladi; topilsa jang sahifasiga o'tadi */
function Qidiruv({ onTopildi, onClose }: { onTopildi: (jangId: number) => void; onClose: () => void }) {
  const [soniya, setSoniya] = useState(0);
  const [xato, setXato] = useState('');
  // Bekor qilindi yoki raqib topildi — so'rovlar to'xtaydi
  const toxtadi = useRef(false);
  // Ota har renderda yangi funksiya beradi — effekt qayta ishga tushib qidiruvni
  // uzib qo'ymasligi uchun ref orqali o'qiladi
  const topildiRef = useRef(onTopildi);
  topildiRef.current = onTopildi;

  useEffect(() => {
    // Har ishga tushishning o'z bayrog'i: dev'dagi StrictMode effektni ikki marta
    // ishga tushiradi — birinchisining so'rov zanjiri shu bilan to'xtaydi
    let faol = true;
    let t: number | undefined;
    const davom = () => faol && !toxtadi.current;
    const natija = (r: Awaited<ReturnType<typeof oktagon.qidiruv>>) => {
      if (!davom()) return;
      if (r.holat === 'topildi') {
        toxtadi.current = true;
        topildiRef.current(r.jangId);
        return;
      }
      if (r.holat === 'kutmoqda') setSoniya(r.soniya);
      // 'yoq' — server qayta ishga tushgan va navbat bo'shagan: qaytadan navbatga turamiz
      t = window.setTimeout(() => davom() && (r.holat === 'yoq' ? oktagon.qidir() : oktagon.qidiruv()).then(natija, xatoda), 1000);
    };
    const xatoda = () => {
      if (!davom()) return;
      setXato('Aloqa yo‘q. Qayta urinilmoqda…');
      t = window.setTimeout(() => davom() && oktagon.qidiruv().then((r) => { setXato(''); natija(r); }, xatoda), 2000);
    };
    oktagon.qidir().then(natija, xatoda);
    return () => {
      faol = false;
      clearTimeout(t);
    };
  }, []);

  const bekor = async () => {
    toxtadi.current = true;
    try {
      // Shu soniyada raqib topilgan bo'lsa — jangga kiramiz (raqib kutib qolmasin)
      const r = await oktagon.bekor();
      if (r.jangId) return onTopildi(r.jangId);
    } catch { /* aloqa yo'q — baribir yopamiz */ }
    onClose();
  };

  return (
    <PastkiOyna title="RAQIB QIDIRILMOQDA…" subtitle="Iltimos, kuting…" onClose={bekor}>
      <div className="ok-radar">
        <div className="ok-sweep" />
        <div className="ok-radar-men"><UserRound size={26} /></div>
      </div>
      <div className="ok-izoh">
        {xato || (soniya >= 8 ? 'Raqib topilmasa, bot bilan o‘ynaysiz' : ' ')}
      </div>
      <button className="ok-btn yashil" onClick={bekor}><X size={22} strokeWidth={3} /> Bekor qilish</button>
    </PastkiOyna>
  );
}

/** Do'stni jangga chaqirish: 6 xonali kod yaratish yoki do'stning kodi bilan qo'shilish */
function DostOyna({ onJang, onClose }: { onJang: (jangId: number) => void; onClose: () => void }) {
  const [rejim, setRejim] = useState<'tanlash' | 'yarat' | 'qoshil'>('tanlash');
  const [kod, setKod] = useState('');
  const [urinish, setUrinish] = useState(0); // "Yangi kod" — kod eskirganda qayta yaratish
  const [kiritilgan, setKiritilgan] = useState('');
  const [xabar, setXabar] = useState('');
  const [band, setBand] = useState(false);
  const toxtadi = useRef(false);
  const jangRef = useRef(onJang);
  jangRef.current = onJang;

  // Kod yaratilgach — do'st qo'shilguncha holat so'raladi
  useEffect(() => {
    if (rejim !== 'yarat') return;
    let faol = true;
    let t: number | undefined;
    const davom = () => faol && !toxtadi.current;
    const sora = () =>
      oktagon.taklifHolat().then(
        (r) => {
          if (!davom()) return;
          if (r.holat === 'topildi') {
            toxtadi.current = true;
            jangRef.current(r.jangId);
            return;
          }
          if (r.holat === 'yoq') {
            setKod('');
            setXabar('Kod eskirdi — yangisini yarating');
            return;
          }
          t = window.setTimeout(sora, 1500);
        },
        () => { if (davom()) t = window.setTimeout(sora, 3000); }
      );
    oktagon.taklif().then(
      (r) => {
        if (!davom()) return;
        setKod(r.kod);
        setXabar('');
        t = window.setTimeout(sora, 1500);
      },
      (e) => davom() && setXabar(e?.message || 'Aloqa yo‘q')
    );
    return () => {
      faol = false;
      clearTimeout(t);
    };
  }, [rejim, urinish]);

  const yop = async () => {
    toxtadi.current = true;
    if (rejim === 'yarat') {
      try {
        // Shu soniyada do'st qo'shilgan bo'lsa — jangga kiramiz (do'st kutib qolmasin)
        const r = await oktagon.taklifBekor();
        if (r.jangId) return onJang(r.jangId);
      } catch { /* aloqa yo'q — kod baribir eskiradi */ }
    }
    onClose();
  };

  const ulash = async () => {
    const matn = `Autostart ilovasida Oktagon'da men bilan bellash! ⚔️\nKod: ${kod}\n(Oktagon → Do‘stni jangga chaqirish → Kod bilan qo‘shilish)`;
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Oktagon', text: matn, dialogTitle: 'Do‘stingizga yuboring' });
    } catch (e: any) {
      if (/cancel/i.test(String(e?.message || ''))) return; // foydalanuvchi o'zi yopdi
      try {
        await navigator.clipboard.writeText(matn);
        setXabar('Matn nusxalandi — do‘stingizga yuboring');
      } catch {
        setXabar('Kodni do‘stingizga ayting: ' + kod);
      }
    }
  };

  const qoshil = async () => {
    const k = kiritilgan.replace(/\D/g, '');
    if (k.length !== 6) return setXabar('Kod 6 ta raqamdan iborat');
    setBand(true);
    setXabar('');
    try {
      const r = await oktagon.qoshil(k);
      toxtadi.current = true;
      onJang(r.jangId);
    } catch (e: any) {
      setXabar(e?.message || 'Aloqa yo‘q');
      setBand(false);
    }
  };

  if (rejim === 'yarat')
    return (
      <PastkiOyna title="Do‘stingizni chaqiring" onClose={yop}>
        <div className="ok-kod">{kod ? `${kod.slice(0, 3)} ${kod.slice(3)}` : '— — —'}</div>
        <div className="ok-izoh" style={{ margin: '0 0 16px' }}>
          Kodni do‘stingizga yuboring. U Oktagon → “Do‘stni jangga chaqirish” → “Kod bilan qo‘shilish” orqali kiradi.
        </div>
        {kod && <div className="ok-kutish"><span className="ok-nuqta" /> Do‘stingiz kutilmoqda…</div>}
        {xabar && <div className="ok-izoh" style={{ margin: '0 0 14px' }}>{xabar}</div>}
        {kod ? (
          <button className="ok-btn yashil" onClick={ulash}><Share2 size={20} /> Ulashish</button>
        ) : (
          <button className="ok-btn yashil" onClick={() => setUrinish((x) => x + 1)}>Yangi kod</button>
        )}
      </PastkiOyna>
    );

  if (rejim === 'qoshil')
    return (
      <PastkiOyna title="Kod bilan qo‘shilish" subtitle="Do‘stingiz yuborgan 6 xonali kod" onClose={yop}>
        <input
          className="ok-kod-input"
          inputMode="numeric"
          autoFocus
          maxLength={7}
          placeholder="000 000"
          value={kiritilgan}
          onChange={(e) => { setKiritilgan(e.target.value); setXabar(''); }}
          onKeyDown={(e) => e.key === 'Enter' && qoshil()}
        />
        {xabar && <div className="ok-izoh" style={{ margin: '0 0 14px', color: '#ff8a84' }}>{xabar}</div>}
        <button className="ok-btn yashil" disabled={band} onClick={qoshil}><Swords size={20} /> Qo‘shilish</button>
      </PastkiOyna>
    );

  return (
    <PastkiOyna title="Do‘stni jangga chaqirish" subtitle="Do‘stingiz bilan to‘g‘ridan-to‘g‘ri bellashing" onClose={yop}>
      <div style={{ display: 'grid', gap: 12 }}>
        <button className="ok-btn yashil" onClick={() => setRejim('yarat')}><Users size={20} /> Kod yaratish</button>
        <button className="ok-btn kulrang" onClick={() => setRejim('qoshil')}><KeyRound size={20} /> Kod bilan qo‘shilish</button>
      </div>
    </PastkiOyna>
  );
}

export default function Oktagon() {
  const nav = useNavigate();
  const loc = useLocation();
  const [men, setMen] = useState<{ ball: number; daraja: OktagonDaraja; janglar: number; onlayn: number } | null>(null);
  // Natija sahifasidagi "Yangi jang" — qoidalarsiz to'g'ri qidirishga
  const [oyna, setOyna] = useState<null | 'qoidalar' | 'qoidalar-info' | 'qidiruv' | 'dost'>(
    (loc.state as any)?.qidir ? 'qidiruv' : null
  );

  useEffect(() => {
    oktagon.men().then(setMen).catch(() => {});
  }, []);

  const ball = men?.ball ?? 0;
  const daraja = men?.daraja ?? 'Bronza';
  const boshla = () => setOyna('qoidalar');

  return (
    <div className="ie ok-ekran ok-asosiy">
      <div className="ok-top">
        <button className="ok-ic" onClick={() => nav('/')} aria-label="Orqaga"><ChevronLeft size={22} /></button>
        <button className="ok-ic" onClick={() => setOyna('qoidalar-info')} aria-label="Qoidalar"><Settings size={20} /></button>
      </div>

      <div className="ok-emblem"><Swords size={60} strokeWidth={1.6} /></div>
      <div className="ok-name">OKTAGON</div>
      <div className="ok-sub">JANG REJIMI</div>

      <div className="ok-stats">
        <div className="ok-stat">
          <span className="ok-medal">{MEDAL[daraja]}</span>
          <small>{daraja}</small>
        </div>
        <div className="ok-stat">
          <b className={ball < 0 ? 'manfiy' : 'musbat'}>{ball}</b>
          <small>ball</small>
        </div>
        <div className="ok-stat">
          <b>{men?.janglar ?? 0}</b>
          <small>Janglar</small>
        </div>
      </div>

      <div className="ok-tiles">
        <button className="ok-tile" onClick={boshla}>
          Onlayn o‘yinchilar
          <span className="ok-tile-ic"><Radio size={24} /></span>
          {men && <span className="ok-online">{men.onlayn}</span>}
        </button>
        <button className="ok-tile gold" onClick={() => nav('/oktagon/reyting')}>
          Eng zo‘rlari
          <small>Reytingni ko‘ring</small>
          <span className="ok-tile-ic"><Trophy size={24} /></span>
        </button>
        <button className="ok-tile" onClick={() => setOyna('dost')}>
          Do‘stni jangga chaqirish
          <span className="ok-tile-ic"><Users size={24} /></span>
        </button>
        <button className="ok-tile" onClick={() => nav('/oktagon/janglarim')}>
          Mening janglarim
          <span className="ok-tile-ic"><ClipboardList size={24} /></span>
        </button>
      </div>

      <div className="ok-foot">
        <button className="ok-btn yashil" onClick={boshla}><Swords size={24} /> Qidirishni boshlash</button>
      </div>

      {oyna === 'qoidalar' && (
        <Qoidalar kutish={4} tugma="Tushundim" onDavom={() => setOyna('qidiruv')} onClose={() => setOyna(null)} />
      )}
      {oyna === 'qoidalar-info' && (
        <Qoidalar kutish={0} tugma="Yopish" onDavom={() => setOyna(null)} onClose={() => setOyna(null)} />
      )}
      {oyna === 'qidiruv' && (
        <Qidiruv onTopildi={(id) => nav(`/oktagon/jang/${id}`)} onClose={() => setOyna(null)} />
      )}
      {oyna === 'dost' && <DostOyna onJang={(id) => nav(`/oktagon/jang/${id}`)} onClose={() => setOyna(null)} />}
    </div>
  );
}
