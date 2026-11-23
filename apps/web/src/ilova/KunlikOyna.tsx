import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarX2, X } from 'lucide-react';
import { api, oxirgiJavob, type IlovaMatnlar } from '../api';
import { TarifLogo } from '../tarif/Logolar';
import { TARIF_NOMI, tarifHolati, type TarifKod } from '../tarif/holat';
import { kunKaliti } from '../components/ImtihonSanasi';
import type { Me } from '../types';
import '../tarif/tarif.css';
import './kunlik.css';

const KALIT = 'yhq_kunlik_oyna';
const KUN_SOZ = ['', 'bir', 'ikki', 'uch', 'to‘rt', 'besh', 'olti', 'yetti', 'sakkiz', 'to‘qqiz', 'o‘n'];
const TARIF_NAVBAT: TarifKod[] = ['standart', 'silver', 'premium'];

/** 1970-yildan beri nechanchi kun (mahalliy) — har kuni almashadigan tanlovlar uchun */
export const kunIndeksi = () => {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400_000);
};

type Oyna =
  | { tur: 'bayram'; nom: string; matn: string }
  | { tur: 'otkazish'; matn: string }
  | { tur: 'reklama'; matn: string; tarif: TarifKod };

/**
 * Kunlik oyna (ilova va sayt, faqat bosh sahifada, kuniga ko'pi bilan bitta):
 *   1) bayram kuni — tabrik;
 *   2) bir yoki bir necha kun test yechilmagan bo'lsa — "Siz bir kun o'tkazib yubordingiz…";
 *   3) tarifsiz foydalanuvchiga — yopiladigan tarif reklamasi (tarif nomi har kuni almashadi).
 * Matnlarni admin /tariflar/boshqaruv → "Ilova matnlari" da o'zgartiradi.
 */
export default function KunlikOyna() {
  const loc = useLocation();
  const nav = useNavigate();
  const [oyna, setOyna] = useState<Oyna | null>(null);
  const tekshirildi = useRef(false);

  useEffect(() => {
    if (loc.pathname !== '/' || tekshirildi.current) return;
    const bugun = kunKaliti(new Date());
    try {
      if (localStorage.getItem(KALIT) === bugun) return;
    } catch { return; }
    tekshirildi.current = true;
    let bekor = false;
    // Bosh sahifa chizilib, /me kelib bo'lsin
    const t = window.setTimeout(async () => {
      const [me, matnlar] = await Promise.all([
        oxirgiJavob<Me>('me') ? Promise.resolve(oxirgiJavob<Me>('me')) : api.me().catch(() => null),
        api.matnlar().catch(() => null as IlovaMatnlar | null),
      ]);
      if (bekor || !matnlar) return;
      const oyKun = bugun.slice(5);
      const bayram = matnlar.bayramlar.find((b) => b.sana === bugun || b.sana === oyKun);
      const otk = Math.max(0, Number((me as Me | null)?.otkazilgan) || 0);
      let tanlangan: Oyna | null = null;
      if (bayram) tanlangan = { tur: 'bayram', nom: bayram.nom, matn: bayram.matn };
      else if (otk >= 1) {
        const soz = otk <= 10 ? KUN_SOZ[otk] : String(otk);
        tanlangan = { tur: 'otkazish', matn: matnlar.otkazish.replace(/\{kun\}/g, soz) };
      } else if (tarifHolati().daraja === 0 && ((me as Me | null)?.tarif?.daraja ?? 0) === 0) {
        const tarif = TARIF_NAVBAT[kunIndeksi() % TARIF_NAVBAT.length];
        tanlangan = { tur: 'reklama', tarif, matn: matnlar.reklama.replace(/\{tarif\}/g, TARIF_NOMI[tarif]) };
      }
      if (!tanlangan) return;
      try { localStorage.setItem(KALIT, bugun); } catch { /* ignore */ }
      setOyna(tanlangan);
    }, 1500);
    return () => { bekor = true; window.clearTimeout(t); tekshirildi.current = false; };
  }, [loc.pathname]);

  // Boshqa sahifaga o'tilsa yopiladi; telefonning "orqaga" tugmasi ham yopadi
  useEffect(() => {
    if (!oyna) return;
    const orqaga = (e: Event) => { e.preventDefault(); setOyna(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOyna(null); };
    window.addEventListener('ilova:orqaga', orqaga);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('ilova:orqaga', orqaga);
      window.removeEventListener('keydown', esc);
    };
  }, [oyna]);
  useEffect(() => { if (loc.pathname !== '/') setOyna(null); }, [loc.pathname]);

  if (!oyna) return null;
  const yop = () => setOyna(null);

  return (
    <div className="tf-oyna-fon" onClick={yop}>
      <div className={'tf-oyna ko-oyna ko-' + oyna.tur} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tf-oyna-x" onClick={yop} aria-label="Yopish"><X aria-hidden="true" /></button>
        {oyna.tur === 'bayram' && (
          <>
            <div className="ko-bayram-belgi" aria-hidden="true">
              <span>🎉</span>
              {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}
            </div>
            <h2>{oyna.nom || 'Bayramingiz muborak!'}</h2>
            <p className="ko-matn">{oyna.matn}</p>
            <button type="button" className="tf-tugma" onClick={yop}>Rahmat!</button>
          </>
        )}
        {oyna.tur === 'otkazish' && (
          <>
            <div className="ko-belgi" aria-hidden="true"><CalendarX2 /></div>
            <h2>Sizni sog‘indik!</h2>
            <p className="ko-matn">{oyna.matn}</p>
            <button type="button" className="tf-tugma" onClick={() => { yop(); nav('/test?mode=practice'); }}>Testni davom ettirish</button>
            <button type="button" className="tf-oyna-keyin" onClick={yop}>Keyinroq</button>
          </>
        )}
        {oyna.tur === 'reklama' && (
          <>
            <TarifLogo kod={oyna.tarif} size={78} />
            <h2>{TARIF_NOMI[oyna.tarif]} tarifi</h2>
            <p className="ko-matn">{oyna.matn}</p>
            <button type="button" className="tf-tugma" onClick={() => { yop(); nav('/tariflar'); }}>Tariflarni ko‘rish</button>
            <button type="button" className="tf-oyna-keyin" onClick={yop}>Yopish</button>
          </>
        )}
      </div>
    </div>
  );
}
