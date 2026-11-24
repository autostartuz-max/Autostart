import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import '../ilova-ekran.css';

/**
 * Ilovada pastdan chiqadigan oyna (bottom sheet). Qorong'i fon yoki telefonning
 * "orqaga" tugmasi bosilsa yopiladi — ilovadan chiqib ketilmaydi.
 */
export default function PastkiOyna({ title, subtitle, onClose, children, ikonka, className }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Sarlavha ustidagi belgi (masalan "Imtihon sanasini kiriting" oynasidagi kalendar) */
  ikonka?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const orqaga = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('ilova:orqaga', orqaga);
    return () => window.removeEventListener('ilova:orqaga', orqaga);
  }, [onClose]);

  // Oyna ochiq turganda orqadagi sahifa aylanmasin (2026-11-24: belgi oynasini aylantirganda ro'yxat aylanib
  // ketardi). Oyna DOM'da sahifa ichida turadi — uning aylanadigan ota konteynerlari va sahifa qulflanadi.
  const oynaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Faqat ilovada (saytda aylantirish chizig'i yo'qolib, sahifa siljimasin)
    if (!document.documentElement.classList.contains('cap')) return;
    const qulf: { el: HTMLElement; avval: string }[] = [];
    const qulfla = (el: HTMLElement) => { qulf.push({ el, avval: el.style.overflow }); el.style.overflow = 'hidden'; };
    for (let el = oynaRef.current?.parentElement || null; el && el !== document.body; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) qulfla(el);
    }
    qulfla(document.documentElement);
    qulfla(document.body);
    return () => { for (const q of qulf.reverse()) q.el.style.overflow = q.avval; };
  }, []);

  return (
    <>
      <div className="ie-sheet-bg" onClick={onClose} />
      <div ref={oynaRef} className={'ie-sheet' + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ie-handle" />
        <button type="button" className="ie-sh-x" onClick={onClose} aria-label="Yopish"><X aria-hidden="true" /></button>
        {ikonka && <div className="ie-sh-ikonka" aria-hidden="true">{ikonka}</div>}
        <div className="ie-sh-title">{title}</div>
        {subtitle && <div className="ie-sh-sub">{subtitle}</div>}
        {children}
      </div>
    </>
  );
}
