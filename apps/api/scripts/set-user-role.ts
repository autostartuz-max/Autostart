/**
 * Foydalanuvchining rolini o'zgartirish (birinchi adminni belgilash uchun).
 *
 * Role tizimi endi ishga tushganda hali birorta admin foydalanuvchi yo'q —
 * "tovuqmi-tuxummi" holati. Shu skript bilan birinchi admin belgilanadi,
 * keyingilarini u ilova ichidagi "Foydalanuvchilar" bo'limidan qo'yadi.
 *
 * Rollar:
 *   owner — to'liq huquq: savollar + boshqalarga rol tayinlash
 *   admin — faqat savollarni ko'rish/qo'shish/tahrirlash
 *   user  — oddiy talaba (standart)
 *
 * Ishlatish:
 *   npx tsx scripts/set-user-role.ts +998990068452 owner
 *   npx tsx scripts/set-user-role.ts +998901234567 admin
 *   npx tsx scripts/set-user-role.ts +998901234567 user
 *   npx tsx scripts/set-user-role.ts --list          # huquqli hisoblarni ko'rish
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// owner — to'liq huquq (savollar + rollarni tayinlash)
// admin — faqat savollarni tahrirlash
// user  — oddiy talaba
const ROLES = ['owner', 'admin', 'user'];

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
    const huquqli = await prisma.user.findMany({
      where: { role: { in: ['owner', 'admin'] } },
      select: { id: true, firstName: true, phone: true, role: true },
      orderBy: [{ role: 'asc' }, { id: 'asc' }],
    });
    const talabalar = await prisma.user.count({ where: { role: 'user' } });
    console.log(`Huquqli hisoblar: ${huquqli.length}  |  Talabalar: ${talabalar}`);
    for (const a of huquqli) {
      console.log(`  ${a.role.padEnd(5)}  id=${a.id}  ${a.firstName}  ${a.phone || '(telefonsiz)'}`);
    }
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

  // Oxirgi owner'ni tushirib qo'ymaslik (endpointdagi cheklovning aynan o'zi)
  if (user.role === 'owner' && role !== 'owner') {
    const ownerlar = await prisma.user.count({ where: { role: 'owner' } });
    if (ownerlar <= 1) {
      console.error('Bu oxirgi Owner — rolini olib bo‘lmaydi.');
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
