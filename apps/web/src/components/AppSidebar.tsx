import { useNavigate } from 'react-router-dom';
import {
  Home, FileText, BookOpen, CircleAlert, HeartCrack, Heart, TriangleAlert, SignpostBig,
  Video, Info, ChartBar, TrendingUp, Trophy, Settings, LifeBuoy, MessageCircle, Moon,
} from 'lucide-react';
import '../dashboard.css';

const TESTLAR = [
  { Icon: FileText, label: 'Shablon testlar', to: '/shablon' },
  { Icon: BookOpen, label: "Mavzular bo'yicha", to: '/mavzular' },
  { Icon: CircleAlert, label: 'Qiyin savollar', to: '/test?mode=tricky' },
  { Icon: HeartCrack, label: 'Xatolarim', to: '/test?mode=mistakes', badge: true },
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
];

interface Props {
  active: string;
  open?: boolean;
  onClose?: () => void;
  wrong?: number;
}

export default function AppSidebar({ active, open = false, onClose, wrong = 0 }: Props) {
  const nav = useNavigate();
  const go = (to: string) => { onClose?.(); nav(to); };

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
        <div className="db-logo">
          <img src="/mark.png" alt="" className="db-logo-mark" />
          <span className="db-logo-word"><span className="lg-a">AUTO</span><span className="lg-s">START</span></span>
        </div>
        <button className={'db-navi' + (active === '/' ? ' active' : '')} onClick={() => go('/')}>
          <Home size={18} /> <span>Bosh sahifa</span>
        </button>
        <div className="db-sec">Testlar</div>
        {navi(TESTLAR)}
        <div className="db-sec">O‘rganish</div>
        {navi(ORGANISH)}
        <div className="db-sec">Statistika</div>
        {navi(STAT)}
        <div className="db-sec">Boshqa</div>
        {navi(BOSHQA)}
        <div className="db-night"><Moon size={17} /> Tungi rejim <button className="db-toggle" /></div>
      </aside>
      {open && <div className="db-backdrop" onClick={onClose} />}
    </>
  );
}
