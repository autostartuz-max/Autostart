import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { to: '/', icon: '🏠', label: 'Bosh' },
  { to: '/mavzular', icon: '📋', label: 'Testlar' },
  { to: '/oktagon', icon: '⚔️', label: 'Oktagon' },
  { to: '/reyting', icon: '🏆', label: 'Reyting' },
  { to: '/profil', icon: '👤', label: 'Profil' },
];

export default function TabBar() {
  const loc = useLocation();
  const nav = useNavigate();
  const active = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to));
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button key={t.to} className={'tab' + (active(t.to) ? ' active' : '')} onClick={() => nav(t.to)}>
          <span className="tic">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
