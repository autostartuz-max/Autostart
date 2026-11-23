import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import PastkiOyna from '../components/PastkiOyna';
import '../components/imtihon-sana.css';
import './hudud.css';
import { HUDUDLAR } from './hududlar';

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, "'");

/**
 * Hudud tanlash: avval viloyat (14 ta), keyin uning tumani yoki shahri. Qidiruv ikkala bosqichda ham.
 * Tanlov darhol saqlanadi (PATCH /me viloyat, tuman).
 */
export default function HududTanlash({ viloyat, tuman, onClose, onSaqla }: {
  viloyat: string | null;
  tuman: string | null;
  onClose: () => void;
  onSaqla: (viloyat: string, tuman: string) => Promise<void>;
}) {
  const [tanlanganVil, setTanlanganVil] = useState<string | null>(null);
  const [qidiruv, setQidiruv] = useState('');
  const [saqlanmoqda, setSaqlanmoqda] = useState<string | null>(null);
  const [xato, setXato] = useState('');
  const vil = HUDUDLAR.find((h) => h.nom === tanlanganVil) || null;
  const q = norm(qidiruv.trim());

  const viloyatlar = useMemo(() => (q ? HUDUDLAR.filter((h) => norm(h.nom).includes(q)) : HUDUDLAR), [q]);
  // Viloyat ichida: avval shaharlar, keyin tumanlar
  const joylar = useMemo(() => {
    if (!vil) return [];
    const hammasi = [...vil.shaharlar, ...vil.tumanlar];
    return q ? hammasi.filter((x) => norm(x).includes(q)) : hammasi;
  }, [vil, q]);

  const tanla = async (joy: string) => {
    if (!vil || saqlanmoqda) return;
    setSaqlanmoqda(joy);
    setXato('');
    try {
      await onSaqla(vil.nom, joy);
      onClose();
    } catch (e: any) {
      setXato(e?.message || 'Saqlab bo‘lmadi. Internetni tekshiring.');
      setSaqlanmoqda(null);
    }
  };

  return (
    <PastkiOyna
      className="keng-markaz is-oyna hd-oyna"
      title={vil ? vil.nom : 'Hududingizni tanlang'}
      subtitle={vil ? 'Tuman yoki shaharni tanlang' : 'Viloyat (yoki Toshkent shahri)'}
      ikonka={<MapPin />}
      onClose={onClose}
    >
      {vil && (
        <button type="button" className="hd-orqaga" onClick={() => { setTanlanganVil(null); setQidiruv(''); }}>
          <ChevronLeft aria-hidden="true" /> Viloyatlar
        </button>
      )}
      <label className="hd-qidiruv">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={qidiruv}
          onChange={(e) => setQidiruv(e.target.value)}
          placeholder={vil ? 'Tuman yoki shahar nomi' : 'Viloyat nomi'}
          aria-label="Qidirish"
        />
      </label>
      {xato && <div className="is-xato" role="alert">{xato}</div>}
      <div className="hd-royxat">
        {!vil
          ? viloyatlar.map((h) => (
            <button key={h.nom} type="button" className={'hd-qator' + (h.nom === viloyat ? ' joriy' : '')} onClick={() => { setTanlanganVil(h.nom); setQidiruv(''); }}>
              <span>{h.nom}</span>
              <small>{h.tumanlar.length} tuman{h.shaharlar.length ? `, ${h.shaharlar.length} shahar` : ''}</small>
              <ChevronRight aria-hidden="true" />
            </button>
          ))
          : joylar.map((j) => (
            <button
              key={j}
              type="button"
              className={'hd-qator' + (vil.nom === viloyat && j === tuman ? ' joriy' : '')}
              disabled={!!saqlanmoqda}
              onClick={() => tanla(j)}
            >
              <span>{j}</span>
              {saqlanmoqda === j ? <small>Saqlanmoqda…</small> : vil.nom === viloyat && j === tuman ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        {((!vil && viloyatlar.length === 0) || (vil && joylar.length === 0)) && <div className="hd-yoq">Hech narsa topilmadi</div>}
      </div>
    </PastkiOyna>
  );
}
