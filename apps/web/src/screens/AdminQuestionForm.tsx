import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Menu, Plus, X } from 'lucide-react';
import { adminApi, hasAdmin } from '../api';
import { latToCyr } from '../translit';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

interface Opt {
  textLat: string;
  isCorrect: boolean;
  wrongReason: string;
}

export default function AdminQuestionForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(hasAdmin());

  const [textLat, setTextLat] = useState('');
  const [textCyr, setTextCyr] = useState('');
  const [cyrTouched, setCyrTouched] = useState(false);
  const [textRus, setTextRus] = useState('');
  const [rusTouched, setRusTouched] = useState(false);
  const [rusLoading, setRusLoading] = useState(false);
  const [shablon, setShablon] = useState('');
  const [explanation, setExplanation] = useState('');
  const [topicId, setTopicId] = useState('');
  const [options, setOptions] = useState<Opt[]>([
    { textLat: '', isCorrect: true, wrongReason: '' },
    { textLat: '', isCorrect: false, wrongReason: '' },
    { textLat: '', isCorrect: false, wrongReason: '' },
    { textLat: '', isCorrect: false, wrongReason: '' },
  ]);
  const [topics, setTopics] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Rasm preview — blob URL bir marta yaratiladi va tozalanadi (memory leak yo'q)
  useEffect(() => {
    if (!imageFile) { setImgPreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImgPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Rus qatorini lotin matndan avtomatik tarjima qilamiz (debounce, admin qo'lda tegmagan bo'lsa)
  useEffect(() => {
    if (rusTouched) return;
    const t = textLat.trim();
    if (!t) { setTextRus(''); return; }
    const timer = setTimeout(async () => {
      setRusLoading(true);
      try {
        const r = await adminApi.translate(t);
        if (r?.text) setTextRus(r.text);
      } catch {
        /* ignore */
      } finally {
        setRusLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [textLat, rusTouched]);

  useEffect(() => {
    if (!authed) return;
    adminApi.topics().then(setTopics).catch(() => {});
    if (editing)
      adminApi
        .question(Number(id))
        .then((it: any) => {
          setTextLat(it.textLat || '');
          setTextCyr(it.textCyr || '');
          if (it.textCyr) setCyrTouched(true);
          setTextRus(it.textRus || '');
          if (it.textRus) setRusTouched(true);
          setShablon(it.shablon ? String(it.shablon) : '');
          setExplanation(it.explanation || '');
          setTopicId(it.topicId ? String(it.topicId) : '');
          setImageUrl(it.imageUrl || null);
          if (it.options?.length)
            setOptions(it.options.map((o: any) => ({ textLat: o.textLat, isCorrect: o.isCorrect, wrongReason: o.wrongReason || '' })));
        })
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Lotin yozilganda kirill qatorini avtomatik to'ldiramiz (agar admin qo'lda o'zgartirmagan bo'lsa)
  const onLat = (v: string) => {
    setTextLat(v);
    if (!cyrTouched) setTextCyr(latToCyr(v));
  };
  const onCyr = (v: string) => {
    setTextCyr(v);
    setCyrTouched(true);
  };

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const addOpt = () => setOptions((os) => [...os, { textLat: '', isCorrect: false, wrongReason: '' }]);
  const rmOpt = (i: number) => setOptions((os) => os.filter((_, j) => j !== i));

  const removeImage = async () => {
    if (!editing) { setImageUrl(null); return; }
    setImageBusy(true);
    try {
      await adminApi.deleteImage(Number(id));
      setImageUrl(null);
    } catch (e: any) {
      setErr(e.message || 'Xato');
    } finally {
      setImageBusy(false);
    }
  };

  const save = async () => {
    setErr('');
    if (!textLat.trim()) return setErr('Savol matni bo‘sh');
    const opts = options.filter((o) => o.textLat.trim());
    if (opts.length < 2) return setErr('Kamida 2 ta variant kerak');
    if (!opts.some((o) => o.isCorrect)) return setErr('To‘g‘ri javob belgilanmagan');

    const data = {
      textLat: textLat.trim(),
      textCyr: textCyr.trim(),
      textRus: textRus.trim(),
      shablon: shablon ? Number(shablon) : null,
      explanation: explanation.trim(),
      topicId: topicId ? Number(topicId) : null,
      options: opts,
    };
    setBusy(true);
    try {
      let qid = editing ? Number(id) : 0;
      if (editing) await adminApi.updateQuestion(Number(id), data);
      else {
        const created = await adminApi.createQuestion(data);
        qid = created.id;
      }
      if (imageFile && qid) await adminApi.uploadImage(qid, imageFile);
      if (audioFile && qid) await adminApi.uploadAudio(qid, audioFile);
      nav('/savollar');
    } catch (e: any) {
      setErr(e.message || 'Saqlashda xato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="db">
      <AppSidebar active="/savollar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/savollar')}><ChevronLeft size={18} /> Savollar</button>
          <div style={{ flex: 1 }} />
        </header>

        <div className="db-content">
          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <div className="adm-form">
              <h1 className="adm-title">{editing ? 'Savolni tahrirlash' : 'Yangi savol'}</h1>

              <div className="adm-field">
                <label>Savol matni (lotin)</label>
                <textarea className="adm-ta" value={textLat} onChange={(e) => onLat(e.target.value)} placeholder="Masalan: Svetoforning qizil signali nimani bildiradi?" />
              </div>

              <div className="adm-field">
                <label>Savol matni (kirill) — lotin yozilganda avtomatik to‘ladi</label>
                <textarea className="adm-ta" value={textCyr} onChange={(e) => onCyr(e.target.value)} placeholder="Автоматик тўлади (керак бўлса қўлда таҳрирланг)" />
              </div>

              <div className="adm-field">
                <label>Savol matni (rus) — lotin yozilganda avtomatik tarjima qilinadi {rusLoading && <span style={{ color: '#7fb0ff' }}>· tarjima qilinmoqda…</span>}</label>
                <textarea className="adm-ta" value={textRus} onChange={(e) => { setTextRus(e.target.value); setRusTouched(true); }} placeholder="Автоматический перевод (при необходимости отредактируйте)" />
              </div>

              <div className="adm-field">
                <label>Shablon (savol qaysi shablonga tushadi)</label>
                <select className="adm-sel" value={shablon} onChange={(e) => setShablon(e.target.value)} style={{ maxWidth: 260 }}>
                  <option value="">— tanlanmagan —</option>
                  {Array.from({ length: 63 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}-shablon</option>
                  ))}
                </select>
                <div className="adm-hint">Bo‘sh qoldirilsa — savol shablonga biriktirilmaydi.</div>
              </div>

              <div className="adm-field">
                <label>Savol rasmi (test oynasida o‘ng tomonda ko‘rinadi)</label>
                <div className="adm-imgrow">
                  {imageFile ? (
                    <img src={imgPreview || undefined} alt="" className="adm-imgprev" />
                  ) : imageUrl ? (
                    <img src={imageUrl} alt="" className="adm-imgprev" />
                  ) : (
                    <div className="adm-imgph">Rasm yo‘q</div>
                  )}
                  <div className="adm-imgbtns">
                    <label className="adm-btn sec file">
                      {imageFile ? `✓ ${imageFile.name}` : imageUrl ? 'Rasmni almashtirish' : '🖼 Rasm tanlash'}
                      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    </label>
                    {imageFile && <button className="adm-btn sec" onClick={() => setImageFile(null)}>Bekor</button>}
                    {!imageFile && imageUrl && (
                      <button className="adm-btn danger" onClick={removeImage} disabled={imageBusy}>Rasmni o‘chirish</button>
                    )}
                  </div>
                </div>
                <div className="adm-hint">Saqlash bosilganda yuklanadi. (JPG/PNG)</div>
              </div>

              <div className="adm-field">
                <label>Variantlar — to‘g‘ri javob(lar)ni belgilang</label>
                {options.map((o, i) => (
                  <div className="adm-opt" key={i}>
                    <span className="adm-fb">F{i + 1}</span>
                    <label className="adm-chk" title="To‘g‘ri javob">
                      <input type="checkbox" checked={o.isCorrect} onChange={(e) => setOpt(i, { isCorrect: e.target.checked })} />
                      <span>to‘g‘ri</span>
                    </label>
                    <input className="adm-inp flex" placeholder={`Variant ${i + 1}`} value={o.textLat} onChange={(e) => setOpt(i, { textLat: e.target.value })} />
                    <input className="adm-inp flex" placeholder="Nega noto‘g‘ri (ixtiyoriy)" value={o.wrongReason} onChange={(e) => setOpt(i, { wrongReason: e.target.value })} />
                    {options.length > 2 && (
                      <button className="adm-x" onClick={() => rmOpt(i)}><X size={15} /></button>
                    )}
                  </div>
                ))}
                <button className="adm-btn sec" onClick={addOpt}><Plus size={15} /> Variant qo‘shish</button>
              </div>

              <div className="adm-field">
                <label>Izoh / Qoida matni (Qoidasi'da ko‘rsatiladi, Tushuncha ovozda o‘qiydi)</label>
                <textarea className="adm-ta" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
              </div>

              <div className="adm-field">
                <label>Tushuncha ovozi (ixtiyoriy — yuklanmasa avtomatik o‘zbek ovozida o‘qiladi)</label>
                <div className="adm-imgbtns">
                  <label className="adm-btn sec file">
                    {audioFile ? `✓ ${audioFile.name}` : '🎙 Ovoz tanlash'}
                    <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                  </label>
                  {audioFile && <button className="adm-btn sec" onClick={() => setAudioFile(null)}>Bekor</button>}
                </div>
              </div>

              <div className="adm-field">
                <label>Mavzu</label>
                <select className="adm-sel" value={topicId} onChange={(e) => setTopicId(e.target.value)} style={{ maxWidth: 360 }}>
                  <option value="">— tanlanmagan —</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {err && <div className="adm-err">{err}</div>}
              <div className="adm-actions">
                <button className="adm-btn primary" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
                <button className="adm-btn sec" onClick={() => nav('/savollar')}>Bekor qilish</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
