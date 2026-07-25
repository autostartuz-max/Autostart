const API = (import.meta as any).env?.VITE_API || '/api';

let token = localStorage.getItem('yhq_token') || '';

export function setToken(t: string) {
  token = t;
  localStorage.setItem('yhq_token', t);
}
export function hasToken() {
  return !!token;
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
  me: () => req('/me'),
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
export function adminToken() {
  return localStorage.getItem('yhq_admin_token') || '';
}
export function hasAdmin() {
  return !!adminToken();
}
export function setAdminToken(t: string) {
  localStorage.setItem('yhq_admin_token', t);
}
export function clearAdmin() {
  localStorage.removeItem('yhq_admin_token');
}

async function areq(path: string, opts: RequestInit = {}) {
  const at = adminToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(at ? { Authorization: `Bearer ${at}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || res.statusText);
  }
  return res.json();
}
async function aupload(path: string, field: string, file: File) {
  const fd = new FormData();
  fd.append(field, file);
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken()}` },
    body: fd,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
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
  uploadImage: (id: number, file: File) => aupload('/admin/questions/' + id + '/image', 'image', file),
  deleteImage: (id: number) => areq('/admin/questions/' + id + '/image', { method: 'DELETE' }),
  uploadAudio: (id: number, file: File) => aupload('/admin/questions/' + id + '/audio', 'audio', file),
  deleteAudio: (id: number) => areq('/admin/questions/' + id + '/audio', { method: 'DELETE' }),
};
