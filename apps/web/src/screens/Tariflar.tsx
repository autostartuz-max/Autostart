import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Clock, Menu, PhoneCall, Users, X } from 'lucide-react';
import { api, type TarifJavob } from '../api';
import AppSidebar from '../components/AppSidebar';
import { mobilIlova, ilovaEkrani } from '../native';
import { useOrqaga, orqagaYozuvi } from '../orqaga';
import {
  IMKONIYAT_DARAJA, TARIFLAR_ZAXIRA, TOLOV_KONTAKT_ZAXIRA, narxMatn, sanaMatn, tarifToldir, useTarif, variantNarx, variantNomi,
  type Tarif, type TarifKod,
} from '../tarif/holat';
import { TarifLogo } from '../tarif/Logolar';
import { OquvMashinasi } from '../simulyator/ui/MashqRasmlari';
import '../dashboard.css';
import '../tarif/tarif.css';
import '../tarif/tarif-jadval.css';

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
function SorovOynasi({ tarif, oy, dostlar, kontakt, onClose }: {
  tarif: Tarif; oy: 1 | 3; dostlar: boolean; kontakt: Kontakt; onClose: () => void;
}) {
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
          <span>{variantNomi(tarif, oy, dostlar)} — {narxMatn(variantNarx(tarif, oy, dostlar))}</span>
        </div>
        <p>
          To‘lovni amalga oshirish uchun call-markazimizga qo‘ng‘iroq qiling. Operatorimiz o‘zi ham siz bilan
          bog‘lanadi. To‘lovdan so‘ng tarifingiz darhol yoqiladi.
        </p>
        {dostlar && tarif.dostlar && (
          <p className="tf-dost-izoh">
            <Users aria-hidden="true" />
            <span>Operatorga do‘stlaringizning ro‘yxatdan o‘tgan telefon raqamlarini ayting (yana {tarif.dostlar.odam - 1} kishigacha) — ularga ham Premium yoqiladi.</span>
          </p>
        )}
        <a className="tf-tugma tf-qongiroq" href={'tel:' + kontakt.tel} onClick={(e) => tel.bos(e, kontakt.telefon)}>
          <PhoneCall aria-hidden="true" />
          <span className={tel.nusxa ? 'tf-nusxa' : undefined}>{tel.nusxa ? 'Raqam nusxalandi' : kontakt.telefon}</span>
        </a>
        <button type="button" className="tf-oyna-keyin" onClick={onClose}>Yopish</button>
      </div>
    </div>
  );
}

/** Jadvaldagi "yo'q" belgisi — kulrang chiziqcha (namunadagidek) */
const Yoq = () => <span className="tf2-yoq" aria-label="yo‘q" />;
const Bor = () => <Check className="tf2-bor" aria-label="bor" strokeWidth={3} />;

/**
 * Tariflar (/tariflar) — ilova va saytda bitta sahifa. 2026-11-24: tariflar bir-biridan afzal tomonlari
 * bilan solishtirish jadvalida ko'rsatiladi (foydalanuvchi namunasi: tepada da'vat matni va maskot,
 * ostida "Bepul" va tariflar ustunlari, tanlangan ustun ajratilgan, pastda bitta katta tugma).
 * To'lov hozircha qo'lda: tugma so'rov qoldiradi (adminga Telegram xabari), call-markaz to'lovni
 * qabul qiladi, admin /tariflar/boshqaruv da yoqadi.
 */
