import { useId } from 'react';
import './test2.css';

// Pufak: yuqori burchaklar r=11, pastkilar r=13, chap pastda dumcha (karta koordinatalarida, namuna savol-bor.png)
const PUFAK = 'M114 42.5H148A11 11 0 0 1 159 53.5V77.7A13 13 0 0 1 146 90.7H128.4L114.6 102.1'
  + 'Q114.1 102.3 114.1 101.7V90.6A13 13 0 0 1 103 77.7V53.5A11 11 0 0 1 114 42.5Z';

/** Sizga savol bor kartochkasi ikonkasi: ko'k yaltiroq pufak, ichida oq savol belgisi (u tebranib kattalashadi). */
export default function SavolPufak() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-savol-pufak" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="89.4 32 85 80" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'y'} gradientUnits="userSpaceOnUse" x1="103" y1="42.5" x2="155" y2="94.5">
            <stop offset="0" stopColor="#77b1fa" />
            <stop offset="0.1" stopColor="#71abf8" />
            <stop offset="0.25" stopColor="#68a4f4" />
            <stop offset="0.42" stopColor="#5a98f0" />
            <stop offset="0.6" stopColor="#4a89e8" />
            <stop offset="0.75" stopColor="#3b7ae2" />
            <stop offset="0.88" stopColor="#2e6cd9" />
            <stop offset="1" stopColor="#2663d1" />
          </linearGradient>
          <linearGradient id={id + 'q'} gradientUnits="userSpaceOnUse" x1="0" y1="80" x2="0" y2="106">
            <stop offset="0" stopColor="#1947a8" />
            <stop offset="0.6" stopColor="#163f97" />
            <stop offset="1" stopColor="#12347d" />
          </linearGradient>
        </defs>

        {/* qalinlik: o'sha shakl 4.8pt pastda, to'q ko'k */}
        <path d={PUFAK} transform="translate(0 4.8)" fill={u('q')} />
        <path d={PUFAK} fill={u('y')} />

        <g className="ilv-ani ilv-savol-belgi">
          {/* aylanish markazi (130.65; 65.5) bo'lishi uchun ko'rinmas tayanch to'rtburchak */}
          <rect x="118.15" y="44" width="25" height="43" fill="none" />
          <path d="M123.3 58.55A7.35 7.35 0 1 1 136.67 62.77C134.95 65.23 130.7 66.5 130.7 69V70.2" fill="none" stroke="#fff"
            strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="130.65" cy="79.55" r="3.6" fill="#fff" />
        </g>
      </svg>
    </span>
  );
}
