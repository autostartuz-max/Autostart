import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, TrendingUp, Pencil, Check } from 'lucide-react';
import {
  adminApi, hasAdmin, canManageQuestions, clearAdmin, type MistakeStatRow,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

// "Kamida shuncha talaba javob bergan" filtri — bitta odam xato qilgan savol
// tahlil uchun ma'lumot bermaydi, shuning uchun bo'sini kesib tashlash mumkin.
const MIN_FILTR: [number, string][] = [[1, 'Hammasi'], [3, '3+ talaba'], [5, '5+ talaba'], [10, '10+ talaba']];

// Xato foiziga qarab rang: qizil (og'ir) → sariq → yashil
const daraja = (r: number) => (r >= 60 ? 'yuqori' : r >= 30 ? 'orta' : 'past');

export default function AdminAnalytics() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [list, setList] = useState<MistakeStatRow[]>([]);
  const [jamiSavol, setJamiSavol] = useState(0);
  const [min, setMin] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    setErr('');
    adminApi
      .mistakeAnalytics({ min, limit: 100 })
      .then((r) => { setList(r.list || []); setJamiSavol(r.jamiSavol || 0); })
      .catch((e: any) => {
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
        else setErr(e?.message || 'Tahlilni yuklab bo‘lmadi');
      })
      .finally(() => setLoading(false));
  }, [authed, min]);

  return (
    <div className="db">
      <AppSidebar active="/tahlil" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Bosh sahifa</button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <span className="th-ic"><TrendingUp size={20} /></span>
                  <h1 className="adm-title">Eng ko‘p xato qilinadigan savollar ({list.length})</h1>
                </div>
                <div className="ud-seg">
                  {MIN_FILTR.map(([v, t]) => (
                    <button key={v} type="button"
                      className={'ud-seg-b' + (min === v ? ' on' : '')}
                      onClick={() => setMin(v)}>{t}</button>
                  ))}
                </div>
              </div>

              <p className="xt-lead">
                Barcha talabalar bo‘yicha umumiy tahlil. Har talabaning savolga bergan{' '}
                <b>oxirgi</b> javobi hisoblanadi — qayta yechib to‘g‘irlagan bo‘lsa, u xato
                hisoblanmaydi. Ro‘yxat xato qilganlar soni bo‘yicha saralangan.
                {jamiSavol > 0 && <> Jami <b>{jamiSavol}</b> ta savolga javob berilgan.</>}
              </p>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && !err && list.length === 0 && (
                <div className="xt-bosh">
                  <Check size={34} />
                  <b>Xato topilmadi</b>
                  <span>Tanlangan shart bo‘yicha xato qilingan savol yo‘q.</span>
                </div>
              )}

              <div className="xt-list">
                {list.map((q, i) => (
                  <div className="xt-card th-card" key={q.id}>
                    <div className="th-head">
                      <span className={'th-rate ' + daraja(q.rate)}>{q.rate}%</span>
                      <div className="th-q">
                        <div className="xt-q">{i + 1}. {q.textLat}</div>
                        <div className="xt-meta">
                          {q.shablon ? <>{q.shablon}-shablon{q.order ? `, ${q.order}-savol` : ''} · </> : null}
                          {q.topic ? <>{q.topic} · </> : null}
                          <b>{q.wrong}</b> talaba xato qilgan / {q.total} javob bergan
                        </div>
                      </div>
                      <button className="adm-mini" onClick={() => nav('/savollar/' + q.id)}>
                        <Pencil size={14} /> Savol
                      </button>
                    </div>

                    <div className="th-bar"><i className={daraja(q.rate)} style={{ width: q.rate + '%' }} /></div>

                    {q.correctText && (
                      <div className="th-togri"><Check size={14} /> To‘g‘ri javob: {q.correctText}</div>
                    )}
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
