import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { api, setToken } from './api';
import { initTelegram, getInitData, getGuestId, isTelegram } from './telegram';
import Landing from './screens/Landing';
import Home from './screens/Home';
import Shablon from './screens/Shablon';
import Topics from './screens/Topics';
import Tickets from './screens/Tickets';
import TestPlayer from './screens/TestPlayer';
import Signs from './screens/Signs';
import Profile from './screens/Profile';
import Placeholder from './screens/Placeholder';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [entered, setEntered] = useState(
    () => isTelegram() || localStorage.getItem('yhq_entered') === '1'
  );
  const navigate = useNavigate();

  useEffect(() => {
    initTelegram();
    (async () => {
      try {
        const r = await api.authTelegram(getInitData(), getGuestId());
        setToken(r.token);
        setReady(true);
      } catch (e: any) {
        setError(e.message || 'Ulanib bo‘lmadi');
      }
    })();
  }, []);

  // Davom ettirish — yarim qolgan test bo'lsa, ochilishda o'sha testga qaytaramiz
  useEffect(() => {
    if (!ready) return;
    try {
      const s = JSON.parse(localStorage.getItem('yhq_test_session') || 'null');
      if (s && s.mode && window.location.pathname === '/') {
        const p = new URLSearchParams({ mode: s.mode });
        if (s.topicId) p.set('topicId', String(s.topicId));
        if (s.ticketId) p.set('ticketId', String(s.ticketId));
        navigate('/test?' + p.toString(), { replace: true });
      }
    } catch {
      /* ignore */
    }
  }, [ready, navigate]);

  if (error)
    return (
      <div className="splash">
        <div className="em" style={{ fontSize: 40 }}>⚠️</div>
        <div>Serverga ulanib bo‘lmadi</div>
        <div style={{ fontSize: 12 }}>{error}</div>
      </div>
    );
  if (!ready)
    return (
      <div className="splash">
        <div className="spinner" />
        <div>Yuklanmoqda…</div>
      </div>
    );

  if (!entered)
    return (
      <Landing
        onStart={() => {
          try {
            localStorage.setItem('yhq_entered', '1');
          } catch {
            /* ignore */
          }
          setEntered(true);
        }}
      />
    );

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shablon" element={<Shablon />} />
        <Route path="/mavzular" element={<Topics />} />
        <Route path="/biletlar" element={<Tickets />} />
        <Route path="/test" element={<TestPlayer />} />
        <Route path="/belgilar" element={<Signs />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/oktagon" element={<Placeholder title="Oktagon" emoji="⚔️" text="Bellashuv rejimi tez orada qo‘shiladi." />} />
        <Route path="/reyting" element={<Placeholder title="Reyting" emoji="🏆" text="Reyting va liga tizimi tez orada qo‘shiladi." />} />
      </Routes>
    </div>
  );
}
