import * as Ikonkalar from './index';
import '../tema.css';
import '../komponentlar/komponentlar.css';

/**
 * Faqat ishlab chiqishda (/ilv-korik): hamma ikonka namunadagi kartochka o'lchamida
 * (bosh 175×122, test 175×112), animatsiyalar doim yoqiq — skrinshot bilan solishtirish uchun.
 */
const BOSH = ['Svetofor', 'Chipta', 'Papka', 'YolBelgisi', 'SinganYurak'];

export default function IkonkaKorik() {
  return (
    <div className="ilv" style={{ minHeight: '100vh', padding: 16, display: 'grid', gridTemplateColumns: '175px 175px', gap: 8 }}>
      {Object.entries(Ikonkalar).map(([nom, Ikonka]) => (
        <div
          key={nom}
          className="ilv-korinadi"
          data-nom={nom}
          style={{
            position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'var(--ilv-karta)',
            height: BOSH.includes(nom) ? 122 : 112, padding: '14px 16px', boxSizing: 'border-box',
            fontWeight: 700, fontSize: 16,
          }}
        >
          {nom}
          <Ikonka />
        </div>
      ))}
    </div>
  );
}
