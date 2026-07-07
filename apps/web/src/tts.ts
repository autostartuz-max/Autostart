// Ovozli o'qish — serverdagi Microsoft Edge neural TTS (real o'zbek ovozi),
// ishlamasa brauzer nutq sintezi (fallback)
let audio: HTMLAudioElement | null = null;

export function ttsSupported(): boolean {
  return true;
}

export function speak(text: string, voice: 'female' | 'male' = 'female') {
  if (!text) return;
  stopSpeak();
  const v = voice === 'male' ? 'male' : 'female';
  const url = `/api/tts?voice=${v}&text=${encodeURIComponent(text.slice(0, 1200))}`;
  try {
    audio = new Audio(url);
    audio.play().catch(() => browserFallback(text));
  } catch {
    browserFallback(text);
  }
}

function browserFallback(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'uz-UZ';
    u.rate = 0.95;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeak() {
  if (audio) {
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    audio = null;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
