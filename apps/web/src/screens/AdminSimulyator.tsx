import { Fragment, useEffect, useState } from 'react';
import { Menu, Car, Save, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi, hasAdmin, canManageQuestions, ensureAdminAuto, clearAdmin } from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import {
  JARIMA_TURLARI, JARIMA_KODLARI, MASHQ_KODLARI, MASHQ_NOMI, STANDART_SOZLAMA, sozlamaBirlashtir, type ImtihonSozlama,
} from '../simulyator/imtihon/qoidalar';
import { MASHINALAR } from '../simulyator/mashinalar';
import '../dashboard.css';
import './adminSimulyator.css';

type Bolim = 'jarimalar' | 'imtihon' | 'mashqlar' | 'avtomobillar' | 'natijalar';
const BOLIMLAR: { id: Bolim; nom: string }[] = [
  { id: 'jarimalar', nom: 'Jarima ballari' }, { id: 'imtihon', nom: 'Imtihon' }, { id: 'mashqlar', nom: 'Mashqlar' },
  { id: 'avtomobillar', nom: 'Avtomobillar' }, { id: 'natijalar', nom: 'Natijalar' },
];
const vaqtMatn = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * 3D avtodrom simulyatori sozlamalari (Owner va Admin; faqat saytda).
 * Simulyatorning o'zi ilovada ishlaydi — bu yerdagi o'zgarishlar keyingi imtihondan kuchga kiradi.
 */
