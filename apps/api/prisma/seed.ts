import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface Q {
  text: string;
  explanation: string;
  topic: string;
  ticket?: number;
  isNumeric?: boolean;
  isTricky?: boolean;
  options: { t: string; correct?: boolean; wrong?: string }[];
}

const QUESTIONS: Q[] = [
  {
    text: 'Svetoforning qizil signali nimani bildiradi?',
    explanation: 'Qizil signal harakatni taqiqlaydi — haydovchi to‘xtash chizig‘i oldida to‘xtashi shart.',
    topic: 'Svetofor signallari',
    ticket: 1,
    options: [
      { t: 'Harakatni taqiqlaydi', correct: true },
      { t: 'Harakatga ruxsat beradi', wrong: 'Ruxsatni yashil signal beradi.' },
      { t: 'Ehtiyot bo‘lishni bildiradi', wrong: 'Ehtiyotkorlikni sariq signal bildiradi.' },
      { t: 'Faqat piyodalar uchun', wrong: 'Signal barcha uchun amal qiladi.' },
    ],
  },
  {
    text: 'Svetoforning sariq signali yonganda haydovchi nima qilishi kerak?',
    explanation: 'Sariq signal harakatni taqiqlaydi (to‘xtab ulgurmaydigan hollardan tashqari) va signal almashishidan ogohlantiradi.',
    topic: 'Svetofor signallari',
    ticket: 1,
    options: [
      { t: 'To‘xtashga tayyorlanadi va to‘xtaydi', correct: true },
      { t: 'Tezlikni oshiradi', wrong: 'Tezlik oshirish xavfli va taqiqlanadi.' },
      { t: 'E’tibor bermaydi', wrong: 'Signalga bo‘ysunish shart.' },
    ],
  },
  {
    text: 'Aholi punktlarida yengil avtomobil uchun ruxsat etilgan eng katta tezlik qancha?',
    explanation: 'Aholi punktlarida umumiy holatda ruxsat etilgan eng katta tezlik — soatiga 70 km (O‘zbekiston YHQ).',
    topic: 'Tezlik rejimi',
    ticket: 2,
    isNumeric: true,
    options: [
      { t: '70 km/soat', correct: true },
      { t: '60 km/soat', wrong: 'Bu ba’zi davlatlardagi me’yor, O‘zbekistonda 70 km/soat.' },
      { t: '90 km/soat', wrong: 'Bu aholi punktidan tashqaridagi me’yorga yaqin.' },
      { t: '50 km/soat', wrong: 'Bu hovli hududlariga yaqin me’yor.' },
    ],
  },
  {
    text: 'Hovli hududida harakat tezligi qanchadan oshmasligi kerak?',
    explanation: 'Hovli hududlarida tezlik soatiga 20 km dan oshmasligi kerak, piyodalarga ustunlik beriladi.',
    topic: 'Tezlik rejimi',
    isNumeric: true,
    options: [
      { t: '20 km/soat', correct: true },
      { t: '40 km/soat', wrong: 'Bu juda tez, hovlida xavfli.' },
      { t: '30 km/soat', wrong: 'Me’yor 20 km/soat.' },
    ],
  },
  {
    text: 'Chorraha oldida qaysi belgi «asosiy yo‘l»ni bildiradi?',
    explanation: 'Sariq romb (ichi oq) shaklidagi belgi asosiy yo‘lni bildiradi — sizga harakatda ustunlik beriladi.',
    topic: 'Yo‘l belgilari',
    ticket: 2,
    options: [
      { t: 'Sariq romb shaklidagi belgi', correct: true },
      { t: 'Qizil uchburchak', wrong: 'Uchburchak — ogohlantiruvchi belgi.' },
      { t: 'Ko‘k doira', wrong: 'Ko‘k doira — buyuruvchi belgi.' },
    ],
  },
  {
    text: 'Uchburchak shaklidagi qizil hoshiyali belgilar qaysi turkumga kiradi?',
    explanation: 'Uchburchak shaklidagi qizil hoshiyali belgilar — ogohlantiruvchi belgilar; xavf haqida oldindan xabar beradi.',
    topic: 'Yo‘l belgilari',
    options: [
      { t: 'Ogohlantiruvchi belgilar', correct: true },
      { t: 'Taqiqlovchi belgilar', wrong: 'Taqiqlovchilar ko‘pincha doira shaklida.' },
      { t: 'Axborot belgilari', wrong: 'Axborot belgilari to‘rtburchak shaklida.' },
    ],
  },
  {
    text: 'Chorrahada aylanma harakatga kirayotgan haydovchi kimga yo‘l berishi kerak?',
    explanation: 'Umumiy qoidaga ko‘ra aylanma harakatdagi transport vositalariga ustunlik beriladi (belgi bilan tartibga solingan bo‘lsa).',
    topic: 'Chorrahalardan o‘tish',
    isTricky: true,
    options: [
      { t: 'Aylanma harakatdagi transport vositalariga', correct: true },
      { t: 'Hech kimga', wrong: 'Bu holat to‘qnashuvga olib keladi.' },
      { t: 'Faqat piyodalarga', wrong: 'Piyodalardan tashqari aylanmadagilarga ham.' },
    ],
  },
  {
    text: 'Teng ahamiyatli chorrahada haydovchi kimga yo‘l berishi shart?',
    explanation: 'Teng ahamiyatli chorrahada o‘ngdan kelayotgan transport vositasiga yo‘l beriladi («o‘ng qo‘l» qoidasi).',
    topic: 'Chorrahalardan o‘tish',
    ticket: 3,
    isTricky: true,
    options: [
      { t: 'O‘ng tomondan kelayotganga', correct: true },
      { t: 'Chap tomondan kelayotganga', wrong: 'Ustunlik o‘ngdagida.' },
      { t: 'Qarshidan kelayotganga', wrong: 'Qarshidagi bilan qoida boshqacha.' },
    ],
  },
  {
    text: 'Piyodalar o‘tish joyida (svetoforsiz) haydovchi nima qilishi kerak?',
    explanation: 'Belgilangan piyoda o‘tish joyida haydovchi o‘tayotgan yoki o‘tishni boshlagan piyodalarga yo‘l berishi shart.',
    topic: 'Piyodalar va yo‘lovchilar',
    ticket: 3,
    options: [
      { t: 'Piyodalarga yo‘l beradi', correct: true },
      { t: 'Signal berib o‘tib ketadi', wrong: 'Piyodaga ustunlik beriladi.' },
      { t: 'Tezlikni oshiradi', wrong: 'Bu jiddiy qoidabuzarlik.' },
    ],
  },
  {
    text: 'Quruq asfaltda 60 km/soat tezlikda to‘xtash masofasi taxminan qancha bo‘ladi?',
    explanation: 'Reaksiya va tormozlash masofasi hisobga olinganda bu tezlikda to‘xtash masofasi taxminan 40–45 metrni tashkil etadi.',
    topic: 'Xavfsizlik asoslari',
    isNumeric: true,
    isTricky: true,
    options: [
      { t: 'Taxminan 40–45 metr', correct: true },
      { t: 'Taxminan 10 metr', wrong: 'Bu juda kam — reaksiya masofasi ham hisobga olinadi.' },
      { t: 'Taxminan 100 metr', wrong: 'Bu haddan tashqari ko‘p.' },
    ],
  },
  {
    text: 'Haydash paytida xavfsizlik kamari qachon taqilishi shart?',
    explanation: 'Xavfsizlik kamari transport vositasi harakatlanayotgan barcha holatlarda taqilgan bo‘lishi shart.',
    topic: 'Umumiy qoidalar',
    ticket: 1,
    options: [
      { t: 'Har doim, harakat davomida', correct: true },
      { t: 'Faqat trassada', wrong: 'Shaharda ham taqilishi shart.' },
      { t: 'Faqat tez yurganda', wrong: 'Tezlikdan qat’i nazar shart.' },
    ],
  },
  {
    text: 'Yo‘l chetida to‘xtab turgan avtobusni quvib o‘tishda haydovchi nimaga e’tibor berishi kerak?',
    explanation: 'Avtobus oldidan chiqib kelishi mumkin bo‘lgan piyodalarga e’tibor berib, ehtiyotkorlik bilan harakatlanadi.',
    topic: 'Piyodalar va yo‘lovchilar',
    options: [
      { t: 'Avtobus oldidan chiqadigan piyodalarga', correct: true },
      { t: 'Hech narsaga', wrong: 'Piyoda chiqishi xavfli holat.' },
      { t: 'Faqat orqa tomonga', wrong: 'Asosiy xavf old tomonda.' },
    ],
  },
  {
    text: 'Tumanli havoda haydovchi qanday yo‘l tutishi to‘g‘ri?',
    explanation: 'Ko‘rish yomonlashganda tezlikni kamaytirib, yaqin yorug‘lik faralarini yoqib harakatlanadi.',
    topic: 'Xavfsizlik asoslari',
    options: [
      { t: 'Tezlikni kamaytiradi va yaqin faralarni yoqadi', correct: true },
      { t: 'Uzoq nur faralarni yoqadi', wrong: 'Uzoq nur tumanda ko‘rishni yomonlashtiradi.' },
      { t: 'Tezlikni oshiradi', wrong: 'Bu juda xavfli.' },
    ],
  },
  {
    text: 'Temir yo‘l kesishmasiga yaqinlashganda shlagbaum tushayotgan bo‘lsa haydovchi nima qiladi?',
    explanation: 'Shlagbaum holatidan qat’i nazar, u tushayotgan bo‘lsa o‘tish taqiqlanadi — to‘xtash chizig‘i oldida to‘xtaladi.',
    topic: 'Temir yo‘l kesishmalari',
    ticket: 4,
    options: [
      { t: 'To‘xtaydi va o‘tmaydi', correct: true },
      { t: 'Tez o‘tib ketadi', wrong: 'Bu o‘lim xavfi bo‘lgan qo‘pol qoidabuzarlik.' },
      { t: 'Signal beradi', wrong: 'Signal o‘tish huquqini bermaydi.' },
    ],
  },
  {
    text: 'Ko‘k doira ichidagi oq strelka (yo‘nalish) belgisi nimani bildiradi?',
    explanation: 'Ko‘k fonli doira — buyuruvchi belgi; strelka ko‘rsatgan yo‘nalishda harakatlanish majburiyligini bildiradi.',
    topic: 'Yo‘l belgilari',
    options: [
      { t: 'Ko‘rsatilgan yo‘nalishda harakatlanish majburiy', correct: true },
      { t: 'Bu yo‘nalish taqiqlangan', wrong: 'Taqiq qizil rang bilan beriladi.' },
      { t: 'Faqat tavsiya', wrong: 'Buyuruvchi belgi majburiy.' },
    ],
  },
  {
    text: 'Uzluksiz (yaxlit) chiziq bo‘lgan yo‘l belgilanishida nima taqiqlanadi?',
    explanation: 'Uzluksiz chiziqni kesib o‘tish va uning ustidan chiqib obgon qilish taqiqlanadi.',
    topic: 'Yo‘l belgilanishi',
    ticket: 4,
    options: [
      { t: 'Chiziqni kesib o‘tish', correct: true },
      { t: 'Sekin yurish', wrong: 'Tezlik bilan bog‘liq emas.' },
      { t: 'To‘xtash', wrong: 'Taqiq kesib o‘tishga tegishli.' },
    ],
  },
  {
    text: 'Spirtli ichimlik iste’mol qilgan holda transport vositasini boshqarish...',
    explanation: 'Alkogol ta’sirida haydash qat’iyan taqiqlanadi va qonun bilan javobgarlikka tortiladi.',
    topic: 'Umumiy qoidalar',
    options: [
      { t: 'Qat’iyan taqiqlanadi', correct: true },
      { t: 'Oz miqdorda ruxsat', wrong: 'Hech qanday miqdorda ruxsat etilmaydi.' },
      { t: 'Faqat kechqurun taqiqlanadi', wrong: 'Vaqtdan qat’i nazar taqiqlanadi.' },
    ],
  },
  {
    text: 'Burilishdan oldin haydovchi birinchi navbatda nima qilishi kerak?',
    explanation: 'Burilishdan oldin oldindan burilish ko‘rsatkichini (signalni) yoqib, tegishli chetki holatni egallaydi.',
    topic: 'Manyovr qilish',
    ticket: 5,
    options: [
      { t: 'Burilish signalini yoqadi', correct: true },
      { t: 'Tezlikni oshiradi', wrong: 'Manyovrdan oldin tezlik kamaytiriladi.' },
      { t: 'Faralarni o‘chiradi', wrong: 'Faralar bilan bog‘liq emas.' },
    ],
  },
  {
    text: 'Ortga (orqaga) yurish qayerda taqiqlanadi?',
    explanation: 'Piyodalar o‘tish joylari, ko‘priklar, tunnellar va temir yo‘l kesishmalarida orqaga yurish taqiqlanadi.',
    topic: 'Manyovr qilish',
    isTricky: true,
    options: [
      { t: 'Piyoda o‘tish joyi va tunnelda', correct: true },
      { t: 'Faqat trassada', wrong: 'Aksincha, ko‘rsatilgan joylarda taqiqlanadi.' },
      { t: 'Hamma joyda ruxsat', wrong: 'Bir qator joylarda taqiqlanadi.' },
    ],
  },
  {
    text: 'Favqulodda to‘xtash belgisi (avariya to‘xtash) qachon ishlatiladi?',
    explanation: 'Majburiy to‘xtash yoki avariya sodir bo‘lganda boshqa haydovchilarni ogohlantirish uchun avariya signali va to‘xtash belgisi qo‘yiladi.',
    topic: 'Xavfsizlik asoslari',
    ticket: 5,
    options: [
      { t: 'Majburiy to‘xtash yoki avariyada', correct: true },
      { t: 'Har safar to‘xtaganda', wrong: 'Faqat xavf tug‘dirgan holatlarda.' },
      { t: 'Hech qachon', wrong: 'Bu xavfsizlik uchun zarur.' },
    ],
  },
];

