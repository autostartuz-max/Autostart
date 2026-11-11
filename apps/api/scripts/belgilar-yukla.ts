/**
 * Yo'l belgilari katalogini (apps/web/src/belgilar/belgilar.json) bazaga yuklash — bir martalik.
 * Har bir belgi raqami — bitta yozuv (1.4.1 — 1.4.6 guruhi 6 ta yozuv, nomi va tavsifi umumiy).
 * Rasm: ilova/sayt ichidagi fayl ("/belgi-rasm/1.1.svg").
 *
 *   npx tsx scripts/belgilar-yukla.ts            — bazada toifali belgi bo'lmasa yuklaydi (eski 5 ta namunani almashtiradi)
 *   npx tsx scripts/belgilar-yukla.ts --majburiy — bor belgilarni o'chirib, qaytadan yuklaydi (admin qo'shganlari ham o'chadi!)
 */
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/prisma';

const JSONF = path.join(__dirname, '../../web/src/belgilar/belgilar.json');

async function main() {
  const majburiy = process.argv.includes('--majburiy');
  const bor = await prisma.roadSign.count({ where: { toifa: { gt: 0 } } });
  if (bor && !majburiy) {
    console.log(`Bazada ${bor} ta belgi bor — yuklanmadi (qaytadan yuklash: --majburiy).`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(JSONF, 'utf8')) as {
    toifalar: { n: number; nom: string }[];
    belgilar: { toifa: number; raqam: string; nom: string; tavsif: string; rasmlar: { raqam: string; fayl: string | null }[] }[];
  };
  const toifaNomi = new Map(data.toifalar.map((t) => [t.n, t.nom]));
  const qatorlar = data.belgilar.flatMap((b) =>
    b.rasmlar.map((r) => ({
      toifa: b.toifa,
      category: toifaNomi.get(b.toifa) || '',
      raqam: r.raqam,
      name: b.nom,
      description: b.tavsif,
      imageUrl: r.fayl ? `/belgi-rasm/${r.fayl}` : null,
    })),
  );
  await prisma.$transaction([prisma.roadSign.deleteMany({}), prisma.roadSign.createMany({ data: qatorlar })]);
  console.log(`Yuklandi: ${qatorlar.length} ta belgi, ${data.toifalar.length} toifa.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
