import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Bookmark, Share2, Clock, Settings, BarChart3, Info, Volume2,
  Play, Pause, X, SkipForward, Zap, Shuffle, Type, Globe, Flag, GraduationCap, Eye, Clapperboard, MessageCircle, Send, Trash2, Ban,
} from 'lucide-react';
import { api, mediaUrl, type CommentRow } from '../api';
import { haptic, getTelegram } from '../telegram';
import { latToCyr } from '../translit';
import { mobilIlova } from '../native';
import { setLang } from '../i18n';
import type { Question, Option } from '../types';

interface Answered {
  chosen: number[];
  isCorrect: boolean;
}

const SET_KEY = 'yhq_test_settings';
/**
 * Ilovadagi "Test yechish": 20 ta tasodifiy savol. Holati shu yerda turadi:
 * kamida bitta javob berilgan, lekin hammasi yechilmagan bo'lsa — qayta
 * kirganda o'sha test ochiladi; aks holda (javobsiz yoki to'liq yechilgan)
 * yangi tasodifiy 20 ta savol olinadi.
 */
const AMALIY_KEY = 'yhq_amaliy_test';
const AMALIY_SONI = 20;
type AmaliyTest = { ids: number[]; answers: Record<number, { chosen: number[]; isCorrect: boolean }>; idx: number };
function amaliyOqi(): AmaliyTest | null {
  try { return JSON.parse(localStorage.getItem(AMALIY_KEY) || 'null'); } catch { return null; }
}
const SESSION_KEY = 'yhq_test_session';
const SET_DEFAULTS = {
  autoNextCorrect: true,
  autoNextWrong: false,
  noAnim: false,
  shuffle: true,
  showCorrect: false, // to'g'ri javob belgilashdan oldin ham ko'rinib tursin
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
// Ovozli pleyerdagi to'lqin chiziqlari balandligi (%) — skrinshotdagidek notekis shakl
const TOLQIN = [38, 62, 80, 55, 30, 22, 34, 48, 26, 40, 70, 92, 64, 44, 58, 86, 100, 72, 46, 30,
  52, 78, 60, 36, 24, 42, 66, 88, 74, 50, 32, 56, 82, 68, 40, 28, 46, 72, 90, 58];
const FS_LABEL: Record<string, string> = { sm: 'Kichik', md: "O'rtacha", lg: 'Katta' };
const FF_LABEL: Record<string, string> = { soft: 'Yumshoq', classic: 'Klassik' };

// Transliteratsiya bitta joyda (translit.ts) — avval shu yerda nusxasi bor edi va
// tuzatishlar ikki joyda ayrilib qolardi. Rasmga ishora qiluvchi kalit harflar
// (Faqat A / C / Г ...) o'sha yerda o'zgarishsiz saqlanadi.

export default function TestPlayer() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const mode = sp.get('mode') || 'all';
  const topicId = sp.get('topicId') || undefined;
  const ticketId = sp.get('ticketId') || undefined;
  const shablon = sp.get('shablon') || undefined;
  const limit = sp.get('limit') || undefined;
  const examMode = sp.get('exam') === '1' || mode === 'exam' || mode === '50' || mode === '100';
  // Random test: barcha shablonlardan aralash N ta savol (20/50/100/200)
  const randomMode = mode === 'random';
  // Imtihon me'yori: 20 savolga 25 daqiqa (1.25 daq/savol). Shablon/imtihon uchun
  // avvalgidek qat'iy 25 daqiqa, random uchun savol soniga qarab o'sadi.
  const examSecondsFor = (n: number) => (randomMode ? Math.round(n * 1.25) : 25) * 60;
  // Ruxsat etilgan xato: shablon imtihonida 3 ta; random testda savol soniga nisbatan (15%)
  const maxXato = randomMode ? Math.max(3, Math.round((Number(limit) || 20) * 0.15)) : 3;

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answered>>({});
  // Javoblarning eng so'nggi holati — fon jarayonlari shundan o'qiydi
  const answersRef = useRef<Record<number, Answered>>({});
  // "Davom etish" joyi topildimi (birinchi javobsiz savol)
  const davomTopildi = useRef(false);
  // Tarix tiklanayotganda sessiya SAQLANMAYDI: aks holda savollar chiqishi
  // bilan "idx: 0" yozilib, talabaning haqiqiy joyi o'chib ketardi
  const tiklanmoqda = useRef(true);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [bmarks, setBmarks] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  // Test nima uchun tugadi: '' (odatdagidek), 'xato' (chegaradan oshdi), 'vaqt'
  const [tugashSabab, setTugashSabab] = useState<'' | 'xato' | 'vaqt' | 'toxtatildi'>('');
  const [showRule, setShowRule] = useState(false);
  // Mobil ilovada test oynasi telefon uchun alohida chiziladi (saytga tegmaydi)
  const mobil = mobilIlova();
  const [fabOpen, setFabOpen] = useState(false); // "O'rganish" menyusi ochiqmi
  const [showVideo, setShowVideo] = useState(false); // "Video" oynasi
  // "Muhokama" — savol bo'yicha izohlar
  const [showMuh, setShowMuh] = useState(false);
  const [izohlar, setIzohlar] = useState<CommentRow[] | null>(null);
  const [yangiIzoh, setYangiIzoh] = useState('');
  const [izohXato, setIzohXato] = useState('');
  const [izohYuborilyapti, setIzohYuborilyapti] = useState(false);
  // Bloklangan foydalanuvchilar — faqat shu qurilmada, ularning izohlari ko'rinmaydi
  const [bloklangan, setBloklangan] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('yhq_bloklangan') || '[]'); } catch { return []; }
  });
  // Ilovada barmoq bilan surish: o'ngdan chapga — keyingi, chapdan o'ngga — oldingi savol
  const surish = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    // Raqamlar qatori o'zi yon tomonga suriladi — u yerdagi harakat savolni almashtirmasin
    if ((e.target as HTMLElement).closest('.tpm-nums, .modal, .tp2-lightbox')) { surish.current = null; return; }
    const t = e.touches[0];
    surish.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const bosh = surish.current;
    surish.current = null;
    if (!bosh) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - bosh.x;
    const dy = t.clientY - bosh.y;
    // Asosan gorizontal va yetarlicha uzun harakat — aks holda bu oddiy vertikal skroll
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && questions && idx < questions.length - 1) setIdx(idx + 1);
    else if (dx > 0 && idx > 0) setIdx(idx - 1);
  };
  const [sel, setSel] = useState<number | null>(null); // tanlangan (hali tasdiqlanmagan) variant
  const kbRef = useRef<{ opts: { id: number }[]; select: (id: number) => void }>({ opts: [], select: () => {} });
  const [showImg, setShowImg] = useState(false); // rasm lightbox (F tugmasi)
  const [seconds, setSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // Ilovadagi "Barcha testlar": bankdagi savollar soni — teskari sanoq uchun
  const [jamiSoni, setJamiSoni] = useState(0);
  const startRef = useRef<number>(Date.now());
  const curRef = useRef<HTMLButtonElement | null>(null);
  // Javobdan keyin keyingi savolga o'tish taymeri (qo'lda o'tsa bekor qilinadi)
  const nextRef = useRef<number | null>(null);
  const clearNext = () => {
    if (nextRef.current != null) {
      clearTimeout(nextRef.current);
      nextRef.current = null;
    }
  };

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
  const tx = (lat: string, cyr: string, rus?: string) =>
    cfgLang === 'cyr'
      ? cyr && cyr.trim() ? cyr : latToCyr(lat)
      : cfgLang === 'rus'
        ? rus && rus.trim() ? rus : lat
        : lat;
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
    setTugashSabab('');
    setAnswers({});
    answersRef.current = {};
    davomTopildi.current = false;
    const params: Record<string, string> = { mode };
    // Ilovadagi "Barcha testlar" savollari shablon tartibida keladi
    if (mobil && mode === 'all') params.tartib = 'shablon';
    // Ilovadagi "Xatolarni tuzatish" — faqat ilovada xato qilinganlar
    if (mobil && mode === 'mistakes') params.manba = 'ilova';
    if (topicId) params.topicId = topicId;
    if (ticketId) params.ticketId = ticketId;
    if (shablon) params.shablon = shablon;
    if (limit) params.limit = limit;
    // Ilovadagi "Test yechish": tugallanmagan test bo'lsa o'shani, bo'lmasa
    // yangi tasodifiy 20 ta savolni olamiz
    const amaliyot = mobil && mode === 'practice';
    const amaliyEski = amaliyot ? amaliyOqi() : null;
    const amaliyJavoblar = amaliyEski ? Object.keys(amaliyEski.answers || {}).length : 0;
    const amaliyDavom =
      !!amaliyEski && (amaliyEski.ids?.length || 0) > 0 && amaliyJavoblar >= 1 && amaliyJavoblar < amaliyEski.ids.length;
    const soralgan: Record<string, string> = !amaliyot
      ? params
      : amaliyDavom
        ? { ids: amaliyEski!.ids.join(',') }
        : { mode: 'random', limit: String(AMALIY_SONI) };
    // Rejim almashsa yoki sahifa yopilsa fondagi yuklash to'xtaydi
    let bekor = false;
    tiklanmoqda.current = true;
    // Mahalliy sessiya savollar kelishidan OLDIN o'qiladi (keyin ustiga yozilmasin)
    let oldingiSessiya: any = null;
    try {
      oldingiSessiya = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      /* ignore */
    }
    // Saqlangan joy hali yuklanmagan qismda bo'lsa (masalan 300-savol) —
    // o'sha qism fonda yuklangach shu savolga o'tiladi
    let kutIdx: number | null = null;
    api
      .questions(soralgan)
      .then(async (qs: Question[]) => {
        setQuestions(qs);
        if (amaliyot) {
          if (amaliyDavom && amaliyEski) {
            // Tugallanmagan test — javoblar va turgan joy bilan
            setAnswers(amaliyEski.answers || {});
            setIdx(Math.min(Math.max(0, amaliyEski.idx || 0), Math.max(0, qs.length - 1)));
          } else {
            try {
              localStorage.setItem(AMALIY_KEY, JSON.stringify({ ids: qs.map((x) => x.id), answers: {}, idx: 0 }));
            } catch { /* ignore */ }
          }
          tiklanmoqda.current = false;
          return;
        }
        // Ilovadagi "Barcha testlar": server bir so'rovda 120 tadan beradi —
        // qolgan savollar fonda, bo'lib-bo'lib qo'shiladi (butun bank).
        const fonYukla =
          mobil && mode === 'all' && !limit && qs.length >= 120
            ? async () => {
            let offset = qs.length;
            const bor = new Set(qs.map((x) => x.id));
            for (let i = 0; i < 40 && !bekor; i++) {
              const sahifa: Question[] = await api
                .questions({ mode: 'all', tartib: 'shablon', offset: String(offset) })
                .catch(() => []);
              if (bekor || !sahifa.length) break;
              // Server `offset`ni bilmasa (eski versiya) o'sha savollarni qayta
              // beradi — takrorlarni tashlaymiz, yangisi bo'lmasa to'xtaymiz.
              const yangi = sahifa.filter((x) => !bor.has(x.id));
              if (!yangi.length) break;
              yangi.forEach((x) => bor.add(x.id));
              setQuestions((eski) => (eski ? [...eski, ...yangi] : eski));
              /*
                Birinchi sahifadagi savollarning HAMMASI yechilgan bo'lsa,
                davom etish joyi keyingi sahifalarda bo'ladi — o'quvchi
                yana boshidan boshlamasligi kerak.
              */
              if (kutIdx !== null && offset + yangi.length > kutIdx) {
                // Talaba to'xtagan savol shu qismda — o'sha joyga olib boramiz
                davomTopildi.current = true;
                setIdx(kutIdx);
                kutIdx = null;
              } else if (!davomTopildi.current && kutIdx === null) {
                const joy = yangi.findIndex((x) => !answersRef.current[x.id]);
                if (joy >= 0) {
                  davomTopildi.current = true;
                  setIdx(offset + joy);
                }
              }
              offset += sahifa.length;
              if (sahifa.length < 120) break;
            }
          }
            : null;
        if (examMode) setSeconds(examSecondsFor(qs.length));
        // Xatolar rejimida: oldin belgilangan xato javoblarni ko'rsatamiz
        // Ilovada xatolar belgilanmagan holda ochiladi — talaba qaytadan yechadi
        // (to'g'ri javob bersa, keyingi safar ro'yxatda bo'lmaydi). Saytda avvalgidek.
        if (mode === 'mistakes' && mobil) {
          // hech narsa oldindan belgilanmaydi
        } else if (mode === 'mistakes') {
          const pre: Record<number, Answered> = {};
          for (const qq of qs) {
            const ch = (qq as any).myChosen as number[] | undefined;
            if (ch && ch.length) pre[qq.id] = { chosen: ch, isCorrect: false };
          }
          setAnswers(pre);
        } else if (!randomMode) {
          /*
            DAVOM ETISH ikki manbadan yig'iladi:

            1) SERVER — o'quvchining har savol bo'yicha oxirgi javobi
               (`/progress/answers`). Javoblar PROFILGA bog'langan:
               ilova o'chirib yoqilsa, brauzer xotirasi tozalansa yoki
               boshqa rejim ochilib mahalliy sessiya ustiga yozilsa ham
               yechilgan savollar joyida qoladi. Ilgari faqat mahalliy
               sessiya bor edi va shu sabab "Barcha savollar" ba'zan
               yechilmagan bo'lib ochilardi.
            2) MAHALLIY SESSIYA — shu qurilmadagi eng so'nggi holat
               (qaysi savolda turgani ham shunda). U serverdagi javob
               ustiga qo'yiladi: aloqasiz yechilgan javoblar ham
               yo'qolmaydi.

            Imtihon rejimi bundan mustasno: u har safar toza boshlanadi.
          */
          let oldin: Record<number, Answered> = {};
          // Faqat ILOVADA va faqat ilovada berilgan javoblar: saytda (yoki
          // ilovadan oldin) yechilganlar bu yerda "yechilgan" bo'lib chiqmaydi.
          // Saytning test oynasi avvalgidek — faqat shu brauzerdagi sessiya.
          if (!examMode && mobil) {
            try {
              const { list } = await api.myAnswers('ilova');
              for (const a of list)
                oldin[a.questionId] = { chosen: a.chosen, isCorrect: a.isCorrect };
            } catch {
              /* aloqa yo'q — mahalliy sessiya baribir qoladi */
            }
          }

          let sessiya: any = null;
          try {
            const s = oldingiSessiya;
            if (
              s &&
              s.mode === mode &&
              String(s.topicId || '') === String(topicId || '') &&
              String(s.ticketId || '') === String(ticketId || '') &&
              s.answers
            ) {
              sessiya = s;
            }
          } catch {
            /* ignore */
          }

          if (bekor) return;

          const birlashgan = { ...oldin, ...(sessiya?.answers || {}) };
          if (Object.keys(birlashgan).length) setAnswers(birlashgan);

          if (sessiya && typeof sessiya.idx === 'number' && sessiya.idx < qs.length) {
            davomTopildi.current = true;
            setIdx(sessiya.idx);
          } else if (mobil && fonYukla && sessiya && typeof sessiya.idx === 'number') {
            kutIdx = sessiya.idx; // fonda yuklanadigan qismda — fonYukla o'tkazadi
          } else if (!mobil) {
            // Sayt: avvalgidek — boshqa narsa qilinmaydi
          } else {
            // Sessiya yo'q — birinchi JAVOBSIZ savoldan davom etamiz
            const joy = qs.findIndex((qq) => !birlashgan[qq.id]);
            if (joy > 0) {
              davomTopildi.current = true;
              setIdx(joy);
            } else if (joy === 0) {
              davomTopildi.current = true;
            }
          }
        }
        // Tarix (javoblar va to'xtagan joy) tiklangach — endi qolgan savollar
        tiklanmoqda.current = false;
        if (!bekor && fonYukla) fonYukla();
      })
      .catch(() => { tiklanmoqda.current = false; setQuestions([]); });
    api.bookmarks().then((ids) => setBmarks(new Set(ids))).catch(() => {});
    api.me().then((m: any) => {
      setUserName(m?.user?.firstName || '');
      if (mobil && mode === 'all') setJamiSoni(Number(m?.stats?.totalQuestions) || 0);
    }).catch(() => {});
    const sh = sp.get('shuffle');
    if (sh != null) setS('shuffle', sh === '1');
    return () => { bekor = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, topicId, ticketId, shablon, limit]);

  useEffect(() => {
    if (!questions || finished) return;
    const id = setInterval(() => {
      if (examMode) {
        setSeconds((s) => {
          if (s <= 1) {
            setTugashSabab('vaqt');
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
    clearNext(); // qo'lda boshqa savolga o'tilsa, kutilayotgan avto-o'tish bekor
    stopVoice(); // savol almashganda ovozni to'xtatadi
    setShowPlayer(false);
    setSel(null); // yangi savolda tanlovni tozalaymiz
    setShowImg(false);
    setShowRule(false); // yangi savolda qoida yopiladi
    curRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => () => { stopVoice(); clearNext(); }, []); // ekrandan chiqqanda to'xtatadi

  // F tugmasi — rasmni kattalashtirish (lightbox), Esc — yopish
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // F1..F5 — javob variantini tanlash (ko'rsatilgan tartibda)
      const fm = e.key.match(/^F([1-9]|1[0-2])$/);
      if (fm) {
        const n = Number(fm[1]);
        const opts = kbRef.current.opts;
        if (n >= 1 && n <= opts.length) {
          e.preventDefault();
          kbRef.current.select(opts[n - 1].id);
        }
        return;
      }
      if (e.key === 'Escape') { setShowImg(false); return; }
      if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        const cur = questions?.[idx];
        if (cur?.imageUrl) setShowImg((v) => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [questions, idx]);

  // Fon jarayonlari (savollarni bo'lib yuklash) eng so'nggi javoblarni ko'rsin
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Sessiyani saqlash — chiqib ketsa, o'sha joydan davom etish uchun
  useEffect(() => {
    if (!questions || finished || mode === 'mistakes' || !configured) return;
    if (tiklanmoqda.current) return;
    // Ilovadagi "Test yechish" o'z holatini alohida saqlaydi
    if (mobil && mode === 'practice') {
      try {
        localStorage.setItem(AMALIY_KEY, JSON.stringify({ ids: questions.map((x) => x.id), answers, idx }));
      } catch { /* ignore */ }
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, topicId, ticketId, idx, answers }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answers, questions, finished, configured]);

  if (!configured) {
    const LANGS: [string, string][] = [['lat', '🇺🇿 O‘zbek'], ['cyr', '🇺🇿 Кирилл'], ['rus', '🇷🇺 Рус']];
    const cfgCount = Number(limit) || questions?.length || 20;
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
            {randomMode ? (
              <>
                <b>{cfgCount} ta savol — barcha shablonlardan tasodifiy tanlanadi.</b> Har safar yangi to‘plam
                tuziladi. Natija (javob holati) har bir javobdan so‘ng ko‘rinadi.
                <b> {Math.max(3, Math.round(cfgCount * 0.15))} ta xato</b> javob berilsa imtihon to‘xtatiladi.
              </>
            ) : (
              <>
                <b>20 ta aralash savoldan iborat imtihon bileti.</b> Barcha mavzulardan tasodifiy tuzilgan testlar bilan tanishib,
                REAL IMTIHON JARAYONIGA tayyorlaning. Natija (javob holati) har bir javobdan so‘ng ko‘rinadi.
                <b> 3 ta xato</b> javob berilsa imtihon to‘xtatiladi va yiqilgan hisoblanasiz.
              </>
            )}
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
                nav(randomMode ? '/random' : '/shablon');
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
    setTugashSabab('');
    setIdx(0);
    setAnswers({});
    setLearned(new Set());
    startRef.current = Date.now();
    if (examMode) setSeconds(examSecondsFor(questions.length));
    else setElapsed(0);
  };
  const rTotal = questions.length;
  const rCorrect = questions.filter((qq) => answers[qq.id]?.isCorrect).length;
  const rWrong = questions.filter((qq) => answers[qq.id] && !answers[qq.id].isCorrect).length;
  const rSkip = rTotal - rCorrect - rWrong;
  const rPct = rTotal ? Math.round((rCorrect / rTotal) * 100) : 0;
  // Imtihon: 20 savolga 3 xato (15%). Random testda savol soni turlicha —
  // shu nisbat saqlanadi (50→8, 100→15, 200→30).
  const rMaxWrong = randomMode ? Math.max(3, Math.round(rTotal * 0.15)) : maxXato;
  // maxXato ta xato = imtihon to'xtaydi va yiqilgan hisoblanadi
  // Doira rangi natijaga qarab: past foizda yashil turishi chalg'itardi.
  // "O'tdi/O'tmadi" yozuvi olib tashlandi — test yarmida to'xtatilganda
  // "o'tdi" deb ko'rsatish noto'g'ri edi.
  const ringRang = rPct >= 90 ? 'pass' : rPct >= 70 ? 'mid' : 'fail';
  const RING_C = 2 * Math.PI * 52;

  const q = questions[idx];
  const ans = answers[q.id];
  const answered = !!ans;
  const isLearned = learned.has(q.id);
  const reveal = answered || isLearned;
  const locked = answered || isLearned;
  const displayOpts = settings.shuffle ? stableShuffle(q.options, q.id) : q.options;

  // Ilovadagi "Barcha testlar" — teskari sanoq (Oson Pravadagidek): har savolga
  // 75 soniya, 1260 savol = 1575:00 dan boshlab kamayadi. Saytda avvalgidek.
  const SAVOLGA_SONIYA = 75;
  // Ilovada: Barcha testlar, Xatolarni tuzatish va Test yechish — hammasida
  // teskari sanoq, har savolga 75 soniya (1.25 daqiqa)
  const teskariSanoq = mobil && (mode === 'all' || mode === 'mistakes' || mode === 'practice');
  const shown = teskariSanoq
    ? Math.max(0, (jamiSoni || questions.length) * SAVOLGA_SONIYA - elapsed)
    : examMode ? seconds : elapsed;
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
    if (q.hasAudio) playUrl(mediaUrl(`/api/questions/${q.id}/audio`)!, spokenExplain());
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

  // ===== Muhokama =====
  const muhokamaniOch = () => {
    setShowMuh(true);
    setIzohlar(null);
    setIzohXato('');
    api.comments(q.id).then(setIzohlar).catch(() => setIzohlar([]));
  };
  const izohYubor = async () => {
    const text = yangiIzoh.trim();
    if (!text || izohYuborilyapti) return;
    setIzohYuborilyapti(true);
    setIzohXato('');
    try {
      const c = await api.addComment(q.id, text);
      setIzohlar((l) => [c, ...(l || [])]);
      setYangiIzoh('');
    } catch (e: any) {
      setIzohXato(e?.message || 'Yuborib bo‘lmadi');
    } finally {
      setIzohYuborilyapti(false);
    }
  };
  const izohniOchir = async (c: CommentRow) => {
    if (!window.confirm('Izohingiz o‘chirilsinmi?')) return;
    await api.deleteComment(c.id).catch(() => {});
    setIzohlar((l) => (l || []).filter((x) => x.id !== c.id));
  };
  const shikoyat = async (c: CommentRow) => {
    if (!window.confirm('Bu izoh haqoratli yoki nomaqbulmi? Shikoyat yuborilsinmi?')) return;
    await api.reportComment(c.id).catch(() => {});
    // Shikoyat qilgan odamga u darhol ko'rinmaydi
    setIzohlar((l) => (l || []).filter((x) => x.id !== c.id));
    window.alert('Shikoyat yuborildi. Rahmat!');
  };
  const blokla = (c: CommentRow) => {
    if (!window.confirm(c.name + ' bloklansinmi? Uning izohlari sizga ko‘rinmaydi.')) return;
    const yangi = Array.from(new Set([...bloklangan, c.userId]));
    setBloklangan(yangi);
    try { localStorage.setItem('yhq_bloklangan', JSON.stringify(yangi)); } catch { /* ignore */ }
  };

  const share = () => {
    const appUrl = 'https://t.me/Autostartuzbot';
    const text = `${q.textLat}\n\nAutostart test — YHQ imtihoniga tayyorlaning:`;
    if (mobil) {
      // Android WebView'da navigator.share yo'q — Capacitor plagini tizimning
      // "Ulashish" oynasini ochadi (Telegram, WhatsApp, Gmail...)
      import('@capacitor/share')
        .then(({ Share }) => Share.share({ title: 'Autostart test', text, url: appUrl, dialogTitle: 'Ulashish' }))
        .catch(() => {});
      return;
    }
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
  const shablonLabel = shablonN
    ? `${shablonN} - SHABLON`
    : randomMode
      ? `RANDOM ${questions.length}`
      : examMode ? 'IMTIHON' : 'TEST';
  const fscale = settings.fontScale ?? 1;
  const fontUp = () => setS('fontScale', Math.min(fscale + 0.12, 4));
  const fontDown = () => setS('fontScale', Math.max(fscale - 0.12, 0.7));

  // Variant tanlanishi = javob berish. Alohida "tasdiqlash" bosqichi yo'q:
  // to'g'ri/noto'g'ri darrov ko'rinadi va 2 sekunddan keyin keyingi savolga o'tadi.
  const selectOpt = async (optId: number) => {
    if (locked || sel != null) return; // sel != null — javob yuborilayotgan payt ikkinchi bosishni to'sadi
    setSel(optId);
    haptic();
    const timeMs = Date.now() - startRef.current;
    let r: { isCorrect: boolean };
    try {
      r = await api.answer({ questionId: q.id, chosen: [optId], timeMs });
    } catch {
      setSel(null); // yuborilmadi — qayta tanlash mumkin
      return;
    }
    haptic(r.isCorrect ? 'success' : 'error');
    const yangi = { ...answers, [q.id]: { chosen: [optId], isCorrect: r.isCorrect } };
    setAnswers(yangi);

    // IMTIHON QOIDASI: xatolar chegarasidan oshsa — test shu yerda tugaydi
    const xatolar = questions.filter((qq) => yangi[qq.id] && !yangi[qq.id].isCorrect).length;
    const chegaradanOshdi = examMode && xatolar >= maxXato;

    const last = idx >= questions.length - 1;
    clearNext();
    // Ilovada sozlamalar hisobga olinadi: to'g'ri/xato javobda avtomatik o'tish
    // va animatsiyasiz (kutmasdan) o'tish. Saytda avvalgidek — har doim 2 s.
    // Imtihonda xatolar chegarasi esa har qanday holatda testni tugatadi.
    const avto = !mobil || (r.isCorrect ? settings.autoNextCorrect : settings.autoNextWrong);
    if (!avto && !chegaradanOshdi) return;
    const kutish = mobil && settings.noAnim ? 0 : 2000;
    nextRef.current = window.setTimeout(() => {
      nextRef.current = null;
      if (chegaradanOshdi) {
        setTugashSabab('xato');
        setFinished(true);
      } else if (last) {
        setFinished(true);
      } else {
        setIdx(idx + 1);
      }
    }, kutish);
  };
  kbRef.current = { opts: displayOpts, select: selectOpt }; // klaviatura (F1-F5) uchun eng so'nggi holat
  const optClass = (o: Option) => {
    if (reveal && o.isCorrect) return 'io ok';
    if (mobil && settings.showCorrect && o.isCorrect) return 'io ok';
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
  // Test qachon to'xtatilishidan qat'i nazar — avval NATIJA ko'rsatiladi.
  // Avval ESC to'g'ridan-to'g'ri chiqarib yuborardi va natija ko'rinmasdi.
  const exit = () => {
    clearNext();
    // Ilovada: chiqish tugmasi to'g'ridan-to'g'ri bosh menyuga. Javoblar
    // saqlanib qoladi (sessiya) — keyin shu joydan davom ettirsa bo'ladi.
    if (mobil) {
      nav('/');
      return;
    }
    if (!finished) {
      setTugashSabab('toxtatildi');
      setFinished(true);
      return;
    }
    sessiyaniOchir();
    nav(randomMode ? '/random' : '/shablon');
  };
  /*
    Sessiyani o'chirish — FAQAT tugallanadigan testlarda (shablon, bilet,
    imtihon). "Barcha savollar" uzluksiz mashq: bayroqcha bosilib natija
    ko'rilgach ham yechilgan savollar TARIXI joyida qolishi kerak —
    ilgari "Yakunlash" uni o'chirib yuborardi va ro'yxat toza ochilardi.
    Javoblar serverda ham saqlanadi, sessiya esa qaysi savolda
    turganini eslab qoladi.
  */
  const sessiyaniOchir = () => {
    // Ilovadagi "Barcha testlar" tarixi Yakunlashda o'chmaydi; saytda avvalgidek
    if (mobil && mode === 'all') return;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  };
  // Natija oynasidagi "Yakunlash" — shu yerda haqiqatan chiqiladi
  const yakunla = () => {
    sessiyaniOchir();
    // Ilovada natija oynasidan (bayroqcha) ham bosh menyuga qaytiladi
    nav(mobil ? '/' : randomMode ? '/random' : '/shablon');
  };

  return (
    <div
      className={`tp2 ff-${settings.fontStyle}`}
      style={{ ['--fs' as any]: fscale }}
      onTouchStart={mobil ? onTouchStart : undefined}
      onTouchEnd={mobil ? onTouchEnd : undefined}
    >
      {mobil ? (
        <div className="tpm-head">
          <header className="tpm-top">
            <button className="tpm-ic" onClick={exit} title="Chiqish"><ChevronLeft size={21} /></button>
            <button className={'tpm-ic' + (bmarks.has(q.id) ? ' on' : '')} onClick={toggleBm} title="Saqlash">
              <Bookmark size={19} fill={bmarks.has(q.id) ? 'currentColor' : 'none'} />
            </button>
            <button className="tpm-ic" onClick={share} title="Ulashish"><Share2 size={19} /></button>
            <span className="tpm-timer"><Clock size={18} /> {mm}:{ss}</span>
            <button className="tpm-ic" onClick={() => setShowSettings(true)} title="Sozlamalar"><Settings size={19} /></button>
            <button className="tpm-ic" onClick={() => { clearNext(); setTugashSabab(''); setFinished(true); }} title="Natijalar">
              <Flag size={19} />
            </button>
          </header>
          <div className="tpm-sep" />
          {/* Savollar raqami — yuqorida, yon tomonga suriladi */}
          <div className="tpm-nums">
            {questions.map((qq, i) => (
              <button key={qq.id} ref={i === idx ? curRef : null} className={circleClass(i)} onClick={() => setIdx(i)}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
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
      )}

      <div className="tp2-qbar">
        {!mobil && <>{idx + 1}. </>}{tx(q.textLat, q.textCyr, (q as any).textRus)}
        {typeof q.xatoUlushi === 'number' && (
          <span className="tp2-xato" title={`${q.xatoSoni} talaba ${q.jamiJavob} tadan xato qilgan`}>
            Talabalarning {q.xatoUlushi}% i xato qilgan
          </span>
        )}
      </div>

      {!mobil && (
      <div className="tp2-tools">
        <button className="tp2-az" onClick={fontUp}>A+</button>
        <button className="tp2-az" onClick={fontDown}>A-</button>
      </div>
      )}

      <div className="tp2-body">
        <div className="tp2-left">
          <div className="tp2-opts">
            {displayOpts.map((o, i) => (
              <button key={o.id} className={optClass(o)} disabled={locked} onClick={() => selectOpt(o.id)}>
                <span className="io-f">F{i + 1}</span>
                <span className="io-radio">
                  {reveal && o.isCorrect ? '⊙' : reveal && answered && ans!.chosen.includes(o.id) && !o.isCorrect ? '⊗' : sel === o.id ? '◉' : '○'}
                </span>
                <span className="io-text">{tx(o.textLat, o.textCyr, (o as any).textRus)}</span>
              </button>
            ))}
          </div>
          {reveal && !mobil && (
            <div className="tp2-legend">
              <span className="lg ok">⊙ To‘g‘ri javob</span>
              <span className="lg no">⊗ Nato‘g‘ri javob</span>
              <span className="lg sk">○ Belgilanmagan javob</span>
            </div>
          )}
          {!mobil && <div className="tp2-under">
            <button className={'pill' + (showRule ? ' active' : '')} onClick={() => setShowRule((v) => !v)}><Info size={16} /> Qoidasi</button>
            <button className="pill learn" onClick={learn}><Volume2 size={16} /> Tushuncha</button>
          </div>}
          {!mobil && showRule && (
            <div className="tp2-rule">
              <p>{explainText()}</p>
              {q.ruleRef && <div className="tp2-rule-ref">Manba: {q.ruleRef}</div>}
            </div>
          )}
        </div>

        <div className="tp2-imgcol">
          {q.imageUrl ? (
            <div className="tp2-imgwrap">
              <button className="tp2-imgf" onClick={() => setShowImg(true)} title="Kattalashtirish (F)">F</button>
              <img src={mediaUrl(q.imageUrl)} className="tp2-img" onClick={() => setShowImg(true)} />
            </div>
          ) : (
            <div className="tp2-noimg">
              <img src="/placeholder-car.jpg" alt="autostart.uz" className="tp2-noimg-img" />
            </div>
          )}
          {showPlayer && !mobil && (
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
        {!mobil && (
        <div className="tp2-circles">
          {questions.map((qq, i) => (
            <button key={qq.id} ref={i === idx ? curRef : null} className={circleClass(i)} onClick={() => setIdx(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        )}
        {!mobil && <div className="tp2-pn">
          <button disabled={idx === 0} onClick={() => setIdx(Math.max(0, idx - 1))}>‹ oldingi</button>
          <button onClick={() => (idx < questions.length - 1 ? setIdx(idx + 1) : setFinished(true))}>keyingi ›</button>
        </div>}
      </div>

      {/* ===== Ilova: "O'rganish" menyusi (pastki o'ng burchak) ===== */}
      {mobil && (
        <div className={'tpm-fab' + (fabOpen ? ' open' : '')}>
          {fabOpen && (
            <>
              {showPlayer ? (
                <div className="tpm-fab-i tpm-fab-player">
                  <button className="tpm-pp" onClick={togglePlay} title={playing ? 'To‘xtatish' : 'Eshitish'}>
                    {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  {/* Ovoz to'lqini: shakli doimiy, eshitilgan qismi oqaradi */}
                  <div className="tpm-wave">
                    {TOLQIN.map((h, i) => (
                      <i key={i} className={i / TOLQIN.length < aprog ? 'on' : ''} style={{ height: h + '%' }} />
                    ))}
                  </div>
                </div>
              ) : (
                <button className="tpm-fab-i" onClick={learn}>
                  <Play size={19} fill="currentColor" /> Ovozli
                </button>
              )}
              <button className="tpm-fab-i" onClick={() => setShowVideo(true)}>
                <Clapperboard size={19} /> Video
              </button>
              <button className="tpm-fab-i" onClick={() => setShowRule(true)}>
                <Info size={19} /> Qoidasi
              </button>
              <button className="tpm-fab-i" onClick={muhokamaniOch}>
                <MessageCircle size={19} /> Muhokama
              </button>
            </>
          )}
          <button
            className="tpm-fab-main"
            onClick={() => {
              // Menyu yopilsa ovoz ham to'xtaydi — pleyer menyuning ichida
              if (fabOpen) closePlayer();
              setFabOpen((v) => !v);
            }}
          >
            {fabOpen ? <X size={19} /> : <GraduationCap size={19} />} O‘rganish
          </button>
        </div>
      )}

      {/* ===== Ilova: Video — savol mavzusi va video darsliklar ===== */}
      {mobil && showVideo && (
        <div className="modal" onClick={() => setShowVideo(false)}>
          <div className="sheet tpm-video" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <div className="tpm-video-q">{tx(q.textLat, q.textCyr, (q as any).textRus)}</div>
            {q.imageUrl && <img className="tpm-video-img" src={mediaUrl(q.imageUrl)} alt="" />}
            {(q as any).topic?.name && (
              <div className="tpm-video-t">
                <b>Savol mavzusi:</b> <span>{(q as any).topic.name}</span>
              </div>
            )}
            <button className="tpm-video-btn" onClick={() => { setShowVideo(false); nav('/amaliy'); }}>
              <Clapperboard size={20} /> Mavzuni to‘liq ko‘rish
            </button>
          </div>
        </div>
      )}

      {/* ===== Ilova: Muhokama ===== */}
      {mobil && showMuh && (
        <div className="modal" onClick={() => setShowMuh(false)}>
          <div className="sheet tpm-muh" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <div className="tpm-izoh-h"><MessageCircle size={20} /> Muhokama</div>
            <div className="tpm-muh-list">
              {izohlar === null && <div className="tpm-muh-bosh">Yuklanmoqda…</div>}
              {izohlar !== null && izohlar.filter((c) => !bloklangan.includes(c.userId)).length === 0 && (
                <div className="tpm-muh-bosh">Hozircha izoh yo‘q. Birinchi bo‘lib yozing!</div>
              )}
              {(izohlar || [])
                .filter((c) => !bloklangan.includes(c.userId))
                .map((c) => (
                  <div className="tpm-muh-i" key={c.id}>
                    <div className="tpm-muh-top">
                      <b>{c.name}</b>
                      <span>{new Date(c.createdAt).toLocaleDateString('uz-UZ')}</span>
                    </div>
                    <p>{c.text}</p>
                    <div className="tpm-muh-act">
                      {c.mine ? (
                        <button onClick={() => izohniOchir(c)}><Trash2 size={14} /> O‘chirish</button>
                      ) : (
                        <>
                          <button onClick={() => shikoyat(c)}><Flag size={14} /> Shikoyat</button>
                          <button onClick={() => blokla(c)}><Ban size={14} /> Bloklash</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            {izohXato && <div className="tpm-muh-xato">{izohXato}</div>}
            <div className="tpm-muh-yoz">
              <textarea
                value={yangiIzoh}
                maxLength={500}
                placeholder="Fikringizni yozing…"
                onChange={(e) => setYangiIzoh(e.target.value)}
              />
              <button disabled={!yangiIzoh.trim() || izohYuborilyapti} onClick={izohYubor} title="Yuborish">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Ilova: Izoh (qoida) pastdan chiqadigan oynada ===== */}
      {mobil && showRule && (
        <div className="modal" onClick={closeRule}>
          <div className="sheet tpm-izoh" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <div className="tpm-izoh-h"><Info size={20} /> Izoh</div>
            <p className="tpm-izoh-p">{explainText()}</p>
            {q.ruleRef && <div className="tpm-izoh-ref">{q.ruleRef}</div>}
            <button className="tpm-izoh-x" onClick={closeRule}>Yopish</button>
          </div>
        </div>
      )}

      {/* Rasm lightbox (F tugmasi) */}
      {showImg && q.imageUrl && (
        <div className="tp2-lightbox" onClick={() => setShowImg(false)}>
          <img src={mediaUrl(q.imageUrl)} onClick={(e) => e.stopPropagation()} />
          <button className="tp2-lightbox-x" onClick={() => setShowImg(false)}><X size={22} /></button>
        </div>
      )}

      {/* ==== Modallar (izoh, sozlama, natija) ==== */}

      {/* Qoidasi endi variantlar ostida inline ko'rsatiladi (modal olib tashlandi) */}

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
            <div
              className="set-row"
              onClick={() => {
                // lotin → kirill → rus → lotin. Savol matni ham, ilova interfeysi ham almashadi.
                const keyingi = cfgLang === 'lat' ? 'cyr' : cfgLang === 'cyr' ? 'rus' : 'lat';
                setCfgLang(keyingi);
                setLang(keyingi === 'lat' ? 'uz' : keyingi);
              }}
            >
              <span className="set-ic blue"><Globe size={18} /></span>
              <span className="set-label">Ilova tili</span>
              <span className="set-val">{cfgLang === 'cyr' ? 'Кириллча' : cfgLang === 'rus' ? 'Русский' : 'O‘zbekcha'}</span>
            </div>
            <div className="set-row">
              <span className="set-ic amber"><Eye size={18} /></span>
              <span className="set-label">To‘g‘ri javoblarni ko‘rsatish</span>
              <button className={'tog' + (settings.showCorrect ? ' on' : '')} onClick={() => setS('showCorrect', !settings.showCorrect)} />
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
        <div className="modal" onClick={() => tugashSabab === '' && setFinished(false)}>
          <div className="sheet result-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grip" />
            <h3 className="rtitle">Natijalar</h3>
            {tugashSabab === 'xato' && (
              <div className="rsabab no">
                {maxXato} ta xato — imtihon to‘xtatildi
              </div>
            )}
            {tugashSabab === 'vaqt' && (
              <div className="rsabab no">Vaqt tugadi</div>
            )}
            {tugashSabab === 'toxtatildi' && (
              <div className="rsabab">Test to‘xtatildi — shu paytgacha bo‘lgan natija</div>
            )}
            <div className="ring-wrap">
              <svg viewBox="0 0 120 120" className="ring">
                <circle cx="60" cy="60" r="52" className="ring-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  className={'ring-fg ' + ringRang}
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - rPct / 100)}
                />
              </svg>
              <div className="ring-txt">
                <div className={'ring-pct ' + ringRang}>{rPct}%</div>
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
            <div className="rxulosa">
              {rTotal} ta savoldan <b>{rCorrect + rWrong}</b> tasiga javob berdingiz:
              <b className="ok"> {rCorrect} to‘g‘ri</b>, <b className="no">{rWrong} xato</b>.
              {examMode && <> {rMaxWrong} ta xatoda imtihon to‘xtaydi.</>}
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
              <button className="rbtn main" onClick={yakunla}>Yakunlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
