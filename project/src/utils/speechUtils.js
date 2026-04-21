export const getBestPolishVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'pl-PL' && v.name.includes('Google')) || 
         voices.find(v => v.lang === 'pl-PL' && v.name.includes('Natural')) ||
         voices.find(v => v.lang === 'pl-PL') ||
         null;
};

export const createSpeakFunction = (lastSpokenRef) => (text, type, cooldown = 4000, cancelPrevious = false) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const now = Date.now();
  
  if (cancelPrevious) {
    window.speechSynthesis.cancel();
  } else if (window.speechSynthesis.speaking) {
    return;
  }

  if (lastSpokenRef.current[type] && now - lastSpokenRef.current[type] < cooldown) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const bestVoice = getBestPolishVoice();
  if (bestVoice) utterance.voice = bestVoice;
  utterance.lang = 'pl-PL';
  utterance.rate = 1.0;
  utterance.pitch = 0.95;
  
  lastSpokenRef.current[type] = now;
  window.speechSynthesis.speak(utterance);
};
