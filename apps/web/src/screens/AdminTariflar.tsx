import { useEffect, useMemo, useState } from 'react';
import { Menu, BadgeCheck, Plus, Trash2, Save, RotateCcw, Search } from 'lucide-react';
import {
  adminApi, hasAdmin, canManageQuestions, ensureAdminAuto, clearAdmin,
  type IlovaMatnlar, type ObunaQator, type TarifSorovQator, type AdminUserRow,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import { TARIFLAR_ZAXIRA, TARIF_NOMI, jamiNarx, narxMatn, sanaMatn, type Tarif, type TarifKod } from '../tarif/holat';
import { TarifLogo, TaqiqBelgisi } from '../tarif/Logolar';
import '../dashboard.css';
import './adminTarif.css';

type Bolim = 'sorovlar' | 'yoqish' | 'obunalar' | 'matnlar';
const BOLIMLAR: { id: Bolim; nom: string }[] = [
  { id: 'sorovlar', nom: 'So‘rovlar' },
  { id: 'yoqish', nom: 'Tarif yoqish' },
  { id: 'obunalar', nom: 'Obunalar' },
  { id: 'matnlar', nom: 'Ilova matnlari' },
];
const HOLAT_NOMI: Record<string, string> = { yangi: 'Yangi', bajarildi: 'Yoqildi', bekor: 'Bekor qilindi' };
const vaqt = (s: string) => new Date(s).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shaxs = (u: { firstName: string; phone: string | null; email: string | null } | null, id: number) =>
  u ? <><b>{u.firstName || 'Nomsiz'}</b><small>ID {id}{u.phone ? ' · ' + u.phone : ''}{u.email ? ' · ' + u.email : ''}</small></> : <><b>O‘chirilgan</b><small>ID {id}</small></>;

/**
 * Tariflar boshqaruvi (Owner va Admin; faqat saytda). To'lov qo'lda: foydalanuvchi ilova/saytda
 * "Sotib olish"ni bosadi → so'rov shu yerga tushadi (va Telegramga xabar) → call-markaz to'lovni
 * qabul qiladi → admin "Yoqish"ni bosadi. Ilova matnlari: bayram tabriklari, xavfsizlik eslatmalari,
 * tarif reklamasi va "kun o'tkazib yubordingiz" xabari.
 */
export default function AdminTariflar() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => canManageQuestions() || hasAdmin());
  const [bolim, setBolim] = useState<Bolim>('sorovlar');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [tariflar, setTariflar] = useState<Tarif[]>(TARIFLAR_ZAXIRA);
  const [sorovlar, setSorovlar] = useState<TarifSorovQator[]>([]);
  const [obunalar, setObunalar] = useState<ObunaQator[]>([]);
  const [faol, setFaol] = useState<Record<string, number>>({});
  const [band, setBand] = useState(false);
  const [faqatYangi, setFaqatYangi] = useState(true);

  // Tarif yoqish formasi
  const [qidiruv, setQidiruv] = useState('');
  const [topilgan, setTopilgan] = useState<AdminUserRow[]>([]);
  const [tanlangan, setTanlangan] = useState<{ id: number; nom: string } | null>(null);
  const [tarifKod, setTarifKod] = useState<TarifKod>('standart');
  const [oy, setOy] = useState(3);
  const [narx, setNarx] = useState(59000);
  const [izoh, setIzoh] = useState('');

  // Ilova matnlari
  const [matnlar, setMatnlar] = useState<IlovaMatnlar | null>(null);
  const [aslMatn, setAslMatn] = useState('');
  const [standart, setStandart] = useState<IlovaMatnlar | null>(null);

  const xato = (e: any, nom: string) => {
    if (e?.status === 401) { clearAdmin(); setAuthed(false); setErr('Sessiya tugagan. Qaytadan kiring.'); }
    else if (e?.status === 403) setErr('Bu bo‘lim faqat Admin va Owner uchun.');
    else setErr(e?.message || nom);
  };
  const xabar = (m: string) => { setOk(m); setTimeout(() => setOk(''), 3500); };

  const yukla = () => {
    adminApi.tarif()
      .then((r) => { setTariflar(r.tariflar?.length ? r.tariflar : TARIFLAR_ZAXIRA); setSorovlar(r.sorovlar || []); setObunalar(r.obunalar || []); setFaol(r.faol || {}); })
      .catch((e) => xato(e, 'Ma’lumotni yuklab bo‘lmadi'));
  };
  const matnYukla = () => {
    adminApi.ilovaMatnlar()
      .then((r) => { setMatnlar(r.matnlar); setAslMatn(JSON.stringify(r.matnlar)); setStandart(r.standart); })
      .catch((e) => xato(e, 'Matnlarni yuklab bo‘lmadi'));
  };
  useEffect(() => {
    if (!authed) ensureAdminAuto().then((r) => r && setAuthed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (authed) { yukla(); matnYukla(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Tarif tanlanganda — standart muddat va narx
  useEffect(() => {
    const t = tariflar.find((x) => x.kod === tarifKod);
    if (t) { setOy(t.oy); setNarx(jamiNarx(t)); } // narx oylik — jami = oylik × oy
  }, [tarifKod, tariflar]);

  // Foydalanuvchi qidiruvi (ism, telefon, pochta)
  useEffect(() => {
    const q = qidiruv.trim();
    if (q.length < 2) { setTopilgan([]); return; }
    const t = setTimeout(() => {
      adminApi.users(q).then((r) => setTopilgan([...(r.staff || []), ...(r.users || [])].slice(0, 12))).catch(() => setTopilgan([]));
    }, 300);
    return () => clearTimeout(t);
  }, [qidiruv]);

  const yoq = async (d: { userId: number; tarif: TarifKod; oy?: number; narx?: number; izoh?: string; sorovId?: number }, nom: string) => {
    if (band) return;
    setBand(true); setErr('');
    try {
      const ob = await adminApi.tarifYoq(d);
      xabar(`${nom}: ${TARIF_NOMI[d.tarif]} tarifi yoqildi — ${sanaMatn(ob.tugaydi)} gacha`);
      yukla();
      return true;
    } catch (e) { xato(e, 'Tarifni yoqib bo‘lmadi'); return false; }
    finally { setBand(false); }
  };

  const sorovniYoq = (s: TarifSorovQator) => {
    const t = tariflar.find((x) => x.kod === s.tarif);
    if (!window.confirm(`${s.user?.firstName || 'ID ' + s.userId} uchun ${TARIF_NOMI[s.tarif]} tarifi yoqilsinmi?\nTo‘lov (${narxMatn(t ? jamiNarx(t) : 0)}) qabul qilinganiga ishonch hosil qiling.`)) return;
    yoq({ userId: s.userId, tarif: s.tarif, sorovId: s.id }, s.user?.firstName || 'ID ' + s.userId);
  };
  const sorovHolat = async (s: TarifSorovQator, holat: 'yangi' | 'bekor') => {
    try { await adminApi.sorovHolat(s.id, holat); yukla(); } catch (e) { xato(e, 'Holatni o‘zgartirib bo‘lmadi'); }
  };
  const obunaBekor = async (o: ObunaQator) => {
    if (!window.confirm(`${o.user?.firstName || 'ID ' + o.userId}: ${TARIF_NOMI[o.tarif]} obunasi hoziroq to‘xtatilsinmi?`)) return;
    try { await adminApi.obunaBekor(o.id); xabar('Obuna to‘xtatildi'); yukla(); } catch (e) { xato(e, 'To‘xtatib bo‘lmadi'); }
  };
  const qolda = async () => {
    if (!tanlangan) return setErr('Avval foydalanuvchini tanlang');
    if (!window.confirm(`${tanlangan.nom} uchun ${TARIF_NOMI[tarifKod]} tarifi ${oy} oyga yoqilsinmi?`)) return;
    const r = await yoq({ userId: tanlangan.id, tarif: tarifKod, oy, narx, izoh }, tanlangan.nom);
    if (r) { setTanlangan(null); setQidiruv(''); setIzoh(''); }
  };

  const korinadiganSorov = useMemo(() => (faqatYangi ? sorovlar.filter((s) => s.holat === 'yangi') : sorovlar), [sorovlar, faqatYangi]);
  const yangiSoni = sorovlar.filter((s) => s.holat === 'yangi').length;
  const hozir = Date.now();

  // Matnlar tahriri
  const ozgardi = !!matnlar && JSON.stringify(matnlar) !== aslMatn;
  const m = (o: Partial<IlovaMatnlar>) => matnlar && setMatnlar({ ...matnlar, ...o });
  const matnSaqla = async () => {
    if (!matnlar) return;
    setBand(true); setErr('');
    try {
      const r = await adminApi.ilovaMatnlarSaqla(matnlar);
      setMatnlar(r.matnlar); setAslMatn(JSON.stringify(r.matnlar));
      xabar('Saqlandi. Ilova va saytda bir daqiqa ichida yangilanadi.');
    } catch (e) { xato(e, 'Saqlab bo‘lmadi'); }
    setBand(false);
  };

  return (
    <div className="db">
      <AppSidebar active="/tariflar/boshqaruv" open={open} onClose={() => setOpen(false)} />
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
                  <span className="am-ic"><BadgeCheck size={20} /></span>
                  <h1 className="adm-title">Tariflar</h1>
                  {yangiSoni > 0 && <span className="adm-badge owner">{yangiSoni} ta yangi so‘rov</span>}
                </div>
              </div>
              <p className="atf-izoh">
                To‘lov hozircha qo‘lda: foydalanuvchi “Sotib olish”ni bosadi, call-markaz to‘lovni qabul qiladi, siz bu yerda tarifni yoqasiz.
                Faol tarif bo‘lsa, yangi muddat uning oxiridan qo‘shiladi.
              </p>

              <div className="atf-statlar">
                {tariflar.map((t) => (
                  <div key={t.kod} className="atf-stat">
                    <TarifLogo kod={t.kod} size={38} />
                    <div><b>{faol[t.kod] || 0}</b><span>{t.nom} — faol</span></div>
                  </div>
                ))}
              </div>

              <div className="atf-tablar">
                {BOLIMLAR.map((b) => (
                  <button key={b.id} className={bolim === b.id ? 'faol' : ''} onClick={() => setBolim(b.id)}>
                    {b.nom}{b.id === 'sorovlar' && yangiSoni > 0 ? ` (${yangiSoni})` : ''}
                  </button>
                ))}
              </div>

              {bolim === 'sorovlar' && (
                <div className="atf-karta">
                  <label className="atf-filtr">
                    <input type="checkbox" checked={faqatYangi} onChange={(e) => setFaqatYangi(e.target.checked)} /> Faqat yangilari
                  </label>
                  {korinadiganSorov.length === 0 ? (
                    <div className="adm-empty">{faqatYangi ? 'Yangi so‘rov yo‘q' : 'So‘rovlar hali yo‘q'}</div>
                  ) : (
                    <div className="atf-jadval-joy">
                      <table className="atf-jadval">
                        <thead><tr><th>Foydalanuvchi</th><th>Tarif</th><th>Sana</th><th>Holat</th><th /></tr></thead>
                        <tbody>
                          {korinadiganSorov.map((s) => (
                            <tr key={s.id}>
                              <td className="atf-kim">{shaxs(s.user, s.userId)}</td>
                              <td><span className="atf-tarif"><TarifLogo kod={s.tarif} size={22} />{TARIF_NOMI[s.tarif]}</span></td>
                              <td>{vaqt(s.createdAt)}</td>
                              <td><span className={'atf-holat ' + s.holat}>{HOLAT_NOMI[s.holat] || s.holat}</span></td>
                              <td className="atf-amal">
                                {s.holat === 'yangi' ? (
                                  <>
                                    <button className="adm-btn primary" disabled={band} onClick={() => sorovniYoq(s)}>Yoqish</button>
                                    <button className="adm-mini danger" onClick={() => sorovHolat(s, 'bekor')}>Bekor</button>
                                  </>
                                ) : s.holat === 'bekor' ? (
                                  <button className="adm-mini" onClick={() => sorovHolat(s, 'yangi')}>Qaytarish</button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {bolim === 'yoqish' && (
                <div className="atf-karta atf-forma">
                  <label className="atf-maydon">
                    <span>Foydalanuvchi</span>
                    {tanlangan ? (
                      <div className="atf-tanlangan">
                        <b>{tanlangan.nom}</b><small>ID {tanlangan.id}</small>
                        <button className="adm-mini" onClick={() => setTanlangan(null)}>O‘zgartirish</button>
                      </div>
                    ) : (
                      <div className="atf-qidiruv">
                        <Search size={16} />
                        <input className="adm-inp" value={qidiruv} onChange={(e) => setQidiruv(e.target.value)} placeholder="Ism, telefon yoki pochta" />
                      </div>
                    )}
                  </label>
                  {!tanlangan && topilgan.length > 0 && (
                    <div className="atf-topilgan">
                      {topilgan.map((u) => (
                        <button key={u.id} onClick={() => { setTanlangan({ id: u.id, nom: u.firstName || 'ID ' + u.id }); setTopilgan([]); }}>
                          <b>{u.firstName || 'Nomsiz'}</b>
                          <small>ID {u.id}{u.phone ? ' · ' + u.phone : ''}{u.email ? ' · ' + u.email : ''}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="atf-maydon">
                    <span>Tarif</span>
                    <div className="atf-tariflar">
                      {tariflar.map((t) => (
                        <button key={t.kod} className={tarifKod === t.kod ? 'faol' : ''} onClick={() => setTarifKod(t.kod)}>
                          <TarifLogo kod={t.kod} size={26} /> {t.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="atf-qator">
                    <label className="atf-maydon"><span>Muddat (oy)</span>
                      <input className="adm-inp" type="number" min={1} max={24} value={oy} onChange={(e) => {
                        const yangiOy = Math.max(1, Math.min(24, Number(e.target.value) || 1));
                        setOy(yangiOy);
                        const t = tariflar.find((x) => x.kod === tarifKod);
                        if (t) setNarx(jamiNarx(t, yangiOy));
                      }} />
                    </label>
                    <label className="atf-maydon"><span>To‘langan summa (so‘m)</span>
                      <input className="adm-inp" type="number" min={0} step={1000} value={narx} onChange={(e) => setNarx(Math.max(0, Number(e.target.value) || 0))} />
                    </label>
                  </div>
                  <label className="atf-maydon"><span>Izoh (ixtiyoriy)</span>
                    <input className="adm-inp" value={izoh} maxLength={300} onChange={(e) => setIzoh(e.target.value)} placeholder="Masalan: Click orqali to‘landi" />
                  </label>
                  <button className="adm-btn primary" disabled={band || !tanlangan} onClick={qolda}>
                    <BadgeCheck size={16} /> Tarifni yoqish
                  </button>
                </div>
              )}

              {bolim === 'obunalar' && (
                <div className="atf-karta">
                  {obunalar.length === 0 ? (
                    <div className="adm-empty">Obunalar hali yo‘q</div>
                  ) : (
                    <div className="atf-jadval-joy">
                      <table className="atf-jadval">
                        <thead><tr><th>Foydalanuvchi</th><th>Tarif</th><th>Muddat</th><th>Summa</th><th>Holat</th><th /></tr></thead>
                        <tbody>
                          {obunalar.map((o) => {
                            const faolmi = new Date(o.tugaydi).getTime() > hozir;
                            return (
                              <tr key={o.id}>
                                <td className="atf-kim">{shaxs(o.user, o.userId)}{o.izoh && <small>{o.izoh}</small>}</td>
                                <td><span className="atf-tarif"><TarifLogo kod={o.tarif} size={22} />{TARIF_NOMI[o.tarif]}</span></td>
                                <td>{sanaMatn(o.boshlandi)} — {sanaMatn(o.tugaydi)}</td>
                                <td>{narxMatn(o.narx)}</td>
                                <td><span className={'atf-holat ' + (faolmi ? 'bajarildi' : 'bekor')}>{faolmi ? 'Faol' : 'Tugagan'}</span></td>
                                <td className="atf-amal">{faolmi && <button className="adm-mini danger" onClick={() => obunaBekor(o)}>To‘xtatish</button>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {bolim === 'matnlar' && matnlar && (
                <div className="atf-karta atf-matnlar">
                  <div className="atf-matn-tugmalar">
                    <button className="adm-btn sec" disabled={!ozgardi || band} onClick={() => setMatnlar(JSON.parse(aslMatn))}><RotateCcw size={16} /> Bekor qilish</button>
                    {standart && <button className="adm-btn sec" disabled={band} onClick={() => window.confirm('Hamma matnlar standart holatga qaytarilsinmi? (Saqlash bosilgandan keyin kuchga kiradi)') && setMatnlar(standart)}>Standartga qaytarish</button>}
                    <button className="adm-btn primary" disabled={!ozgardi || band} onClick={matnSaqla}><Save size={16} /> {band ? 'Saqlanmoqda…' : 'Saqlash'}</button>
                  </div>

                  <h3>“Kun o‘tkazib yubordingiz” xabari</h3>
                  <p className="atf-izoh">{'{kun}'} — “bir”, “ikki” … “o‘n” (10 dan ko‘p bo‘lsa raqam). Foydalanuvchi bir kun yoki ko‘proq test yechmasa, ilova ochilganda chiqadi.</p>
                  <textarea className="adm-ta" rows={2} value={matnlar.otkazish} onChange={(e) => m({ otkazish: e.target.value })} />

                  <h3>Tarif reklamasi (tarifsiz foydalanuvchilarga, kuniga bir marta)</h3>
                  <p className="atf-izoh">{'{tarif}'} — har kuni almashadi: Standart, Silver, Premium. Tarif sotib olgandan keyin chiqmaydi.</p>
                  <textarea className="adm-ta" rows={3} value={matnlar.reklama} onChange={(e) => m({ reklama: e.target.value })} />

                  <h3>Bayram tabriklari</h3>
                  <p className="atf-izoh">Sana: OO-KK (har yili, masalan 03-21) yoki YYYY-OO-KK (hayitlar — sanasi har yili o‘zgaradi). O‘sha kuni ilova ochilganda tabrik chiqadi.</p>
                  {matnlar.bayramlar.map((b, i) => (
                    <div key={i} className="atf-bayram">
                      <input className="adm-inp atf-sana" value={b.sana} placeholder="03-21" onChange={(e) => m({ bayramlar: matnlar.bayramlar.map((x, j) => (j === i ? { ...x, sana: e.target.value.trim() } : x)) })} />
                      <input className="adm-inp" value={b.nom} placeholder="Bayram nomi" onChange={(e) => m({ bayramlar: matnlar.bayramlar.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)) })} />
                      <textarea className="adm-ta" rows={2} value={b.matn} onChange={(e) => m({ bayramlar: matnlar.bayramlar.map((x, j) => (j === i ? { ...x, matn: e.target.value } : x)) })} />
                      <button className="adm-mini danger" onClick={() => m({ bayramlar: matnlar.bayramlar.filter((_, j) => j !== i) })} aria-label="O‘chirish"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button className="adm-mini" onClick={() => m({ bayramlar: [...matnlar.bayramlar, { sana: '', nom: '', matn: '' }] })}><Plus size={14} /> Bayram qo‘shish</button>

                  <h3>Xavfsizlik eslatmalari (bosh sahifada, har kuni bittasi)</h3>
                  {matnlar.eslatmalar.map((e, i) => (
                    <div key={i} className="atf-eslatma">
                      <label className="atf-taqiq" title="Taqiq belgisi bilan">
                        <input type="checkbox" checked={!!e.taqiq} onChange={(ev) => m({ eslatmalar: matnlar.eslatmalar.map((x, j) => (j === i ? { ...x, taqiq: ev.target.checked } : x)) })} />
                        <TaqiqBelgisi size={22} />
                      </label>
                      <textarea className="adm-ta" rows={2} value={e.matn} onChange={(ev) => m({ eslatmalar: matnlar.eslatmalar.map((x, j) => (j === i ? { ...x, matn: ev.target.value } : x)) })} />
                      <button className="adm-mini danger" onClick={() => m({ eslatmalar: matnlar.eslatmalar.filter((_, j) => j !== i) })} aria-label="O‘chirish"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button className="adm-mini" onClick={() => m({ eslatmalar: [...matnlar.eslatmalar, { matn: '' }] })}><Plus size={14} /> Eslatma qo‘shish</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
