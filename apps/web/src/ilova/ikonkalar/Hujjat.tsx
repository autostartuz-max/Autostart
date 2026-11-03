import { useId } from 'react';
import './test1.css';

/**
 * Barcha testlar kartochkasi ikonkasi: qalin hujjat varag'i va yashil "✓" belgisi.
 * Belgi har 1,5 s da bir "sakrab" kattalashadi. Namuna: namuna/kartalar/barcha-testlar.png
 * Koordinatalar namuna kartochkasining pikselida (1pt = 1.5px), viewBox — 72×72pt ikonka qutisi.
 */
export default function Hujjat() {
  const id = useId();
  const url = (nom: string) => `url(#${id}${nom})`;
  return (
    <span className="ilv-joy ilv-joy-hujjat" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="142.5 57 108 108" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'varaq'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fefefd" />
            <stop offset="0.5" stopColor="#eaecf1" />
            <stop offset="1" stopColor="#d3dae6" />
          </linearGradient>
          <linearGradient id={id + 'yashil'} x1="0.15" y1="0.15" x2="0.85" y2="0.85">
            <stop offset="0" stopColor="#50e386" />
            <stop offset="0.5" stopColor="#3ccd71" />
            <stop offset="1" stopColor="#1ea856" />
          </linearGradient>
        </defs>
        {/* varaq qalinligi: o'ng va past tomonda ko'rinadigan yon qirra */}
        <rect x="164" y="66.5" width="67" height="86" rx="8" fill="#9ca5b3" />
        <rect x="157.5" y="61.5" width="67" height="86" rx="8" fill={url('varaq')} />
        <rect x="170.5" y="79.5" width="41" height="6" rx="3" fill="#a6b4cb" />
        <rect x="170.5" y="93.5" width="28" height="6" rx="3" fill="#b9c6db" />
        <g className="ilv-ani ilv-hujjat-belgi">
          <circle cx="212" cy="128.9" r="24" fill={url('yashil')} />
          <path
            d="M200.9 128.8 208.5 137.2 222.8 121.5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="7.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </span>
  );
}
