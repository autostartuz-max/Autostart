import { useEffect, useState } from 'react';
import { useOrqaga, orqagaYozuvi } from '../orqaga';
import { api, mediaUrl } from '../api';
import type { Sign } from '../types';

export default function Signs() {
  const orqaga = useOrqaga();
  const [items, setItems] = useState<Sign[]>([]);

  useEffect(() => {
    api.signs().then(setItems).catch(() => {});
  }, []);

  return (
    <div>
      <button className="back" onClick={orqaga}>← {orqagaYozuvi()}</button>
      <div className="h2">Yo‘l belgilari</div>
      <div className="list">
        {items.map((s) => (
          <div key={s.id} className="sign">
            <div className="sic">{s.imageUrl ? <img src={mediaUrl(s.imageUrl)} width={44} /> : '⚠️'}</div>
            <div>
              <div className="scat">{s.category}</div>
              <div className="sname">{s.name}</div>
              <div className="sdesc">{s.description}</div>
            </div>
          </div>
        ))}
        {!items.length && <div className="empty">Belgilar topilmadi</div>}
      </div>
    </div>
  );
}
