import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { adminApi, hasAdmin, ensureAdminAuto } from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

export default function AdminQuestions() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(hasAdmin());
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

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
          ) : (
            <>
              <div className="adm-head">
                <h1 className="adm-title">Savollar ({list.length})</h1>
                <button className="adm-btn primary" onClick={() => nav('/savollar/yangi')}>
                  <Plus size={17} /> Yangi savol
                </button>
              </div>

              <div className="adm-list">
                {loading && <div className="adm-empty">Yuklanmoqda…</div>}
                {!loading && list.length === 0 && <div className="adm-empty">Savol topilmadi.</div>}
                {list.map((item) => (
                  <div className="adm-row" key={item.id} onClick={() => nav('/savollar/' + item.id)}>
                    <span className="adm-txt">
                      {item.imageUrl && <ImageIcon size={14} className="adm-imgic" />}
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
