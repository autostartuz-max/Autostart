import { useRef } from 'react';
import type { Boshqaruv } from '../fizika/mashina';

/** Ekrandagi rul: barmoq bilan aylantiriladi; qo'yib yuborilsa — mashina yurganda o'zi markazga qaytadi */
export function Rul({ k, chegara, rulRef }: { k: Boshqaruv; chegara: number; rulRef: React.RefObject<SVGSVGElement> }) {
  const h = useRef<{ a: number; id: number } | null>(null);
  const burchak = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const qoyibYubor = () => { h.current = null; k.rulUshlangan = false; };
  return (
    <div
      className="sim-rul"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); h.current = { a: burchak(e), id: e.pointerId }; k.rulUshlangan = true; }}
      onPointerMove={(e) => {
        const s = h.current;
        if (!s || s.id !== e.pointerId) return;
        const a = burchak(e);
        let d = a - s.a;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        s.a = a;
        k.rul = Math.max(-chegara, Math.min(chegara, k.rul + d));
      }}
      onPointerUp={qoyibYubor}
      onPointerCancel={qoyibYubor}
      onLostPointerCapture={qoyibYubor}
    >
      <svg ref={rulRef} viewBox="0 0 200 200" aria-label="Rul">
        <defs>
          <radialGradient id="simRulG" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#3a414b" />
            <stop offset="100%" stopColor="#14181d" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#0e1115" strokeWidth="24" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="url(#simRulG)" strokeWidth="19" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" strokeDasharray="3 9" />
        <path d="M100 100 L 22 116 M100 100 L 178 116 M100 100 L 100 182" stroke="#1b2026" strokeWidth="20" strokeLinecap="round" />
        <circle cx="100" cy="100" r="31" fill="#20262d" stroke="#0e1115" strokeWidth="4" />
        <circle cx="100" cy="100" r="11" fill="#ffd21f" />
        <rect x="93" y="5" width="14" height="17" rx="4" fill="#ffd21f" />
      </svg>
    </div>
  );
}

/** Pedal: bosilgan joy qanchalik pastda bo'lsa — shunchalik kuchli bosiladi */
export function Pedal({ nom, sinf, onBos }: { nom: string; sinf: string; onBos: (v: number) => void }) {
  const qiymat = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0.35, Math.min(1, 0.35 + ((e.clientY - r.top) / r.height) * 0.75));
  };
  const qoy = (e: React.PointerEvent<HTMLButtonElement>, v: number) => {
    e.currentTarget.style.setProperty('--bosim', String(v));
    e.currentTarget.classList.toggle('bosildi', v > 0);
    onBos(v);
  };
  return (
    <button
      type="button"
      className={'sim-pedal ' + sinf}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); qoy(e, qiymat(e)); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) qoy(e, qiymat(e)); }}
      onPointerUp={(e) => qoy(e, 0)}
      onPointerCancel={(e) => qoy(e, 0)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="sim-pedal-iz" /><span className="sim-pedal-iz" /><span className="sim-pedal-iz" /><span className="sim-pedal-iz" />
      <b>{nom}</b>
    </button>
  );
}

/** Kamar belgisi */
export function KamarBelgi() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="4.5" r="2.3" />
      <path d="M8 21v-8.5a4 4 0 0 1 8 0V21" />
      <path d="M9 8.5 16.5 19" />
    </svg>
  );
}

/** Fara belgisi */
export function FaraBelgi() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 6c-4 0-6 3-6 6s2 6 6 6c1.5 0 2-1 2-6s-.5-6-2-6Z" />
      <path d="M17 8h4M17 12h4M17 16h4" />
    </svg>
  );
}
