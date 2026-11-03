import { useId } from 'react';
import './bosh.css';

// Chipta shakli markazga nisbatan: 108.5×74, burchak radiusi 10.6, yon tomonlarda 11.6 li o'yiq.
const SHAKL =
  'M-43.65 -37H43.65A10.6 10.6 0 0 1 54.25 -26.4V-11.6A11.6 11.6 0 0 0 54.25 11.6V26.4A10.6 10.6 0 0 1 43.65 37' +
  'H-43.65A10.6 10.6 0 0 1 -54.25 26.4V11.6A11.6 11.6 0 0 0 -54.25 -11.6V-26.4A10.6 10.6 0 0 1 -43.65 -37Z';

// Besh qirrali yulduz (tashqi radius 18.8, ichki 9.6), chap tomonda.
const YULDUZ = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 9.6 : 18.8;
  const a = ((-90 + i * 36) * Math.PI) / 180;
  return (-15.4 + r * Math.cos(a)).toFixed(2) + ',' + (-1.2 + r * Math.sin(a)).toFixed(2);
}).join(' ');

/**
 * Biletlar kartochkasi ikonkasi — sariq chipta. Namuna: namuna/kartalar/biletlar.png
 * Koordinatalar namuna pikselida (1pt = 1.482px). Tinch holatda −8.1° qiya; animatsiyada
 * butun svg tebranib ko'tariladi (soya ham u bilan birga, namunadagidek).
 */
export default function Chipta() {
  const id = useId();
  return (
    <span className="ilv-joy ilv-joy-chipta" aria-hidden="true">
      <svg className="ilv-ikonka ilv-ani ilv-chipta-tebranish" viewBox="0 0 133 110" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'y'} gradientUnits="userSpaceOnUse" x1="0" y1="-37" x2="0" y2="37">
            <stop offset="0" stopColor="#fee45a" />
            <stop offset="0.13" stopColor="#fde356" />
            <stop offset="0.24" stopColor="#f9dc48" />
            <stop offset="0.36" stopColor="#f7d83a" />
            <stop offset="0.48" stopColor="#f2d02a" />
            <stop offset="0.62" stopColor="#eec91f" />
            <stop offset="0.76" stopColor="#ebc117" />
            <stop offset="0.87" stopColor="#e9bb0d" />
            <stop offset="1" stopColor="#e6b502" />
          </linearGradient>
        </defs>
        <g transform="translate(63.8 50.3) rotate(-8.1)">
          {/* Qalinlik (3D yon tomoni) — shaklning 9px pastga surilgan nusxasi */}
          <path d={SHAKL} transform="translate(0 9)" fill="#8f7000" />
          <path d={SHAKL} fill={'url(#' + id + 'y)'} />
          <polygon points={YULDUZ} fill="#2b2a29" stroke="#2b2a29" strokeWidth="0.8" strokeLinejoin="round" />
          <line x1="23.3" y1="-33.9" x2="23.3" y2="32.7" stroke="#2b2a29" strokeWidth="5.2" strokeDasharray="7.5 8" />
        </g>
      </svg>
    </span>
  );
}
