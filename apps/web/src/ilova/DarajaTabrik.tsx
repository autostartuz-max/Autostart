import { useEffect, useMemo, useState } from 'react';
import { DARAJALAR, DARAJA_OSHDI, darajaIndeksi } from './darajalar';
import { Tanga } from '../screens/ilova/Profil';
import DarajaLogo from './DarajaLogo';
import './daraja-tabrik.css';

/** Sochiladigan tangalar soni */
const TANGA_SONI = 26;

/**
 * Ilova: yangi darajaga chiqqanda tabrik. Daraja qahramoni (velosipedchi, skuterchi, mashina…)
 * o'ng tomondan chiqib keladi, "Tabriklaymiz!" deydi va coin sochadi.
 * api.ts → darajaniKuzat() 'daraja:oshdi' hodisasini yuboradi; bu komponent App ichida (faqat ilovada).
 */
export default function DarajaTabrik() {
  const [nom, setNom] = useState<string | null>(null);

  useEffect(() => {
    const ochil = (e: Event) => setNom((e as CustomEvent).detail?.nom || null);
    window.addEventListener(DARAJA_OSHDI, ochil);
    return () => window.removeEventListener(DARAJA_OSHDI, ochil);
  }, []);

  // Telefonning "orqaga" tugmasi — avval tabrik yopiladi
  useEffect(() => {
    if (!nom) return;
    const orqaga = (e: Event) => { e.preventDefault(); setNom(null); };
    window.addEventListener('ilova:orqaga', orqaga);
    return () => window.removeEventListener('ilova:orqaga', orqaga);
  }, [nom]);

  // Har tanganing yo'nalishi (har ochilishda yangi)
  const tangalar = useMemo(
    () => Array.from({ length: TANGA_SONI }, (_, i) => {
      const burchak = (-160 + (140 * i) / (TANGA_SONI - 1) + (Math.random() * 14 - 7)) * (Math.PI / 180);
      const kuch = 110 + Math.random() * 120;
      return {
        x: Math.cos(burchak) * kuch,
        y: Math.sin(burchak) * kuch,
        kechikish: Math.random() * 0.25,
        aylanish: Math.round(Math.random() * 720 - 360),
        olcham: 18 + Math.random() * 12,
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nom],
  );

  if (!nom) return null;
  const i = darajaIndeksi(nom);
  const d = DARAJALAR[i];
  if (!d) return null;
  const keyingi = DARAJALAR[i + 1];

  return (
    <div className="dt-fon" role="dialog" aria-modal="true" aria-label={`${d.nom} darajasi`} onClick={() => setNom(null)}>
      <div className="dt-sahna" onClick={(e) => e.stopPropagation()}>
        <div className="dt-nur" aria-hidden="true" />
        <div className="dt-yol" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="dt-qahramon" aria-hidden="true">
          <span className="dt-shamol"><i /><i /><i /></span>
          <span className="dt-emoji">{d.qahramon}</span>
        </div>
        <div className="dt-tangalar" aria-hidden="true">
          {tangalar.map((t, k) => (
            <span
              key={k}
              className="dt-tanga"
              style={{
                '--x': `${t.x}px`, '--y': `${t.y}px`, '--r': `${t.aylanish}deg`,
                '--k': `${1.05 + t.kechikish}s`, width: t.olcham, height: t.olcham,
              } as React.CSSProperties}
            >
              <Tanga />
            </span>
          ))}
        </div>

        <div className="dt-matn">
          <DarajaLogo nom={d.nom} size={84} className="dt-logo" />
          <div className="dt-tabrik">Tabriklaymiz!</div>
          {/* Matnlar 2026-11 hujjatidan: "Tabriklaymiz sizning darajangiz velosipedchi. To'xtab qolmang…" */}
          <div className="dt-daraja">
            {d.nom === 'Pilot' ? <>Siz <b>eng zo‘risiz!</b></> : <>Sizning darajangiz — <b>{d.nom.toUpperCase()}</b></>}
          </div>
          <div className="dt-shior">{d.shior}</div>
          {keyingi && (
            <div className="dt-keyingi">
              Keyingi daraja: {keyingi.nom} — {keyingi.dan} coin{keyingi.nom === 'Pilot' ? ' va barcha savollarga to‘g‘ri javob' : ''}
            </div>
          )}
          <button type="button" className="dt-tugma" onClick={() => setNom(null)}>Davom etish</button>
        </div>
      </div>
    </div>
  );
}
