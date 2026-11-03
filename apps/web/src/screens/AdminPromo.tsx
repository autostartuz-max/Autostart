import { useEffect, useRef, useState } from 'react';
import { Menu, TicketPercent, Check, Phone, Mail, Clock, Search, UserRound } from 'lucide-react';
import {
  adminApi, hasAdmin, canManageQuestions, clearAdmin,
  type PromoRow, type PromoHolat, type PromoShaxs,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

/**
 * Promokodlar (sayt admin paneli): ilovada do'stining promokodi bilan ro'yxatdan
 * o'tganlar. Do'st Autostart maktabiga yozilib chegirma olgach, admin tasdiqlaydi —
 * kod egasiga bonus ball beriladi (server bir marta beradi).
 */

const HOLAT: Record<PromoHolat, string> = { yangi: 'Yangi', tasdiqlangan: 'Tasdiqlangan' };
// Xabarlar sahifasidagi ranglar: yangi — qizil, tasdiqlangan — yashil
const HOLAT_SINF: Record<PromoHolat, string> = { yangi: 'new', tasdiqlangan: 'done' };
const FILTRLAR: [string, string][] = [['', 'Hammasi'], ['yangi', 'Yangi'], ['tasdiqlangan', 'Tasdiqlangan']];

const sanaVaqt = (s: string | null) => {
  if (!s) return '';
  try { return new Date(s).toLocaleString('uz-UZ'); } catch { return ''; }
};
const ism = (u: PromoShaxs | null) => u?.firstName || 'O‘chirilgan akkaunt';
const telLink = (p: string) => 'tel:' + p.replace(/[^\d+]/g, '');

export default function AdminPromo() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [list, setList] = useState<PromoRow[]>([]);
  const [q, setQ] = useState('');
  const [filtr, setFiltr] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  // Tez yozilganda eski javob yangisining ustiga tushmasin
  const sorov = useRef(0);

  const load = (qidiruv = q) => {
    const n = ++sorov.current;
    setLoading(true);
    setErr('');
    adminApi
      .promolar(qidiruv.trim())
      .then((r) => { if (n === sorov.current) setList(r.list || []); })
      .catch((e: any) => {
        if (n !== sorov.current) return;
        if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
        else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
        else setErr(e?.message || 'Promokodlarni yuklab bo‘lmadi');
      })
      .finally(() => { if (n === sorov.current) setLoading(false); });
  };

  // Qidiruv yozilayotganda har harfda emas — biroz to'xtagach so'raladi
  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(() => load(q), q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, q]);

  const tasdiqla = async (p: PromoRow) => {
    const savol =
      `${ism(p.dost)} Autostart maktabiga yozildi va chegirma oldimi?\n\n` +
      `Tasdiqlansa, promokod egasi (${ism(p.egasi)}) bonus ball oladi. Buni qaytarib bo‘lmaydi.`;
    if (!window.confirm(savol)) return;
    setBusyId(p.id);
    setErr('');
    try {
      await adminApi.promoTasdiqla(p.id);
      const endi = new Date().toISOString();
      setList((l) => l.map((x) => (x.id === p.id ? { ...x, holat: 'tasdiqlangan', tasdiqlandi: endi } : x)));
    } catch (e: any) {
      setErr(e?.message || 'Tasdiqlab bo‘lmadi');
      // 409 — boshqa admin allaqachon tasdiqlagan: ro'yxatni yangilaymiz
      if (e?.status === 409) load();
    } finally {
      setBusyId(null);
    }
  };

  const yangi = list.filter((p) => p.holat === 'yangi').length;
  const korinadi = filtr ? list.filter((p) => p.holat === filtr) : list;

  return (
    <div className="db">
      <AppSidebar active="/promokodlar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)} aria-label="Menyu"><Menu size={22} /></button>
          <div className="db-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Qidirish"
              placeholder="Ism, telefon yoki promokod bo‘yicha qidirish…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <span className="xb-ic"><TicketPercent size={20} /></span>
                  <h1 className="adm-title">
                    Promokodlar ({list.length}){yangi > 0 && <span className="xb-yangi">{yangi} yangi</span>}
                  </h1>
                </div>
                <div className="ud-seg">
                  {FILTRLAR.map(([v, t]) => (
                    <button key={v || 'all'} type="button"
                      className={'ud-seg-b' + (filtr === v ? ' on' : '')}
                      onClick={() => setFiltr(v)}>{t}</button>
                  ))}
                </div>
              </div>

              <p className="xt-lead">
                Ilovada do‘stining promokodi bilan ro‘yxatdan o‘tganlar. Do‘st Autostart maktabiga yozilib
                chegirma olgach, <b>«Maktabga yozildi — tasdiqlash»</b> tugmasini bosing — promokod egasiga
                bonus ball beriladi.
              </p>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && !err && korinadi.length === 0 && (
                <div className="adm-empty">
                  {q.trim() ? 'Hech narsa topilmadi.' : filtr ? 'Bu holatda taklif yo‘q.' : 'Hali hech kim promokod bilan ro‘yxatdan o‘tmagan.'}
                </div>
              )}

              <div className="xt-list">
                {korinadi.map((p) => (
                  <div className={'xt-card xb-card ' + HOLAT_SINF[p.holat]} key={p.id}>
                    <div className="xb-head">
                      <div className="xb-kim">
                        <b>{ism(p.dost)}</b>
                        {p.dost?.phone && (
                          <a className="xb-tel" href={telLink(p.dost.phone)}>
                            <Phone size={13} /> {p.dost.phone}
                          </a>
                        )}
                        {p.dost?.email && (
                          <a className="xb-tel" href={'mailto:' + p.dost.email}>
                            <Mail size={13} /> {p.dost.email}
                          </a>
                        )}
                      </div>
                      <span className={'adm-badge xb-b-' + HOLAT_SINF[p.holat]}>{HOLAT[p.holat]}</span>
                    </div>

                    <div className="xb-meta">
                      Promokod: <b data-notr>{p.kod}</b>
                      {' · '}<UserRound size={13} /> egasi: <b>{ism(p.egasi)}</b>
                      {p.egasi?.phone && <> ({p.egasi.phone})</>}
                    </div>
                    <div className="xb-meta">
                      <Clock size={13} /> Ro‘yxatdan o‘tdi: {sanaVaqt(p.yaratildi)}
                      {p.tasdiqlandi && <> · Tasdiqlandi: {sanaVaqt(p.tasdiqlandi)}</>}
                    </div>

                    {p.holat === 'yangi' && (
                      <div className="xb-btns">
                        <button className="adm-mini" disabled={busyId === p.id} onClick={() => tasdiqla(p)}>
                          <Check size={14} /> {busyId === p.id ? 'Tasdiqlanmoqda…' : 'Maktabga yozildi — tasdiqlash'}
                        </button>
                      </div>
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
