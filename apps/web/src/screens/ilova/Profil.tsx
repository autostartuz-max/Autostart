import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronRight, Settings, Share2, Trophy, Zap } from 'lucide-react';
import { api, type BallMen } from '../../api';
import LangTheme from '../../components/LangTheme';
import Ekran from '../../ilova/komponentlar/Ekran';
import TepaQator from '../../ilova/komponentlar/TepaQator';
// Ekran sarlavhasi va asosiy karta bo'laklari (qiya chiziqlar, progress) — Bosh sahifa/Testlar bilan bitta manba
import '../../ilova/ekranlar.css';
import '../../ilova/profil.css';

/**
 * Ilova: Profil (/men). Namunada yo'q — Bosh sahifa va Testlar uslubida: ism va daraja
 * (asosiy karta ko'rinishida), ball statistikasi, do'stlarni taklif qilish (promokod),
 * ball qanday yig'ilishi, sozlamalar, til/mavzu va ilova versiyasi.
 * Daraja ma'lumoti /api/ball/men dan keladi; u ishlamasa qolgan qismi baribir ko'rinadi.
 */

// api.me() javobining kerakli qismi (types.ts dagi Me da createdAt va streak yo'q)
interface MeQisqa {
  user: { id: number; firstName: string; createdAt?: string };
  stats?: { streak?: number };
}

const QIYMATLAR: [keyof BallMen['qiymatlar'], string][] = [
  ['javob', 'Savolga birinchi marta to‘g‘ri javob'],
  ['faollik', 'Kunlik faollik (kunning birinchi javobi)'],
  ['shablon', 'Shablonni yiqilmasdan tugatish (3 tadan kam xato)'],
  ['imtihon', 'Real imtihondan o‘tish'],
  ['video', 'Avtodrom videosini oxirigacha ko‘rish'],
  ['oktagonJang', 'Bellashuvda jang'],
  ['oktagonGalaba', 'Bellashuvda g‘alaba (qo‘shimcha)'],
  ['taklif', 'Taklif qilgan do‘stingiz maktabga yozilsa'],
];

/** Coin belgisi: oltinrang tanga, ichida "A" (Autostart) */
export function Tanga({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#e0a100" />
      <circle cx="12" cy="11.4" r="9.6" fill="#ffd23f" />
      <circle cx="12" cy="11.4" r="7.4" fill="none" stroke="#e8ae00" strokeWidth="1.2" />
      <path d="M12 6.6 15.6 16h-2.1l-.7-2h-1.6l-.7 2H8.4Zm0 3.4-.6 2.3h1.2Z" fill="#9a6400" />
    </svg>
  );
}

// Minglar bo'sh joy bilan: 1500 → "1 500"
const raqam = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Profil statistikasi: yuqorida yozuv, pastda belgi va son (Coin balansi, Reyting, ...) */
function Stat({ yozuv, ikonka, son }: { yozuv: string; ikonka: ReactNode; son: ReactNode }) {
  return (
    <div className="ilv-pr-stat">
      <span className="ilv-pr-stat-yozuv">{yozuv}</span>
      <b className="ilv-pr-stat-son">{ikonka}{son}</b>
    </div>
  );
}

