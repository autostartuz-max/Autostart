import { useId } from 'react';
import './test1.css';

/**
 * 50/100 talik kartochkasi ikonkasi: ko'k yaltiroq kvadrat ichida "1 2" va uchta chiziq.
 * Butun ikonka sekin tepaga ko'tarilib tushadi (1,5 s). Namuna: namuna/kartalar/50-100.png
 * Koordinatalar namuna kartochkasining pikselida (1pt = 1.5px), viewBox — 72×72pt ikonka qutisi.
 */
export default function Royxat() {
  const id = useId();
  return (
    <span className="ilv-joy ilv-joy-royxat" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="142.5 57 108 108" width="100%" height="100%">
        <defs>
          {/* namunadagi tiklik: burchaklarda rang to'yinadi, o'rtada tez o'zgaradi */}
          <linearGradient id={id + 'kok'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.12" stopColor="#71abf8" />
            <stop offset="0.855" stopColor="#2b6ad7" />
          </linearGradient>
        </defs>
        <g className="ilv-ani ilv-royxat-sakra">
          {/* pastki qalinlik — oldingi yuzdan 7px pastda */}
          <rect x="161.1" y="76.3" width="78" height="78" rx="20" fill="#0e3489" />
          <rect x="161.1" y="69.3" width="78" height="78" rx="20" fill={`url(#${id}kok)`} />
          <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
            {/* "1" va "2" — qalin yumaloq shrift kabi */}
            <path d="M172.6 86.5 179.1 82v17" strokeWidth="7" />
            <path
              d="M172.5 114.8c0-3.5 3-4.5 5.3-4.5 2.9 0 4.5 2 4.5 4s-1.5 4-3.5 6l-6.6 10.5h9.7"
              strokeWidth="7"
            />
            <path d="M195.1 89.9h25M195.1 107.9h25M195.1 125.9h25" strokeWidth="8" />
          </g>
        </g>
      </svg>
    </span>
  );
}
