import { useEffect, useState } from 'react';
import { Menu, Search, ShieldCheck, ClipboardList, GraduationCap, X } from 'lucide-react';
import {
  adminApi, hasAdmin, isOwner, clearAdmin, ROLE_LABEL,
  type AdminUserRow, type AdminUserDetail, type AdminUserStats, type Role,
} from '../api';
import AppSidebar from '../components/AppSidebar';
import AdminLogin from './AdminLogin';
import '../dashboard.css';

const ROLES: Role[] = ['owner', 'admin', 'user'];

// Rolning nima berishini qisqacha tushuntirish (tasdiqlash oynasida ishlatiladi)
const ROLE_IZOH: Record<Role, string> = {
  owner: 'to‘liq huquq: savollar va rollarni tayinlash',
  admin: 'faqat savollarni ko‘rish, qo‘shish va tahrirlash',
  user: 'oddiy talaba — admin bo‘limlariga kira olmaydi',
};

const ROLE_IC: Record<Role, typeof ShieldCheck> = {
  owner: ShieldCheck,
  admin: ClipboardList,
  user: GraduationCap,
};

const sana = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return '—'; }
};
const sanaVaqt = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('uz-UZ'); } catch { return '—'; }
};
const roleOf = (r: string): Role => (r === 'owner' || r === 'admin' ? r : 'user');
const hisobTuri = (u: AdminUserRow) =>
  u.phone && u.email ? 'Telefon + pochta'
    : u.phone ? 'Telefon + parol'
      : u.email ? 'Pochta + parol'
        : u.tgId?.startsWith('guest-') ? 'Mehmon (qurilma)' : 'Telegram';
const TIL: Record<string, string> = { uz: 'O‘zbek', ru: 'Rus' };
const ALIFBO: Record<string, string> = { lat: 'Lotin', cyr: 'Kirill' };

