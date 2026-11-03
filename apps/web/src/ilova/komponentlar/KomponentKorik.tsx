import { Zap } from 'lucide-react';
import {
  Bayroqcha, Chipta, Hujjat, Mashina, Panjara, Papka, Qatlamlar, Royxat, SavolPufak, Shapka, SinganYurak,
  Svetofor, Undov, YolBelgisi,
} from '../ikonkalar';
import oktagon from '../rasmlar/oktagon.webp';
import oktagonKadr from '../rasmlar/oktagon-kadr.webp';
import Ekran from './Ekran';
import TepaQator, { KunChip, QidiruvTugma } from './TepaQator';
import StatBlok from './StatBlok';
import IlovaKarta from './IlovaKarta';
import '../tema.css';
import './komponentlar.css';

// Faqat ishlab chiqishda (/ilv-komponent): umumiy komponentlar namunadagi bosh sahifa
// joylashuvida, soxta ma'lumot bilan — skrinshotni maket bilan solishtirish uchun.
// Birinchi ekran (390×844) — aynan bosh sahifa; pastroqda Testlar ekrani bo'laklari.
const bos = () => {};

export default function KomponentKorik() {
  return (
    <Ekran faol="asosiy">
      <TepaQator ong={<KunChip kun={0} onClick={bos} />} />
      {/* Asosiy karta — D-agent ekranida; bu yerda faqat joyi (184px) */}
      <div
        aria-hidden="true"
        style={{ height: 'var(--ilv-asosiy-boy)', borderRadius: 'var(--ilv-asosiy-radius)', background: 'linear-gradient(135deg, #454240, #1f1e1d)' }}
      />
      <div className="ilv-stat-qator">
        <StatBlok son={16} yozuv="To‘g‘ri" rang="togri" />
        <StatBlok son={29} yozuv="Xato" rang="xato" />
        <StatBlok son={1215} yozuv="Qolgan" rang="qolgan" />
      </div>
      <div className="ilv-karta-tor">
        <IlovaKarta sarlavha="Real imtihon" ikonka={<Svetofor />} onClick={bos} />
        <IlovaKarta sarlavha="Biletlar" ikonka={<Chipta />} onClick={bos} />
        <IlovaKarta sarlavha="Mavzular" ikonka={<Papka />} onClick={bos} />
        <IlovaKarta sarlavha="Yo‘l belgilari" ikonka={<YolBelgisi />} onClick={bos} />
        <IlovaKarta sarlavha="Xatolarni tuzatish" ikonka={<SinganYurak />} belgi={{ matn: 27, rang: 'qizil' }} onClick={bos} />
        <IlovaKarta sarlavha="Bellashuv" fon={{ animatsiya: oktagon, kadr: oktagonKadr }} onClick={bos} />
      </div>

      {/* Testlar ekrani bo'laklari — birinchi ekrandan (844px) pastda, solishtirishga xalaqit bermasin */}
      <div aria-hidden="true" style={{ height: 120 }} />
      <div data-korik="testlar-tepa">
        <TepaQator ong={<QidiruvTugma onClick={bos} />} />
      </div>
      {/* Sinflar bilan qo'lda yozilgan variant (lucide Zap) — KunChip bilan deyarli bir xil chiqishi kerak */}
      <div data-korik="chip-lucide" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="ilv-chip" onClick={bos} aria-label="Faollik seriyasi: 0 kun">
          <Zap />
          <span>0 kun</span>
        </button>
      </div>
      <div className="ilv-karta-tor" data-korik="testlar">
        <IlovaKarta tur="test" sarlavha="Barcha testlar" ikonka={<Hujjat />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="50/100 talik" ikonka={<Royxat />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Shablon testlar" ikonka={<Qatlamlar />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Raqamli savollar" ikonka={<Panjara />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Chalg‘ituvchi" ikonka={<Undov />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Saralangan" ikonka={<Bayroqcha />} belgi={{ matn: 1, rang: 'yashil' }} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Xatolarim" ikonka={<SinganYurak />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Avtodrom" ikonka={<Mashina />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha="Darslik" ikonka={<Shapka />} onClick={bos} />
        <IlovaKarta tur="test" sarlavha={'Sizga\nsavol bor'} ikonka={<SavolPufak />} onClick={bos} />
      </div>
    </Ekran>
  );
}
