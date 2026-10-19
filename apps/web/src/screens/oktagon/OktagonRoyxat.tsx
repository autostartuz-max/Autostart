import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { oktagon } from '../../api';
import { MEDAL, NATIJA_MATN, ballMatn } from './umumiy';
import '../../ilova-ekran.css';
import '../../oktagon.css';

type Reyting = Awaited<ReturnType<typeof oktagon.reyting>>;
type Janglar = Awaited<ReturnType<typeof oktagon.janglarim>>;

const sana = (s: string) => {
  const d = new Date(s);
  const ikki = (x: number) => String(x).padStart(2, '0');
  return `${ikki(d.getDate())}.${ikki(d.getMonth() + 1)} ${ikki(d.getHours())}:${ikki(d.getMinutes())}`;
};

/** Oktagon: "Eng zo'rlari" (reyting) yoki "Mening janglarim" */
export default function OktagonRoyxat({ tur }: { tur: 'reyting' | 'janglarim' }) {
  const nav = useNavigate();
  const [reyting, setReyting] = useState<Reyting | null>(null);
  const [janglar, setJanglar] = useState<Janglar | null>(null);
  const [xato, setXato] = useState('');

  useEffect(() => {
    const x = (e: any) => setXato(e?.message || 'Aloqa yo‘q');
    if (tur === 'reyting') oktagon.reyting().then(setReyting).catch(x);
    else oktagon.janglarim().then(setJanglar).catch(x);
  }, [tur]);

  const yuklanmoqda = tur === 'reyting' ? !reyting : !janglar;
  const bosh = tur === 'reyting' ? !reyting?.list.length : !janglar?.list.length;

  return (
    <div className="ie ok-ekran">
      <div className="ie-head">
        <div className="ie-top">
          <button className="ie-back" onClick={() => nav('/oktagon')} aria-label="Orqaga"><ChevronLeft size={22} /></button>
          <div className="ie-title">{tur === 'reyting' ? 'Eng zo‘rlari' : 'Mening janglarim'}</div>
        </div>
      </div>

      {xato || yuklanmoqda || bosh ? (
        <div className="ie-empty">
          {xato || (yuklanmoqda ? 'Yuklanmoqda…' : tur === 'reyting' ? 'Hali hech kim jang qilmagan' : 'Hali jang qilmagansiz')}
        </div>
      ) : tur === 'reyting' ? (
        <div className="ok-list">
          {reyting!.orin && reyting!.orin > 50 && (
            <div className="ie-empty" style={{ padding: '4px 0 12px', fontSize: 14 }}>Sizning o‘rningiz: {reyting!.orin}</div>
          )}
          {reyting!.list.map((u) => (
            <div key={u.orin} className={'ok-row' + (u.men ? ' men' : '')}>
              <span className="ok-row-n">{u.orin}</span>
              <span className="ok-medal">{MEDAL[u.daraja]}</span>
              <span className="ok-row-m">
                <b>{u.ism}{u.men ? ' (siz)' : ''}</b>
                <small>{u.daraja} · {u.janglar} ta jang</small>
              </span>
              <span className={'ok-row-o ' + (u.ball < 0 ? 'ok-qizil' : 'ok-yashil')}>{u.ball}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="ok-list">
          {janglar!.list.map((j) => {
            const rang = j.natija === 'galaba' ? 'ok-yashil' : j.natija === 'durang' ? 'ok-kulrang' : 'ok-qizil';
            return (
              <button key={j.id} className="ok-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/oktagon/jang/${j.id}`)}>
                <span className="ok-row-m">
                  <b>{j.raqib}{j.bot ? ' (bot)' : ''}</b>
                  <small>{sana(j.sana)}</small>
                </span>
                <span className={'ok-row-o ' + rang}>
                  {j.menT}:{j.raqibT}
                  <small>{NATIJA_MATN[j.natija]} · {ballMatn(j.ozgarish)}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
