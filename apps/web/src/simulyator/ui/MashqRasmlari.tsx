import { useId, type ReactNode } from 'react';
import type { MashqKodi } from '../dunyo/turlar';

/*
 * Avtodrom mashqlari menyusi uchun multfilm uslubidagi rasmlar (2026-11: "shunaqa rasmlardan
 * foydalansak ham bo'ladi" — o'quv mashinasi namunasi). Qalin to'q chiziq, yorqin ranglar.
 * Hammasi kod bilan chizilgan SVG — tashqi rasm yo'q (ilova hajmi o'smaydi, litsenziya muammosi yo'q).
 */
const O = '#1f2430'; // chiziq rangi
const SARIQ = '#ffd21f';
const OYNA = '#bfe8ff';
const YOL = '#5d6673';
const MAYSA = '#8fd16a';

/** Yuqoridan ko'rinish: kichik o'quv mashinasi (markazi 0,0; tepaga qaragan) */
function UstMashina({ x, y, a = 0 }: { x: number; y: number; a?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <rect x="-5.2" y="-8.4" width="10.4" height="16.8" rx="3.6" fill={SARIQ} stroke={O} strokeWidth="1.5" />
      <rect x="-3.7" y="-5.2" width="7.4" height="4" rx="1.4" fill={OYNA} stroke={O} strokeWidth="1" />
      <rect x="-3.5" y="2.6" width="7" height="2.8" rx="1.2" fill={OYNA} stroke={O} strokeWidth="1" />
      <rect x="-2.2" y="-0.6" width="4.4" height="2.2" rx=".6" fill="#ffffff" stroke={O} strokeWidth=".7" />
    </g>
  );
}

/** Yon tomondan: kichik mashina (markazi 0,0; o'ngga qaragan) */
function YonMashina({ x, y, a = 0 }: { x: number; y: number; a?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d="M-9 1.6V-.4c0-1.6 1.1-2.5 2.6-2.7L-3.6-3.6-1.6-6.4c.5-.6 1.1-.9 1.9-.9H4c.9 0 1.6.4 2 1.1L7.8-3.2c1.3.3 2 1.2 2 2.4V1.6Z"
        fill={SARIQ} stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-2.2-3.4-.6-5.8H1.6v2.4Z M3-5.8H4.4L5.8-3.4H3Z" fill={OYNA} />
      <circle cx="-5" cy="2" r="2.3" fill="#2b2f38" stroke={O} strokeWidth="1" />
      <circle cx="5.4" cy="2" r="2.3" fill="#2b2f38" stroke={O} strokeWidth="1" />
    </g>
  );
}

