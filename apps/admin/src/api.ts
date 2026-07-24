const API = '/api';
let token = localStorage.getItem('yhq_admin_token') || '';

export function setToken(t: string) {
  token = t;
  localStorage.setItem('yhq_admin_token', t);
}
export function logout() {
  token = '';
  localStorage.removeItem('yhq_admin_token');
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
  if (res.status === 401) {
    logout();
    location.reload();
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || res.statusText);
  }
  return res.json();
}

export const api = {
  login: (login: string, password: string) =>
    req('/admin/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  stats: () => req('/admin/stats'),
  questions: (q = '') => req('/admin/questions' + (q ? '?q=' + encodeURIComponent(q) : '')),
  question: (id: number) => req('/admin/questions/' + id),
  createQuestion: (data: any) => req('/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: any) =>
    req('/admin/questions/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: number) => req('/admin/questions/' + id, { method: 'DELETE' }),
  topics: () => req('/admin/topics'),
  tickets: () => req('/admin/tickets'),
  categories: () => req('/admin/categories'),
  createTopic: (name: string) => req('/admin/topics', { method: 'POST', body: JSON.stringify({ name }) }),
  complaints: () => req('/admin/complaints'),
  import: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(API + '/admin/questions/import', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  },
  uploadAudio: async (id: number, file: File) => {
    const fd = new FormData();
    fd.append('audio', file);
    const res = await fetch(API + '/admin/questions/' + id + '/audio', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  },
  deleteAudio: (id: number) => req('/admin/questions/' + id + '/audio', { method: 'DELETE' }),
  uploadImage: async (id: number, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(API + '/admin/questions/' + id + '/image', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  },
  deleteImage: (id: number) => req('/admin/questions/' + id + '/image', { method: 'DELETE' }),
};
