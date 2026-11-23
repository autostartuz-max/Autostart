import { useNavigate } from 'react-router-dom';
import { useOrqaga, orqagaYozuvi } from '../orqaga';
import { canManageQuestions, hasAdmin } from '../api';
import { tarifTaklif, useTarif, IMKONIYAT_DARAJA } from '../tarif/holat';
import { TOIFALAR, belgiRasmUrl, guruhRaqami, useBelgilar, type BelgiQator } from '../belgilar/katalog';

/** Bir xil nomli ketma-ket belgilar (1.4.1 — 1.4.6) — bitta qator */
function guruhla(bb: BelgiQator[]): BelgiQator[][] {
  const gg: BelgiQator[][] = [];
  for (const b of bb) {
    const oxirgi = gg[gg.length - 1];
    if (oxirgi && oxirgi[0].nom === b.nom) oxirgi.push(b);
    else gg.push([b]);
  }
  return gg;
}

/**
 * Saytdagi "Yo'l belgilari" — Yo'l harakati qoidalari (172-son qaror) 1-ilovasidagi barcha belgilar,
 * toifalar bo'yicha (ilovada screens/ilova/Belgilar.tsx). Ro'yxat serverdan — admin /belgilar/boshqaruv da o'zgartiradi.
 */
export default function Signs() {
  const nav = useNavigate();
  const orqaga = useOrqaga();
  const belgilar = useBelgilar();
  const admin = canManageQuestions() || hasAdmin();
  // Yo'l belgilari — Standart tarifdan; birinchi bo'lim namuna sifatida hammaga ochiq
  const tarif = useTarif();
  const ochiq = tarif.daraja >= IMKONIYAT_DARAJA.belgilar;
  return (
    <div>
      <button className="back" onClick={orqaga}>← {orqagaYozuvi()}</button>
      <div className="h2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        Yo‘l belgilari
        {admin && (
          <button className="back" style={{ margin: 0 }} onClick={() => nav('/belgilar/boshqaruv')}>✎ Boshqarish</button>
        )}
      </div>
      {TOIFALAR.map((t, ti) => (
        <section key={t.n}>
          <div className="h2" style={{ fontSize: 17, marginTop: 18 }}>{t.n}. {t.nom}</div>
          {!ochiq && ti > 0 ? (
            <button className="back" style={{ margin: '4px 0 0' }} onClick={() => tarifTaklif('belgilar')}>
              🔒 Bu bo‘lim Standart tarifida — tariflarni ko‘rish
            </button>
          ) : (
          <div className="list">
            {guruhla(belgilar.filter((b) => b.toifa === t.n)).map((gr) => {
              const b = gr[0];
              const rasm = gr.find((x) => x.rasm)?.rasm;
              return (
                <div key={(b.id ?? b.raqam) + ':' + b.nom} className="sign">
                  <div className="sic">{rasm ? <img src={belgiRasmUrl(rasm)} width={44} alt="" loading="lazy" /> : '⚠️'}</div>
                  <div>
                    {guruhRaqami(gr) && <div className="scat">{guruhRaqami(gr)}</div>}
                    <div className="sname">{b.nom}</div>
                    {b.tavsif && <div className="sdesc">{b.tavsif}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </section>
      ))}
    </div>
  );
}
