import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SAVOLLAR_PUBLIC, hasAdmin, canManageQuestions, isOwner, ADMIN_CHANGED } from '../api';
import LangTheme from './LangTheme';
import {
  Home, FileText, BookOpen, CircleAlert, HeartCrack, Heart, TriangleAlert, SignpostBig,
  Video, Info, ChartBar, TrendingUp, Trophy, Settings, LifeBuoy, MessageCircle, Moon,
  ClipboardList, Shuffle, ShieldCheck, ScrollText,
} from 'lucide-react';
import '../dashboard.css';

const TESTLAR = [
  { Icon: FileText, label: 'Shablon testlar', to: '/shablon' },
  { Icon: Shuffle, label: 'Random testlar', to: '/random' },
  { Icon: BookOpen, label: "Mavzular bo'yicha", to: '/mavzular' },
  { Icon: HeartCrack, label: 'Xato qilgan savollarim', to: '/xatolarim', badge: true },
  { Icon: CircleAlert, label: 'Qiyin savollar', to: '/test?mode=tricky' },
  { Icon: Heart, label: 'Sevimlilar', to: '/test?mode=saved' },
];
const ORGANISH = [
  { Icon: TriangleAlert, label: 'Yo‘l harakati qoidalari', to: '/belgilar' },
  { Icon: SignpostBig, label: 'Belgilar', to: '/belgilar' },
  { Icon: SignpostBig, label: "Yo'l belgilari", to: '/belgilar' },
  { Icon: Video, label: 'Videodarslar', to: '/oktagon' },
  { Icon: Info, label: "Foydali ma'lumotlar", to: '/oktagon' },
];
const STAT = [
  { Icon: ChartBar, label: 'Natijalarim', to: '/profil' },
  { Icon: TrendingUp, label: 'Progress', to: '/profil' },
  { Icon: Trophy, label: 'Reyting', to: '/reyting' },
];
const BOSHQA = [
  { Icon: Settings, label: 'Sozlamalar', to: '/profil' },
  { Icon: LifeBuoy, label: 'Yordam / FAQ', to: '/oktagon' },
  { Icon: MessageCircle, label: "Biz bilan bog'lanish", to: '/oktagon' },
  { Icon: ScrollText, label: 'Hujjatlar', to: '/hujjat/maxfiylik' },
];

// Menyu soddalashtirilgan holati (xozircha). Barcha bo'limlarni qaytarish uchun -> false qiling.
// Ko'rinadi: Bosh sahifa, Shablon testlar, Random testlar, Mavzular bo'yicha,
// Xato qilgan savollarim, Savollar, Boshqa.
const MENU_MINIMAL = true;

interface Props {
  active: string;
  open?: boolean;
  onClose?: () => void;
  wrong?: number;
}

export default function AppSidebar({ active, open = false, onClose, wrong = 0 }: Props) {
  const nav = useNavigate();
  const go = (to: string) => { onClose?.(); nav(to); };

  // Admin holatini REAKTIV kuzatamiz. Asosiy manba — foydalanuvchi roli
  // (/me javobidan keladi); hasAdmin() esa eski AdminUser tokeni bilan
  // kirganlar uchun zaxira. Avval localStorage faqat render paytida bir marta
  // o'qilardi — kirgandan keyin menyu yangilanmasdi.
  // Savollar — owner va admin uchun; rollarni tayinlash — faqat owner uchun.
  // hasAdmin(): eski AdminUser tokeni (zaxira hisob) owner darajasida hisoblanadi.
  const [isAdmin, setIsAdmin] = useState(() => canManageQuestions() || hasAdmin());
  const [owner, setOwner] = useState(() => isOwner() || hasAdmin());
  useEffect(() => {
    const sync = () => {
      setIsAdmin(canManageQuestions() || hasAdmin());
      setOwner(isOwner() || hasAdmin());
    };
    sync();
    window.addEventListener(ADMIN_CHANGED, sync); // shu tabda kirish/chiqish
    window.addEventListener('storage', sync);     // boshqa tab
    window.addEventListener('focus', sync);       // tabga qaytganda
    return () => {
      window.removeEventListener(ADMIN_CHANGED, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // FAQAT ADMIN uchun. Oddiy foydalanuvchi admin panel borligini ham bilmaydi —
  // menyuda unga olib boradigan hech qanday havola ko'rinmaydi.
  // Zaxira yo'l: /savollar manzilini qo'lda yozib, eski admin/parol bilan kirish.
  const showSavollar = isAdmin || SAVOLLAR_PUBLIC;

  const navi = (items: typeof TESTLAR) =>
    items.map((it) => (
      <button key={it.label} className={'db-navi' + (it.to === active ? ' active' : '')} onClick={() => go(it.to)}>
        <it.Icon size={18} /> <span>{it.label}</span>
        {(it as any).badge && wrong > 0 && <span className="nb">{wrong}</span>}
      </button>
    ));

  return (
    <>
      <aside className={'db-side' + (open ? ' open' : '')}>
        <div className="db-logo" data-notr>
          <img src="/mark.png" alt="" className="db-logo-mark" />
          <span className="db-logo-word"><span className="lg-a">AUTO</span><span className="lg-s">START</span></span>
        </div>
        <button className={'db-navi' + (active === '/' ? ' active' : '')} onClick={() => go('/')}>
          <Home size={18} /> <span>Bosh sahifa</span>
        </button>
        <div className="db-sec">Testlar</div>
        {navi(MENU_MINIMAL ? TESTLAR.slice(0, 4) : TESTLAR)}
        {!MENU_MINIMAL && <>
          <div className="db-sec">O‘rganish</div>
          {navi(ORGANISH)}
          <div className="db-sec">Statistika</div>
          {navi(STAT)}
        </>}
        {showSavollar && (
          <>
            <div className="db-sec">Admin</div>
            <button className={'db-navi' + (active === '/savollar' ? ' active' : '')} onClick={() => go('/savollar')}>
              <ClipboardList size={18} /> <span>Savollar</span>
            </button>
            {owner && (
              <button className={'db-navi' + (active === '/foydalanuvchilar' ? ' active' : '')} onClick={() => go('/foydalanuvchilar')}>
                <ShieldCheck size={18} /> <span>Foydalanuvchilar</span>
              </button>
            )}
          </>
        )}
        <div className="db-side-bottom">
          <div className="db-sec">Boshqa</div>
          {navi(BOSHQA)}
          <LangTheme />
        </div>
      </aside>
      {open && <div className="db-backdrop" onClick={onClose} />}
    </>
  );
}
