import { useEffect, useState } from 'react';
import { Menu, MessageCircle, Check, Trash2, Phone, Clock, Eye } from 'lucide-react';
import {
  adminApi, hasAdmin, canManageQuestions, clearAdmin,
  type MessageRow, type MessageStatus,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const HOLAT: Record<MessageStatus, string> = { new: 'Yangi', read: 'O‘qilgan', done: 'Javob berilgan' };
const FILTRLAR: [string, string][] = [['', 'Hammasi'], ['new', 'Yangi'], ['read', 'O‘qilgan'], ['done', 'Javob berilgan']];

const sanaVaqt = (s: string) => {
  try { return new Date(s).toLocaleString('uz-UZ'); } catch { return ''; }
};

export default function AdminMessages() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [list, setList] = useState<MessageRow[]>([]);
  const [yangi, setYangi] = useState(0);
  const [filtr, setFiltr] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi
      .messages(filtr)
      .then((r) => { setList(r.list || []); setYangi(r.yangi ?? 0); })
      .catch((e: any) => {
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
        else setErr(e?.message || 'Xabarlarni yuklab bo‘lmadi');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, filtr]);

  const holatAlmashtir = async (m: MessageRow, status: MessageStatus) => {
    setBusyId(m.id);
    setErr('');
    try {
      await adminApi.setMessageStatus(m.id, status);
      setList((l) => l.map((x) => (x.id === m.id ? { ...x, status } : x)));
      setYangi((n) => (m.status === 'new' && status !== 'new' ? Math.max(0, n - 1) : n));
    } catch (e: any) {
      setErr(e?.message || 'O‘zgartirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const ochir = async (m: MessageRow) => {
    if (!window.confirm(m.name + ' yuborgan xabar o‘chirilsinmi?')) return;
    setBusyId(m.id);
    try {
      await adminApi.deleteMessage(m.id);
      setList((l) => l.filter((x) => x.id !== m.id));
      if (m.status === 'new') setYangi((n) => Math.max(0, n - 1));
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="db">
      <AppSidebar active="/xabarlar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <span className="xb-ic"><MessageCircle size={20} /></span>
                  <h1 className="adm-title">
                    Xabarlar ({list.length}){yangi > 0 && <span className="xb-yangi">{yangi} yangi</span>}
                  </h1>
                </div>
                <div className="ud-seg">
                  {FILTRLAR.map(([v, t]) => (
                    <button key={v || 'all'} type="button"
                      className={'ud-seg-b' + (filtr === v ? ' on' : '')}
                      onClick={() => setFiltr(v)}>{t}</button>
                  ))}
                </div>
              </div>

              <p className="xt-lead">
                «Biz bilan bog‘lanish» sahifasidagi formadan kelgan xabarlar.
              </p>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && !err && list.length === 0 && (
                <div className="adm-empty">Xabar yo‘q.</div>
              )}

              <div className="xt-list">
                {list.map((m) => (
                  <div className={'xt-card xb-card ' + m.status} key={m.id}>
                    <div className="xb-head">
                      <div className="xb-kim">
                        <b>{m.name}</b>
                        <a className="xb-tel" href={'tel:' + m.phone.replace(/[^\d+]/g, '')}>
                          <Phone size={13} /> {m.phone}
                        </a>
                      </div>
                      <span className={'adm-badge xb-b-' + m.status}>{HOLAT[m.status]}</span>
                    </div>

                    <div className="xb-meta">
                      <Clock size={13} /> {sanaVaqt(m.createdAt)}
                      {m.subject && <> · <b>{m.subject}</b></>}
                      {m.userId && <> · ro‘yxatdan o‘tgan (id {m.userId})</>}
                    </div>

                    <div className="xb-matn">{m.text}</div>

                    <div className="xb-btns">
                      {m.status !== 'read' && (
                        <button className="adm-mini" disabled={busyId === m.id}
                          onClick={() => holatAlmashtir(m, 'read')}>
                          <Eye size={14} /> O‘qildi
                        </button>
                      )}
                      {m.status !== 'done' && (
                        <button className="adm-mini" disabled={busyId === m.id}
                          onClick={() => holatAlmashtir(m, 'done')}>
                          <Check size={14} /> Javob berildi
                        </button>
                      )}
                      <button className="adm-mini danger" disabled={busyId === m.id} onClick={() => ochir(m)}>
                        <Trash2 size={14} /> O‘chirish
                      </button>
                    </div>
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
