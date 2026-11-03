import { useId } from 'react';
import './bosh.css';

// Chiroqlar: markaz y, o'chiq va yoniq gradient nomi, animatsiya sinfi.
const CHIROQLAR = [
  { y: 27.5, ochiq: 'qo', yoniq: 'qy', sinf: 'ilv-svetofor-qizil' },
  { y: 59.5, ochiq: 'so', yoniq: 'sy', sinf: 'ilv-svetofor-sariq' },
  { y: 91.5, ochiq: 'yo', yoniq: 'yy', sinf: 'ilv-svetofor-yashil' },
];

/**
 * Real imtihon kartochkasi ikonkasi — svetofor. Namuna: namuna/kartalar/real-imtihon.png
 * Koordinatalar namuna pikselida (1pt = 1.482px); o'lcham va joyni bosh.css beradi.
 * Chiroqlar 3 s da navbat bilan yonadi (qizil → sariq → yashil); statik holatda qizil yoniq.
 */
export default function Svetofor() {
  const id = useId();
  const u = (n: string) => 'url(#' + id + n + ')';
  return (
    <span className="ilv-joy ilv-joy-svetofor" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="0 0 63 138" width="100%" height="100%">
        <defs>
          {/* Korpus: chapda kulrang-ko'kish yaltiroq, o'ngga qorayadi */}
          <linearGradient id={id + 'k'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a4c51" />
            <stop offset="0.012" stopColor="#555a5f" />
            <stop offset="0.025" stopColor="#6a7277" />
            <stop offset="0.04" stopColor="#5f656d" />
            <stop offset="0.1" stopColor="#5e646c" />
            <stop offset="0.15" stopColor="#575d66" />
            <stop offset="0.22" stopColor="#50545b" />
            <stop offset="0.3" stopColor="#44464b" />
            <stop offset="0.38" stopColor="#383a3f" />
            <stop offset="0.405" stopColor="#353739" />
            <stop offset="0.42" stopColor="#2d3340" />
            <stop offset="0.44" stopColor="#2f2e2f" />
            <stop offset="0.53" stopColor="#2b2a29" />
            <stop offset="0.62" stopColor="#272524" />
            <stop offset="0.7" stopColor="#232221" />
            <stop offset="0.78" stopColor="#1f1e1d" />
            <stop offset="0.86" stopColor="#1b1a1b" />
            <stop offset="1" stopColor="#17171a" />
          </linearGradient>
          <linearGradient id={id + 'u'} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a4c51" />
            <stop offset="0.12" stopColor="#5e646c" />
            <stop offset="0.3" stopColor="#45474c" />
            <stop offset="0.5" stopColor="#2d2b2a" />
            <stop offset="0.75" stopColor="#1f1e1d" />
            <stop offset="1" stopColor="#17171a" />
          </linearGradient>
          {/* O'chiq chiroqlar: qizil va yashil to'q kulrang, sariq — to'q zaytun */}
          <radialGradient id={id + 'qo'} cx="0.39" cy="0.34" r="0.7">
            <stop offset="0" stopColor="#252322" />
            <stop offset="0.18" stopColor="#232221" />
            <stop offset="0.36" stopColor="#1f1e1d" />
            <stop offset="0.6" stopColor="#1c1a1b" />
            <stop offset="0.8" stopColor="#171414" />
            <stop offset="1" stopColor="#141212" />
          </radialGradient>
          <radialGradient id={id + 'so'} cx="0.39" cy="0.34" r="0.7">
            <stop offset="0" stopColor="#302e1c" />
            <stop offset="0.64" stopColor="#302e1c" />
            <stop offset="0.7" stopColor="#2a2825" />
            <stop offset="0.8" stopColor="#242322" />
            <stop offset="0.9" stopColor="#1f1e1d" />
            <stop offset="1" stopColor="#1a1919" />
          </radialGradient>
          <radialGradient id={id + 'yo'} cx="0.38" cy="0.33" r="0.7">
            <stop offset="0" stopColor="#2a2825" />
            <stop offset="0.2" stopColor="#292827" />
            <stop offset="0.3" stopColor="#242322" />
            <stop offset="0.52" stopColor="#222120" />
            <stop offset="0.58" stopColor="#1f1e1d" />
            <stop offset="0.76" stopColor="#1d1c1c" />
            <stop offset="0.88" stopColor="#18181a" />
            <stop offset="1" stopColor="#151517" />
          </radialGradient>
          {/* Yoniq chiroqlar: chap yuqorida yaltiroq nuqta */}
          <radialGradient id={id + 'qy'} cx="0.35" cy="0.31" r="0.72">
            <stop offset="0" stopColor="#f7c4c0" />
            <stop offset="0.06" stopColor="#f69598" />
            <stop offset="0.17" stopColor="#f97d7b" />
            <stop offset="0.29" stopColor="#ee655a" />
            <stop offset="0.4" stopColor="#e24f47" />
            <stop offset="0.52" stopColor="#e13937" />
            <stop offset="0.64" stopColor="#d52429" />
            <stop offset="0.75" stopColor="#c0212c" />
            <stop offset="0.87" stopColor="#aa1f2b" />
            <stop offset="1" stopColor="#8c0b16" />
          </radialGradient>
          <radialGradient id={id + 'sy'} cx="0.35" cy="0.31" r="0.72">
            <stop offset="0" stopColor="#fffbd8" />
            <stop offset="0.07" stopColor="#fff3a6" />
            <stop offset="0.17" stopColor="#fee667" />
            <stop offset="0.29" stopColor="#f7dd35" />
            <stop offset="0.4" stopColor="#f4d925" />
            <stop offset="0.52" stopColor="#f0d322" />
            <stop offset="0.64" stopColor="#e8c71c" />
            <stop offset="0.75" stopColor="#d6b516" />
            <stop offset="0.87" stopColor="#c4a213" />
            <stop offset="1" stopColor="#a89014" />
          </radialGradient>
          <radialGradient id={id + 'yy'} cx="0.35" cy="0.31" r="0.72">
            <stop offset="0" stopColor="#eaf6ea" />
            <stop offset="0.06" stopColor="#aae3a8" />
            <stop offset="0.17" stopColor="#7fe481" />
            <stop offset="0.29" stopColor="#53d779" />
            <stop offset="0.4" stopColor="#3cc76e" />
            <stop offset="0.52" stopColor="#2dbe64" />
            <stop offset="0.64" stopColor="#20ae59" />
            <stop offset="0.75" stopColor="#0c9949" />
            <stop offset="0.87" stopColor="#0c8640" />
            <stop offset="1" stopColor="#0a6b32" />
          </radialGradient>
        </defs>
        {/* Ustun kartochka pastki chetidan chiqib ketadi (kartochka kesadi) */}
        <rect x="26.25" y="104" width="10.5" height="34" fill={u('u')} />
        <rect x="5.05" y="6.25" width="52.9" height="106.5" rx="12" fill={u('k')} />
        {CHIROQLAR.map((c) => (
          <g key={c.sinf}>
            <circle cx="31.5" cy={c.y} r="13.6" fill="#121010" />
            <circle cx="31.5" cy={c.y} r="12" fill={u(c.ochiq)} />
            <circle className={'ilv-ani ' + c.sinf} cx="31.5" cy={c.y} r="12" fill={u(c.yoniq)} />
          </g>
        ))}
      </svg>
    </span>
  );
}
