import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings, Swords, Radio, Trophy, Users, ClipboardList, Zap, Target, X, UserRound } from 'lucide-react';
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
      {oyna === 'dost' && (
        <PastkiOyna title="Do‘stni jangga chaqirish" subtitle="Tez orada" onClose={() => setOyna(null)}>
          <div className="ok-izoh" style={{ margin: '4px 0 20px', fontSize: 14 }}>
            Do‘stingizga havola yuborasiz va u bilan to‘g‘ridan-to‘g‘ri bellashasiz. Hozircha “Qidirishni boshlash” orqali o‘ynang.
          </div>
          <button className="ok-btn yashil" onClick={() => setOyna(null)}>Tushunarli</button>
        </PastkiOyna>
      )}
    </div>
  );
}
