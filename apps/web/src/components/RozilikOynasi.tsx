import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import PastkiOyna from './PastkiOyna';
import { Maxfiylik, Shartlar, Oferta } from '../screens/Legal';
import { TASHKILOT as T } from '../legal';
import './imtihon-sana.css';
import './rozilik.css';

export type HujjatKod = 'maxfiylik' | 'shartlar' | 'oferta';
const NOMI: Record<HujjatKod, string> = {
  maxfiylik: 'Maxfiylik siyosati',
  shartlar: 'Foydalanish shartlari',
  oferta: 'Ommaviy oferta',
};

/**
 * Ilova: ro'yxatdan o'tishda hujjatlarni o'qib tasdiqlash (2026-11-23). Hujjatlar shu oynaning ichida
 * ochiladi — forma yopilmaydi, yozilgan ism/telefon yo'qolmaydi. "Tanishdim va roziman" tugmasi
 * maxfiylik siyosati oxirigacha o'qilgandan keyin ochiladi; bosilsa rozilik belgilanadi.
 */
export default function RozilikOynasi({ boshlangich, onClose, onRozi }: {
  boshlangich: HujjatKod;
  onClose: () => void;
  onRozi: () => void;
}) {
  const [tab, setTab] = useState<HujjatKod>(boshlangich);
  const [oqildi, setOqildi] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Maxfiylik siyosati oxirigacha (24px qolguncha) aylantirildimi
  const tekshir = useCallback(() => {
    const el = ref.current;
    if (!el || tab !== 'maxfiylik') return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setOqildi(true);
  }, [tab]);

  // Hujjat almashganda boshidan; matn qisqa bo'lsa (aylantirish shart emas) — darhol o'qilgan hisoblanadi
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
    const r = requestAnimationFrame(tekshir);
    return () => cancelAnimationFrame(r);
  }, [tab, tekshir]);

  return (
    <PastkiOyna
      className="keng-markaz is-oyna rz-oyna"
      title="Hujjatlar bilan tanishing"
      subtitle="Ro‘yxatdan o‘tish uchun maxfiylik siyosatini o‘qib, tasdiqlang"
      ikonka={<ShieldCheck />}
      onClose={onClose}
    >
      <div className="rz-tablar" role="tablist">
        {(Object.keys(NOMI) as HujjatKod[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'faol' : undefined} onClick={() => setTab(k)}>
            {NOMI[k]}
          </button>
        ))}
      </div>
      <div className="rz-doc" ref={ref} onScroll={tekshir} tabIndex={0} aria-label={NOMI[tab]}>
        <div className="rz-sana">Oxirgi yangilanish: {T.sana}</div>
        {tab === 'maxfiylik' ? <Maxfiylik /> : tab === 'shartlar' ? <Shartlar /> : <Oferta />}
      </div>
      {!oqildi && (
        <div className="rz-izoh">
          {tab === 'maxfiylik' ? 'Tasdiqlash uchun maxfiylik siyosatini oxirigacha o‘qing' : 'Tasdiqlash uchun “Maxfiylik siyosati”ni oxirigacha o‘qing'}
        </div>
      )}
      <button type="button" className="is-saqla" disabled={!oqildi} onClick={() => { onRozi(); onClose(); }}>
        Tanishdim va roziman
      </button>
    </PastkiOyna>
  );
}
