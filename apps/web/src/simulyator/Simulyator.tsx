import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrqaga } from '../orqaga';
import { mobilIlova } from '../native';
import { Dvigatel, type Boshqaruv, type HudMalumot } from './sahna';
import type { Jarima, Natija } from './imtihon';
import { MASHINA, YIQILISH_BALLI, type Uzatma } from './sozlamalar';
import type { Maydon } from './yol';
import './simulyator.css';

const UZATMALAR: Uzatma[] = ['R', 'N', '1', '2'];

const vaqtMatn = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Ekrandagi rul: barmoq bilan aylantiriladi (bir tomonga 1,5 aylanish) */
function Rul({ b, rulRef }: { b: Boshqaruv; rulRef: React.RefObject<SVGSVGElement> }) {
  const holat = useRef<{ burchak: number; id: number } | null>(null);
  const burchak = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  return (
    <div
      className="sim-rul"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        holat.current = { burchak: burchak(e), id: e.pointerId };
        b.rulUshlangan = true;
      }}
      onPointerMove={(e) => {
        const h = holat.current;
        if (!h || h.id !== e.pointerId) return;
        const a = burchak(e);
        let d = a - h.burchak;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        h.burchak = a;
        b.rul = Math.max(-MASHINA.rulAylanish, Math.min(MASHINA.rulAylanish, b.rul + d));
      }}
      onPointerUp={() => { holat.current = null; b.rulUshlangan = false; }}
      onPointerCancel={() => { holat.current = null; b.rulUshlangan = false; }}
    >
      <svg ref={rulRef} viewBox="0 0 200 200" aria-label="Rul">
        <circle cx="100" cy="100" r="88" fill="none" stroke="#1d232b" strokeWidth="20" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="#3a434f" strokeWidth="3" strokeDasharray="4 7" />
        <path d="M100 100 L 18 112 M100 100 L 182 112 M100 100 L 100 186" stroke="#1d232b" strokeWidth="18" strokeLinecap="round" />
        <circle cx="100" cy="100" r="30" fill="#262d36" stroke="#10141a" strokeWidth="4" />
        <circle cx="100" cy="100" r="9" fill="#ffd600" />
        <rect x="94" y="8" width="12" height="14" rx="3" fill="#ffd600" />
      </svg>
    </div>
  );
}

function Pedal({ nom, onBos, sinf }: { nom: string; onBos: (v: number) => void; sinf: string }) {
  return (
    <button
      type="button"
      className={'sim-pedal ' + sinf}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.classList.add('bosildi'); onBos(1); }}
      onPointerUp={(e) => { e.currentTarget.classList.remove('bosildi'); onBos(0); }}
      onPointerCancel={(e) => { e.currentTarget.classList.remove('bosildi'); onBos(0); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="sim-pedal-chiziq" /><span className="sim-pedal-chiziq" /><span className="sim-pedal-chiziq" />
      <b>{nom}</b>
    </button>
  );
}

/** Xarita: yo'lak va mashina, tepadan */
function xaritaChiz(cv: HTMLCanvasElement, maydon: Maydon) {
  const n = maydon.namunalar;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of n) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  const chet = 6, w = cv.width, h = cv.height;
  const k = Math.min(w / (maxX - minX + chet * 2), h / (maxZ - minZ + chet * 2));
  const ox = (w - (maxX - minX) * k) / 2, oz = (h - (maxZ - minZ) * k) / 2;
  // Tepadan qaraganda: +Z — yuqoriga, +X — chapga
  const t = (x: number, z: number) => [w - (ox + (x - minX) * k), h - (oz + (z - minZ) * k)] as const;
  return { t, k };
}

