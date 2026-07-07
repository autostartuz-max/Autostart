import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Sign } from '../types';

export default function Signs() {
  const nav = useNavigate();
  const [items, setItems] = useState<Sign[]>([]);

  useEffect(() => {
    api.signs().then(setItems).catch(() => {});
  }, []);

  return (
    <div>
      <button className="back" onClick={() => nav('/')}>← Bosh sahifa</button>
      <div className="h2">Yo‘l belgilari</div>
      <div className="list">
        {items.map((s) => (
          <div key={s.id} className="sign">
            <div className="sic">{s.imageUrl ? <img src={s.imageUrl} width={44} /> : '⚠️'}</div>
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
