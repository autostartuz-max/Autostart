import { useId } from 'react';
import './test2.css';

// Kuzov silueti (karta koordinatalarida, 1 birlik = 1pt; namuna avtodrom.png dan o'lchangan).
// Soya — test2.css dagi drop-shadow.
const KUZOV = 'M104 42.8H146C147.8 42.8 148.6 43.6 149.3 45.2L158 66.8C158.6 68.3 159.9 69.4 161.3 70.4'
  + 'C162.6 71.4 163 72.6 163 74.5V93C163 94.8 161.8 96 160 96H90C88.2 96 87 94.8 87 93V74.5'
  + 'C87 72.6 87.4 71.4 88.7 70.4C90.1 69.4 91.4 68.3 92 66.8L100.7 45.2C101.4 43.6 102.2 42.8 104 42.8Z';
const GILDIRAK = 'M92.5 90H106.5V104.2Q106.5 106.6 104.1 106.6H94.9Q92.5 106.6 92.5 104.2Z'
  + 'M143.5 90H157.5V104.2Q157.5 106.6 155.1 106.6H145.9Q143.5 106.6 143.5 104.2Z';

/** Avtodrom kartochkasi ikonkasi: old tomondan qizil mashina. Kuzov silkinadi, faralar yonib-o'chadi. */
export default function Mashina() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-mashina" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="73.67 30 101 82" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'k'} gradientUnits="userSpaceOnUse" x1="0" y1="42.8" x2="0" y2="96">
            <stop offset="0" stopColor="#fb7467" />
            <stop offset="0.12" stopColor="#f86f62" />
            <stop offset="0.15" stopColor="#e65b4f" />
            <stop offset="0.46" stopColor="#e3564b" />
            <stop offset="0.48" stopColor="#e04743" />
            <stop offset="0.6" stopColor="#dc403c" />
            <stop offset="0.69" stopColor="#d93b39" />
            <stop offset="0.72" stopColor="#d6303c" />
            <stop offset="0.775" stopColor="#d62c3d" />
            <stop offset="0.8" stopColor="#c9212b" />
            <stop offset="1" stopColor="#c51f29" />
          </linearGradient>
          <radialGradient id={id + 'f'} cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#fff2a6" />
            <stop offset="0.2" stopColor="#fde45c" />
            <stop offset="0.5" stopColor="#fadb40" />
            <stop offset="0.78" stopColor="#efc414" />
            <stop offset="1" stopColor="#d2a20c" />
          </radialGradient>
          <radialGradient id={id + 'o'} cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ec6b61" />
            <stop offset="0.5" stopColor="#e35b52" />
            <stop offset="1" stopColor="#d4463f" />
          </radialGradient>
          <linearGradient id={id + 'r'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.82" stopColor="#fdfdfd" />
            <stop offset="1" stopColor="#d4d2cf" />
          </linearGradient>
        </defs>

        {/* g'ildiraklar joyida turadi, faqat kuzov silkinadi */}
        <path d={GILDIRAK} fill="#1d1d1f" />

        <g className="ilv-ani ilv-mashina-kuzov">
          <path d={KUZOV} fill={u('k')} />
          {/* old oyna: pushti hoshiya, och moviy shisha, oq yaltirash */}
          <path d="M104.3 50H145.7L150.9 68H99.1Z" fill="#f78c93" />
          <path d="M105 51H145L150 67H100Z" fill="#cfeaff" />
          <path d="M110.8 51H120.2L115.2 67H105.1Z" fill="#f0f4f9" />
          {/* faralar: o'chgan holati (qizil uya) doim ostida */}
          <circle cx="101.5" cy="80.5" r="6.4" fill={u('o')} />
          <circle cx="148.5" cy="80.5" r="6.4" fill={u('o')} />
          <g className="ilv-ani ilv-mashina-fara">
            <circle cx="101.5" cy="80.5" r="6.4" fill={u('f')} />
            <circle cx="148.5" cy="80.5" r="6.4" fill={u('f')} />
            <ellipse cx="99.4" cy="78" rx="1.9" ry="1.5" fill="#fff8c8" fillOpacity="0.85" />
            <ellipse cx="146.4" cy="78" rx="1.9" ry="1.5" fill="#fff8c8" fillOpacity="0.85" />
          </g>
          <rect x="114.5" y="78" width="21" height="8" rx="1.8" fill={u('r')} />
        </g>
      </svg>
    </span>
  );
}
