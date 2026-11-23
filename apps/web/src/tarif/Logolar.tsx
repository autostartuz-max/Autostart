import { useId } from 'react';
import type { TarifKod } from './holat';

/** Besh qirrali yulduz yo'li (markaz, tashqi va ichki radius) */
export function yulduz(cx: number, cy: number, R: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R;
    const b = (-90 + i * 36) * (Math.PI / 180);
    d += (i ? 'L' : 'M') + (cx + rad * Math.cos(b)).toFixed(2) + ' ' + (cy + rad * Math.sin(b)).toFixed(2);
  }
  return d + 'Z';
}

const RANG: Record<TarifKod, { a: string; b: string; chet: string; belgi: string }> = {
  standart: { a: '#62b0ff', b: '#1c5ecb', chet: '#15489c', belgi: '#ffffff' },
  silver: { a: '#f6f8fb', b: '#97a4b2', chet: '#76838f', belgi: '#3b4755' },
  premium: { a: '#ffe680', b: '#dc9b00', chet: '#a87400', belgi: '#6a4200' },
};

const QALQON = 'M32 3 56 11V30C56 46.5 45.5 56.5 32 61 18.5 56.5 8 46.5 8 30V11Z';
const QALQON_ICHI = 'M32 7.6 51.6 14.2V30C51.6 43.6 43 52.2 32 56.4 21 52.2 12.4 43.6 12.4 30V14.2Z';
const YALTIROQ = 'M32 7.6 51.6 14.2V22.5C40 20.5 24.5 23.5 12.4 30V14.2Z';

/**
 * Tarif logotipi: qalqon, ichida rul va darajasi — Standart (bitta yulduz, ko'k), Silver (ikki yulduz,
 * kumush), Premium (toj, oltin). Ilova va saytda bir xil.
 */
export function TarifLogo({ kod, size = 56, className }: { kod: TarifKod; size?: number; className?: string }) {
  const id = useId();
  const r = RANG[kod] || RANG.standart;
  return (
    <svg className={'tf-logo' + (className ? ' ' + className : '')} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id + 'g'} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={r.a} />
          <stop offset="1" stopColor={r.b} />
        </linearGradient>
      </defs>
      <path d={QALQON} fill={`url(#${id}g)`} stroke={r.chet} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={YALTIROQ} fill="#ffffff" opacity=".2" />
      <path d={QALQON_ICHI} fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Rul */}
      <g fill="none" stroke={r.belgi} strokeWidth="3" strokeLinecap="round">
        <circle cx="32" cy="36.5" r="9.6" />
        <path d="M22.6 35.2H28.6M35.4 35.2H41.4M32 39.6V46" />
      </g>
      <circle cx="32" cy="36" r="3.4" fill={r.belgi} />
      {kod === 'standart' && <path d={yulduz(32, 18.6, 4.4, 1.9)} fill={r.belgi} />}
      {kod === 'silver' && (
        <>
          <path d={yulduz(26.6, 18.8, 4, 1.7)} fill={r.belgi} />
          <path d={yulduz(37.4, 18.8, 4, 1.7)} fill={r.belgi} />
        </>
      )}
      {kod === 'premium' && (
        <path d="M23.2 22.8 24.6 14.2 28.6 18.4 32 12.6 35.4 18.4 39.4 14.2 40.8 22.8Z" fill={r.belgi} strokeLinejoin="round" stroke={r.belgi} strokeWidth="1" />
      )}
    </svg>
  );
}

/** Taqiq belgisi (qizil halqa, qiya chiziq, ichida rul) — 1-eslatma: "guvohnomasiz rulga o'tirmang" */
export function TaqiqBelgisi({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#ffffff" />
      <g fill="none" stroke="#1f1e1d" strokeWidth="3.4" strokeLinecap="round">
        <circle cx="32" cy="32" r="12" />
        <path d="M20.4 30.4H27.6M36.4 30.4H43.6M32 36V43.6" />
      </g>
      <circle cx="32" cy="31.5" r="4" fill="#1f1e1d" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#e42327" strokeWidth="6" />
      <path d="M13.6 13.6 50.4 50.4" stroke="#e42327" strokeWidth="6" />
    </svg>
  );
}
