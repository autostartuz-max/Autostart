import { useEffect, useRef } from 'react';
import type { V } from '../asos/geom';
import type { Maydon } from '../dunyo/turlar';

export interface XaritaHolat { x: number; y: number; th: number; oldinda: V[] }

/** Kichik xarita: mashina markazda, yo'nalishi doim tepaga; oldindagi marshrut sariq */
export function Xarita({ maydon, holat }: { maydon: Maydon | null; holat: XaritaHolat | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const yollar = useRef<Path2D | null>(null);
  useEffect(() => {
    if (!maydon) return;
    const p = new Path2D();
    for (const poly of maydon.asfalt) for (const h of poly) {
      h.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
      p.closePath();
    }
    yollar.current = p;
  }, [maydon]);
  useEffect(() => {
    const cv = ref.current, h = holat;
    if (!cv || !h || !yollar.current) return;
    const g = cv.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(46, 70, 40, .82)';
    g.fillRect(0, 0, cv.width, cv.height);
    const k = 2.3 * dpr, a = Math.PI / 2 - h.th, ca = Math.cos(a), sa = Math.sin(a);
    const cx = cv.width / 2, cy = cv.height * 0.62;
    g.setTransform(k * ca, -k * sa, -k * sa, -k * ca, cx - k * (h.x * ca - h.y * sa), cy + k * (h.x * sa + h.y * ca));
    g.fillStyle = '#5b5f66';
    g.fill(yollar.current, 'evenodd');
    if (h.oldinda.length > 1) {
      g.strokeStyle = '#ffd21f'; g.lineWidth = 1.6; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); h.oldinda.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(cx, cy - 8 * dpr); g.lineTo(cx + 6 * dpr, cy + 7 * dpr); g.lineTo(cx, cy + 3.5 * dpr); g.lineTo(cx - 6 * dpr, cy + 7 * dpr); g.closePath();
    g.fill(); g.stroke();
  }, [holat]);
  return <canvas ref={ref} className="sim-xarita" />;
}
