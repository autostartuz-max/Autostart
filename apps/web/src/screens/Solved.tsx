import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, FileText, Check, X, Info } from 'lucide-react';
import { api } from '../api';
import AppSidebar from '../components/AppSidebar';
import type { Question } from '../types';
import '../dashboard.css';

type Yechilgan = Question & {
  myChosen?: number[];
  myCorrect?: boolean;
  answeredAt?: string;
  shablon?: number | null;
  order?: number | null;
};

type Filtr = 'hammasi' | 'togri' | 'xato';

const sana = (s?: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return ''; }
};

export default function Solved() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Yechilgan[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filtr, setFiltr] = useState<Filtr>('hammasi');
  const [ochiq, setOchiq] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .solved()
      .then((r: Yechilgan[]) => setList(Array.isArray(r) ? r : []))
      .catch((e: any) => setErr(e?.message || 'Yuklab bo‘lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const togri = useMemo(() => list.filter((q) => q.myCorrect).length, [list]);
  const korinadi = useMemo(
    () => list.filter((q) => (filtr === 'togri' ? q.myCorrect : filtr === 'xato' ? !q.myCorrect : true)),
    [list, filtr]
  );

  const izohToggle = (id: number) =>
    setOchiq((s) => {
      const x = new Set(s);
      x.has(id) ? x.delete(id) : x.add(id);
      return x;
    });

  return (
    <div className="db">
      <AppSidebar active="/yechilgan" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Bosh sahifa</button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          <div className="adm-head">
            <div className="adm-head-l">
              <span className="sv-ic"><FileText size={20} /></span>
              <h1 className="adm-title">Yechilgan testlar ({list.length})</h1>
            </div>
            <div className="ud-seg">
              {([['hammasi', 'Hammasi'], ['togri', `To‘g‘ri (${togri})`], ['xato', `Xato (${list.length - togri})`]] as [Filtr, string][])
                .map(([v, t]) => (
                  <button key={v} type="button" className={'ud-seg-b' + (filtr === v ? ' on' : '')} onClick={() => setFiltr(v)}>
                    {t}
                  </button>
                ))}
            </div>
          </div>

          <p className="xt-lead">
            Siz javob bergan savollar. Har savolda <b>oxirgi javobingiz</b> hisoblanadi —
            qayta yechib to‘g‘ri javob bersangiz, holati o‘zgaradi.
          </p>

          {loading && <div className="adm-empty">Yuklanmoqda…</div>}
          {!loading && !err && list.length === 0 && (
            <div className="xt-bosh">
              <FileText size={34} />
              <b>Hali test yechilmagan</b>
              <span>Test yechganingizda savollar shu yerda to‘planadi.</span>
              <button className="adm-btn primary" onClick={() => nav('/shablon')}>Test yechishni boshlash</button>
            </div>
          )}
          {!loading && list.length > 0 && korinadi.length === 0 && (
            <div className="adm-empty">Bu bo‘limda savol yo‘q.</div>
          )}

          <div className="xt-list">
            {korinadi.map((q, i) => {
              const mine = q.myChosen || [];
              const izoh = (q.explanation || '').trim();
              return (
                <div className={'xt-card' + (q.myCorrect ? ' sv-ok' : ' sv-no')} key={q.id}>
                  <div className="xt-head">
                    <span className={'xt-num' + (q.myCorrect ? ' ok' : ' no')}>{i + 1}</span>
                    <div className="xt-q">{q.textLat}</div>
                    <span className={'xt-tag ' + (q.myCorrect ? 'ok' : 'no')}>
                      {q.myCorrect ? 'To‘g‘ri' : 'Xato'}
                    </span>
                  </div>

                  <div className="xt-meta">
                    {q.shablon ? `${q.shablon}-shablon${q.order ? `, ${q.order}-savol` : ''} · ` : ''}
                    {sana(q.answeredAt)}
                  </div>

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
                          {tanlagan && <span className={'xt-tag ' + (o.isCorrect ? 'ok' : 'no')}>Siz tanlagansiz</span>}
                        </div>
                      );
                    })}
                  </div>

                  {izoh && (
                    <>
                      <button className="xt-izoh-btn" onClick={() => izohToggle(q.id)}>
                        <Info size={15} /> {ochiq.has(q.id) ? 'Izohni yopish' : 'Izohni ko‘rish'}
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
