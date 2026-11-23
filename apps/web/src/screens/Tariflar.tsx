import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Clock, Lock, Menu, PhoneCall, ShieldCheck, X } from 'lucide-react';
import { api, type TarifJavob } from '../api';
import AppSidebar from '../components/AppSidebar';
import { mobilIlova, ilovaEkrani } from '../native';
import { useOrqaga, orqagaYozuvi } from '../orqaga';
import {
  TARIFLAR_ZAXIRA, TARIF_NOMI, TOLOV_KONTAKT_ZAXIRA, narxMatn, sanaMatn, useTarif, type Tarif, type TarifKod,
} from '../tarif/holat';
import { TarifLogo } from '../tarif/Logolar';
import '../dashboard.css';
import '../tarif/tarif.css';

type Kontakt = { telefon: string; tel: string };

/** Kompyuterda "tel:" begona dasturni ochadi — u yerda raqam nusxalanadi (Aloqa sahifasidagidek) */
function useTelefon() {
  const [nusxa, setNusxa] = useState(false);
  const bos = (e: React.MouseEvent, raqam: string) => {
    let teginish = false;
    try { teginish = window.matchMedia('(pointer: coarse)').matches; } catch { /* ignore */ }
    if (teginish || mobilIlova() || !navigator.clipboard) return; // havola o'zi qo'ng'iroqqa o'tadi
    e.preventDefault();
    navigator.clipboard.writeText(raqam).then(() => {
      setNusxa(true);
      setTimeout(() => setNusxa(false), 1800);
    }).catch(() => { /* bufer ishlamadi */ });
  };
  return { nusxa, bos };
}

/** "Sotib olish" bosilgandan keyin: so'rov qabul qilindi, to'lov uchun call-markaz */
function SorovOynasi({ tarif, kontakt, onClose }: { tarif: Tarif; kontakt: Kontakt; onClose: () => void }) {
  const tel = useTelefon();
  useEffect(() => {
    const orqaga = (e: Event) => { e.preventDefault(); onClose(); };
    window.addEventListener('ilova:orqaga', orqaga);
    return () => window.removeEventListener('ilova:orqaga', orqaga);
  }, [onClose]);
  return (
    <div className="tf-oyna-fon" onClick={onClose}>
      <div className="tf-oyna" role="dialog" aria-modal="true" aria-label="So‘rov qabul qilindi" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tf-oyna-x" onClick={onClose} aria-label="Yopish"><X aria-hidden="true" /></button>
        <div className="tf-oyna-belgi"><Check aria-hidden="true" /></div>
        <h2>So‘rovingiz qabul qilindi!</h2>
        <div className="tf-oyna-tarif">
          <TarifLogo kod={tarif.kod} size={28} />
          <span>{tarif.nom} — {narxMatn(tarif.narx)} / {tarif.oy} oy</span>
        </div>
        <p>
          To‘lovni amalga oshirish uchun call-markazimizga qo‘ng‘iroq qiling. Operatorimiz o‘zi ham siz bilan
          bog‘lanadi. To‘lovdan so‘ng tarifingiz darhol yoqiladi.
        </p>
        <a className="tf-tugma tf-qongiroq" href={'tel:' + kontakt.tel} onClick={(e) => tel.bos(e, kontakt.telefon)}>
          <PhoneCall aria-hidden="true" />
          <span className={tel.nusxa ? 'tf-nusxa' : undefined}>{tel.nusxa ? 'Raqam nusxalandi' : kontakt.telefon}</span>
        </a>
        <button type="button" className="tf-oyna-keyin" onClick={onClose}>Yopish</button>
      </div>
    </div>
  );
}

/**
 * Tariflar (/tariflar) — ilova va saytda bitta sahifa: Standart, Silver, Premium. To'lov hozircha
 * qo'lda: "Sotib olish" so'rov qoldiradi (adminga Telegram xabari), call-markaz to'lovni qabul
 * qiladi, admin /tariflar/boshqaruv da yoqadi.
 */
