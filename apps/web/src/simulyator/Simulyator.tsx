import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Camera, ChevronLeft, ChevronRight, TriangleAlert, Power, Home, Volume2, VolumeX } from 'lucide-react';
import { useOrqaga } from '../orqaga';
import { mobilIlova } from '../native';
import { api } from '../api';
import { Dvigatel, type Hud } from './dvigatel';
import { mashinaTop, rulChegara, type Uzatma } from './mashinalar';
import { sozlamaBirlashtir, type ImtihonSozlama } from './imtihon/qoidalar';
import type { Jarima, Natija as NatijaT } from './imtihon/hakam';
import { KAMERALAR, type KameraRejim, type Sifat } from './grafika/sahna';
import { Rul, Pedal, KamarBelgi, FaraBelgi } from './ui/Boshqaruv';
import { Xarita } from './ui/Xarita';
import { Menyu, RANGLAR, MASHQ_ROYXAT, type MenyuTanlov } from './ui/Menyu';
import { Natija } from './ui/Natija';
import './simulyator.css';

const UZATMALAR: Uzatma[] = ['R', 'N', '1', '2'];
const KAMERA_NOMI: Record<KameraRejim, string> = { orqa: 'Orqadan', salon: 'Salondan', old: 'Old kamera', tepa: 'Tepadan' };
const vaqtMatn = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const SAQLASH = 'sim_tanlov';

function boshlangichTanlov(): MenyuTanlov {
  const st: MenyuTanlov = { mashinaId: 'cobalt', rang: RANGLAR[0], rejim: 'imtihon', mashq: 0, sifat: 'avto', ovoz: true };
  try { return { ...st, ...JSON.parse(localStorage.getItem(SAQLASH) || '{}') }; } catch { return st; }
}

