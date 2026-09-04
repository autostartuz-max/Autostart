import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, Play, Video, Clock } from 'lucide-react';
import { api, lessonVideoUrl, canManageQuestions, hasAdmin, type Lesson } from '../api';
import { TOIFALAR, TOIFA_IZOH, hajm, sana } from '../lessons';
import AppSidebar from '../components/AppSidebar';
import '../dashboard.css';

/** Bo'sh qiymat — "Hammasi", ya'ni barcha toifadagi darslar bir sahifada. */
const HAMMASI = '';

/**
 * Amaliy mashg'ulotlar — toifa (A, B, C, E...) bo'yicha video darsliklar.
 * Boshida hamma dars ko'rinadi — toifalarga bo'lingan holda; chip esa filtr.
 * Foydalanuvchi faqat ko'radi; joylash /amaliy/boshqaruv da (admin).
 */
export default function Lessons() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Lesson[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [toifa, setToifa] = useState<string>(HAMMASI);
  const [ochilgan, setOchilgan] = useState<number | null>(null); // qaysi video ijro etilyapti
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const admin = canManageQuestions() || hasAdmin();

  useEffect(() => {
    // Hamma darsni bir marta olamiz va toifani brauzerda filtrlaymiz —
    // har chip bosilganda serverga qayta bormaymiz.
    api.lessons()
      .then((r: any) => {
        setList(r?.list || []);
        setCounts(r?.counts || {});
      })
      .catch((e: any) => setErr(e?.message || 'Darslarni yuklab bo‘lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const korinadigan = useMemo(
    () => (toifa === HAMMASI ? list : list.filter((l) => l.category === toifa)),
    [list, toifa],
  );

  // "Hammasi" da darslar toifalarga bo'lib chiqadi: [toifa, darslar].
  // Tartib TOIFALAR bo'yicha, ro'yxatda yo'q toifalar oxirida.
  const guruhlar = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of list) {
      const k = l.category || 'Boshqa';
      const bor = map.get(k);
      if (bor) bor.push(l);
      else map.set(k, [l]);
    }
    const tanish = TOIFALAR.filter((t) => map.has(t)) as string[];
    const notanish = [...map.keys()].filter((k) => !tanish.includes(k));
    return [...tanish, ...notanish].map((t) => [t, map.get(t)!] as const);
  }, [list]);

  // Bo'sh toifalar ham ko'rsatiladi (0 bilan) — talaba o'z toifasini topa olsin
  const chiplar = TOIFALAR.filter((t) => counts[t] || t === toifa);

  const karta = (l: Lesson) => (
    <article className="am-card" key={l.id}>
      {ochilgan === l.id ? (
        <video
          className="am-video"
          src={lessonVideoUrl(l.id)}
          controls
          autoPlay
          playsInline
          preload="metadata"
        />
      ) : (
        <button className="am-poster" onClick={() => setOchilgan(l.id)} aria-label={l.title + ' — ko‘rish'}>
          {/* preload="metadata" — birinchi kadr uchun butun fayl yuklanmaydi */}
          <video className="am-poster-v" src={lessonVideoUrl(l.id) + '#t=1'} preload="metadata" muted />
          <span className="am-play"><Play size={26} fill="currentColor" /></span>
          <span className="am-badge">{l.category}</span>
        </button>
      )}
      <div className="am-body">
        <h3 className="am-title">{l.title}</h3>
        {l.description && <p className="am-desc">{l.description}</p>}
        <div className="am-meta">
          <span><Clock size={13} /> {sana(l.createdAt)}</span>
          {l.sizeBytes > 0 && <span>{hajm(l.sizeBytes)}</span>}
        </div>
      </div>
    </article>
  );

  return (
    <div className="db">
      <AppSidebar active="/amaliy" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={() => nav('/')}><ChevronLeft size={18} /> Bosh sahifa</button>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          <div className="adm-head">
            <div className="adm-head-l">
              <span className="am-ic"><Video size={20} /></span>
              <h1 className="adm-title">Amaliy mashg‘ulotlar</h1>
            </div>
            {admin && (
              <div className="adm-head-btns">
                <button className="adm-btn sec" onClick={() => nav('/amaliy/boshqaruv')}>
                  Video joylash
                </button>
              </div>
            )}
          </div>

          <p className="xt-lead">
            Barcha toifalar uchun tayyorlangan <b>video darsliklar</b> — toifalarga bo‘lingan holda.
            Bitta toifani ko‘rish uchun uni tanlang.
          </p>

          <div className="am-tabs">
            <button
              className={'am-tab' + (toifa === HAMMASI ? ' on' : '')}
              onClick={() => { setToifa(HAMMASI); setOchilgan(null); }}
            >
              <b>Hammasi</b>
              <span>Barcha toifalar</span>
              <i>{list.length}</i>
            </button>
            {chiplar.map((t) => (
              <button
                key={t}
                className={'am-tab' + (toifa === t ? ' on' : '')}
                onClick={() => { setToifa(t); setOchilgan(null); }}
              >
                <b>{t}</b>
                <span>{TOIFA_IZOH[t] || t}</span>
                <i>{counts[t] || 0}</i>
              </button>
            ))}
          </div>

          {loading && <div className="adm-empty">Yuklanmoqda…</div>}

          {!loading && list.length === 0 && (
            <div className="adm-empty">
              Hozircha video dars joylanmagan.
              {admin && <> Birinchisini <b onClick={() => nav('/amaliy/boshqaruv')} className="am-link">shu yerda</b> qo‘shing.</>}
            </div>
          )}

          {!loading && list.length > 0 && korinadigan.length === 0 && (
            <div className="adm-empty">«{toifa}» toifasi uchun hali dars yo‘q. «Hammasi»ni tanlang.</div>
          )}

          {toifa === HAMMASI ? (
            guruhlar.map(([t, darslar]) => (
              <section className="am-group" key={t}>
                <h2 className="am-group-t">
                  <b>{t}</b> {TOIFA_IZOH[t] || t}
                  <i>{darslar.length}</i>
                </h2>
                <div className="am-grid">{darslar.map(karta)}</div>
              </section>
            ))
          ) : (
            <div className="am-grid">{korinadigan.map(karta)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