const SIGNS = [
  { category: 'Ogohlantiruvchi', name: 'Notekis yo‘l', description: 'Yo‘l qoplamasi notekis — tezlikni kamaytiring.' },
  { category: 'Taqiqlovchi', name: 'Kirish taqiqlangan', description: 'Barcha transport vositalari uchun kirish taqiqlanadi.' },
  { category: 'Buyuruvchi', name: 'To‘g‘riga harakat', description: 'Faqat to‘g‘riga harakatlanishga ruxsat beriladi.' },
  { category: 'Axborot', name: 'Piyodalar o‘tish joyi', description: 'Oldinda belgilangan piyodalar o‘tish joyi bor.' },
  { category: 'Ustunlik', name: 'Asosiy yo‘l', description: 'Siz asosiy yo‘ldasiz — harakatda ustunlik beriladi.' },
];

async function main() {
  console.log('🌱 Seed boshlandi...');

  // Agar baza allaqachon to'ldirilgan bo'lsa — o'tkazib yuboramiz (deploy'da ma'lumot o'chmasligi uchun)
  const existing = await prisma.question.count().catch(() => 0);
  if (existing > 0) {
    console.log(`ℹ️ Baza allaqachon to'ldirilgan (${existing} savol) — seed o'tkazib yuborildi.`);
    return;
  }

  // Tozalash (qayta ishga tushirishga chidamli)
  await prisma.userAnswer.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.category.deleteMany();
  await prisma.roadSign.deleteMany();
  await prisma.adminUser.deleteMany();

  // Toifalar
  const catB = await prisma.category.create({ data: { code: 'B', name: 'B toifasi (yengil avtomobil)' } });
  await prisma.category.create({ data: { code: 'C', name: 'C toifasi (yuk avtomobili)' } });

  // Mavzular
  const topicNames = [...new Set(QUESTIONS.map((q) => q.topic))];
  const topicMap = new Map<string, number>();
  for (let i = 0; i < topicNames.length; i++) {
    const t = await prisma.topic.create({ data: { name: topicNames[i], order: i } });
    topicMap.set(topicNames[i], t.id);
  }

  // Biletlar (1..5)
  const ticketMap = new Map<number, number>();
  for (let i = 1; i <= 5; i++) {
    const t = await prisma.ticket.create({ data: { name: `${i}-bilet`, order: i, categoryId: catB.id } });
    ticketMap.set(i, t.id);
  }

  // Savollar
  for (const q of QUESTIONS) {
    await prisma.question.create({
      data: {
        textLat: q.text,
        explanation: q.explanation,
        categoryId: catB.id,
        topicId: topicMap.get(q.topic) ?? null,
        ticketId: q.ticket ? ticketMap.get(q.ticket) ?? null : null,
        isNumeric: !!q.isNumeric,
        isTricky: !!q.isTricky,
        options: {
          create: q.options.map((o, i) => ({
            textLat: o.t,
            isCorrect: !!o.correct,
            wrongReason: o.wrong ?? null,
            order: i,
          })),
        },
      },
    });
  }

  // Yo'l belgilari
  for (const s of SIGNS) await prisma.roadSign.create({ data: s });

  // Admin
  await prisma.adminUser.create({
    data: { login: 'admin', passwordHash: bcrypt.hashSync('admin123', 10), role: 'superadmin' },
  });

  console.log(`✅ Seed tugadi: ${QUESTIONS.length} savol, ${topicNames.length} mavzu, 5 bilet, ${SIGNS.length} belgi.`);
  console.log('   Admin: login=admin, parol=admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
