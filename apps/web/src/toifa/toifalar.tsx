import type { ReactElement } from 'react';
import './toifa.css';

/**
 * Haydovchilik guvohnomasi toifalari (foydalanuvchi profilida tanlaydi). Tartib — namunadagi
 * to'rdagidek (2026-11 rasm): B, AM, A2, A1, A, C1, C, CE, D1, D. Rasmiy texnik chegaralar
 * yozilmaydi — faqat transport turi.
 */
export interface HaydovchiToifa { kod: string; nom: string }

export const HAYDOVCHI_TOIFALARI: HaydovchiToifa[] = [
  { kod: 'B', nom: 'Yengil avtomobil' },
  { kod: 'AM', nom: 'Moped' },
  { kod: 'A2', nom: 'O‘rta motosikl' },
  { kod: 'A1', nom: 'Yengil motosikl' },
  { kod: 'A', nom: 'Motosikl' },
  { kod: 'C1', nom: 'Kichik yuk avtomobili' },
  { kod: 'C', nom: 'Yuk avtomobili' },
  { kod: 'CE', nom: 'Tirkamali yuk avtomobili' },
  { kod: 'D1', nom: 'Mikroavtobus' },
  { kod: 'D', nom: 'Avtobus' },
];

export const toifaTop = (kod?: string | null) => HAYDOVCHI_TOIFALARI.find((t) => t.kod === kod) || null;

/** G'ildirak: korpusdan fon rangidagi chiziq bilan ajraladi (--tk-fon) */
function Gildirak({ x, y = 33.4, r = 5.3 }: { x: number; y?: number; r?: number }) {
  return (
    <>
      <circle className="tk-gildirak" cx={x} cy={y} r={r} />
      <circle className="tk-oyna" cx={x} cy={y} r={r * 0.36} />
    </>
  );
}

/** Motosikl g'ildiragi: halqa (spitsali ko'rinish) va o'q */
function Halqa({ x, y = 30.6, r = 7.2 }: { x: number; y?: number; r?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeWidth="3.2" />
      <circle cx={x} cy={y} r="1.8" />
    </>
  );
}

/** Motosikllar (A1, A2, A): tanib olinadigan klassik siluet — halqa g'ildiraklar, rama, bak va o'rindiq */
function Moto({ tur }: { tur: 'yengil' | 'orta' | 'sport' }) {
  const chiz = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tur === 'sport') {
    return (
      <>
        <Halqa x={13} r={7.4} />
        <Halqa x={51} r={7.4} />
        <path d="M13 30.6 27 24.6" {...chiz} strokeWidth="3" />
        <path d="M51 30.6 45.6 15.6" {...chiz} strokeWidth="3.2" />
        {/* Orqa dum va o'rindiq */}
        <path d="M9.6 17.2 23.8 18.8 22.6 22H12.6Z" />
        {/* To'liq qoplama (fairing) va dvigatel */}
        <path d="M23.6 22.6C25.4 16.4 31.6 12.6 38.6 12.8L45.2 14C48 14.6 49.6 17 48.8 19.6L47.4 23.6C46.8 25.4 45.2 26.6 43.4 26.6H29.2L25.8 28.4C24.2 26.8 23.4 24.8 23.6 22.6Z" />
        {/* Shamol oynasi */}
        <path d="M40.4 13.2 44.4 8.6H47.4L45.6 14.2Z" />
        <path className="tk-chiziq" d="M35.2 17.4H44.4" strokeWidth="1.6" strokeLinecap="round" />
      </>
    );
  }
  const orta = tur === 'orta';
  return (
    <>
      <Halqa x={13.4} r={orta ? 7.2 : 6.6} />
      <Halqa x={50.6} r={orta ? 7.2 : 6.6} />
      {/* Orqa vilka va rama */}
      <path d="M13.4 30.6 26.6 23.6H37.4L43 14.2" {...chiz} strokeWidth="2.8" />
      {/* Old vilka va rul */}
      <path d="M50.6 30.6 43.2 11.6" {...chiz} strokeWidth="3" />
      <path d="M39.6 10.4 46.6 9.4" {...chiz} strokeWidth="3" />
      {/* O'rindiq */}
      <path d={orta ? 'M12.6 17.8C15.6 16.2 21.4 16 27.2 17L26 20.6 14.4 21Z' : 'M14 18.6C16.6 17.4 21.2 17.2 26 18L25 21H15.2Z'} />
      {/* Benzin baki */}
      <path d={orta ? 'M26 18.2C28.6 13.8 34.4 12.2 40.2 13.2L42.2 14.2 39.4 21.2H27.4Z' : 'M26.4 18.6C28.6 15 33 13.8 37.6 14.4L39.6 15.2 37.6 20.8H27.6Z'} />
      {/* Dvigatel */}
      <path d={orta ? 'M26.6 22.4H38.4L36.6 29H28.6Z' : 'M27.4 22.2H36.4L35 27.6H28.6Z'} />
      {/* Fara */}
      <circle cx={orta ? 46.2 : 45.4} cy={orta ? 15.4 : 15.8} r={orta ? 2.4 : 2} />
      {/* Glushitel */}
      <path d={orta ? 'M19 27.6H31.4' : 'M20 26.8H30'} {...chiz} strokeWidth="2.4" />
    </>
  );
}

