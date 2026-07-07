import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

interface Opt {
  textLat: string;
  isCorrect: boolean;
  wrongReason: string;
}

export default function QuestionForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [textLat, setTextLat] = useState('');
  const [textCyr, setTextCyr] = useState('');
  const [explanation, setExplanation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [difficulty, setDifficulty] = useState('1');
  const [isTricky, setIsTricky] = useState(false);
  const [isNumeric, setIsNumeric] = useState(false);
  const [options, setOptions] = useState<Opt[]>([
    { textLat: '', isCorrect: true, wrongReason: '' },
    { textLat: '', isCorrect: false, wrongReason: '' },
  ]);
  const [cats, setCats] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
    api.topics().then(setTopics).catch(() => {});
    api.tickets().then(setTickets).catch(() => {});
    if (editing)
      api.question(Number(id)).then((it: any) => {
        setTextLat(it.textLat);
        setTextCyr(it.textCyr || '');
        setExplanation(it.explanation || '');
        setCategoryId(it.categoryId ? String(it.categoryId) : '');
        setTopicId(it.topicId ? String(it.topicId) : '');
        setTicketId(it.ticketId ? String(it.ticketId) : '');
        setDifficulty(String(it.difficulty || 1));
        setIsTricky(it.isTricky);
        setIsNumeric(it.isNumeric);
        setOptions(
          it.options.map((o: any) => ({ textLat: o.textLat, isCorrect: o.isCorrect, wrongReason: o.wrongReason || '' }))
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const addOpt = () => setOptions((os) => [...os, { textLat: '', isCorrect: false, wrongReason: '' }]);
  const rmOpt = (i: number) => setOptions((os) => os.filter((_, j) => j !== i));

  const save = async () => {
    setErr('');
    if (!textLat.trim()) return setErr('Savol matni bo‘sh');
    const opts = options.filter((o) => o.textLat.trim());
    if (opts.length < 2) return setErr('Kamida 2 ta variant kerak');
    if (!opts.some((o) => o.isCorrect)) return setErr('To‘g‘ri javob belgilanmagan');

    const data = {
      textLat,
      textCyr,
      explanation,
      categoryId: categoryId ? Number(categoryId) : null,
      topicId: topicId ? Number(topicId) : null,
      ticketId: ticketId ? Number(ticketId) : null,
      difficulty: Number(difficulty),
      isTricky,
      isNumeric,
      options: opts,
    };
    setBusy(true);
    try {
      if (editing) await api.updateQuestion(Number(id), data);
      else await api.createQuestion(data);
      nav('/questions');
    } catch (e: any) {
      setErr(e.message || 'Saqlashda xato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="title">{editing ? 'Savolni tahrirlash' : 'Yangi savol'}</h1>
      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="field">
          <label>Savol matni (lotin)</label>
          <textarea className="textarea" value={textLat} onChange={(e) => setTextLat(e.target.value)} />
        </div>
        <div className="field">
          <label>Savol matni (kirill) — ixtiyoriy</label>
          <textarea className="textarea" value={textCyr} onChange={(e) => setTextCyr(e.target.value)} />
        </div>

        <div className="field">
          <label>Variantlar (to‘g‘ri javob(lar)ni belgilang)</label>
          {options.map((o, i) => (
            <div key={i} className="opt-row">
              <label className="chk">
                <input type="checkbox" checked={o.isCorrect} onChange={(e) => setOpt(i, { isCorrect: e.target.checked })} />
                to‘g‘ri
              </label>
              <input
                className="input"
                placeholder={`Variant ${i + 1}`}
                value={o.textLat}
                onChange={(e) => setOpt(i, { textLat: e.target.value })}
              />
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Nega noto‘g‘ri (ixtiyoriy)"
                value={o.wrongReason}
                onChange={(e) => setOpt(i, { wrongReason: e.target.value })}
              />
              {options.length > 2 && (
                <button className="btn danger" onClick={() => rmOpt(i)}>×</button>
              )}
            </div>
          ))}
          <button className="btn sec" onClick={addOpt}>+ Variant qo‘shish</button>
        </div>

        <div className="field">
          <label>Izoh (nega to‘g‘ri / qoida)</label>
          <textarea className="textarea" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </div>

        <div className="grid2">
          <div className="field">
            <label>Toifa</label>
            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— tanlanmagan —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mavzu</label>
            <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">— tanlanmagan —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Bilet</label>
            <select className="select" value={ticketId} onChange={(e) => setTicketId(e.target.value)}>
              <option value="">— tanlanmagan —</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Qiyinlik (1-5)</label>
            <input className="input" type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginBottom: 16 }}>
          <label className="chk">
            <input type="checkbox" checked={isTricky} onChange={(e) => setIsTricky(e.target.checked)} /> Chalg‘ituvchi
          </label>
          <label className="chk">
            <input type="checkbox" checked={isNumeric} onChange={(e) => setIsNumeric(e.target.checked)} /> Raqamli savol
          </label>
        </div>

        {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
        <div className="row">
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
          <button className="btn sec" onClick={() => nav('/questions')}>Bekor qilish</button>
        </div>
      </div>
    </div>
  );
}
