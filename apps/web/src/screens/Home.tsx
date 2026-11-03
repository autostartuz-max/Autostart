import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type BallMen } from '../api';
import { getLang } from '../i18n';
import type { Me } from '../types';
import Ekran from '../ilova/komponentlar/Ekran';
import TepaQator, { KunChip } from '../ilova/komponentlar/TepaQator';
import StatBlok from '../ilova/komponentlar/StatBlok';
import IlovaKarta from '../ilova/komponentlar/IlovaKarta';
import { useKorinish } from '../ilova/komponentlar/useKorinish';
import { Chipta, Papka, SinganYurak, Svetofor, YolBelgisi } from '../ilova/ikonkalar';
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

function AsosiyKarta({ ism, yechilgan, jami, foiz, onClick }: {
  ism: string;
  yechilgan: number;
  jami: number;
  foiz: number;
  onClick: () => void;
}) {
  // Chiziqlar va play faqat karta ekranda ko'rinib turganda harakatlanadi (tema.css)
  const [ref, korinadi] = useKorinish<HTMLButtonElement>();
  const ulush = jami ? Math.min(1, yechilgan / jami) : 0;
  return (
    <button
      ref={ref}
      type="button"
      className={'ilv-asosiy' + (korinadi ? ' ilv-korinadi' : '')}
      onClick={onClick}
      aria-label={`Test yechish: ${yechilgan} / ${jami} savol, ${foiz}% to‘g‘ri`}
    >
      <span className="ilv-asosiy-chiziq ilv-ani" aria-hidden="true" />
      {/* Ma'lumot kelguncha bo'sh qator — sahifa sakramasin */}
      <span className="ilv-asosiy-ism">{ism || ' '}</span>
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
  );
}

export default function Home() {
  const nav = useNavigate();
  const [me, setMe] = useState<MeIlova | null>(null);
  const [ball, setBall] = useState<BallMen | null>(null);

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

  return (
    <Ekran faol="asosiy">
      <TepaQator ong={<KunChip kun={streak} onClick={() => nav('/men')} />} />
      <AsosiyKarta ism={ism} yechilgan={yechilgan} jami={jami} foiz={foiz} onClick={() => nav('/test?mode=practice')} />
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
        <IlovaKarta sarlavha="Biletlar" ikonka={<Chipta />} onClick={() => nav('/biletlar')} />
        <IlovaKarta sarlavha="Mavzular" ikonka={<Papka />} onClick={() => nav('/mavzular')} />
        <IlovaKarta sarlavha="Yo‘l belgilari" ikonka={<YolBelgisi />} onClick={() => nav('/belgilar')} />
        <IlovaKarta
          sarlavha="Xatolarni tuzatish"
          ikonka={<SinganYurak />}
          belgi={{ matn: xato, rang: 'qizil' }}
          onClick={() => nav('/test?mode=mistakes')}
        />
        <IlovaKarta sarlavha="Oktagon" fon={{ animatsiya: oktagon, kadr: oktagonKadr }} onClick={() => nav('/oktagon')} />
      </div>
    </Ekran>
  );
}
