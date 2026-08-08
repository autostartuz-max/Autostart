/**
 * Foydalanuvchining rolini o'zgartirish (birinchi adminni belgilash uchun).
 *
 * Role tizimi endi ishga tushganda hali birorta admin foydalanuvchi yo'q —
 * "tovuqmi-tuxummi" holati. Shu skript bilan birinchi admin belgilanadi,
 * keyingilarini u ilova ichidagi "Foydalanuvchilar" bo'limidan qo'yadi.
 *
 * Ishlatish:
 *   npx tsx scripts/set-user-role.ts +998990068452 admin
 *   npx tsx scripts/set-user-role.ts +998990068452 student
 *   npx tsx scripts/set-user-role.ts --list          # adminlarni ko'rish
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ROLES = ['admin', 'student'];

// Telefon raqamni +998XXXXXXXXX ko'rinishiga keltiradi (user.ts dagi bilan bir xil)
function normPhone(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.startsWith('998') && d.length === 12) return '+' + d;
  return null;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const adminlar = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, firstName: true, phone: true },
      orderBy: { id: 'asc' },
    });
    console.log(`Adminlar: ${adminlar.length}`);
    for (const a of adminlar) console.log(`  id=${a.id}  ${a.firstName}  ${a.phone || '(telefonsiz)'}`);
    return;
  }

  const [rawPhone, role] = args;
  if (!rawPhone || !role) {
    console.error('Ishlatish: npx tsx scripts/set-user-role.ts <telefon> <admin|student>');
    process.exitCode = 1;
    return;
  }
  if (!ROLES.includes(role)) {
    console.error(`Role noto'g'ri: "${role}". Faqat: ${ROLES.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const phone = normPhone(rawPhone);
  if (!phone) {
    console.error(`Telefon raqami noto'g'ri: "${rawPhone}". Namuna: +998901234567`);
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.error(`${phone} raqamli foydalanuvchi topilmadi.`);
    process.exitCode = 1;
    return;
  }

  // Oxirgi adminni tushirib qo'ymaslik (endpointdagi cheklovning aynan o'zi)
  if (role === 'student' && user.role === 'admin') {
    const adminlar = await prisma.user.count({ where: { role: 'admin' } });
    if (adminlar <= 1) {
      console.error('Bu oxirgi admin — rolini olib bo‘lmaydi.');
      process.exitCode = 1;
      return;
    }
  }

  const oldRole = user.role;
  const updated = await prisma.user.update({ where: { phone }, data: { role } });

  console.log(`${updated.firstName} (${phone}, id=${updated.id})`);
  console.log(`  ${oldRole} -> ${updated.role}`);
  console.log(updated.role === role ? '\n✅ Role o‘zgartirildi.' : '\n❌ Nimadir noto‘g‘ri ketdi.');
}

main()
  .catch((e) => { console.error('XATO:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
