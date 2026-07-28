import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ShieldCheck, ChevronLeft } from 'lucide-react';
import { api } from '../api';
import AppSidebar from '../components/AppSidebar';
import type { Catalog } from '../types';
import '../dashboard.css';

export default function Topics() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Catalog[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [name, setName] = useState('Foydalanuvchi');

  useEffect(() => {
    api.topics().then(setItems).catch(() => {});
    api.me().then((m: any) => setName(m?.user?.firstName || 'Foydalanuvchi')).catch(() => {});
  }, []);

  const openTopic = (id: number) =>
    nav(`/test?mode=topic&topicId=${id}&shuffle=${shuffle ? 1 : 0}`);

  return (
    <div className="db">
      <AppSidebar active="/mavzular" open={open} onClose={() => setOpen(false)} />

      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search"><Search size={17} /><input placeholder="Qidirish…" /></div>
          <div className="db-top-right">
            <div className="db-chip">UZ</div>
            <div className="db-chip"><Bell size={17} /><span className="nb">3</span></div>
            <div className="db-userchip">
              <span className="db-uava"><ShieldCheck size={18} /></span>
              <span className="db-uname"><b>{name}</b><span>Pro</span></span>
            </div>
          </div>
        </header>

        <div className="db-content">
          <div className="mv-head">
            <button className="mv-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Orqaga</button>
            <h1 className="mv-title">Mavzu bo‘yicha mashqni boshlash</h1>
            <label className="mv-shuffle" onClick={() => setShuffle((s) => !s)}>
              <span className={'mv-tog' + (shuffle ? ' on' : '')} />
              <span>Aralash yechish</span>
            </label>
          </div>

          <div className="mv-grid">
            {items.map((t, i) => (
              <button className="mv-card" key={t.id} onClick={() => openTopic(t.id)}>
                <span className="mv-num">{i + 1}</span>
                <span className="mv-name">{t.name}</span>
              </button>
            ))}
            {!items.length && <div className="empty" style={{ gridColumn: '1 / -1' }}>Mavzular topilmadi</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
