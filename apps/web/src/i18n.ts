// Global til almashtirish: butun ilova UI matnini tanlangan tilga o'zgartiradi.
// uz — o'zbekcha lotin (asl), cyr — avtomatik transliteratsiya, rus — avtomatik tarjima (keshlanadi).
import { latToCyr } from './translit';

export type Lang = 'uz' | 'cyr' | 'rus';

const API = (import.meta as any).env?.VITE_API || '/api';
const LKEY = 'yhq_lang';
const RKEY = 'yhq_ru_cache_v1';

/**
 * Rus tili VAQTINCHA O'CHIRILGAN (2026-11-05, egasi so'radi) — sayt va ilovaning hamma joyida:
 * til almashtirish, test/shablon til tanlash, admin savol formasidagi rus maydonlari.
 * Bazadagi ruscha matnlar (textRus) o'chirilmagan, admin yangi savolga orqada tarjima ham yozib boradi.
 * Qaytarish uchun shu yerda `true` qiling.
 */
export const rusBor = () => false;

export function getLang(): Lang {
  const l = localStorage.getItem(LKEY);
  if (l === 'rus') return rusBor() ? 'rus' : 'uz'; // avval rus tanlangan bo'lsa — o'zbekcha
  return l === 'cyr' ? 'cyr' : 'uz';
}

let curLang: Lang = 'uz';
let observer: MutationObserver | null = null;

// Ruscha tarjima keshi
let ru: Record<string, string> = {};
try { ru = JSON.parse(localStorage.getItem(RKEY) || '{}'); } catch { ru = {}; }
const saveRu = () => { try { localStorage.setItem(RKEY, JSON.stringify(ru)); } catch { /* ignore */ } };

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'CODE', 'PRE']);
const hasLetters = (s: string) => /[A-Za-zЀ-ӿ]/.test(s);

function inSkip(node: Node): boolean {
  let el: HTMLElement | null = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.getAttribute && el.getAttribute('data-notr') !== null) return true;
    el = el.parentElement;
  }
  return false;
}

/* ---- Ruscha tarjima navbati ---- */
const queue = new Set<string>();
let flushTimer: any = null;
function queueRu(s: string) {
  if (ru[s] !== undefined || queue.has(s)) return;
  queue.add(s);
  if (!flushTimer) flushTimer = setTimeout(flush, 350);
}
async function flush() {
  flushTimer = null;
  const items = Array.from(queue).slice(0, 30);
  items.forEach((s) => queue.delete(s));
  await Promise.all(
    items.map(async (s) => {
      try {
        const r = await fetch(API + '/translate?to=ru&text=' + encodeURIComponent(s));
        const d = await r.json();
        ru[s] = (d && d.text) || s;
      } catch {
        ru[s] = s;
      }
    })
  );
  saveRu();
  if (curLang === 'rus') applyAll();
  if (queue.size) flushTimer = setTimeout(flush, 350);
}

function toTarget(src: string): string {
  if (curLang === 'cyr') return latToCyr(src);
  if (curLang === 'rus') {
    const s = src.trim();
    if (!s) return src;
    const t = ru[s];
    if (t !== undefined) return src.replace(s, t);
    queueRu(s);
    return src; // tarjima kelguncha lotinchada turadi
  }
  return src;
}

function transformNode(node: Text) {
  if (inSkip(node)) return;
  const anyNode = node as any;
  const src: string = anyNode.__src ?? node.nodeValue ?? '';
  anyNode.__src = src;
  if (!hasLetters(src)) return;
  const out = toTarget(src);
  if (node.nodeValue !== out) {
    observer?.disconnect();
    node.nodeValue = out;
    connect();
  }
}

function walk(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = w.nextNode())) nodes.push(n as Text);
  return nodes;
}

function applyAll() {
  observer?.disconnect();
  for (const node of walk(document.body)) {
    if (inSkip(node)) continue;
    const anyNode = node as any;
    const src: string = anyNode.__src ?? node.nodeValue ?? '';
    anyNode.__src = src;
    if (!hasLetters(src)) continue;
    const out = toTarget(src);
    if (node.nodeValue !== out) node.nodeValue = out;
  }
  connect();
}

function connect() {
  observer?.observe(document.body, { childList: true, characterData: true, subtree: true });
}

function onMutations(muts: MutationRecord[]) {
  for (const m of muts) {
    if (m.type === 'characterData') {
      const t = m.target as Text;
      if (t.nodeType === 3) {
        (t as any).__src = t.nodeValue; // React yangi asl qiymatni yozdi
        transformNode(t);
      }
    } else if (m.type === 'childList') {
      m.addedNodes.forEach((added) => {
        if (added.nodeType === 3) transformNode(added as Text);
        else if (added.nodeType === 1) walk(added).forEach(transformNode);
      });
    }
  }
}

export function initI18n() {
  curLang = getLang();
  observer = new MutationObserver(onMutations);
  applyAll();
}

export function setLang(l: Lang) {
  localStorage.setItem(LKEY, l);
  curLang = l;
  applyAll();
  window.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}
