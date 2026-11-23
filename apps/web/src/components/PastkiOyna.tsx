import { useEffect, type ReactNode } from 'react';
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

  return (
    <>
      <div className="ie-sheet-bg" onClick={onClose} />
      <div className={'ie-sheet' + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={title}>
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
