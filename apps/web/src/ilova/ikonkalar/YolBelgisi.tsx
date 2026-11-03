import { useId } from 'react';
import './bosh.css';

// Burchaklari yumaloq teng tomonli uchburchak (uchida r=5.7, pastki burchaklarda r=6.3).
const UCHBURCHAK =
  'M70.44 11.35L114.15 87.05A6.3 6.3 0 0 1 108.69 96.5H22.31A6.3 6.3 0 0 1 16.86 87.05L60.57 11.35A5.7 5.7 0 0 1 70.44 11.35Z';

/**
 * Yo'l belgilari kartochkasi ikonkasi — "Diqqat" ogohlantirish belgisi. Namuna: namuna/kartalar/yol-belgilari.png
 * Koordinatalar namuna pikselida (1pt = 1.482px). Animatsiya: belgidan pastdagi nuqta
 * atrofida chapga-o'ngga chayqaladi (1.5 s).
 */
export default function YolBelgisi() {
  const id = useId();
  return (
    <span className="ilv-joy ilv-joy-yol-belgisi" aria-hidden="true">
      <svg className="ilv-ikonka ilv-ani ilv-belgi-chayqalish" viewBox="0 0 132 110" width="100%" height="100%">
        <defs>
          {/* Chap yuqoridan o'ng pastga: ochroq qizil → to'q qizil, o'rtada yaltiroq chiziq */}
          <linearGradient id={id + 'q'} gradientUnits="userSpaceOnUse" x1="65.6" y1="8.5" x2="125.1" y2="90.1">
            <stop offset="0" stopColor="#e65c4f" />
            <stop offset="0.12" stopColor="#e7544a" />
            <stop offset="0.28" stopColor="#e84d46" />
            <stop offset="0.34" stopColor="#df4541" />
            <stop offset="0.44" stopColor="#dc3f3c" />
            <stop offset="0.5" stopColor="#d93b39" />
            <stop offset="0.56" stopColor="#dd2729" />
            <stop offset="0.6" stopColor="#dc2629" />
            <stop offset="0.65" stopColor="#d62c3d" />
            <stop offset="0.71" stopColor="#c9212b" />
            <stop offset="1" stopColor="#c41f2a" />
          </linearGradient>
        </defs>
        {/* Qalinlik (3D) — 4px pastga surilgan to'q nusxa */}
        <path d={UCHBURCHAK} transform="translate(0 4)" fill="#8c0b16" />
        <path d={UCHBURCHAK} fill={'url(#' + id + 'q)'} />
        <path d="M65.25 29L98.15 86H32.35Z" fill="#ffffff" />
        <rect x="60.5" y="44.7" width="10" height="23.9" rx="5" fill="#17171a" />
        <circle cx="65.5" cy="76.9" r="5.25" fill="#17171a" />
      </svg>
    </span>
  );
}
