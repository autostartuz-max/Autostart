import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const nav = useNavigate();
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    api.stats().then(setS).catch(() => {});
  }, []);

  const cards = [
    { n: s?.questions ?? '—', l: 'Savollar' },
    { n: s?.users ?? '—', l: 'Foydalanuvchilar' },
    { n: s?.topics ?? '—', l: 'Mavzular' },
    { n: s?.newComplaints ?? '—', l: 'Yangi shikoyatlar' },
  ];

  return (
    <div>
      <h1 className="title">Boshqaruv paneli</h1>
      <div className="cards">
        {cards.map((c) => (
          <div key={c.l} className="stat">
            <div className="n">{c.n}</div>
            <div className="l">{c.l}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 24 }} />
      <div className="panel">
        <div className="between">
          <b>Tezkor amallar</b>
        </div>
        <div className="row">
          <button className="btn" onClick={() => nav('/questions/new')}>+ Yangi savol</button>
          <button className="btn sec" onClick={() => nav('/import')}>Excel'dan import</button>
          <button className="btn sec" onClick={() => nav('/questions')}>Savollar ro‘yxati</button>
        </div>
      </div>
    </div>
  );
}
