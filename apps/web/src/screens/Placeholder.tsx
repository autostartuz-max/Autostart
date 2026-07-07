import { useNavigate } from 'react-router-dom';

export default function Placeholder({ title, emoji, text }: { title: string; emoji: string; text: string }) {
  const nav = useNavigate();
  return (
    <div>
      <button className="back" onClick={() => nav('/')}>← Bosh sahifa</button>
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="em">{emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
        <div>{text}</div>
      </div>
    </div>
  );
}
