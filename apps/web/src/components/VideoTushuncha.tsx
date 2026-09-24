import { useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Settings, Maximize } from 'lucide-react';

/** 70.4 -> "1:10" */
const vaqt = (s: number) => {
  const t = Number.isFinite(s) && s > 0 ? s : 0;
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
};
/** Sozlama tugmasi tezlikni aylantiradi */
const TEZLIKLAR = [1, 1.25, 1.5, 2, 0.75];

/**
 * Savolning video tushunchasi (mobil ilova: "O'rganish → Video").
 * Avval muqova va o'rtada yashil ▶; bosilgach o'sha joyda o'ynaydi —
 * pastda yashil progress, ⏸/▶, 10 soniya orqaga/oldinga, vaqt,
 * tezlik va to'liq ekran.
 */
export default function VideoTushuncha({ src }: { src: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const quti = useRef<HTMLDivElement>(null);
  const [boshlandi, setBoshlandi] = useState(false);
  const [oynayapti, setOynayapti] = useState(false);
  const [joriy, setJoriy] = useState(0);
  const [davom, setDavom] = useState(0);
  const [tezlik, setTezlik] = useState(1);

  const boshla = () => {
    setBoshlandi(true);
    v.current?.play().catch(() => {});
  };
  const almash = () => {
    const e = v.current;
    if (!e) return;
    if (e.paused) e.play().catch(() => {});
    else e.pause();
  };
  const sur = (d: number) => {
    const e = v.current;
    if (!e) return;
    e.currentTime = Math.max(0, Math.min(e.duration || 0, e.currentTime + d));
  };
  const tezlikniAlmash = () => {
    const t = TEZLIKLAR[(TEZLIKLAR.indexOf(tezlik) + 1) % TEZLIKLAR.length];
    setTezlik(t);
    if (v.current) v.current.playbackRate = t;
  };
  const toliqEkran = () => {
    const q: any = quti.current;
    const e: any = v.current;
    if (q?.requestFullscreen) q.requestFullscreen().catch(() => e?.webkitEnterFullscreen?.());
    else e?.webkitEnterFullscreen?.();
  };
  const foiz = davom ? Math.min(100, (joriy / davom) * 100) : 0;

  return (
    <div className="tvp" ref={quti}>
      {/* #t=0.1 — Android'da muqova sifatida birinchi kadr ko'rinsin */}
      <video
        ref={v}
        className="tvp-v"
        src={src + '#t=0.1'}
        preload="metadata"
        playsInline
        onPlay={() => setOynayapti(true)}
        onPause={() => setOynayapti(false)}
        onEnded={() => setOynayapti(false)}
        onTimeUpdate={(e) => setJoriy(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDavom(e.currentTarget.duration)}
        onClick={boshlandi ? almash : boshla}
      />
      {!boshlandi && (
        <button className="tvp-play" onClick={boshla} aria-label="Videoni ko‘rish">
          <Play size={30} fill="currentColor" />
        </button>
      )}
      {boshlandi && (
        <div className="tvp-bar">
          <input
            type="range"
            className="tvp-prog"
            min={0}
            max={davom || 0}
            step={0.1}
            value={joriy}
            style={{ ['--p' as any]: foiz + '%' }}
            onChange={(e) => { if (v.current) v.current.currentTime = Number(e.target.value); }}
          />
          <div className="tvp-row">
            <button onClick={almash} aria-label={oynayapti ? 'To‘xtatish' : 'Davom ettirish'}>
              {oynayapti ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <button className="tvp-10" onClick={() => sur(-10)} aria-label="10 soniya orqaga">
              <RotateCcw size={24} /><i>10</i>
            </button>
            <button className="tvp-10" onClick={() => sur(10)} aria-label="10 soniya oldinga">
              <RotateCw size={24} /><i>10</i>
            </button>
            <span className="tvp-t">{vaqt(joriy)} / {vaqt(davom)}</span>
            <span className="tvp-sp" />
            <button onClick={tezlikniAlmash} aria-label="Tezlik">
              {tezlik === 1 ? <Settings size={21} /> : <b className="tvp-tez">{tezlik}x</b>}
            </button>
            <button onClick={toliqEkran} aria-label="To‘liq ekran"><Maximize size={21} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
