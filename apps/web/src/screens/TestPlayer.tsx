import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { haptic, getTelegram } from '../telegram';
import type { Question, Option } from '../types';

interface Answered {
  chosen: number[];
  isCorrect: boolean;
}

const SET_KEY = 'yhq_test_settings';
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
    const params: Record<string, string> = { mode };
    if (topicId) params.topicId = topicId;
    if (ticketId) params.ticketId = ticketId;
    api
      .questions(params)
      .then((qs: Question[]) => {
        setQuestions(qs);
        if (examMode) setSeconds(Math.max(qs.length, 10) * 60);
      })
      .catch(() => setQuestions([]));
    api.bookmarks().then((ids) => setBmarks(new Set(ids))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    curRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => () => stopVoice(), []); // ekrandan chiqqanda to'xtatadi

  if (!questions)
    return (
      <div className="splash">
        <div className="spinner" />
        <div>Yuklanmoqda…</div>
      </div>
    );

  if (!questions.length)
    return (
      <div>
        <button className="back" onClick={() => nav('/')}>← Bosh sahifa</button>
        <div className="empty">
          <div className="em">🎉</div>
          Bu bo‘limda hozircha savol yo‘q.
          <br />
          Boshqa rejimni tanlang.
        </div>
      </div>
    );

  if (finished) {
    const total = questions.length;
    const correct = questions.filter((qq) => answers[qq.id]?.isCorrect).length;
    const answeredCount = questions.filter((qq) => answers[qq.id]).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="result">
        <div className="big">{pct}%</div>
        <div className="sub">
          {total} tadan {correct} ta to‘g‘ri
          <br />
          ({answeredCount} ta javob berildi)
        </div>
        <button
          className="btn"
          onClick={() => {
            setFinished(false);
            setIdx(0);
            setAnswers({});
            setLearned(new Set());
            startRef.current = Date.now();
            if (examMode) setSeconds(Math.max(total, 10) * 60);
            else setElapsed(0);
          }}
        >
          Qaytadan yechish
        </button>
        <div style={{ height: 10 }} />
        <button className="btn sec" onClick={() => nav('/')}>Bosh sahifa</button>
      </div>
    );
  }

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

  return (
    <div className={`tplayer fs-${settings.fontSize} ff-${settings.fontStyle}`}>
      <div className="tbar">
        <button className="tbtn" onClick={() => nav('/')}>← Orqaga</button>
        <button className="tbtn fin" onClick={() => setFinished(true)}>Yakunlash</button>
      </div>

      <div className="tbar2">
        <div className="grp">
          <button className={'sq' + (bmarks.has(q.id) ? ' on' : '')} onClick={toggleBm}>🔖</button>
          <button className="sq" onClick={share}>↗</button>
        </div>
        <div className="ttime">🕐 {mm}:{ss}</div>
        <div className="grp">
          <button className="sq" onClick={() => setShowSettings(true)}>⚙</button>
          <button className="sq" onClick={() => setFinished(true)} title="Natija">📊</button>
        </div>
      </div>

      <div className="qnav">
        {questions.map((qq, i) => (
          <button key={qq.id} ref={i === idx ? curRef : null} className={navClass(i)} onClick={() => setIdx(i)}>
            {i + 1}
          </button>
        ))}
        <button className="qn fin" onClick={() => setFinished(true)}>✓</button>
      </div>

      <div className="qtitle">{q.textLat}</div>
      {q.imageUrl && (
        <div className="qimgwrap">
          <img src={q.imageUrl} />
        </div>
      )}

      <div className="fopts">
        {displayOpts.map((o, i) => (
          <button key={o.id} className={foptClass(o)} disabled={locked} onClick={() => choose(o.id)}>
            <span className="fb">F{i + 1}</span>
            <span className="ftext">{o.textLat}</span>
            <span className="fmark">{foptMark(o)}</span>
          </button>
        ))}
      </div>

      {showPlayer && (
        <div className="aplayer">
          <button className="pp" onClick={togglePlay}>{playing ? '❚❚' : '▶'}</button>
          <div className={'wave' + (playing ? ' playing' : '')}>
            {Array.from({ length: 22 }).map((_, i) => (
              <i
                key={i}
                className={i / 22 <= aprog ? 'on' : ''}
                style={{ animationDelay: `${(i % 11) * 0.06}s` }}
              />
            ))}
          </div>
          <button className="pp x" onClick={closePlayer}>✕</button>
        </div>
      )}

      <div className="qbar">
        <button className="pill" onClick={() => setShowRule(true)}>ⓘ Qoidasi</button>
        <button className="pill learn" onClick={learn}>🔊 Tushuncha</button>
      </div>

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
              <span className="set-ic green">⏭️</span>
              <span className="set-label">To‘g‘ri javobda avtomatik o‘tish</span>
              <button className={'tog' + (settings.autoNextCorrect ? ' on' : '')} onClick={() => setS('autoNextCorrect', !settings.autoNextCorrect)} />
            </div>
            <div className="set-row">
              <span className="set-ic red">⏭️</span>
              <span className="set-label">Xato javobda avtomatik o‘tish</span>
              <button className={'tog' + (settings.autoNextWrong ? ' on' : '')} onClick={() => setS('autoNextWrong', !settings.autoNextWrong)} />
            </div>
            <div className="set-row">
              <span className="set-ic purple">⚡</span>
              <span className="set-label">Animatsiyasiz o‘tish</span>
              <button className={'tog' + (settings.noAnim ? ' on' : '')} onClick={() => setS('noAnim', !settings.noAnim)} />
            </div>
            <div className="set-row">
              <span className="set-ic amber">🔀</span>
              <span className="set-label">Variantlarni aralashtirish</span>
              <button className={'tog' + (settings.shuffle ? ' on' : '')} onClick={() => setS('shuffle', !settings.shuffle)} />
            </div>
            <div className="set-row" onClick={cycleFont}>
              <span className="set-ic purple set-t">T</span>
              <span className="set-label">Shrift o‘lchami</span>
              <span className="set-val">{FS_LABEL[settings.fontSize]}</span>
            </div>
            <div className="set-row" onClick={cycleStyle}>
              <span className="set-ic blue set-t"><b>T</b></span>
              <span className="set-label">Shrift uslubi</span>
              <span className="set-val">{FF_LABEL[settings.fontStyle]}</span>
            </div>
            <div className="set-row">
              <span className="set-ic blue">🌐</span>
              <span className="set-label">Ilova tili</span>
              <span className="set-val">O‘zbekcha</span>
            </div>
            <div className="set-row" onClick={() => { setShowSettings(false); report(); }}>
              <span className="set-ic red">🚩</span>
              <span className="set-label">Xatolik haqida xabar berish</span>
            </div>
            <button className="save-btn" onClick={saveSettings}>Saqlash</button>
          </div>
        </div>
      )}
    </div>
  );
}
