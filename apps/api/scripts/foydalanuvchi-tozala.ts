/**
 * Sinov hisoblari va mehmonlarni (qurilma hisobi, tgId "guest-…") o'chirish.
 * Owner va Adminlarga hech qachon tegmaydi. Javoblar, saqlanganlar, shikoyatlar — Cascade bilan;
 * bog'lanmagan jadvallar (BallTarix, PromoTaklif) — shu yerda qo'lda tozalanadi.
 *
 *   npx tsx scripts/foydalanuvchi-tozala.ts --mehmonlar --id=1,418          — faqat ko'rsatadi (hech narsa o'chmaydi)
 *   npx tsx scripts/foydalanuvchi-tozala.ts --mehmonlar --id=1,418 --bajar  — o'chiradi
 */
import { prisma } from '../src/prisma';

async function main() {
  const arg = process.argv.slice(2);
  const bajar = arg.includes('--bajar');
  const mehmonlar = arg.includes('--mehmonlar');
  const idlar = (arg.find((a) => a.startsWith('--id='))?.slice(5) || '')
    .split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);

  const OR: any[] = [];
  if (mehmonlar) OR.push({ tgId: { startsWith: 'guest-' } });
  if (idlar.length) OR.push({ id: { in: idlar } });
  if (!OR.length) return console.log('Nimani o\'chirish kerak? --mehmonlar va/yoki --id=1,2,3');

  const royxat = await prisma.user.findMany({
    where: { AND: [{ OR }, { role: { notIn: ['owner', 'admin'] } }] },
    select: { id: true, firstName: true, phone: true, email: true, tgId: true, _count: { select: { answers: true } } },
    orderBy: { id: 'asc' },
  });
  const mehmonSoni = royxat.filter((u) => u.tgId?.startsWith('guest-')).length;
  console.log(`O'chiriladi: ${royxat.length} ta (mehmon ${mehmonSoni}, boshqa ${royxat.length - mehmonSoni}); javoblari jami ${royxat.reduce((s, u) => s + u._count.answers, 0)}`);
  for (const u of royxat.filter((x) => !x.tgId?.startsWith('guest-'))) {
    console.log(`  ${u.id}  ${u.firstName}  ${u.phone || u.email || u.tgId}  javob: ${u._count.answers}`);
  }
  const otkazilgan = idlar.filter((id) => !royxat.some((u) => u.id === id));
  if (otkazilgan.length) console.log(`  (o'tkazib yuborildi — yo'q yoki owner/admin: ${otkazilgan.join(', ')})`);
  if (!bajar) return console.log('Sinov rejimi — hech narsa o\'chmadi. O\'chirish uchun: --bajar');

  const ids = royxat.map((u) => u.id);
  const [ball, promo, user] = await prisma.$transaction([
    prisma.ballTarix.deleteMany({ where: { userId: { in: ids } } }),
    prisma.promoTaklif.deleteMany({ where: { OR: [{ dostId: { in: ids } }, { egasiId: { in: ids } }] } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`O'chirildi: ${user.count} foydalanuvchi, ${ball.count} ball yozuvi, ${promo.count} promokod taklifi.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
