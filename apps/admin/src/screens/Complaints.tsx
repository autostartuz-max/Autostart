import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Complaints() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    api.complaints().then(setItems).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="title">Shikoyatlar ({items.length})</h1>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Savol</th>
              <th>Sabab</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td style={{ maxWidth: 360 }}>{c.question?.textLat || '—'}</td>
                <td>{c.reason}</td>
                <td><span className="tag">{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="muted" style={{ padding: 20 }}>Shikoyatlar yo‘q</div>}
      </div>
    </div>
  );
}
