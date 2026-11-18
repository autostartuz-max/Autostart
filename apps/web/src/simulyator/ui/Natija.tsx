import { RotateCcw, Home, LogOut } from 'lucide-react';
import type { Natija as N } from '../imtihon/hakam';

const vaqtMatn = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Natija({ n, chegara, onQayta, onMenyu, onChiq }: { n: N; chegara: number; onQayta: () => void; onMenyu: () => void; onChiq: () => void }) {
  return (
    <div className="sim-natija-fon">
      <div className={'sim-natija ' + (n.otdi ? 'otdi' : 'otmadi')}>
        <div className="sim-natija-bosh">
          <div className="sim-natija-holat">{n.otdi ? 'O‘TDI' : 'O‘TMADI'}</div>
          <div className="sim-natija-sabab">{n.sabab}</div>
        </div>
        <div className="sim-natija-raqamlar">
          <div><b className={n.jami >= chegara ? 'xavf' : ''}>{n.jami}</b><span>/ {chegara} jarima ball</span></div>
          <div><b>{vaqtMatn(n.vaqt)}</b><span>sarflangan vaqt</span></div>
          <div><b>{n.bajarildi.length}/{n.jamiQadam}</b><span>bajarilgan qadam</span></div>
          <div><b>{n.jarimalar.length}</b><span>xato</span></div>
        </div>
        {n.jarimalar.length > 0 ? (
          <div className="sim-natija-royxat">
            {n.jarimalar.map((j, i) => (
              <div key={i} className="sim-natija-qator">
                <span className="vaqt">{vaqtMatn(j.vaqt)}</span>
                <span className="nom"><b>{j.nom}</b>{j.izoh ? <small>{j.izoh}</small> : null}<small className="mashq">{j.mashq}</small></span>
                <span className="ball">+{j.ball}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="sim-natija-toza">Bironta ham qoidabuzarlik qayd etilmadi. Ajoyib!</div>
        )}
        <div className="sim-natija-tugmalar">
          <button className="asosiy" onClick={onQayta}><RotateCcw size={18} /> Qayta topshirish</button>
          <button onClick={onMenyu}><Home size={18} /> Menyu</button>
          <button onClick={onChiq}><LogOut size={18} /> Chiqish</button>
        </div>
      </div>
    </div>
  );
}
