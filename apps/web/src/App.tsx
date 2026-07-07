import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api, setToken } from './api';
import { initTelegram, getInitData } from './telegram';
import Home from './screens/Home';
import Topics from './screens/Topics';
import Tickets from './screens/Tickets';
import TestPlayer from './screens/TestPlayer';
import Signs from './screens/Signs';
import Profile from './screens/Profile';
import Placeholder from './screens/Placeholder';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initTelegram();
    (async () => {
      try {
        const r = await api.authTelegram(getInitData());
        setToken(r.token);
        setReady(true);
      } catch (e: any) {
        setError(e.message || 'Ulanib bo‘lmadi');
      }
    })();
  }, []);

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

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
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
