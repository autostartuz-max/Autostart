const API = (import.meta as any).env?.VITE_API || '/api';

let token = localStorage.getItem('yhq_token') || '';

export function setToken(t: string) {
  token = t;
  localStorage.setItem('yhq_token', t);
}
export function hasToken() {
  return !!token;
}
export function authToken() {
  return token;
}
export function clearToken() {
  token = '';
  localStorage.removeItem('yhq_token');
  localStorage.removeItem(ROLE_KEY);
  notifyAdminChanged();
}

/**
 * Foydalanuvchi roli — /me javobidan olinadi va menyuni ko'rsatish uchun
 * keshlanadi. Bu FAQAT UI keshi: huquq bermaydi, API har so'rovda role'ni
 * bazadan tekshiradi (auth.ts -> checkRole).
 *
 *   owner — to'liq huquq: savollar + rollarni tayinlash
 *   admin — faqat savollarni ko'rish/qo'shish/tahrirlash
 *   user  — oddiy talaba
 */
export type Role = 'owner' | 'admin' | 'user';
export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', user: 'Talaba' };

const ROLE_KEY = 'yhq_role';
export function userRole(): Role {
  const r = localStorage.getItem(ROLE_KEY);
  return r === 'owner' || r === 'admin' ? r : 'user';
}
/** Rollarni tayinlay oladimi — faqat owner */
export function isOwner() {
  return userRole() === 'owner';
}
/** Savollar bo'limiga kira oladimi — owner yoki admin */
export function canManageQuestions() {
  const r = userRole();
  return r === 'owner' || r === 'admin';
}
function rememberRole(role: unknown) {
  const r: Role = role === 'owner' || role === 'admin' ? role : 'user';
  if (localStorage.getItem(ROLE_KEY) === r) return;
  try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ }
  notifyAdminChanged(); // menyu darhol yangilansin
}

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export const api = {
  authTelegram: (initData: string, guestId?: string) =>
    req('/auth/telegram', { method: 'POST', body: JSON.stringify({ initData, guestId }) }),
  register: (name: string, phone: string, password: string, email = '') =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ name, phone, email, password }) }),
  /** login — telefon yoki pochta */
  login: (login: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  me: async () => {
    const r = await req('/me');
    rememberRole(r?.user?.role);
    return r;
  },
  updateMe: (data: any) => req('/me', { method: 'PATCH', body: JSON.stringify(data) }),
  categories: () => req('/categories'),
  topics: () => req('/topics'),
  tickets: () => req('/tickets'),
  questions: (params: Record<string, string>) =>
    req('/questions?' + new URLSearchParams(params).toString()),
  answer: (body: { questionId: number; chosen: number[]; timeMs: number }) =>
    req('/answers', { method: 'POST', body: JSON.stringify(body) }),
  mistakes: () => req('/mistakes'),
  bookmarks: (): Promise<number[]> => req('/bookmarks'),
  toggleBookmark: (id: number) => req('/bookmarks/' + id, { method: 'POST' }),
  signs: () => req('/signs'),
  complaint: (questionId: number, reason: string) =>
    req('/complaints', { method: 'POST', body: JSON.stringify({ questionId, reason }) }),
};

/* ---------- Admin (savol boshqaruvi — asosiy ilova ichida) ---------- */
// XAVFSIZLIK: false. Avval true edi — bu har bir tashrifchini avtomat admin
// (admin/admin123) qilib kirgizardi, ya'ni istalgan odam hamma savolni o'qishi/
// o'zgartirishi mumkin edi. Endi admin panelga faqat haqiqiy parol bilan kiriladi.
export const SAVOLLAR_PUBLIC = false;

// Eski AdminUser tokeni (login+parol). Endi asosiy yo'l — foydalanuvchi roli;
// bu esa zaxira sifatida qoladi (/savollar manzilidagi forma).
export function adminToken() {
  return localStorage.getItem('yhq_admin_token') || '';
}
export function hasAdmin() {
  return !!adminToken();
}
// Menyu darhol yangilanishi uchun signal. Brauzerning 'storage' hodisasi
// o'zgarishni QILGAN tabda ishlamaydi — shusiz admin kirgandan keyin ham
// yon menyu eski holatda qolardi ("kirdim, baribir ko'rinmadi").
export const ADMIN_CHANGED = 'yhq-admin-changed';
function notifyAdminChanged() {
  try { window.dispatchEvent(new Event(ADMIN_CHANGED)); } catch { /* ignore */ }
}

export function setAdminToken(t: string) {
  localStorage.setItem('yhq_admin_token', t);
  notifyAdminChanged();
}
export function clearAdmin() {
  localStorage.removeItem('yhq_admin_token');
  notifyAdminChanged();
}
/** To'liq chiqish */
export function forgetAdmin() {
  localStorage.removeItem('yhq_admin_token');
  localStorage.removeItem(ROLE_KEY);
  notifyAdminChanged();
}

