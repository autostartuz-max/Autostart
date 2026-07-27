// Tema: Light / System / Dark. documentElement'ga data-theme qo'yiladi, CSS shunga qarab o'zgaradi.
export type Theme = 'light' | 'system' | 'dark';
const TKEY = 'yhq_theme';

export function getTheme(): Theme {
  const t = localStorage.getItem(TKEY);
  return t === 'light' || t === 'dark' ? t : 'system';
}

function resolve(t: Theme): 'light' | 'dark' {
  if (t === 'system') return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return t;
}

export function applyTheme(t?: Theme) {
  document.documentElement.setAttribute('data-theme', resolve(t ?? getTheme()));
}

export function setTheme(t: Theme) {
  localStorage.setItem(TKEY, t);
  applyTheme(t);
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export function initTheme() {
  applyTheme();
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (getTheme() === 'system') applyTheme();
    });
  } catch {
    /* ignore */
  }
}
