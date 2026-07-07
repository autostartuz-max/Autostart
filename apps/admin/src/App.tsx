import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { hasToken, logout } from './api';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Questions from './screens/Questions';
import QuestionForm from './screens/QuestionForm';
import Import from './screens/Import';
import Complaints from './screens/Complaints';

export default function App() {
  const [authed, setAuthed] = useState(hasToken());

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="layout">
      <aside className="side">
        <div className="logo">
          YHQ <span>Admin</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Boshqaruv</NavLink>
          <NavLink to="/questions">Savollar</NavLink>
          <NavLink to="/import">Excel import</NavLink>
          <NavLink to="/complaints">Shikoyatlar</NavLink>
        </nav>
        <button
          className="lo"
          onClick={() => {
            logout();
            setAuthed(false);
          }}
        >
          Chiqish
        </button>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/questions/new" element={<QuestionForm />} />
          <Route path="/questions/:id" element={<QuestionForm />} />
          <Route path="/import" element={<Import />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
