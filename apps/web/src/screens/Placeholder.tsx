import { useOrqaga, orqagaYozuvi } from '../orqaga';

export default function Placeholder({ title, emoji, text }: { title: string; emoji: string; text: string }) {
  const orqaga = useOrqaga();
  return (
    <div>
      <button className="back" onClick={orqaga}>← {orqagaYozuvi()}</button>
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="em">{emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
        <div>{text}</div>
      </div>
    </div>
  );
}
