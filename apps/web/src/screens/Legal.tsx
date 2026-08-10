import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Menu, ShieldCheck, FileText, ScrollText } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import { hasToken } from '../api';
import { TASHKILOT as T, SAQLASH_MUDDATI } from '../legal';
import '../dashboard.css';

/** To'ldirilmagan rekvizit — saytda ko'zga tashlansin */
function R({ v }: { v: string }) {
  return v ? <b>{v}</b> : <mark className="lg-bosh">[to‘ldirilmagan]</mark>;
}

const HUJJATLAR = ['maxfiylik', 'shartlar', 'oferta'] as const;
type Hujjat = (typeof HUJJATLAR)[number];

const SARLAVHA: Record<Hujjat, { t: string; s: string; Ic: typeof ShieldCheck }> = {
  maxfiylik: { t: 'Maxfiylik siyosati', s: 'Shaxsiy ma’lumotlar qanday yig‘iladi va ishlatiladi', Ic: ShieldCheck },
  shartlar: { t: 'Foydalanish shartlari', s: 'Saytdan foydalanish qoidalari', Ic: FileText },
  oferta: { t: 'Ommaviy oferta', s: 'Pullik obuna bo‘yicha shartnoma', Ic: ScrollText },
};

function Rekvizitlar() {
  return (
    <div className="lg-rek">
      <div className="ud-card-h">Rekvizitlar</div>
      <dl className="ud-d-list">
        <div><dt>Tashkilot</dt><dd><R v={T.nom} /></dd></div>
        <div><dt>STIR</dt><dd><R v={T.stir} /></dd></div>
        <div><dt>Manzil</dt><dd><R v={T.manzil} /></dd></div>
        <div><dt>Rahbar</dt><dd><R v={T.rahbar} /></dd></div>
        <div><dt>Bank</dt><dd><R v={T.bank} /></dd></div>
        <div><dt>Hisob raqami</dt><dd><R v={T.hisob} /></dd></div>
        <div><dt>MFO</dt><dd><R v={T.mfo} /></dd></div>
        <div><dt>Telefon</dt><dd><R v={T.telefon} /></dd></div>
        <div><dt>Pochta</dt><dd><R v={T.pochta} /></dd></div>
      </dl>
    </div>
  );
}

function Maxfiylik(): ReactNode {
  return (
    <>
      <p>
        Ushbu siyosat <R v={T.nom} /> (keyingi o‘rinlarda — «Biz») {T.sayt} saytida foydalanuvchilarning
        shaxsiy ma’lumotlarini qanday yig‘ishi, ishlatishi va himoya qilishini tushuntiradi.
        Saytdan foydalanish orqali siz shu shartlarga rozilik bildirasiz.
      </p>

      <h3>1. Qanday ma’lumot yig‘amiz</h3>
      <ul>
        <li><b>Ro‘yxatdan o‘tishda:</b> ism, telefon raqami va/yoki pochta manzili, parol.</li>
        <li><b>Foydalanish jarayonida:</b> yechilgan testlar, berilgan javoblar, natijalar, saqlangan savollar, kirish vaqtlari.</li>
        <li><b>Texnik ma’lumot:</b> IP manzil, brauzer turi — xavfsizlik va suiiste’molning oldini olish uchun.</li>
      </ul>
      <p>
        Parol <b>ochiq holda saqlanmaydi</b> — u kriptografik usulda o‘zgartirilib saqlanadi.
        Bank kartasi ma’lumotlarini biz saqlamaymiz.
      </p>

      <h3>2. Nima uchun ishlatamiz</h3>
      <ul>
        <li>Hisobingizga kirish va uni himoya qilish uchun.</li>
        <li>Test natijalari, statistika va reytingni ko‘rsatish uchun.</li>
        <li>Xizmat sifatini yaxshilash va nosozliklarni tuzatish uchun.</li>
        <li>
          <b>Xabarnomalar va reklama:</b> yangilanishlar, aksiyalar va foydali xabarlarni SMS,
          pochta yoki Telegram orqali yuborish uchun. Bunga ro‘yxatdan o‘tishda alohida rozilik
          berasiz va istalgan vaqtda rad etishingiz mumkin.
        </li>
      </ul>

      <h3>3. Kimga beramiz</h3>
      <p>
        Shaxsiy ma’lumotlaringizni uchinchi shaxslarga <b>sotmaymiz</b>. Ular quyidagi hollardagina
        uzatilishi mumkin: qonun talab qilganda; xizmat ko‘rsatuvchi hamkorlar (to‘lov tizimi,
        SMS va pochta yuborish xizmati, hosting) — faqat o‘z vazifasini bajarish uchun zarur hajmda.
      </p>
      <p>
        Saytda Telegram Mini App texnologiyasi ishlatiladi. Telegram orqali kirsangiz, Telegram
        o‘z siyosati asosida ma’lumot qayta ishlaydi.
      </p>

      <h3>4. Qancha saqlaymiz</h3>
      <p>Ma’lumotlar {SAQLASH_MUDDATI}. Qonun talab qilgan hollarda muddat uzoqroq bo‘lishi mumkin.</p>

      <h3>5. Sizning huquqlaringiz</h3>
      <ul>
        <li>O‘zingiz haqingizdagi ma’lumotni bilish va nusxasini olish.</li>
        <li>Noto‘g‘ri ma’lumotni tuzatishni so‘rash.</li>
        <li>Hisobingizni va ma’lumotlaringizni o‘chirishni so‘rash.</li>
        <li>Reklama xabarlaridan voz kechish.</li>
      </ul>
      <p>Buning uchun <R v={T.pochta} /> ga yozing yoki <R v={T.telefon} /> ga qo‘ng‘iroq qiling.</p>

      <h3>6. Xavfsizlik</h3>
      <p>
        Sayt HTTPS orqali ishlaydi, parollar qaytarib bo‘lmaydigan usulda saqlanadi, ma’lumotlar
        bazasi tashqaridan ochiq emas, kirish urinishlari cheklanadi. Shunga qaramay, internetda
        mutlaq xavfsizlik kafolati mavjud emas — parolingizni hech kimga bermang.
      </p>

      <h3>7. Voyaga yetmaganlar</h3>
      <p>
        Xizmat 16 yoshdan kichik shaxslarga mo‘ljallanmagan. Agar bola ma’lumoti bizga kelib
        qolgani ma’lum bo‘lsa, uni o‘chiramiz.
      </p>

      <h3>8. O‘zgartirishlar</h3>
      <p>
        Siyosat yangilanishi mumkin. Yangilangan sana yuqorida ko‘rsatiladi. Muhim o‘zgarishlar
        haqida saytda xabar beramiz.
      </p>
    </>
  );
}

