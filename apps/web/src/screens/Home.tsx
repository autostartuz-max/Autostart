import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, oxirgiJavob, type BallMen } from '../api';
import { getLang } from '../i18n';
import type { Me } from '../types';
import Ekran from '../ilova/komponentlar/Ekran';
import TepaQator, { KunChip } from '../ilova/komponentlar/TepaQator';
import StatBlok from '../ilova/komponentlar/StatBlok';
import IlovaKarta from '../ilova/komponentlar/IlovaKarta';
import { useKorinish } from '../ilova/komponentlar/useKorinish';
import { Papka, Qatlamlar, Royxat, SavolPufak, SinganYurak, Svetofor, YolBelgisi } from '../ilova/ikonkalar';
import PastkiOyna from '../components/PastkiOyna';
import ImtihonSanasi, { qolganKun, sanaKaliti, sanaNuqtali } from '../components/ImtihonSanasi';
import { Pencil } from 'lucide-react';
import { TarifLogo } from '../tarif/Logolar';
import { sanaMatn, useTarif } from '../tarif/holat';
import Eslatmalar from '../ilova/Eslatmalar';
import oktagon from '../ilova/rasmlar/oktagon.webp';
import oktagonKadr from '../ilova/rasmlar/oktagon-kadr.webp';
import '../ilova/ekranlar.css';

/**
 * Ilovaning bosh sahifasi (saytda Dashboard). Namuna — "variant-6": logotip va faollik chipi,
 * "TEST YECHISH" kartasi, statistika va 6 ta bo'lim. Qolgan testlar — Testlar ekranida,
 * til/mavzu va ilova versiyasi — Profil ekranida.
 */

// Test oynasi tili: ilovadagi "Uzbek" — lotin (Testlar ekranidagi random test ham shundan oladi)
export const testTili = () => {
  const l = getLang();
  return l === 'uz' ? 'lat' : l;
};

// Ilovaga /me faollik seriyasini ham qaytaradi — Me turida u hali yo'q
type MeIlova = Me & { stats: Me['stats'] & { streak?: number } };

