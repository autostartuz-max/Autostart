import { useId } from 'react';
import { yulduz } from '../../tarif/Logolar';
import './test2.css';

/*
 * "Saralangan" kartochkasi ikonkasi (2026-11-24, foydalanuvchi namunasi — ClickClickDrive "Merken"
 * tugmasi): oq yumaloq kvadrat, to'q sariq hoshiya va ichida yulduz. 3D: kvadratning ostida qalinligi,
 * yulduzda yorug'lik. Karta koordinatalarida (1 birlik = 1pt) — o'ng-past burchakka yopishadi.
 * Yulduz biroz tebranib turadi (ilv-ani — faqat karta ekranda bo'lsa).
 */
export default function Yulduz() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-yulduz" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="93 28 82 84" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'k'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#fff1dc" />
          </linearGradient>
          <linearGradient id={id + 'y'} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#fff8e6" />
            <stop offset="1" stopColor="#ffdc96" />
          </linearGradient>
        </defs>
        {/* Kvadratning qalinligi (3D) va o'zi */}
        <rect x="103" y="46" width="60" height="58" rx="15" fill="#d98a16" />
        <rect x="103" y="40" width="60" height="58" rx="15" fill={u('k')} stroke="#f5a623" strokeWidth="3.2" />
        <path d="M110 58C110 50 114.5 46 121 45.6" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
        <g className="ilv-ani ilv-yulduz-tebran">
          <path d={yulduz(133, 69.5, 19.5, 8.6)} fill={u('y')} stroke="#f5a623" strokeWidth="3.4" strokeLinejoin="round" />
          <path d="M127.4 61.4 130.6 56.2" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity=".85" />
        </g>
      </svg>
    </span>
  );
}
