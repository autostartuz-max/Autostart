import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import logo from '../rasmlar/logo.webp';
import '../tema.css';
import './komponentlar.css';

/**
 * Yuqori qator: chapda logotip (258×46), o'ngda — streak chipi yoki qidiruv tugmasi
 * (pastdagi KunChip / QidiruvTugma yoki .ilv-chip / .ilv-qidiruv sinflari).
 */
export default function TepaQator({ ong }: { ong?: ReactNode }) {
  return (
    <header className="ilv-tepa">
      <img className="ilv-logo" src={logo} alt="AutoStart — haydovchilar tayyorlash maktabi" />
      {ong}
    </header>
  );
}

/** Namunadagi chaqmoq (lucide Zap'dan torroq, burchaklari o'tkir) — 24×24, markazi lucide'niki bilan bir joyda */
function Chaqmoq() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.48 1.32 13.31 9.13H20.19L10.24 21.85 10.97 13.89H4.73Z" />
    </svg>
  );
}

/** Bosh sahifa: faollik seriyasi chipi ("0 kun") */
export function KunChip({ kun, onClick }: { kun: number; onClick: () => void }) {
  return (
    <button type="button" className="ilv-chip" onClick={onClick} aria-label={`Faollik seriyasi: ${kun} kun`}>
      <Chaqmoq />
      <span>{kun} kun</span>
    </button>
  );
}

/** Testlar ekrani: qidiruv tugmasi */
export function QidiruvTugma({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="ilv-qidiruv" onClick={onClick} aria-label="Qidiruv">
      <Search aria-hidden="true" />
    </button>
  );
}