async function areq(path: string, opts: RequestInit = {}, _retried = false): Promise<any> {
  // Admin tokeni bo'lsa o'shani, bo'lmasa oddiy foydalanuvchi tokenini yuboramiz —
  // role='admin' bo'lgan foydalanuvchi alohida admin login qilmasdan ishlaydi.
  const at = adminToken() || authToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(at ? { Authorization: `Bearer ${at}` } : {}),
      ...(opts.headers || {}),
    },
  });
  // Token eskirgan/yaroqsiz bo'lsa — tozalab, qayta kirib, bir marta qayta urinamiz
  if ((res.status === 401 || res.status === 403) && !_retried && SAVOLLAR_PUBLIC) {
    clearAdmin();
    if (await ensureAdminAuto()) return areq(path, opts, true);
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    // Statusni xatoga biriktiramiz — chaqiruvchi 401/403 ni ajrata olsin
    // (token eskirganda ro'yxat "bo'sh" bo'lib ko'rinmasligi uchun).
    throw Object.assign(new Error(b.error || res.statusText), { status: res.status });
  }
  return res.json();
}
async function aupload(path: string, field: string, file: File, _retried = false): Promise<any> {
  const fd = new FormData();
  fd.append(field, file);
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken() || authToken()}` },
    body: fd,
  });
  if ((res.status === 401 || res.status === 403) && !_retried && SAVOLLAR_PUBLIC) {
    clearAdmin();
    if (await ensureAdminAuto()) return aupload(path, field, file, true);
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw Object.assign(new Error(b.error || res.statusText), { status: res.status });
  }
  return res.json();
}

export const adminApi = {
  login: async (login: string, password: string) => {
    const res = await fetch(API + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Login xato');
    const data = await res.json();
    setAdminToken(data.token);
    return data;
  },
  questions: (q = ''): Promise<any[]> =>
    areq('/admin/questions' + (q ? '?q=' + encodeURIComponent(q) : '')),
  question: (id: number) => areq('/admin/questions/' + id),
  createQuestion: (data: any) => areq('/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: any) =>
    areq('/admin/questions/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: number) => areq('/admin/questions/' + id, { method: 'DELETE' }),
  categories: (): Promise<any[]> => areq('/admin/categories'),
  topics: (): Promise<any[]> => areq('/admin/topics'),
  createTopic: (name: string): Promise<any> => areq('/admin/topics', { method: 'POST', body: JSON.stringify({ name }) }),
  translate: (text: string, to = 'ru'): Promise<{ text: string }> =>
    areq('/admin/translate?to=' + to + '&text=' + encodeURIComponent(text)),
  extractQuestion: (file: File): Promise<{ textLat: string; options: string[]; shablon: number | null; tartib: number | null; correctIndex: number | null; izoh: string; topicId: number | null }> =>
    aupload('/admin/extract-question', 'image', file),
  uploadImage: (id: number, file: File) => aupload('/admin/questions/' + id + '/image', 'image', file),
  deleteImage: (id: number) => areq('/admin/questions/' + id + '/image', { method: 'DELETE' }),
  uploadAudio: (id: number, file: File) => aupload('/admin/questions/' + id + '/audio', 'audio', file),
  deleteAudio: (id: number) => areq('/admin/questions/' + id + '/audio', { method: 'DELETE' }),
  recolorImage: async (
    file: File,
    pairs: { object: string; color: string }[]
  ): Promise<{ imageBase64: string; mime: string }> => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('pairs', JSON.stringify(pairs));
    const res = await fetch(API + '/admin/recolor-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken() || authToken()}` }, // Content-Type YO'Q — browser multipart boundary qo'yadi
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  },

  /* ---- Foydalanuvchilar va rollar ---- */
  users: (q = ''): Promise<{ users: AdminUserRow[]; meId: number | null }> =>
    areq('/admin/users' + (q ? '?q=' + encodeURIComponent(q) : '')),
  user: (id: number): Promise<{ user: AdminUserDetail; stats: AdminUserStats }> =>
    areq('/admin/users/' + id),
  setUserRole: (id: number, role: Role): Promise<{ user: AdminUserRow }> =>
    areq('/admin/users/' + id + '/role', { method: 'PATCH', body: JSON.stringify({ role }) }),
};

export interface AdminUserRow {
  id: number;
  firstName: string;
  phone: string | null;
  email: string | null;
  tgId: string | null;
  role: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserRow {
  lang: string;
  alphabet: string;
  category: string;
  examDate: string | null;
}

export interface AdminUserStats {
  answered: number;
  correct: number;
  wrong: number;
  accuracy: number;
  solvedQuestions: number;
  bookmarks: number;
  complaints: number;
  lastActive: string | null;
  firstActive: string | null;
}

// base64 -> File (AI natijasini mavjud rasm-yuklash oqimiga ulash uchun)
export async function base64ToFile(b64: string, mime: string, name = 'recolored.png'): Promise<File> {
  const res = await fetch(`data:${mime};base64,${b64}`);
  const blob = await res.blob();
  return new File([blob], name, { type: mime });
}

// XAVFSIZLIK: avtomat admin login OLIB TASHLANDI.
// Avval bu yerda admin/admin123 kodda ochiq turardi va har bir tashrifchi
// avtomat admin bo'lardi. Endi admin panelga faqat haqiqiy parol bilan kiriladi.
export async function ensureAdminAuto(): Promise<boolean> {
  return hasAdmin();
}
