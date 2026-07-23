import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Bookmark, Share2, Clock, Settings, BarChart3, Info, Volume2,
  Play, Pause, X, SkipForward, Zap, Shuffle, Type, Globe, Flag,
} from 'lucide-react';
import { api } from '../api';
import { haptic, getTelegram } from '../telegram';
import type { Question, Option } from '../types';

interface Answered {
  chosen: number[];
  isCorrect: boolean;
}

const SET_KEY = 'yhq_test_settings';
const SESSION_KEY = 'yhq_test_session';
const SET_DEFAULTS = {
  autoNextCorrect: true,
  autoNextWrong: false,
  noAnim: false,
  shuffle: true,
  fontSize: 'md', // sm | md | lg
  fontStyle: 'soft', // soft | classic
  lang: 'uz',
};
function loadSettings() {
  try {
    return { ...SET_DEFAULTS, ...JSON.parse(localStorage.getItem(SET_KEY) || '{}') };
  } catch {
    return { ...SET_DEFAULTS };
  }
}
function stableShuffle<T extends { id: number }>(arr: T[], seed: number): T[] {
  return [...arr].sort((a, b) => (((a.id * 97 + seed) % 100) - ((b.id * 97 + seed) % 100)));
}
const FS_LABEL: Record<string, string> = { sm: 'Kichik', md: "O'rtacha", lg: 'Katta' };
const FF_LABEL: Record<string, string> = { soft: 'Yumshoq', classic: 'Klassik' };

