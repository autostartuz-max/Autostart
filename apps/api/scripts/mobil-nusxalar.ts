/**
 * Serverdagi mavjud darslar uchun mobil (siqilgan) nusxalarni yasaydi.
 *
 * Yangi yuklanganlari o'zi siqiladi (admin.ts), bu skript esa ilgari
 * yuklanganlarini bir martalik quvib yetkazish uchun:
 *
 *   cd /opt/autostart && sudo npx tsx apps/api/scripts/mobil-nusxalar.ts
 *
 * Asl fayllarga TEGMAYDI — sayt avvalgidek asl videoni beradi.
 */
import { PrismaClient } from '@prisma/client';
import { ffmpegBormi, mobilNusxaBormi, siq } from '../src/video';

const prisma = new PrismaClient();

async function main() {
  if (!(await ffmpegBormi())) {
    console.error('ffmpeg topilmadi. O‘rnatish: sudo apt install -y ffmpeg');
    process.exit(1);
  }

  const darslar = await prisma.lesson.findMany({ orderBy: { id: 'asc' } });
  console.log(`Jami ${darslar.length} ta dars`);

  for (const d of darslar) {
    if (mobilNusxaBormi(d.fileName)) {
      console.log(`— #${d.id} ${d.title}: mobil nusxa bor, o‘tkazib yuborildi`);
      continue;
    }
    console.log(`→ #${d.id} ${d.title}: siqilmoqda…`);
    const boshlandi = Date.now();
    try {
      await siq(d.fileName);
      console.log(`  tayyor (${Math.round((Date.now() - boshlandi) / 1000)} s)`);
    } catch (e: any) {
      console.error(`  XATO: ${e?.message || e}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
