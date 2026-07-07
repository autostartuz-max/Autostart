import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Me } from '../types';

export default function Profile() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const update = async (data: any) => {
    const r = await api.updateMe(data);
    setMe((m) => (m ? { ...m, user: { ...m.user, ...r.user } } : m));
  };

  const s = me?.stats;

  return (
    <div>
      <button className="back" onClick={() => nav('/')}>← Bosh sahifa</button>
      <div className="pcard">
        <div className="prow">
          <div className="avatar">{(me?.user.firstName || 'F')[0].toUpperCase()}</div>
          <div>
            <div className="pname">{me?.user.firstName || 'Foydalanuvchi'}</div>
            <div className="pstatus">👤 YO‘LOVCHI</div>
          </div>
        </div>
        <div className="pmeta" style={{ marginTop: 14 }}>
          <span>Yechilgan: <b style={{ fontSize: 15 }}>{s?.solvedQuestions ?? 0}</b></span>
          <span>To‘g‘ri: <b style={{ fontSize: 15, color: 'var(--green)' }}>{s?.correct ?? 0}</b></span>
          <span>Aniqlik: <b style={{ fontSize: 15 }}>{s?.accuracy ?? 0}%</b></span>
        </div>
      </div>

      <div className="h2">Sozlamalar</div>

      <div className="setrow">
        <div>Alifbo</div>
        <div className="seg">
          <button className={me?.user.alphabet === 'lat' ? 'act' : ''} onClick={() => update({ alphabet: 'lat' })}>
            Lotin
          </button>
          <button className={me?.user.alphabet === 'cyr' ? 'act' : ''} onClick={() => update({ alphabet: 'cyr' })}>
            Кирилл
          </button>
        </div>
      </div>

      <div className="setrow">
        <div>Toifa</div>
        <div className="seg">
          {['B', 'C', 'D'].map((c) => (
            <button key={c} className={me?.user.category === c ? 'act' : ''} onClick={() => update({ category: c })}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="setrow">
        <div>Saqlangan savollar</div>
        <div className="cnt" style={{ color: 'var(--muted)' }}>{s?.bookmarks ?? 0} ta</div>
      </div>

      <div className="setrow" onClick={() => nav('/belgilar')}>
        <div>Yo‘l belgilari</div>
        <div style={{ color: 'var(--muted)' }}>›</div>
      </div>
    </div>
  );
}
