import { useId } from 'react';
import { Users } from 'lucide-react';
import { narxMatn } from './holat';
import './dostlar-karta.css';

/** To'rt uchli uchqun (yulduzcha) */
const uchqun = (x: number, y: number, r: number) => {
  const q = r * 0.2;
  return `M${x} ${y - r}Q${x + q} ${y - q} ${x + r} ${y}Q${x + q} ${y + q} ${x} ${y + r}Q${x - q} ${y + q} ${x - r} ${y}Q${x - q} ${y - q} ${x} ${y - r}Z`;
};

/** Uch do'st — quvonib qo'l ko'targan (o'z chizmamiz; stiker uslubida oq chegara) */
function DostlarRasm({ className }: { className?: string }) {
  const id = 'dk' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const chiziq = { stroke: '#1f2d3d', strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round' as const };
  return (
    <svg className={className} viewBox="0 0 180 160" aria-hidden="true">
      <defs>
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="kengay" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="kengay" operator="in" result="chegara" />
          <feMerge>
            <feMergeNode in="chegara" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Uchqunlar va konfetti */}
      <g fill="#ffffff">
        <path d={uchqun(16, 22, 7)} />
        <path d={uchqun(166, 16, 6)} />
        <path d={uchqun(172, 98, 5)} />
        <path d={uchqun(8, 108, 4.5)} opacity=".8" />
      </g>
      <rect x="40" y="16" width="9" height="4" rx="2" fill="#f9a8d4" transform="rotate(-25 44 18)" />
      <rect x="118" y="14" width="9" height="4" rx="2" fill="#fde047" transform="rotate(20 122 16)" />
      <rect x="150" y="126" width="9" height="4" rx="2" fill="#67e8f9" transform="rotate(-35 154 128)" />
      <rect x="64" y="30" width="7" height="4" rx="2" fill="#bef264" transform="rotate(40 67 32)" />

      {/* Chapdagi do'st: to'q sariq ko'ylak */}
      <g filter={`url(#${id})`}>
        <path d="M30 100 L14 70" stroke="#ff8a3d" strokeWidth="12" strokeLinecap="round" />
        <circle cx="13" cy="66" r="7" fill="#f1c19c" />
        <rect x="22" y="86" width="44" height="54" rx="20" fill="#ff8a3d" />
        <path d="M36 91 Q44 100 52 91" stroke="#ffc39a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="64" r="22" fill="#f1c19c" />
        <path d="M22 62C21 41 35 35 47 36 62 37 70 48 66 62 60 52 52 48 42 50 34 51 27 56 22 62Z" fill="#5a3418" />
        <circle cx="37" cy="66" r="2.8" fill="#1f2d3d" />
        <circle cx="52" cy="66" r="2.8" fill="#1f2d3d" />
        <path d="M38 74 Q44.5 80 51 74" {...chiziq} />
        <circle cx="32.5" cy="72" r="3.3" fill="#ff8f8f" opacity=".55" />
        <circle cx="56.5" cy="72" r="3.3" fill="#ff8f8f" opacity=".55" />
      </g>

      {/* O'ngdagi do'st: pushti ko'ylak, sariq soch (dumcha) */}
      <g filter={`url(#${id})`}>
        <path d="M150 98 L166 68" stroke="#ec4899" strokeWidth="12" strokeLinecap="round" />
        <circle cx="167" cy="64" r="7" fill="#f7d6bd" />
        <ellipse cx="157" cy="46" rx="8" ry="14" fill="#f4c542" transform="rotate(38 157 46)" />
        <rect x="114" y="84" width="44" height="54" rx="20" fill="#ec4899" />
        <path d="M128 89 Q136 98 144 89" stroke="#f9a8d4" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="136" cy="62" r="22" fill="#f7d6bd" />
        <path d="M114 60C113 40 128 36 138 37 152 38 160 48 158 60 151 50 141 47 133 49 124 50 118 55 114 60Z" fill="#f4c542" />
        <circle cx="129" cy="64" r="2.8" fill="#1f2d3d" />
        <path d="M141 64.5 Q144.5 61 148 64.5" {...chiziq} />
        <path d="M130 72 Q136.5 78 143 72" {...chiziq} />
        <circle cx="124.5" cy="70" r="3.3" fill="#ff8f8f" opacity=".55" />
        <circle cx="148.5" cy="70" r="3.3" fill="#ff8f8f" opacity=".55" />
      </g>

      {/* O'rtadagi do'st (oldinda): ko'k ko'ylak, jingalak soch, ikki qo'li tepada */}
      <g filter={`url(#${id})`}>
        <path d="M70 120 L52 90" stroke="#3b82f6" strokeWidth="13" strokeLinecap="round" />
        <path d="M110 120 L128 90" stroke="#3b82f6" strokeWidth="13" strokeLinecap="round" />
        <circle cx="50.5" cy="86" r="7.5" fill="#c98b5e" />
        <circle cx="129.5" cy="86" r="7.5" fill="#c98b5e" />
        <rect x="64" y="104" width="52" height="50" rx="22" fill="#3b82f6" />
        <path d="M80 109 Q90 119 100 109" stroke="#93c5fd" strokeWidth="4" fill="none" strokeLinecap="round" />
        <g fill="#1d1d1f">
          <circle cx="71" cy="67" r="10" />
          <circle cx="79" cy="57" r="11" />
          <circle cx="91" cy="53" r="11" />
          <circle cx="103" cy="57" r="11" />
          <circle cx="110" cy="67" r="10" />
        </g>
        <circle cx="90" cy="80" r="25" fill="#c98b5e" />
        <g fill="#1d1d1f">
          <circle cx="78" cy="61" r="7" />
          <circle cx="90" cy="58" r="8" />
          <circle cx="102" cy="61" r="7" />
        </g>
        <path d="M79 82 Q83 77 87 82" {...chiziq} strokeWidth={2.8} />
        <path d="M93 82 Q97 77 101 82" {...chiziq} strokeWidth={2.8} />
        <path d="M81 90 Q90 104 99 90 Z" fill="#7f1d1d" />
        <path d="M85.5 96.5 Q90 100.5 94.5 96.5 Q90 93.5 85.5 96.5Z" fill="#f87171" />
        <circle cx="75" cy="90" r="3.6" fill="#ff8f8f" opacity=".45" />
        <circle cx="105" cy="90" r="3.6" fill="#ff8f8f" opacity=".45" />
      </g>
    </svg>
  );
}