export default function ProfilIlova() {
  const nav = useNavigate();
  const [me, setMe] = useState<MeQisqa | null>(null);
  const [ball, setBall] = useState<BallMen | null>(null);
  // Ball kelmadi: 'tarmoq' — qayta urinish tugmasi; 'yoq' — server eski (404), daraja qismi jimgina yo'q
  const [ballXato, setBallXato] = useState<'' | 'tarmoq' | 'yoq'>('');
  const [xabar, setXabar] = useState('');
  // Ilova versiyasi — telefonda qaysi build o'rnatilganini bilish uchun
  const [versiya, setVersiya] = useState('');

  const ballYukla = useCallback(() => {
    setBallXato('');
    api.ballMen().then(setBall).catch((e: any) => setBallXato(e?.status === 404 ? 'yoq' : 'tarmoq'));
  }, []);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    ballYukla();
    import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then((i) => setVersiya(i.version))
      .catch(() => {});
  }, [ballYukla]);

  const ulash = async (kod: string) => {
    const matn = `Autostart ilovasida ro‘yxatdan o‘tishda promokodimni kiriting: ${kod}\nAutostart maktabiga yozilsangiz — chegirma olasiz.`;
    setXabar('');
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Autostart promokodi', text: matn, dialogTitle: 'Do‘stingizga yuboring' });
    } catch (e: any) {
      if (/cancel/i.test(String(e?.message || ''))) return; // foydalanuvchi o'zi yopdi
      // Ulashish oynasi yo'q (brauzer) — matn buferga
      try {
        await navigator.clipboard.writeText(matn);
        setXabar('Matn nusxalandi — do‘stingizga yuboring');
      } catch {
        setXabar('Kodni do‘stingizga ayting: ' + kod);
      }
    }
  };

  const ism = me?.user.firstName || ball?.ism || '';
  const id = me?.user.id ?? ball?.id;
  const qoshilgan = me?.user.createdAt || ball?.qoshilgan;
  const yil = qoshilgan ? new Date(qoshilgan).getFullYear() : NaN;
  const harf = (Array.from(ism.trim())[0] || '').toUpperCase();
  // Bosh sahifadagi "N kun" chipi bilan bir xil manba (chip shu sahifaga olib keladi)
  const streak = me?.stats?.streak ?? ball?.streak ?? 0;

  const d = ball?.daraja;
  const keyingi = d?.keyingi ?? null;
  const oraliq = d && keyingi ? keyingi.dan - d.dan : 0;
  const ulush = !ball || !d ? 0 : !keyingi || oraliq <= 0 ? 1 : Math.min(1, Math.max(0, (ball.ball - d.dan) / oraliq));
  const qoldi = ball && keyingi ? Math.max(0, keyingi.dan - ball.ball) : 0;
  const taklifBall = ball?.qiymatlar?.taklif;

  return (
    <Ekran faol="profil">
      <TepaQator
        ong={
          <button type="button" className="ilv-qidiruv ilv-pr-tepa-tugma" onClick={() => nav('/profil')} aria-label="Sozlamalar">
            <Settings aria-hidden="true" />
          </button>
        }
      />
      <h1 className="ilv-ekran-sarlavha">Profil</h1>

      {/* Ism va daraja — bosh sahifadagi asosiy karta ko'rinishida (chiziqlar bu yerda harakatsiz) */}
      <section className={'ilv-pr-daraja' + (ball && d ? '' : ' ilv-pr-daraja-qisqa')}>
        <span className="ilv-asosiy-chiziq ilv-ani" aria-hidden="true" />
        <div className="ilv-pr-kim">
          <span className="ilv-pr-avatar" aria-hidden="true">{harf}</span>
          <div className="ilv-pr-kim-t">
            <b className="ilv-pr-ism">{ism}</b>
            {id != null && (
              <span className="ilv-pr-id">
                ID: {id}{Number.isFinite(yil) ? ` · ${yil}-yildan beri a’zo` : ''}
              </span>
            )}
          </div>
        </div>
        {ball && d && (
          <>
            <div className="ilv-asosiy-sarlavha">{d.nom}</div>
            <div className="ilv-pr-keyingi">{keyingi ? `Keyingi daraja: ${keyingi.nom}` : 'Eng yuqori daraja'}</div>
            <div className="ilv-pr-past">
              <div className="ilv-asosiy-sonlar">
                <span>{keyingi ? `${raqam(ball.ball)} / ${raqam(keyingi.dan)} coin` : `${raqam(ball.ball)} coin`}</span>
                {keyingi && <span>{raqam(qoldi)} coin qoldi</span>}
              </div>
              <div
                className="ilv-asosiy-progress"
                role="progressbar"
                aria-label={keyingi ? `${keyingi.nom} darajasigacha` : d.nom}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ulush * 100)}
              >
                <span className="ilv-asosiy-tola" style={{ width: `${ulush * 100}%` }} />
              </div>
            </div>
          </>
        )}
      </section>

      {ballXato === 'tarmoq' && (
        <div className="ilv-pr-xato" role="status">
          <span>Daraja va coin ma’lumotini yuklab bo‘lmadi</span>
          <button type="button" className="ilv-pr-xato-tugma" onClick={ballYukla}>Qayta urinish</button>
        </div>
      )}

      {ball && (
        <div className="ilv-pr-statlar">
          <Stat yozuv="Coin balansi" ikonka={<Tanga className="ilv-pr-stat-ik" />} son={raqam(ball.ball)} />
          <Stat
            yozuv="Reyting o‘rni"
            ikonka={<Trophy className="ilv-pr-stat-ik ilv-pr-stat-kubok" aria-hidden="true" />}
            son={ball.orin != null ? `#${raqam(ball.orin)}` : '—'}
          />
          <Stat yozuv="Faollik" ikonka={<Zap className="ilv-pr-stat-ik ilv-pr-stat-chaqmoq" aria-hidden="true" />} son={`${streak} kun`} />
          <Stat
            yozuv="Oxirgi 7 kun"
            ikonka={<CalendarDays className="ilv-pr-stat-ik ilv-pr-stat-kalendar" aria-hidden="true" />}
            son={`+${raqam(ball.oxirgi7)} coin`}
          />
        </div>
      )}

      {ball?.promoKod && (
        <section className="ilv-pr-karta" aria-labelledby="ilv-pr-promo">
          <h2 id="ilv-pr-promo" className="ilv-pr-karta-sarlavha">Do‘stlarni taklif qiling</h2>
          <p className="ilv-pr-matn">
            Do‘stingiz shu promokod bilan ro‘yxatdan o‘tib, Autostart maktabiga yozilsa — chegirma oladi
            {taklifBall ? `, siz esa +${taklifBall} coin.` : '.'}
          </p>
          <div className="ilv-pr-kod-qator">
            {/* data-notr — kirill/rus tilida ham kod o'zgarmasin */}
            <span className="ilv-pr-kod" data-notr>{ball.promoKod}</span>
            <button type="button" className="ilv-pr-ulash" onClick={() => ulash(ball.promoKod!)}>
              <Share2 aria-hidden="true" />
              <span>Ulashish</span>
            </button>
          </div>
          <div className="ilv-pr-sanoq">
            <span><b>{ball.taklif.jami}</b> ro‘yxatdan o‘tdi</span>
            <span><b>{ball.taklif.tasdiqlangan}</b> maktabga yozildi</span>
          </div>
          {xabar && <div className="ilv-pr-xabar" role="status">{xabar}</div>}
        </section>
      )}

      {ball?.qiymatlar && (
        <section className="ilv-pr-karta" aria-labelledby="ilv-pr-qiymat">
          <h2 id="ilv-pr-qiymat" className="ilv-pr-karta-sarlavha">Coin qanday yig‘iladi</h2>
          <ul className="ilv-pr-royxat">
            {QIYMATLAR.filter(([k]) => typeof ball.qiymatlar[k] === 'number').map(([k, nom]) => (
              <li key={k}>
                <span>{nom}</span>
                <b className="ilv-pr-royxat-coin">+{ball.qiymatlar[k]} <Tanga className="ilv-pr-royxat-ik" /></b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="ilv-pr-sozlama" onClick={() => nav('/profil')}>
        <Settings className="ilv-pr-sozlama-ik" aria-hidden="true" />
        <span>Sozlamalar</span>
        <ChevronRight className="ilv-pr-sozlama-strelka" aria-hidden="true" />
      </button>

      {/* Til va mavzu — ilovada yon menyu yo'q, shuning uchun shu yerda */}
      <div className="ilv-pr-til"><LangTheme /></div>
      {versiya && <div className="ilv-pr-versiya">Versiya {versiya}</div>}
    </Ekran>
  );
}
