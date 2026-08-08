/**
 * Rollarni eski nomlardan yangisiga ko'chirish (bir martalik).
 *
 * Eski tizim: student | admin
 * Yangi tizim: user | admin | owner
 *
 *   student -> user
 *   admin   -> owner   (eski tizimda "admin" to'liq huquqqa ega edi, ya'ni
 *                       hozirgi "owner" ma'nosini bergan)
 *
 * Skript idempotent: ikkinchi marta ishlatilsa hech narsani o'zgartirmaydi.
 *
 * Ishlatish:
 *   npx tsx scripts/migrate-roles.ts            # faqat ko'rsatadi
 *   npx tsx scripts/migrate-roles.ts --apply    # bazaga yozadi
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const hammasi = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
  console.log('=== Hozirgi holat ===');
  for (const r of hammasi) console.log(`  ${r.role.padEnd(8)} ${r._count._all}`);

  const student = await prisma.user.count({ where: { role: 'student' } });
  const eskiAdmin = await prisma.user.count({ where: { role: 'admin' } });

  console.log('\n=== Reja ===');
  console.log(`  student -> user   : ${student}`);
  console.log(`  admin   -> owner  : ${eskiAdmin}`);

  if (!APPLY) {
    console.log('\nYozish uchun: npx tsx scripts/migrate-roles.ts --apply');
    return;
  }
  if (student === 0 && eskiAdmin === 0) {
    console.log('\n✅ Ko‘chirishga hech narsa yo‘q — allaqachon yangi nomlarda.');
    return;
  }

  // Tartib muhim: avval admin->owner, keyin student->user.
  // Aks holda student->user qilingach, admin hali "admin" bo'lib qolardi va
  // yangi tizimdagi "admin" (faqat savollar) bilan aralashib ketardi.
  const a = await prisma.user.updateMany({ where: { role: 'admin' }, data: { role: 'owner' } });
  const s = await prisma.user.updateMany({ where: { role: 'student' }, data: { role: 'user' } });

  console.log(`\n✅ admin -> owner: ${a.count},  student -> user: ${s.count}`);

  const keyin = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
  console.log('\n=== Yangi holat ===');
  for (const r of keyin) console.log(`  ${r.role.padEnd(8)} ${r._count._all}`);
}

main()
  .catch((e) => { console.error('XATO:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
