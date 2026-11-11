import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Search, Plus, Pencil, Trash2, ChevronLeft, Upload, Check, X, ImageOff, SignpostBig } from 'lucide-react';
import { adminApi, hasAdmin, canManageQuestions, ensureAdminAuto, clearAdmin, type AdminBelgi } from '../api';
import { TOIFALAR, belgiRasmUrl, belgiTartibi, raqamKorinadi } from '../belgilar/katalog';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

interface Forma { id: number | null; toifa: number; raqam: string; nom: string; tavsif: string; rasm: string | null }
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, "'");

/** Belgi rasmi (kichik); rasm yo'q bo'lsa — raqami yozilgan o'rinbosar */
function Kichik({ rasm, raqam }: { rasm: string | null; raqam: string }) {
  const [xato, setXato] = useState(false);
  return rasm && !xato
    ? <img className="ab-thumb" src={belgiRasmUrl(rasm)} alt="" loading="lazy" onError={() => setXato(true)} />
    : <span className="ab-thumb ab-thumb-yoq">{raqamKorinadi(raqam) ? raqam : <ImageOff size={16} />}</span>;
}

/**
 * Yo'l belgilarini boshqarish (Owner va Admin; faqat saytda): toifalar → belgilar ro'yxati,
 * yangi belgi qo'shish, tahrirlash (nom, raqam, tavsif, rasm), o'chirish.
 * O'zgarishlar ilova va saytdagi "Yo'l belgilari" oynasida darhol ko'rinadi.
 */
