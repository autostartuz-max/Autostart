import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import '../tema.css';
import './komponentlar.css';

export type MenyuBolim = 'asosiy' | 'testlar' | 'organish' | 'profil';

export const MENYU: { bolim: MenyuBolim; yozuv: string; manzil: string }[] = [
  { bolim: 'asosiy', yozuv: 'Asosiy', manzil: '/' },
  { bolim: 'testlar', yozuv: 'Testlar', manzil: '/testlar' },
  { bolim: 'organish', yozuv: 'O‘rganish', manzil: '/organish' },
  { bolim: 'profil', yozuv: 'Profil', manzil: '/men' },
];

// Ikonkalar namunadan o'lchab chizilgan (20×20). lucide'dagi o'xshashlari shakli farq qiladi:
// qalpoqchada popuk bor va pastki qismi yopishgan, odamchaning yelkasi to'rtburchak.
const IKONKA: Record<MenyuBolim, ReactNode> = {
  asosiy: (
    <path d="M10 2.13 17.42 8.59V17.53H2.58V8.59Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  ),
  testlar: (
    <>
      <rect x="1.73" y="1.8" width="7.33" height="7.33" rx="2" />
      <rect x="10.93" y="1.8" width="7.33" height="7.33" rx="2" />
      <rect x="1.73" y="11" width="7.33" height="7.33" rx="2" />
      <rect x="10.93" y="11" width="7.33" height="7.33" rx="2" />
    </>
  ),
  organish: (
    <>
      <path d="M10 2.47 19.33 7.67 10 12.73.67 7.67Z" />
      <path d="M4.8 11.4 10 14.33 15.2 11.4V14.67A5.2 1.67 0 0 1 4.8 14.67Z" />
    </>
  ),
  profil: (
    <>
      <circle cx="10" cy="6.33" r="4.1" />
      <path d="M2.33 18.33A7.67 6.13 0 0 1 17.67 18.33Z" />
    </>
  ),
};

/** Pastki menyu: ekran pastida qotib turadi, faol bo'lim sariq. */
export default function PastkiMenyu({ faol }: { faol: MenyuBolim }) {
  const nav = useNavigate();
  // Telefondagi odatiy pastki menyudek: Bosh sahifadan bo'limga o'tish tarixga qo'shiladi
  // (orqaga = Bosh sahifa), bo'limdan bo'limga — almashtiriladi (orqaga tugmasi bo'limlarni
  // birma-bir aylanib chiqmaydi), "Asosiy" esa Bosh sahifaga orqaga qaytaradi.
  const bos = (m: (typeof MENYU)[number]) => {
    if (m.bolim === faol) return;
    if (faol === 'asosiy') nav(m.manzil);
    else if (m.bolim === 'asosiy') {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) nav(-1);
      else nav('/', { replace: true });
    } else nav(m.manzil, { replace: true });
  };
  return (
    <nav className="ilv-menyu" aria-label="Asosiy menyu">
      <div className="ilv-menyu-ichi">
        {MENYU.map((m) => (
          <button
            key={m.bolim}
            type="button"
            className={'ilv-menyu-b' + (m.bolim === faol ? ' faol' : '')}
            aria-current={m.bolim === faol ? 'page' : undefined}
            onClick={() => bos(m)}
          >
            <svg className="ilv-menyu-ikonka" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {IKONKA[m.bolim]}
            </svg>
            <span className="ilv-menyu-yozuv">{m.yozuv}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
