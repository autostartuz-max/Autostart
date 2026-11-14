import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Pencil, Trash2, Upload, Check, X, ImageOff, Eye, EyeOff, BadgePercent, ExternalLink } from 'lucide-react';
import { adminApi, hasAdmin, canManageQuestions, ensureAdminAuto, clearAdmin, mediaUrl, type Aksiya } from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

interface Forma { id: number | null; sarlavha: string; matn: string; faol: boolean; tartib: number; rasm: string | null }
const BOSH: Forma = { id: null, sarlavha: '', matn: '', faol: true, tartib: 0, rasm: null };

/**
 * Aksiyalar (Owner va Admin; faqat saytda): Aloqa sahifasidagi "Aksiyalar" bo'limi.
 * Qo'shish, tahrirlash, rasm, yashirish (faol emas — saytda/ilovada ko'rinmaydi), o'chirish.
 */
export default function AdminAksiyalar() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [list, setList] = useState<Aksiya[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

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
      .aksiyalar()
      .then(setList)
      .catch((e: any) => {
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
        else setErr(e?.message || 'Aksiyalarni yuklab bo‘lmadi');
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

  const formaniOch = (f: Forma) => {
    setForma(f);
    setFayl(null);
    setRasmOchir(false);
    setErr('');
    setOk('');
    if (faylRef.current) faylRef.current.value = '';
    setTimeout(() => formaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const saqla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forma) return;
    setErr('');
    setOk('');
    if (!forma.sarlavha.trim()) return setErr('Aksiya sarlavhasini kiriting');
    setSaqlanmoqda(true);
    try {
      const data = { sarlavha: forma.sarlavha.trim(), matn: forma.matn.trim(), faol: forma.faol, tartib: forma.tartib };
      let r = forma.id ? await adminApi.updateAksiya(forma.id, data) : await adminApi.createAksiya(data);
      if (fayl) r = await adminApi.uploadAksiyaRasm(r.id, fayl);
      else if (rasmOchir && r.rasm) r = await adminApi.deleteAksiyaRasm(r.id);
      setList((l) => {
        const x = [...l.filter((a) => a.id !== r.id), r];
        return x.sort((a, b) => a.tartib - b.tartib || b.id - a.id);
      });
      setOk(`«${r.sarlavha}» ${forma.id ? 'saqlandi' : 'qo‘shildi'}${r.faol ? '' : ' (yashirin — saytda ko‘rinmaydi)'}.`);
      setForma(null);
      setFayl(null);
    } catch (e2: any) {
      setErr(e2?.message || 'Saqlab bo‘lmadi');
    } finally {
      setSaqlanmoqda(false);
    }
  };

  /** Ko'rinishini tez almashtirish — formani ochmasdan */
  const faolAlmashtir = async (a: Aksiya) => {
    setBusyId(a.id);
    setErr('');
    try {
      const r = await adminApi.updateAksiya(a.id, { sarlavha: a.sarlavha, matn: a.matn, tartib: a.tartib, faol: !a.faol });
      setList((l) => l.map((x) => (x.id === a.id ? r : x)));
    } catch (e: any) {
      setErr(e?.message || 'O‘zgartirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const ochir = async (a: Aksiya) => {
    if (!window.confirm(`«${a.sarlavha}» aksiyasi o‘chirilsinmi? Sayt va ilovadan ham yo‘qoladi.`)) return;
    setBusyId(a.id);
    try {
      await adminApi.deleteAksiya(a.id);
      setList((l) => l.filter((x) => x.id !== a.id));
      if (forma?.id === a.id) setForma(null);
    } catch (e: any) {
      setErr(e?.message || 'O‘chirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const formaRasmi = korinish || (forma && !rasmOchir && forma.rasm ? mediaUrl(forma.rasm) || null : null);
  const faollar = list.filter((a) => a.faol).length;

  return (
    <div className="db">
      <AppSidebar active="/aksiyalar/boshqaruv" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
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
                  <span className="am-ic"><BadgePercent size={20} /></span>
                  <h1 className="adm-title">Aksiyalar ({list.length})</h1>
                  {list.length > 0 && <span className="adm-badge b2">Saytda ko‘rinadi: {faollar}</span>}
                </div>
                <div className="adm-head-btns">
                  <button className="adm-btn sec" onClick={() => nav('/aloqa')}>
                    <ExternalLink size={16} /> Aloqa sahifasi
                  </button>
                  <button className="adm-btn primary" onClick={() => formaniOch({ ...BOSH })}>
                    <Plus size={17} /> Yangi aksiya
                  </button>
                </div>
              </div>

              {forma && (
                <form className="am-form ab-form" onSubmit={saqla} ref={formaRef}>
                  <div className="ab-form-sarlavha">{forma.id ? 'Aksiyani tahrirlash' : 'Yangi aksiya'}</div>
                  <div className="ab-form-ichi">
                    <div className="ab-rasm-joy ak-rasm-joy">
                      {formaRasmi ? <img src={formaRasmi} alt="" /> : <span className="ab-rasm-yoq"><ImageOff size={28} /><br />Rasm yo‘q (ixtiyoriy)</span>}
                      <label className="adm-btn sec file ab-rasm-btn">
                        <input
                          ref={faylRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
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
                      <input
                        className="adm-inp"
                        autoComplete="off"
                        placeholder="Sarlavha — masalan «B toifaga 20% chegirma»"
                        value={forma.sarlavha}
                        maxLength={150}
                        onChange={(e) => setForma({ ...forma, sarlavha: e.target.value })}
                        disabled={saqlanmoqda}
                        autoFocus
                      />
                      <textarea
                        className="adm-ta ab-tavsif"
                        placeholder="Aksiya shartlari: muddati, kimlar uchun, qanday foydalanish…"
                        value={forma.matn}
                        maxLength={3000}
                        onChange={(e) => setForma({ ...forma, matn: e.target.value })}
                        disabled={saqlanmoqda}
                      />
                      <div className="am-form-row">
                        <label className="am-check">
                          <input
                            type="checkbox"
                            checked={forma.faol}
                            onChange={(e) => setForma({ ...forma, faol: e.target.checked })}
                            disabled={saqlanmoqda}
                          />
                          Saytda va ilovada ko‘rinsin
                        </label>
                        <input
                          className="adm-inp am-order"
                          type="number"
                          title="Tartib — kichigi yuqorida turadi"
                          placeholder="Tartib"
                          value={forma.tartib}
                          onChange={(e) => setForma({ ...forma, tartib: Number(e.target.value) || 0 })}
                          disabled={saqlanmoqda}
                        />
                      </div>
                      <p className="am-hint">
                        Rasm: PNG, JPG yoki WEBP, 5 MB gacha (eni bo‘yidan kattaroq rasm yaxshi ko‘rinadi). Aksiya tugasa —
                        o‘chirmasdan «ko‘rinsin» belgisini olib qo‘yish mumkin.
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
              {!loading && list.length === 0 && (
                <div className="adm-empty">Hali aksiya qo‘shilmagan. «Yangi aksiya» bilan qo‘shing — Aloqa sahifasida chiqadi.</div>
              )}

              <div className="adm-list">
                {list.map((a) => (
                  <div className={'adm-row ak-row' + (a.faol ? '' : ' yashirin') + (forma?.id === a.id ? ' tanlangan' : '')} key={a.id}>
                    {a.rasm
                      ? <img className="ak-thumb" src={mediaUrl(a.rasm)} alt="" loading="lazy" />
                      : <span className="ak-thumb ak-thumb-yoq"><BadgePercent size={20} /></span>}
                    <span className="ab-matn">
                      <b>{a.sarlavha}</b>
                      {a.matn && <small>{a.matn}</small>}
                    </span>
                    {!a.faol && <span className="adm-badge b2">Yashirin</span>}
                    <button
                      className="adm-mini"
                      disabled={busyId === a.id}
                      onClick={() => faolAlmashtir(a)}
                      title={a.faol ? 'Yashirish (saytda ko‘rinmasin)' : 'Ko‘rsatish'}
                    >
                      {a.faol ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      className="adm-mini"
                      onClick={() => formaniOch({ id: a.id, sarlavha: a.sarlavha, matn: a.matn, faol: a.faol, tartib: a.tartib, rasm: a.rasm })}
                      title="Tahrirlash"
                    >
                      <Pencil size={14} />
                    </button>
                    <button className="adm-mini danger" disabled={busyId === a.id} onClick={() => ochir(a)} title="O‘chirish">
                      <Trash2 size={14} />
                    </button>
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
