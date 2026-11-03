import { useId } from 'react';
import './test1.css';

/** "#" belgisining to'rt tayog'i: tik tayoqlar namunadagidek ~7° qiya (kursiv). */
const PANJARA = 'M190.6 71.5 181.3 147.2M220.4 71.5 211.3 147.2M165 95.6h68M161.8 125.6h69';

/**
 * Raqamli savollar kartochkasi ikonkasi: ko'k 3D "#" belgisi, 5px qalinlik bilan.
 * O'z markazi atrofida chapga-o'ngga ±12° chayqaladi (3 s). Namuna: namuna/kartalar/raqamli.png
 * Koordinatalar namuna kartochkasining pikselida (1pt = 1.5px), viewBox — 72×72pt ikonka qutisi.
 */
export default function Panjara() {
  const id = useId();
  return (
    <span className="ilv-joy ilv-joy-panjara" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="142.5 57 108 108" width="100%" height="100%">
        <defs>
          {/* 50/100 ikonkasi bilan bir xil ko'k: chap yuqoridan o'ng pastga, chetlarda to'yingan */}
          <linearGradient id={id + 'kok'} gradientUnits="userSpaceOnUse" x1="168.6" y1="81.7" x2="223.8" y2="134.8">
            <stop offset="0" stopColor="#71abf8" />
            <stop offset="1" stopColor="#2b6ad7" />
          </linearGradient>
        </defs>
        <g className="ilv-ani ilv-panjara-tebran" fill="none" strokeWidth="14.5" strokeLinecap="round">
          <path d={PANJARA} stroke="#0e3489" transform="translate(0 5)" />
          <path d={PANJARA} stroke={`url(#${id}kok)`} />
        </g>
      </svg>
    </span>
  );
}
