import { useEffect, useRef, useState } from 'react';

/**
 * Element ekranda ko'rinib turibdimi (IntersectionObserver). Kartochka shunda
 * `ilv-korinadi` oladi va ichidagi animatsiyalar ishlaydi — ekrandan tashqaridagilar
 * to'xtab turadi (tema.css).
 */
export function useKorinish<T extends Element>() {
  const ref = useRef<T>(null);
  const [korinadi, setKorinadi] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Eski WebView'da kuzatuvchi bo'lmasa — doim ko'rinadi deb hisoblaymiz
    if (typeof IntersectionObserver === 'undefined') {
      setKorinadi(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setKorinadi(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, korinadi] as const;
}

const KAM_HARAKAT = '(prefers-reduced-motion: reduce)';

/**
 * Tizimda "harakatni kamaytirish" yoqilganmi. CSS animatsiyalarni tema.css o'zi
 * o'chiradi; bu hook animatsiyali RASMLAR uchun (Oktagon) — ularni CSS to'xtata olmaydi,
 * o'rniga statik kadr qo'yiladi. Sozlama ilova ochiqligida o'zgarsa ham kuzatiladi.
 */
export function useKamHarakat() {
  const [kam, setKam] = useState(() => typeof matchMedia === 'function' && matchMedia(KAM_HARAKAT).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(KAM_HARAKAT);
    const yangila = () => setKam(mq.matches);
    yangila();
    // Eski Safari'da faqat addListener bor
    if (mq.addEventListener) mq.addEventListener('change', yangila);
    else mq.addListener(yangila);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', yangila);
      else mq.removeListener(yangila);
    };
  }, []);
  return kam;
}
