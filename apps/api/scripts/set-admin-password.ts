/**
 * Admin parolini almashtirish.
 *
 * Ishlatish:
 *   npx tsx scripts/set-admin-password.ts "yangi-parol"
 *   npx tsx scripts/set-admin-password.ts "yangi-parol" --login boshqaadmin
 *
 * Parolni buyruq satriga yozganingizda u shell tarixiga tushishi mumkin —
 * o'zgartirgach tarixni tozalash tavsiya etiladi.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const loginIdx = args.indexOf('--login');
const login = loginIdx >= 0 ? args[loginIdx + 1] || 'admin' : 'admin';
// --login va uning qiymatini chetlab, birinchi qolgan argument — parol
const password =
  args.filter((_, i) => loginIdx < 0 || (i !== loginIdx && i !== loginIdx + 1))[0] || '';

async function main() {
  if (!password) {
    console.error('Parol berilmadi.\n  npx tsx scripts/set-admin-password.ts "yangi-parol"');
    process.exitCode = 1;
    return;
  }
  if (password.length < 10) {
    console.error(`Parol juda qisqa (${password.length} belgi). Kamida 10 ta belgi bo'lsin.`);
    process.exitCode = 1;
    return;
  }

  const admin = await prisma.adminUser.findUnique({ where: { login } });
  if (!admin) {
    const bor = await prisma.adminUser.findMany({ select: { login: true } });
    console.error(`"${login}" nomli admin topilmadi. Bazadagilar: ${bor.map((a) => a.login).join(', ') || '(yo\'q)'}`);
    process.exitCode = 1;
    return;
  }

  const eskiHash = admin.passwordHash;
  await prisma.adminUser.update({
    where: { login },
    data: { passwordHash: bcrypt.hashSync(password, 10) },
  });

  // Tekshiramiz: yangi parol ishlaydimi, eskisi endi ishlamaydimi
  const yangilangan = await prisma.adminUser.findUnique({ where: { login } });
  const yangiIshlaydi = bcrypt.compareSync(password, yangilangan!.passwordHash);
  const hashOzgardi = yangilangan!.passwordHash !== eskiHash;

  console.log(`Admin: ${login} (role: ${admin.role})`);
  console.log(`  hash o'zgardi     : ${hashOzgardi ? 'ha' : "yo'q"}`);
  console.log(`  yangi parol mos   : ${yangiIshlaydi ? 'ha' : "yo'q"}`);
  console.log(yangiIshlaydi && hashOzgardi ? '\n✅ Parol almashtirildi.' : '\n❌ Nimadir noto‘g‘ri ketdi.');
}

main()
  .catch((e) => { console.error('XATO:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