function Shartlar(): ReactNode {
  return (
    <>
      <p>
        {T.sayt} saytidan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz.
        Rozi bo‘lmasangiz, saytdan foydalanmang.
      </p>

      <h3>1. Xizmat nima</h3>
      <p>
        Sayt yo‘l harakati qoidalari imtihoniga tayyorgarlik uchun test bazasi, izohlar va
        statistika taqdim etadi. Bu <b>o‘quv materiali</b>, rasmiy imtihon natijasini kafolatlamaydi.
      </p>

      <h3>2. Hisob</h3>
      <ul>
        <li>Ro‘yxatdan o‘tishda haqiqiy ma’lumot kiritishingiz kerak.</li>
        <li>Parolni maxfiy saqlash sizning javobgarligingizda. Hisobingizdan qilingan barcha amallar sizniki hisoblanadi.</li>
        <li>Hisobni boshqa shaxsga berish yoki sotish taqiqlanadi.</li>
        <li>Qoidalar buzilsa, hisob ogohlantirishsiz to‘xtatilishi mumkin.</li>
      </ul>

      <h3>3. Taqiqlanadi</h3>
      <ul>
        <li>Savollar bazasini ko‘chirish, nusxalash, tarqatish yoki sotish.</li>
        <li>Saytga avtomatlashtirilgan dastur (bot, parser) bilan murojaat qilish.</li>
        <li>Saytning ishlashiga xalaqit berish, zaiflik izlash, boshqa foydalanuvchilar hisobiga kirishga urinish.</li>
        <li>Xizmatdan qonunga zid maqsadda foydalanish.</li>
      </ul>

      <h3>4. Mualliflik huquqi</h3>
      <p>
        Saytdagi barcha materiallar — savollar, izohlar, rasmlar, dizayn va dastur kodi —
        <R v={T.nom} /> ga tegishli. Yozma ruxsatsiz foydalanish taqiqlanadi.
      </p>

      <h3>5. Javobgarlik chegarasi</h3>
      <p>
        Xizmat «bor holicha» taqdim etiladi. Test natijalari haqiqiy imtihondan o‘tishni
        kafolatlamaydi. Sayt vaqtincha ishlamay qolishi (texnik ishlar, uzilishlar) mumkin.
        Materiallardagi xatolik aniqlansa, uni tuzatamiz — buning uchun «Shikoyat» tugmasidan
        foydalaning.
      </p>

      <h3>6. O‘zgartirishlar</h3>
      <p>
        Shartlar yangilanishi mumkin. Yangilangandan keyin saytdan foydalanishda davom etsangiz,
        yangi shartlarga rozi hisoblanasiz.
      </p>

      <h3>7. Nizolar</h3>
      <p>
        Nizolar muzokara yo‘li bilan hal qilinadi. Kelishuvga erishilmasa, O‘zbekiston Respublikasi
        qonunchiligi asosida ko‘rib chiqiladi.
      </p>
    </>
  );
}