/**
 * "Do'stlar" tarifi kartasi (2026-11-24, foydalanuvchi namunasi — oilaviy obuna reklamasi kabi):
 * gradient fon, nom belgisi, sarlavha, narx va katta oq tugma; o'ngda do'stlar rasmi.
 * Tugma Premium + Do'stlar tarifini tanlaydi (Tariflar sahifasi muddat tanloviga suradi).
 */
export default function DostlarKarta({ odam, narx, narx3, tanlangan, onTanla }: {
  odam: number;
  narx: number;
  narx3: number;
  tanlangan: boolean;
  onTanla: () => void;
}) {
  // Kishi boshiga oylik: 299 000 / 3 = 99 667 → "100 000 so'mdan kam"
  const kishi = narx / odam;
  const yuqori = Math.ceil(kishi / 1000) * 1000;
  const kishiMatn = kishi < yuqori ? narxMatn(yuqori) + 'dan kam' : narxMatn(kishi);
  return (
    <section className="tf2-dk" aria-label="Do‘stlar tarifi">
      <DostlarRasm className="tf2-dk-rasm" />
      <div className="tf2-dk-ichi">
        <span className="tf2-dk-belgi"><Users aria-hidden="true" /> DO‘STLAR</span>
        <h2>Do‘stlar bilan — tejamkor!</h2>
        <p>Premium imkoniyatlari {odam} kishigacha. Kishi boshiga oyiga {kishiMatn}.</p>
      </div>
      <div className="tf2-dk-narx">
        <span><b>{narxMatn(narx)}</b> / oyiga</span>
        <span><b>{narxMatn(narx3)}</b> / 3 oyga</span>
      </div>
      <button type="button" className={'tf2-dk-tugma' + (tanlangan ? ' tanlangan' : '')} onClick={onTanla}>
        {tanlangan ? 'Do‘stlar tarifi tanlandi ✓' : 'Do‘stlar tarifini tanlash'}
      </button>
    </section>
  );
}
