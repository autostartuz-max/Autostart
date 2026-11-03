import type { ReactNode } from 'react';
import PastkiMenyu, { type MenyuBolim } from './PastkiMenyu';
import '../tema.css';
import './komponentlar.css';

// QOLIP — F-agent to'ldiradi (KONTRAKT.md). Props o'zgarmaydi.
/** Menyuli ekran qobig'i: fon, padding, pastda menyu uchun joy va menyuning o'zi */
export default function Ekran({ faol, children, className }: { faol: MenyuBolim; children: ReactNode; className?: string }) {
  return (
    <div className={'ilv ilv-ekran' + (className ? ' ' + className : '')}>
      <div className="ilv-ichi">{children}</div>
      <PastkiMenyu faol={faol} />
    </div>
  );
}
