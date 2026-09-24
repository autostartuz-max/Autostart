import { Capacitor } from '@capacitor/core';

const API = (import.meta as any).env?.VITE_API || '/api';

let token = localStorage.getItem('yhq_token') || '';

export function setToken(t: string) {
  token = t;
  localStorage.setItem('yhq_token', t);
  tokenniZaxirala(t);
}

/*
 * Mobil ilovada token qo'shimcha ravishda Capacitor Preferences'da (Android
 * SharedPreferences) saqlanadi: WebView xotirasi tozalansa ham ilova login
 * so'ramaydi. Saytda bu funksiyalar hech narsa qilmaydi.
 */
function tokenniZaxirala(t: string) {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/preferences')
    .then(({ Preferences }) => (t ? Preferences.set({ key: 'yhq_token', value: t }) : Preferences.remove({ key: 'yhq_token' })))
    .catch(() => {});
}
/** Ilova ochilganda: localStorage'da token bo'lmasa zaxiradan tiklaydi */
export async function tokenniTikla() {
  if (!Capacitor.isNativePlatform() || token) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'yhq_token' });
    if (value) {
      token = value;
      localStorage.setItem('yhq_token', value);
    }
  } catch { /* zaxira yo'q */ }
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
  tokenniZaxirala('');
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

/* ==================== OFFLINE ====================
 * Mobil ilovada internet doim ham bo'lmaydi (metro, qishloq, trafik tugagan).
 * Shuning uchun:
 *   1) muvaffaqiyatli GET javoblari qurilmada saqlanadi va tarmoq ishlamaganda
 *      o'shandan beriladi — test yechish davom etaveradi;
 *   2) yuborilmagan javoblar navbatga tushadi va tarmoq tiklanganda jo'natiladi.
 * Server javob bergan xatolar (401, 404...) bunga kirmaydi — ular oddiy xato.
 */
const KESH = 'yhq_kesh_';
const NAVBAT = 'yhq_navbat';

/**
 * Offline faqat MOBIL ILOVADA ishlaydi. Saytda hech narsa o'zgarmasin:
 * brauzerda kesh ham, navbat ham yo'q — avvalgidek to'g'ridan-to'g'ri server.
 */
const ilovaIchida = Capacitor.isNativePlatform();
/** Javob ilovadan berilyaptimi (dev'da brauzerdagi ilova ko'rinishi ham) — server "ilova" deb belgilaydi */
const ilovaManbasi = () => {
  if (ilovaIchida) return true;
  try {
    return !!(import.meta as any).env?.DEV && localStorage.getItem('yhq_ilova_preview') === '1';
  } catch {
    return false;
  }
};

/** Server javob bergan xatomi (true) yoki internet yo'qmi (false) */
const serverXatosi = (e: any) => !!e?.serverdan;

function keshYoz(path: string, data: any) {
  if (!ilovaIchida) return;
  let matn = '';
  try { matn = JSON.stringify(data); } catch { return; }
  // Juda katta javob (masalan "barcha savollar") xotirani to'ldirib, token va
  // sozlamalarni yozishga joy qoldirmasligi mumkin — uni keshlamaymiz.
  if (matn.length > 2_000_000) return;
  try {
    localStorage.setItem(KESH + path, matn);
  } catch {
    // Joy tugadi — eski keshni tozalab bir marta qayta urinamiz
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith(KESH)) localStorage.removeItem(k);
      localStorage.setItem(KESH + path, matn);
    } catch { /* baribir sig'madi — keshsiz ishlayveramiz */ }
  }
}
function keshOqi(path: string): any | null {
  if (!ilovaIchida) return null;
  try {
    const r = localStorage.getItem(KESH + path);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}

/** Keshlangan savollar orasidan bittasini topish — offline baholash uchun */
function keshdanSavol(id: number): any | null {
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(KESH + '/questions')) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) || 'null');
      const q = Array.isArray(arr) ? arr.find((x: any) => x?.id === id) : null;
      if (q) return q;
    } catch { /* buzilgan yozuv */ }
  }
  return null;
}

function navbatniOqi(): any[] {
  try { return JSON.parse(localStorage.getItem(NAVBAT) || '[]'); } catch { return []; }
}
function navbatgaQosh(body: any) {
  const n = navbatniOqi();
  n.push(body);
  try { localStorage.setItem(NAVBAT, JSON.stringify(n.slice(-500))); } catch { /* ignore */ }
}

