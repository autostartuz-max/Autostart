import { useNavigate } from 'react-router-dom';
import Ekran from '../../ilova/komponentlar/Ekran';
import TepaQator, { QidiruvTugma } from '../../ilova/komponentlar/TepaQator';
import IlovaKarta from '../../ilova/komponentlar/IlovaKarta';
import { Mashina, Papka, Shapka, YolBelgisi } from '../../ilova/ikonkalar';
import '../../ilova/ekranlar.css';

/**
 * Ilova: O'rganish ekrani (pastki menyudagi "O‘rganish"). Namunada yo'q — Testlar ekranining
 * ko'rinishida: logotip + qidiruv, sariq sarlavha va 2 ustunli kartochkalar.
 */
export default function OrganishIlova() {
  const nav = useNavigate();
  return (
    <Ekran faol="organish">
      <TepaQator ong={<QidiruvTugma onClick={() => nav('/mavzular')} />} />
      <h1 className="ilv-ekran-sarlavha">O‘rganish</h1>
      <div className="ilv-karta-tor">
        <IlovaKarta tur="test" sarlavha="Darslik" ikonka={<Shapka />} onClick={() => nav('/amaliy')} />
        <IlovaKarta tur="test" sarlavha="Mavzular" ikonka={<Papka />} onClick={() => nav('/mavzular')} />
        <IlovaKarta tur="test" sarlavha="Yo‘l belgilari" ikonka={<YolBelgisi />} onClick={() => nav('/belgilar')} />
        <IlovaKarta tur="test" sarlavha="Avtodrom" ikonka={<Mashina />} onClick={() => nav('/avtodrom')} />
      </div>
    </Ekran>
  );
}
