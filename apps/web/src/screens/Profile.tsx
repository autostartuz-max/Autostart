import { useEffect, useState } from 'react';
import { useOrqaga, orqagaYozuvi } from '../orqaga';
import {
  ChevronLeft, Menu, ShieldCheck, ClipboardList, GraduationCap,
  CircleCheck, CircleX, PieChart, CircleHelp, FileText, MessageSquare,
  User, Phone, Mail, CalendarDays, CalendarCheck, Bookmark, Trash2, TriangleAlert, Languages, MapPin, Pencil, Crown, LogOut,
} from 'lucide-react';
import { api, clearToken, hisobdanChiqish, ROLE_LABEL, type Role } from '../api';
import AppSidebar from '../components/AppSidebar';
import LangTheme from '../components/LangTheme';
import { mobilIlova } from '../native';
import ImtihonSanasi, { qolganKun, sanaKaliti, sanaNuqtali } from '../components/ImtihonSanasi';
import ToifaTanlash from '../toifa/ToifaTanlash';
import { ToifaIkonka, toifaTop } from '../toifa/toifalar';
import HududTanlash from '../hudud/HududTanlash';
import { hududMatn } from '../hudud/hududlar';
import { sanaMatn, useTarif } from '../tarif/holat';
import { useNavigate } from 'react-router-dom';
import '../dashboard.css';

const roleOf = (r?: string): Role => (r === 'owner' || r === 'admin' ? r : 'user');

/*
 * Akkauntni o'chirish tugmasi ilovadan olib tashlandi (2026-11-23, foydalanuvchi talabi). DIQQAT: Play
 * Market va App Store ilova ichida akkauntni o'chirish imkonini TALAB qiladi — do'konga yuklashdan oldin
 * true qiling (kod va server DELETE /me tayyor).
 */
const AKKAUNT_OCHIRISH = false;
const ROLE_IC: Record<Role, typeof ShieldCheck> = {
  owner: ShieldCheck, admin: ClipboardList, user: GraduationCap,
};
const sana = (s?: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return '—'; }
};
const sanaVaqt = (s?: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('uz-UZ'); } catch { return '—'; }
};

