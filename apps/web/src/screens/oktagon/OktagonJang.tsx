import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Swords, Play, Frown, Meh, Trophy, House } from 'lucide-react';
import { oktagon, mediaUrl, type OktagonJang as Jang, type OktagonSavol } from '../../api';
import PastkiOyna from '../../components/PastkiOyna';
import { MEDAL, NATIJA_MATN, harf, ballMatn, tilda } from './umumiy';
import '../../ilova-ekran.css';
import '../../oktagon.css';

/**
 * Oktagon jangi: "vs" sanog'i → 10 ta savol → natija.
 * Raqibning holati (nechta javob bergani, jang tugadimi) soniyada bir so'raladi.
 * To'g'ri javobni server aytadi — savollar to'g'ri javobsiz keladi.
 */
const VS_SONIYA = 4;
const YANGI_JANG_SONIYA = 4;

export default function OktagonJangSahifa() {
  const { id } = useParams();
  // key — "Qasos olish" yangi jangga o'tganda holat toza boshlansin
  return <OktagonJang key={id} id={Number(id)} />;
}

type Tanlov = { v: number; togri?: boolean; togriVariant?: number | null };

function OktagonJang({ id }: { id: number }) {
  const nav = useNavigate();
  const [jang, setJang] = useState<Jang | null>(null);
  const [savollar, setSavollar] = useState<OktagonSavol[]>([]);
  const [bosqich, setBosqich] = useState<'yuklanmoqda' | 'vs' | 'jang' | 'natija'>('yuklanmoqda');
  const [vs, setVs] = useState(VS_SONIYA);
  const [idx, setIdx] = useState(0);
  const [tanlov, setTanlov] = useState<Tanlov | null>(null);
  const [chiqishOyna, setChiqishOyna] = useState(false);
  const [korish, setKorish] = useState<{ n: number; men: boolean } | null>(null);
  const [yangiJang, setYangiJang] = useState(YANGI_JANG_SONIYA);
  const [xato, setXato] = useState('');

  // Birinchi yuklash — savollar bilan. Jang davom etayotgan bo'lsa, to'xtagan joydan
  useEffect(() => {
    oktagon
      .jang(id, true)
      .then((j) => {
        setJang(j);
        setSavollar(j.savollar || []);
        if (j.holat === 'tugadi') return setBosqich('natija');
        setIdx(j.men.javoblar.length);
        setBosqich(j.men.javoblar.length ? 'jang' : 'vs');
      })
      .catch((e) => setXato(e?.message || 'Jang topilmadi'));
  }, [id]);

  // "vs" sanog'i
  useEffect(() => {
    if (bosqich !== 'vs') return;
    if (vs <= 0) {
      setBosqich('jang');
      return;
    }
    const t = setTimeout(() => setVs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [bosqich, vs]);

  // Jang holati soniyada bir: raqibning javoblari soni, jang tugadimi
  useEffect(() => {
    if (bosqich !== 'vs' && bosqich !== 'jang') return;
    let faol = true;
    let t: number | undefined;
    const sora = () =>
      oktagon
        .jang(id)
        .then(async (j) => {
          if (!faol) return;
          if (j.holat === 'tugadi') {
            const toliq = await oktagon.jang(id, true); // endi to'g'ri javoblar bilan
            if (!faol) return;
            setJang(toliq);
            setSavollar(toliq.savollar || []);
            setBosqich('natija');
            return;
          }
          // O'zimning javoblarim hisobini lokal holatdan olamiz (server bir soniya kechikishi mumkin)
          setJang((eski) => (eski && eski.men.javoblar.length > j.men.javoblar.length ? { ...j, men: eski.men } : j));
          t = window.setTimeout(sora, 1000);
        })
        .catch(() => {
          if (faol) t = window.setTimeout(sora, 2000);
        });
    t = window.setTimeout(sora, 1000);
    return () => {
      faol = false;
      clearTimeout(t);
    };
  }, [bosqich, id]);

  // Telefonning "orqaga" tugmasi jang paytida — avval so'raymiz (chiqish −2 ball)
  const jangda = bosqich === 'vs' || bosqich === 'jang';
  const oynaOchiq = useRef(false);
  oynaOchiq.current = chiqishOyna || !!korish;
  useEffect(() => {
    if (!jangda) return;
    const orqaga = (e: Event) => {
      if (oynaOchiq.current) return; // ochiq oyna o'zi yopiladi
      e.preventDefault();
      setChiqishOyna(true);
    };
    window.addEventListener('ilova:orqaga', orqaga);
    return () => window.removeEventListener('ilova:orqaga', orqaga);
  }, [jangda]);

  // Natijadagi "Yangi jang" — 4 soniyadan keyin ochiladi
  useEffect(() => {
    if (bosqich !== 'natija' || yangiJang <= 0) return;
    const t = setTimeout(() => setYangiJang((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [bosqich, yangiJang]);

  const javobBer = async (v: number) => {
    if (tanlov || !jang) return;
    const i = idx;
    setTanlov({ v });
    try {
      const r = await oktagon.javob(id, i, v);
      if (r.tugadi) return; // jang vaqti tugagan — holat so'rovi natijaga o'tkazadi
      setTanlov({ v, togri: !!r.togri, togriVariant: r.togriVariant ?? null });
      setJang((j) =>
        j && { ...j, men: { ...j.men, javoblar: [...j.men.javoblar, { i, togri: !!r.togri, v }], togri: j.men.togri + (r.togri ? 1 : 0) } }
      );
      window.setTimeout(() => {
        setTanlov(null);
        setIdx(i + 1);
      }, 900);
    } catch (e: any) {
      setTanlov(null);
      // Tartib mos emas (masalan, ikkinchi qurilmada javob berilgan) — serverdagi joydan davom
      if (e?.status === 409) oktagon.jang(id).then((j) => setIdx(j.men.javoblar.length)).catch(() => {});
      else setXato('Aloqa yo‘q — javobni qayta bosing');
    }
  };

  const chiqish = async () => {
    try {
      await oktagon.chiqish(id);
    } catch { /* aloqa yo'q — jang vaqti tugagach baribir yakunlanadi */ }
    nav('/oktagon', { replace: true });
  };

  const qasos = async () => {
    try {
      const r = await oktagon.qasos(id);
      nav(`/oktagon/jang/${r.jangId}`, { replace: true });
    } catch (e: any) {
      setXato(e?.message || 'Qayta urinib ko‘ring');
    }
  };

  if (!jang) {
    return (
      <div className="ie ok-ekran">
        <div className="ok-top">
          <button className="ok-ic" onClick={() => nav('/oktagon')} aria-label="Orqaga"><ChevronLeft size={22} /></button>
        </div>
        <div className="ok-kut">{xato || 'Yuklanmoqda…'}</div>
      </div>
    );
  }

  const n = jang.savolSoni;
  const menSoni = jang.men.javoblar.length;
  const raqibSoni = jang.raqib.javobSoni;

  // ---------- "vs" ----------
  if (bosqich === 'vs') {
    return (
      <div className="ok-vs ok-ekran">
        <div className="ok-vs-row">
          <div className="ok-vs-pl">
            <div className="ok-vs-av g">{harf(jang.men.ism)}</div>
            <span>{jang.men.ism}</span>
          </div>
          <div className="ok-vs-txt">vs</div>
          <div className="ok-vs-pl">
            <div className="ok-vs-av r">{harf(jang.raqib.ism)}</div>
            <span>{jang.raqib.ism}</span>
            {jang.raqib.bot && <span className="ok-bot">BOT</span>}
          </div>
        </div>
        <div className="ok-vs-son">{Math.max(vs, 1)}</div>
        <div className="ok-foot">
          <button className="ok-btn yashil" onClick={() => setBosqich('jang')}>
            <Play size={22} /> Jang! {Math.max(vs, 1)}…
          </button>
        </div>
        {chiqishOyna && <ChiqishOyna onChiq={chiqish} onClose={() => setChiqishOyna(false)} />}
      </div>
    );
  }

  // ---------- Natija ----------
  if (bosqich === 'natija' && jang.natija) {
    const holat = jang.natija.holat;
    const Yuz = holat === 'galaba' ? Trophy : holat === 'durang' ? Meh : Frown;
    const katak = (javoblar: { i: number; togri: boolean }[], men: boolean) =>
      Array.from({ length: n }, (_, k) => {
        const j = javoblar.find((x) => x.i === k);
        return (
          <button key={k} className={'ok-cell ' + (!j ? 'b' : j.togri ? 't' : 'x')} onClick={() => setKorish({ n: k, men })}>
            {k + 1}
          </button>
        );
      });
    const kor = korish && savollar[korish.n];
    const menTanlagan = korish?.men ? jang.men.javoblar.find((x) => x.i === korish.n)?.v : undefined;

    return (
      <div className="ie ok-ekran ok-res">
        <div className={'ok-res-top ' + holat}>
          <button className="ok-ic" onClick={() => nav('/oktagon')} aria-label="Orqaga"><ChevronLeft size={22} /></button>
          <div className="ok-face"><Yuz size={38} /></div>
          <div className="ok-res-title">{NATIJA_MATN[holat]}</div>
          <div className="ok-res-row">
            <div className="ok-res-pl">
              <span className="ok-ava g">{harf(jang.men.ism)}</span>
              <span>{jang.men.ism}</span>
            </div>
            <div className="ok-res-hisob">
              <span className="m">{jang.men.togri}</span>
              <span className="n">:</span>
              <span className="q">{jang.raqib.togri ?? 0}</span>
            </div>
            <div className="ok-res-pl">
              <span className="ok-ava r">{harf(jang.raqib.ism)}</span>
              <span>{jang.raqib.ism}{jang.raqib.bot ? ' (bot)' : ''}</span>
            </div>
          </div>
          <div className={'ok-pill ' + (jang.natija.ozgarish < 0 ? 'manfiy' : 'musbat')}>{ballMatn(jang.natija.ozgarish)}</div>
        </div>

        <div className="ok-res-h">Natijalar</div>
        <div className="ok-res-s">To‘g‘ri javobni ko‘rish uchun ustiga bosing</div>
        <div className="ok-grids">
          <div className="ok-cells">{katak(jang.men.javoblar, true)}</div>
          <i />
          <div className="ok-cells">{katak(jang.raqib.javoblar || [], false)}</div>
        </div>
        {xato && <div className="ok-izoh" style={{ marginTop: 16 }}>{xato}</div>}

        <div className="ok-res-foot">
          {jang.raqib.bot && (
            <button className="ok-btn qizil" onClick={qasos}><Swords size={22} /> Qasos olish</button>
          )}
          <div className="qator">
            <button className="ok-btn kulrang" onClick={() => nav('/')} aria-label="Bosh sahifa"><House size={24} /></button>
            <button
              className={'ok-btn ' + (yangiJang > 0 ? 'kut' : 'yashil')}
              disabled={yangiJang > 0}
              onClick={() => nav('/oktagon', { replace: true, state: { qidir: true } })}
            >
              <Swords size={20} /> Yangi jang{yangiJang > 0 ? ` (${yangiJang})` : ''}
            </button>
          </div>
        </div>

        {kor && (
          <PastkiOyna title={`${korish!.n + 1}-savol`} onClose={() => setKorish(null)}>
            <div className="ok-ko-q">{tilda(kor)}</div>
            {kor.imageUrl && <div className="ok-ko-img"><img src={mediaUrl(kor.imageUrl)} alt="" /></div>}
            <div className="ok-opts" style={{ padding: 0 }}>
              {kor.options.map((o, k) => (
                <div key={o.id} className={'ok-opt' + (o.isCorrect ? ' ok' : o.id === menTanlagan ? ' no' : '')}>
                  <span className="ok-f">F{k + 1}</span>
                  <span>{tilda(o)}</span>
                </div>
              ))}
            </div>
          </PastkiOyna>
        )}
      </div>
    );
  }

  // ---------- Jang ----------
  const q = savollar[idx];
  return (
    <div className="ie ok-ekran">
      <div className="ok-bhead">
        <div className="ok-bplayers">
          <div className="ok-pl">
            <span className="ok-ava g">{harf(jang.men.ism)}</span>
            <div>
              <div className="ok-pl-ism">{jang.men.ism}</div>
              <div className="ok-pl-dar">{MEDAL[jang.men.daraja]} {jang.men.daraja}</div>
            </div>
          </div>
          <div className="ok-hisob">
            <span>{menSoni}</span>
            <Swords size={24} />
            <span>{raqibSoni}</span>
          </div>
          <div className="ok-pl ong">
            <span className="ok-ava r">{harf(jang.raqib.ism)}</span>
            <div>
              <div className="ok-pl-ism">{jang.raqib.ism}</div>
              <div className="ok-pl-dar">{jang.raqib.bot ? 'BOT' : jang.raqib.daraja} {MEDAL[jang.raqib.daraja]}</div>
            </div>
          </div>
        </div>
        <div className="ok-bars">
          <div className="ok-bar chap"><i style={{ width: `${(menSoni / n) * 100}%` }} /></div>
          <div className="ok-bar ong"><i style={{ width: `${(raqibSoni / n) * 100}%` }} /></div>
        </div>
      </div>

      {q && idx < n ? (
        <>
          <div className="ok-q">{tilda(q)}</div>
          {q.imageUrl && <div className="ok-img"><img src={mediaUrl(q.imageUrl)} alt="" /></div>}
          <div className="ok-opts">
            {q.options.map((o, k) => {
              let cls = '';
              if (tanlov?.togri !== undefined) {
                if (o.id === tanlov.togriVariant) cls = ' ok';
                else if (o.id === tanlov.v && !tanlov.togri) cls = ' no';
              }
              return (
                <button key={o.id} className={'ok-opt' + cls} disabled={!!tanlov} onClick={() => javobBer(o.id)}>
                  <span className="ok-f">F{k + 1}</span>
                  <span>{tilda(o)}</span>
                </button>
              );
            })}
          </div>
          {xato && <div className="ok-izoh">{xato}</div>}
        </>
      ) : (
        <div className="ok-kut">
          <b>Barakalla, siz tugatdingiz!</b>
          Raqib javob bermoqda… {raqibSoni}/{n}
        </div>
      )}

      {chiqishOyna && <ChiqishOyna onChiq={chiqish} onClose={() => setChiqishOyna(false)} />}
    </div>
  );
}

function ChiqishOyna({ onChiq, onClose }: { onChiq: () => void; onClose: () => void }) {
  return (
    <PastkiOyna title="Jangdan chiqasizmi?" subtitle="O‘yinni tugatmasdan chiqsangiz −2 ball" onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <button className="ok-btn yashil" onClick={onClose}>Davom etish</button>
        <button className="ok-btn qizil" onClick={onChiq}>Chiqish</button>
      </div>
    </PastkiOyna>
  );
}
