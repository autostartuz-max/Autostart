import type { ReactNode } from 'react';
import { useKorinish } from './useKorinish';
import '../tema.css';
import './komponentlar.css';

// QOLIP — F-agent to'ldiradi (KONTRAKT.md). Props o'zgarmaydi.
export interface IlovaKartaProps {
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

export default function IlovaKarta({ sarlavha, onClick, ikonka, belgi, fon, tur = 'bosh', ariaLabel }: IlovaKartaProps) {
  const [ref, korinadi] = useKorinish<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      className={'ilv-karta ilv-karta-' + tur + (korinadi ? ' ilv-korinadi' : '')}
      onClick={onClick}
      aria-label={ariaLabel || sarlavha}
    >
      {fon && <img className="ilv-karta-fon" src={korinadi ? fon.animatsiya : fon.kadr} alt="" />}
      <span className="ilv-karta-sarlavha">{sarlavha}</span>
      {ikonka}
      {belgi && belgi.matn ? <span className={'ilv-belgi ilv-belgi-' + belgi.rang}>{belgi.matn}</span> : null}
    </button>
  );
}
