import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, Play, HeartCrack, Check, X, Info } from 'lucide-react';
import { api } from '../api';
import AppSidebar from '../components/AppSidebar';
import type { Question } from '../types';
import '../dashboard.css';

// Xato javob berilgan savol — API `myChosen` ni ham qo'shib qaytaradi
type XatoSavol = Question & { myChosen?: number[]; shablon?: number | null; order?: number | null };

export default function Mistakes() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<XatoSavol[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ochiq, setOchiq] = useState<Set<number>>(new Set()); // izohi ochilgan savollar

  useEffect(() => {
    api
      .mistakes()
      .then((r: XatoSavol[]) => setList(Array.isArray(r) ? r : []))
      .catch((e: any) => setErr(e?.message || 'Xatolarni yuklab bo‘lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const izohToggle = (id: number) =>
    setOchiq((s) => {
      const x = new Set(s);
      x.has(id) ? x.delete(id) : x.add(id);
      return x;
    });

  return (
    <div className="db">
      <AppSidebar active="/xatolarim" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Bosh sahifa</button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          <div className="adm-head">
            <div className="adm-head-l">
              <span className="xt-ic"><HeartCrack size={20} /></span>
              <h1 className="adm-title">Xato qilgan savollarim ({list.length})</h1>
            </div>
            {list.length > 0 && (
              <div className="adm-head-btns">
                <button className="adm-btn primary" onClick={() => nav('/test?mode=mistakes')}>
                  <Play size={17} /> Xatolar ustida ishlash
                </button>
              </div>
            )}
          </div>

          <p className="xt-lead">
            Bu yerda siz <b>noto‘g‘ri javob bergan</b> savollar to‘planadi. Savolni qayta yechib
            to‘g‘ri javob bersangiz — ro‘yxatdan o‘zi chiqib ketadi.
          </p>

          {loading && <div className="adm-empty">Yuklanmoqda…</div>}

          {!loading && !err && list.length === 0 && (
            <div className="xt-bosh">
              <Check size={34} />
              <b>Xato yo‘q — barakalla!</b>
              <span>Test yechganingizda xato qilgan savollaringiz shu yerda to‘planadi.</span>
              <button className="adm-btn primary" onClick={() => nav('/shablon')}>
                <Play size={17} /> Test yechishni boshlash
              </button>
            </div>
          )}

          <div className="xt-list">
            {list.map((q, i) => {
              const mine = q.myChosen || [];
              const izoh = (q.explanation || '').trim();
              return (
                <div className="xt-card" key={q.id}>
                  <div className="xt-head">
                    <span className="xt-num">{i + 1}</span>
                    <div className="xt-q">{q.textLat}</div>
                  </div>

                  {q.shablon ? <div className="xt-meta">{q.shablon}-shablon{q.order ? `, ${q.order}-savol` : ''}</div> : null}

                  {q.imageUrl && <img className="xt-rasm" src={q.imageUrl} alt="" loading="lazy" />}

                  <div className="xt-opts">
                    {q.options.map((o) => {
                      const tanlagan = mine.includes(o.id);
                      const cls = o.isCorrect ? 'xt-o ok' : tanlagan ? 'xt-o no' : 'xt-o';
                      return (
                        <div className={cls} key={o.id}>
                          <span className="xt-o-ic">
                            {o.isCorrect ? <Check size={15} /> : tanlagan ? <X size={15} /> : null}
                          </span>
                          <span className="xt-o-t">{o.textLat}</span>
                          {tanlagan && !o.isCorrect && <span className="xt-tag no">Siz tanlagansiz</span>}
                          {o.isCorrect && <span className="xt-tag ok">To‘g‘ri javob</span>}
                        </div>
                      );
                    })}
                  </div>

                  {izoh && (
                    <>
                      <button className="xt-izoh-btn" onClick={() => izohToggle(q.id)}>
                        <Info size={15} /> {ochiq.has(q.id) ? 'Izohni yopish' : 'Nega bunday? Izohni ko‘rish'}
                      </button>
                      {ochiq.has(q.id) && <div className="xt-izoh">{izoh}</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
