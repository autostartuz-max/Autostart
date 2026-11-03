import { useEffect, type ReactNode } from 'react';
import PastkiMenyu, { type MenyuBolim } from './PastkiMenyu';
import { ilovaEkrani } from '../../native';
import '../tema.css';
import './komponentlar.css';

/**
 * Menyuli ekran qobig'i: butun oynani egallaydi, fon va yon/yuqori bo'shliqlar shu yerda,
 * bo'limlar orasi 10px (flex gap — bolalarga margin qo'yish shart emas), pastda qotib
 * turgan menyu kontentni yopmasligi uchun joy qoldiriladi.
 */
export default function Ekran({ faol, children, className }: { faol: MenyuBolim; children: ReactNode; className?: string }) {
  // Telefonning tepa (soat) va pastki (tugmalar) chizig'i ham ekran fonidek #2B2A29 bo'lsin
  useEffect(() => {
    ilovaEkrani(true);
    return () => ilovaEkrani(false);
  }, []);
  return (
    <div className={'ilv ilv-ekran' + (className ? ' ' + className : '')}>
      <main className="ilv-ichi">{children}</main>
      <PastkiMenyu faol={faol} />
    </div>
  );
}
