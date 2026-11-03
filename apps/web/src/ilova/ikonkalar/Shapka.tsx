import { useId } from 'react';
import './test2.css';

// Karta koordinatalarida (1 birlik = 1pt), namuna darslik.png dan o'lchangan
const TAXTA = 'M124.6 39.3L163.4 56.2Q165.2 57 163.4 57.7L124.6 73.3L85.8 57.7Q84 57 85.8 56.2Z';
const QIRRA = 'M85.8 57.7L124.6 73.3L163.4 57.7Q165 58.3 163.8 59.6L124.6 77.3L85.6 60.4Q84.2 58.6 85.8 57.7Z';
const TANA = 'M101 63V88.5C101 92.5 112 97.3 124.5 97.3C136 97.3 149.2 93 149.2 88V63Z';

/** Darslik kartochkasi ikonkasi: qora bitiruv shapkasi, sariq popuk. Shapka ko'tarilib, biroz og'adi. */
export default function Shapka() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-shapka" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="71.67 18 103 94" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 't'} gradientUnits="userSpaceOnUse" x1="124.6" y1="39.3" x2="137" y2="68.8">
            <stop offset="0" stopColor="#55595f" />
            <stop offset="0.14" stopColor="#53565b" />
            <stop offset="0.2" stopColor="#4a4c52" />
            <stop offset="0.3" stopColor="#474a52" />
            <stop offset="0.4" stopColor="#424449" />
            <stop offset="0.55" stopColor="#3b3d43" />
            <stop offset="0.68" stopColor="#37393e" />
            <stop offset="0.8" stopColor="#333439" />
            <stop offset="0.88" stopColor="#2e313b" />
            <stop offset="1" stopColor="#29292d" />
          </linearGradient>
          <linearGradient id={id + 'b'} gradientUnits="userSpaceOnUse" x1="100" y1="64" x2="119" y2="99.2">
            <stop offset="0" stopColor="#737a80" />
            <stop offset="0.15" stopColor="#676f74" />
            <stop offset="0.29" stopColor="#5b6169" />
            <stop offset="0.41" stopColor="#52565d" />
            <stop offset="0.53" stopColor="#4a4c51" />
            <stop offset="0.63" stopColor="#424449" />
            <stop offset="0.73" stopColor="#3a3c42" />
            <stop offset="0.81" stopColor="#36393e" />
            <stop offset="0.9" stopColor="#2f323b" />
            <stop offset="1" stopColor="#26272b" />
          </linearGradient>
          <linearGradient id={id + 'i'} gradientUnits="userSpaceOnUse" x1="122" y1="0" x2="151" y2="0">
            <stop offset="0" stopColor="#fff3a6" />
            <stop offset="0.22" stopColor="#fde55e" />
            <stop offset="0.6" stopColor="#f6d84c" />
            <stop offset="1" stopColor="#e8c43c" />
          </linearGradient>
          <linearGradient id={id + 'v'} gradientUnits="userSpaceOnUse" x1="0" y1="61" x2="0" y2="82">
            <stop offset="0" stopColor="#e8c643" />
            <stop offset="0.45" stopColor="#e4b912" />
            <stop offset="1" stopColor="#d3a40b" />
          </linearGradient>
          <linearGradient id={id + 'p'} gradientUnits="userSpaceOnUse" x1="146" y1="83" x2="159" y2="96">
            <stop offset="0" stopColor="#fde55c" />
            <stop offset="0.3" stopColor="#f3d859" />
            <stop offset="0.52" stopColor="#eac845" />
            <stop offset="0.75" stopColor="#e4bc2c" />
            <stop offset="1" stopColor="#d9aa08" />
          </linearGradient>
        </defs>

        <g className="ilv-ani ilv-shapka-kiyim">
          {/* aylanish markazi (117; 63) bo'lishi uchun ko'rinmas tayanch to'rtburchak */}
          <rect x="68.8" y="24.7" width="96.4" height="76.6" fill="none" />
          <path d={TANA} fill={u('b')} />
          <path d={QIRRA} fill="#18181b" />
          <path d={TAXTA} fill={u('t')} />
          {/* ip: tugmachadan taxta chetigacha, so'ng pastga; popuk */}
          <path d="M124.6 56.5L150.4 61.3" fill="none" stroke={u('i')} strokeWidth="3.6" strokeLinecap="round" />
          <g className="ilv-ani ilv-shapka-popuk">
            <path d="M150.4 61.3Q152.4 61.7 152.4 63.6V81.6" fill="none" stroke={u('v')} strokeWidth="3.3" strokeLinejoin="round" />
            <path d="M148.6 81.3H155.8L158.8 97.4Q158.9 98.3 158 98.3H146.4Q145.5 98.3 145.6 97.4Z" fill={u('p')} />
          </g>
          <ellipse cx="125.4" cy="56.6" rx="2.4" ry="1.75" fill="#fff6b8" />
        </g>
      </svg>
    </span>
  );
}
