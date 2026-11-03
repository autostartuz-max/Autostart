import { useId } from 'react';
import './test2.css';

// Karta koordinatalarida (1 birlik = 1pt), tinch holatda lenta ~8° chapga og'gan (namuna saralangan.png)
const OLD = 'M110.95 52Q110.75 49.3 113.3 48.75L146.9 43.75Q150.2 43.3 150.7 46.9L157.65 102.9L137.9 92.35L119.6 108.4Z';
const YON = 'M150.2 45.6L154.2 46.6Q155.6 46.9 155.8 48.3L163.3 99.7Q163.4 100.6 162.6 100.3L158.6 97.8L156.5 96L150 60Z';
// Yulduz: markaz (133.5; 70.5), tashqi radius 12.6, ichki 6.2 — tik holatda
const YULDUZ = 'M133.5 57.9L137.14 65.48L145.48 66.61L139.4 72.42L140.91 80.69L133.5 76.7L126.09 80.69'
  + 'L127.6 72.42L121.52 66.61L129.86 65.48Z';

/** Saralangan kartochkasi ikonkasi: yashil lenta-xatcho'p, kumush yulduz aylanadi, lenta tebranadi. */
export default function Bayroqcha() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-bayroqcha" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="96 26 79 86" width="100%" height="100%">
        <defs>
          {/* old yuz: chap yuqoridan o'ng pastga (26.6°) och yashildan to'q yashilga */}
          <linearGradient id={id + 'o'} gradientUnits="userSpaceOnUse" x1="110" y1="50" x2="163.6" y2="76.8">
            <stop offset="0" stopColor="#5aee8e" />
            <stop offset="0.083" stopColor="#55e989" />
            <stop offset="0.232" stopColor="#4bdf80" />
            <stop offset="0.35" stopColor="#41d678" />
            <stop offset="0.44" stopColor="#3cd277" />
            <stop offset="0.525" stopColor="#37cd71" />
            <stop offset="0.64" stopColor="#30c469" />
            <stop offset="0.745" stopColor="#27bb62" />
            <stop offset="0.833" stopColor="#23b75e" />
            <stop offset="0.93" stopColor="#20ab57" />
            <stop offset="1" stopColor="#1ea654" />
          </linearGradient>
          <linearGradient id={id + 'y'} gradientUnits="userSpaceOnUse" x1="0" y1="46" x2="0" y2="101">
            <stop offset="0" stopColor="#0c9e4c" />
            <stop offset="0.2" stopColor="#04984a" />
            <stop offset="0.4" stopColor="#0c9146" />
            <stop offset="0.6" stopColor="#0c8140" />
            <stop offset="0.8" stopColor="#0b7438" />
            <stop offset="1" stopColor="#0a6a32" />
          </linearGradient>
          <linearGradient id={id + 'k'} gradientUnits="userSpaceOnUse" x1="124.6" y1="61.6" x2="142.4" y2="79.4">
            <stop offset="0" stopColor="#eeeeee" />
            <stop offset="0.35" stopColor="#d7d6d4" />
            <stop offset="0.6" stopColor="#c4c3c3" />
            <stop offset="0.85" stopColor="#adb0b7" />
            <stop offset="1" stopColor="#98a2b6" />
          </linearGradient>
        </defs>

        <g className="ilv-ani ilv-bayroqcha-lenta">
          {/* tebranish markazi (135; 75) bo'lishi uchun ko'rinmas tayanch to'rtburchak */}
          <rect x="106.6" y="37.6" width="56.8" height="74.8" fill="none" />
          <path d={YON} fill={u('y')} />
          <path d={OLD} fill={u('o')} />
          <g transform="rotate(-8 133.5 70.5)">
            <g className="ilv-ani ilv-bayroqcha-yulduz">
              <circle cx="133.5" cy="70.5" r="12.8" fill="none" />
              <path d={YULDUZ} fill={u('k')} stroke={u('k')} strokeWidth="0.8" strokeLinejoin="round" />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}
