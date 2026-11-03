import { useId } from 'react';
import './bosh.css';

// QOLIP — A-agent to'ldiradi (KONTRAKT.md).
/** Yo'l belgilari kartochkasi ikonkasi. Namuna: namuna/kartalar/yol-belgilari.png */
export default function YolBelgisi() {
  const id = useId();
  return (
    <span className="ilv-joy ilv-joy-yol-belgisi" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="0 0 64 64" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#888" />
            <stop offset="1" stopColor="#555" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="48" height="48" rx="10" fill={'url(#' + id + 'g)'} />
      </svg>
    </span>
  );
}
