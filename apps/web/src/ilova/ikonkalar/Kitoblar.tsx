import { useId } from 'react';
import './test2.css';

/*
 * Darslik kartochkasi ikonkasi (2026-11-24, foydalanuvchi namunasi — javondagi kitoblar): uch kitob
 * yog'och javonda, 3D ko'rinishda (old yuzasi, o'ng qirrasi va tepasi alohida soyalangan).
 * Karta koordinatalarida chizilgan (1 birlik = 1pt) — boshqa ikonkalar kabi o'ng-past burchakda.
 * Yashil kitob vaqti-vaqti bilan ko'tarilib, biroz og'adi (ilv-ani — faqat karta ekranda bo'lsa).
 */
export default function Kitoblar() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-kitoblar" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="70 16 105 96" width="100%" height="100%">
        <defs>
          <linearGradient id={id + 'ko'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5cb2ff" />
            <stop offset="1" stopColor="#2a76de" />
          </linearGradient>
          <linearGradient id={id + 'ya'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3fd197" />
            <stop offset="1" stopColor="#1c9a66" />
          </linearGradient>
          <linearGradient id={id + 'qi'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff7466" />
            <stop offset="1" stopColor="#dd3a2e" />
          </linearGradient>
          <linearGradient id={id + 'jt'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0c08a" />
            <stop offset="1" stopColor="#d99a58" />
          </linearGradient>
          <linearGradient id={id + 'jo'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c98a4b" />
            <stop offset="1" stopColor="#a4652d" />
          </linearGradient>
        </defs>

        {/* Javon: tepasi, old yuzasi, o'ng qirrasi */}
        <path d="M80 92 88 85.5H166L158 92Z" fill={u('jt')} />
        <path d="M80 92H158V98.6Q158 100 156.6 100H81.4Q80 100 80 98.6Z" fill={u('jo')} />
        <path d="M158 92 166 85.5V93.5L158 100Z" fill="#8a5526" />

        {/* Ko'k kitob */}
        <path d="M90 50 96 45H113L107 50Z" fill="#8fcaff" />
        <path d="M107 50 113 45V87L107 92Z" fill="#1a58a8" />
        <rect x="90" y="50" width="17" height="42" fill={u('ko')} />
        <rect x="90.8" y="50" width="2.6" height="42" fill="#ffffff" opacity=".22" />
        <rect x="90" y="56" width="17" height="3" fill="#ffd34d" />
        <rect x="94" y="64" width="9" height="12" rx="1.5" fill="#e6f2ff" />
        <rect x="90" y="84" width="17" height="3" fill="#ffd34d" />

        {/* Yashil kitob (eng balandi) — ko'tariladi */}
        <g className="ilv-ani ilv-kitob-kotar">
          <path d="M108 36 114 31H133L127 36Z" fill="#9ae9c3" />
          <path d="M127 36 133 31V87L127 92Z" fill="#157a52" />
          <rect x="108" y="36" width="19" height="56" fill={u('ya')} />
          <rect x="108.8" y="36" width="2.8" height="56" fill="#ffffff" opacity=".22" />
          <rect x="114" y="44" width="7" height="34" rx="2" fill="#c4f5dd" />
          <rect x="108" y="84" width="19" height="3" fill="#e8fff3" />
        </g>

        {/* Qizil kitob */}
        <path d="M128 48 134 43H151L145 48Z" fill="#ffa89e" />
        <path d="M145 48 151 43V87L145 92Z" fill="#a8261d" />
        <rect x="128" y="48" width="17" height="44" fill={u('qi')} />
        <rect x="128.8" y="48" width="2.6" height="44" fill="#ffffff" opacity=".22" />
        <rect x="128" y="54" width="17" height="3.4" fill="#ffd8a8" />
        <rect x="128" y="59.6" width="17" height="1.8" fill="#ffd8a8" />
        <rect x="128" y="84" width="17" height="3" fill="#ffd8a8" />
      </svg>
    </span>
  );
}
