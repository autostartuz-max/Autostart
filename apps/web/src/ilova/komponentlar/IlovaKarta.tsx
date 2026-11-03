import type { ReactNode } from 'react';
import { useKamHarakat, useKorinish } from './useKorinish';
import '../tema.css';
import './komponentlar.css';

export interface IlovaKartaProps {
  /** "\n" — shu joyda yangi qator (namunadagi "Sizga / savol bor" kabi) */
  sarlavha: string;
  onClick: () => void;
  /** Ikonka o'z joyini (o'ng past) o'zi belgilaydi — ilv-joy-* */
  ikonka?: ReactNode;
  /** Chap pastdagi son belgisi ("27" qizil, "1" yashil); 0/null — ko'rinmaydi */
  belgi?: { matn: string | number; rang: 'qizil' | 'yashil' } | null;
  /** Butun kartochka foni (Oktagon): animatsiyali rasm va statik kadr */
  fon?: { animatsiya: string; kadr: string };
  /** Balandlik: bosh — 122, test — 112 */
  tur?: 'bosh' | 'test';
  ariaLabel?: string;
}

/** Bo'lim kartochkasi: chap yuqorida sarlavha, o'ng pastda ikonka, chap pastda son belgisi. */
export default function IlovaKarta({ sarlavha, onClick, ikonka, belgi, fon, tur = 'bosh', ariaLabel }: IlovaKartaProps) {
  const [ref, korinadi] = useKorinish<HTMLButtonElement>();
  const kamHarakat = useKamHarakat();
  const belgiMatn = belgi && belgi.matn ? belgi.matn : null;
  const nom = sarlavha.replace(/\s*\n\s*/g, ' ');
  return (
    <button
      ref={ref}
      type="button"
      className={'ilv-karta ilv-karta-' + tur + (fon ? ' ilv-karta-fonli' : '') + (korinadi ? ' ilv-korinadi' : '')}
      onClick={onClick}
      // Belgi soni ham o'qilsin: "Xatolarni tuzatish, 27 ta"
      aria-label={ariaLabel || (belgiMatn != null ? `${nom}, ${belgiMatn} ta` : nom)}
    >
      {/* Statik kadr doim tagida turadi: animatsiyali rasm yuklanguncha ham bo'sh joy ko'rinmaydi.
          Animatsiyali rasm faqat kartochka ekranda bo'lsa va harakat cheklanmagan bo'lsa qo'yiladi. */}
      {fon && <img className="ilv-karta-fon" src={fon.kadr} alt="" draggable={false} />}
      {fon && korinadi && !kamHarakat && <img className="ilv-karta-fon" src={fon.animatsiya} alt="" draggable={false} />}
      <span className="ilv-karta-sarlavha">{sarlavha}</span>
      {ikonka}
      {belgiMatn != null && belgi && (
        <span className={'ilv-belgi ilv-belgi-' + belgi.rang} aria-hidden="true">{belgiMatn}</span>
      )}
    </button>
  );
}
