import '../tema.css';
import './komponentlar.css';

// QOLIP — F-agent to'ldiradi (KONTRAKT.md). Props o'zgarmaydi.
export interface StatBlokProps {
  son: number | string;
  yozuv: string;
  rang: 'togri' | 'xato' | 'qolgan';
}

export default function StatBlok({ son, yozuv, rang }: StatBlokProps) {
  return (
    <div className={'ilv-stat ilv-stat-' + rang} role="group" aria-label={`${yozuv}: ${son}`}>
      <b className="ilv-stat-son">{son}</b>
      <span className="ilv-stat-yozuv">{yozuv}</span>
    </div>
  );
}
