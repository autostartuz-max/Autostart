import { useState } from 'react';
import { api } from '../api';

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) return;
    setErr('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.import(file));
    } catch (e: any) {
      setErr(e.message || 'Import xatosi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="title">Excel / CSV import</h1>
      <div className="panel" style={{ maxWidth: 640 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Fayl ustunlari (birinchi qator — sarlavha):
        </p>
        <table style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>savol</th>
              <th>izoh</th>
              <th>toifa</th>
              <th>mavzu</th>
              <th>variant1..4</th>
              <th>javob</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Savol matni</td>
              <td>Izoh</td>
              <td>B</td>
              <td>Belgilar</td>
              <td>4 tagacha variant</td>
              <td>1-4 (to‘g‘ri raqami)</td>
            </tr>
          </tbody>
        </table>

        <div className="row">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn" onClick={upload} disabled={!file || busy}>
            {busy ? 'Yuklanmoqda…' : 'Yuklash'}
          </button>
        </div>

        {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}

        {result && (
          <div className="report">
            ✅ Qo‘shildi: <b>{result.inserted}</b> / {result.total} qatordan
            {result.errors?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <b className="e">Xatolar ({result.errors.length}):</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {result.errors.slice(0, 20).map((er: any, i: number) => (
                    <li key={i} className="e">
                      {er.row}-qator: {er.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
