import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Questions() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');

  const load = () => api.questions(q).then(setItems).catch(() => {});
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const del = async (id: number) => {
    if (!window.confirm('Savol o‘chirilsinmi?')) return;
    await api.deleteQuestion(id);
    load();
  };

  return (
    <div>
      <div className="between">
        <h1 className="title" style={{ margin: 0 }}>Savollar ({items.length})</h1>
        <button className="btn" onClick={() => nav('/questions/new')}>+ Yangi savol</button>
      </div>
      <div className="panel">
        <div className="row" style={{ marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button className="btn sec" onClick={load}>Qidirish</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Savol</th>
              <th>Mavzu</th>
              <th>Variant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.id}</td>
                <td style={{ maxWidth: 420 }}>{it.textLat}</td>
                <td>{it.topic?.name ? <span className="tag">{it.topic.name}</span> : <span className="muted">—</span>}</td>
                <td>{it.options?.length}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sec" onClick={() => nav('/questions/' + it.id)}>Tahrir</button>{' '}
                  <button className="btn danger" onClick={() => del(it.id)}>O‘chirish</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="muted" style={{ padding: 20 }}>Savollar yo‘q</div>}
      </div>
    </div>
  );
}
