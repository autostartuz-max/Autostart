import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Menu, Plus, X, Upload, Image as ImageIcon, ListChecks,
  Info, Mic, Grid3x3, BookOpen,
} from 'lucide-react';
import { adminApi, hasAdmin, ensureAdminAuto } from '../api';
import Tesseract from 'tesseract.js';
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

// Savol matnidan mavzuni taxmin qilish (kalit so'zlar mosligi bo'yicha)
function guessTopic(q: string, topics: any[]) {
  if (!q || !topics?.length) return null;
  const ql = q.toLowerCase();
  let best: any = null;
  let score = 0;
  for (const t of topics) {
    const words = String(t.name || '').toLowerCase().split(/[\s,()]+/).filter((w) => w.length > 4);
    const s = words.filter((w) => ql.includes(w.slice(0, 6))).length;
    if (s > score) { score = s; best = t; }
  }
  return score > 0 ? best : null;
}

export default function AdminQuestionForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
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
  const [order, setOrder] = useState('');
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
  const [dragging, setDragging] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  // Skrinshotdan OCR bilan avtomat to'ldirish (Tesseract)
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrErr, setOcrErr] = useState('');
  const [ocrPct, setOcrPct] = useState(0);
  const [ocrDrag, setOcrDrag] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Token bo'lmasa — hozircha avtomatik admin sifatida kiramiz
  useEffect(() => {
    if (!authed) ensureAdminAuto().then((ok) => ok && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shablon kartasidan "Yangi savol" bosilganda (?shablon=N&order=M) — shablon va tartib raqamni oldindan qo'yamiz
  useEffect(() => {
    if (!editing) {
      const s = sp.get('shablon');
      if (s && /^\d+$/.test(s)) setShablon(s);
      const o = sp.get('order');
      if (o && /^\d+$/.test(o)) setOrder(o);
    }
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
          setOrder(it.order ? String(it.order) : '');
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

  const onDropImg = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) setImageFile(f);
  };

  // Skrinshotdan OCR (Tesseract) bilan matnni o'qib formani to'ldirish
  const runOcr = async (file: File) => {
    setOcrErr('');
    setOcrBusy(true);
    setOcrPct(0);
    // 1) AI vision (Groq) — aniq o'qish; ishlamasa pastdagi Tesseract zaxirasiga o'tamiz
    try {
      const r = await adminApi.extractQuestion(file);
      if (r.textLat || (r.options && r.options.length)) {
        if (r.textLat) onLat(r.textLat);
        if (r.options?.length) setOptions((os) => os.map((o, i) => (r.options[i]
          ? { ...o, textLat: r.options[i], textRus: '', rusTouched: false, rusSrc: '' } : o)));
        if (r.shablon != null) setShablon(String(r.shablon));
        if (r.tartib != null) setOrder(String(r.tartib));
        const g = guessTopic(r.textLat || '', topics);
        if (g) setTopicId(String(g.id));
        setOcrBusy(false);
        return;
      }
    } catch {
      /* AI ishlamadi — Tesseract zaxirasiga o'tamiz */
    }
    // 2) Zaxira: mahalliy Tesseract OCR
    try {
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m: any) => { if (m.status === 'recognizing text') setOcrPct(Math.round((m.progress || 0) * 100)); },
      });
      const lines = (data.text || '').split('\n').map((l: string) => l.trim()).filter(Boolean);

      // Savol: '?' bo'lgan eng uzun qator
      const qLine = lines.filter((l) => l.includes('?')).sort((a, b) => b.length - a.length)[0] || '';

      // Shablon: "N - Bilet/Shablon"
      let shab = '';
      for (const l of lines) {
        const m = l.match(/(\d{1,2})\s*[-–—]\s*(bilet|shablon)/i);
        if (m) { shab = m[1]; break; }
      }

      // Variantlar: "F1 ...", "F2 ..." ko'rinishidagi qatorlar (radio belgisi shovqinini tozalaymiz)
      const opts: string[] = [];
      for (const l of lines) {
        const m = l.match(/^F?\s*[1-4][.):]?\s+(.{2,})$/i);
        if (!m) continue;
        const t = m[1].trim().replace(/^[○◯●©®(){}\[\]|·•]+\s*/, '').trim();
        if (t.length >= 2 && !t.includes('?')) opts.push(t);
      }

      if (qLine) onLat(qLine);
      if (opts.length) {
        setOptions((os) => os.map((o, i) => (opts[i]
          ? { ...o, textLat: opts[i], textRus: '', rusTouched: false, rusSrc: '' }
          : o)));
      }
      if (shab) setShablon(shab);
      const g = guessTopic(qLine, topics);
      if (g) setTopicId(String(g.id));

      if (!qLine && opts.length === 0) {
        setOcrErr('Matn o‘qib bo‘lmadi — rasm tiniqroq/kattaroq bo‘lsin yoki qo‘lda to‘ldiring.');
      }
    } catch (e: any) {
      setOcrErr('OCR xatosi: ' + (e?.message || e));
    } finally {
      setOcrBusy(false);
    }
  };

  // Clipboard'dan (Ctrl+V) skrinshot -> OCR
  useEffect(() => {
    if (!authed) return;
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;
      let f: File | null = null;
      for (const it of Array.from(dt.items || [])) {
        if (it.type.startsWith('image/')) { f = it.getAsFile(); break; }
      }
      if (!f && dt.files) {
        for (const file of Array.from(dt.files)) {
          if (file.type.startsWith('image/')) { f = file; break; }
        }
      }
      if (f) {
        e.preventDefault();
        runOcr(f); // savol matni, javoblar, shablon, mavzuni avtomat to'ldiradi (rasm alohida yuklanadi)
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, topics]);

  const save = async () => {
    setErr('');
    if (!textLat.trim()) return setErr('Savol matni (lotin) to‘ldirilmagan');
    if (!shablon) return setErr('Shablon tanlanmagan');
    if (!topicId) return setErr('Mavzu tanlanmagan');
    if (options.some((o) => !o.textLat.trim())) return setErr('Barcha variantlarni to‘ldiring');
    if (!options.some((o) => o.isCorrect)) return setErr('To‘g‘ri javob belgilanmagan');

    setBusy(true);
    try {
      // Kirill/rus majburiy — bo'sh bo'lsa avtomatik to'ldiramiz
      const cyrFinal = textCyr.trim() || latToCyr(textLat.trim());
      let rusFinal = textRus.trim();
      if (!rusFinal) {
        try { const r = await adminApi.translate(textLat.trim()); rusFinal = r?.text || ''; } catch { /* ignore */ }
      }
      if (!rusFinal) { setBusy(false); return setErr('Savol matni (rus) to‘ldirilmadi — qo‘lda kiriting'); }

      // Bo'sh qolgan ruscha variantlarni saqlashdan oldin to'ldiramiz
      const optsFinal = await Promise.all(
        options.map(async (o) => {
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
        textCyr: cyrFinal,
        textRus: rusFinal,
        shablon: Number(shablon),
        order: order ? Number(order) : 0,
        explanation: explanation.trim(),
        topicId: Number(topicId),
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
        <header className="db-top qf-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/savollar')}><ChevronLeft size={18} /> Savollar</button>
          <div className="qf-htitle">
            <b>{editing ? 'Savolni tahrirlash' : 'Yangi savol'}</b>
            <span>Savol ma’lumotlarini kiriting va to‘g‘ri javobni belgilang</span>
          </div>
          {authed && (
            <div className="qf-top-actions">
              <button className="adm-btn sec" onClick={() => nav('/savollar')}><X size={16} /> Bekor qilish</button>
              <button className="adm-btn primary" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
            </div>
          )}
        </header>

        <div className="db-content">
          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              {err && <div className="adm-err" style={{ marginBottom: 14 }}>{err}</div>}

              {/* Skrinshotdan avtomat to'ldirish — bu yerga tashlang, tanlang yoki Ctrl+V */}
              <div
                className={'qf-ocrbar' + (ocrDrag ? ' drag' : '') + (ocrBusy ? ' busy' : '') + (ocrErr && !ocrBusy ? ' err' : '')}
                onClick={() => pasteRef.current?.focus()}
                onDragOver={(e) => { e.preventDefault(); setOcrDrag(true); }}
                onDragLeave={() => setOcrDrag(false)}
                onDrop={(e) => { e.preventDefault(); setOcrDrag(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) runOcr(f); }}
              >
                <textarea
                  ref={pasteRef}
                  className="qf-ocrbar-catch"
                  aria-label="Skrinshotni Ctrl+V bilan joylang"
                  onPaste={(e) => {
                    const dt = e.clipboardData;
                    let f: File | null = null;
                    for (const it of Array.from(dt.items || [])) if (it.type.startsWith('image/')) { f = it.getAsFile(); break; }
                    if (!f && dt.files) for (const fl of Array.from(dt.files)) if (fl.type.startsWith('image/')) { f = fl; break; }
                    if (f) { e.preventDefault(); e.stopPropagation(); runOcr(f); }
                  }}
                />
                <span className="qf-ocrbar-ic">📋</span>
                <div className="qf-ocrbar-txt">
                  <b>Skrinshotni Ctrl+V bilan joylang</b>
                  <span>
                    {ocrBusy
                      ? `🤖 AI o‘qiyapti…${ocrPct ? ' ' + ocrPct + '%' : ''}`
                      : ocrErr
                        ? ocrErr
                        : 'Skrinshot oldingizmi? Shu yerga Ctrl+V bosing (yoki sudrab tashlang) — AI savol, javoblar va shablonni to‘ldiradi'}
                  </span>
                </div>
              </div>

              <div className="qf-grid">
                {/* ===== CHAP ustun ===== */}
                <div className="qf-left">
                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic blue">T</span>
                      <div><label>Savol matni (lotin) <span className="req">*</span></label></div>
                    </div>
                    <div className="qf-inwrap">
                      <textarea className="adm-ta" maxLength={500} value={textLat} onChange={(e) => onLat(e.target.value)} placeholder="Masalan: Svetoforning qizil signali nimani bildiradi?" />
                      <span className="qf-count">{textLat.length}/500</span>
                    </div>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic blue">A</span>
                      <div><label>Savol matni (kirill) <span className="req">*</span></label><div className="sub">lotin bilan bir xil ma’noda avtomatik tuziladi</div></div>
                    </div>
                    <div className="qf-inwrap">
                      <textarea className="adm-ta" maxLength={500} value={textCyr} onChange={(e) => onCyr(e.target.value)} placeholder="Автоматик тузилади (керак бўлса қўлда таҳрирланг)" />
                      <span className="qf-count">{textCyr.length}/500</span>
                    </div>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic blue">Я</span>
                      <div><label>Savol matni (rus) <span className="req">*</span></label><div className="sub">lotin bilan bir xil ma’noda avtomatik tarjima qilinadi {rusLoading && <span style={{ color: '#7fb0ff' }}>· tarjima qilinmoqda…</span>}</div></div>
                    </div>
                    <div className="qf-inwrap">
                      <textarea className="adm-ta" maxLength={500} value={textRus} onChange={(e) => { setTextRus(e.target.value); setRusTouched(true); }} placeholder="Автоматический перевод (при необходимости отредактируйте)" />
                      <span className="qf-count">{textRus.length}/500</span>
                    </div>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic green"><ImageIcon size={18} /></span>
                      <div><label>Savol rasmi</label><div className="sub">test oynasida ko‘rinadi</div></div>
                    </div>
                    {imageFile || imageUrl ? (
                      <div className="adm-imgrow">
                        <img src={imageFile ? (imgPreview || undefined) : (imageUrl || undefined)} alt="" className="adm-imgprev qf-zoomable" onClick={() => setZoomSrc(imageFile ? imgPreview : imageUrl)} title="Kattalashtirish uchun bosing" />
                        <div className="adm-imgbtns">
                          <label className="adm-btn sec file">
                            {imageFile ? `✓ ${imageFile.name}` : 'Rasmni almashtirish'}
                            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                          </label>
                          {imageFile && <button className="adm-btn sec" onClick={() => setImageFile(null)}>Bekor</button>}
                          {!imageFile && imageUrl && <button className="adm-btn danger" onClick={removeImage} disabled={imageBusy}>Rasmni o‘chirish</button>}
                        </div>
                      </div>
                    ) : (
                      <label
                        className={'qf-drop' + (dragging ? ' drag' : '')}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDropImg}
                      >
                        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                        <Upload size={26} className="qf-drop-ic" />
                        <b>Rasm tanlash</b>
                        <small>PNG, JPG yoki WEBP. Maksimal hajm 5MB.</small>
                        <div className="qf-drop-btn"><ImageIcon size={15} /> Rasm tanlash</div>
                      </label>
                    )}
                    <div className="adm-hint">Rasm test oynasida savol bilan birga ko‘rsatiladi. Ko‘rish uchun rasmga bosing.</div>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic blue"><ListChecks size={18} /></span>
                      <div><label>Variantlar — to‘g‘ri javob(lar)ni belgilang <span className="req">*</span></label></div>
                    </div>
                    {options.map((o, i) => (
                      <div className="adm-opt" key={i}>
                        <span className="qf-optnum">{i + 1}</span>
                        <label className="adm-chk" title="To‘g‘ri javob">
                          <input type="checkbox" checked={o.isCorrect} onChange={(e) => setOpt(i, { isCorrect: e.target.checked })} />
                        </label>
                        <input className="adm-inp flex" placeholder={`Variant ${i + 1} (lotin)`} value={o.textLat} onChange={(e) => setOpt(i, { textLat: e.target.value })} />
                        <input className="adm-inp flex" placeholder="Rus tilida (avtomatik)" value={o.textRus} onChange={(e) => setOpt(i, { textRus: e.target.value, rusTouched: true })} />
                        {options.length > 2 && <button className="adm-x" onClick={() => rmOpt(i)}><X size={15} /></button>}
                      </div>
                    ))}
                    <button className="adm-btn sec" onClick={addOpt}><Plus size={15} /> Variant qo‘shish</button>
                  </div>
                </div>

                {/* ===== O'NG ustun ===== */}
                <div className="qf-right">
                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic green"><Grid3x3 size={18} /></span>
                      <div><label>Shablon <span className="req">*</span></label><div className="sub">savol qaysi shablonga tushadi</div></div>
                    </div>
                    <select className="adm-sel" value={shablon} onChange={(e) => setShablon(e.target.value)}>
                      <option value="">— tanlanmagan —</option>
                      {Array.from({ length: 63 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}-shablon</option>)}
                    </select>
                    <div className="adm-hint">Bo‘sh qoldirilsa — savol shablonga biriktirilmaydi.</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--db-muted)', margin: '12px 0 6px' }}>Tartib raqami</div>
                    <input className="adm-inp" type="number" min={0} placeholder="0" value={order}
                      onChange={(e) => setOrder(e.target.value)} style={{ maxWidth: 140 }} />
                    <div className="adm-hint">Savollar shu raqam bo‘yicha tartiblanadi (1, 2, 3…).</div>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic blue"><BookOpen size={18} /></span>
                      <div><label>Mavzu <span className="req">*</span></label><div className="sub">savol qaysi mavzuga tegishli</div></div>
                    </div>
                    <select className="adm-sel" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                      <option value="">— tanlanmagan —</option>
                      {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic purple"><Info size={18} /></span>
                      <div><label>Izoh / Qoida matni</label><div className="sub">Qoidasi’da ko‘rsatiladi, Tushuncha ovozda o‘qiladi</div></div>
                    </div>
                    <div className="qf-inwrap">
                      <textarea className="adm-ta" maxLength={500} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Izoh yoki qoida matnini kiriting…" />
                      <span className="qf-count">{explanation.length}/500</span>
                    </div>
                  </div>

                  <div className="qf-card">
                    <div className="qf-lab">
                      <span className="qf-ic amber"><Mic size={18} /></span>
                      <div><label>Tushuncha ovozi</label><div className="sub">ixtiyoriy — xulosa avtomatik o‘qib eshittiriladi</div></div>
                    </div>
                    <div className="adm-imgbtns">
                      <label className="adm-btn sec file">
                        {audioFile ? `✓ ${audioFile.name}` : '🎙 Ovoz tanlash'}
                        <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                      </label>
                      {audioFile && <button className="adm-btn sec" onClick={() => setAudioFile(null)}>Bekor</button>}
                    </div>
                  </div>
                </div>
              </div>

              {zoomSrc && (
                <div className="qf-lightbox" onClick={() => setZoomSrc(null)}>
                  <img src={zoomSrc} alt="" onClick={(e) => e.stopPropagation()} />
                  <button className="qf-lightbox-x" onClick={() => setZoomSrc(null)}><X size={18} /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
