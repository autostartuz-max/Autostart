import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useOrqaga } from '../../orqaga';
import { ilovaEkrani } from '../../native';
import PastkiOyna from '../../components/PastkiOyna';
import { BELGILAR, TOIFALAR, belgiRasm, type Belgi } from '../../belgilar/katalog';
import '../../ilova/tema.css';
import '../../ilova/belgilar.css';

/** Ro'yxatdagi bitta belgi: guruhli yozuvlar (1.4.1 — 1.4.6) har bir raqami alohida karta */
interface Karta { kalit: string; raqam: string; fayl: string | null; belgi: Belgi }
const kartalar = (bb: Belgi[]): Karta[] =>
  bb.flatMap((b) => b.rasmlar.map((r) => ({ kalit: b.toifa + ':' + r.raqam, raqam: r.raqam, fayl: r.fayl, belgi: b })));
/** Taniqlik belgilarining rasmiy raqami yo'q (ichki T1, T2…) — ko'rsatilmaydi */
const raqamKorinadi = (raqam: string) => !/^T\d/.test(raqam);
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, "'");

/** Belgi rasmi; rasm yo'q bo'lsa — raqami yozilgan o'rinbosar */
function Rasm({ fayl, raqam, katta }: { fayl: string | null; raqam: string; katta?: boolean }) {
  return fayl
    ? <img className={'ilv-bl-img' + (katta ? ' katta' : '')} src={belgiRasm(fayl)} alt="" loading="lazy" decoding="async" />
    : <span className={'ilv-bl-yoq' + (katta ? ' katta' : '')} aria-hidden="true">{raqam}</span>;
}

function BelgiKartalari({ royxat, onOch }: { royxat: Karta[]; onOch: (k: Karta) => void }) {
  return (
    <div className="ilv-bl-tor">
      {royxat.map((k) => (
        <button key={k.kalit} type="button" className="ilv-bl-karta" onClick={() => onOch(k)}>
          <span className="ilv-bl-rasm-joy"><Rasm fayl={k.fayl} raqam={k.raqam} /></span>
          {raqamKorinadi(k.raqam) && <span className="ilv-bl-raqam">{k.raqam}</span>}
          <span className="ilv-bl-nom">{k.belgi.nom}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Ilova: "Yo'l belgilari" (/belgilar). Avval toifalar (2 ustunli kartalar: belgi, nomi, soni),
 * toifa bosilganda — /belgilar?toifa=N: shu toifadagi belgilar 3 ustunda. Belgi bosilsa — katta
 * rasm va qoidadagi tavsif. Qidiruv barcha toifalardan izlaydi.
 */
export default function BelgilarIlova() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const toifaN = Number(sp.get('toifa')) || 0;
  const toifa = TOIFALAR.find((t) => t.n === toifaN) || null;
  const orqaga = useOrqaga();
  const toifalargaQayt = useOrqaga('/belgilar');
  const [qidiruv, setQidiruv] = useState('');
  const [ochiq, setOchiq] = useState<Karta | null>(null);

  // Telefonning tepa/pastki chizig'i ham ekran rangida (Bosh sahifa va boshqa yangi ekranlardagidek)
  useEffect(() => {
    ilovaEkrani(true);
    return () => ilovaEkrani(false);
  }, []);
  // Toifa almashganda sahifa boshidan
  useEffect(() => { document.querySelector('.ilv-bl')?.scrollTo(0, 0); }, [toifaN]);

  const q = norm(qidiruv.trim());
  const topilgan = useMemo(
    () => (q ? kartalar(BELGILAR.filter((b) => norm(b.nom).includes(q) || b.raqam.includes(q) || norm(b.tavsif).includes(q))) : []),
    [q],
  );
  const toifaKartalari = useMemo(() => (toifa ? kartalar(BELGILAR.filter((b) => b.toifa === toifa.n)) : []), [toifa]);

  return (
    <div className="ilv ilv-bl">
      <header className="ilv-bl-tepa">
        <button type="button" className="ilv-bl-orqaga" onClick={toifa ? toifalargaQayt : orqaga} aria-label="Orqaga">
          <ChevronLeft aria-hidden="true" />
        </button>
        <h1 className={'ilv-bl-sarlavha' + (toifa ? ' kichik' : '')}>{toifa ? toifa.nom : 'Yo‘l belgilari'}</h1>
      </header>

      {toifa ? (
        <>
          {toifa.tavsif && <p className="ilv-bl-toifa-tavsif">{toifa.tavsif.split('\n')[0]}</p>}
          <BelgiKartalari royxat={toifaKartalari} onOch={setOchiq} />
        </>
      ) : (
        <>
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

          {q ? (
            <>
              <p className="ilv-bl-toifa-tavsif">{topilgan.length ? `Topildi: ${topilgan.length} ta belgi` : 'Hech narsa topilmadi'}</p>
              <BelgiKartalari royxat={topilgan} onOch={setOchiq} />
            </>
          ) : (
            <div className="ilv-bl-toifalar">
              {TOIFALAR.map((t) => {
                const kk = kartalar(BELGILAR.filter((b) => b.toifa === t.n));
                const belgi = kk.find((k) => k.fayl);
                return (
                  <button key={t.n} type="button" className="ilv-bl-toifa" onClick={() => nav(`/belgilar?toifa=${t.n}`)}>
                    <span className="ilv-bl-toifa-rasm">{belgi && <Rasm fayl={belgi.fayl} raqam={belgi.raqam} />}</span>
                    <span className="ilv-bl-toifa-nom">{t.nom}</span>
                    <span className="ilv-bl-toifa-son">{kk.length} ta</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {ochiq && (
        <PastkiOyna
          title={ochiq.belgi.nom}
          subtitle={raqamKorinadi(ochiq.raqam) ? ochiq.belgi.raqam : TOIFALAR.find((t) => t.n === ochiq.belgi.toifa)?.nom}
          onClose={() => setOchiq(null)}
        >
          <div className="bl-oyna">
            <div className={'ilv-bl-oyna-rasmlar' + (ochiq.belgi.rasmlar.length > 1 ? ' kop' : '')}>
              {ochiq.belgi.rasmlar.map((r) => (
                <figure key={r.raqam} className={'ilv-bl-oyna-rasm' + (r.raqam === ochiq.raqam ? ' tanlangan' : '')}>
                  <Rasm fayl={r.fayl} raqam={r.raqam} katta />
                  {ochiq.belgi.rasmlar.length > 1 && <figcaption>{r.raqam}</figcaption>}
                </figure>
              ))}
            </div>
            {ochiq.belgi.tavsif
              ? ochiq.belgi.tavsif.split('\n').map((x, i) => <p key={i} className="ilv-bl-tavsif">{x}</p>)
              : <p className="ilv-bl-tavsif ilv-bl-tavsif-yoq">Qoidalarda alohida izoh berilmagan.</p>}
          </div>
        </PastkiOyna>
      )}
    </div>
  );
}
