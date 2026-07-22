import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ClipboardList, Layers, BookOpen, Ticket, TriangleAlert, HeartCrack,
  Bookmark, Swords, Trophy, Car, ChevronLeft, Bell, Search, Moon, Globe, User, Menu,
} from 'lucide-react';
import { api } from '../api';
import '../shablon.css';

const NAV = [
  { Icon: Home, label: 'Bosh sahifa', to: '/' },
  { Icon: ClipboardList, label: 'Barcha testlar', to: '/test?mode=all' },
  { Icon: Layers, label: 'Shablon testlar', to: '/shablon' },
  { Icon: BookOpen, label: 'Mavzular', to: '/mavzular' },
  { Icon: Ticket, label: 'Biletlar', to: '/biletlar' },
  { Icon: TriangleAlert, label: "Yo'l belgilari", to: '/belgilar' },
  { Icon: HeartCrack, label: 'Xatolar', to: '/test?mode=mistakes' },
  { Icon: Bookmark, label: 'Saqlanganlar', to: '/test?mode=saved' },
  { Icon: Swords, label: 'Oktagon', to: '/oktagon' },
  { Icon: Trophy, label: 'Reyting', to: '/reyting' },
];

export default function WebLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Mehmon');

  useEffect(() => {
    api.me().then((m: any) => setName(m?.user?.firstName || 'Mehmon')).catch(() => {});
  }, []);

  const active = (to: string) => {
    const path = to.split('?')[0];
    if (path === '/') return loc.pathname === '/';
    return loc.pathname === path;
  };
  const go = (to: string) => { setOpen(false); nav(to); };

  return (
    <div className="wl">
      <aside className={'wl-side' + (open ? ' open' : '')}>
        <div className="wl-logo"><span className="wl-logo-ic"><Car size={20} /></span> Autostart</div>
        <nav className="wl-nav">
          {NAV.map((n) => (
            <button key={n.label} className={'wl-navi' + (active(n.to) ? ' active' : '')} onClick={() => go(n.to)}>
              <n.Icon size={19} /> <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      {open && <div className="wl-backdrop" onClick={() => setOpen(false)} />}

      <div className="wl-main">
        <header className="wl-top">
          <button className="wl-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="wl-icard" onClick={() => nav(-1 as any)}><ChevronLeft size={20} /></button>
          <div className="wl-top-right">
            <div className="wl-lang"><Globe size={16} /> O‘zbek (lotin)</div>
            <button className="wl-icard"><Search size={18} /></button>
            <button className="wl-icard"><Moon size={18} /></button>
            <button className="wl-icard"><Bell size={18} /></button>
            <div className="wl-user" onClick={() => nav('/profil')}>
              <span className="wl-uava"><User size={16} /></span> <span>{name}</span>
            </div>
          </div>
        </header>
        <div className="wl-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
