import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Q {
  text: string;
  explanation: string;
  topic: string;
  isNumeric?: boolean;
  isTricky?: boolean;
  options: { t: string; correct?: boolean; wrong?: string }[];
}

const MORE: Q[] = [
  { text: 'Svetoforning sariq signali yonganda haydovchi nima qilishi kerak?', explanation: 'Sariq signal harakatni taqiqlaydi va signal almashishidan ogohlantiradi; to‘xtash chizig‘i oldida to‘xtaydi.', topic: 'Svetofor signallari', options: [{ t: 'To‘xtashga tayyorlanadi va to‘xtaydi', correct: true }, { t: 'Tezlikni oshiradi', wrong: 'Sariqda tezlik oshirilmaydi.' }, { t: 'E’tibor bermaydi', wrong: 'Sariq signalga rioya qilish shart.' }] },
  { text: 'Aholi punktlarida umumiy holatda ruxsat etilgan eng katta tezlik qancha?', explanation: 'Aholi punktida umumiy holatda ruxsat etilgan eng katta tezlik — soatiga 70 km.', topic: 'Tezlik rejimi', isNumeric: true, options: [{ t: '70 km/soat', correct: true }, { t: '90 km/soat', wrong: 'Bu shahardan tashqari yo‘l uchun.' }, { t: '60 km/soat', wrong: 'Norma 70 km/soat.' }, { t: '100 km/soat', wrong: 'Juda yuqori.' }] },
  { text: 'Hovli hududida harakat tezligi qanchadan oshmasligi kerak?', explanation: 'Hovli hududida tezlik soatiga 20 km dan oshmasligi kerak.', topic: 'Tezlik rejimi', isNumeric: true, options: [{ t: '20 km/soat', correct: true }, { t: '40 km/soat', wrong: 'Ko‘p.' }, { t: '30 km/soat', wrong: 'Ko‘p.' }] },
  { text: 'Yo‘l chetida qizil doira ichida oq to‘rtburchak (kirish taqiqlangan) belgisi nimani bildiradi?', explanation: '“Kirish taqiqlangan” belgisi barcha transport vositalarining shu yo‘nalishda harakatlanishini taqiqlaydi.', topic: 'Yo‘l belgilari', options: [{ t: 'Barcha transport vositalari kirishi taqiqlanadi', correct: true }, { t: 'Faqat yuk mashinalari kira olmaydi', wrong: 'Barchasi uchun taqiq.' }, { t: 'Ehtiyot bo‘lish kerak', wrong: 'Bu taqiqlovchi belgi.' }] },
  { text: 'Piyodalar o‘tish joyida piyoda yo‘lni kesib o‘tayotgan bo‘lsa haydovchi nima qiladi?', explanation: 'Belgilangan piyoda o‘tish joyida haydovchi piyodaga yo‘l berib, to‘xtashi shart.', topic: 'Piyodalar', options: [{ t: 'To‘xtab, piyodaga yo‘l beradi', correct: true }, { t: 'Signal berib o‘tib ketadi', wrong: 'Piyodaning ustunligi bor.' }, { t: 'Tezlashadi', wrong: 'Bu xavfli va taqiqlangan.' }] },
  { text: 'Obgon (quvib o‘tish) qaysi holatda taqiqlanadi?', explanation: 'Piyoda o‘tish joylarida, ko‘priklarda, tunnellarda va temir yo‘l kesishmalarida obgon taqiqlanadi.', topic: 'Obgon', isTricky: true, options: [{ t: 'Piyoda o‘tish joyi va tunnelda', correct: true }, { t: 'Faqat tunda', wrong: 'Vaqtga bog‘liq emas.' }, { t: 'Hamma joyda ruxsat', wrong: 'Bir qator joylarda taqiqlanadi.' }] },
  { text: 'Chorraha oldida qaysi belgi «asosiy yo‘l»ni bildiradi?', explanation: '“Asosiy yo‘l” belgisi sariq romb shaklida bo‘lib, harakatda ustunlik berilishini bildiradi.', topic: 'Yo‘l belgilari', options: [{ t: 'Sariq romb shaklidagi belgi', correct: true }, { t: 'Qizil uchburchak', wrong: 'Bu ogohlantiruvchi.' }, { t: 'Ko‘k doira', wrong: 'Bu buyuruvchi belgi.' }] },
  { text: 'Yaqin yorug‘lik faralari qachon yoqiladi?', explanation: 'Qorong‘i vaqtda, tunnellarda va ko‘rish yomonlashganda yaqin (yoki uzoq) yorug‘lik faralari yoqiladi.', topic: 'Tashqi yorug‘lik', options: [{ t: 'Qorong‘i vaqt va tunnelda', correct: true }, { t: 'Faqat yomg‘irda', wrong: 'Nafaqat.' }, { t: 'Hech qachon', wrong: 'Yorug‘lik majburiy.' }] },
  { text: 'Chorrahada svetofor ishlamayotgan bo‘lsa (o‘chiq), harakat qanday tartibga solinadi?', explanation: 'Svetofor ishlamasa yoki sariq milt-milt yonsa, chorraha teng ahamiyatli hisoblanadi yoki belgilar bo‘yicha harakatlaniladi.', topic: 'Chorrahalar', isTricky: true, options: [{ t: 'Yo‘l belgilari va ustunlik qoidasi bo‘yicha', correct: true }, { t: 'Hamma to‘xtaydi', wrong: 'Bu shart emas.' }, { t: 'Kim tez bo‘lsa o‘tadi', wrong: 'Bu qoidabuzarlik.' }] },
  { text: 'Temir yo‘l kesishmasiga shlagbaum tushayotganda haydovchi nima qiladi?', explanation: 'Shlagbaum tushayotgan bo‘lsa o‘tish taqiqlanadi; to‘xtash chizig‘i oldida to‘xtaladi.', topic: 'Temir yo‘l kesishmalari', options: [{ t: 'To‘xtaydi va o‘tmaydi', correct: true }, { t: 'Tez o‘tib ketadi', wrong: 'O‘lim xavfi bor.' }, { t: 'Signal beradi', wrong: 'Signal o‘tish huquqini bermaydi.' }] },
  { text: 'Uzluksiz (yaxlit) chiziqni kesib o‘tish mumkinmi?', explanation: 'Uzluksiz chiziqni kesib o‘tish va uning ustidan obgon qilish taqiqlanadi.', topic: 'Yo‘l belgilanishi', options: [{ t: 'Yo‘q, taqiqlanadi', correct: true }, { t: 'Ha, ehtiyotkorlik bilan', wrong: 'Uzluksiz chiziq kesilmaydi.' }, { t: 'Faqat kechasi', wrong: 'Vaqtga bog‘liq emas.' }] },
  { text: 'Spirtli ichimlik iste’mol qilib transport boshqarish...', explanation: 'Alkogol ta’sirida haydash qat’iyan taqiqlanadi va javobgarlikka tortiladi.', topic: 'Umumiy qoidalar', options: [{ t: 'Qat’iyan taqiqlanadi', correct: true }, { t: 'Oz miqdorda ruxsat', wrong: 'Hech qanday miqdorda mumkin emas.' }, { t: 'Faqat kechqurun taqiqlanadi', wrong: 'Vaqtga bog‘liq emas.' }] },
  { text: 'Burilishdan oldin haydovchi birinchi navbatda nima qiladi?', explanation: 'Burilishdan oldin oldindan burilish ko‘rsatkichini yoqib, tegishli chetki holatni egallaydi.', topic: 'Manyovr qilish', options: [{ t: 'Burilish signalini yoqadi', correct: true }, { t: 'Tezlikni oshiradi', wrong: 'Manyovrdan oldin tezlik kamaytiriladi.' }, { t: 'Faralarni o‘chiradi', wrong: 'Aloqasi yo‘q.' }] },
  { text: 'Orqaga yurish qayerda taqiqlanadi?', explanation: 'Piyoda o‘tish joylari, ko‘priklar, tunnellar va temir yo‘l kesishmalarida orqaga yurish taqiqlanadi.', topic: 'Manyovr qilish', isTricky: true, options: [{ t: 'Piyoda o‘tish joyi va tunnelda', correct: true }, { t: 'Faqat trassada', wrong: 'Aksincha.' }, { t: 'Hamma joyda ruxsat', wrong: 'Bir qator joylarda taqiqlanadi.' }] },
  { text: 'Ikki tomonlama harakatli yo‘lda o‘rtada uzuq chiziq nimani bildiradi?', explanation: 'Uzuq chiziq qarama-qarshi oqimlarni ajratadi va kesib o‘tishga ruxsat beradi (obgon uchun).', topic: 'Yo‘l belgilanishi', options: [{ t: 'Chiziqni kesib o‘tish mumkin', correct: true }, { t: 'Kesib o‘tish taqiqlanadi', wrong: 'Uzuq chiziq ruxsat beradi.' }, { t: 'To‘xtash joyi', wrong: 'Aloqasi yo‘q.' }] },
  { text: 'Yo‘lda «Bolalar» ogohlantiruvchi belgisi o‘rnatilgan joyda haydovchi nima qiladi?', explanation: 'Bu belgi yaqinda bolalar bo‘lishi mumkinligidan ogohlantiradi; ehtiyotkorlik va tezlikni kamaytirish talab qilinadi.', topic: 'Yo‘l belgilari', options: [{ t: 'Ehtiyot bo‘ladi va tezlikni kamaytiradi', correct: true }, { t: 'Signal chalib o‘tadi', wrong: 'Ehtiyotkorlik kerak.' }, { t: 'E’tibor bermaydi', wrong: 'Belgi majburiy.' }] },
  { text: 'Avtomobilda old o‘rindiqda xavfsizlik kamari...', explanation: 'Xavfsizlik kamari mavjud bo‘lsa, uni taqish barcha o‘rindiqlar uchun majburiy.', topic: 'Umumiy qoidalar', options: [{ t: 'Taqilishi shart', correct: true }, { t: 'Ixtiyoriy', wrong: 'Majburiy.' }, { t: 'Faqat trassada', wrong: 'Har doim.' }] },
  { text: 'Chorrahada bir vaqtda kelgan teng ahamiyatli yo‘llarda ustunlik kimga beriladi?', explanation: 'Teng ahamiyatli chorrahada o‘ngdan yaqinlashayotgan transportga yo‘l beriladi (“o‘ng qo‘l” qoidasi).', topic: 'Ustunlik', isTricky: true, options: [{ t: 'O‘ngdan kelayotgan transportga', correct: true }, { t: 'Chapdan kelayotganga', wrong: 'Qoida — o‘ng qo‘l.' }, { t: 'Kim katta bo‘lsa', wrong: 'Bunday qoida yo‘q.' }] },
  { text: 'Tumanli havoda harakatlanishda qanday yo‘l tutiladi?', explanation: 'Ko‘rish yomonlashganda tezlik kamaytiriladi va yaqin yorug‘lik (yoki tuman) faralari yoqiladi.', topic: 'Xavfsizlik asoslari', options: [{ t: 'Tezlik kamaytiriladi, yaqin faralar yoqiladi', correct: true }, { t: 'Uzoq nur yoqiladi', wrong: 'Tumanda ko‘rishni yomonlashtiradi.' }, { t: 'Tezlik oshiriladi', wrong: 'Juda xavfli.' }] },
  { text: 'Piyodalar uchun chiqish va tushish maydonchasi bo‘lmagan to‘xtash joyi qayerda?', explanation: 'Bunday sharoitda piyodalar transportga yo‘l yoqasi yoki qatnov qismi tomonidan chiqib-tushadilar (xavf tug‘dirmasa).', topic: 'Piyodalar', isTricky: true, options: [{ t: 'Yo‘l yoqasi yoki qatnov qismi tomonidan', correct: true }, { t: 'Faqat trotuar tomonidan', wrong: 'Bu holda imkonsiz.' }, { t: 'Faqat orqa tomondan', wrong: 'Noto‘g‘ri.' }] },
  { text: 'Transport vositasining texnik nosozligi qaysi holatda harakatni taqiqlaydi?', explanation: 'Tormoz tizimi yoki rul boshqaruvi nosoz bo‘lsa harakatlanish qat’iyan taqiqlanadi.', topic: 'Texnik holat', options: [{ t: 'Tormoz yoki rul nosoz bo‘lsa', correct: true }, { t: 'Radio ishlamasa', wrong: 'Xavfsizlikka aloqasi yo‘q.' }, { t: 'Konditsioner nosoz bo‘lsa', wrong: 'Harakatga to‘sqinlik qilmaydi.' }] },
  { text: 'Yo‘lda «STOP» (to‘xtashsiz harakat taqiqlangan) belgisi o‘rnatilgan bo‘lsa haydovchi...', explanation: '“STOP” belgisida to‘xtash chizig‘i (yoki chorraha chekkasi) oldida majburiy to‘xtab, keyin harakatlanadi.', topic: 'Yo‘l belgilari', options: [{ t: 'Majburiy to‘xtaydi, so‘ng harakatlanadi', correct: true }, { t: 'Sekinlashadi va o‘tadi', wrong: 'To‘xtash majburiy.' }, { t: 'To‘xtamay o‘tadi', wrong: 'Qoidabuzarlik.' }] },
  { text: 'Yo‘l harakatida ustunlikka ega bo‘lgan maxsus transport (tez yordam, o‘t o‘chirish) maxsus signal bilan kelsa...', explanation: 'Ko‘k chiroq va tovushli signal bilan kelayotgan maxsus transportga yo‘l bo‘shatib berish shart.', topic: 'Ustunlik', options: [{ t: 'Yo‘l bo‘shatib beriladi', correct: true }, { t: 'E’tibor berilmaydi', wrong: 'Ular ustunlikka ega.' }, { t: 'Signal chalinadi', wrong: 'Yo‘l berish kerak.' }] },
  { text: 'Qatnov qismida to‘xtab turgan avtobusdan chiqqan piyodalarga nisbatan haydovchi...', explanation: 'Bolalar guruhi yoki belgilangan joylarda piyodalarga ehtiyot bo‘lish va yo‘l berish talab qilinadi.', topic: 'Piyodalar', options: [{ t: 'Ehtiyot bo‘ladi va zarurda yo‘l beradi', correct: true }, { t: 'Tezlashadi', wrong: 'Xavfli.' }, { t: 'Signal berib o‘tadi', wrong: 'Ehtiyotkorlik kerak.' }] },
  { text: 'Yo‘l belgilanishidagi «zebra» nimani anglatadi?', explanation: 'Ko‘ndalang oq chiziqlar (zebra) — belgilangan piyoda o‘tish joyi.', topic: 'Yo‘l belgilanishi', options: [{ t: 'Piyoda o‘tish joyi', correct: true }, { t: 'To‘xtash taqiqlangan joy', wrong: 'Noto‘g‘ri.' }, { t: 'Avtoturargoh', wrong: 'Noto‘g‘ri.' }] },
  { text: 'Ko‘k fonli doira ichidagi oq strelka nimani bildiradi?', explanation: 'Ko‘k doira — buyuruvchi belgi; strelka ko‘rsatgan yo‘nalishda harakatlanish majburiy.', topic: 'Yo‘l belgilari', options: [{ t: 'Ko‘rsatilgan yo‘nalishda harakatlanish majburiy', correct: true }, { t: 'Bu yo‘nalish taqiqlangan', wrong: 'Taqiq qizil bilan beriladi.' }, { t: 'Faqat tavsiya', wrong: 'Buyuruvchi belgi majburiy.' }] },
  { text: 'Shahardan tashqari yo‘lda yengil avtomobil uchun eng katta tezlik qancha?', explanation: 'Shahardan tashqari yo‘llarda yengil avtomobil uchun eng katta tezlik — soatiga 100 km (agar belgi cheklamasa).', topic: 'Tezlik rejimi', isNumeric: true, options: [{ t: '100 km/soat', correct: true }, { t: '70 km/soat', wrong: 'Bu aholi punkti uchun.' }, { t: '120 km/soat', wrong: 'Ruxsat etilmagan.' }, { t: '90 km/soat', wrong: 'Yuk avtomobili uchun.' }] },
  { text: 'Chorrahaga sariq milt-milt signal yonib turgan svetofor o‘rnatilgan bo‘lsa u nimani bildiradi?', explanation: 'Sariq milt-milt signal — svetofor tartibga solmaydi; chorraha belgilangan yoki teng ahamiyatli qoidalar bo‘yicha o‘tiladi.', topic: 'Svetofor signallari', isTricky: true, options: [{ t: 'Svetofor tartibga solmaydi, ehtiyot bo‘lish kerak', correct: true }, { t: 'Harakat taqiqlangan', wrong: 'Taqiq emas.' }, { t: 'Tezlik oshiriladi', wrong: 'Aksincha.' }] },
  { text: 'Transport vositasini to‘xtatib turish (turish) qayerda taqiqlanadi?', explanation: 'Piyoda o‘tish joyida va undan 5 metr masofada, chorraha yaqinida turish taqiqlanadi.', topic: 'To‘xtash va turish', options: [{ t: 'Piyoda o‘tish joyi va uning yaqinida', correct: true }, { t: 'Avtoturargohda', wrong: 'Aksincha, ruxsat.' }, { t: 'Yo‘l chetida', wrong: 'Umumiy holatda ruxsat.' }] },
  { text: 'Yo‘lda «Aylanma harakat» belgisi nimani anglatadi?', explanation: 'Ko‘k doira ichidagi aylanma strelkalar — faqat ko‘rsatilgan aylanma yo‘nalishda harakatlanishni bildiradi.', topic: 'Yo‘l belgilari', options: [{ t: 'Ko‘rsatilgan aylanma yo‘nalishda harakat', correct: true }, { t: 'To‘xtash joyi', wrong: 'Noto‘g‘ri.' }, { t: 'Harakat taqiqlangan', wrong: 'Buyuruvchi belgi.' }] },
  { text: 'Haydovchi yo‘lda favqulodda to‘xtaganda (avariya) nima qiladi?', explanation: 'Avariya signalini yoqib, belgilangan masofada favqulodda to‘xtash belgisini o‘rnatadi.', topic: 'Xavfsizlik asoslari', options: [{ t: 'Avariya signali yoqib, to‘xtash belgisi qo‘yadi', correct: true }, { t: 'Hech narsa qilmaydi', wrong: 'Boshqalarni ogohlantirish shart.' }, { t: 'Yo‘lda yuguradi', wrong: 'Xavfli.' }] },
  { text: 'Qizil uchburchak ichidagi belgilar qanday belgilar hisoblanadi?', explanation: 'Qizil hoshiyali uchburchak belgilar — ogohlantiruvchi belgilar.', topic: 'Yo‘l belgilari', options: [{ t: 'Ogohlantiruvchi belgilar', correct: true }, { t: 'Buyuruvchi belgilar', wrong: 'Ular ko‘k doira.' }, { t: 'Axborot belgilari', wrong: 'Ular ko‘k to‘rtburchak.' }] },
  { text: 'Yo‘lovchi tashishda bolalarni old o‘rindiqda tashish...', explanation: '12 yoshgacha bolalarni maxsus moslama bo‘lmasa old o‘rindiqda tashish taqiqlanadi.', topic: 'Umumiy qoidalar', isTricky: true, options: [{ t: 'Maxsus moslamasiz taqiqlanadi', correct: true }, { t: 'Har doim ruxsat', wrong: 'Cheklovlar bor.' }, { t: 'Faqat kechasi', wrong: 'Vaqtga bog‘liq emas.' }] },
  { text: 'Yomg‘irli va sirpanchiq yo‘lda haydovchi qanday harakatlanadi?', explanation: 'Sirpanchiq yo‘lda tezlik kamaytiriladi va oldindagi transport bilan masofa oshiriladi.', topic: 'Xavfsizlik asoslari', options: [{ t: 'Tezlikni kamaytiradi, masofani oshiradi', correct: true }, { t: 'Keskin tormozlaydi', wrong: 'Sirpanishga olib keladi.' }, { t: 'Tezlashadi', wrong: 'Xavfli.' }] },
  { text: 'Chorrahada chapga burilishda haydovchi kimga yo‘l beradi?', explanation: 'Chapga burilayotganda qarama-qarshi to‘g‘riga yoki o‘ngga ketayotgan transportga yo‘l beriladi.', topic: 'Ustunlik', isTricky: true, options: [{ t: 'Qarama-qarshi to‘g‘riga ketayotganga', correct: true }, { t: 'Hech kimga', wrong: 'Ustunlik qarshi oqimda.' }, { t: 'Orqadagiga', wrong: 'Noto‘g‘ri.' }] },
  { text: 'Yo‘l belgisi «Yo‘l berish» (teskari uchburchak) nimani talab qiladi?', explanation: '“Yo‘l berish” belgisi kesib o‘tilayotgan yo‘ldagi transportga ustunlik berishni talab qiladi.', topic: 'Yo‘l belgilari', options: [{ t: 'Boshqa yo‘ldagi transportga yo‘l berish', correct: true }, { t: 'Majburiy to‘xtash', wrong: 'Bu STOP belgisi.' }, { t: 'Tezlik oshirish', wrong: 'Noto‘g‘ri.' }] },
  { text: 'Tunnel ichida harakatlanishda qanday qoidaga rioya qilinadi?', explanation: 'Tunnelda yaqin yorug‘lik faralari yoqiladi, to‘xtash va obgon taqiqlanadi.', topic: 'Xavfsizlik asoslari', options: [{ t: 'Faralar yoqiladi, obgon taqiqlanadi', correct: true }, { t: 'Faralar o‘chiriladi', wrong: 'Aksincha.' }, { t: 'Obgon qilinadi', wrong: 'Taqiqlanadi.' }] },
  { text: 'Haydovchi haydash chog‘ida qo‘l telefonidan foydalanishi...', explanation: 'Harakat chog‘ida qo‘lda telefondan foydalanish taqiqlanadi (maxsus qurilma bundan mustasno).', topic: 'Umumiy qoidalar', options: [{ t: 'Taqiqlanadi', correct: true }, { t: 'Ruxsat etiladi', wrong: 'Taqiqlangan.' }, { t: 'Faqat qizil chiroqda mumkin', wrong: 'Umuman tavsiya etilmaydi.' }] },
  { text: 'Avtomobil to‘xtatilganda (qatnov qismida) haydovchi eshikni qanday ochadi?', explanation: 'Eshik boshqa harakat ishtirokchilariga xalaqit bermasligi va xavf tug‘dirmasligiga ishonch hosil qilib ochiladi.', topic: 'Umumiy qoidalar', options: [{ t: 'Xavf yo‘qligiga ishonch hosil qilib', correct: true }, { t: 'Darhol keskin ochadi', wrong: 'Xavfli.' }, { t: 'Ochib qo‘yadi', wrong: 'To‘sqinlik qiladi.' }] },
  { text: 'Yo‘l belgisi ko‘k to‘rtburchak ichida «P» harfi nimani bildiradi?', explanation: 'Ko‘k to‘rtburchakdagi “P” — to‘xtab turish (avtoturargoh) joyini bildiradi.', topic: 'Yo‘l belgilari', options: [{ t: 'To‘xtab turish joyi (avtoturargoh)', correct: true }, { t: 'To‘xtash taqiqlangan', wrong: 'Aksincha.' }, { t: 'Piyoda o‘tish joyi', wrong: 'Noto‘g‘ri.' }] },
];

async function main() {
  const catB = await prisma.category.findFirst({ where: { code: 'B' } });
  const catId = catB?.id ?? null;
  let added = 0;
  let skipped = 0;
  for (const q of MORE) {
    const exists = await prisma.question.findFirst({ where: { textLat: q.text } });
    if (exists) {
      skipped++;
      continue;
    }
    let topicId: number | null = null;
    if (q.topic) {
      let t = await prisma.topic.findFirst({ where: { name: q.topic } });
      if (!t) t = await prisma.topic.create({ data: { name: q.topic } });
      topicId = t.id;
    }
    await prisma.question.create({
      data: {
        textLat: q.text,
        explanation: q.explanation,
        categoryId: catId,
        topicId,
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
    added++;
  }
  const total = await prisma.question.count();
  console.log(`✅ Qo'shildi: ${added}, mavjud (o'tkazildi): ${skipped}. Bazada jami: ${total} savol.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