// Lotinchadan kirillchaga transliteratsiya — baza faqat lotincha, Кирилл tanlanganda shu ishlaydi
const CYR_MAP: Record<string, string> = {
  A: 'А', a: 'а', B: 'Б', b: 'б', V: 'В', v: 'в', G: 'Г', g: 'г', D: 'Д', d: 'д',
  E: 'Е', e: 'е', J: 'Ж', j: 'ж', Z: 'З', z: 'з', I: 'И', i: 'и', Y: 'Й', y: 'й',
  K: 'К', k: 'к', L: 'Л', l: 'л', M: 'М', m: 'м', N: 'Н', n: 'н', O: 'О', o: 'о',
  P: 'П', p: 'п', R: 'Р', r: 'р', S: 'С', s: 'с', T: 'Т', t: 'т', U: 'У', u: 'у',
  F: 'Ф', f: 'ф', X: 'Х', x: 'х', H: 'Ҳ', h: 'ҳ', Q: 'Қ', q: 'қ', C: 'К', c: 'к',
  W: 'В', w: 'в', "'": 'ъ', 'ʼ': 'ъ', 'ʻ': 'ъ',
};
function latToCyr(s: string): string {
  if (!s) return s;
  let r = s;
  const dg: [RegExp, string][] = [
    [/O[`'ʻʼ‘’]/g, 'Ў'], [/o[`'ʻʼ‘’]/g, 'ў'], [/G[`'ʻʼ‘’]/g, 'Ғ'], [/g[`'ʻʼ‘’]/g, 'ғ'],
    [/SH/g, 'Ш'], [/Sh/g, 'Ш'], [/sh/g, 'ш'], [/CH/g, 'Ч'], [/Ch/g, 'Ч'], [/ch/g, 'ч'],
    [/YO/g, 'Ё'], [/Yo/g, 'Ё'], [/yo/g, 'ё'], [/YU/g, 'Ю'], [/Yu/g, 'Ю'], [/yu/g, 'ю'],
    [/YA/g, 'Я'], [/Ya/g, 'Я'], [/ya/g, 'я'], [/YE/g, 'Е'], [/Ye/g, 'Е'], [/ye/g, 'е'],
    [/TS/g, 'Ц'], [/Ts/g, 'Ц'], [/ts/g, 'ц'],
  ];
  for (const [re, v] of dg) r = r.replace(re, v);
  let out = '';
  for (const ch of r) out += CYR_MAP[ch] ?? ch;
  return out;
}

export default function TestPlayer() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const mode = sp.get('mode') || 'all';
  const topicId = sp.get('topicId') || undefined;
  const ticketId = sp.get('ticketId') || undefined;
  const examMode = sp.get('exam') === '1' || mode === 'exam' || mode === '50' || mode === '100';

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answered>>({});
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [bmarks, setBmarks] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [sel, setSel] = useState<number | null>(null); // tanlangan (hali tasdiqlanmagan) variant
  const [seconds, setSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const curRef = useRef<HTMLButtonElement | null>(null);

  // ---- Ovozli pleyer ----
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [aprog, setAprog] = useState(0);
  const [settings, setSettings] = useState<any>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [cfgLang, setCfgLang] = useState<'lat' | 'cyr' | 'rus'>((sp.get('lang') as any) || 'lat');
  const [configured, setConfigured] = useState(!examMode || !!sp.get('lang'));
  const [userName, setUserName] = useState('');
  const tx = (lat: string, cyr: string) =>
    cfgLang === 'cyr' ? (cyr && cyr.trim() ? cyr : latToCyr(lat)) : lat;
  const setS = (k: string, v: any) => setSettings((s: any) => ({ ...s, [k]: v }));
  const saveSettings = () => {
    try {
      localStorage.setItem(SET_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    setShowSettings(false);
  };
  const cycleFont = () => setS('fontSize', settings.fontSize === 'sm' ? 'md' : settings.fontSize === 'md' ? 'lg' : 'sm');
  const cycleStyle = () => setS('fontStyle', settings.fontStyle === 'soft' ? 'classic' : 'soft');

  const stopVoice = () => {
    const a = voiceRef.current;
    if (a) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }
    voiceRef.current = null;
    setPlaying(false);
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  };

  const playUrl = (url: string, fallbackText?: string) => {
    stopVoice();
    setAprog(0);
    setShowPlayer(true);
    const a = new Audio(url);
    voiceRef.current = a;
    a.addEventListener('timeupdate', () => setAprog(a.duration ? a.currentTime / a.duration : 0));
    a.addEventListener('play', () => setPlaying(true));
    a.addEventListener('pause', () => setPlaying(false));
    a.addEventListener('ended', () => {
      setPlaying(false);
      setAprog(1);
    });
    a.play().catch(() => {
      // Fallback: brauzer nutq sintezi
      if (!fallbackText) return;
      try {
        const u = new SpeechSynthesisUtterance(fallbackText);
        u.lang = 'uz-UZ';
        u.rate = 0.95;
        window.speechSynthesis?.speak(u);
        setPlaying(true);
      } catch {
        /* ignore */
      }
    });
  };

  const playVoice = (text: string) => {
    if (!text) return;
    playUrl(`/api/tts?text=${encodeURIComponent(text.slice(0, 1200))}`, text);
  };

  const togglePlay = () => {
    const a = voiceRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const closePlayer = () => {
    stopVoice();
    setShowPlayer(false);
  };

  useEffect(() => {
    // Rejim almashganda toza holatdan boshlaymiz
    setQuestions(null);
    setIdx(0);
    setFinished(false);
    setAnswers({});
    const params: Record<string, string> = { mode };
    if (topicId) params.topicId = topicId;
    if (ticketId) params.ticketId = ticketId;
    api
      .questions(params)
      .then((qs: Question[]) => {
        setQuestions(qs);
        if (examMode) setSeconds(Math.max(qs.length, 10) * 60);
        // Xatolar rejimida: oldin belgilangan xato javoblarni ko'rsatamiz
        if (mode === 'mistakes') {
          const pre: Record<number, Answered> = {};
          for (const qq of qs) {
            const ch = (qq as any).myChosen as number[] | undefined;
            if (ch && ch.length) pre[qq.id] = { chosen: ch, isCorrect: false };
          }
          setAnswers(pre);
        } else {
          // Davom ettirish — saqlangan sessiyani tiklaymiz
          try {
            const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
            if (
              s &&
              s.mode === mode &&
              String(s.topicId || '') === String(topicId || '') &&
              String(s.ticketId || '') === String(ticketId || '') &&
              s.answers
            ) {
              setAnswers(s.answers);
              if (typeof s.idx === 'number' && s.idx < qs.length) setIdx(s.idx);
            }
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => setQuestions([]));
    api.bookmarks().then((ids) => setBmarks(new Set(ids))).catch(() => {});
    api.me().then((m: any) => setUserName(m?.user?.firstName || '')).catch(() => {});
    const sh = sp.get('shuffle');
    if (sh != null) setS('shuffle', sh === '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, topicId, ticketId]);

  useEffect(() => {
    if (!questions || finished) return;
    const id = setInterval(() => {
      if (examMode) {
        setSeconds((s) => {
          if (s <= 1) {
            setFinished(true);
            return 0;
          }
          return s - 1;
        });
      } else {
        setElapsed((e) => e + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [questions, finished, examMode]);

  useEffect(() => {
    startRef.current = Date.now();
    stopVoice(); // savol almashganda ovozni to'xtatadi
    setShowPlayer(false);
    setSel(null); // yangi savolda tanlovni tozalaymiz
    curRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => () => stopVoice(), []); // ekrandan chiqqanda to'xtatadi

  // Sessiyani saqlash — chiqib ketsa, o'sha joydan davom etish uchun
  useEffect(() => {
    if (!questions || finished || mode === 'mistakes' || !configured) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, topicId, ticketId, idx, answers }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answers, questions, finished, configured]);

  if (!configured) {
    const LANGS: [string, string][] = [['lat', '🇺🇿 O‘zbek'], ['cyr', '🇺🇿 Кирилл'], ['rus', '🇷🇺 Рус']];
    return (
      <div className="cfg-wrap">
        <div className="cfg">
          {userName && <div className="cfg-name">{userName.toUpperCase()}</div>}
          <div className="cfg-title">TILNI TANLANG!</div>
          <div className="cfg-langs">
            {LANGS.map(([v, label], i) => (
              <button key={v} className={'cfg-lang' + (cfgLang === v ? ' on' : '')} onClick={() => setCfgLang(v as any)}>
                <span className="cfg-num">{i + 1}</span>
                <span className="cfg-lname">{label}</span>
              </button>
            ))}
          </div>
          <div className="cfg-shuffle">
            <button className={'cfg-sh' + (settings.shuffle ? ' on' : '')} onClick={() => setS('shuffle', true)}>
              Variantlar aralashsin
            </button>
            <button className={'cfg-sh' + (!settings.shuffle ? ' on' : '')} onClick={() => setS('shuffle', false)}>
              Variantlar aralashmasin
            </button>
          </div>
          <div className="cfg-info">
            <b>20 ta aralash savoldan iborat imtihon bileti.</b> Barcha mavzulardan tasodifiy tuzilgan testlar bilan tanishib,
            REAL IMTIHON JARAYONIGA tayyorlaning. Natija (javob holati) har bir javobdan so‘ng ko‘rinadi.
            <b> 3 tadan ortiq xato</b> javobda imtihondan yiqilgan hisoblanasiz.
          </div>
          <div className="cfg-btns">
            <button
              className="cfg-back"
              onClick={() => {
                try {
                  localStorage.removeItem(SESSION_KEY);
                } catch {
                  /* ignore */
                }
                nav('/shablon');
              }}
            >
              ← Orqaga
            </button>
            <button className="cfg-start" onClick={() => { startRef.current = Date.now(); setConfigured(true); }}>
              Boshlash →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions)
    return (
      <div className="splash">
        <div className="spinner" />
        <div>Yuklanmoqda…</div>
      </div>
    );

  if (!questions.length) {
    const EMPTY: Record<string, { em: string; title: string; text: string }> = {
      mistakes: {
        em: '✅',
        title: 'Hali xato yo‘q — barakalla!',
        text: 'Test yechganingizda xato qilgan savollaringiz shu yerda to‘planadi va ularni qayta ishlashingiz mumkin bo‘ladi.',
      },
      saved: {
        em: '🔖',
        title: 'Saqlangan savollar yo‘q',
        text: 'Test yechish paytida savol ustidagi 🔖 tugmasini bosib, muhim savollarni shu yerga saqlab qo‘ying.',
      },
      tricky: {
        em: '🧠',
        title: 'Qiyin savollar topilmadi',
        text: 'Hozircha bu bo‘lim uchun belgilangan savol yo‘q. Boshqa rejimda test yechishni boshlang.',
      },
      numeric: {
        em: '🔢',
        title: 'Raqamli savollar topilmadi',
        text: 'Hozircha bu bo‘lim uchun belgilangan savol yo‘q. Boshqa rejimda test yechishni boshlang.',
      },
    };
    const e = EMPTY[mode] || {
      em: '🎉',
      title: 'Bu bo‘limda hozircha savol yo‘q',
      text: 'Boshqa rejimni tanlang yoki test yechishni boshlang.',
    };
    return (
      <div>
        <button className="back" onClick={() => nav('/')}>← Bosh sahifa</button>
        <div className="empty">
          <div className="em">{e.em}</div>
          <div className="empty-title">{e.title}</div>
          <div className="empty-text">{e.text}</div>
          <div className="empty-btns">
            <button className="empty-cta" onClick={() => nav('/test?mode=practice')}>Test yechishni boshlash →</button>
            <button className="empty-ghost" onClick={() => nav('/')}>Bosh sahifa</button>
          </div>
        </div>
      </div>
    );
  }

  const retry = () => {
    setFinished(false);
    setIdx(0);
    setAnswers({});
    setLearned(new Set());
    startRef.current = Date.now();
    if (examMode) setSeconds(Math.max(questions.length, 10) * 60);
    else setElapsed(0);
  };
  const rTotal = questions.length;
  const rCorrect = questions.filter((qq) => answers[qq.id]?.isCorrect).length;
  const rWrong = questions.filter((qq) => answers[qq.id] && !answers[qq.id].isCorrect).length;
  const rSkip = rTotal - rCorrect - rWrong;
  const rPct = rTotal ? Math.round((rCorrect / rTotal) * 100) : 0;
  const rPass = examMode ? rWrong <= 3 : rPct >= 90;
  const RING_C = 2 * Math.PI * 52;

  const q = questions[idx];
  const ans = answers[q.id];
  const answered = !!ans;
  const isLearned = learned.has(q.id);
  const reveal = answered || isLearned;
  const locked = answered || isLearned;
  const displayOpts = settings.shuffle ? stableShuffle(q.options, q.id) : q.options;

  const shown = examMode ? seconds : elapsed;
  const mm = String(Math.floor(shown / 60)).padStart(2, '0');
  const ss = String(shown % 60).padStart(2, '0');

  const choose = async (optId: number) => {
    if (locked) return;
    haptic();
    const timeMs = Date.now() - startRef.current;
    try {
      const r = await api.answer({ questionId: q.id, chosen: [optId], timeMs });
      haptic(r.isCorrect ? 'success' : 'error');
      setAnswers((a) => ({ ...a, [q.id]: { chosen: [optId], isCorrect: r.isCorrect } }));
      // Sozlamaga qarab keyingi savolga avtomatik o'tish
      const auto = r.isCorrect ? settings.autoNextCorrect : settings.autoNextWrong;
      if (auto) {
        const go = () => setIdx((cur) => (cur < questions.length - 1 ? cur + 1 : cur));
        if (settings.noAnim) go();
        else setTimeout(go, 850);
      }
    } catch {
      /* ignore */
    }
  };

  const explainText = () =>
    q.explanation || 'Bu savol uchun izoh hali kiritilmagan.';

  // Ovozda aytiladigan to'liq tushuntirish: to'g'ri javob + izoh
  const spokenExplain = () => {
    const correct = q.options.find((o) => o.isCorrect);
    return (correct ? `To‘g‘ri javob: ${correct.textLat}. ` : '') + explainText();
  };

  // Tushuncha — javobni OVOZ bilan tushuntiradi (admin ovozi bo'lsa u, bo'lmasa TTS)
  const learn = () => {
    if (!answered) setLearned((s) => new Set(s).add(q.id));
    if (q.hasAudio) playUrl(`/api/questions/${q.id}/audio`, spokenExplain());
    else playVoice(spokenExplain());
  };

  const closeRule = () => setShowRule(false);

  const toggleBm = async () => {
    try {
      const r = await api.toggleBookmark(q.id);
      setBmarks((s) => {
        const n = new Set(s);
        r.bookmarked ? n.add(q.id) : n.delete(q.id);
        return n;
      });
    } catch {
      /* ignore */
    }
  };

  const report = async () => {
    const reason = window.prompt('Shikoyat sababi:');
    if (reason) {
      await api.complaint(q.id, reason).catch(() => {});
      window.alert('Shikoyat yuborildi. Rahmat!');
    }
  };

  const share = () => {
    const appUrl = 'https://t.me/Autostartuzbot';
    const text = `${q.textLat}\n\nAutostart test — YHQ imtihoniga tayyorlaning:`;
    const link = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`;
    const tg = getTelegram();
    if (tg?.openTelegramLink) tg.openTelegramLink(link);
    else if ((navigator as any).share) (navigator as any).share({ title: 'Autostart test', text, url: appUrl }).catch(() => {});
    else window.open(link, '_blank');
  };

  const foptClass = (o: Option) => {
    if (reveal && o.isCorrect) return 'fopt ok';
    if (reveal && answered && ans!.chosen.includes(o.id) && !o.isCorrect) return 'fopt no';
    return 'fopt';
  };
  const foptMark = (o: Option) => {
    if (reveal && o.isCorrect) return '✓';
    if (reveal && answered && ans!.chosen.includes(o.id) && !o.isCorrect) return '✗';
    return '';
  };
  const navClass = (i: number) => {
    const qq = questions[i];
    let c = 'qn';
    if (answers[qq.id]) c += answers[qq.id].isCorrect ? ' green' : ' red';
    if (i === idx) c += ' cur';
    return c;
  };

  /* ===== intalim uslubidagi test oynasi ===== */
  const shablonN = sp.get('n');
  const shablonLabel = shablonN ? `${shablonN} - SHABLON` : examMode ? 'IMTIHON' : 'TEST';
  const SIZES = ['sm', 'md', 'lg'];
  const fontUp = () => setS('fontSize', SIZES[Math.min(SIZES.indexOf(settings.fontSize) + 1, 2)]);
  const fontDown = () => setS('fontSize', SIZES[Math.max(SIZES.indexOf(settings.fontSize) - 1, 0)]);

  const selectOpt = (optId: number) => { if (!locked) setSel(optId); };
  const confirm = async () => {
    if (locked || sel == null) return;
    haptic();
    const timeMs = Date.now() - startRef.current;
    try {
      const r = await api.answer({ questionId: q.id, chosen: [sel], timeMs });
      haptic(r.isCorrect ? 'success' : 'error');
      setAnswers((a) => ({ ...a, [q.id]: { chosen: [sel], isCorrect: r.isCorrect } }));
    } catch {
      /* ignore */
    }
  };
  const optClass = (o: Option) => {
    if (reveal && o.isCorrect) return 'io ok';
    if (reveal && answered && ans!.chosen.includes(o.id) && !o.isCorrect) return 'io no';
    if (!locked && sel === o.id) return 'io sel';
    return 'io';
  };
  const circleClass = (i: number) => {
    const qq = questions[i];
    let c = 'ic';
    if (answers[qq.id]) c += answers[qq.id].isCorrect ? ' ok' : ' no';
    if (i === idx) c += ' cur';
    return c;
  };
  const exit = () => { localStorage.removeItem(SESSION_KEY); nav('/shablon'); };

  return (
    <div className={`tp2 fs-${settings.fontSize} ff-${settings.fontStyle}`}>
      <header className="tp2-top">
        <div className="tp2-brand">
          <img src="/mark.png" alt="" className="tp2-mark" />
          <span className="tp2-word"><b>AUTO</b><i>START</i></span>
        </div>
        <div className="tp2-mid">
          <span className="tp2-shab">{shablonLabel}</span>
          <span className="tp2-timer"><Clock size={15} /> {mm}:{ss}</span>
        </div>
        <div className="tp2-right">
          <span className="tp2-tp">TOPSHIRUVCHI: <b>{(userName || 'Mehmon').toUpperCase()}</b></span>
          <button className={'tp2-ic2' + (bmarks.has(q.id) ? ' on' : '')} onClick={toggleBm} title="Saqlash">
            <Bookmark size={16} fill={bmarks.has(q.id) ? 'currentColor' : 'none'} />
          </button>
          <button className="tp2-esc" onClick={exit} title="Chiqish">ESC</button>
        </div>
      </header>

      <div className="tp2-qbar">{idx + 1}. {tx(q.textLat, q.textCyr)}</div>

      <div className="tp2-tools">
        <button className="tp2-az" onClick={fontUp}>A+</button>
        <button className="tp2-az" onClick={fontDown}>A-</button>
        <button className="tp2-confirm" disabled={locked || sel == null} onClick={confirm}>Javobni tasdiqlash</button>
      </div>

      <div className="tp2-body">
        <div className="tp2-left">
          <div className="tp2-opts">
            {displayOpts.map((o, i) => (
              <button key={o.id} className={optClass(o)} disabled={locked} onClick={() => selectOpt(o.id)}>
                <span className="io-f">F{i + 1}</span>
                <span className="io-radio">
                  {reveal && o.isCorrect ? '⊙' : reveal && answered && ans!.chosen.includes(o.id) && !o.isCorrect ? '⊗' : sel === o.id ? '⊙' : '○'}
                </span>
                <span className="io-text">{tx(o.textLat, o.textCyr)}</span>
              </button>
            ))}
          </div>
          {reveal && (
            <div className="tp2-legend">
              <span className="lg ok">⊙ To‘g‘ri javob</span>
              <span className="lg no">⊗ Nato‘g‘ri javob</span>
              <span className="lg sk">○ Belgilanmagan javob</span>
            </div>
          )}
          <div className="tp2-under">
            <button className="pill" onClick={() => setShowRule(true)}><Info size={16} /> Qoidasi</button>
            <button className="pill learn" onClick={learn}><Volume2 size={16} /> Tushuncha</button>
            <button className="pill" onClick={() => setShowSettings(true)}><Settings size={16} /> Sozlamalar</button>
          </div>
        </div>

        <div className="tp2-imgcol">
          {q.imageUrl ? (
            <div className="tp2-imgwrap"><span className="tp2-imgf">F</span><img src={q.imageUrl} className="tp2-img" /></div>
          ) : (
            <div className="tp2-noimg">Bu savolda rasm yo‘q</div>
          )}
          {showPlayer && (
            <div className="aplayer">
              <button className="pp" onClick={togglePlay}>
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              <div className={'wave' + (playing ? ' playing' : '')}>
                {Array.from({ length: 22 }).map((_, i) => (
                  <i key={i} className={i / 22 <= aprog ? 'on' : ''} style={{ animationDelay: `${(i % 11) * 0.06}s` }} />
                ))}
              </div>
              <button className="pp x" onClick={closePlayer}><X size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="tp2-nav">
        <div className="tp2-circles">
          {questions.map((qq, i) => (
            <button key={qq.id} ref={i === idx ? curRef : null} className={circleClass(i)} onClick={() => setIdx(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="tp2-pn">
          <button disabled={idx === 0} onClick={() => setIdx(Math.max(0, idx - 1))}>‹ oldingi</button>
          <button onClick={() => (idx < questions.length - 1 ? setIdx(idx + 1) : setFinished(true))}>keyingi ›</button>
        </div>
      </div>

      {/* ==== Modallar (izoh, sozlama, natija) ==== */}

      {showRule && (
        <div className="modal" onClick={closeRule}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h3>ⓘ Izoh</h3>
            </div>
            <p>{explainText()}</p>
            {q.ruleRef && <div className="ref">Manba: {q.ruleRef}</div>}
            <button className="btn" style={{ marginTop: 16 }} onClick={closeRule}>
              Yopish
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal" onClick={() => setShowSettings(false)}>
          <div className="sheet settings-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <div className="set-row">
              <span className="set-ic green"><SkipForward size={18} /></span>
              <span className="set-label">To‘g‘ri javobda avtomatik o‘tish</span>
              <button className={'tog' + (settings.autoNextCorrect ? ' on' : '')} onClick={() => setS('autoNextCorrect', !settings.autoNextCorrect)} />
            </div>
            <div className="set-row">
              <span className="set-ic red"><SkipForward size={18} /></span>
              <span className="set-label">Xato javobda avtomatik o‘tish</span>
              <button className={'tog' + (settings.autoNextWrong ? ' on' : '')} onClick={() => setS('autoNextWrong', !settings.autoNextWrong)} />
            </div>
            <div className="set-row">
              <span className="set-ic purple"><Zap size={18} /></span>
              <span className="set-label">Animatsiyasiz o‘tish</span>
              <button className={'tog' + (settings.noAnim ? ' on' : '')} onClick={() => setS('noAnim', !settings.noAnim)} />
            </div>
            <div className="set-row">
              <span className="set-ic amber"><Shuffle size={18} /></span>
              <span className="set-label">Variantlarni aralashtirish</span>
              <button className={'tog' + (settings.shuffle ? ' on' : '')} onClick={() => setS('shuffle', !settings.shuffle)} />
            </div>
            <div className="set-row" onClick={cycleFont}>
              <span className="set-ic purple"><Type size={18} /></span>
              <span className="set-label">Shrift o‘lchami</span>
              <span className="set-val">{FS_LABEL[settings.fontSize]}</span>
            </div>
            <div className="set-row" onClick={cycleStyle}>
              <span className="set-ic blue"><Type size={18} /></span>
              <span className="set-label">Shrift uslubi</span>
              <span className="set-val">{FF_LABEL[settings.fontStyle]}</span>
            </div>
            <div className="set-row">
              <span className="set-ic blue"><Globe size={18} /></span>
              <span className="set-label">Ilova tili</span>
              <span className="set-val">O‘zbekcha</span>
            </div>
            <div className="set-row" onClick={() => { setShowSettings(false); report(); }}>
              <span className="set-ic red"><Flag size={18} /></span>
              <span className="set-label">Xatolik haqida xabar berish</span>
            </div>
            <button className="save-btn" onClick={saveSettings}>Saqlash</button>
          </div>
        </div>
      )}

      {finished && (
        <div className="modal" onClick={() => setFinished(false)}>
          <div className="sheet result-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <h3 className="rtitle">Natijalar</h3>
            <div className="ring-wrap">
              <svg viewBox="0 0 120 120" className="ring">
                <circle cx="60" cy="60" r="52" className="ring-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  className={'ring-fg ' + (rPass ? 'pass' : 'fail')}
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - rPct / 100)}
                />
              </svg>
              <div className="ring-txt">
                <div className={'ring-pct ' + (rPass ? 'pass' : 'fail')}>{rPct}%</div>
                <div className="ring-st">{rPass ? "O‘tdi" : "O‘tmadi"}</div>
              </div>
            </div>
            <div className="rstats">
              <div className="rstat ok">
                <div className="rs-ic">✓</div>
                <div className="rs-n">{rCorrect}</div>
                <div className="rs-l">To‘g‘ri</div>
              </div>
              <div className="rstat no">
                <div className="rs-ic">✕</div>
                <div className="rs-n">{rWrong}</div>
                <div className="rs-l">Noto‘g‘ri</div>
              </div>
              <div className="rstat sk">
                <div className="rs-ic">—</div>
                <div className="rs-n">{rSkip}</div>
                <div className="rs-l">Javobsiz</div>
              </div>
            </div>
            <div className="rgrid-label">Savollar</div>
            <div className="rgrid">
              {questions.map((qq, i) => {
                const a = answers[qq.id];
                const cls = a ? (a.isCorrect ? 'g' : 'r') : '';
                return (
                  <span
                    key={qq.id}
                    className={'rq ' + cls}
                    onClick={() => {
                      setFinished(false);
                      setIdx(i);
                    }}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
            <div className="rbtns">
              <button className="rbtn sec" onClick={retry}>↺ Qayta</button>
              <button className="rbtn main" onClick={() => { localStorage.removeItem(SESSION_KEY); nav('/'); }}>Yakunlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
