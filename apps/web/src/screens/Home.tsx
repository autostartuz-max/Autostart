import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListChecks, HeartCrack, BookOpen, Ticket, ListOrdered, ClipboardCheck,
  CircleAlert, Bookmark, TriangleAlert, Hash, Swords, Play, Trophy, Search,
  Settings, Check, X, Zap, Pencil, ChevronRight, User,
} from 'lucide-react';
import { api } from '../api';
import type { Me } from '../types';

const TILES = [
  { to: '/mavzular', Icon: BookOpen, cls: 'purple', title: 'Mavzular' },
  { to: '/biletlar', Icon: Ticket, cls: 'amber', title: 'Biletlar' },
  { to: '/test?mode=50&exam=1', Icon: ListOrdered, cls: 'green', title: '50/100 talik' },
  { to: '/test?mode=exam&exam=1', Icon: ClipboardCheck, cls: 'green', title: 'Real imtihon' },
  { to: '/test?mode=tricky', Icon: CircleAlert, cls: 'red', title: "Chalg'ituvchi" },
  { to: '/test?mode=saved', Icon: Bookmark, cls: 'amber', title: 'Saqlanganlar' },
  { to: '/belgilar', Icon: TriangleAlert, cls: 'blue', title: "Yo'l belgilari" },
  { to: '/test?mode=numeric', Icon: Hash, cls: 'purple', title: 'Raqamli savollar' },
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

  const total = me?.stats.totalQuestions ?? 0;
  const solved = me?.stats.solvedQuestions ?? 0;
  const correct = me?.stats.correct ?? 0;
  const wrong = me?.stats.wrong ?? 0;
  const progressPct = total ? Math.round((solved / total) * 100) : 0;
  const streak = 0;
  const days = daysLeft(me?.user.examDate);
  const name = me?.user.firstName || 'Ismingiz';
  const initial = name[0].toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-user">
          <div className="hava">
            {initial}
            <span className="hava-dot" />
          </div>
          <div>
            <div className="hname">{name}</div>
            <div className="hstatus">
              <User size={13} /> YO‘LOVCHI <ChevronRight size={13} />
            </div>
          </div>
        </div>
        <div className="hdr-icons">
          <button title="Yutuqlar" onClick={() => nav('/reyting')}><Trophy size={22} /></button>
          <button title="Qidiruv" onClick={() => nav('/mavzular')}><Search size={22} /></button>
          <button title="Sozlamalar" onClick={() => nav('/profil')}><Settings size={22} /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="prog">
        <div className="prog-top">
          <span className="days">{days} kun qoldi <Pencil size={13} /></span>
          <span className="streak"><Zap size={14} fill="currentColor" /> {streak} kun</span>
        </div>
        <div className="prog-mid">
          <span className="pct">{progressPct}%</span>
          <span className="ball">
            <b className="ok"><Check size={14} /> {correct}</b>
            <b className="no"><X size={14} /> {wrong}</b>
            <span className="tot">— {total}</span>
          </span>
        </div>
        <div className="pbar">
          <span style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Barcha testlar / Xatolarni tuzatish */}
      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tcard" onClick={() => nav('/test?mode=all')}>
          <div className="ci teal"><ListChecks size={22} /></div>
          <div className="bt">Barcha testlar</div>
        </div>
        <div className="tcard" onClick={() => nav('/test?mode=mistakes')} style={{ position: 'relative' }}>
          <div className="ci red"><HeartCrack size={22} /></div>
          <div className="bt">Xatolarni tuzatish</div>
          {wrong > 0 && <span className="mbadge">{wrong}</span>}
        </div>
      </div>

      {/* Test yechish */}
      <div className="hero2" onClick={() => nav('/test?mode=practice')}>
        <div className="h2t">
          <b>Test yechish</b>
          <span>Siz xato qilgan yoki yechilmagan savollar</span>
        </div>
        <div className="play"><Play size={24} fill="currentColor" /></div>
      </div>

      {/* Oktagon */}
      <div className="okt" onClick={() => nav('/oktagon')}>
        <div className="h2t">
          <b>Oktagon</b>
          <span>Birga-bir jang. O‘ynab o‘rganing</span>
        </div>
        <div className="sw"><Swords size={22} /></div>
      </div>

      {/* Grid */}
      <div className="tiles">
        {TILES.map((t) => (
          <div key={t.to} className="tcard" onClick={() => nav(t.to)}>
            <div className={'ci ' + t.cls}><t.Icon size={22} /></div>
            <div className="bt">{t.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