/** Transport rasmi (yon tomondan, bir rangli siluet): currentColor, oyna/teshiklar — --tk-fon */
export function ToifaIkonka({ kod, className }: { kod: string; className?: string }) {
  let ichi: ReactElement;
  switch (kod) {
    case 'AM': // moped (skuter)
      ichi = (
        <>
          <path d="M9.5 27.5c0-4.6 3.7-8.3 8.3-8.3h9.4c1.5 0 2.8 1.2 2.8 2.8v5.5Z" />
          <path d="M13.2 15.6h12.4c1.3 0 2.4 1 2.4 2.3H10.8c0-1.3 1.1-2.3 2.4-2.3Z" />
          <rect x="24" y="25.4" width="19" height="4.4" rx="2.2" />
          <path d="M39.4 30.2 46 10.6h3.8l-6.3 19.6Z" />
          <rect x="43.6" y="8.6" width="10.4" height="3.2" rx="1.6" />
          <Gildirak x={15.5} r={5} />
          <Gildirak x={50} r={5} />
        </>
      );
      break;
    case 'A1': // yengil motosikl: ingichka, oddiy
      ichi = <Moto tur="yengil" />;
      break;
    case 'A2': // o'rta motosikl
      ichi = <Moto tur="orta" />;
      break;
    case 'A': // katta (sport) motosikl: to'liq qoplama
      ichi = <Moto tur="sport" />;
      break;
    case 'C1': // kichik yuk avtomobili
      ichi = (
        <>
          <rect x="4" y="10" width="34" height="19.6" rx="1.6" />
          <path d="M40 14h10.4c1 0 1.9.5 2.4 1.3l5.6 8.4c.5.7.7 1.5.7 2.3v3.6H40Z" />
          <path className="tk-oyna" d="M43 16.6h7l4.4 6.6H43Z" />
          <rect x="4" y="29" width="55" height="3" rx="1" />
          <Gildirak x={14.5} />
          <Gildirak x={49.5} />
        </>
      );
      break;
    case 'C': // yuk avtomobili
      ichi = (
        <>
          <rect x="2" y="5" width="38" height="24.6" rx="1.6" />
          <path d="M42 9.6h10.2c1.2 0 2.2.6 2.8 1.6l5.4 9.2c.4.7.6 1.4.6 2.2v6.8H42Z" />
          <path className="tk-oyna" d="M45 12.6h7l4.2 7.6H45Z" />
          <rect x="2" y="29" width="59" height="3" rx="1" />
          <Gildirak x={10.5} r={5} />
          <Gildirak x={22} r={5} />
          <Gildirak x={51.5} r={5} />
        </>
      );
      break;
    case 'CE': // tirkamali yuk avtomobili (tyagach + yarim tirkama)
      ichi = (
        <>
          <rect x="1" y="7" width="37" height="20" rx="1.4" />
          <rect x="1" y="26.6" width="37" height="3" rx="1" />
          <path d="M44 10.6h8.4c1.2 0 2.2.6 2.8 1.6l4.8 8.4c.4.7.6 1.4.6 2.2v6.8H44Z" />
          <path className="tk-oyna" d="M47 13.6h6.2l3.6 6.6H47Z" />
          <rect x="36" y="28.6" width="25" height="3" rx="1" />
          <Gildirak x={8} r={4.8} />
          <Gildirak x={19} r={4.8} />
          <Gildirak x={41} r={4.8} />
          <Gildirak x={54.6} r={4.8} />
        </>
      );
      break;
    case 'D1': // mikroavtobus
      ichi = (
        <>
          <path d="M4 30V13c0-2.2 1.8-4 4-4h36c1.6 0 3 .8 3.8 2.1l7.4 11.2c.6 1 1 2.2 1 3.4V30c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2Z" />
          <rect className="tk-oyna" x="8" y="13" width="8.4" height="7" rx="1.2" />
          <rect className="tk-oyna" x="19.4" y="13" width="8.4" height="7" rx="1.2" />
          <rect className="tk-oyna" x="30.8" y="13" width="8.4" height="7" rx="1.2" />
          <path className="tk-oyna" d="M42 13h4.4c.6 0 1.1.3 1.4.8l4.2 6.2H42Z" />
          <Gildirak x={16} />
          <Gildirak x={46} />
        </>
      );
      break;
    case 'D': // avtobus
      ichi = (
        <>
          <path d="M2 30V8c0-1.7 1.3-3 3-3h50.4c1.6 0 3 1 3.5 2.6l3 8.4c.3.8.5 1.7.5 2.6V30c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2Z" />
          {[6, 15, 24, 33, 42].map((x) => <rect key={x} className="tk-oyna" x={x} y="9" width="7" height="8" rx="1" />)}
          <path className="tk-oyna" d="M51 9h5.4l2.8 8H51Z" />
          <Gildirak x={13} />
          <Gildirak x={48.5} />
        </>
      );
      break;
    default: // B — yengil avtomobil
      ichi = (
        <>
          <path d="M4 28.6c0-2.2 1.4-3.9 3.5-4.4l9-2 6.3-7.4c1.1-1.3 2.6-2 4.3-2h12.6c1.6 0 3.1.7 4.1 1.9l6.2 7.2 7.3 1.4c2.3.4 4 2.4 4 4.8v3.6c0 1.2-1 2.2-2.2 2.2H6.2C5 34 4 33 4 31.8Z" />
          <path className="tk-oyna" d="M23.4 21.6 28.4 15.8c.4-.5 1-.8 1.6-.8h4.6v6.6Z" />
          <path className="tk-oyna" d="M37.4 15h4.4c.7 0 1.3.3 1.8.8l5 5.8H37.4Z" />
          <Gildirak x={17} y={33.6} r={5.4} />
          <Gildirak x={48} y={33.6} r={5.4} />
        </>
      );
  }
  return (
    <svg className={'tk-ikonka' + (className ? ' ' + className : '')} viewBox="0 0 64 40" aria-hidden="true">
      {ichi}
    </svg>
  );
}
