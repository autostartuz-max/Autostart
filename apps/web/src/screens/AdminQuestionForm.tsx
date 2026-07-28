import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Menu, Plus, X } from 'lucide-react';
import { adminApi, hasAdmin, ensureAdminAuto } from '../api';
import { latToCyr } from '../translit';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

interface Opt {
  textLat: string;
  textRus: string;
  isCorrect: boolean;
  rusTouched?: boolean;
  rusSrc?: string;
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
    { textLat: '', textRus: '', isCorrect: true },
    { textLat: '', textRus: '', isCorrect: false },
    { textLat: '', textRus: '', isCorrect: false },
    { textLat: '', textRus: '', isCorrect: false },
  ]);
  const [topics, setTopics] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Token bo'lmasa — hozircha avtomatik admin sifatida kiramiz
  useEffect(() => {
    if (!authed) ensureAdminAuto().then((ok) => ok && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            setOptions(it.options.map((o: any) => ({
              textLat: o.textLat, textRus: o.textRus || '', isCorrect: o.isCorrect,
              rusTouched: !!o.textRus, rusSrc: o.textLat,
            })));
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

  // Variantlarni ruschaga avto-tarjima (debounce; admin qo'lda tegmagan va matn o'zgargan bo'lsa)
  useEffect(() => {
    const timer = setTimeout(() => {
      options.forEach(async (o, i) => {
        const lat = o.textLat.trim();
        if (o.rusTouched || !lat || o.rusSrc === lat) return;
        try {
          const r = await adminApi.translate(lat);
          setOptions((os) => os.map((oo, j) => (j === i ? { ...oo, textRus: r?.text || oo.textRus, rusSrc: lat } : oo)));
        } catch {
          /* ignore */
        }
      });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.map((o) => o.textLat).join('|')]);

  const setOpt = (i: number, patch: Partial<Opt>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const addOpt = () => setOptions((os) => [...os, { textLat: '', textRus: '', isCorrect: false }]);
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

    setBusy(true);
    try {
      // Bo'sh qolgan ruscha variantlarni saqlashdan oldin to'ldiramiz
      const optsFinal = await Promise.all(
        opts.map(async (o) => {
          if (o.textRus && o.textRus.trim())
            return { textLat: o.textLat.trim(), textRus: o.textRus.trim(), isCorrect: o.isCorrect };
          try {
            const r = await adminApi.translate(o.textLat.trim());
            return { textLat: o.textLat.trim(), textRus: r?.text || '', isCorrect: o.isCorrect };
          } catch {
            return { textLat: o.textLat.trim(), textRus: '', isCorrect: o.isCorrect };
          }
        })
      );
      const data = {
        textLat: textLat.trim(),
        textCyr: textCyr.trim(),
        textRus: textRus.trim(),
        shablon: shablon ? Number(shablon) : null,
        explanation: explanation.trim(),
        topicId: topicId ? Number(topicId) : null,
        options: optsFinal,
      };
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

              {/* Shablon + Mavzu — yonma-yon, formaning o'rta qismida */}
              <div className="adm-grid2" style={{ marginBottom: 18 }}>
                <div className="adm-field" style={{ marginBottom: 0 }}>
                  <label>Shablon (savol qaysi shablonga tushadi)</label>
                  <select className="adm-sel" value={shablon} onChange={(e) => setShablon(e.target.value)}>
                    <option value="">— tanlanmagan —</option>
                    {Array.from({ length: 63 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}-shablon</option>
                    ))}
                  </select>
                  <div className="adm-hint">Bo‘sh qoldirilsa — savol shablonga biriktirilmaydi.</div>
                </div>
                <div className="adm-field" style={{ marginBottom: 0 }}>
                  <label>Mavzu</label>
                  <select className="adm-sel" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                    <option value="">— tanlanmagan —</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
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
                    <input className="adm-inp flex" placeholder={`Variant ${i + 1} (lotin)`} value={o.textLat} onChange={(e) => setOpt(i, { textLat: e.target.value })} />
                    <input className="adm-inp flex" placeholder="Rus tilida (avtomatik)" value={o.textRus} onChange={(e) => setOpt(i, { textRus: e.target.value, rusTouched: true })} />
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
