import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Me } from '../types';

const TILES = [
  { to: '/mavzular', icon: '📖', cls: 'purple', title: 'Mavzular' },
  { to: '/biletlar', icon: '🎫', cls: 'amber', title: 'Biletlar' },
  { to: '/test?mode=50&exam=1', icon: '📝', cls: 'green', title: '50/100 talik' },
  { to: '/test?mode=exam&exam=1', icon: '✅', cls: 'green', title: 'Real imtihon' },
  { to: '/test?mode=tricky', icon: '❗', cls: 'red', title: "Chalg'ituvchi" },
  { to: '/test?mode=saved', icon: '🔖', cls: 'amber', title: 'Saqlanganlar' },
  { to: '/belgilar', icon: '⚠️', cls: 'blue', title: "Yo'l belgilari" },
  { to: '/test?mode=numeric', icon: '#️⃣', cls: 'purple', title: 'Raqamli savollar' },
];

function daysLeft(d?: string | null) {
  if (!d) return 22;
  const ms = new Date(d).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function Home() {
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const accuracy = me?.stats.accuracy ?? 0;
  const total = me?.stats.totalQuestions ?? 0;
  const streak = 0;
  const days = daysLeft(me?.user.examDate);
  const name = me?.user.firstName || 'Ismingiz';
  const initial = name[0].toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-user">
          <div className="hava">{initial}</div>
          <div>
            <div className="hname">{name}</div>
            <div className="hstatus">👤 YO‘LOVCHI ›</div>
          </div>
        </div>
        <div className="hdr-icons">
          <button title="Yutuqlar" onClick={() => nav('/reyting')}>🏆</button>
          <button title="Qidiruv" onClick={() => nav('/mavzular')}>🔍</button>
          <button title="Sozlamalar" onClick={() => nav('/profil')}>⚙️</button>
        </div>
      </div>

      {/* Progress */}
      <div className="prog">
        <div className="prog-top">
          <span className="days">{days} kun qoldi ✏️</span>
          <span className="streak">⚡ {streak} kun</span>
        </div>
        <div className="prog-mid">
          <span className="pct">{accuracy}%</span>
          <span className="ball">— {total}</span>
        </div>
        <div className="pbar">
          <span style={{ width: `${accuracy}%` }} />
        </div>
      </div>

      {/* Barcha testlar / Xatolarni tuzatish */}
      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tcard" onClick={() => nav('/test?mode=all')}>
          <div className="ci teal">📋</div>
          <div className="bt">Barcha testlar</div>
        </div>
        <div className="tcard" onClick={() => nav('/test?mode=mistakes')}>
          <div className="ci red">💔</div>
          <div className="bt">Xatolarni tuzatish</div>
        </div>
      </div>

      {/* Test yechish */}
      <div className="hero2" onClick={() => nav('/test?mode=mistakes')}>
        <div className="h2t">
          <b>Test yechish</b>
          <span>Siz xato qilgan yoki yechilmagan savollar</span>
        </div>
        <div className="play">▶</div>
      </div>

      {/* Oktagon */}
      <div className="okt" onClick={() => nav('/oktagon')}>
        <div className="h2t">
          <b>Oktagon</b>
          <span>Birga-bir jang. O‘ynab o‘rganing</span>
        </div>
        <div className="sw">⚔️</div>
      </div>

      {/* Grid */}
      <div className="tiles">
        {TILES.map((t) => (
          <div key={t.to} className="tcard" onClick={() => nav(t.to)}>
            <div className={'ci ' + t.cls}>{t.icon}</div>
            <div className="bt">{t.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
