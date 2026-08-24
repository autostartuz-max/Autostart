/**
 * Aloqa sahifasi uchun 3D uslubidagi tasvir — telefon, chat pufakchasi va
 * joylashuv belgisi.
 *
 * Rastr rasm o'rniga SVG: foni yo'q (to'rtburchak chegara chiqmaydi), har qanday
 * o'lchamda aniq, hajmi bir necha kilobayt va mavzu ranglariga mos.
 */
export default function Aloqa3D() {
  return (
    <svg viewBox="0 0 380 330" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Podium */}
        <linearGradient id="a3-pod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3a56" />
          <stop offset="1" stopColor="#131c2c" />
        </linearGradient>
        <linearGradient id="a3-podTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d5075" />
          <stop offset="1" stopColor="#22304a" />
        </linearGradient>
        {/* Telefon korpusi */}
        <linearGradient id="a3-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a5a78" />
          <stop offset="0.5" stopColor="#232f47" />
          <stop offset="1" stopColor="#39496a" />
        </linearGradient>
        <linearGradient id="a3-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d1522" />
          <stop offset="1" stopColor="#16203247" />
        </linearGradient>
        {/* Pufakcha */}
        <linearGradient id="a3-bub" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        {/* Joylashuv belgisi */}
        <linearGradient id="a3-pin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        {/* Sariq go'shak */}
        <linearGradient id="a3-ph" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        {/* Yumshoq nur */}
        <radialGradient id="a3-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.30" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Orqa nur */}
      <ellipse cx="190" cy="180" rx="150" ry="130" fill="url(#a3-glow)" />

      {/* Aylana chiziqlar */}
      <ellipse cx="190" cy="262" rx="152" ry="44" stroke="#3b82f6" strokeOpacity="0.16" strokeWidth="1.5" />
      <ellipse cx="190" cy="262" rx="120" ry="34" stroke="#60a5fa" strokeOpacity="0.12" strokeWidth="1.5" />
      {/* Sariq yoy */}
      <path d="M 60 268 A 130 40 0 0 0 320 268" stroke="#f59e0b" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />

      {/* Podium */}
      <ellipse cx="190" cy="270" rx="96" ry="28" fill="url(#a3-pod)" />
      <rect x="94" y="252" width="192" height="18" fill="url(#a3-pod)" />
      <ellipse cx="190" cy="252" rx="96" ry="28" fill="url(#a3-podTop)" />
      <ellipse cx="190" cy="252" rx="78" ry="22" fill="#1a2438" fillOpacity="0.55" />

      {/* Telefon */}
      <g transform="rotate(-7 190 160)">
        <rect x="150" y="62" width="82" height="168" rx="15" fill="url(#a3-body)" />
        <rect x="155" y="67" width="72" height="158" rx="11" fill="#0b1220" />
        <rect x="157" y="69" width="68" height="154" rx="9" fill="url(#a3-screen)" />
        {/* Yuqori kesik */}
        <rect x="177" y="72" width="28" height="5" rx="2.5" fill="#1c2740" />
        {/* Yon tugma */}
        <rect x="232" y="100" width="2.5" height="22" rx="1.2" fill="#dc2626" fillOpacity="0.8" />
        {/* Ekrandagi go'shak */}
        <g transform="translate(191 148) scale(1.5)">
          <path
            d="M -12 -12 c 1.5 -1.5 4 -1.5 5.5 0 l 3.5 3.5 c 1.5 1.5 1.5 4 0 5.5 l -2 2 c -0.7 0.7 -0.9 1.7 -0.5 2.6 1.8 3.9 5 7.1 8.9 8.9 0.9 0.4 1.9 0.2 2.6 -0.5 l 2 -2 c 1.5 -1.5 4 -1.5 5.5 0 l 3.5 3.5 c 1.5 1.5 1.5 4 0 5.5 l -1.7 1.7 c -2.6 2.6 -6.6 3.3 -9.8 1.6 C -3.4 16.6 -12.6 7.4 -16.9 -1.5 c -1.7 -3.2 -1 -7.2 1.6 -9.8 z"
            fill="url(#a3-ph)"
          />
        </g>
      </g>

      {/* Chat pufakchasi */}
      <g transform="rotate(-6 78 96)">
        <rect x="36" y="66" width="84" height="60" rx="17" fill="url(#a3-bub)" />
        <path d="M 58 124 l 4 18 l 16 -14 z" fill="#1d4ed8" />
        <circle cx="60" cy="96" r="6" fill="#eff6ff" />
        <circle cx="78" cy="96" r="6" fill="#eff6ff" />
        <circle cx="96" cy="96" r="6" fill="#eff6ff" />
      </g>

      {/* Joylashuv belgisi */}
      <g transform="rotate(8 306 118)">
        <path
          d="M 306 62 c -21 0 -38 17 -38 38 0 27 30 55 36 60 1.2 1 2.8 1 4 0 6 -5 36 -33 36 -60 0 -21 -17 -38 -38 -38 z"
          fill="url(#a3-pin)"
        />
        <ellipse cx="306" cy="99" rx="13" ry="14" fill="#7f1d1d" />
      </g>
    </svg>
  );
}