export default function Profile() {
  const orqaga = useOrqaga();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<any>(null);
  // Akkauntni o'chirish (App Store/Play Market talabi) — ikki bosqichli tasdiq
  const [ochirish, setOchirish] = useState(false);
  const [parol, setParol] = useState('');
  const [ochirXato, setOchirXato] = useState('');
  const [ochirilmoqda, setOchirilmoqda] = useState(false);
  // Ilova: hisobdan chiqish (ikki bosqichli — tasodifan bosilmasin)
  const [chiqishSorov, setChiqishSorov] = useState(false);
  const [chiqilmoqda, setChiqilmoqda] = useState(false);
  const chiqish = async () => {
    setChiqilmoqda(true);
    await hisobdanChiqish();
    // Butun holat tozalansin — ilova boshidan, kirish oynasi bilan ochiladi
    window.location.replace('/');
  };
  // Toifa, imtihon sanasi va hudud — foydalanuvchi o'zi tanlaydi (2026-11)
  const [oyna, setOyna] = useState<'' | 'sana' | 'toifa' | 'hudud'>('');
  const tarif = useTarif();
  const nav = useNavigate();
  const saqla = async (data: Record<string, unknown>) => {
    const r = await api.updateMe(data);
    setMe((m: any) => (m ? { ...m, user: { ...m.user, ...(r?.user || data) } } : m));
    api.me().then(setMe).catch(() => {});
  };

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  // Alifbo va rolni foydalanuvchi o'zgartira olmaydi (Owner admin panelidan qo'yadi).
  // Toifa, imtihon sanasi va hududni o'zi tanlaydi (pastdagi oynalar).
  async function akkauntniOchir() {
    setOchirXato('');
    setOchirilmoqda(true);
    try {
      await api.deleteMe(parol);
      clearToken();
      // Butun holat tozalansin — sahifani qaytadan ochamiz
      window.location.href = '/';
    } catch (e: any) {
      setOchirXato(e?.message || "Akkauntni o'chirib bo'lmadi");
      setOchirilmoqda(false);
    }
  }

  const u = me?.user;
  const s = me?.stats;
  const r = roleOf(u?.role);
  const Ic = ROLE_IC[r];
  const toifa = toifaTop(u?.category)?.kod ?? null; // eski (olib tashlangan) toifalar yangisiga o'giriladi
  const sanaK = sanaKaliti(u?.examDate);
  const qoldi = sanaK ? qolganKun(sanaK) : -1;

  return (
    <div className="db">
      <AppSidebar active="/profil" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <button className="adm-back" onClick={orqaga}><ChevronLeft size={18} /> {orqagaYozuvi()}</button>
        </header>

        <div className="db-content">
          {!u || !s ? (
            <div className="adm-empty">Yuklanmoqda…</div>
          ) : (
            <>
              <div className="adm-head ud-head">
                <div className="ud-id">
                  <span className={'ud-ava ' + r}><Ic size={26} /></span>
                  <div className="ud-id-t">
                    <div className="ud-nom">
                      <h1>{u.firstName || 'Foydalanuvchi'}</h1>
                      <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                    </div>
                    <div className="ud-izoh">Mening sahifam</div>
                  </div>
                </div>
              </div>

              <div className="adm-d-sec">Faollik</div>
              <div className="ud-stats">
                {[
                  { Ic: ClipboardList, c: 'v', n: s.answered, t: 'Javob berilgan' },
                  { Ic: CircleCheck, c: 'g', n: s.correct, t: 'To‘g‘ri' },
                  { Ic: CircleX, c: 'q', n: s.wrong, t: 'Xato' },
                  { Ic: PieChart, c: 'k', n: s.accuracy + '%', t: 'Aniqlik' },
                  { Ic: CircleHelp, c: 's', n: s.solvedQuestions, t: 'Yechilgan savol' },
                  { Ic: FileText, c: 'p', n: s.bookmarks, t: 'Saqlangan' },
                  { Ic: MessageSquare, c: 'f', n: s.totalQuestions, t: 'Jami savol' },
                ].map((x) => (
                  <div className="ud-stat" key={x.t}>
                    <span className={'ud-stat-ic ' + x.c}><x.Ic size={20} /></span>
                    <div><b>{x.n}</b><span>{x.t}</span></div>
                  </div>
                ))}
              </div>

              <div className="ud-card">
                <div className="ud-card-h">Hisob ma’lumotlari</div>
                <div className="ud-grid">
                  {[
                    { Ic: User, k: 'Ism', v: u.firstName || '—' },
                    { Ic: Mail, k: 'Pochta', v: u.email || '—' },
                    { Ic: Phone, k: 'Telefon', v: u.phone || '—' },
                    {
                      Ic: Bookmark, k: 'Toifa', tahrir: 'toifa' as const,
                      v: toifa ? <span className="ud-toifa"><ToifaIkonka kod={toifa} /> <b>{toifa}</b> — {toifaTop(toifa)?.nom}</span> : 'Tanlanmagan',
                    },
                    {
                      Ic: CalendarCheck, k: 'Imtihon sanasi', tahrir: 'sana' as const,
                      v: sanaK ? `${sanaNuqtali(sanaK)}${qoldi > 0 ? ` (${qoldi} kun qoldi)` : qoldi === 0 ? ' (bugun)' : ''}` : sana(u.examDate),
                    },
                    { Ic: MapPin, k: 'Hudud', tahrir: 'hudud' as const, v: hududMatn(u.viloyat, u.tuman) || 'Tanlanmagan' },
                    { Ic: CalendarDays, k: 'Ro‘yxatdan o‘tgan', v: sanaVaqt(u.createdAt) },
                    { Ic: FileText, k: 'Saqlangan savollar', v: (s.bookmarks ?? 0) + ' ta' },
                  ].map((x) => (
                    <div className="ud-row" key={x.k}>
                      <span className="ud-k"><x.Ic size={16} /> {x.k}</span>
                      {'tahrir' in x && x.tahrir ? (
                        <button type="button" className="ud-v ud-tahrir" onClick={() => setOyna(x.tahrir!)} title="O‘zgartirish">
                          {x.v} <Pencil size={13} />
                        </button>
                      ) : (
                        <span className="ud-v">{x.v}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="ud-card">
                <div className="ud-card-h"><Crown size={16} /> Tarif</div>
                <div className="ud-grid">
                  <div className="ud-row">
                    <span className="ud-k">Joriy tarif</span>
                    <button type="button" className="ud-v ud-tahrir" onClick={() => nav('/tariflar')}>
                      {tarif.joriy ? `${tarif.joriy.nom} — ${sanaMatn(tarif.joriy.tugaydi)} gacha` : tarif.daraja >= 3 ? 'Xodim — hammasi ochiq' : 'Bepul (faqat testlar) — tariflarni ko‘rish'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ilovada sozlamalar bitta joyda: til va ko'rinish (yorug'/qorong'i) shu yerda */}
              {mobilIlova() && (
                <div className="ud-card">
                  <div className="ud-card-h"><Languages size={16} /> Til va ko‘rinish</div>
                  <div className="ud-til"><LangTheme /></div>
                </div>
              )}

              {/* Ilova: hisobdan chiqish. Saytda chiqish bosh sahifadagi foydalanuvchi menyusida */}
              {mobilIlova() && (
                <div className="ud-card ud-chiqish-karta">
                  <div className="ud-card-h"><LogOut size={16} /> Hisobdan chiqish</div>
                  <p className="ud-danger-p">
                    Natijalaringiz serverda saqlanib qoladi — qayta kirganingizda hammasi joyida bo‘ladi.
                  </p>
                  {!chiqishSorov ? (
                    <button className="ud-chiqish" onClick={() => setChiqishSorov(true)}>
                      <LogOut size={16} /> Chiqish
                    </button>
                  ) : (
                    <div className="ud-del-row">
                      <button className="ud-chiqish" disabled={chiqilmoqda} onClick={chiqish}>
                        {chiqilmoqda ? 'Chiqilmoqda…' : 'Ha, chiqish'}
                      </button>
                      <button className="adm-btn sec" disabled={chiqilmoqda} onClick={() => setChiqishSorov(false)}>
                        Bekor qilish
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* App Store va Play Market talabi: foydalanuvchi akkauntini ilovaning o'zida o'chira
                  olishi kerak — hozircha yashirilgan (AKKAUNT_OCHIRISH, yuqorida). Saytda ko'rinmaydi. */}
              {mobilIlova() && AKKAUNT_OCHIRISH && (
              <div className="ud-card ud-danger">
                <div className="ud-card-h"><TriangleAlert size={16} /> Akkauntni o‘chirish</div>
                <p className="ud-danger-p">
                  Akkaunt o‘chirilsa — natijalaringiz, xato qilgan savollaringiz va
                  saqlangan savollar <b>butunlay</b> yo‘qoladi. Buni qaytarib bo‘lmaydi.
                </p>

                {!ochirish ? (
                  <button className="ud-del" onClick={() => setOchirish(true)}>
                    <Trash2 size={16} /> Akkauntni o‘chirish
                  </button>
                ) : (
                  <div className="ud-del-form">
                    {u.hasPassword && (
                      <input
                        className="adm-inp"
                        type="password"
                        placeholder="Tasdiqlash uchun parolingiz"
                        value={parol}
                        onChange={(e) => setParol(e.target.value)}
                        autoFocus
                      />
                    )}
                    {ochirXato && <div className="adm-err">{ochirXato}</div>}
                    <div className="ud-del-row">
                      <button className="ud-del" disabled={ochirilmoqda} onClick={akkauntniOchir}>
                        {ochirilmoqda ? 'O‘chirilmoqda…' : 'Ha, butunlay o‘chirilsin'}
                      </button>
                      <button
                        className="adm-btn sec"
                        disabled={ochirilmoqda}
                        onClick={() => { setOchirish(false); setParol(''); setOchirXato(''); }}
                      >
                        Bekor qilish
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>
      </div>
      {oyna === 'sana' && <ImtihonSanasi joriy={sanaK} onClose={() => setOyna('')} onSaqla={(x) => saqla({ examDate: x })} />}
      {oyna === 'toifa' && <ToifaTanlash joriy={toifa} onClose={() => setOyna('')} onSaqla={(k) => saqla({ category: k })} />}
      {oyna === 'hudud' && (
        <HududTanlash viloyat={u?.viloyat ?? null} tuman={u?.tuman ?? null} onClose={() => setOyna('')} onSaqla={(v, t) => saqla({ viloyat: v, tuman: t })} />
      )}
    </div>
  );
}