let yuborilyapti = false;
/** Navbatda turgan javoblarni serverga jo'natish (tarmoq tiklanganda) */
export async function navbatniYubor() {
  if (!ilovaIchida || yuborilyapti || !token) return;
  const n = navbatniOqi();
  if (!n.length) return;
  yuborilyapti = true;
  try {
    const qolgan: any[] = [];
    for (const body of n) {
      try {
        await req('/answers', { method: 'POST', body: JSON.stringify(body) });
      } catch (e) {
        // Internet yana uzilsa — qolganini keyingi safar yuboramiz
        if (!serverXatosi(e)) { qolgan.push(body); break; }
        // Server rad etgan javob (savol o'chirilgan bo'lsa) — tashlab ketamiz
      }
    }
    localStorage.setItem(NAVBAT, JSON.stringify(qolgan));
  } finally {
    yuborilyapti = false;
  }
}

async function req(path: string, opts: RequestInit = {}) {
  const metod = String(opts.method || 'GET').toUpperCase();
  try {
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
      const err: any = new Error(body.error || res.statusText);
      err.serverdan = true; // server javob berdi — keshga tushmaymiz
      err.status = res.status; // 401/403 — token yaroqsiz; boshqasi — vaqtinchalik xato
      throw err;
    }
    const data = await res.json();
    if (metod === 'GET') keshYoz(path, data);
    return data;
  } catch (e) {
    if (metod === 'GET' && !serverXatosi(e)) {
      const k = keshOqi(path);
      if (k !== null) return k; // internet yo'q — oxirgi nusxadan beramiz
    }
    throw e;
  }
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
    // Ilovada statistika faqat ilova javoblaridan
    const r = await req('/me' + (ilovaManbasi() ? '?manba=ilova' : ''));
    rememberRole(r?.user?.role);
    return r;
  },
  updateMe: (data: any) => req('/me', { method: 'PATCH', body: JSON.stringify(data) }),
  /** Sessiyani uzaytirish — yangi token (ilova har ochilganda) */
  refresh: (): Promise<{ token: string }> => req('/auth/refresh', { method: 'POST' }),
  /** Akkauntni butunlay o'chirish (do'konlar talabi). Parol bo'lsa — tasdiq uchun. */
  deleteMe: (password = '') => req('/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
  /** Savol muhokamasi (ilova) */
  comments: (questionId: number): Promise<CommentRow[]> => req(`/questions/${questionId}/comments`),
  addComment: (questionId: number, text: string): Promise<CommentRow> =>
    req(`/questions/${questionId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteComment: (id: number) => req(`/comments/${id}`, { method: 'DELETE' }),
  reportComment: (id: number) => req(`/comments/${id}/report`, { method: 'POST' }),
  categories: () => req('/categories'),
  topics: () => req('/topics'),
  tickets: () => req('/tickets'),
  questions: (params: Record<string, string>) =>
    req('/questions?' + new URLSearchParams(params).toString()),
  answer: async (asl: { questionId: number; chosen: number[]; timeMs: number }) => {
    // Ilovadan kelgan javob belgilanadi; saytda so'rov avvalgidek
    const body = ilovaManbasi() ? { ...asl, manba: 'ilova' } : asl;
    try {
      const r = await req('/answers', { method: 'POST', body: JSON.stringify(body) });
      navbatniYubor(); // aloqa bor ekan, kutib turganlarini ham jo'natamiz
      return r;
    } catch (e) {
      if (serverXatosi(e) || !ilovaIchida) throw e;
      // Internet yo'q: savol keshda bo'lsa o'zimiz baholaymiz, javob navbatga tushadi.
      const q = keshdanSavol(body.questionId);
      if (!q?.options) throw e;
      const togri: number[] = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
      const tanlangan = [...body.chosen].sort();
      const isCorrect =
        togri.length === tanlangan.length && [...togri].sort().every((id, i) => id === tanlangan[i]);
      navbatgaQosh(body);
      return { isCorrect, correctOptionIds: togri, offline: true };
    }
  },
  mistakes: () => req('/mistakes' + (ilovaManbasi() ? '?manba=ilova' : '')),
  rating: (limit = 100): Promise<{ list: RatingRow[]; meId: number }> =>
    req('/rating?limit=' + limit),
  solved: () => req('/solved'),
  /**
   * Har savol bo'yicha OXIRGI javobim — yengil ro'yxat (savolning o'zisiz).
   * Test oynasi shu bilan yechilgan savollarni tiklaydi.
   */
  myAnswers: (manba?: 'ilova'): Promise<{
    list: Array<{ questionId: number; chosen: number[]; isCorrect: boolean }>;
  }> => req('/progress/answers' + (manba ? '?manba=' + manba : '')),
  /** Har shablon bo'yicha progress (yechilgan va to'g'ri javoblar) */
  shablonProgress: (): Promise<{ list: ShablonProgress[] }> => req('/progress/shablon'),
  /** Hozir nechta foydalanuvchi ishlayapti (oxirgi 5 daqiqada faol) */
  online: (): Promise<{ count: number; minutes: number; list?: OnlineRow[] }> => req('/online'),
  /** Aloqa formasi — kirmagan mehmon ham yubora oladi */
  contact: (b: { name: string; phone: string; subject: string; text: string }) =>
    req('/contact', { method: 'POST', body: JSON.stringify(b) }),
  dailyStats: (days = 7): Promise<{ list: DailyStat[]; best: number | null; worst: number | null }> =>
    req('/stats/daily?days=' + days),
  bookmarks: (): Promise<number[]> => req('/bookmarks'),
  toggleBookmark: (id: number) => req('/bookmarks/' + id, { method: 'POST' }),
  signs: () => req('/signs'),
  complaint: (questionId: number, reason: string) =>
    req('/complaints', { method: 'POST', body: JSON.stringify({ questionId, reason }) }),
  /** Amaliy mashg'ulotlar — faqat e'lon qilinganlari */
  lessons: (category = ''): Promise<{ list: Lesson[]; counts: Record<string, number> }> =>
    req('/lessons' + (category ? '?category=' + encodeURIComponent(category) : '')),
};

/** Video manzili — <video src> uchun. Token talab qilmaydi (savol rasmi kabi). */
/**
 * Dars videosi. Mobil ilovada `?mobil=1` qo'shiladi — server siqilgan nusxani
 * beradi (tayyor bo'lmasa aslini). Saytda manzil avvalgidek qoladi.
 */
/**
 * Serverdan kelgan nisbiy manzilni (masalan `/api/questions/5/image`) ilovada
 * to'liq manzilga aylantiradi.
 *
 * Ilovada sahifa `https://localhost` dan ochiladi — nisbiy manzil serverga emas,
 * ilovaning ichiga qarab ketadi va rasm/ovoz topilmaydi. Saytda esa manzil
 * o'zgarishsiz qoladi.
 */
export function mediaUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//')) return u; // http(s):, data:, blob:
  if (!ilovaIchida) return u;
  return API.replace(/\/api\/?$/, '') + (u.startsWith('/') ? u : '/' + u);
}

export const lessonVideoUrl = (id: number) =>
  `${API}/lessons/${id}/video` + (ilovaIchida ? '?mobil=1' : '');

export interface CommentRow {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  name: string;
  mine: boolean;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  /** A | B | C | D | E | BC | CE | Boshqa */
  category: string;
  order: number;
  status?: 'draft' | 'published';
  /** Admin yuklagan asl fayl nomi — faqat admin ro'yxatida keladi */
  origName?: string;
  sizeBytes: number;
  createdAt: string;
}

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
  /** Video tushuncha — mobil ilovada "O'rganish → Video" da ko'rinadi */
  uploadVideo: (id: number, file: File) => aupload('/admin/questions/' + id + '/video', 'video', file),
  deleteVideo: (id: number) => areq('/admin/questions/' + id + '/video', { method: 'DELETE' }),
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
  createUser: (data: {
    firstName: string; phone?: string; email?: string; password: string; role: Role;
  }): Promise<{ user: AdminUserRow }> =>
    areq('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: {
    firstName?: string; phone?: string; email?: string; password?: string;
    lang?: string; alphabet?: string; category?: string; examDate?: string;
  }): Promise<{ user: AdminUserDetail }> =>
    areq('/admin/users/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number): Promise<{ ok: boolean; id: number }> =>
    areq('/admin/users/' + id, { method: 'DELETE' }),
  messages: (status = ''): Promise<{ list: MessageRow[]; yangi: number }> =>
    areq('/admin/messages' + (status ? '?status=' + status : '')),
  setMessageStatus: (id: number, status: MessageStatus): Promise<{ message: MessageRow }> =>
    areq('/admin/messages/' + id, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteMessage: (id: number): Promise<{ ok: boolean; id: number }> =>
    areq('/admin/messages/' + id, { method: 'DELETE' }),
  setUserRole: (id: number, role: Role): Promise<{ user: AdminUserRow }> =>
    areq('/admin/users/' + id + '/role', { method: 'PATCH', body: JSON.stringify({ role }) }),
  /* ---- Amaliy mashg'ulotlar (video darsliklar) ---- */
  lessons: (category = ''): Promise<{ list: Lesson[]; toifalar: string[]; limitMb: number }> =>
    areq('/admin/lessons' + (category ? '?category=' + encodeURIComponent(category) : '')),
  updateLesson: (
    id: number,
    data: { title?: string; description?: string; category?: string; order?: number; status?: string }
  ): Promise<{ lesson: Lesson }> =>
    areq('/admin/lessons/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLesson: (id: number): Promise<{ ok: boolean; id: number }> =>
    areq('/admin/lessons/' + id, { method: 'DELETE' }),
  /**
   * Video yuklash. fetch() yuklash jarayonini ko'rsata olmaydi, shuning uchun
   * XMLHttpRequest — 500 MB lik fayl bir necha daqiqa ketadi va admin foizni
   * ko'rmasa ilova qotib qolgandek tuyuladi.
   */
  uploadLesson: (
    meta: { title: string; description: string; category: string; order: number; status: string },
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ lesson: Lesson }> =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('title', meta.title);
      fd.append('description', meta.description);
      fd.append('category', meta.category);
      fd.append('order', String(meta.order));
      fd.append('status', meta.status);
      fd.append('video', file); // fayl OXIRIDA — server meta maydonlarini oldin o'qiydi
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API + '/admin/lessons');
      xhr.setRequestHeader('Authorization', 'Bearer ' + (adminToken() || authToken()));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let body: any = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* javob JSON emas */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(Object.assign(new Error(body.error || 'Videoni yuklab bo‘lmadi'), { status: xhr.status }));
      };
      xhr.onerror = () => reject(new Error('Tarmoq uzildi — yuklash to‘xtadi'));
      xhr.onabort = () => reject(new Error('Yuklash bekor qilindi'));
      xhr.send(fd);
    }),

  /** Tahlil: barcha talabalar bo'yicha eng ko'p xato qilinadigan savollar */
  mistakeAnalytics: (opts: { shablon?: number; min?: number; limit?: number } = {}):
    Promise<{ list: MistakeStatRow[]; jamiSavol: number }> => {
    const p = new URLSearchParams();
    if (opts.shablon) p.set('shablon', String(opts.shablon));
    if (opts.min) p.set('min', String(opts.min));
    if (opts.limit) p.set('limit', String(opts.limit));
    const qs = p.toString();
    return areq('/admin/analytics/mistakes' + (qs ? '?' + qs : ''));
  },
};

