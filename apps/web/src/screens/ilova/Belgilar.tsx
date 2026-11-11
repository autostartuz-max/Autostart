import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useOrqaga } from '../../orqaga';
import { ilovaEkrani } from '../../native';
import PastkiOyna from '../../components/PastkiOyna';
import {
  TOIFALAR, belgiRasmUrl, guruhRaqami, guruhi, raqamKorinadi, useBelgilar, type BelgiQator,
} from '../../belgilar/katalog';
import '../../ilova/tema.css';
import '../../ilova/belgilar.css';

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, "'");
const kalit = (b: BelgiQator, i: number) => (b.id != null ? 'b' + b.id : `${b.toifa}:${b.raqam}:${i}`);

/** Belgi rasmi; rasm yo'q (yoki yuklanmasa) — raqami yozilgan o'rinbosar */
function Rasm({ rasm, raqam, katta }: { rasm: string | null; raqam: string; katta?: boolean }) {
  const [xato, setXato] = useState(false);
  return rasm && !xato
    ? <img className={'ilv-bl-img' + (katta ? ' katta' : '')} src={belgiRasmUrl(rasm)} alt="" loading="lazy" decoding="async" onError={() => setXato(true)} />
    : <span className={'ilv-bl-yoq' + (katta ? ' katta' : '')} aria-hidden="true">{raqamKorinadi(raqam) ? raqam : ''}</span>;
}

function BelgiKartalari({ royxat, onOch }: { royxat: BelgiQator[]; onOch: (b: BelgiQator) => void }) {
  return (
    <div className="ilv-bl-tor">
      {royxat.map((b, i) => (
        <button key={kalit(b, i)} type="button" className="ilv-bl-karta" onClick={() => onOch(b)}>
          <span className="ilv-bl-rasm-joy"><Rasm rasm={b.rasm} raqam={b.raqam} /></span>
          {raqamKorinadi(b.raqam) && <span className="ilv-bl-raqam">{b.raqam}</span>}
          <span className="ilv-bl-nom">{b.nom}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Ilova: "Yo'l belgilari" (/belgilar). Avval toifalar (2 ustunli kartalar: belgi, nomi, soni),
 * toifa bosilganda — /belgilar?toifa=N: shu toifadagi belgilar 3 ustunda. Belgi bosilsa — katta
 * rasm va qoidadagi tavsif. Qidiruv barcha toifalardan izlaydi.
 * Ro'yxat serverdan (admin qo'shgan/tahrirlaganlari bilan); internet bo'lmasa — ichki nusxa.
 */
export default function BelgilarIlova() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const toifaN = Number(sp.get('toifa')) || 0;
  const toifa = TOIFALAR.find((t) => t.n === toifaN) || null;
  const orqaga = useOrqaga();
  const toifalargaQayt = useOrqaga('/belgilar');
  const [qidiruv, setQidiruv] = useState('');
  const [ochiq, setOchiq] = useState<BelgiQator | null>(null);
  const belgilar = useBelgilar();

  // Telefonning tepa/pastki chizig'i ham ekran rangida (Bosh sahifa va boshqa yangi ekranlardagidek)
  useEffect(() => {
    ilovaEkrani(true);
    return () => ilovaEkrani(false);
  }, []);
  // Toifa almashganda sahifa boshidan
  useEffect(() => { document.querySelector('.ilv-bl')?.scrollTo(0, 0); }, [toifaN]);

  const q = norm(qidiruv.trim());
  const topilgan = useMemo(
    () => (q ? belgilar.filter((b) => norm(b.nom).includes(q) || b.raqam.includes(q) || norm(b.tavsif).includes(q)) : []),
    [q, belgilar],
  );
  const toifaBelgilari = useMemo(() => (toifa ? belgilar.filter((b) => b.toifa === toifa.n) : []), [toifa, belgilar]);
  const ochiqGuruh = ochiq ? guruhi(belgilar, ochiq) : [];

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
          <BelgiKartalari royxat={toifaBelgilari} onOch={setOchiq} />
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
                const bb = belgilar.filter((b) => b.toifa === t.n);
                const namuna = bb.find((b) => b.rasm);
                return (
                  <button key={t.n} type="button" className="ilv-bl-toifa" onClick={() => nav(`/belgilar?toifa=${t.n}`)}>
                    <span className="ilv-bl-toifa-rasm">{namuna && <Rasm rasm={namuna.rasm} raqam={namuna.raqam} />}</span>
                    <span className="ilv-bl-toifa-nom">{t.nom}</span>
                    <span className="ilv-bl-toifa-son">{bb.length} ta</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {ochiq && (
        <PastkiOyna
          title={ochiq.nom}
          subtitle={guruhRaqami(ochiqGuruh) || TOIFALAR.find((t) => t.n === ochiq.toifa)?.nom}
          onClose={() => setOchiq(null)}
        >
          <div className="bl-oyna">
            <div className={'ilv-bl-oyna-rasmlar' + (ochiqGuruh.length > 1 ? ' kop' : '')}>
              {ochiqGuruh.map((b, i) => (
                <figure key={kalit(b, i)} className={'ilv-bl-oyna-rasm' + (b.raqam === ochiq.raqam && b.id === ochiq.id ? ' tanlangan' : '')}>
                  <Rasm rasm={b.rasm} raqam={b.raqam} katta />
                  {ochiqGuruh.length > 1 && raqamKorinadi(b.raqam) && <figcaption>{b.raqam}</figcaption>}
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