export default function AdminUsers() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isOwner() || hasAdmin());
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Batafsil oyna
  const [detail, setDetail] = useState<{ user: AdminUserDetail; stats: AdminUserStats } | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailErr, setDetailErr] = useState('');

  const ochish = (id: number) => {
    setDetailId(id);
    setDetail(null);
    setDetailErr('');
    adminApi
      .user(id)
      .then(setDetail)
      .catch((e: any) => setDetailErr(e?.message || 'Ma’lumotni yuklab bo‘lmadi'));
  };
  const yopish = () => { setDetailId(null); setDetail(null); setDetailErr(''); };

  const load = () => {
    setLoading(true);
    setErr('');
    adminApi
      .users(q)
      .then((r) => { setList(r.users || []); setMeId(r.meId ?? null); })
      .catch((e: any) => {
        // Xatoni jimgina yutmaymiz — aks holda ro'yxat "bo'sh" bo'lib ko'rinadi
        if (e?.status === 401) {
          clearAdmin();
          setAuthed(false);
          setList([]);
          setErr('Sessiya tugagan. Qaytadan kiring.');
        } else if (e?.status === 403) {
          setList([]);
          setErr('Bu bo‘lim faqat Owner uchun.');
        } else {
          setErr(e?.message || 'Foydalanuvchilarni yuklab bo‘lmadi');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const almashtir = async (u: AdminUserRow, yangi: Role) => {
    const eski = roleOf(u.role);
    if (yangi === eski) return;
    const savol = `${u.firstName} uchun rol "${ROLE_LABEL[yangi]}" qilinsinmi?\n\n${ROLE_LABEL[yangi]} — ${ROLE_IZOH[yangi]}.`;
    if (!window.confirm(savol)) return;
    setBusyId(u.id);
    setErr('');
    try {
      const r = await adminApi.setUserRole(u.id, yangi);
      setList((l) => l.map((x) => (x.id === u.id ? { ...x, role: r.user.role } : x)));
      // Batafsil oyna ochiq bo'lsa — u ham yangilansin
      setDetail((d) => (d && d.user.id === u.id ? { ...d, user: { ...d.user, role: r.user.role } } : d));
    } catch (e: any) {
      setErr(e?.message || 'Rolni o‘zgartirib bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const mehmon = (u: AdminUserRow) => !!u.tgId?.startsWith('guest-');

  return (
    <div className="db">
      <AppSidebar active="/foydalanuvchilar" open={open} onClose={() => setOpen(false)} />
      <div className="db-main">
        <header className="db-top">
          <button className="db-burger" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="db-search">
            <Search size={17} />
            <input
              placeholder="Ism yoki telefon bo‘yicha qidirish…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
        </header>

        <div className="db-content">
          {err && <div className="adm-err">{err}</div>}

          {!authed ? (
            <AdminLogin onLogin={() => setAuthed(true)} />
          ) : (
            <>
              <div className="adm-head">
                <h1 className="adm-title">Foydalanuvchilar ({list.length})</h1>
              </div>

              <div className="adm-roles-legend">
                {ROLES.map((r) => {
                  const Ic = ROLE_IC[r];
                  return (
                    <span key={r} className={'adm-rl ' + r}>
                      <Ic size={14} /> <b>{ROLE_LABEL[r]}</b> — {ROLE_IZOH[r]}
                    </span>
                  );
                })}
              </div>

              {loading && <div className="adm-empty">Yuklanmoqda…</div>}
              {!loading && !err && list.length === 0 && (
                <div className="adm-empty">Foydalanuvchi topilmadi.</div>
              )}

              <div className="adm-list">
                {list.map((u) => {
                  const r = roleOf(u.role);
                  const Ic = ROLE_IC[r];
                  const ozi = meId != null && meId === u.id;
                  const g = mehmon(u);
                  return (
                    <div className="adm-row adm-u-row" key={u.id} onClick={() => ochish(u.id)} title="Batafsil">
                      <span className={'adm-role-ic ' + r}><Ic size={18} /></span>
                      <div className="adm-u-main">
                        <b>{u.firstName}{ozi ? ' (siz)' : ''}</b>
                        <span>
                          {u.phone || u.email || (g ? 'Mehmon (qurilma hisobi)' : 'Telegram')}
                          {' · '}{sana(u.createdAt)}
                        </span>
                      </div>
                      <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                      <select
                        className="adm-role-sel"
                        value={r}
                        disabled={busyId === u.id || ozi}
                        title={ozi ? 'O‘z rolingizni o‘zgartira olmaysiz' : ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => almashtir(u, e.target.value as Role)}
                      >
                        {ROLES.map((x) => (
                          // Mehmon hisobiga huquq berib bo'lmaydi — server ham buni rad etadi
                          <option key={x} value={x} disabled={g && x !== 'user'}>
                            {ROLE_LABEL[x]}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Batafsil oyna */}
      {detailId != null && (
        <div className="adm-overlay" onClick={yopish}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-mhead">
              <span>{detail ? detail.user.firstName : 'Yuklanmoqda…'}</span>
              <button className="adm-mx" onClick={yopish} title="Yopish"><X size={20} /></button>
            </div>

            <div className="adm-mbody">
              {detailErr && <div className="adm-err">{detailErr}</div>}
              {!detail && !detailErr && <div className="adm-empty">Yuklanmoqda…</div>}

              {detail && (() => {
                const u = detail.user;
                const s = detail.stats;
                const r = roleOf(u.role);
                const Ic = ROLE_IC[r];
                return (
                  <>
                    <div className="adm-d-top">
                      <span className={'adm-role-ic ' + r}><Ic size={20} /></span>
                      <div>
                        <span className={'adm-badge ' + r}>{ROLE_LABEL[r]}</span>
                        <div className="adm-d-sub">{ROLE_IZOH[r]}</div>
                      </div>
                    </div>

                    <div className="adm-d-sec">Hisob</div>
                    <dl className="adm-d-list">
                      <div><dt>ID</dt><dd>{u.id}</dd></div>
                      <div><dt>Ism</dt><dd>{u.firstName}</dd></div>
                      <div><dt>Telefon</dt><dd>{u.phone || '—'}</dd></div>
                      <div><dt>Pochta</dt><dd>{u.email || '—'}</dd></div>
                      <div><dt>Hisob turi</dt><dd>{hisobTuri(u)}</dd></div>
                      <div><dt>Ro‘yxatdan o‘tgan</dt><dd>{sanaVaqt(u.createdAt)}</dd></div>
                      <div><dt>Toifa</dt><dd>{u.category || '—'}</dd></div>
                      <div><dt>Til</dt><dd>{TIL[u.lang] || u.lang || '—'}</dd></div>
                      <div><dt>Alifbo</dt><dd>{ALIFBO[u.alphabet] || u.alphabet || '—'}</dd></div>
                      <div><dt>Imtihon sanasi</dt><dd>{sana(u.examDate)}</dd></div>
                    </dl>

                    <div className="adm-d-sec">Faollik</div>
                    <div className="adm-d-stats">
                      <div className="adm-d-stat"><b>{s.answered}</b><span>Javob berilgan</span></div>
                      <div className="adm-d-stat ok"><b>{s.correct}</b><span>To‘g‘ri</span></div>
                      <div className="adm-d-stat no"><b>{s.wrong}</b><span>Xato</span></div>
                      <div className="adm-d-stat"><b>{s.accuracy}%</b><span>Aniqlik</span></div>
                      <div className="adm-d-stat"><b>{s.solvedQuestions}</b><span>Yechilgan savol</span></div>
                      <div className="adm-d-stat"><b>{s.bookmarks}</b><span>Saqlangan</span></div>
                      <div className="adm-d-stat"><b>{s.complaints}</b><span>Shikoyat</span></div>
                    </div>
                    <dl className="adm-d-list">
                      <div><dt>Birinchi faollik</dt><dd>{sanaVaqt(s.firstActive)}</dd></div>
                      <div><dt>Oxirgi faollik</dt><dd>{sanaVaqt(s.lastActive)}</dd></div>
                    </dl>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
