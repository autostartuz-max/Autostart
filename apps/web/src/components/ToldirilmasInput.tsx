import { useState, type InputHTMLAttributes } from 'react';

/**
 * Admin formalarida BOSHQA odamning ma'lumoti (ism, telefon, pochta, parol) uchun maydon.
 * Brauzer saqlangan login/parolni (adminning o'zinikini) bu yerga o'zi qo'ymasin — aks holda
 * "Saqlash" bosilsa talabaning pochtasi/paroli adminniki bilan almashib ketadi.
 * Maydon bosilguncha readOnly (brauzer readOnly maydonni avtomatik to'ldirmaydi), autocomplete o'chiq.
 */
export default function ToldirilmasInput({ onFocus, onPointerDown, readOnly, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  const [faol, setFaol] = useState(false);
  return (
    <input
      {...p}
      autoComplete={p.type === 'password' ? 'new-password' : 'off'}
      data-lpignore="true"
      readOnly={readOnly || !faol}
      // Bosilganda darhol yoziladigan bo'ladi (telefonda klaviatura birinchi bosishda ochilsin)
      onPointerDown={(e) => { setFaol(true); onPointerDown?.(e); }}
      onFocus={(e) => { setFaol(true); onFocus?.(e); }}
    />
  );
}