export default function Simulyator() {
  const orqaga = useOrqaga('/');
  const [ekran, setEkran] = useState<'menyu' | 'oyin'>('menyu');
  const [tanlov, setTanlovH] = useState<MenyuTanlov>(boshlangichTanlov);
  const [sozlama, setSozlama] = useState<ImtihonSozlama | null>(null);
  const [rasmiy, setRasmiy] = useState(false);
  const [tik, setTik] = useState(() => typeof window !== 'undefined' && window.innerHeight > window.innerWidth);
  const setTanlov = (t: MenyuTanlov) => { setTanlovH(t); try { localStorage.setItem(SAQLASH, JSON.stringify(t)); } catch { /* */ } };

  // Admin sozlamalari (bo'lmasa — standart)
  useEffect(() => {
    let bekor = false;
    api.simSozlama()
      .then((r: any) => {
        if (bekor) return;
        const sz = sozlamaBirlashtir(r?.sozlama);
        setSozlama(sz);
        setRasmiy(sz.rasmiy);
        // Admin o'chirgan avtomobil tanlangan bo'lsa — birinchi faoliga o'tamiz
        setTanlovH((t) => (sz.mashinalar[t.mashinaId] === false ? { ...t, mashinaId: Object.keys(sz.mashinalar).find((k) => sz.mashinalar[k]) || 'cobalt' } : t));
      })
      .catch(() => { if (!bekor) setSozlama(sozlamaBirlashtir()); });
    return () => { bekor = true; };
  }, []);

  // Ilovada: ekran gorizontal, holat paneli yashirin
  useEffect(() => {
    if (!mobilIlova()) return;
    let bekor = false;
    (async () => {
      try { const { ScreenOrientation } = await import('@capacitor/screen-orientation'); if (!bekor) await ScreenOrientation.lock({ orientation: 'landscape' }); } catch { /* */ }
      try { const { StatusBar } = await import('@capacitor/status-bar'); if (!bekor) await StatusBar.hide(); } catch { /* */ }
    })();
    return () => {
      bekor = true;
      import('@capacitor/screen-orientation').then(({ ScreenOrientation }) => ScreenOrientation.unlock()).catch(() => {});
      import('@capacitor/status-bar').then(({ StatusBar }) => StatusBar.show()).catch(() => {});
    };
  }, []);
  useEffect(() => {
    const f = () => setTik(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  // Telefonning "orqaga" tugmasi menyuda — chiqish (o'yinda — Oyin o'zi ushlaydi)
  useEffect(() => {
    if (ekran !== 'menyu') return;
    const ch = (e: Event) => { e.preventDefault(); orqaga(); };
    window.addEventListener('ilova:orqaga', ch);
    return () => window.removeEventListener('ilova:orqaga', ch);
  }, [ekran, orqaga]);

  return (
    <div className="sim">
      {ekran === 'menyu' || !sozlama ? (
        <Menyu t={tanlov} setT={setTanlov} sozlama={sozlama} rasmiy={rasmiy} onChiq={orqaga} onBoshla={() => sozlama && setEkran('oyin')} />
      ) : (
        <Oyin tanlov={tanlov} sozlama={sozlama} onMenyu={() => setEkran('menyu')} onChiq={orqaga} />
      )}
      {tik && mobilIlova() && <div className="sim-burish">Telefonni yotqizing</div>}
    </div>
  );
}

type XabarT = { id: number; matn: string; ball?: number; tur: 'xato' | 'yaxshi' | 'ogoh' };

function Oyin({ tanlov, sozlama, onMenyu, onChiq }: { tanlov: MenyuTanlov; sozlama: ImtihonSozlama; onMenyu: () => void; onChiq: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rulRef = useRef<SVGSVGElement>(null);
  const dvRef = useRef<Dvigatel | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [xabarlar, setXabarlar] = useState<XabarT[]>([]);
  const [natija, setNatija] = useState<NatijaT | null>(null);
  const [pauza, setPauza] = useState(false);
  const [kamera, setKamera] = useState<KameraRejim>('orqa');
  const [ovoz, setOvoz] = useState(tanlov.ovoz);
  const [xato, setXato] = useState('');
  const [, qayta] = useState(0);
  const yangila = () => qayta((x) => x + 1);
  const mashina = mashinaTop(tanlov.mashinaId);
  const chegaraRul = rulChegara(mashina);
  const rejim = tanlov.rejim === 'mashq' ? { tur: 'mashq' as const, qadam: tanlov.mashq } : { tur: 'imtihon' as const };

  const xabar = (matn: string, tur: XabarT['tur'], ball?: number) => {
    const id = Math.random();
    setXabarlar((l) => [...l.slice(-2), { id, matn, ball, tur }]);
    setTimeout(() => setXabarlar((l) => l.filter((x) => x.id !== id)), tur === 'xato' ? 3600 : 2600);
  };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const mobil = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900;
    const sifat: Sifat = tanlov.sifat === 'avto' ? (mobil ? 1 : 2) : tanlov.sifat;
    try {
      const dv = new Dvigatel(cv, { mashina, rang: tanlov.rang, rejim, sozlama, sifat, ovoz: tanlov.ovoz }, {
        onHud: setHud,
        onJarima: (j: Jarima) => { xabar(j.nom + (j.izoh ? ` — ${j.izoh}` : ''), 'xato', j.ball); try { navigator.vibrate?.(140); } catch { /* */ } },
        onXabar: (m, tur) => xabar(m, tur),
        onTugadi: (n) => {
          setTimeout(() => setNatija(n), 900);
          const q = rejim.tur === 'mashq' ? dv.maydon.marshrut[rejim.qadam] : null;
          api.simNatija({
            rejim: rejim.tur, mashq: q?.kod ?? null, mashina: mashina.id, jami: n.jami, otdi: n.otdi, vaqt: Math.round(n.vaqt),
            bajarildi: n.bajarildi.length, jamiQadam: n.jamiQadam, sabab: n.sabab,
            xatolar: n.jarimalar.map((j) => ({ kod: j.kod, nom: j.nom, ball: j.ball, mashq: j.mashq, izoh: j.izoh || null })),
          }).catch(() => { /* internet yo'q — saqlanmaydi */ });
        },
      });
      dvRef.current = dv;
      dv.ovoz.boshla();
      yangila();
    } catch (e) {
      console.error('[simulyator]', e);
      setXato('Bu qurilmada 3D grafika (WebGL) ishlamadi. Brauzer yoki ilovani yangilab ko‘ring.');
    }
    // Rul rasmi har kadrda (silliq)
    let kadr = 0;
    const rulChiz = () => {
      const d = dvRef.current;
      if (d && rulRef.current) rulRef.current.style.transform = `rotate(${d.k.rul}deg)`;
      kadr = requestAnimationFrame(rulChiz);
    };
    kadr = requestAnimationFrame(rulChiz);
    return () => { cancelAnimationFrame(kadr); dvRef.current?.dispose(); dvRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dv = dvRef.current;
  const k = dv?.k, pnl = dv?.pnl;
  const pauzaQoy = (p: boolean) => { dvRef.current?.pauza(p); setPauza(p); };
  const qaytaBoshla = () => { dvRef.current?.qaytaBoshlash(); setNatija(null); setPauza(false); yangila(); };
  const kameraAlmash = () => { const d = dvRef.current; if (!d) return; d.grafika.kameraAlmashtir(); setKamera(d.grafika.kameraRejim); };
  const uzatmaQoy = (u: Uzatma) => { if (k) { k.uzatma = u; yangila(); } };
  const signal = (t: 'chap' | 'ong') => {
    if (!pnl) return;
    if (t === 'chap') { pnl.chapChiroq = !pnl.chapChiroq; pnl.ongChiroq = false; } else { pnl.ongChiroq = !pnl.ongChiroq; pnl.chapChiroq = false; }
    yangila();
  };

  // Telefonning "orqaga" tugmasi: o'yinda — pauza, natijada — menyu
  useEffect(() => {
    const ch = (e: Event) => { e.preventDefault(); if (natija) onMenyu(); else pauzaQoy(!pauza); };
    window.addEventListener('ilova:orqaga', ch);
    return () => window.removeEventListener('ilova:orqaga', ch);
  });

  // Klaviatura (kompyuterda): bosib turilganda gaz/tormoz/rul silliq o'zgaradi
  useEffect(() => {
    const bos = new Set<string>();
    let kadr = 0, oxirgi = performance.now();
    let kRul = false, kGaz = false, kTormoz = false;
    const tsikl = (t: number) => {
      const dt = Math.min(0.05, (t - oxirgi) / 1000);
      oxirgi = t;
      const d = dvRef.current;
      if (d) {
        const kk = d.k;
        const chap = bos.has('ArrowLeft') || bos.has('KeyA'), ong = bos.has('ArrowRight') || bos.has('KeyD');
        if (chap !== ong) { kk.rulUshlangan = true; kk.rul = Math.max(-chegaraRul, Math.min(chegaraRul, kk.rul + (ong ? 1 : -1) * 420 * dt)); }
        else if (kRul) { kk.rulUshlangan = false; kRul = false; }
        if (bos.has('ArrowUp') || bos.has('KeyW')) kk.gaz = Math.min(bos.has('ShiftLeft') || bos.has('ShiftRight') ? 1 : 0.55, kk.gaz + dt * 1.6);
        else if (kGaz) { kk.gaz = Math.max(0, kk.gaz - dt * 4); if (kk.gaz === 0) kGaz = false; }
        if (bos.has('ArrowDown') || bos.has('KeyS')) kk.tormoz = Math.min(1, kk.tormoz + dt * 3);
        else if (kTormoz) { kk.tormoz = Math.max(0, kk.tormoz - dt * 6); if (kk.tormoz === 0) kTormoz = false; }
      }
      kadr = requestAnimationFrame(tsikl);
    };
    const harakat = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'];
    const keyDown = (e: KeyboardEvent) => {
      const d = dvRef.current;
      if (!d) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (harakat.includes(e.code)) {
        bos.add(e.code);
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) kRul = true;
        if (['ArrowUp', 'KeyW'].includes(e.code)) kGaz = true;
        if (['ArrowDown', 'KeyS'].includes(e.code)) kTormoz = true;
        return;
      }
      if (e.repeat) return;
      const kk = d.k, p = d.pnl;
      switch (e.code) {
        case 'Space': kk.qolTormoz = !kk.qolTormoz; break;
        case 'KeyR': kk.uzatma = 'R'; break;
        case 'KeyN': case 'Digit0': kk.uzatma = 'N'; break;
        case 'Digit1': kk.uzatma = '1'; break;
        case 'Digit2': kk.uzatma = '2'; break;
        case 'KeyB': p.kamar = !p.kamar; break;
        case 'KeyQ': p.chapChiroq = !p.chapChiroq; p.ongChiroq = false; break;
        case 'KeyE': p.ongChiroq = !p.ongChiroq; p.chapChiroq = false; break;
        case 'KeyH': p.avariyaChiroq = !p.avariyaChiroq; break;
        case 'KeyL': p.faralar = !p.faralar; break;
        case 'KeyC': d.grafika.kameraAlmashtir(); setKamera(d.grafika.kameraRejim); break;
        case 'KeyP': case 'Escape': setPauza((x) => { d.pauza(!x); return !x; }); break;
        case 'Enter': if (!d.mashina.ishlayapti) d.yurgiz(); break;
        default: return;
      }
      yangila();
    };
    const keyUp = (e: KeyboardEvent) => { bos.delete(e.code); };
    const blur = () => bos.clear();
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    kadr = requestAnimationFrame(tsikl);
    return () => { cancelAnimationFrame(kadr); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const h = hud;
  const ballFoiz = h ? Math.min(1, h.jami / Math.max(1, h.chegara)) : 0;
  const ortiq = !!h && h.tezlik > h.tezlikChegara + 0.5;
  const mashqNomi = rejim.tur === 'mashq' ? MASHQ_ROYXAT.find((m) => m.indeks === rejim.qadam)?.nom : null;
  return (
    <div className="sim-oyin">
      <canvas ref={canvasRef} className="sim-canvas" />
      {xato && <div className="sim-xato">{xato}<button onClick={onChiq}>Chiqish</button></div>}

      {/* Tepa panel */}
      <div className="sim-tepa">
        <button className="sim-tugma-yumaloq" onClick={() => pauzaQoy(true)} aria-label="Pauza"><Pause size={20} /></button>
        <div className="sim-statlar">
          <div className={'sim-stat' + (ballFoiz >= 0.5 ? ' xavf' : '')}><b>{h?.jami ?? 0}<small>/{h?.chegara ?? sozlama.otishChegarasi}</small></b><span>Jarima ball</span></div>
          <div className="sim-stat"><b>{vaqtMatn(h?.vaqt ?? 0)}</b><span>Vaqt</span></div>
          <div className="sim-stat"><b>{h?.bajarildi ?? 0}<small>/{h?.jamiQadam ?? 0}</small></b><span>Marshrut</span></div>
          <div className={'sim-stat' + ((h?.xatolar ?? 0) > 0 ? ' ogoh' : '')}><b>{h?.xatolar ?? 0}</b><span>Xatolar</span></div>
        </div>
        <Xarita maydon={dv?.maydon ?? null} holat={h ? { x: h.x, y: h.y, th: h.th, oldinda: h.oldinda } : null} />
      </div>
      <div className="sim-banner">
        <div className="sim-banner-mashq">{mashqNomi || h?.qadam || ''}</div>
        {h?.korsatma && <div className="sim-banner-korsatma">{h.korsatma}</div>}
      </div>

      {/* Xabarlar */}
      <div className="sim-xabarlar">
        {xabarlar.map((x) => (
          <div key={x.id} className={'sim-xabar ' + x.tur}>{x.ball ? <b>+{x.ball}</b> : null}{x.matn}</div>
        ))}
      </div>

      {/* Chap tomon: tezlik, kamar, qo'l tormozi, uzatma */}
      <div className="sim-chap">
        <div className={'sim-spidometr' + (ortiq ? ' oshdi' : '')}>
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" className="iz" />
            <circle cx="60" cy="60" r="52" className="tola" style={{ strokeDasharray: `${Math.min(1, (h?.tezlik ?? 0) / 60) * 245} 400` }} />
          </svg>
          <b>{Math.round(h?.tezlik ?? 0)}</b>
          <span>km/soat</span>
          <i className="sim-chegara" title="Tezlik chegarasi">{h?.tezlikChegara ?? 20}</i>
          <div className="sim-ayl"><div style={{ width: `${Math.min(100, ((h?.ayl ?? 0) / 6200) * 100)}%` }} /></div>
        </div>
        <div className="sim-qatorlar">
          <button className={'sim-tugma kamar' + (pnl?.kamar ? ' yoniq' : ' ogoh')} onClick={() => { if (pnl) { pnl.kamar = !pnl.kamar; yangila(); } }}>
            <KamarBelgi /> <span>{pnl?.kamar ? 'Kamar' : 'Kamar!'}</span>
          </button>
          <button className={'sim-tugma qol' + (k?.qolTormoz ? ' tortilgan' : '')} onClick={() => { if (k) { k.qolTormoz = !k.qolTormoz; yangila(); } }}>
            <b>(P)</b> <span>Qo‘l tormozi</span>
          </button>
        </div>
        <div className="sim-uzatma" role="radiogroup" aria-label="Uzatma">
          {UZATMALAR.map((u) => (
            <button key={u} role="radio" aria-checked={k?.uzatma === u} className={k?.uzatma === u ? 'tanlangan' : ''} onClick={() => uzatmaQoy(u)}>{u}</button>
          ))}
        </div>
      </div>
      <div className="sim-pedallar">
        <Pedal nom="Tormoz" sinf="tormoz" onBos={(v) => { if (k) k.tormoz = v; }} />
        <Pedal nom="Gaz" sinf="gaz" onBos={(v) => { if (k) k.gaz = v; }} />
      </div>

      {/* O'ng tomon: kamera, ko'rsatkichlar, fara, rul */}
      <div className="sim-ong">
        <button className="sim-tugma" onClick={kameraAlmash}><Camera size={18} /> <span>{KAMERA_NOMI[kamera]}</span></button>
        <div className="sim-signal-qator">
          <button className={'sim-tugma signal' + (pnl?.chapChiroq ? ' yoniq' : '') + (pnl?.chapChiroq && h?.miltilla ? ' milt' : '')} onClick={() => signal('chap')} aria-label="Chap ko‘rsatkich"><ChevronLeft size={26} /></button>
          <button className={'sim-tugma avariya' + (pnl?.avariyaChiroq ? ' yoniq' : '') + (pnl?.avariyaChiroq && h?.miltilla ? ' milt' : '')} onClick={() => { if (pnl) { pnl.avariyaChiroq = !pnl.avariyaChiroq; yangila(); } }} aria-label="Avariya chirog‘i"><TriangleAlert size={20} /></button>
          <button className={'sim-tugma signal' + (pnl?.ongChiroq ? ' yoniq' : '') + (pnl?.ongChiroq && h?.miltilla ? ' milt' : '')} onClick={() => signal('ong')} aria-label="O‘ng ko‘rsatkich"><ChevronRight size={26} /></button>
        </div>
        <button className={'sim-tugma fara' + (pnl?.faralar ? ' yoniq' : '')} onClick={() => { if (pnl) { pnl.faralar = !pnl.faralar; yangila(); } }} aria-label="Faralar"><FaraBelgi /> <span>Fara</span></button>
      </div>
      {k && <Rul k={k} chegara={chegaraRul} rulRef={rulRef} />}

      {h && !h.ishlayapti && !natija && (
        <button className="sim-yurgiz" onClick={() => { dvRef.current?.yurgiz(); yangila(); }}><Power size={22} /> O‘t oldirish</button>
      )}

      {/* Pauza */}
      {pauza && !natija && (
        <div className="sim-pauza-fon">
          <div className="sim-pauza">
            <h2>Pauza</h2>
            <button className="asosiy" onClick={() => pauzaQoy(false)}><Play size={18} /> Davom etish</button>
            <button onClick={qaytaBoshla}><RotateCcw size={18} /> Qaytadan boshlash</button>
            <button onClick={kameraAlmash}><Camera size={18} /> Kamera: {KAMERA_NOMI[kamera]}</button>
            <button onClick={() => { const y = !ovoz; setOvoz(y); dvRef.current?.ovoz.ovozQoy(y); }}>{ovoz ? <Volume2 size={18} /> : <VolumeX size={18} />} Ovoz: {ovoz ? 'yoqilgan' : 'o‘chirilgan'}</button>
            <button onClick={onMenyu}><Home size={18} /> Menyuga qaytish</button>
            <div className="sim-pauza-kameralar">{KAMERALAR.map((c) => <span key={c} className={c === kamera ? 'faol' : ''}>{KAMERA_NOMI[c]}</span>)}</div>
          </div>
        </div>
      )}

      {natija && <Natija n={natija} chegara={sozlama.otishChegarasi} onQayta={qaytaBoshla} onMenyu={onMenyu} onChiq={onChiq} />}
    </div>
  );
}
