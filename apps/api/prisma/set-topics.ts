// Bir martalik: mavzular jadvalini standart 42 mavzuga o'rnatadi (order 1-42).
// Ishga tushirish (serverda): cd /opt/autostart/apps/api && npx tsx prisma/set-topics.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { STANDARD_TOPICS } from './topics';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 42 standart mavzuni o‘rnatish...');

  // Savollardagi eski mavzu bog'lanishini uzamiz (FK to'sig'i bo'lmasligi uchun)
  const upd = await prisma.question.updateMany({ where: { topicId: { not: null } }, data: { topicId: null } });
  console.log(`  ${upd.count} savoldagi eski mavzu bog'lanishi uzildi`);

  // Eski mavzularni o'chiramiz
  const del = await prisma.topic.deleteMany({});
  console.log(`  ${del.count} eski mavzu o'chirildi`);

  // 42 mavzuni tartib (order 1-42) bilan qo'shamiz
  for (let i = 0; i < STANDARD_TOPICS.length; i++) {
    await prisma.topic.create({ data: { name: STANDARD_TOPICS[i], order: i + 1 } });
  }
  console.log(`✅ ${STANDARD_TOPICS.length} mavzu qo'shildi (order 1-${STANDARD_TOPICS.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