export default function AdminSimulyator() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [bolim, setBolim] = useState<Bolim>('jarimalar');
  const [s, setS] = useState<ImtihonSozlama>(() => sozlamaBirlashtir());
  const [asl, setAsl] = useState('');
  const [yangilangan, setYangilangan] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [natijalar, setNatijalar] = useState<{ jami: number; sahifa: number; sahifaHajmi: number; natijalar: any[]; imtihon: { otdi: number; otmadi: number } } | null>(null);
  const [ochiq, setOchiq] = useState<number | null>(null);

  const xato = (e: any, nom: string) => {
    if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
    else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
    else setErr(e?.message || nom);
  };
  const yukla = () => {
    setErr('');
    adminApi.simSozlama()
      .then((r) => { const sz = sozlamaBirlashtir(r?.sozlama); setS(sz); setAsl(JSON.stringify(sz)); setYangilangan(r?.yangilangan ?? null); })
      .catch((e) => xato(e, 'Sozlamalarni yuklab bo‘lmadi'));
  };
  const natijaYukla = (sahifa = 1) => {
    adminApi.simNatijalar(sahifa).then((r: any) => setNatijalar(r)).catch((e) => xato(e, 'Natijalarni yuklab bo‘lmadi'));
  };
  useEffect(() => {
    if (!authed) ensureAdminAuto().then((r) => r && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (authed) { yukla(); natijaYukla(1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const ozgardi = asl !== '' && JSON.stringify(s) !== asl;
  const saqla = async () => {
    setSaqlanmoqda(true); setErr(''); setOk('');
    try {
      const r = await adminApi.simSozlamaSaqla({ sozlama: s });
      const sz = sozlamaBirlashtir(r?.sozlama);
      setS(sz); setAsl(JSON.stringify(sz)); setYangilangan(r?.yangilangan ?? null);
      setOk('Saqlandi. Ilovadagi keyingi imtihondan kuchga kiradi.');
      setTimeout(() => setOk(''), 4000);
    } catch (e) { xato(e, 'Saqlab bo‘lmadi'); }
    setSaqlanmoqda(false);
  };
  const jarima = (k: keyof ImtihonSozlama['jarimalar'], o: Partial<{ ball: number; faol: boolean }>) =>
    setS({ ...s, jarimalar: { ...s.jarimalar, [k]: { ...s.jarimalar[k], ...o } } });
  const mashq = (k: keyof ImtihonSozlama['mashqlar'], o: Partial<{ faol: boolean; vaqt: number }>) =>
    setS({ ...s, mashqlar: { ...s.mashqlar, [k]: { ...s.mashqlar[k], ...o } } });
  const son = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="db">
      <AppSidebar active="/simulyator/boshqaruv" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
        </header>
        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}
          {ok && <div className="am-ok">{ok}</div>}
          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <div className="adm-head-l">
                  <span className="am-ic"><Car size={20} /></span>
                  <h1 className="adm-title">3D avtodrom simulyatori</h1>
                  <span className={'adm-badge ' + (s.rasmiy ? 'b2' : 'b1')}>{s.rasmiy ? 'Jadval rasmiy' : 'Jarimalar taxminiy'}</span>
                </div>
                <div className="adm-head-btns">
                  <button className="adm-btn sec" disabled={!ozgardi || saqlanmoqda} onClick={() => setS(JSON.parse(asl))}><RotateCcw size={16} /> Bekor qilish</button>
                  <button className="adm-btn primary" disabled={!ozgardi || saqlanmoqda} onClick={saqla}><Save size={16} /> {saqlanmoqda ? 'Saqlanmoqda…' : 'Saqlash'}</button>
                </div>
              </div>
              <p className="asm-izoh">
                Simulyator mobil ilovada ishlaydi. Bu yerdagi sozlamalar ilovadagi keyingi imtihondan kuchga kiradi.
                {yangilangan && <> Oxirgi o‘zgarish: {new Date(yangilangan).toLocaleString('uz-UZ')}.</>}
              </p>
              <div className="asm-tablar">
                {BOLIMLAR.map((b) => <button key={b.id} className={bolim === b.id ? 'faol' : ''} onClick={() => setBolim(b.id)}>{b.nom}</button>)}
              </div>

              {bolim === 'jarimalar' && (
                <div className="asm-karta">
                  <label className="asm-check asm-rasmiy">
                    <input type="checkbox" checked={s.rasmiy} onChange={(e) => setS({ ...s, rasmiy: e.target.checked })} />
                    <span><b>Jadval rasmiy manbaga asoslangan</b><small>Belgilansa, ilovada “jarima ballari taxminiy” yozuvi ko‘rinmaydi. Rasmiy jadval e’lon qilinmagan — faqat tasdiqlangan qiymatlarni kiritgandan keyin belgilang.</small></span>
                  </label>
                  <table className="asm-jadval">
                    <thead><tr><th>Qoidabuzarlik</th><th>Ball</th><th>Faol</th></tr></thead>
                    <tbody>
                      {JARIMA_KODLARI.map((k) => (
                        <tr key={k} className={s.jarimalar[k].faol ? '' : 'ochiq'}>
                          <td><b>{JARIMA_TURLARI[k].nom}</b><small>{JARIMA_TURLARI[k].tavsif}{JARIMA_TURLARI[k].yakunlovchi ? ' · imtihonni to‘xtatadi' : ''}</small></td>
                          <td><input className="adm-inp asm-son" type="number" min={0} max={1000} value={s.jarimalar[k].ball} onChange={(e) => jarima(k, { ball: son(e.target.value) })} /></td>
                          <td><input type="checkbox" checked={s.jarimalar[k].faol} onChange={(e) => jarima(k, { faol: e.target.checked })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="adm-btn sec" onClick={() => setS({ ...s, jarimalar: structuredClone(STANDART_SOZLAMA.jarimalar) })}><RotateCcw size={15} /> Standart ballarga qaytarish</button>
                </div>
              )}

              {bolim === 'imtihon' && (
                <div className="asm-karta asm-maydonlar">
                  <Maydon nom="O‘tish chegarasi (jarima ball)" izoh="Jarima ballari shu qiymatga yetsa — imtihondan o‘tilmagan, imtihon to‘xtaydi">
                    <input className="adm-inp asm-son" type="number" min={1} value={s.otishChegarasi} onChange={(e) => setS({ ...s, otishChegarasi: son(e.target.value) })} />
                  </Maydon>
                  <Maydon nom="Imtihon vaqti (daqiqa)" izoh="Vaqt tugasa imtihon to‘xtaydi">
                    <input className="adm-inp asm-son" type="number" min={3} max={120} value={s.vaqtDaqiqa} onChange={(e) => setS({ ...s, vaqtDaqiqa: son(e.target.value) })} />
                  </Maydon>
                  <Maydon nom="Tezlik chegarasi (km/soat)" izoh="Toshkent imtihon markazi: avtodromda 20 km/soat">
                    <input className="adm-inp asm-son" type="number" value={s.tezlik.asosiy} onChange={(e) => setS({ ...s, tezlik: { ...s.tezlik, asosiy: son(e.target.value) } })} />
                  </Maydon>
                  <Maydon nom="Tezlashish bo‘lagi: eng ko‘p / eng kam" izoh="40 km/soat va 4.6 belgisi bo‘yicha 20 km/soat">
                    <div className="asm-qator">
                      <input className="adm-inp asm-son" type="number" value={s.tezlik.tezlashish} onChange={(e) => setS({ ...s, tezlik: { ...s.tezlik, tezlashish: son(e.target.value) } })} />
                      <input className="adm-inp asm-son" type="number" value={s.tezlik.engKam} onChange={(e) => setS({ ...s, tezlik: { ...s.tezlik, engKam: son(e.target.value) } })} />
                    </div>
                  </Maydon>
                  <Maydon nom="O‘lchov xatosi (km/soat)" izoh="Tezlik shundan oshgandagina xato hisoblanadi (rasmiy: 5)">
                    <input className="adm-inp asm-son" type="number" value={s.tezlik.xato} onChange={(e) => setS({ ...s, tezlik: { ...s.tezlik, xato: son(e.target.value) } })} />
                  </Maydon>
                  <Maydon nom="Estakada qiyaligi (%)" izoh="Qaror: 10–16%">
                    <input className="adm-inp asm-son" type="number" min={10} max={16} value={Math.round(s.qiyalik * 100)} onChange={(e) => setS({ ...s, qiyalik: son(e.target.value) / 100 })} />
                  </Maydon>
                  <Maydon nom="Estakadada ruxsat etilgan orqaga sirpanish (m)" izoh="Taxminiy qiymat">
                    <input className="adm-inp asm-son" type="number" step={0.05} value={s.sirpanish} onChange={(e) => setS({ ...s, sirpanish: son(e.target.value) })} />
                  </Maydon>
                  <Maydon nom="Sababsiz to‘xtash (soniya)" izoh="Shuncha turish — “ruxsat etilmagan joyda to‘xtash”">
                    <input className="adm-inp asm-son" type="number" value={s.toxtashSoniya} onChange={(e) => setS({ ...s, toxtashSoniya: son(e.target.value) })} />
                  </Maydon>
                  <Maydon nom="Piyoda chiqish ehtimoli (%)" izoh="Piyodalar o‘tish joyida piyoda paydo bo‘lishi">
                    <input className="adm-inp asm-son" type="number" min={0} max={100} value={Math.round(s.piyodaEhtimol * 100)} onChange={(e) => setS({ ...s, piyodaEhtimol: son(e.target.value) / 100 })} />
                  </Maydon>
                  <Maydon nom="Chorrahada qizil ishora ehtimoli (%)" izoh="Yaqinlashganda svetofor qizil bo‘lishi">
                    <input className="adm-inp asm-son" type="number" min={0} max={100} value={Math.round(s.qizilEhtimol * 100)} onChange={(e) => setS({ ...s, qizilEhtimol: son(e.target.value) / 100 })} />
                  </Maydon>
                  <label className="asm-check">
                    <input type="checkbox" checked={s.avariyaChiroqKerak} onChange={(e) => setS({ ...s, avariyaChiroqKerak: e.target.checked })} />
                    <span><b>Avariya holatda to‘xtagach avariya chirog‘i talab qilinadi</b></span>
                  </label>
                </div>
              )}

              {bolim === 'mashqlar' && (
                <div className="asm-karta">
                  <p className="asm-izoh">Ketma-ketlik Toshkent imtihon markazi tartibida va avtodrom maydonchasi joylashuviga bog‘liq. O‘chirilgan mashq imtihonda tekshirilmaydi va hisobga kirmaydi (yo‘l baribir shu joydan o‘tadi).</p>
                  <table className="asm-jadval">
                    <thead><tr><th>Mashq</th><th>Vaqt (soniya)</th><th>Faol</th></tr></thead>
                    <tbody>
                      {MASHQ_KODLARI.map((k) => (
                        <tr key={k} className={s.mashqlar[k].faol ? '' : 'ochiq'}>
                          <td><b>{MASHQ_NOMI[k]}</b>{k === 'chorraha' && <small>Marshrutda 4 marta: to‘g‘riga ×2, chapga, o‘ngga</small>}</td>
                          <td><input className="adm-inp asm-son" type="number" min={20} max={1800} value={s.mashqlar[k].vaqt} onChange={(e) => mashq(k, { vaqt: son(e.target.value) })} /></td>
                          <td><input type="checkbox" checked={s.mashqlar[k].faol} disabled={k === 'start' || k === 'finish'} onChange={(e) => mashq(k, { faol: e.target.checked })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bolim === 'avtomobillar' && (
                <div className="asm-karta">
                  <p className="asm-izoh">Ilovadagi menyuda tanlash mumkin bo‘lgan avtomobillar. Yangi avtomobil qo‘shish uchun uning 3D modeli va texnik ko‘rsatkichlari kerak — dastur yangilanishi bilan qo‘shiladi.</p>
                  <table className="asm-jadval">
                    <thead><tr><th>Avtomobil</th><th>O‘lchamlar</th><th>Faol</th></tr></thead>
                    <tbody>
                      {MASHINALAR.map((m) => (
                        <tr key={m.id} className={s.mashinalar[m.id] !== false ? '' : 'ochiq'}>
                          <td><b>{m.nom}</b><small>Massa {m.massa} kg · rul {m.maxBurchak}° · 1-uzatma {m.uzatmalar['1']}, 2-uzatma {m.uzatmalar['2']}</small></td>
                          <td>{m.uzunlik} × {m.eni} × {m.balandlik} m<small>baza {m.bazasi} m</small></td>
                          <td><input type="checkbox" checked={s.mashinalar[m.id] !== false} onChange={(e) => setS({ ...s, mashinalar: { ...s.mashinalar, [m.id]: e.target.checked } })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bolim === 'natijalar' && (
                <div className="asm-karta">
                  {natijalar ? (
                    <>
                      <div className="asm-stat">
                        <div><b>{natijalar.jami}</b><span>jami urinish</span></div>
                        <div className="yashil"><b>{natijalar.imtihon.otdi}</b><span>imtihondan o‘tdi</span></div>
                        <div className="qizil"><b>{natijalar.imtihon.otmadi}</b><span>o‘tmadi</span></div>
                      </div>
                      {natijalar.natijalar.length === 0 ? <p className="asm-izoh">Hali natijalar yo‘q.</p> : (
                        <table className="asm-jadval asm-natijalar">
                          <thead><tr><th>Sana</th><th>Foydalanuvchi</th><th>Rejim</th><th>Jarima</th><th>Vaqt</th><th>Qadam</th><th /></tr></thead>
                          <tbody>
                            {natijalar.natijalar.map((n: any) => (
                              <Fragment key={n.id}>
                                <tr onClick={() => setOchiq(ochiq === n.id ? null : n.id)} className="bosiladi">
                                  <td>{new Date(n.createdAt).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                  <td><b>{n.user?.firstName}</b><small>{n.user?.phone || n.user?.email || ''}</small></td>
                                  <td>{n.rejim === 'mashq' ? `Mashq: ${MASHQ_NOMI[n.mashq as keyof typeof MASHQ_NOMI] || n.mashq}` : 'Imtihon'}<small>{MASHINALAR.find((m) => m.id === n.mashina)?.nom || n.mashina}</small></td>
                                  <td>{n.otdi ? <CheckCircle2 size={16} className="yashil" /> : <XCircle size={16} className="qizil" />} {n.jami}</td>
                                  <td>{vaqtMatn(n.vaqt)}</td>
                                  <td>{n.bajarildi}/{n.jamiQadam}</td>
                                  <td>{ochiq === n.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                                </tr>
                                {ochiq === n.id && (
                                  <tr className="asm-xatolar"><td colSpan={7}>
                                    <div><i>{n.sabab}</i></div>
                                    {(n.xatolar as any[]).length === 0 ? <div>Xato yo‘q</div> : (n.xatolar as any[]).map((j, i) => (
                                      <div key={i}>+{j.ball} — <b>{j.nom}</b>{j.izoh ? ` (${j.izoh})` : ''} <small>{j.mashq}</small></div>
                                    ))}
                                  </td></tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {natijalar.jami > natijalar.sahifaHajmi && (
                        <div className="asm-sahifalar">
                          <button className="adm-btn sec" disabled={natijalar.sahifa <= 1} onClick={() => natijaYukla(natijalar.sahifa - 1)}>Oldingi</button>
                          <span>{natijalar.sahifa} / {Math.ceil(natijalar.jami / natijalar.sahifaHajmi)}</span>
                          <button className="adm-btn sec" disabled={natijalar.sahifa * natijalar.sahifaHajmi >= natijalar.jami} onClick={() => natijaYukla(natijalar.sahifa + 1)}>Keyingi</button>
                        </div>
                      )}
                    </>
                  ) : <p className="asm-izoh">Yuklanmoqda…</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Maydon({ nom, izoh, children }: { nom: string; izoh?: string; children: React.ReactNode }) {
  return (
    <div className="asm-maydon">
      <div><b>{nom}</b>{izoh && <small>{izoh}</small>}</div>
      {children}
    </div>
  );
}
