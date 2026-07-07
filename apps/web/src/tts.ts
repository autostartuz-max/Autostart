// Matnni ovoz orqali o'qish (Web Speech API — brauzerga o'rnatilgan)
export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string) {
  if (!ttsSupported() || !text) return false;
  const synth = window.speechSynthesis;
  synth.cancel(); // avvalgi o'qishni to'xtatadi
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  // O'zbek ovozini qidiramiz, bo'lmasa rus, bo'lmasa standart
  const uz = voices.find((v) => v.lang?.toLowerCase().startsWith('uz'));
  const ru = voices.find((v) => v.lang?.toLowerCase().startsWith('ru'));
  const chosen = uz || ru || null;
  if (chosen) u.voice = chosen;
  u.lang = chosen?.lang || 'uz-UZ';
  u.rate = 0.95;
  u.pitch = 1;
  synth.speak(u);
  return true;
}

export function stopSpeak() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