function AsosiyKarta({ ism, yechilgan, jami, foiz, onClick, sana, onSana }: {
  ism: string;
  yechilgan: number;
  jami: number;
  foiz: number;
  onClick: () => void;
  /** Imtihon sanasi "YYYY-MM-DD" (profildan) yoki null */
  sana: string | null;
  onSana: () => void;
}) {
  // Chiziqlar va play faqat karta ekranda ko'rinib turganda harakatlanadi (tema.css)
  const [ref, korinadi] = useKorinish<HTMLButtonElement>();
  const ulush = jami ? Math.min(1, yechilgan / jami) : 0;
  // O'tib ketgan sana ko'rsatilmaydi — yangisini belgilash taklif qilinadi
  const qoldi = sana ? qolganKun(sana) : -1;
  const sanaYozuv = sana && qoldi >= 0 ? `${sanaNuqtali(sana)} · ${qoldi === 0 ? 'bugun' : qoldi + ' kun'}` : 'Sanani o‘zgartirish';
  return (
    <div className="ilv-asosiy-joy">
      <button
        ref={ref}
        type="button"
        className={'ilv-asosiy' + (korinadi ? ' ilv-korinadi' : '')}
        onClick={onClick}
        aria-label={`Test yechish: ${yechilgan} / ${jami} savol, ${foiz}% to‘g‘ri`}
      >
      <span className="ilv-asosiy-chiziq ilv-ani" aria-hidden="true" />
      {/* Ism qatori kartaning ustida (ilv-asosiy-ism-qator) chiziladi — bu yerda faqat joyi, sahifa sakramasin */}
      <span className="ilv-asosiy-ism" aria-hidden="true">{' '}</span>
      <span className="ilv-asosiy-sarlavha">Test yechish</span>
      <span className="ilv-asosiy-past">
        <span className="ilv-asosiy-info">
          <span className="ilv-asosiy-sonlar">
            <span className="ilv-asosiy-savol">{`${yechilgan} / ${jami} savol`}</span>
            <span className="ilv-asosiy-foiz">{`${foiz}% to‘g‘ri`}</span>
          </span>
          <span className="ilv-asosiy-progress">
            <span className="ilv-asosiy-tola" style={{ width: `${ulush * 100}%` }} />
          </span>
        </span>
        <span className="ilv-asosiy-play ilv-ani" aria-hidden="true">
          {/* Uchburchak namunadan o'lchangan (burchaklari ~1.1px yumaloq): og'irlik markazi doira markazida */}
          <svg viewBox="0 0 56 56" aria-hidden="true">
            <path d="M24.13 20.76 36.3 28 24.13 35.24Z" fill="currentColor" stroke="currentColor" strokeWidth="2.26" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      </button>
      {/* Ism va uning oxirida "Sanani o'zgartirish ✎" — imtihon sanasi (kartaning o'zi testni ochadi,
          shuning uchun tugma uning ustida alohida turadi: tugma ichida tugma bo'lmaydi) */}
      <div className="ilv-asosiy-ism-qator">
        <span className="ilv-asosiy-ism">{ism || ' '}</span>
        {ism && (
          <button type="button" className="ilv-asosiy-sana" onClick={onSana} aria-label={sana && qoldi >= 0 ? `Imtihon sanasi ${sanaYozuv}. O‘zgartirish` : 'Imtihon sanasini belgilash'}>
            <span>{sanaYozuv}</span>
            <Pencil aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

// "50/100 talik": random test uchun savol soni (server bir so'rovda 200 tagacha beradi)
const SONLAR = [50, 100, 200, 500];

export default function Home() {
  const nav = useNavigate();
  // Oxirgi ma'lum raqamlar bilan darhol chiziladi, yangisi serverdan orqada keladi
  const [me, setMe] = useState<MeIlova | null>(() => oxirgiJavob<MeIlova>('me'));
  const [ball, setBall] = useState<BallMen | null>(() => oxirgiJavob<BallMen>('ballMen'));
  // "50/100 talik" darhol test ochmaydi — avval savol sonini so'raydi
  const [soniOyna, setSoniOyna] = useState(false);
  // "Sanani o'zgartirish" — imtihon sanasi oynasi
  const [sanaOyna, setSanaOyna] = useState(false);
  const tarif = useTarif();
  const sanaSaqla = async (sana: string) => {
    const r = await api.updateMe({ examDate: sana });
    setMe((m) => (m ? { ...m, user: { ...m.user, examDate: r?.user?.examDate ?? sana } } : m));
    api.me().then(setMe).catch(() => {}); // oxirgi javob ham yangilansin (Profil shundan oladi)
  };
  const randomBoshla = (n: number) => {
    setSoniOyna(false);
    nav(`/test?mode=random&limit=${n}&exam=1&lang=${testTili()}&shuffle=0`);
  };

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    // Daraja tizimi eski serverda bo'lmasligi mumkin — unda faqat ism ko'rinadi
    api.ballMen().then(setBall).catch(() => {});
  }, []);

  // Yuklanguncha hammasi 0 — joylashuv o'zgarmaydi
  const s = me?.stats;
  const jami = s?.totalQuestions ?? 0;
  const yechilgan = s?.solvedQuestions ?? 0;
  const xato = s?.mistakes ?? 0;
  const togri = Math.max(0, yechilgan - xato);
  const qolgan = Math.max(0, jami - yechilgan);
  const foiz = yechilgan ? Math.round((togri / yechilgan) * 100) : 0;
  const streak = s?.streak ?? ball?.streak ?? 0;
  const ism = me ? [me.user.firstName, ball?.daraja.nom].filter(Boolean).join(' · ') : '';
  const sana = sanaKaliti(me?.user.examDate);

  return (
    <Ekran faol="asosiy">
      <TepaQator ong={<KunChip kun={streak} onClick={() => nav('/men')} />} />
      <AsosiyKarta
        ism={ism}
        yechilgan={yechilgan}
        jami={jami}
        foiz={foiz}
        onClick={() => nav('/test?mode=practice')}
        sana={sana}
        onSana={() => setSanaOyna(true)}
      />
      <div className="ilv-stat-qator">
        <StatBlok son={togri} yozuv="To‘g‘ri" rang="togri" />
        <StatBlok son={xato} yozuv="Xato" rang="xato" />
        <StatBlok son={qolgan} yozuv="Qolgan" rang="qolgan" />
      </div>
      <div className="ilv-karta-tor">
        {/* Imtihon testi: til ilova sozlamasidan olinadi (alohida so'ralmaydi) */}
        <IlovaKarta
          sarlavha="Real imtihon"
          ikonka={<Svetofor />}
          onClick={() => nav(`/test?mode=exam&exam=1&lang=${testTili()}&shuffle=0`)}
        />
        {/* "Biletlar" o'rnida — Testlar ekranidagi "Shablon testlar" (2026-11-23: alohida Biletlar ro'yxati kerak emas) */}
        <IlovaKarta sarlavha="Shablon testlar" ikonka={<Qatlamlar />} onClick={() => nav('/shablon')} />
        <IlovaKarta sarlavha="Mavzular" ikonka={<Papka />} onClick={() => nav('/mavzular')} />
        <IlovaKarta sarlavha="Yo‘l belgilari" ikonka={<YolBelgisi />} onClick={() => nav('/belgilar')} />
        <IlovaKarta
          sarlavha="Xatolarni tuzatish"
          ikonka={<SinganYurak />}
          belgi={{ matn: xato, rang: 'qizil' }}
          onClick={() => nav('/test?mode=mistakes')}
        />
        <IlovaKarta sarlavha="Bellashuv" fon={{ animatsiya: oktagon, kadr: oktagonKadr }} onClick={() => nav('/oktagon')} />
        {/* Namunadagi 3 qatordan keyin: 50/100 talik (Testlar'dan ko'chdi) va savol yuborish */}
        <IlovaKarta sarlavha="50/100 talik" ikonka={<Royxat />} onClick={() => setSoniOyna(true)} />
        <IlovaKarta sarlavha={'Sizga\nsavol bor'} ikonka={<SavolPufak />} onClick={() => nav('/aloqa')} />
        {/* Tariflar — butun qator: joriy tarif yoki sotib olish */}
        <button type="button" className="ilv-karta ilv-karta-bosh ilv-tarif-karta" onClick={() => nav('/tariflar')}>
          <span className="ilv-karta-sarlavha">{tarif.joriy ? `${tarif.joriy.nom} tarifi` : 'Tariflar'}</span>
          <span className="ilv-tarif-karta-izoh">
            {tarif.joriy ? `${sanaMatn(tarif.joriy.tugaydi)} gacha faol` : tarif.daraja >= 3 ? 'Xodim — hammasi ochiq' : 'Audio sharh, video darslar, avtodrom mashg‘ulotlari'}
          </span>
          <span className="ilv-joy-tarif" aria-hidden="true"><TarifLogo kod={tarif.joriy?.kod || 'premium'} size={76} /></span>
        </button>
      </div>

      {/* Xavfsizlik eslatmalari — har kuni bittasi */}
      <Eslatmalar tur="ilova" />

      {sanaOyna && <ImtihonSanasi joriy={sana} onClose={() => setSanaOyna(false)} onSaqla={sanaSaqla} />}

      {soniOyna && (
        <PastkiOyna title="Savol sonini tanlang" subtitle="Random savollar bilan test" onClose={() => setSoniOyna(false)}>
          <div className="ie-sh-grid">
            {SONLAR.map((n) => (
              <button key={n} type="button" className="ie-sh-opt" onClick={() => randomBoshla(n)}>
                <b>{n}</b>
                <span>ta savol</span>
              </button>
            ))}
          </div>
        </PastkiOyna>
      )}
    </Ekran>
  );
}
