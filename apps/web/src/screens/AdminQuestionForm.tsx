import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Menu, Plus, X, Upload, Image as ImageIcon, ListChecks,
  Info, Mic, Grid3x3, BookOpen,
} from 'lucide-react';
import { adminApi, hasAdmin, ensureAdminAuto, base64ToFile } from '../api';
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

const AI_COLORS = ['oq', 'qora', 'qizil', "ko'k", 'yashil', 'sariq', 'kulrang', 'jigarrang', "to'q sariq"];

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
  const [dragging, setDragging] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  // AI bilan rasmni qayta bo'yash
  const [aiRows, setAiRows] = useState<{ object: string; color: string }[]>([{ object: '', color: '' }]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [aiResult, setAiResult] = useState<{ imageBase64: string; mime: string } | null>(null);
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

  const onDropImg = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) setImageFile(f);
  };

  // ----- AI qayta bo'yash handlerlari -----
  const setAiRow = (i: number, patch: Partial<{ object: string; color: string }>) =>
    setAiRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addAiRow = () => setAiRows((rs) => [...rs, { object: '', color: '' }]);
  const rmAiRow = (i: number) => setAiRows((rs) => rs.filter((_, j) => j !== i));

  // Bo'yash uchun manba rasm: yangi tanlangan File yoki serverdagi rasm
  const recolorSource = async (): Promise<File | null> => {
    if (imageFile) return imageFile;
    if (imageUrl) {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new File([blob], 'source.jpg', { type: blob.type || 'image/jpeg' });
    }
    return null;
  };

  const runRecolor = async () => {
    setAiErr('');
    const rows = aiRows.filter((r) => r.object.trim() && r.color.trim());
    if (rows.length === 0) return setAiErr('Kamida bitta obyekt va rang kiriting');
    const src = await recolorSource();
    if (!src) return setAiErr('Avval rasm yuklang');
    setAiBusy(true);
    try {
      const out = await adminApi.recolorImage(src, rows);
      setAiResult(out); // ORIGINALGA TEGMAYMIZ — alohida ko'rsatamiz
    } catch (e: any) {
      setAiErr(e.message || 'Bo‘yash xatosi');
    } finally {
      setAiBusy(false);
    }
  };

  const applyRecolor = async () => {
    if (!aiResult) return;
    const f = await base64ToFile(aiResult.imageBase64, aiResult.mime);
    setImageFile(f); // mavjud preview useEffect + save() -> uploadImage avtomat ishlaydi
    setAiResult(null);
  };

  const cancelRecolor = () => {
    setAiRows([{ object: '', color: '' }]);
    setAiErr('');
    setAiResult(null);
  };

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

                    {(imageFile || imageUrl) && (
                      <div className="qf-airecolor">
                        <div className="qf-airecolor-head">🎨 AI bilan qayta bo‘yash <span>obyekt va rangni ko‘rsating</span></div>
                        {aiRows.map((r, i) => (
                          <div className="qf-airow" key={i}>
                            <input className="adm-inp" placeholder="Obyekt (masalan: oldingi mashina)"
                              value={r.object} onChange={(e) => setAiRow(i, { object: e.target.value })} />
                            <div className="qf-color-presets">
                              {AI_COLORS.map((c) => (
                                <button type="button" key={c}
                                  className={'qf-color-chip' + (r.color === c ? ' active' : '')}
                                  onClick={() => setAiRow(i, { color: c })}>{c}</button>
                              ))}
                            </div>
                            {aiRows.length > 1 && (
                              <button className="adm-x" onClick={() => rmAiRow(i)}><X size={15} /></button>
                            )}
                          </div>
                        ))}
                        <div className="qf-airecolor-btns">
                          <button className="adm-btn sec" onClick={addAiRow}><Plus size={15} /> Qator qo‘shish</button>
                          <button className="adm-btn primary" onClick={runRecolor} disabled={aiBusy}>
                            {aiBusy ? 'Bo‘yalmoqda…' : '🎨 Bo‘yash'}
                          </button>
                          <button className="adm-btn sec" onClick={cancelRecolor} disabled={aiBusy}><X size={15} /> Bekor qilish</button>
                        </div>
                        {aiErr && <div className="adm-err" style={{ marginTop: 8 }}>{aiErr}</div>}
                        {aiResult && (
                          <div className="qf-airesult">
                            <div className="sub">Natija (original o‘zgarmaydi — tasdiqlang):</div>
                            <img className="adm-imgprev qf-zoomable" onClick={() => setZoomSrc(`data:${aiResult.mime};base64,${aiResult.imageBase64}`)}
                              src={`data:${aiResult.mime};base64,${aiResult.imageBase64}`} alt="AI natija" />
                            <div className="adm-imgbtns">
                              <button className="adm-btn primary" onClick={applyRecolor}>✓ Ishlatish</button>
                              <button className="adm-btn sec" onClick={() => setAiResult(null)}>✕ Bekor</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
