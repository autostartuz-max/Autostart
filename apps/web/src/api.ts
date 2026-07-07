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
  authTelegram: (initData: string) =>
    req('/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }),
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
