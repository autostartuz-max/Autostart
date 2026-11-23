import { useState } from 'react';
import { Check, IdCard } from 'lucide-react';
import PastkiOyna from '../components/PastkiOyna';
import '../components/imtihon-sana.css';
import { HAYDOVCHI_TOIFALARI, ToifaIkonka } from './toifalar';

/**
 * Toifa tanlash oynasi: transport rasmlari bilan to'r (2026-11 rasm namunasi). Tanlangan toifa
 * profilga saqlanadi (PATCH /me category) va Profilda ko'rinadi.
 */
export default function ToifaTanlash({ joriy, onClose, onSaqla }: {
  joriy: string | null;
  onClose: () => void;
  onSaqla: (kod: string) => Promise<void>;
}) {
  const [tanlangan, setTanlangan] = useState<string | null>(joriy);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState('');

  const saqla = async () => {
    if (!tanlangan || saqlanmoqda) return;
    if (tanlangan === joriy) { onClose(); return; }
    setSaqlanmoqda(true);
    setXato('');
    try {
      await onSaqla(tanlangan);
      onClose();
    } catch (e: any) {
      setXato(e?.message || 'Saqlab bo‘lmadi. Internetni tekshiring.');
      setSaqlanmoqda(false);
    }
  };

  return (
    <PastkiOyna
      className="keng-markaz is-oyna"
      title="Toifani tanlang"
      subtitle="Qaysi toifadagi guvohnomaga tayyorlanyapsiz?"
      ikonka={<IdCard />}
      onClose={onClose}
    >
      <div className="tk-tor" role="radiogroup" aria-label="Haydovchilik toifasi">
        {HAYDOVCHI_TOIFALARI.map((t) => (
          <button
            key={t.kod}
            type="button"
            role="radio"
            aria-checked={tanlangan === t.kod}
            className={'tk-katak' + (tanlangan === t.kod ? ' tanlangan' : '')}
            onClick={() => { setTanlangan(t.kod); setXato(''); }}
          >
            {tanlangan === t.kod && <span className="tk-belgi" aria-hidden="true"><Check /></span>}
            <ToifaIkonka kod={t.kod} />
            <b>{t.kod}</b>
            <span>{t.nom}</span>
          </button>
        ))}
      </div>
      {xato && <div className="is-xato" role="alert">{xato}</div>}
      <button type="button" className="is-saqla" disabled={!tanlangan || saqlanmoqda} onClick={saqla}>
        {saqlanmoqda ? 'Saqlanmoqda…' : 'Saqlash'}
      </button>
    </PastkiOyna>
  );
}
