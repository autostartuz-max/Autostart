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
