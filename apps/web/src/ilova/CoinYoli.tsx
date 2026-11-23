import { DARAJALAR } from './darajalar';
import './coin-yoli.css';

/**
 * Coin yo'li (Profil, 2026-11-24 — foydalanuvchi namunasi: ClickClickDrive "Mein Fortschritt").
 * Chapda foiz, yo'l bo'ylab foydalanuvchi darajasining transporti (piyoda, velosiped, skuter, mashina,
 * poyga mashinasi) yuradi, o'ngda — keyingi daraja transporti (oxirgi darajada kubok).
 */
export default function CoinYoli({ ulush, nom, keyingi, izoh }: {
  /** 0..1 — keyingi darajagacha bosib o'tilgan yo'l */
  ulush: number;
  /** Joriy daraja nomi */
  nom: string;
  /** Keyingi daraja nomi (oxirgi darajada null) */
  keyingi: string | null;
  /** Ekran o'quvchi uchun: "Velosipedchi darajasigacha" */
  izoh: string;
}) {
  const d = DARAJALAR.find((x) => x.nom === nom) || DARAJALAR[0];
  const k = keyingi ? DARAJALAR.find((x) => x.nom === keyingi) : null;
  const u = Math.max(0, Math.min(1, ulush));
  const foiz = Math.round(u * 100);
  return (
    <div className="cy" role="progressbar" aria-label={izoh} aria-valuemin={0} aria-valuemax={100} aria-valuenow={foiz}>
      <span className="cy-foiz">{foiz} %</span>
      <div className="cy-iz" style={{ '--u': u } as React.CSSProperties}>
        <span className="cy-chiziq" aria-hidden="true" />
        <span className="cy-otilgan" aria-hidden="true" />
        <span className="cy-transport" aria-hidden="true" title={d.nom}>
          <span className="cy-belgi">{d.qahramon}</span>
        </span>
      </div>
      <span className="cy-maqsad" aria-hidden="true" title={k ? k.nom : 'Eng yuqori daraja'}>{k ? k.qahramon : '🏆'}</span>
    </div>
  );
}
