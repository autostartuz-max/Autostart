import { useId } from 'react';
import './bosh.css';

/**
 * Xatolarni tuzatish / Xatolarim kartochkasi ikonkasi — singan yurak. Namuna: namuna/kartalar/xatolarni-tuzatish.png
 * Koordinatalar namuna pikselida (1pt = 1.482px). Animatsiya (3 s): ikki bo'lak pastki uchi atrofida
 * ajralib, qaytib birlashadi. Namunadagidek bo'laklar svg chegarasida kesiladi.
 */
export default function SinganYurak() {
  const id = useId();
  const g = 'url(#' + id + 'g)';
  return (
    <span className="ilv-joy ilv-joy-singan-yurak" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="0 0 112 112" width="100%" height="100%">
        <defs>
          {/* Har bir bo'lak o'z qutisiga nisbatan: yorug' markaz chap yuqorida */}
          <radialGradient id={id + 'g'} cx="0.35" cy="0.28" r="0.64">
            <stop offset="0" stopColor="#fa96a0" />
            <stop offset="0.1" stopColor="#f98f9a" />
            <stop offset="0.18" stopColor="#fb7e90" />
            <stop offset="0.27" stopColor="#fb6f7e" />
            <stop offset="0.37" stopColor="#f66176" />
            <stop offset="0.49" stopColor="#f44e67" />
            <stop offset="0.61" stopColor="#f13b56" />
            <stop offset="0.74" stopColor="#e53248" />
            <stop offset="0.85" stopColor="#d62c3d" />
            <stop offset="0.92" stopColor="#c9212b" />
            <stop offset="0.96" stopColor="#b3202d" />
            <stop offset="1" stopColor="#9a1c28" />
          </radialGradient>
        </defs>
        <path
          className="ilv-ani ilv-yurak-chap"
          d="M55.1 105C26.7 83 7.5 64 7.5 40C7.5 23 19 10.8 36 10.8C48 10.8 55.5 16.5 56.8 23.5L46.8 44.4L62.9 57.8L51.4 77.6Z"
          fill={g}
        />
        <path
          className="ilv-ani ilv-yurak-ong"
          d="M63.9 103.8C90 83.7 106.7 63 106.7 39C106.7 21 99.5 10.5 85.5 10.5C77.5 10.5 69.1 16.5 65.8 21.5L54.5 45.3L71.8 57.6L59.8 78Z"
          fill={g}
        />
      </svg>
    </span>
  );
}
