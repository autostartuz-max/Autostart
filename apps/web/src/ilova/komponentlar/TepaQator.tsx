import type { ReactNode } from 'react';
import logo from '../rasmlar/logo.webp';
import '../tema.css';
import './komponentlar.css';

// QOLIP — F-agent to'ldiradi (KONTRAKT.md). Props o'zgarmaydi.
/** Yuqori qator: chapda logotip (258×46), o'ngda — streak chipi yoki qidiruv tugmasi */
export default function TepaQator({ ong }: { ong?: ReactNode }) {
  return (
    <header className="ilv-tepa">
      <img className="ilv-logo" src={logo} alt="AutoStart — haydovchilar tayyorlash maktabi" />
      {ong}
    </header>
  );
}
