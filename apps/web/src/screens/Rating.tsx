import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu, Trophy, ChevronRight } from 'lucide-react';
import { api, canManageQuestions, hasAdmin, type RatingRow } from '../api';
import AppSidebar from '../components/AppSidebar';
import '../dashboard.css';

export default function Rating() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<RatingRow[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  // Talaba sahifasiga faqat Owner va Admin kira oladi
  const huquqli = canManageQuestions() || hasAdmin();

  useEffect(() => {
    api
      .rating(200)
      .then((r) => { setList(r.list || []); setMeId(r.meId ?? null); })
      .catch((e: any) => setErr(e?.message || 'Reytingni yuklab bo‘lmadi'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="db">
      <AppSidebar active="/reyting" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Bosh sahifa</button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          <div className="adm-head">
            <div className="adm-head-l">
              <span className="rt-ic"><Trophy size={20} /></span>
              <h1 className="adm-title">To‘liq reyting ({list.length})</h1>
            </div>
          </div>

          <p className="xt-lead">
            Tartib <b>aniqlik (foiz)</b> bo‘yicha, teng foizda ko‘proq savol yechgani yuqori turadi.
            Har savolning oxirgi javobi hisoblanadi. Mehmon hisoblari reytingga kirmaydi.
          </p>

          {loading && <div className="adm-empty">Yuklanmoqda…</div>}
          {!loading && !err && list.length === 0 && (
            <div className="adm-empty">Hali hech kim test yechmagan.</div>
          )}

          <div className="adm-list">
            {list.map((x) => (
              <div
                className={'adm-row rt-row' + (meId === x.userId ? ' me' : '') + (huquqli ? ' rt-ochiladi' : '')}
                key={x.userId}
                title={huquqli ? 'Batafsil' : ''}
                onClick={huquqli ? () => nav('/foydalanuvchilar/' + x.userId) : undefined}
              >
                <span className={'rt-rank' + (x.rank <= 3 ? ' top' : '')}>{x.rank}</span>
                <span className="rt-av">{(x.firstName || '?')[0].toUpperCase()}</span>
                <div className="adm-u-main">
                  <b>{x.firstName}{meId === x.userId ? ' (siz)' : ''}</b>
                  <span>{x.correct} ta to‘g‘ri · {x.solved} ta savol</span>
                </div>
                <span className="rt-pct">{x.accuracy}%</span>
                {huquqli && <ChevronRight size={17} className="rt-arrow" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
