import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api, setToken, hasToken, clearToken } from './api';
import { initTelegram, getInitData, getGuestId, isTelegram } from './telegram';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import Shablon from './screens/Shablon';
import Topics from './screens/Topics';
import Tickets from './screens/Tickets';
import TestPlayer from './screens/TestPlayer';
import Signs from './screens/Signs';
import Profile from './screens/Profile';
import Placeholder from './screens/Placeholder';
import AdminQuestions from './screens/AdminQuestions';
import AdminQuestionForm from './screens/AdminQuestionForm';
import AdminImport from './screens/AdminImport';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [entered, setEntered] = useState(
    () =>
      isTelegram() ||
      localStorage.getItem('yhq_entered') === '1' ||
      new URLSearchParams(window.location.search).get('enter') === '1'
  );
  useEffect(() => {
    initTelegram();
    (async () => {
      // 1) Mavjud token bo'lsa — tekshiramiz
      if (hasToken()) {
        try { await api.me(); setAuthed(true); setChecking(false); return; }
        catch { clearToken(); }
      }
      // 2) Telegram WebApp ichida — avtomatik kiramiz (seamless)
      if (isTelegram()) {
        try {
          const r = await api.authTelegram(getInitData(), getGuestId());
          setToken(r.token);
          setAuthed(true);
        } catch { /* login ekrani ko'rsatiladi */ }
      }
      setChecking(false);
    })();
  }, []);

  if (checking)
    return (
      <div className="splash">
        <div className="spinner" />
        <div>Yuklanmoqda…</div>
      </div>
    );

  // Login shart — token yo'q bo'lsa: Landing → Kirish/Ro'yxat
  if (!authed) {
    if (!entered)
      return (
        <Landing
          onStart={() => {
            try { localStorage.setItem('yhq_entered', '1'); } catch { /* ignore */ }
            setEntered(true);
          }}
        />
      );
    return (
      <div className="app">
        <Routes>
          <Route path="/royxat" element={<Register onAuthed={() => setAuthed(true)} />} />
          <Route path="*" element={<Login onAuthed={() => setAuthed(true)} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shablon" element={<Shablon />} />
        <Route path="/mavzular" element={<Topics />} />
        <Route path="/biletlar" element={<Tickets />} />
        <Route path="/test" element={<TestPlayer />} />
        <Route path="/belgilar" element={<Signs />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/savollar" element={<AdminQuestions />} />
        <Route path="/savollar/import" element={<AdminImport />} />
        <Route path="/savollar/yangi" element={<AdminQuestionForm />} />
        <Route path="/savollar/:id" element={<AdminQuestionForm />} />
        <Route path="/oktagon" element={<Placeholder title="Oktagon" emoji="⚔️" text="Bellashuv rejimi tez orada qo‘shiladi." />} />
        <Route path="/reyting" element={<Placeholder title="Reyting" emoji="🏆" text="Reyting va liga tizimi tez orada qo‘shiladi." />} />
      </Routes>
    </div>
  );
}