function Konus({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 4} ${y + 5}L${x} ${y - 6}L${x + 4} ${y + 5}Z`} fill="#ff8a1f" stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={`M${x - 2.3} ${y + .6}H${x + 2.3}`} stroke="#ffffff" strokeWidth="1.5" />
    </g>
  );
}

/** Sariq yo'nalish strelkasi */
function Strelka({ d, uch }: { d: string; uch: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={SARIQ} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={uch} fill={SARIQ} stroke={O} strokeWidth=".8" strokeLinejoin="round" />
    </>
  );
}

function Sahna({ fon, children }: { fon: string; children: ReactNode }) {
  const id = useId();
  return (
    <svg className="sim-mashq-rasm" viewBox="0 0 64 48" aria-hidden="true">
      <defs>
        <clipPath id={id}><rect x="1" y="1" width="62" height="46" rx="10" /></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="64" height="48" fill={fon} />
        {children}
      </g>
      <rect x="1" y="1" width="62" height="46" rx="10" fill="none" stroke={O} strokeWidth="2" />
    </svg>
  );
}

/**
 * Mashq rasmi. Chorraha uch xil (to'g'riga, chapga, o'ngga) — indeks bo'yicha strelka.
 */
export function MashqRasm({ kod, indeks }: { kod: MashqKodi; indeks?: number }) {
  switch (kod) {
    case 'start':
      return (
        <Sahna fon={MAYSA}>
          <rect x="24" y="0" width="16" height="48" fill={YOL} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <g key={i}>
              <rect x={24 + i * 2} y="12" width="2" height="2" fill={i % 2 ? '#ffffff' : O} />
              <rect x={24 + i * 2} y="14" width="2" height="2" fill={i % 2 ? O : '#ffffff'} />
            </g>
          ))}
          <path d="M12 8V34" stroke={O} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 8 22 11.5 12 15Z" fill="#3bd97f" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
          <UstMashina x={32} y={32} />
        </Sahna>
      );
    case 'piyoda':
      return (
        <Sahna fon={MAYSA}>
          <rect x="0" y="14" width="64" height="20" fill={YOL} />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={34 + i * 4.4} y="14" width="2.6" height="20" fill="#ffffff" />)}
          <UstMashina x={14} y={24} a={90} />
          <circle cx="41" cy="10" r="2.4" fill="#ffb74d" stroke={O} strokeWidth="1" />
          <path d="M41 12.6V17.6M41 14.4 38.4 16.4M41 14.4 43.6 16M41 17.6 39 21M41 17.6 43 21" stroke={O} strokeWidth="1.4" strokeLinecap="round" />
        </Sahna>
      );
    case 'estakada':
      return (
        <Sahna fon="#9fd8ff">
          <rect x="0" y="40" width="64" height="8" fill={MAYSA} />
          <path d="M4 42 26 24H38L60 42Z" fill="#c9a27a" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M26 24H38" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" />
          <YonMashina x={17.6} y={28.6} a={-39} />
          <circle cx="52" cy="11" r="5" fill="#ffe066" stroke={O} strokeWidth="1.2" />
        </Sahna>
      );
    case 'burilish90':
      return (
        <Sahna fon={MAYSA}>
          <path d="M16 50V24Q16 16 24 16H66" fill="none" stroke={YOL} strokeWidth="17" />
          <path d="M16 50V24Q16 16 24 16H66" fill="none" stroke="#ffffff" strokeWidth="1.3" strokeDasharray="3 3" />
          <UstMashina x={18.4} y={19.2} a={45} />
          <Strelka d="M30 30Q30 26 34 26H46" uch="M46 22.6 51 26 46 29.4Z" />
        </Sahna>
      );
    case 'chorraha': {
      const strelka = indeks === 8
        ? <Strelka d="M32 30V27Q32 24 29 24H14" uch="M14 20.6 9 24 14 27.4Z" />
        : indeks === 13
          ? <Strelka d="M32 30V27Q32 24 35 24H50" uch="M50 20.6 55 24 50 27.4Z" />
          : <Strelka d="M32 30V12" uch="M28.6 12 32 7 35.4 12Z" />;
      return (
        <Sahna fon={MAYSA}>
          <rect x="0" y="16" width="64" height="16" fill={YOL} />
          <rect x="24" y="0" width="16" height="48" fill={YOL} />
          <path d="M0 24H22M42 24H64M32 0V14M32 34V48" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 3" />
          <rect x="5" y="2.5" width="8" height="12" rx="2" fill="#2b2f38" stroke={O} strokeWidth="1.2" />
          <circle cx="9" cy="5.6" r="1.6" fill="#ff4d4d" />
          <circle cx="9" cy="8.6" r="1.6" fill="#ffd21f" />
          <circle cx="9" cy="11.6" r="1.6" fill="#3bd97f" />
          <UstMashina x={32} y={39} />
          {strelka}
        </Sahna>
      );
    }
    case 'ilon':
      return (
        <Sahna fon={YOL}>
          <path d="M2 24C8 24 10 36 18 36S26 12 34 12 42 36 50 36 58 24 64 24" fill="none" stroke={SARIQ} strokeWidth="1.8" strokeDasharray="3.2 2.6" />
          <Konus x={18} y={24} />
          <Konus x={34} y={24} />
          <Konus x={50} y={24} />
          <UstMashina x={7} y={24} a={90} />
        </Sahna>
      );
    case 'boks':
      return (
        <Sahna fon={YOL}>
          {/* Boks: chap tomoni ochiq, mashina orqasi bilan kiradi */}
          <path d="M36 7H59V41H36" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinejoin="round" />
          <UstMashina x={47} y={24} a={-90} />
          <Strelka d="M26 41C15 41 10 33 13 27" uch="M9.6 28.4 13.4 22.6 16.6 28.4Z" />
        </Sahna>
      );
    case 'temir':
      return (
        <Sahna fon={MAYSA}>
          <rect x="24" y="0" width="16" height="48" fill={YOL} />
          {Array.from({ length: 13 }, (_, i) => <rect key={i} x={i * 5} y="18.5" width="2.6" height="11" rx=".6" fill="#8a5a2b" />)}
          <path d="M0 20.5H64M0 27.5H64" stroke="#3a3f48" strokeWidth="2" />
          <g transform="translate(52 10)">
            <rect x="-1.6" y="-9" width="3.2" height="18" fill="#ffffff" stroke="#e42327" strokeWidth="1.2" transform="rotate(45)" />
            <rect x="-1.6" y="-9" width="3.2" height="18" fill="#ffffff" stroke="#e42327" strokeWidth="1.2" transform="rotate(-45)" />
          </g>
          <UstMashina x={32} y={40} />
        </Sahna>
      );
    case 'tezlashish':
      return (
        <Sahna fon="#2a3d55">
          <path d="M13 38A19 19 0 0 1 22 22" fill="none" stroke="#3bd97f" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M24.6 20.2A19 19 0 0 1 39.4 20.2" fill="none" stroke={SARIQ} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M42 22A19 19 0 0 1 51 38" fill="none" stroke="#ff4d4d" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M32 38 43.5 26" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="32" cy="38" r="3.4" fill="#ffffff" stroke={O} strokeWidth="1.2" />
          <path d="M6 12H16M4 17H12M8 7H14" stroke="#9fd8ff" strokeWidth="1.6" strokeLinecap="round" />
        </Sahna>
      );
    case 'avariya':
      return (
        <Sahna fon={YOL}>
          <path d="M32 7 53 41H11Z" fill="#ffffff" stroke="#e42327" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M32 19 42 36H22Z" fill="none" stroke="#e42327" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M32 41 32 47" stroke={O} strokeWidth="2" />
        </Sahna>
      );
    case 'parallel':
      return (
        <Sahna fon={YOL}>
          <rect x="0" y="0" width="64" height="6" fill="#aeb6c0" />
          <path d="M0 26H64" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="4 3" />
          <UstMashina x={11} y={14} a={90} />
          <UstMashina x={53} y={14} a={90} />
          <g opacity=".95"><UstMashina x={33} y={22} a={62} /></g>
          <Strelka d="M44 38C36 38 30 34 29 29" uch="M25.8 30.8 28.4 24.8 32 30Z" />
        </Sahna>
      );
    case 'finish':
      return (
        <Sahna fon="#9fd8ff">
          <rect x="0" y="40" width="64" height="8" fill={MAYSA} />
          <path d="M18 6V42" stroke={O} strokeWidth="2.2" strokeLinecap="round" />
          {Array.from({ length: 12 }, (_, i) => {
            const c = i % 4;
            const r = Math.floor(i / 4);
            return <rect key={i} x={19 + c * 7} y={6 + r * 6} width="7" height="6" fill={(c + r) % 2 ? O : '#ffffff'} />;
          })}
          <rect x="19" y="6" width="28" height="18" fill="none" stroke={O} strokeWidth="1.4" />
        </Sahna>
      );
    default:
      return (
        <Sahna fon={MAYSA}>
          <rect x="24" y="0" width="16" height="48" fill={YOL} />
          <UstMashina x={32} y={26} />
        </Sahna>
      );
  }
}

/**
 * Multfilm uslubidagi o'quv mashinasi (yon tomondan), tomida "AUTOSTART" belgisi —
 * menyu sarlavhasi yonida.
 */
export function OquvMashinasi({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 84" aria-hidden="true">
      <ellipse cx="60" cy="76" rx="48" ry="4.5" fill="#000000" opacity=".28" />
      <rect x="55" y="15" width="10" height="7" fill={O} />
      <rect x="33" y="3" width="54" height="14" rx="4.5" fill="#ffffff" stroke={O} strokeWidth="2.6" />
      <text x="60" y="13.6" textAnchor="middle" fontFamily="'Exo 2', system-ui, sans-serif" fontWeight="900" fontSize="8.4" fill="#e42327" letterSpacing=".4">AUTOSTART</text>
      <path d="M14 62C10 62 8 59 8 55V48C8 42 12 39 18 38L30 36C34 26 42 21 52 21H72C82 21 89 27 93 35L104 37C110 38 113 42 113 48V55C113 59 110 62 106 62Z"
        fill={SARIQ} stroke={O} strokeWidth="3" strokeLinejoin="round" />
      <path d="M9 50H112" stroke="#e42327" strokeWidth="3.4" />
      <path d="M36 36.5C39 30.5 44 27 51 27H58V36.5Z" fill={OYNA} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M63 27H71C78 27 83 31 86 36.5H63Z" fill={OYNA} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M41 33 45 29.4M67 33 70.6 29.6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M60.5 38V58" stroke={O} strokeWidth="2" opacity=".45" />
      <circle cx="106.5" cy="45" r="4.2" fill="#fff7c2" stroke={O} strokeWidth="2" />
      <rect x="102" y="54" width="13" height="5" rx="2.5" fill="#aeb6c0" stroke={O} strokeWidth="2" />
      <rect x="5" y="54" width="11" height="5" rx="2.5" fill="#aeb6c0" stroke={O} strokeWidth="2" />
      <circle cx="34" cy="62" r="11" fill="#2b2f38" stroke={O} strokeWidth="3" />
      <circle cx="34" cy="62" r="4.8" fill="#cfd6de" stroke={O} strokeWidth="1.6" />
      <circle cx="88" cy="62" r="11" fill="#2b2f38" stroke={O} strokeWidth="3" />
      <circle cx="88" cy="62" r="4.8" fill="#cfd6de" stroke={O} strokeWidth="1.6" />
    </svg>
  );
}
