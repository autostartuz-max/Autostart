// Telegram WebApp bilan xavfsiz ishlash (brauzerda ham ishlaydi)
export function getTelegram(): any {
  return (window as any).Telegram?.WebApp;
}

export function initTelegram() {
  const tg = getTelegram();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#0b111b');
      tg.setBackgroundColor?.('#0b111b');
    } catch {
      /* brauzerda e'tibormaymiz */
    }
  }
}

export function getInitData(): string {
  return getTelegram()?.initData || '';
}

// Web saytda (Telegramsiz) har bir qurilma uchun barqaror mehmon ID
export function getGuestId(): string {
  const KEY = 'yhq_guest_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function haptic(type: 'success' | 'error' | 'light' = 'light') {
  const tg = getTelegram();
  try {
    if (type === 'light') tg?.HapticFeedback?.impactOccurred?.('light');
    else tg?.HapticFeedback?.notificationOccurred?.(type);
  } catch {
    /* ignore */
  }
}
