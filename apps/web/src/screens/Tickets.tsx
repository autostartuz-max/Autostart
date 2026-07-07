import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Catalog } from '../types';

export default function Tickets() {
  const nav = useNavigate();
  const [items, setItems] = useState<Catalog[]>([]);

  useEffect(() => {
    api.tickets().then(setItems).catch(() => {});
  }, []);

  return (
    <div>
      <button className="back" onClick={() => nav('/')}>← Bosh sahifa</button>
      <div className="h2">Biletlar</div>
      <div className="list">
        {items.map((t, i) => (
          <div key={t.id} className="li" onClick={() => nav(`/test?mode=ticket&ticketId=${t.id}`)}>
            <div className="lname">
              <div className="num">{i + 1}</div>
              {t.name}
            </div>
            <div className="cnt">{t.count} savol ›</div>
          </div>
        ))}
        {!items.length && <div className="empty">Biletlar topilmadi</div>}
      </div>
    </div>
  );
}
