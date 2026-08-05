/**
 * Kalit harflarni uch tilda birxillashtirish.
 *
 * Qoida: javob variantidagi RASMGA ISHORA QILUVCHI yakka bosh harf (A, B, C, Г, M1 ...)
 * o'zbekcha (lotin) matnda qanday bo'lsa, kirillcha va ruscha matnda ham AYNAN shunday
 * bo'lishi kerak. Aks holda talaba "Faqat C" javobini tanlaydi-yu, rasmda "С" degan
 * belgi yo'q bo'lib chiqadi.
 *
 * Xavfsizlik: yakka harf gap boshida turib ortidan so'zlar kelsa (o'zbekcha "U chiqishga...",
 * ruscha "В том что...") — bu kalit harf emas, SO'Z. Bunday holatlar tegilmaydi va
 * hisobotda ko'rsatiladi. Harflar soni mos kelmasa ham tegilmaydi.
 *
 * Ishlatish:
 *   npx tsx scripts/fix-key-letters.ts            # faqat ko'rsatadi, yozmaydi
 *   npx tsx scripts/fix-key-letters.ts --apply    # bazaga yozadi
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const LETTER = "A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ'ʻʼ`‘’";
const RE = new RegExp(`(^|[^${LETTER}])([A-ZА-ЯЁ])(?=$|[^${LETTER}])`, 'g');

type Cand = { ch: string; at: number };
const cands = (s: string): Cand[] =>
  [...(s || '').matchAll(RE)].map((m) => ({ ch: m[2], at: m.index! + m[1].length }));

/** Gap boshidagi yakka harf + ortidan so'zlar = so'z (kalit harf emas) */
function looksLikeWord(s: string, at: number): boolean {
  if (at !== 0) return false;
  return /^\s/.test(s.slice(at + 1)) && s.trim().split(/\s+/).length > 3;
}

type Skip = { q: number; field: string; why: string; lat: string; cur: string };

async function main() {
  const opts = await prisma.option.findMany({
    select: { id: true, questionId: true, textLat: true, textCyr: true, textRus: true },
  });

  const plan: { id: number; field: 'textCyr' | 'textRus'; next: string }[] = [];
  const skipped: Skip[] = [];
  let same = 0;

  for (const o of opts) {
    const L = cands(o.textLat);
    if (!L.length) continue;

    for (const field of ['textCyr', 'textRus'] as const) {
      const cur = (o as any)[field] as string | null;
      if (!cur?.trim()) continue; // bo'sh bo'lsa runtime transliteratsiya ishlaydi

      const T = cands(cur);
      if (T.length !== L.length) {
        skipped.push({ q: o.questionId, field, why: `harflar soni mos emas (${L.length} vs ${T.length})`, lat: o.textLat, cur });
        continue;
      }
      if (L.some((c, i) => looksLikeWord(o.textLat, c.at) || looksLikeWord(cur, T[i].at))) {
        skipped.push({ q: o.questionId, field, why: "yakka harfli so'z bo'lishi mumkin", lat: o.textLat, cur });
        continue;
      }
      if (L.every((c, i) => c.ch === T[i].ch)) { same++; continue; } // allaqachon birxil

      // Harflarni o'z o'rnida almashtiramiz (uzunlik o'zgarmaydi — siljish yo'q)
      let next = cur;
      for (let i = 0; i < T.length; i++) next = next.slice(0, T[i].at) + L[i].ch + next.slice(T[i].at + 1);
      plan.push({ id: o.id, field, next });
    }
  }

  console.log(APPLY ? '=== QO‘LLANMOQDA ===' : '=== FAQAT KO‘RSATISH (--apply yo‘q) ===');
  console.log('Allaqachon birxil :', same);
  console.log('Tuzatiladi        :', plan.length);
  console.log('Chetga surildi    :', skipped.length);

  if (skipped.length) {
    console.log('\n--- qo‘lda ko‘rish kerak ---');
    for (const s of skipped) {
      console.log(`  q${s.q} ${s.field} [${s.why}]`);
      console.log(`     lotin: ${s.lat}`);
      console.log(`     hozir: ${s.cur}`);
    }
  }

  if (!APPLY) {
    console.log('\nYozish uchun: npx tsx scripts/fix-key-letters.ts --apply');
    return;
  }

  let done = 0;
  for (const c of plan) {
    await prisma.option.update({ where: { id: c.id }, data: { [c.field]: c.next } as any });
    done++;
  }
  console.log(`\n✅ ${done} ta matn yangilandi.`);
}

main()
  .catch((e) => { console.error('XATO:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
