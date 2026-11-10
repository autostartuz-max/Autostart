import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useOrqaga } from '../../orqaga';
import { ilovaEkrani } from '../../native';
import PastkiOyna from '../../components/PastkiOyna';
import { BELGILAR, TOIFALAR, belgiRasm, type Belgi } from '../../belgilar/katalog';
import '../../ilova/tema.css';
import '../../ilova/belgilar.css';

/** Belgi rasmi; rasm yo'q bo'lsa — raqami yozilgan o'rinbosar */
function Rasm({ fayl, raqam, katta }: { fayl: string | null; raqam: string; katta?: boolean }) {
  return fayl
    ? <img className={'ilv-bl-img' + (katta ? ' katta' : '')} src={belgiRasm(fayl)} alt="" loading="lazy" decoding="async" />
    : <span className={'ilv-bl-yoq' + (katta ? ' katta' : '')} aria-hidden="true">{raqam}</span>;
}

/**
 * Ilova: "Yo'l belgilari" (/belgilar). Qoidalardagi barcha belgilar toifalar bo'yicha: yuqorida
 * toifa tanlanadi, ro'yxat 3 ustunli; belgi bosilsa — katta rasm, raqam, nom va qoidadagi tavsif.
 */
export default function BelgilarIlova() {
  const orqaga = useOrqaga();
  const [toifa, setToifa] = useState(TOIFALAR[0]?.n ?? 1);
  const [qidiruv, setQidiruv] = useState('');
  const [ochiq, setOchiq] = useState<Belgi | null>(null);
  // Telefonning tepa/pastki chizig'i ham ekran rangida (Bosh sahifa va boshqa yangi ekranlardagidek)
  useEffect(() => {
    ilovaEkrani(true);
    return () => ilovaEkrani(false);
  }, []);

  const q = qidiruv.trim().toLowerCase().replace(/[ʻʼ'`’]/g, "'");
  const korinadigan = useMemo(() => {
    if (!q) return BELGILAR.filter((b) => b.toifa === toifa);
    const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’]/g, "'");
    return BELGILAR.filter((b) => norm(b.nom).includes(q) || b.raqam.includes(q) || norm(b.tavsif).includes(q));
  }, [q, toifa]);
  const toifaMalumot = TOIFALAR.find((t) => t.n === toifa);

  return (
    <div className="ilv ilv-bl">
      <header className="ilv-bl-tepa">
        <button type="button" className="ilv-bl-orqaga" onClick={orqaga} aria-label="Orqaga">
          <ChevronLeft aria-hidden="true" />
        </button>
        <h1 className="ilv-bl-sarlavha">Yo‘l belgilari</h1>
      </header>

      <label className="ilv-bl-qidiruv">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={qidiruv}
          onChange={(e) => setQidiruv(e.target.value)}
          placeholder="Belgi nomi yoki raqami"
          aria-label="Belgini qidirish"
        />
        {qidiruv && (
          <button type="button" className="ilv-bl-tozala" onClick={() => setQidiruv('')} aria-label="Qidiruvni tozalash">
            <X aria-hidden="true" />
          </button>
        )}
      </label>

      {!q && (
        <nav className="ilv-bl-toifalar" aria-label="Belgilar toifalari">
          {TOIFALAR.map((t) => (
            <button
              key={t.n}
              type="button"
              className={'ilv-bl-toifa' + (t.n === toifa ? ' faol' : '')}
              aria-pressed={t.n === toifa}
              onClick={() => setToifa(t.n)}
            >
              {t.nom.replace(/ belgilari?$/i, '')}
              <span className="ilv-bl-son">{BELGILAR.filter((b) => b.toifa === t.n).length}</span>
            </button>
          ))}
        </nav>
      )}

      {!q && toifaMalumot?.tavsif && <p className="ilv-bl-toifa-tavsif">{toifaMalumot.tavsif.split('\n')[0]}</p>}
      {q && <p className="ilv-bl-toifa-tavsif">{korinadigan.length ? `Topildi: ${korinadigan.length} ta belgi` : 'Hech narsa topilmadi'}</p>}

      <div className="ilv-bl-tor">
        {korinadigan.map((b) => (
          <button key={b.toifa + ':' + b.raqam} type="button" className="ilv-bl-karta" onClick={() => setOchiq(b)}>
            <span className="ilv-bl-rasm-joy">
              <Rasm fayl={b.rasmlar.find((r) => r.fayl)?.fayl ?? null} raqam={b.rasmlar[0]?.raqam || b.raqam} />
            </span>
            <span className="ilv-bl-raqam">{b.raqam}</span>
            <span className="ilv-bl-nom">{b.nom}</span>
          </button>
        ))}
      </div>

      {ochiq && (
        <PastkiOyna title={ochiq.nom} subtitle={ochiq.raqam} onClose={() => setOchiq(null)}>
          <div className="bl-oyna">
            <div className={'ilv-bl-oyna-rasmlar' + (ochiq.rasmlar.length > 1 ? ' kop' : '')}>
              {ochiq.rasmlar.map((r) => (
                <figure key={r.raqam} className="ilv-bl-oyna-rasm">
                  <Rasm fayl={r.fayl} raqam={r.raqam} katta />
                  {ochiq.rasmlar.length > 1 && <figcaption>{r.raqam}</figcaption>}
                </figure>
              ))}
            </div>
            {ochiq.tavsif
              ? ochiq.tavsif.split('\n').map((x, i) => <p key={i} className="ilv-bl-tavsif">{x}</p>)
              : <p className="ilv-bl-tavsif ilv-bl-tavsif-yoq">Qoidalarda alohida izoh berilmagan.</p>}
          </div>
        </PastkiOyna>
      )}
    </div>
  );
}
