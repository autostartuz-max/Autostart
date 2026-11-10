import { useOrqaga, orqagaYozuvi } from '../orqaga';
import { BELGILAR, TOIFALAR, belgiRasm } from '../belgilar/katalog';

/**
 * Saytdagi "Yo'l belgilari" — Yo'l harakati qoidalari (172-son qaror) 1-ilovasidagi barcha belgilar,
 * toifalar bo'yicha (ilovada screens/ilova/Belgilar.tsx).
 */
export default function Signs() {
  const orqaga = useOrqaga();
  return (
    <div>
      <button className="back" onClick={orqaga}>← {orqagaYozuvi()}</button>
      <div className="h2">Yo‘l belgilari</div>
      {TOIFALAR.map((t) => (
        <section key={t.n}>
          <div className="h2" style={{ fontSize: 17, marginTop: 18 }}>{t.n}. {t.nom}</div>
          <div className="list">
            {BELGILAR.filter((b) => b.toifa === t.n).map((b) => {
              const fayl = b.rasmlar.find((r) => r.fayl)?.fayl;
              return (
                <div key={b.raqam} className="sign">
                  <div className="sic">{fayl ? <img src={belgiRasm(fayl)} width={44} alt="" loading="lazy" /> : '⚠️'}</div>
                  <div>
                    <div className="scat">{b.raqam}</div>
                    <div className="sname">{b.nom}</div>
                    {b.tavsif && <div className="sdesc">{b.tavsif}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
