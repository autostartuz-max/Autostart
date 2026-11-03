import '../tema.css';
import './komponentlar.css';

export interface StatBlokProps {
  son: number | string;
  yozuv: string;
  rang: 'togri' | 'xato' | 'qolgan';
}

/** Statistika katagi: katta son (rangli) va uning ostida yozuv. Qatorga 3 tadan — .ilv-stat-qator */
export default function StatBlok({ son, yozuv, rang }: StatBlokProps) {
  return (
    // Ekran o'quvchi bitta bo'lak qilib o'qiydi: "To‘g‘ri: 16"
    <div className={'ilv-stat ilv-stat-' + rang} role="group" aria-label={`${yozuv}: ${son}`}>
      <b className="ilv-stat-son" aria-hidden="true">{son}</b>
      <span className="ilv-stat-yozuv" aria-hidden="true">{yozuv}</span>
    </div>
  );
}
