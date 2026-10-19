import { useEffect, type ReactNode } from 'react';
import '../ilova-ekran.css';

/**
 * Ilovada pastdan chiqadigan oyna (bottom sheet). Qorong'i fon yoki telefonning
 * "orqaga" tugmasi bosilsa yopiladi — ilovadan chiqib ketilmaydi.
 */
export default function PastkiOyna({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
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
      <div className="ie-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ie-handle" />
        <div className="ie-sh-title">{title}</div>
        {subtitle && <div className="ie-sh-sub">{subtitle}</div>}
        {children}
      </div>
    </>
  );
}
