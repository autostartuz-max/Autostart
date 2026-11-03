import { useId } from 'react';
import './test1.css';

/**
 * Shablon testlar kartochkasi ikonkasi: uch qavat romb plastinka (yashil, sariq, qizil).
 * Har plastinkaning ostida 6.6px pastroqda to'q rangli nusxasi — qalinlik. Animatsiyada
 * yashil tepaga, qizil pastga siljib qatlamlar ajraladi, sariq joyida qoladi (3 s).
 * Namuna: namuna/kartalar/shablon.png. Koordinatalar namuna kartochkasining pikselida (1pt = 1.5px).
 */
// Pastki yarmi biroz kattaroq — namunadagi plastinkalar perspektivada (yaqin tomoni kattaroq)
const romb = (cy: number) => `196.2,${cy - 22.4} 241.8,${cy} 196.2,${cy + 23.4} 149.2,${cy}`;

export default function Qatlamlar() {
  const id = useId();
  const url = (nom: string) => `url(#${id}${nom})`;
  return (
    <span className="ilv-joy ilv-joy-qatlamlar" aria-hidden="true">
      {/* viewBox — namunadagi 72×72pt quti; ajralganda yashil uchi va qizil pasti shu qutida
          kesiladi (namunada ham shunday) */}
      <svg className="ilv-ikonka" viewBox="142.5 57 108 108" width="100%" height="100%">
        <defs>
          {/* yashil va sariq: yuqori-chap qirradan past-o'ng qirraga qarab to'qlashadi */}
          <linearGradient id={id + 'y'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.25" stopColor="#43d97a" />
            <stop offset="0.5" stopColor="#39c96c" />
            <stop offset="0.75" stopColor="#22b35c" />
          </linearGradient>
          <linearGradient id={id + 's'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.25" stopColor="#f3d85c" />
            <stop offset="0.45" stopColor="#efd254" />
            <stop offset="0.6" stopColor="#e8c643" />
            <stop offset="0.75" stopColor="#e0b92e" />
          </linearGradient>
          {/* qizil: tepadan pastga */}
          <linearGradient id={id + 'q'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ef584c" />
            <stop offset="0.35" stopColor="#e64a43" />
            <stop offset="0.42" stopColor="#df4541" />
            <stop offset="0.5" stopColor="#dd403d" />
            <stop offset="0.6" stopColor="#d93b39" />
            <stop offset="0.7" stopColor="#d62c3d" />
            <stop offset="0.79" stopColor="#c9212b" />
            <stop offset="1" stopColor="#c31f29" />
          </linearGradient>
        </defs>
        <g className="ilv-ani ilv-qatlam-past">
          <polygon points={romb(139.8)} fill="#8c0b16" />
          <polygon points={romb(133.2)} fill={url('q')} />
        </g>
        <g>
          <polygon points={romb(116.1)} fill="#a8852a" />
          <polygon points={romb(109.5)} fill={url('s')} />
        </g>
        <g className="ilv-ani ilv-qatlam-yuqori">
          <polygon points={romb(92.6)} fill="#0a6b32" />
          <polygon points={romb(86)} fill={url('y')} />
        </g>
      </svg>
    </span>
  );
}
