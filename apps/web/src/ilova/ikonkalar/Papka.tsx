import { useId } from 'react';
import './bosh.css';

/**
 * Mavzular kartochkasi ikonkasi — sariq papka. Namuna: namuna/kartalar/mavzular.png
 * Koordinatalar namuna pikselida (1pt = 1.482px). Old qism kartochka pastki chetidan
 * chiqib ketadi (kartochka kesadi). Animatsiya: qog'oz papkadan chiqib, qaytib kiradi.
 */
export default function Papka() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-papka" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="0 0 136 125" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'o'} gradientUnits="userSpaceOnUse" x1="0" y1="19.5" x2="0" y2="50.5">
            <stop offset="0" stopColor="#d8b219" />
            <stop offset="0.2" stopColor="#d5ae14" />
            <stop offset="0.28" stopColor="#cea50d" />
            <stop offset="0.8" stopColor="#cca40e" />
            <stop offset="0.86" stopColor="#bc9c16" />
            <stop offset="1" stopColor="#b69815" />
          </linearGradient>
          <linearGradient id={id + 'a'} gradientUnits="userSpaceOnUse" x1="0" y1="50.5" x2="0" y2="115.5">
            <stop offset="0" stopColor="#fee45a" />
            <stop offset="0.13" stopColor="#fde356" />
            <stop offset="0.24" stopColor="#f9dd49" />
            <stop offset="0.33" stopColor="#f7da44" />
            <stop offset="0.4" stopColor="#f6d633" />
            <stop offset="0.5" stopColor="#f2d129" />
            <stop offset="0.66" stopColor="#eec91f" />
            <stop offset="0.82" stopColor="#ebc117" />
            <stop offset="0.93" stopColor="#e9bb0d" />
            <stop offset="1" stopColor="#e6b502" />
          </linearGradient>
        </defs>
        {/* Orqa devor: chapda yorliq, o'ngga pastroq */}
        <path d="M11.3 95V29.5A10 10 0 0 1 21.3 19.5H52L68.5 35.5H117.8A6 6 0 0 1 123.8 41.5V95Z" fill={u('o')} />
        <rect className="ilv-ani ilv-papka-qogoz" x="32.05" y="23.5" width="86.9" height="52" rx="3" fill="#ffffff" />
        {/* Old devor: pastga torayadi */}
        <path d="M11.85 125L6.79 57.5A7 7 0 0 1 13.26 50.5H122A7 7 0 0 1 128.37 57.5L122.3 125Z" fill={u('a')} />
      </svg>
    </span>
  );
}
