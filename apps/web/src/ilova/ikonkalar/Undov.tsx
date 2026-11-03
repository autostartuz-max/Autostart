import { useId } from 'react';
import './test1.css';

/**
 * Chalg'ituvchi kartochkasi ikonkasi: sariq yaltiroq shar ustida to'q "!" belgisi.
 * Har 1,5 s da shar markazi atrofida so'nib boruvchi tebranish bilan silkinadi.
 * Namuna: namuna/kartalar/chalgituvchi.png. Koordinatalar namuna kartochkasining pikselida (1pt = 1.5px).
 */
export default function Undov() {
  const id = useId();
  const url = (nom: string) => `url(#${id}${nom})`;
  return (
    <span className="ilv-joy ilv-joy-undov" aria-hidden="true">
      <svg className="ilv-ikonka" viewBox="142.5 57 108 108" width="100%" height="100%">
        <defs>
          {/* yorug'lik chap yuqoridan: markazi sharning chap-yuqori qismida */}
          <radialGradient id={id + 'shar'} gradientUnits="userSpaceOnUse" cx="185.45" cy="93.7" r="66">
            <stop offset="0" stopColor="#ffe65e" />
            <stop offset="0.36" stopColor="#fde254" />
            <stop offset="0.5" stopColor="#f8d834" />
            <stop offset="0.61" stopColor="#f2cf28" />
            <stop offset="0.71" stopColor="#e7ba0a" />
            <stop offset="0.82" stopColor="#d7af14" />
            <stop offset="0.94" stopColor="#c09f17" />
            <stop offset="1" stopColor="#b09314" />
          </radialGradient>
          {/* yaltiroq dog': oq yadro va uning ostidagi och sariq yumshoq hoshiya */}
          <radialGradient id={id + 'nur'}>
            <stop offset="0" stopColor="#fdf8e6" />
            <stop offset="0.86" stopColor="#fbf5de" />
            <stop offset="1" stopColor="#fbf5de" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id + 'hosh'}>
            <stop offset="0" stopColor="#fff09a" />
            <stop offset="0.75" stopColor="#fff09a" />
            <stop offset="1" stopColor="#fff09a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="ilv-ani ilv-undov-silkin">
          <circle cx="198.95" cy="110.95" r="43.45" fill={url('shar')} />
          <ellipse cx="184.2" cy="90.6" rx="15.4" ry="9.4" transform="rotate(-32 184.2 90.6)" fill={url('hosh')} />
          <ellipse cx="184.2" cy="88.2" rx="14.2" ry="7.2" transform="rotate(-32 184.2 88.2)" fill={url('nur')} />
          <rect x="191.5" y="85.55" width="15" height="35.9" rx="7.5" fill="#2b2a29" />
          <circle cx="199" cy="133.5" r="8.13" fill="#2b2a29" />
        </g>
      </svg>
    </span>
  );
}