export default function Tariflar() {
  const ilova = mobilIlova();
  const orqaga = useOrqaga();
  const [open, setOpen] = useState(false);
  const [javob, setJavob] = useState<TarifJavob | null>(null);
  const [xato, setXato] = useState('');
  const [yuborilmoqda, setYuborilmoqda] = useState<TarifKod | null>(null);
  const [sorovOyna, setSorovOyna] = useState<Tarif | null>(null);
  const holat = useTarif();
  const tel = useTelefon();

  useEffect(() => {
    if (!ilova) return;
    ilovaEkrani(true);
    return () => ilovaEkrani(false);
  }, [ilova]);

  const yukla = () => api.tarif().then((r) => { setJavob(r); setXato(''); }).catch(() => { /* zaxira ro'yxat ko'rinadi */ });
  useEffect(() => { yukla(); }, []);

  const tariflar = javob?.tariflar?.length ? javob.tariflar : TARIFLAR_ZAXIRA;
  const kontakt: Kontakt = javob?.kontakt || TOLOV_KONTAKT_ZAXIRA;
  const joriy = javob ? javob.joriy : holat.joriy;
  const daraja = javob ? javob.daraja : holat.daraja;
  const sorov = javob?.sorov && javob.sorov.tarif !== joriy?.kod ? javob.sorov : null;

  const sotibOl = async (t: Tarif) => {
    if (yuborilmoqda) return;
    setYuborilmoqda(t.kod);
    setXato('');
    try {
      await api.tarifSorov(t.kod);
      setSorovOyna(t);
      yukla();
    } catch (e: any) {
      setXato(e?.message || 'So‘rovni yuborib bo‘lmadi. Internetni tekshiring yoki qo‘ng‘iroq qiling.');
    }
    setYuborilmoqda(null);
  };

  const ichi = (
    <div className="tf">
      <div className="tf-bosh">
        {/* Ilovada sarlavha tepada, orqaga tugmasi yonida */}
        {!ilova && <h1>Tariflar</h1>}
        <p>Autostart bilan imtihonga tez va oson tayyorlaning</p>
      </div>

      {xato && <div className="tf-xato" role="alert">{xato}</div>}

      <div className={'tf-holat' + (joriy ? ' faol' : '')}>
        {joriy ? (
          <>
            <TarifLogo kod={joriy.kod} size={44} />
            <div>
              <b>Sizning tarifingiz: {joriy.nom}</b>
              <span>{sanaMatn(joriy.tugaydi)} gacha amal qiladi</span>
            </div>
          </>
        ) : daraja >= 3 ? (
          <>
            <span className="tf-holat-ik"><ShieldCheck aria-hidden="true" /></span>
            <div>
              <b>Xodim hisobi</b>
              <span>Barcha imkoniyatlar siz uchun ochiq.</span>
            </div>
          </>
        ) : (
          <>
            <span className="tf-holat-ik"><Lock aria-hidden="true" /></span>
            <div>
              <b>Hozir bepul foydalanyapsiz</b>
              <span>Barcha testlar ochiq. Audio sharh, video darslar va boshqa imkoniyatlar — tariflarda (har bo‘limdan bittasi namuna sifatida bepul).</span>
            </div>
          </>
        )}
      </div>

      {sorov && (
        <div className="tf-sorov" role="status">
          <Clock aria-hidden="true" />
          <div>
            <b>{TARIF_NOMI[sorov.tarif]} tarifiga so‘rovingiz qabul qilingan</b>
            <span>
              Operatorimiz siz bilan bog‘lanadi. Tezroq yoqish uchun qo‘ng‘iroq qiling:{' '}
              <a href={'tel:' + kontakt.tel} onClick={(e) => tel.bos(e, kontakt.telefon)} className={tel.nusxa ? 'tf-nusxa' : undefined}>
                {tel.nusxa ? 'nusxalandi' : kontakt.telefon}
              </a>
            </span>
          </div>
        </div>
      )}

      <div className="tf-royxat">
        {tariflar.map((t) => {
          const buJoriy = joriy?.kod === t.kod;
          return (
            <article key={t.kod} className={'tf-karta tf-' + t.kod + (buJoriy ? ' joriy' : '')}>
              {buJoriy ? <span className="tf-joriy-belgi">Faol</span> : t.kod === 'premium' && <span className="tf-tavsiya">Eng foydali</span>}
              <div className="tf-karta-bosh">
                <TarifLogo kod={t.kod} size={58} />
                <div>
                  <h2>{t.nom}</h2>
                  <span className="tf-muddat">{t.oy} oylik</span>
                </div>
              </div>
              <div className="tf-narx"><b>{narxMatn(t.narx)}</b><span>/ {t.oy} oy</span></div>
              <ul>
                {t.imkoniyatlar.map((m) => (
                  <li key={m}><Check aria-hidden="true" /><span>{m}</span></li>
                ))}
              </ul>
              <button type="button" className="tf-tugma" disabled={yuborilmoqda != null} onClick={() => sotibOl(t)}>
                {yuborilmoqda === t.kod ? 'Yuborilmoqda…' : buJoriy ? 'Muddatni uzaytirish' : 'Sotib olish'}
              </button>
            </article>
          );
        })}
      </div>

      <p className="tf-izoh">
        To‘lov call-markaz orqali: “Sotib olish”ni bosing yoki qo‘ng‘iroq qiling —{' '}
        <a href={'tel:' + kontakt.tel} onClick={(e) => tel.bos(e, kontakt.telefon)}>{kontakt.telefon}</a>.
        To‘lovdan keyin tarif darhol yoqiladi. Tarifsiz ham barcha testlar bepul.
      </p>

      {sorovOyna && <SorovOynasi tarif={sorovOyna} kontakt={kontakt} onClose={() => setSorovOyna(null)} />}
    </div>
  );

  if (ilova) {
    return (
      <div className="tf-ilova">
        <header className="tf-tepa">
          <button type="button" onClick={orqaga} aria-label="Orqaga"><ChevronLeft aria-hidden="true" /></button>
          <h1>Tariflar</h1>
        </header>
        {ichi}
      </div>
    );
  }

  return (
    <div className="db">
      <AppSidebar active="/tariflar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={orqaga}><ChevronLeft size={18} /> {orqagaYozuvi()}</button>
        </header>
        <div className="db-content">{ichi}</div>
      </div>
    </div>
  );
}