export default function Tariflar() {
  const ilova = mobilIlova();
  const orqaga = useOrqaga();
  const [open, setOpen] = useState(false);
  const [javob, setJavob] = useState<TarifJavob | null>(null);
  const [xato, setXato] = useState('');
  const [yuborilmoqda, setYuborilmoqda] = useState<TarifKod | null>(null);
  const [sorovOyna, setSorovOyna] = useState<{ tarif: Tarif; oy: 1 | 3; dostlar: boolean } | null>(null);
  const [tanlangan, setTanlangan] = useState<TarifKod>('premium');
  // To'lov muddati: 1 oy (oylik narx) yoki 3 oy (chegirmali); Premiumda — "Do'stlar tarifi" (3 kishigacha)
  const [oy, setOy] = useState<1 | 3>(1);
  const [dostlar, setDostlar] = useState(false);
  const holat = useTarif();
  const tel = useTelefon();

  useEffect(() => {
    if (!ilova) return;
    ilovaEkrani(true);
    return () => ilovaEkrani(false);
  }, [ilova]);

  const yukla = () => api.tarif().then((r) => { setJavob(r); setXato(''); }).catch(() => { /* zaxira ro'yxat ko'rinadi */ });
  useEffect(() => { yukla(); }, []);

  const tariflar = (javob?.tariflar?.length ? javob.tariflar : TARIFLAR_ZAXIRA).map(tarifToldir).sort((a, b) => a.daraja - b.daraja);
  const kontakt: Kontakt = javob?.kontakt || TOLOV_KONTAKT_ZAXIRA;
  const joriy = javob ? javob.joriy : holat.joriy;
  const daraja = javob ? javob.daraja : holat.daraja;
  const sorov = javob?.sorov && javob.sorov.tarif !== joriy?.kod ? javob.sorov : null;
  // Faol tarif bo'lsa — o'sha ustun tanlangan bo'lib ochiladi
  useEffect(() => { if (joriy?.kod) setTanlangan(joriy.kod); }, [joriy?.kod]);
  const t = tariflar.find((x) => x.kod === tanlangan) || tariflar[tariflar.length - 1];
  const buJoriy = joriy?.kod === t.kod;
  const dost = dostlar && !!t.dostlar; // Do'stlar tarifi faqat Premiumda
  const premiumD = tariflar.find((x) => x.dostlar); // jadvaldagi "Do'stlar tarifi" qatorlari uchun

  // Qatorlar — server sozlamasidan (qaysi imkoniyat qaysi darajadan ochiladi)
  const imk = { ...IMKONIYAT_DARAJA, ...(javob?.imkoniyatDaraja || {}) } as Record<string, number>;
  const QATORLAR: { nom: string; izoh?: string; daraja: number }[] = [
    { nom: 'Barcha testlar va biletlar', daraja: 0 },
    { nom: 'Har bir testga audio sharh', daraja: imk.audio },
    { nom: 'Yo‘l belgilari va qulay qidiruv', daraja: imk.belgilar },
    { nom: 'Har bir testga video dars', daraja: imk.video },
    { nom: 'Mavzular bo‘yicha video darslar', izoh: 'tez orada', daraja: imk.mavzu },
    { nom: 'Avtodrom amaliy mashg‘ulotlari', izoh: 'A, B, BC, D, CE', daraja: imk.avtodrom },
  ];

  const sotibOl = async (x: Tarif) => {
    if (yuborilmoqda) return;
    setYuborilmoqda(x.kod);
    setXato('');
    const d = dostlar && !!x.dostlar;
    try {
      await api.tarifSorov(x.kod, oy, d);
      setSorovOyna({ tarif: x, oy, dostlar: d });
      yukla();
    } catch (e: any) {
      setXato(e?.message || 'So‘rovni yuborib bo‘lmadi. Internetni tekshiring yoki qo‘ng‘iroq qiling.');
    }
    setYuborilmoqda(null);
  };

  const ustun = (kod: TarifKod) => 'tf2-q' + (kod === tanlangan ? ' tanlangan' : '');
  const tugmaMatn = yuborilmoqda ? 'Yuborilmoqda…' : buJoriy ? t.nom + ': muddatni uzaytirish' : t.nom + ' tarifini sotib olish';

  const ichi = (
    <div className="tf2">
      {/* ---------- Tepa: da'vat matni va maskot ---------- */}
      <div className="tf2-hero">
        <div className="tf2-hero-tepa">
          {ilova ? (
            <button type="button" className="tf2-yop" onClick={orqaga} aria-label="Yopish"><X aria-hidden="true" /></button>
          ) : <span />}
          <span className="tf2-brend" data-notr>AUTOSTART</span>
        </div>
        {/* Da'vo foydalanuvchining o'z hujjatidan (2026-11): "1000 ga yaqin foydalanuvchilar … haydovchi bo'lishdi" */}
        <h1>
          <b>1000 ga yaqin</b> o‘quvchimiz tarif bilan natijaga tezroq erishib, haydovchi bo‘ldi!
        </h1>
        {joriy ? (
          <div className="tf2-joriy">Sizning tarifingiz: <b>{joriy.nom}</b> — {sanaMatn(joriy.tugaydi)} gacha</div>
        ) : daraja >= 3 ? (
          <div className="tf2-joriy">Xodim hisobi — barcha imkoniyatlar ochiq</div>
        ) : null}
        <div className="tf2-maskot-joy">
          <OquvMashinasi className="tf2-maskot" />
        </div>
        <svg className="tf2-bulut" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 64V40C26 26 56 22 84 34 104 12 146 6 172 26 196 4 244 2 266 26 290 12 330 12 352 30 372 22 390 24 400 28V64Z" fill="currentColor" />
        </svg>
      </div>

      {/* ---------- Solishtirish jadvali ---------- */}
      <div className="tf2-jadval" role="table" aria-label="Tariflarni solishtirish">
        <div className="tf2-qator tf2-sarlavha" role="row">
          <span role="columnheader" />
          <span className="tf2-bepul" role="columnheader">Bepul</span>
          {tariflar.map((x) => (
            <button
              key={x.kod}
              type="button"
              role="columnheader"
              className={ustun(x.kod) + ' tf2-tarif'}
              aria-pressed={x.kod === tanlangan}
              onClick={() => setTanlangan(x.kod)}
            >
              <TarifLogo kod={x.kod} size={28} />
              <span>{x.nom}</span>
              {joriy?.kod === x.kod && <em>faol</em>}
            </button>
          ))}
        </div>
        {QATORLAR.map((r) => (
          <div key={r.nom} className="tf2-qator" role="row">
            <span className="tf2-nom" role="rowheader">
              {r.nom}
              {r.izoh && <small>{r.izoh}</small>}
            </span>
            <span className="tf2-q" role="cell">{r.daraja <= 0 ? <Bor /> : <Yoq />}</span>
            {tariflar.map((x) => (
              <span key={x.kod} role="cell" className={ustun(x.kod)} onClick={() => setTanlangan(x.kod)}>
                {x.daraja >= r.daraja ? <Bor /> : <Yoq />}
              </span>
            ))}
          </div>
        ))}
        {/* 2026-11-24: foydalanish muddati 1 oy — oylik narx; ostida 3 oylik to'lov; 6 oylik yo'q;
            Premiumda "Do'stlar tarifi" (3 kishigacha) */}
        <div className="tf2-qator" role="row">
          <span className="tf2-nom" role="rowheader">Foydalanish muddati</span>
          <span className="tf2-q tf2-matn" role="cell">—</span>
          {tariflar.map((x) => (
            <span key={x.kod} role="cell" className={ustun(x.kod) + ' tf2-matn'} onClick={() => setTanlangan(x.kod)}>1 oy</span>
          ))}
        </div>
        <div className="tf2-qator" role="row">
          <span className="tf2-nom" role="rowheader">Oylik narxi, so‘m</span>
          <span className="tf2-q tf2-matn" role="cell">0</span>
          {tariflar.map((x) => (
            <span key={x.kod} role="cell" className={ustun(x.kod) + ' tf2-matn tf2-narx tf2-jami'} onClick={() => setTanlangan(x.kod)}>
              {narxMatn(x.narx).replace(' so‘m', '')}
            </span>
          ))}
        </div>
        <div className={'tf2-qator' + (premiumD ? '' : ' tf2-oxirgi')} role="row">
          <span className="tf2-nom" role="rowheader">3 oylik to‘lov, so‘m</span>
          <span className="tf2-q tf2-matn" role="cell">0</span>
          {tariflar.map((x) => (
            <span key={x.kod} role="cell" className={ustun(x.kod) + ' tf2-matn tf2-narx'} onClick={() => setTanlangan(x.kod)}>
              {narxMatn(x.narx3).replace(' so‘m', '')}
            </span>
          ))}
        </div>
        {premiumD?.dostlar && (
          <>
            <div className="tf2-qator" role="row">
              <span className="tf2-nom" role="rowheader">
                Do‘stlar tarifi, oylik
                <small>{premiumD.dostlar.odam} kishigacha</small>
              </span>
              <span className="tf2-q" role="cell"><Yoq /></span>
              {tariflar.map((x) => (
                <span key={x.kod} role="cell" className={ustun(x.kod) + ' tf2-matn tf2-narx'} onClick={() => setTanlangan(x.kod)}>
                  {x.dostlar ? narxMatn(x.dostlar.narx).replace(' so‘m', '') : <Yoq />}
                </span>
              ))}
            </div>
            <div className="tf2-qator tf2-oxirgi" role="row">
              <span className="tf2-nom" role="rowheader">
                Do‘stlar tarifi, 3 oylik
                <small>{premiumD.dostlar.odam} kishigacha</small>
              </span>
              <span className="tf2-q" role="cell"><Yoq /></span>
              {tariflar.map((x) => (
                <span key={x.kod} role="cell" className={ustun(x.kod) + ' tf2-matn tf2-narx'} onClick={() => setTanlangan(x.kod)}>
                  {x.dostlar ? narxMatn(x.dostlar.narx3).replace(' so‘m', '') : <Yoq />}
                </span>
              ))}
            </div>
          </>
        )}
        <p className="tf2-izoh">Tarifsiz ham barcha testlar bepul; har bo‘limdan bittasi namuna sifatida ochiq.</p>
      </div>

      {/* ---------- Jadval ostida: to'lov muddati va Do'stlar tarifi (oqimda — pastki tugma jadvalni yopmasin) ---------- */}
      <div className="tf2-tanlov">
        {/* To'lov muddati: 1 oy yoki 3 oy (chegirmali) */}
        <div className="tf2-davr" role="radiogroup" aria-label="To‘lov muddati">
          {([1, 3] as const).map((n) => {
            const summa = variantNarx(t, n, dost);
            const tejash = n === 3 ? variantNarx(t, 1, dost) * 3 - summa : 0;
            return (
              <button key={n} type="button" role="radio" aria-checked={oy === n} className={'tf2-davr-b' + (oy === n ? ' faol' : '')} onClick={() => setOy(n)}>
                <b>{n} oy</b>
                <span>{narxMatn(summa)}</span>
                {tejash > 0 && <em>{narxMatn(tejash)} tejaysiz</em>}
              </button>
            );
          })}
        </div>
        {t.dostlar && (
          <button type="button" className={'tf2-dost' + (dostlar ? ' faol' : '')} aria-pressed={dostlar} onClick={() => setDostlar((v) => !v)}>
            <span className="tf2-dost-belgi"><Users aria-hidden="true" /></span>
            <span className="tf2-dost-matn">
              <b>Do‘stlar tarifi</b>
              <small>{t.dostlar.odam} kishigacha Premium — oyiga {narxMatn(t.dostlar.narx)}</small>
            </span>
            <span className="tf2-dost-kalit" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ---------- Pastda: bitta katta tugma (tanlangan tarif) ---------- */}
      <div className="tf2-pastki">
        {xato && <div className="tf-xato" role="alert">{xato}</div>}
        {sorov && (
          <div className="tf2-sorov" role="status">
            <Clock aria-hidden="true" />
            <span>
              {variantNomi(tariflar.find((x) => x.kod === sorov.tarif) || { nom: sorov.tarif, dostlar: undefined }, sorov.oy, sorov.dostlar)}
              {' '}— so‘rovingiz qabul qilingan, operatorimiz bog‘lanadi
            </span>
          </div>
        )}
        <button type="button" className="tf2-cta" disabled={yuborilmoqda != null} onClick={() => sotibOl(t)}>
          <b>{tugmaMatn}</b>
          <span>{dost && t.dostlar ? `Do‘stlar tarifi (${t.dostlar.odam} kishi), ` : ''}{oy} oy — {narxMatn(variantNarx(t, oy, dost))}</span>
        </button>
        <div className="tf2-tel">
          To‘lov call-markaz orqali —{' '}
          <a href={'tel:' + kontakt.tel} onClick={(e) => tel.bos(e, kontakt.telefon)}>{tel.nusxa ? 'nusxalandi' : kontakt.telefon}</a>
        </div>
      </div>

      {sorovOyna && <SorovOynasi tarif={sorovOyna.tarif} oy={sorovOyna.oy} dostlar={sorovOyna.dostlar} kontakt={kontakt} onClose={() => setSorovOyna(null)} />}
    </div>
  );

  if (ilova) return <div className="tf-ilova tf2-ilova">{ichi}</div>;

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
