import { useNavigate } from 'react-router-dom';
import '../tema.css';
import './komponentlar.css';

// QOLIP — F-agent to'ldiradi (KONTRAKT.md). Props va manzillar o'zgarmaydi.
export type MenyuBolim = 'asosiy' | 'testlar' | 'organish' | 'profil';

export const MENYU: { bolim: MenyuBolim; yozuv: string; manzil: string }[] = [
  { bolim: 'asosiy', yozuv: 'Asosiy', manzil: '/' },
  { bolim: 'testlar', yozuv: 'Testlar', manzil: '/testlar' },
  { bolim: 'organish', yozuv: 'O‘rganish', manzil: '/organish' },
  { bolim: 'profil', yozuv: 'Profil', manzil: '/men' },
];

export default function PastkiMenyu({ faol }: { faol: MenyuBolim }) {
  const nav = useNavigate();
  return (
    <nav className="ilv-menyu" aria-label="Asosiy menyu">
      {MENYU.map((m) => (
        <button
          key={m.bolim}
          type="button"
          className={'ilv-menyu-b' + (m.bolim === faol ? ' faol' : '')}
          aria-current={m.bolim === faol ? 'page' : undefined}
          onClick={() => m.bolim !== faol && nav(m.manzil, { replace: true })}
        >
          <span className="ilv-menyu-yozuv">{m.yozuv}</span>
        </button>
      ))}
    </nav>
  );
}