export default function Simulyator() {
  const orqaga = useOrqaga('/');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xaritaRef = useRef<HTMLCanvasElement>(null);
  const rulRef = useRef<SVGSVGElement>(null);
  const dv = useRef<Dvigatel | null>(null);
  const hudRef = useRef<{ tezlik?: HTMLElement | null; vaqt?: HTMLElement | null; ball?: HTMLElement | null; bosqich?: HTMLElement | null; korsatma?: HTMLElement | null; chap?: HTMLElement | null; ong?: HTMLElement | null }>({});
  const [b] = useState<Boshqaruv>(() => ({ gaz: 0, tormoz: 0, rul: 0, rulUshlangan: false, uzatma: 'N', qolTormoz: true, kamar: false, chapChiroq: false, ongChiroq: false }));
  const [, yangila] = useState(0); // tugmalar holati (kamar, uzatma…) o'zgarganda qayta chizish
  const [xabarlar, setXabarlar] = useState<(Jarima & { id: number })[]>([]);
  const [natija, setNatija] = useState<Natija | null>(null);
  const [xato, setXato] = useState('');
  const qayta = () => yangila((x) => x + 1);

  // Ilovada: ekran gorizontal, holat paneli yashirin; chiqishda qaytariladi
  useEffect(() => {
    if (!mobilIlova()) return;
    let bekor = false;
    (async () => {
      try {
        const { ScreenOrientation } = await import('@capacitor/screen-orientation');
        if (!bekor) await ScreenOrientation.lock({ orientation: 'landscape' });
      } catch { /* plagin yo'q (brauzerdagi ilova ko'rinishi) */ }
      try { const { StatusBar } = await import('@capacitor/status-bar'); if (!bekor) await StatusBar.hide(); } catch { /* */ }
    })();
    return () => {
      bekor = true;
      import('@capacitor/screen-orientation').then(({ ScreenOrientation }) => ScreenOrientation.unlock()).catch(() => {});
      import('@capacitor/status-bar').then(({ StatusBar }) => StatusBar.show()).catch(() => {});
    };
  }, []);

  // Telefonning "orqaga" tugmasi — simulyatordan chiqish
  useEffect(() => {
    const ch = (e: Event) => { e.preventDefault(); orqaga(); };
    window.addEventListener('ilova:orqaga', ch);
    return () => window.removeEventListener('ilova:orqaga', ch);
  }, [orqaga]);

  // 3D sahna
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let id = 0;
    let xarita: ReturnType<typeof xaritaChiz> | null = null;
    let xaritaFon: ImageData | null = null;
    try {
      dv.current = new Dvigatel(cv, b, {
        onHud: (h: HudMalumot) => {
          const r = hudRef.current;
          if (r.tezlik) r.tezlik.textContent = String(Math.round(h.tezlik));
          if (r.vaqt) r.vaqt.textContent = vaqtMatn(h.vaqt);
          if (r.ball) { r.ball.textContent = String(h.jami); r.ball.classList.toggle('xavf', h.jami >= YIQILISH_BALLI / 2); }
          if (r.bosqich && r.bosqich.textContent !== h.bosqich) r.bosqich.textContent = h.bosqich;
          if (r.korsatma && r.korsatma.textContent !== h.korsatma) r.korsatma.textContent = h.korsatma;
          r.chap?.classList.toggle('yonik', b.chapChiroq && h.chiroqYonadi);
          r.ong?.classList.toggle('yonik', b.ongChiroq && h.chiroqYonadi);
          if (rulRef.current) rulRef.current.style.transform = `rotate(${h.rul}deg)`;
          // Xarita
          const x = xaritaRef.current;
          if (x && dv.current) {
            const c = x.getContext('2d')!;
            if (!xarita) {
              xarita = xaritaChiz(x, dv.current.maydon);
              c.clearRect(0, 0, x.width, x.height);
              c.lineCap = 'round'; c.lineJoin = 'round';
              const n = dv.current.maydon.namunalar;
              c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(4, n[0].eni * xarita.k);
              c.beginPath(); n.forEach((p, i) => { const [a, bb] = xarita!.t(p.x, p.z); if (i) c.lineTo(a, bb); else c.moveTo(a, bb); }); c.stroke();
              c.strokeStyle = '#3d4652'; c.lineWidth = Math.max(2, n[0].eni * xarita.k - 3);
              c.beginPath(); n.forEach((p, i) => { const [a, bb] = xarita!.t(p.x, p.z); if (i) c.lineTo(a, bb); else c.moveTo(a, bb); }); c.stroke();
              xaritaFon = c.getImageData(0, 0, x.width, x.height);
            }
            if (xaritaFon) c.putImageData(xaritaFon, 0, 0);
            const [px, pz] = xarita.t(h.x + Math.sin(h.yaw) * 1.3, h.z + Math.cos(h.yaw) * 1.3);
            c.save(); c.translate(px, pz); c.rotate(-h.yaw); // xaritada +X chapda: yaw oshsa (chapga burilish) — o'q chapga og'adi
            c.fillStyle = '#ffd600'; c.strokeStyle = '#111'; c.lineWidth = 1.5;
            c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke();
            c.restore();
          }
        },
        onJarima: (j) => {
          const xid = ++id;
          setXabarlar((l) => [...l.slice(-2), { ...j, id: xid }]);
          setTimeout(() => setXabarlar((l) => l.filter((x) => x.id !== xid)), 3200);
          try { navigator.vibrate?.(120); } catch { /* */ }
        },
        onTugadi: (n) => setTimeout(() => setNatija(n), 700),
      });
    } catch (e: any) {
      setXato('Bu qurilmada 3D grafika (WebGL) ishlamadi. Brauzer yoki telefon dasturini yangilab ko‘ring.');
      console.error('[simulyator]', e);
    }
    return () => { dv.current?.dispose(); dv.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Klaviatura (kompyuterda)
  useEffect(() => {
    const bosilgan = new Set<string>();
    let kad = 0;
    let oxirgi = performance.now();
    const rulTsikl = (t: number) => {
      const dt = Math.min(0.05, (t - oxirgi) / 1000);
      oxirgi = t;
      const chap = bosilgan.has('ArrowLeft') || bosilgan.has('KeyA');
      const ong = bosilgan.has('ArrowRight') || bosilgan.has('KeyD');
      if (chap !== ong) {
        b.rulUshlangan = true;
        b.rul = Math.max(-MASHINA.rulAylanish, Math.min(MASHINA.rulAylanish, b.rul + (ong ? 1 : -1) * 520 * dt));
      } else if (bosilgan.size && (bosilgan.has('ArrowLeft') || bosilgan.has('ArrowRight') || bosilgan.has('KeyA') || bosilgan.has('KeyD'))) {
        b.rulUshlangan = true;
      }
      kad = requestAnimationFrame(rulTsikl);
    };
    kad = requestAnimationFrame(rulTsikl);
    const bos = (e: KeyboardEvent) => {
      if (e.repeat && !['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) return;
      bosilgan.add(e.code);
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': b.gaz = 1; break;
        case 'ArrowDown': case 'KeyS': b.tormoz = 1; break;
        case 'Space': b.qolTormoz = !b.qolTormoz; qayta(); break;
        case 'KeyR': b.uzatma = 'R'; qayta(); break;
        case 'KeyN': case 'Digit0': b.uzatma = 'N'; qayta(); break;
        case 'Digit1': b.uzatma = '1'; qayta(); break;
        case 'Digit2': b.uzatma = '2'; qayta(); break;
        case 'KeyB': b.kamar = !b.kamar; qayta(); break;
        case 'KeyQ': b.chapChiroq = !b.chapChiroq; b.ongChiroq = false; qayta(); break;
        case 'KeyE': b.ongChiroq = !b.ongChiroq; b.chapChiroq = false; qayta(); break;
        case 'KeyC': dv.current?.kameraAlmashtir(); break;
        default: return;
      }
      e.preventDefault();
    };
    const qoy = (e: KeyboardEvent) => {
      bosilgan.delete(e.code);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') b.gaz = 0;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') b.tormoz = 0;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) b.rulUshlangan = false;
    };
    window.addEventListener('keydown', bos);
    window.addEventListener('keyup', qoy);
    return () => { cancelAnimationFrame(kad); window.removeEventListener('keydown', bos); window.removeEventListener('keyup', qoy); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boshidan = () => { setNatija(null); setXabarlar([]); dv.current?.qaytaBoshlash(); qayta(); };
  const tegish = navigator.maxTouchPoints > 0;

  return (
    <div className="sim">
      <canvas ref={canvasRef} className="sim-canvas" />

      {xato && <div className="sim-xato">{xato}<button type="button" onClick={orqaga}>Orqaga</button></div>}

      {/* Tepa panel */}
      <div className="sim-tepa">
        <button type="button" className="sim-tugma" onClick={orqaga} aria-label="Chiqish"><X /></button>
        <div className="sim-panel">
          <div><b ref={(e) => { hudRef.current.ball = e; }}>0</b><span>/ {YIQILISH_BALLI} ball</span></div>
          <div><b ref={(e) => { hudRef.current.vaqt = e; }}>0:00</b><span>vaqt</span></div>
          <div className="sim-panel-bosqich"><b ref={(e) => { hudRef.current.bosqich = e; }}>Harakatni boshlash (Start)</b><span>mashq</span></div>
        </div>
        <button type="button" className="sim-tugma" onClick={() => dv.current?.kameraAlmashtir()} aria-label="Kamerani almashtirish" title="Kamera (C)"><Camera /></button>
        <button type="button" className="sim-tugma" onClick={boshidan} aria-label="Qaytadan boshlash" title="Qaytadan"><RotateCcw /></button>
        <canvas ref={xaritaRef} className="sim-xarita" width={150} height={110} />
      </div>

      <div className="sim-korsatma" ref={(e) => { hudRef.current.korsatma = e; }} />

      {/* Xato xabarlari */}
      <div className="sim-xabarlar">
        {xabarlar.map((x) => (
          <div className="sim-xabar" key={x.id}><b>+{x.ball}</b> {x.nom}</div>
        ))}
      </div>

      {/* Chap: spidometr, kamar, ko'rsatkichlar, uzatmalar, pedallar */}
      <div className="sim-chap">
        <div className="sim-spidometr">
          <b ref={(e) => { hudRef.current.tezlik = e; }}>0</b>
          <span>km/soat</span>
        </div>
        <div className="sim-qator">
          <button type="button" className={'sim-kichik' + (b.kamar ? ' yoq' : ' ogoh')} onClick={() => { b.kamar = !b.kamar; qayta(); }} title="Kamar (B)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.6" fill="currentColor" /><path d="M7 21v-8a5 5 0 0 1 10 0v8" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M8 9l8 10" stroke="currentColor" strokeWidth="2.6" /></svg>
            <span>Kamar</span>
          </button>
          <button type="button" className={'sim-kichik' + (b.qolTormoz ? ' qizil' : '')} onClick={() => { b.qolTormoz = !b.qolTormoz; qayta(); }} title="Qo‘l tormozi (Probel)">
            <b className="sim-p">P</b>
            <span>Qo‘l tormozi</span>
          </button>
          <button type="button" ref={(e) => { hudRef.current.chap = e; }} className={'sim-chiroq' + (b.chapChiroq ? ' on' : '')} onClick={() => { b.chapChiroq = !b.chapChiroq; b.ongChiroq = false; qayta(); }} aria-label="Chap burilish ko‘rsatkichi" title="Chapga (Q)"><ChevronLeft /></button>
          <button type="button" ref={(e) => { hudRef.current.ong = e; }} className={'sim-chiroq' + (b.ongChiroq ? ' on' : '')} onClick={() => { b.ongChiroq = !b.ongChiroq; b.chapChiroq = false; qayta(); }} aria-label="O‘ng burilish ko‘rsatkichi" title="O‘ngga (E)"><ChevronRight /></button>
        </div>
        <div className="sim-uzatmalar" role="radiogroup" aria-label="Uzatma">
          {UZATMALAR.map((u) => (
            <button type="button" key={u} role="radio" aria-checked={b.uzatma === u} className={b.uzatma === u ? 'on' : ''} onClick={() => { b.uzatma = u; qayta(); }}>{u}</button>
          ))}
        </div>
      </div>

      <div className="sim-pedallar">
        <Pedal nom="Tormoz" sinf="tormoz" onBos={(v) => { b.tormoz = v; }} />
        <Pedal nom="Gaz" sinf="gaz" onBos={(v) => { b.gaz = v; }} />
      </div>

      <Rul b={b} rulRef={rulRef} />

      {!tegish && (
        <div className="sim-klaviatura">
          <b>Klaviatura:</b> ↑ gaz · ↓ tormoz · ← → rul · 1 / 2 / R / N uzatma · Probel — qo‘l tormozi · B — kamar · Q / E — ko‘rsatkich · C — kamera
        </div>
      )}

      {tegish && <div className="sim-yotqiz">Telefonni yotqizing ↻</div>}

      {natija && (
        <div className="sim-natija-fon">
          <div className="sim-natija">
            <div className={'sim-natija-sarlavha' + (natija.otdi ? ' otdi' : ' yiqildi')}>{natija.otdi ? 'Mashq bajarildi!' : 'Mashq bajarilmadi'}</div>
            <div className="sim-natija-raqamlar">
              <div><b>{natija.jami}</b><span>jarima balli</span></div>
              <div><b>{vaqtMatn(natija.vaqt)}</b><span>vaqt</span></div>
              <div><b>{natija.jarimalar.length}</b><span>xato</span></div>
            </div>
            {natija.jarimalar.length > 0 ? (
              <ul className="sim-natija-royxat">
                {natija.jarimalar.map((j, i) => <li key={i}><span>{j.nom}</span><b>+{j.ball}</b></li>)}
              </ul>
            ) : <p className="sim-natija-bosh">Xatosiz — zo‘r!</p>}
            <div className="sim-natija-tugmalar">
              <button type="button" className="sim-natija-asosiy" onClick={boshidan}><RotateCcw size={18} /> Qayta urinish</button>
              <button type="button" onClick={orqaga}>Chiqish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
