import { DARAJALAR } from './darajalar';
import type { BallMen } from '../api';
import './coin-yoli.css';

const raqam = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Daraja yo'li ma'lumoti (Bosh sahifa kartasi uchun; Profil ham xuddi shu qoidada): keyingi darajagacha
 * coin ulushi, Pilot sharti kutilayotgan bo'lsa — hamma savolga to'g'ri javob ulushi.
 */
export function darajaYoli(ball: BallMen) {
  const d = ball.daraja;
  const keyingi = d.keyingi;
  if (ball.pilot && d.nom !== 'Pilot') {
    const { togri, jami } = ball.pilot;
    return {
      ulush: jami ? togri / jami : 0, nom: d.nom, keyingi: 'Pilot', sarlavha: 'Pilot darajasi sari',
      matn: `${raqam(togri)} / ${raqam(jami)} to‘g‘ri`, izoh: 'Pilot darajasigacha',
    };
  }
  const oraliq = keyingi ? keyingi.dan - d.dan : 0;
  return {
    ulush: !keyingi || oraliq <= 0 ? 1 : (ball.ball - d.dan) / oraliq,
    nom: d.nom,
    keyingi: keyingi?.nom ?? null,
    sarlavha: keyingi ? `${keyingi.nom} darajasi sari` : 'Eng yuqori daraja',
    matn: keyingi ? `${raqam(ball.ball)} / ${raqam(keyingi.dan)} coin` : `${raqam(ball.ball)} coin`,
    izoh: keyingi ? `${keyingi.nom} darajasigacha` : d.nom,
  };
}

/**
 * Bosh sahifa: coin yo'li kartasi (2026-11-24 — foydalanuvchi: "bu ko'rinish asosiy oynada bo'lishi kerak").
 * Test yechish kartasidek doim to'q; bosilsa Profil (daraja tafsilotlari) ochiladi.
 */
export function CoinYoliKarta({ ball, onClick }: { ball: BallMen; onClick: () => void }) {
  const y = darajaYoli(ball);
  return (
    <button type="button" className="ilv-cy-karta" onClick={onClick} aria-label={`${y.sarlavha}: ${y.matn}. Profilni ochish`}>
      <span className="ilv-cy-bosh">
        <b>{y.sarlavha}</b>
        <span>{y.matn}</span>
      </span>
      <CoinYoli ulush={y.ulush} nom={y.nom} keyingi={y.keyingi} izoh={y.izoh} />
    </button>
  );
}

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
