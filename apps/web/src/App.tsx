import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api, setToken, hasToken, clearToken } from './api';
import { initTelegram, getInitData, getGuestId, isTelegram } from './telegram';
import Landing from './screens/Landing';
import Login from './screens/Login';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import Shablon from './screens/Shablon';
import RandomTests from './screens/RandomTests';
import Topics from './screens/Topics';
import Tickets from './screens/Tickets';
import Mistakes from './screens/Mistakes';
import Rating from './screens/Rating';
import Solved from './screens/Solved';
import Legal from './screens/Legal';
import Contact from './screens/Contact';
import AdminMessages from './screens/AdminMessages';
import TestPlayer from './screens/TestPlayer';
import Signs from './screens/Signs';
import Profile from './screens/Profile';
import Placeholder from './screens/Placeholder';
import AdminQuestions from './screens/AdminQuestions';
import AdminUsers from './screens/AdminUsers';
import AdminUserDetail from './screens/AdminUserDetail';
import AdminUserForm from './screens/AdminUserForm';
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

  // Kirish/Ro'yxat sahifasidan Landing (bosh sahifa) ga qaytish
  const boshSahifa = () => {
    try { localStorage.removeItem('yhq_entered'); } catch { /* ignore */ }
    setEntered(false);
  };

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
          <Route path="/royxat" element={<Register onAuthed={() => setAuthed(true)} onHome={boshSahifa} />} />
          {/* Huquqiy hujjatlar kirmasdan ham ochilishi kerak */}
          <Route path="/hujjat/:doc" element={<Legal />} />
          <Route path="/aloqa" element={<Contact />} />
          <Route path="*" element={<Login onAuthed={() => setAuthed(true)} onHome={boshSahifa} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shablon" element={<Shablon />} />
        <Route path="/random" element={<RandomTests />} />
        <Route path="/mavzular" element={<Topics />} />
        <Route path="/xatolarim" element={<Mistakes />} />
        <Route path="/yechilgan" element={<Solved />} />
        <Route path="/hujjat/:doc" element={<Legal />} />
        <Route path="/aloqa" element={<Contact />} />
        <Route path="/xabarlar" element={<AdminMessages />} />
        <Route path="/biletlar" element={<Tickets />} />
        <Route path="/test" element={<TestPlayer />} />
        <Route path="/belgilar" element={<Signs />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/savollar" element={<AdminQuestions />} />
        <Route path="/foydalanuvchilar" element={<AdminUsers />} />
        <Route path="/foydalanuvchilar/yangi" element={<AdminUserForm />} />
        <Route path="/foydalanuvchilar/:id" element={<AdminUserDetail />} />
        <Route path="/foydalanuvchilar/:id/tahrir" element={<AdminUserForm />} />
        <Route path="/savollar/import" element={<AdminImport />} />
        <Route path="/savollar/yangi" element={<AdminQuestionForm />} />
        <Route path="/savollar/:id" element={<AdminQuestionForm />} />
        <Route path="/oktagon" element={<Placeholder title="Oktagon" emoji="⚔️" text="Bellashuv rejimi tez orada qo‘shiladi." />} />
        <Route path="/reyting" element={<Rating />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
