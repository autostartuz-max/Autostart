import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { TarifLogo } from './Logolar';
import {
  IMKONIYAT_NOMI, IMKONIYAT_TARIF, TARIFLAR_ZAXIRA, TARIF_TAKLIF, narxMatn, type Imkoniyat,
} from './holat';
import './tarif.css';

/**
 * "Bu imkoniyat tarifda" oynasi. Istalgan joydan tarifTaklif('video') bilan ochiladi (holat.ts);
 * App ichida bitta nusxa turadi (ilova va sayt). "Tariflarni ko'rish" — /tariflar sahifasi.
 */
export default function TarifTaklif() {
  const nav = useNavigate();
  const [imk, setImk] = useState<Imkoniyat | null>(null);

  useEffect(() => {
    const och = (e: Event) => setImk(((e as CustomEvent).detail?.imkoniyat as Imkoniyat) || null);
    window.addEventListener(TARIF_TAKLIF, och);
    return () => window.removeEventListener(TARIF_TAKLIF, och);
  }, []);

  // Telefonning "orqaga" tugmasi avval oynani yopadi
  useEffect(() => {
    if (!imk) return;
    const orqaga = (e: Event) => { e.preventDefault(); setImk(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setImk(null); };
    window.addEventListener('ilova:orqaga', orqaga);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('ilova:orqaga', orqaga);
      window.removeEventListener('keydown', esc);
    };
  }, [imk]);

  if (!imk) return null;
  const kod = IMKONIYAT_TARIF[imk];
  const t = TARIFLAR_ZAXIRA.find((x) => x.kod === kod)!;
  const yop = () => setImk(null);

  return (
    <div className="tf-oyna-fon" onClick={yop}>
      <div className="tf-oyna" role="dialog" aria-modal="true" aria-label={IMKONIYAT_NOMI[imk]} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tf-oyna-x" onClick={yop} aria-label="Yopish"><X aria-hidden="true" /></button>
        <TarifLogo kod={kod} size={76} />
        <h2>{IMKONIYAT_NOMI[imk]}</h2>
        <p>Bu imkoniyat <b>{t.nom}</b> tarifidan boshlab ochiladi. Har bo‘limdan bittasi namuna sifatida bepul.</p>
        <ul>
          {t.imkoniyatlar.map((m) => (
            <li key={m}><Check aria-hidden="true" /><span>{m}</span></li>
          ))}
        </ul>
        <div className="tf-narx"><b>{narxMatn(t.narx)}</b><span>/ {t.oy} oy</span></div>
        <button type="button" className="tf-tugma" onClick={() => { yop(); nav('/tariflar'); }}>Tariflarni ko‘rish</button>
        <button type="button" className="tf-oyna-keyin" onClick={yop}>Keyinroq</button>
      </div>
    </div>
  );
}
