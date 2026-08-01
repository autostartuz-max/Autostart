import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Menu, Upload, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { adminApi, hasAdmin, ensureAdminAuto } from '../api';
import { latToCyr } from '../translit';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

interface Opt { textLat: string; isCorrect: boolean }
interface Draft {
  key: number;
  textLat: string;
  options: Opt[];
  shablon: string;
  order: string;
  topicId: string;
  izoh: string;
  err?: string;
}

export default function AdminImport() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const defShab = sp.get('shablon') || '';
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(hasAdmin());
  const [topics, setTopics] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [reading, setReading] = useState({ done: 0, total: 0 });
  const [saving, setSaving] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!authed) ensureAdminAuto().then((ok) => ok && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (authed) adminApi.topics().then(setTopics).catch(() => {});
  }, [authed]);

  const onFiles = async (files: FileList | null) => {
    const arr = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    setReading({ done: 0, total: arr.length });
    for (let i = 0; i < arr.length; i++) {
      let d: Draft;
      try {
        const r = await adminApi.extractQuestion(arr[i]);
        const opts: Opt[] = (r.options || []).map((t: string, idx: number) => ({
          textLat: t, isCorrect: r.correctIndex != null && idx === r.correctIndex,
        }));
        d = {
          key: Date.now() + i,
          textLat: r.textLat || '',
          options: opts.length ? opts : [{ textLat: '', isCorrect: true }, { textLat: '', isCorrect: false }],
          shablon: r.shablon != null ? String(r.shablon) : defShab,
          order: r.tartib != null ? String(r.tartib) : '',
          topicId: r.topicId != null ? String(r.topicId) : '',
          izoh: r.izoh || '',
        };
      } catch (e: any) {
        d = { key: Date.now() + i, textLat: '', options: [], shablon: defShab, order: '', topicId: '', izoh: '', err: 'O‘qib bo‘lmadi: ' + (e?.message || '') };
      }
      setDrafts((cur) => [...cur, d]);
      setReading((s) => ({ ...s, done: i + 1 }));
    }
    setReading({ done: 0, total: 0 });
  };

  const upd = (key: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const updOpt = (key: number, oi: number, patch: Partial<Opt>) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, options: x.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : x)));
  const setCorrect = (key: number, oi: number) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, options: x.options.map((o, j) => ({ ...o, isCorrect: j === oi })) } : x)));
  const addOpt = (key: number) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, options: [...x.options, { textLat: '', isCorrect: false }] } : x)));
  const rmOpt = (key: number, oi: number) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, options: x.options.filter((_, j) => j !== oi) } : x)));
  const remove = (key: number) => setDrafts((d) => d.filter((x) => x.key !== key));

  const isValid = (d: Draft) =>
    !!d.textLat.trim() && d.options.length >= 2 && d.options.every((o) => o.textLat.trim()) && d.options.some((o) => o.isCorrect) && !!d.shablon && !!d.topicId;
  const validCount = drafts.filter(isValid).length;

  const saveAll = async () => {
    const valid = drafts.filter(isValid);
    if (!valid.length) return;
    setSaving({ done: 0, total: valid.length });
    const savedKeys: number[] = [];
    for (let i = 0; i < valid.length; i++) {
      const d = valid[i];
      try {
        let rus = '';
        try { const rr = await adminApi.translate(d.textLat.trim()); rus = rr?.text || ''; } catch { /* ignore */ }
        const options = await Promise.all(d.options.map(async (o) => {
          let orus = '';
          try { const rr = await adminApi.translate(o.textLat.trim()); orus = rr?.text || ''; } catch { /* ignore */ }
          return { textLat: o.textLat.trim(), textRus: orus, isCorrect: o.isCorrect };
        }));
        await adminApi.createQuestion({
          textLat: d.textLat.trim(),
          textCyr: latToCyr(d.textLat.trim()),
          textRus: rus,
          shablon: Number(d.shablon),
          order: d.order ? Number(d.order) : 0,
          explanation: d.izoh.trim(),
          topicId: Number(d.topicId),
          options,
        });
        savedKeys.push(d.key);
      } catch { /* bittasi xato bo'lsa qolganini davom ettiramiz */ }
      setSaving((s) => ({ ...s, done: i + 1 }));
    }
    setSaving({ done: 0, total: 0 });
    setDrafts((cur) => cur.filter((x) => !savedKeys.includes(x.key)));
    if (savedKeys.length) nav('/savollar' + (defShab ? '?shablon=' + defShab : ''));
  };

  return (
    <div className="db">
      <AppSidebar active="/savollar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top qf-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/savollar' + (defShab ? '?shablon=' + defShab : ''))}><ChevronLeft size={18} /> Savollar</button>
          <div className="qf-htitle">
            <b>Ommaviy import</b>
            <span>Bir nechta skrinshotdan savollarni birdan qo‘shing</span>
          </div>
          {authed && (
            <div className="qf-top-actions">
              <button className="adm-btn primary" onClick={saveAll} disabled={!validCount || saving.total > 0}>
                {saving.total > 0 ? `Saqlanmoqda… ${saving.done}/${saving.total}` : `Barchasini saqlash (${validCount})`}
              </button>
            </div>
          )}
        </header>

        <div className="db-content">
          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <label className="qf-ocrbar" style={{ cursor: 'pointer' }}>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={reading.total > 0}
                  onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }} />
                <span className="qf-ocrbar-ic"><Upload size={20} /></span>
                <div className="qf-ocrbar-txt">
                  <b>Skrinshotlarni tanlang (bir nechta)</b>
                  <span>{reading.total > 0 ? `🤖 AI o‘qiyapti… ${reading.done}/${reading.total}` : 'Bir yo‘la ko‘p skrinshot tanlang — AI har birini o‘qib, quyida chiqaradi'}</span>
                </div>
              </label>

              {drafts.length === 0 && reading.total === 0 && (
                <div className="adm-empty">Hali skrinshot tanlanmadi. Yuqoridan bir nechta savol skrinshotini tanlang.</div>
              )}

              <div className="imp-list">
                {drafts.map((d, di) => (
                  <div className={'imp-card' + (d.err ? ' err' : isValid(d) ? '' : ' warn')} key={d.key}>
                    <div className="imp-card-head">
                      <span className="imp-num">{di + 1}</span>
                      {d.err ? (
                        <span className="imp-badge err"><AlertTriangle size={13} /> {d.err}</span>
                      ) : !isValid(d) ? (
                        <span className="imp-badge warn"><AlertTriangle size={13} /> To‘ldirilmagan — saqlanmaydi</span>
                      ) : (
                        <span className="imp-badge ok">Tayyor</span>
                      )}
                      <button className="adm-mini danger" onClick={() => remove(d.key)}><Trash2 size={15} /></button>
                    </div>

                    <textarea className="adm-ta" placeholder="Savol matni (lotin)" value={d.textLat} onChange={(e) => upd(d.key, { textLat: e.target.value })} />

                    <div className="imp-opts">
                      {d.options.map((o, oi) => (
                        <div className="imp-opt" key={oi}>
                          <button className={'imp-radio' + (o.isCorrect ? ' on' : '')} title="To‘g‘ri javob" onClick={() => setCorrect(d.key, oi)}>{o.isCorrect ? '◉' : '○'}</button>
                          <input className="adm-inp" placeholder={`Variant ${oi + 1}`} value={o.textLat} onChange={(e) => updOpt(d.key, oi, { textLat: e.target.value })} />
                          <button className="adm-mini danger" onClick={() => rmOpt(d.key, oi)}><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <button className="adm-btn sec imp-addopt" onClick={() => addOpt(d.key)}><Plus size={14} /> Variant</button>
                    </div>

                    <div className="imp-meta">
                      <label>Shablon<input className="adm-inp" type="number" value={d.shablon} onChange={(e) => upd(d.key, { shablon: e.target.value })} /></label>
                      <label>Tartib<input className="adm-inp" type="number" value={d.order} onChange={(e) => upd(d.key, { order: e.target.value })} /></label>
                      <label className="imp-mavzu">Mavzu
                        <select className="adm-inp" value={d.topicId} onChange={(e) => upd(d.key, { topicId: e.target.value })}>
                          <option value="">— tanlanmagan —</option>
                          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <input className="adm-inp imp-izoh" placeholder="Izoh / qoida matni (ixtiyoriy)" value={d.izoh} onChange={(e) => upd(d.key, { izoh: e.target.value })} />
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
