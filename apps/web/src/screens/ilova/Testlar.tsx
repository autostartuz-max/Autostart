import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, oxirgiJavob } from '../../api';
import type { Me } from '../../types';
import Ekran from '../../ilova/komponentlar/Ekran';
import TepaQator, { QidiruvTugma } from '../../ilova/komponentlar/TepaQator';
import IlovaKarta from '../../ilova/komponentlar/IlovaKarta';
import { Bayroqcha, Hujjat, Panjara, Qatlamlar, SinganYurak, Undov } from '../../ilova/ikonkalar';
import '../../ilova/ekranlar.css';

/**
 * Ilova: Testlar ekrani (pastki menyudagi "Testlar"). Namuna — "variant-6", o'ngdagi telefon.
 * "50/100 talik" va "Sizga savol bor" Bosh sahifada; Darslik va Avtodrom — O'rganish bo'limida.
 */
export default function TestlarIlova() {
  const nav = useNavigate();
  // Oxirgi ma'lum son darhol, yangisi serverdan orqada
  const [saralangan, setSaralangan] = useState(() => oxirgiJavob<Me>('me')?.stats?.bookmarks ?? 0);

  useEffect(() => {
    api.me().then((m: Me) => setSaralangan(m.stats.bookmarks ?? 0)).catch(() => {});
  }, []);

  return (
    <Ekran faol="testlar">
      <TepaQator ong={<QidiruvTugma onClick={() => nav('/mavzular')} />} />
      <h1 className="ilv-ekran-sarlavha">Testlar</h1>
      <div className="ilv-karta-tor">
        <IlovaKarta tur="test" sarlavha="Barcha testlar" ikonka={<Hujjat />} onClick={() => nav('/test?mode=all')} />
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
      </div>
    </Ekran>
  );
}