/** Bitta savol bo'yicha umumiy xato statistikasi (Owner/Admin tahlili) */
export interface MistakeStatRow {
  id: number;
  textLat: string;
  shablon: number | null;
  order: number;
  topic: string | null;
  /** To'g'ri javob matni — tahlilda darhol ko'rinishi uchun */
  correctText: string | null;
  /** Talabalar belgilagan NOTO'G'RI variantlar, ko'p tanlangani birinchi */
  xatoJavoblar?: { text: string; count: number }[];
  /** Nechta talaba bu savolga javob bergan */
  total: number;
  /** Shulardan nechtasi (oxirgi urinishida) xato qilgan */
  wrong: number;
  /** wrong / total, foizda */
  rate: number;
}

export interface ShablonProgress {
  shablon: number;
  total: number;
  answered: number;
  correct: number;
  percent: number;
}

export interface DailyStat {
  date: string;
  answered: number;
  correct: number;
  /** Javob berilmagan kunda null — grafikda nuqta qo'yilmaydi */
  accuracy: number | null;
}

/** Onlayn foydalanuvchi — ro'yxat faqat Owner va Adminga qaytariladi */
export interface OnlineRow {
  id: number;
  firstName: string;
  role: Role;
  lastSeen: string | null;
  mehmon: boolean;
}

export type MessageStatus = 'new' | 'read' | 'done';
export interface MessageRow {
  id: number;
  name: string;
  phone: string;
  subject: string;
  text: string;
  status: MessageStatus;
  userId: number | null;
  createdAt: string;
}

export interface RatingRow {
  userId: number;
  firstName: string;
  solved: number;
  correct: number;
  accuracy: number;
  rank: number;
}

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
  /** Ochilgan parol. Eski hisoblarda null — bcrypt hashdan tiklab bo'lmaydi. */
  parol?: string | null;
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
