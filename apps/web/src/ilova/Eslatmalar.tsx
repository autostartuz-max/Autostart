import { useEffect, useState } from 'react';
import { Baby, Bus, ChevronLeft, ChevronRight, Footprints, Gauge, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../api';
import { TaqiqBelgisi } from '../tarif/Logolar';
import { kunIndeksi } from './KunlikOyna';
import './kunlik.css';

type Eslatma = { matn: string; taqiq?: boolean };

/** Eslatma mavzusiga qarab belgi (admin matnni o'zgartirsa ham mos keladi) */
function Belgi({ e }: { e: Eslatma }) {
  if (e.taqiq) return <TaqiqBelgisi size={54} />;
  const m = e.matn.toLowerCase();
  const Ik = m.includes('piyoda') ? Footprints
    : m.includes('chiqindi') ? Trash2
      : m.includes('transport') ? Bus
        : m.includes('farzand') || m.includes('uka') || m.includes('bola') ? Baby
          : m.includes('tezlik') ? Gauge
            : ShieldAlert;
  return <span className="esl-ik"><Ik aria-hidden="true" /></span>;
}

/**
 * Xavfsizlik eslatmalari (2026-11 hujjat, 6 ta; birinchisi taqiq belgisi bilan). Bosh sahifada har kuni
 * bittasi ko'rinadi, strelkalar bilan qolganlarini ko'rsa bo'ladi. Matnlar serverdan (admin tahrirlaydi).
 */
export default function Eslatmalar({ tur }: { tur: 'ilova' | 'sayt' }) {
  const [royxat, setRoyxat] = useState<Eslatma[] | null>(null);
  const [i, setI] = useState(() => kunIndeksi());

  useEffect(() => {
    api.matnlar().then((m) => setRoyxat(m.eslatmalar || [])).catch(() => { /* eslatma ko'rinmaydi */ });
  }, []);

  if (!royxat?.length) return null;
  const n = royxat.length;
  const joriy = ((i % n) + n) % n;
  const e = royxat[joriy];

  return (
    <section className={'esl esl-' + tur} aria-label="Xavfsizlik eslatmasi">
      <div className="esl-belgi">
        <Belgi e={e} />
      </div>
      <div className="esl-t">
        <b>Eslatma</b>
        <p>{e.matn}</p>
      </div>
      {n > 1 && (
        <div className="esl-nav">
          <button type="button" onClick={() => setI(i - 1)} aria-label="Oldingi eslatma"><ChevronLeft aria-hidden="true" /></button>
          <span>{joriy + 1}/{n}</span>
          <button type="button" onClick={() => setI(i + 1)} aria-label="Keyingi eslatma"><ChevronRight aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}
