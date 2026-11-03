import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { Me } from '../../types';
import PastkiOyna from '../../components/PastkiOyna';
import Ekran from '../../ilova/komponentlar/Ekran';
import TepaQator, { QidiruvTugma } from '../../ilova/komponentlar/TepaQator';
import IlovaKarta from '../../ilova/komponentlar/IlovaKarta';
import {
  Bayroqcha, Hujjat, Mashina, Panjara, Qatlamlar, Royxat, SavolPufak, Shapka, SinganYurak, Undov,
} from '../../ilova/ikonkalar';
import { testTili } from '../Home';
import '../../ilova/ekranlar.css';

// Random test uchun savol soni (server bir so'rovda 200 tagacha beradi)
const SONLAR = [50, 100, 200, 500];

/** Ilova: Testlar ekrani (pastki menyudagi "Testlar"). Namuna — "variant-6", o'ngdagi telefon. */
export default function TestlarIlova() {
  const nav = useNavigate();
  const [saralangan, setSaralangan] = useState(0);
  // "50/100 talik" darhol test ochmaydi — savol sonini so'raydi
  const [soniOyna, setSoniOyna] = useState(false);

  useEffect(() => {
    api.me().then((m: Me) => setSaralangan(m.stats.bookmarks ?? 0)).catch(() => {});
  }, []);

  const randomBoshla = (n: number) => {
    setSoniOyna(false);
    nav(`/test?mode=random&limit=${n}&exam=1&lang=${testTili()}&shuffle=0`);
  };

  return (
    <Ekran faol="testlar">
      <TepaQator ong={<QidiruvTugma onClick={() => nav('/mavzular')} />} />
      <h1 className="ilv-ekran-sarlavha">Testlar</h1>
      <div className="ilv-karta-tor">
        <IlovaKarta tur="test" sarlavha="Barcha testlar" ikonka={<Hujjat />} onClick={() => nav('/test?mode=all')} />
        <IlovaKarta tur="test" sarlavha="50/100 talik" ikonka={<Royxat />} onClick={() => setSoniOyna(true)} />
        <IlovaKarta tur="test" sarlavha="Shablon testlar" ikonka={<Qatlamlar />} onClick={() => nav('/shablon')} />
        <IlovaKarta tur="test" sarlavha="Raqamli savollar" ikonka={<Panjara />} onClick={() => nav('/test?mode=numeric')} />
        <IlovaKarta tur="test" sarlavha="Chalg‘ituvchi" ikonka={<Undov />} onClick={() => nav('/test?mode=tricky')} />
        <IlovaKarta
          tur="test"
          sarlavha="Saralangan"
          ikonka={<Bayroqcha />}
          belgi={{ matn: saralangan, rang: 'yashil' }}
          onClick={() => nav('/test?mode=saved')}
        />
        <IlovaKarta tur="test" sarlavha="Xatolarim" ikonka={<SinganYurak />} onClick={() => nav('/xatolarim')} />
        {/* Avtodrom — amaliy mashg'ulot videolari; Darslik — nazariy darslar (hali tayyor emas) */}
        <IlovaKarta tur="test" sarlavha="Avtodrom" ikonka={<Mashina />} onClick={() => nav('/amaliy')} />
        <IlovaKarta tur="test" sarlavha="Darslik" ikonka={<Shapka />} onClick={() => nav('/darslik')} />
        {/* Namunada "Sizga" dan keyin yangi qator */}
        <IlovaKarta tur="test" sarlavha={'Sizga\nsavol bor'} ikonka={<SavolPufak />} onClick={() => nav('/aloqa')} />
      </div>

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
