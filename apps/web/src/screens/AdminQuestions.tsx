import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Search, Plus, Pencil, Trash2, Image as ImageIcon, ChevronLeft } from 'lucide-react';
import { adminApi, hasAdmin, ensureAdminAuto } from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const SHABLON_COUNT = 63;

export default function AdminQuestions() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(hasAdmin());
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<number | null>(() => {
    const s = sp.get('shablon'); // ?shablon=N bilan kelsa — o'sha shablon ochiladi
    return s !== null && /^\d+$/.test(s) ? Number(s) : null;
  }); // ochilgan shablon (null = grid)

  const load = () => {
    setLoading(true);
    adminApi.questions(q).then(setList).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (!authed) ensureAdminAuto().then((ok) => ok && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const del = async (id: number) => {
    if (!window.confirm('Bu savol o‘chirilsinmi?')) return;
    try {
      await adminApi.deleteQuestion(id);
      setList((l) => l.filter((x) => x.id !== id));
    } catch {
      /* ignore */
    }
  };

  // Har shablondagi savollar soni (0 = shablonsiz)
  const counts = new Map<number, number>();
  for (const item of list) {
    const k = item.shablon || 0;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const noShab = counts.get(0) || 0;

  // Tanlangan shablon savollari
  const selItems = sel != null ? list.filter((x) => (x.shablon || 0) === sel) : [];
  // Yangi savol uchun keyingi tartib raqami (shu shablon ichida)
  const nextOrder = Math.max(selItems.reduce((m, x) => Math.max(m, x.order || 0), 0), selItems.length) + 1;

  return (
    <div className="db">
      <AppSidebar active="/savollar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search">
            <Search size={17} />
            <input
              placeholder="Savol qidirish…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
        </header>

        <div className="db-content">
          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : sel == null ? (
            /* ===== SHABLON KARTALARI ===== */
            <>
              <div className="adm-head">
                <h1 className="adm-title">Savollar ({list.length})</h1>
                <button className="adm-btn primary" onClick={() => nav('/savollar/yangi')}>
                  <Plus size={17} /> Yangi savol
                </button>
              </div>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              <div className="adm-shab-grid">
                {Array.from({ length: SHABLON_COUNT }, (_, i) => i + 1).map((n) => {
                  const c = counts.get(n) || 0;
                  return (
                    <div className={'adm-shab-card' + (c ? ' has' : '')} key={n} onClick={() => setSel(n)}>
                      <div className="adm-shab-num">{n}-SHABLON</div>
                      <div className="adm-shab-row">
                        <span className="adm-shab-count">{c}</span>
                        <div className="adm-shab-info">{c ? `${c} ta savol` : 'Savol yo‘q'}</div>
                      </div>
                    </div>
                  );
                })}
                {noShab > 0 && (
                  <div className="adm-shab-card has" onClick={() => setSel(0)}>
                    <div className="adm-shab-num">SHABLONSIZ</div>
                    <div className="adm-shab-row">
                      <span className="adm-shab-count">{noShab}</span>
                      <div className="adm-shab-info">{noShab} ta savol</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ===== TANLANGAN SHABLON SAVOLLARI ===== */
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <button className="adm-back" onClick={() => setSel(null)}><ChevronLeft size={18} /> Shablonlar</button>
                  <h1 className="adm-title">{sel ? `${sel}-shablon savollari` : 'Shablonsiz savollar'} ({selItems.length})</h1>
                </div>
                <button className="adm-btn primary" onClick={() => nav('/savollar/yangi' + (sel ? `?shablon=${sel}&order=${nextOrder}` : ''))}>
                  <Plus size={17} /> Yangi savol
                </button>
              </div>

              <div className="adm-list">
                {selItems.length === 0 && <div className="adm-empty">Bu shablonda savol yo‘q. “Yangi savol” bilan qo‘shing.</div>}
                {selItems.map((item, i) => (
                  <div className="adm-row" key={item.id} onClick={() => nav('/savollar/' + item.id)}>
                    <span className="adm-id">{item.order || i + 1}</span>
                    <span className="adm-txt">
                      {item.imageUrl && <ImageIcon size={12} className="adm-imgic" />}
                      {item.textLat}
                    </span>
                    <span className="adm-badge">{item.topic?.name || '—'}</span>
                    <span className="adm-badge b2">{item.options?.length || 0} variant</span>
                    <button className="adm-mini" onClick={(e) => { e.stopPropagation(); nav('/savollar/' + item.id); }}>
                      <Pencil size={15} /> Tahrir
                    </button>
                    <button className="adm-mini danger" onClick={(e) => { e.stopPropagation(); del(item.id); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