function Oferta(): ReactNode {
  return (
    <>
      <p>
        Ushbu hujjat <R v={T.nom} /> ning {T.sayt} saytida pullik obuna xizmatini taqdim etish
        bo‘yicha <b>ommaviy oferta</b>sidir. To‘lovni amalga oshirish oferta shartlarini to‘liq
        qabul qilish (akseptlash) hisoblanadi.
      </p>

      <h3>1. Atamalar</h3>
      <ul>
        <li><b>Ijrochi</b> — <R v={T.nom} />.</li>
        <li><b>Foydalanuvchi</b> — saytda ro‘yxatdan o‘tgan va obuna sotib olgan shaxs.</li>
        <li><b>Obuna</b> — belgilangan muddat davomida xizmatning pullik imkoniyatlaridan foydalanish huquqi.</li>
      </ul>

      <h3>2. Oferta predmeti</h3>
      <p>
        Ijrochi Foydalanuvchiga yo‘l harakati qoidalari bo‘yicha o‘quv-test xizmatini taqdim etadi,
        Foydalanuvchi esa belgilangan haqni to‘laydi.
      </p>

      <h3>3. Narx va to‘lov</h3>
      <ul>
        <li>Obuna narxi va muddati saytdagi tegishli bo‘limda ko‘rsatiladi.</li>
        <li>To‘lov saytda ko‘rsatilgan to‘lov tizimlari orqali amalga oshiriladi.</li>
        <li>Narx Ijrochi tomonidan o‘zgartirilishi mumkin; o‘zgarish allaqachon to‘langan obunaga ta’sir qilmaydi.</li>
        <li>Xizmat to‘lov tasdiqlangan paytdan boshlab faollashadi.</li>
      </ul>

      <h3>4. Tomonlarning majburiyatlari</h3>
      <p><b>Ijrochi:</b> xizmatni uzluksiz taqdim etishga harakat qiladi, texnik nosozliklarni imkon qadar tez bartaraf etadi, Foydalanuvchi ma’lumotlarini maxfiylik siyosati asosida himoya qiladi.</p>
      <p><b>Foydalanuvchi:</b> haqiqiy ma’lumot kiritadi, hisobini boshqalarga bermaydi, materiallarni ko‘chirmaydi va tarqatmaydi.</p>

      <h3>5. Pulni qaytarish</h3>
      <p>
        Xizmat Ijrochi aybi bilan taqdim etilmagan bo‘lsa, Foydalanuvchi to‘lov qaytarilishini
        so‘rashi mumkin. Murojaat <R v={T.pochta} /> ga yoki <R v={T.telefon} /> raqamiga yuboriladi
        va 10 ish kuni ichida ko‘rib chiqiladi. Obuna faollashtirilgan va xizmatdan foydalanilgan
        bo‘lsa, to‘lov qaytarilmaydi.
      </p>

      <h3>6. Javobgarlik</h3>
      <p>
        Ijrochi imtihondan o‘tishni kafolatlamaydi — xizmat o‘quv xarakteriga ega.
        Foydalanuvchi qoidalarni buzsa, obuna to‘lovni qaytarmasdan bekor qilinishi mumkin.
      </p>

      <h3>7. Amal qilish muddati</h3>
      <p>
        Oferta saytda e’lon qilingan paytdan kuchga kiradi va yangi tahriri e’lon qilingunga qadar
        amal qiladi. Joriy tahrir sanasi: <b>{T.sana}</b>.
      </p>

      <Rekvizitlar />
    </>
  );
}

export default function Legal() {
  const nav = useNavigate();
  const { doc } = useParams();
  const [open, setOpen] = useState(false);

  const kalit: Hujjat = (HUJJATLAR as readonly string[]).includes(doc || '')
    ? (doc as Hujjat)
    : 'maxfiylik';
  const { t, s, Ic } = SARLAVHA[kalit];
  const kirgan = hasToken();

  const mazmun = kalit === 'maxfiylik' ? <Maxfiylik /> : kalit === 'shartlar' ? <Shartlar /> : <Oferta />;

  return (
    <div className="db">
      {kirgan && <AppSidebar active={'/hujjat/' + kalit} open={open} onClose={() => setOpen(false)} />}
      <div className="db-main">
        <header className="db-top">
          {kirgan && <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>}
          <button className="adm-back" onClick={() => nav(kirgan ? '/' : '/kirish')}>
            <ChevronLeft size={18} /> {kirgan ? 'Bosh sahifa' : 'Kirish'}
          </button>
        </header>

        <div className="db-content">
          <div className="adm-head">
            <div className="adm-head-l">
              <span className="lg-ic"><Ic size={20} /></span>
              <div>
                <h1 className="adm-title">{t}</h1>
                <div className="ud-izoh">{s}</div>
              </div>
            </div>
          </div>

          <div className="lg-tabs">
            {HUJJATLAR.map((h) => (
              <button
                key={h}
                className={'ud-seg-b' + (h === kalit ? ' on' : '')}
                onClick={() => nav('/hujjat/' + h)}
              >
                {SARLAVHA[h].t}
              </button>
            ))}
          </div>

          <div className="lg-doc">
            <div className="lg-sana">Oxirgi yangilanish: {T.sana}</div>
            {mazmun}
          </div>
        </div>
      </div>
    </div>
  );
}
