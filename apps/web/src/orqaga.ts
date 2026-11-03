import { useNavigate } from 'react-router-dom';
import { mobilIlova } from './native';

/**
 * "Orqaga" tugmasi uchun. Ilovada — foydalanuvchi qaysi oynadan kelgan bo'lsa o'shanga qaytadi
 * (masalan Testlar → test → orqaga = Testlar), xuddi telefonning orqaga tugmasidek. Tarix
 * bo'lmasa (ilova shu sahifada ochilgan) — bosh sahifaga. Saytda avvalgidek bosh sahifaga.
 */
export function useOrqaga(zaxira = '/') {
  const nav = useNavigate();
  return () => {
    if (!mobilIlova()) {
      nav(zaxira);
      return;
    }
    // react-router har bir tarix yozuviga tartib raqamini (idx) qo'yadi: 0 — birinchi sahifa
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) nav(-1);
    else nav(zaxira, { replace: true });
  };
}

/** Orqaga tugmasidagi yozuv: ilovada "Orqaga", saytda avvalgidek "Bosh sahifa" */
export const orqagaYozuvi = () => (mobilIlova() ? 'Orqaga' : 'Bosh sahifa');
