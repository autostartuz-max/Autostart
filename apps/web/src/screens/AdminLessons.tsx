import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, Video, Upload, Trash2, Pencil, Check, X, Eye, EyeOff } from 'lucide-react';
import { adminApi, canManageQuestions, hasAdmin, clearAdmin, lessonVideoUrl, type Lesson } from '../api';
import { TOIFALAR, TOIFA_IZOH, hajm, sana } from '../lessons';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const BOSH_FORMA = { title: '', description: '', category: 'B', order: 0, status: 'published' };

/** Amaliy mashg'ulot videolarini joylash va boshqarish (owner/admin) */
export default function AdminLessons() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [list, setList] = useState<Lesson[]>([]);
  const [limitMb, setLimitMb] = useState(512);
  const [filtr, setFiltr] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  // Yuklash formasi
  const [forma, setForma] = useState({ ...BOSH_FORMA });
  const [fayl, setFayl] = useState<File | null>(null);
  const [foiz, setFoiz] = useState<number | null>(null); // null = yuklanmayapti
  const faylRef = useRef<HTMLInputElement>(null);

  // Tahrir
  const [tahrirId, setTahrirId] = useState<number | null>(null);
  const [tahrir, setTahrir] = useState({ ...BOSH_FORMA });
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi
      .lessons(filtr)
      .then((r) => { setList(r.list || []); if (r.limitMb) setLimitMb(r.limitMb); })
      .catch((e: any) => {
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
        else setErr(e?.message || 'Darslarni yuklab bo‘lmadi');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, filtr]);

  const yukla = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!fayl) return setErr('Video fayl tanlang');
    if (!forma.title.trim()) return setErr('Sarlavha kiriting');
    setFoiz(0);
    try {
      const r = await adminApi.uploadLesson(
        { ...forma, title: forma.title.trim(), description: forma.description.trim() },
        fayl,
        setFoiz
      );
      setList((l) => [r.lesson, ...l]);
      setOk('«' + r.lesson.title + '» yuklandi.');
      // Toifa saqlanadi — bir toifa videolarini ketma-ket yuklash qulay bo'lsin
      setForma({ ...BOSH_FORMA, category: forma.category });
      setFayl(null);
      if (faylRef.current) faylRef.current.value = '';
    } catch (e2: any) {
      setErr(e2?.message || 'Yuklab bo‘lmadi');
    } finally {
      setFoiz(null);
    }
  };

  const tahrirBoshla = (l: Lesson) => {
    setTahrirId(l.id);
    setTahrir({
      title: l.title,
      description: l.description || '',
      category: l.category,
      order: l.order,
      status: l.status || 'published',
    });
  };

  const tahrirSaqla = async (l: Lesson) => {
    setBusyId(l.id);
    setErr('');
    try {
      const r = await adminApi.updateLesson(l.id, { ...tahrir, title: tahrir.title.trim() });
      setList((x) => x.map((v) => (v.id === l.id ? { ...v, ...r.lesson } : v)));
      setTahrirId(null);
    } catch (e: any) {
      setErr(e?.message || 'Saqlab bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  /** Ko'rinishni tez almashtirish — tahrir formasini ochmasdan */
  const holatAlmashtir = async (l: Lesson) => {
    const yangi: Lesson['status'] = l.status === 'draft' ? 'published' : 'draft';
    setBusyId(l.id);
    try {
      await adminApi.updateLesson(l.id, { status: yangi });
      setList((x) => x.map((v) => (v.id === l.id ? { ...v, status: yangi } : v)));
    } catch (e: any) {
      setErr(e?.message || 'O‘zgartirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const ochir = async (l: Lesson) => {
    if (!window.confirm('«' + l.title + '» o‘chirilsinmi? Video fayl ham serverdan o‘chadi.')) return;
    setBusyId(l.id);
    try {
      await adminApi.deleteLesson(l.id);
      setList((x) => x.filter((v) => v.id !== l.id));
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const yuklanmoqda = foiz !== null;

  return (
    <div className="db">
      <AppSidebar active="/amaliy/boshqaruv" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/amaliy')}>
            <ChevronLeft size={18} /> Amaliy mashg‘ulotlar
          </button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}
          {ok && <div className="am-ok">{ok}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <span className="am-ic"><Video size={20} /></span>
                  <h1 className="adm-title">Video darsliklar ({list.length})</h1>
                </div>
                <div className="ud-seg">
                  <button type="button" className={'ud-seg-b' + (filtr === '' ? ' on' : '')} onClick={() => setFiltr('')}>
                    Hammasi
                  </button>
                  {TOIFALAR.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={'ud-seg-b' + (filtr === t ? ' on' : '')}
                      onClick={() => setFiltr(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- Yuklash formasi ---- */}
              <form className="am-form" onSubmit={yukla}>
                <div className="am-form-row">
                  <input
                    className="adm-inp"
                    placeholder="Sarlavha — masalan: «Parallel parkovka»"
                    value={forma.title}
                    onChange={(e) => setForma({ ...forma, title: e.target.value })}
                    disabled={yuklanmoqda}
                  />
                  <select
                    className="adm-sel am-sel"
                    value={forma.category}
                    onChange={(e) => setForma({ ...forma, category: e.target.value })}
                    disabled={yuklanmoqda}
                  >
                    {TOIFALAR.map((t) => (
                      <option key={t} value={t}>{t} — {TOIFA_IZOH[t]}</option>
                    ))}
                  </select>
                  <input
                    className="adm-inp am-order"
                    type="number"
                    placeholder="Tartib"
                    title="Toifa ichidagi tartib — kichigi yuqorida turadi"
                    value={forma.order}
                    onChange={(e) => setForma({ ...forma, order: Number(e.target.value) || 0 })}
                    disabled={yuklanmoqda}
                  />
                </div>

                <textarea
                  className="adm-ta"
                  placeholder="Qisqacha izoh (ixtiyoriy) — darsda nima ko‘rsatiladi"
                  value={forma.description}
                  onChange={(e) => setForma({ ...forma, description: e.target.value })}
                  disabled={yuklanmoqda}
                />

                <div className="am-form-row">
                  <label className={'am-file' + (fayl ? ' bor' : '')}>
                    <input
                      ref={faylRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => setFayl(e.target.files?.[0] || null)}
                      disabled={yuklanmoqda}
                    />
                    <Upload size={17} />
                    <span>
                      {fayl
                        ? fayl.name + ' — ' + hajm(fayl.size)
                        : 'Video fayl tanlash (eng ko‘pi ' + limitMb + ' MB)'}
                    </span>
                  </label>
                  <label className="am-check">
                    <input
                      type="checkbox"
                      checked={forma.status === 'draft'}
                      onChange={(e) => setForma({ ...forma, status: e.target.checked ? 'draft' : 'published' })}
                      disabled={yuklanmoqda}
                    />
                    Qoralama (talabalarga ko‘rinmaydi)
                  </label>
                  <button className="adm-btn primary" disabled={yuklanmoqda}>
                    <Upload size={17} /> {yuklanmoqda ? 'Yuklanmoqda… ' + foiz + '%' : 'Yuklash'}
                  </button>
                </div>

                {yuklanmoqda && <div className="am-bar"><i style={{ width: (foiz || 0) + '%' }} /></div>}

                <p className="am-hint">
                  Katta fayl bir necha daqiqa ketishi mumkin — bu oynani yopmang.
                  Video serverning diskida saqlanadi, bazada faqat sarlavha va toifa turadi.
                </p>
              </form>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && list.length === 0 && <div className="adm-empty">Hali dars qo‘shilmagan.</div>}

              {/* ---- Ro'yxat ---- */}
              <div className="xt-list am-list">
                {list.map((l) => (
                  <div className={'xt-card am-row' + (l.status === 'draft' ? ' draft' : '')} key={l.id}>
                    {tahrirId === l.id ? (
                      <div className="am-edit">
                        <div className="am-form-row">
                          <input
                            className="adm-inp"
                            value={tahrir.title}
                            onChange={(e) => setTahrir({ ...tahrir, title: e.target.value })}
                          />
                          <select
                            className="adm-sel am-sel"
                            value={tahrir.category}
                            onChange={(e) => setTahrir({ ...tahrir, category: e.target.value })}
                          >
                            {TOIFALAR.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input
                            className="adm-inp am-order"
                            type="number"
                            value={tahrir.order}
                            onChange={(e) => setTahrir({ ...tahrir, order: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <textarea
                          className="adm-ta"
                          value={tahrir.description}
                          onChange={(e) => setTahrir({ ...tahrir, description: e.target.value })}
                        />
                        <div className="adm-head-btns">
                          <button className="adm-btn primary" disabled={busyId === l.id} onClick={() => tahrirSaqla(l)}>
                            <Check size={16} /> Saqlash
                          </button>
                          <button className="adm-btn sec" onClick={() => setTahrirId(null)}>
                            <X size={16} /> Bekor
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <video
                          className="am-thumb"
                          src={lessonVideoUrl(l.id) + '#t=1'}
                          preload="metadata"
                          controls
                          muted
                        />
                        <div className="am-row-body">
                          <div className="am-row-head">
                            <b>{l.title}</b>
                            <span className="am-cat">{l.category}</span>
                            {l.status === 'draft' && <span className="am-draft">Qoralama</span>}
                          </div>
                          {l.description && <p className="am-desc">{l.description}</p>}
                          <div className="am-meta">
                            <span>Tartib: {l.order}</span>
                            {l.sizeBytes > 0 && <span>{hajm(l.sizeBytes)}</span>}
                            <span>{sana(l.createdAt)}</span>
                            {l.origName && <span className="am-orig">{l.origName}</span>}
                          </div>
                        </div>
                        <div className="am-row-btns">
                          <button
                            className="adm-btn sec"
                            disabled={busyId === l.id}
                            onClick={() => holatAlmashtir(l)}
                            title={l.status === 'draft' ? 'E’lon qilish' : 'Qoralamaga olish'}
                          >
                            {l.status === 'draft' ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button className="adm-btn sec" onClick={() => tahrirBoshla(l)} title="Tahrirlash">
                            <Pencil size={16} />
                          </button>
                          <button
                            className="adm-btn danger"
                            disabled={busyId === l.id}
                            onClick={() => ochir(l)}
                            title="O‘chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
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