export default function AdminBelgilar() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [list, setList] = useState<AdminBelgi[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [q, setQ] = useState('');
  const toifaN = Number(sp.get('toifa')) || 0;
  const toifa = TOIFALAR.find((t) => t.n === toifaN) || null;

  // Tahrir/yangi belgi formasi
  const [forma, setForma] = useState<Forma | null>(null);
  const [fayl, setFayl] = useState<File | null>(null);
  const [rasmOchir, setRasmOchir] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const faylRef = useRef<HTMLInputElement>(null);
  const formaRef = useRef<HTMLFormElement>(null);
  const korinish = useMemo(() => (fayl ? URL.createObjectURL(fayl) : null), [fayl]);
  useEffect(() => () => { if (korinish) URL.revokeObjectURL(korinish); }, [korinish]);

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi
      .signs()
      .then(setList)
      .catch((e: any) => {
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
        else setErr(e?.message || 'Belgilarni yuklab bo‘lmadi');
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (!authed) ensureAdminAuto().then((r) => r && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const toifaga = (n: number | null) => {
    setForma(null);
    setQ('');
    setSp(n ? { toifa: String(n) } : {});
    window.scrollTo(0, 0);
  };

  const formaniOch = (f: Forma) => {
    setForma(f);
    setFayl(null);
    setRasmOchir(false);
    setErr('');
    setOk('');
    if (faylRef.current) faylRef.current.value = '';
    setTimeout(() => formaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const yangi = () => formaniOch({ id: null, toifa: toifa?.n || 1, raqam: '', nom: '', tavsif: '', rasm: null });
  const tahrirla = (b: AdminBelgi) => formaniOch({ id: b.id, toifa: b.toifa, raqam: b.raqam, nom: b.nom, tavsif: b.tavsif, rasm: b.rasm });

  const saqla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forma) return;
    setErr('');
    setOk('');
    const nom = forma.nom.trim();
    const raqam = forma.raqam.trim();
    if (!nom) return setErr('Belgi nomini kiriting');
    const takror = raqam && list.find((b) => b.toifa === forma.toifa && b.raqam === raqam && b.id !== forma.id);
    if (takror) return setErr(`${raqam} raqamli belgi bu toifada bor: «${takror.nom}»`);
    setSaqlanmoqda(true);
    try {
      const data = { toifa: forma.toifa, raqam, nom, tavsif: forma.tavsif.trim(), toifaNomi: TOIFALAR.find((t) => t.n === forma.toifa)?.nom };
      let r = forma.id ? await adminApi.updateSign(forma.id, data) : await adminApi.createSign(data);
      if (fayl) r = await adminApi.uploadSignImage(r.id, fayl);
      else if (rasmOchir && r.rasm) r = await adminApi.deleteSignImage(r.id);
      setList((l) => [...l.filter((x) => x.id !== r.id), r].sort(belgiTartibi));
      setOk(`«${r.nom}» ${forma.id ? 'saqlandi' : 'qo‘shildi'}.`);
      setForma(null);
      setFayl(null);
      if (r.toifa !== toifaN && !q) setSp({ toifa: String(r.toifa) });
    } catch (e2: any) {
      setErr(e2?.message || 'Saqlab bo‘lmadi');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  const ochir = async (b: AdminBelgi) => {
    if (!window.confirm(`«${b.nom}»${raqamKorinadi(b.raqam) ? ' (' + b.raqam + ')' : ''} o‘chirilsinmi? Ilova va saytdan ham yo‘qoladi.`)) return;
    try {
      await adminApi.deleteSign(b.id);
      setList((l) => l.filter((x) => x.id !== b.id));
      if (forma?.id === b.id) setForma(null);
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
    }
  };

  const qq = norm(q.trim());
  const korinadigan = qq
    ? list.filter((b) => norm(b.nom).includes(qq) || b.raqam.includes(qq) || norm(b.tavsif).includes(qq))
    : toifa ? list.filter((b) => b.toifa === toifa.n) : [];

  // Formadagi rasm: yangi tanlangan fayl → hozirgi rasm (o'chirilmagan bo'lsa)
  const formaRasmi = korinish || (forma && !rasmOchir && forma.rasm ? belgiRasmUrl(forma.rasm) : null);

  return (
    <div className="db">
      <AppSidebar active="/belgilar/boshqaruv" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search">
            <Search size={17} />
            <input placeholder="Belgi nomi, raqami yoki tavsifi…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
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
                  {(toifa || qq) && (
                    <button className="adm-back" onClick={() => toifaga(null)}><ChevronLeft size={18} /> Toifalar</button>
                  )}
                  <h1 className="adm-title">
                    {qq ? `Qidiruv: ${korinadigan.length} ta` : toifa ? `${toifa.nom} (${korinadigan.length})` : `Yo‘l belgilari (${list.length})`}
                  </h1>
                </div>
                <div className="adm-head-btns">
                  <button className="adm-btn sec" onClick={() => nav('/belgilar')}>
                    <SignpostBig size={17} /> Foydalanuvchi ko‘rinishi
                  </button>
                  <button className="adm-btn primary" onClick={yangi}>
                    <Plus size={17} /> Yangi belgi
                  </button>
                </div>
              </div>

              {/* ---- Yangi belgi / tahrir formasi ---- */}
              {forma && (
                <form className="am-form ab-form" onSubmit={saqla} ref={formaRef}>
                  <div className="ab-form-sarlavha">{forma.id ? 'Belgini tahrirlash' : 'Yangi belgi'}</div>
                  <div className="ab-form-ichi">
                    <div className="ab-rasm-joy">
                      {formaRasmi ? <img src={formaRasmi} alt="" /> : <span className="ab-rasm-yoq"><ImageOff size={28} /><br />Rasm yo‘q</span>}
                      <label className="adm-btn sec file ab-rasm-btn">
                        <input
                          ref={faylRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                          onChange={(e) => { setFayl(e.target.files?.[0] || null); setRasmOchir(false); }}
                          disabled={saqlanmoqda}
                        />
                        <Upload size={16} /> {formaRasmi ? 'Almashtirish' : 'Rasm tanlash'}
                      </label>
                      {formaRasmi && (
                        <button
                          type="button"
                          className="adm-btn danger ab-rasm-btn"
                          onClick={() => { setFayl(null); setRasmOchir(true); if (faylRef.current) faylRef.current.value = ''; }}
                          disabled={saqlanmoqda}
                        >
                          <Trash2 size={16} /> Rasmni olib tashlash
                        </button>
                      )}
                    </div>
                    <div className="ab-maydonlar">
                      <div className="am-form-row">
                        <select
                          className="adm-sel ab-toifa"
                          value={forma.toifa}
                          onChange={(e) => setForma({ ...forma, toifa: Number(e.target.value) })}
                          disabled={saqlanmoqda}
                        >
                          {TOIFALAR.map((t) => <option key={t.n} value={t.n}>{t.n}. {t.nom}</option>)}
                        </select>
                        <input
                          className="adm-inp ab-raqam"
                          placeholder="Raqami (masalan 1.35)"
                          value={forma.raqam}
                          onChange={(e) => setForma({ ...forma, raqam: e.target.value })}
                          disabled={saqlanmoqda}
                        />
                      </div>
                      <input
                        className="adm-inp"
                        placeholder="Belgi nomi — masalan «Yoʻl ishlari»"
                        value={forma.nom}
                        onChange={(e) => setForma({ ...forma, nom: e.target.value })}
                        disabled={saqlanmoqda}
                        autoFocus
                      />
                      <textarea
                        className="adm-ta ab-tavsif"
                        placeholder="Tavsif — qoidalardagi izoh (ixtiyoriy)"
                        value={forma.tavsif}
                        onChange={(e) => setForma({ ...forma, tavsif: e.target.value })}
                        disabled={saqlanmoqda}
                      />
                      <p className="am-hint">
                        Rasm: PNG, JPG, SVG yoki WEBP, 3 MB gacha. Bir xil nomli belgilar (masalan 1.4.1 — 1.4.6) ilovada bitta oynada birga ko‘rinadi.
                        Taniqlik belgilarida raqam bo‘lmasa — bo‘sh qoldiring.
                      </p>
                      <div className="adm-head-btns">
                        <button className="adm-btn primary" disabled={saqlanmoqda}>
                          <Check size={16} /> {saqlanmoqda ? 'Saqlanmoqda…' : forma.id ? 'Saqlash' : 'Qo‘shish'}
                        </button>
                        <button type="button" className="adm-btn sec" onClick={() => setForma(null)} disabled={saqlanmoqda}>
                          <X size={16} /> Bekor
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}

              {!loading && !toifa && !qq ? (
                /* ===== TOIFA KARTALARI ===== */
                <div className="adm-shab-grid ab-toifalar">
                  {TOIFALAR.map((t) => {
                    const bb = list.filter((b) => b.toifa === t.n);
                    const namuna = bb.find((b) => b.rasm);
                    return (
                      <div className={'adm-shab-card' + (bb.length ? ' has' : '')} key={t.n} onClick={() => toifaga(t.n)}>
                        <div className="adm-shab-num ab-toifa-nom">{t.n}. {t.nom}</div>
                        <div className="adm-shab-row">
                          {namuna ? <Kichik rasm={namuna.rasm} raqam={namuna.raqam} /> : <span className="adm-shab-count">0</span>}
                          <div className="adm-shab-info">{bb.length ? `${bb.length} ta belgi` : 'Belgi yo‘q'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !loading && (
                /* ===== BELGILAR RO'YXATI ===== */
                <div className="adm-list">
                  {korinadigan.length === 0 && (
                    <div className="adm-empty">{qq ? 'Hech narsa topilmadi.' : 'Bu toifada belgi yo‘q. “Yangi belgi” bilan qo‘shing.'}</div>
                  )}
                  {korinadigan.map((b) => (
                    <div className={'adm-row ab-row' + (forma?.id === b.id ? ' tanlangan' : '')} key={b.id}>
                      <Kichik rasm={b.rasm} raqam={b.raqam} />
                      {raqamKorinadi(b.raqam) && <span className="adm-id ab-id">{b.raqam}</span>}
                      <span className="ab-matn">
                        <b>{b.nom}</b>
                        {b.tavsif && <small>{b.tavsif}</small>}
                      </span>
                      {qq && <span className="adm-badge b2">{TOIFALAR.find((t) => t.n === b.toifa)?.nom}</span>}
                      <button className="adm-mini" onClick={() => tahrirla(b)} title="Tahrirlash"><Pencil size={14} /></button>
                      <button className="adm-mini danger" onClick={() => ochir(b)} title="O‘chirish"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
