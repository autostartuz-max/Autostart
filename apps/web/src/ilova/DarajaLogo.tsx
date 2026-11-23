import { useId } from 'react';
import { DARAJALAR } from './darajalar';
import { yulduz } from '../tarif/Logolar';
import './daraja-logo.css';

// Medal gardishi: 18 tishli rozetka
const ROZET = (() => {
  let d = '';
  const n = 36;
  for (let i = 0; i < n; i++) {
    const r = i % 2 ? 27.6 : 31;
    const b = ((i * 360) / n - 90) * (Math.PI / 180);
    d += (i ? 'L' : 'M') + (32 + r * Math.cos(b)).toFixed(2) + ' ' + (32 + r * Math.sin(b)).toFixed(2);
  }
  return d + 'Z';
})();

/**
 * Daraja logotipi: medal (daraja rangida), ichida transport va pastda daraja yulduzlari
 * (Piyoda — 1, Pilot — 5). Tabrik oynasi va Profilda.
 */
export default function DarajaLogo({ nom, size = 72, className }: { nom: string; size?: number; className?: string }) {
  const id = useId();
  const i = Math.max(0, DARAJALAR.findIndex((d) => d.nom === nom));
  const d = DARAJALAR[i];
  const [a, b, c] = d.rang;
  return (
    <span className={'dl' + (className ? ' ' + className : '')} style={{ width: size, height: size }} role="img" aria-label={`${d.nom} darajasi`}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={id} cx="38%" cy="30%" r="80%">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </radialGradient>
        </defs>
        <path d={ROZET} fill={c} />
        <circle cx="32" cy="32" r="25" fill={`url(#${id})`} />
        <circle cx="32" cy="32" r="22" fill="none" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.1" strokeDasharray="2 2.2" />
        <path d="M14 24C19 14 27 10.5 34 10.5" fill="none" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
        {Array.from({ length: i + 1 }, (_, k) => (
          <path key={k} d={yulduz(32 + (k - i / 2) * 6.2, 49.6, 2.7, 1.15)} fill="#ffffff" stroke={c} strokeWidth=".5" />
        ))}
      </svg>
      <span className="dl-belgi" style={{ fontSize: Math.round(size * 0.38) }}>{d.qahramon}</span>
    </span>
  );
}
