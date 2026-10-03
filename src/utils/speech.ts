/**
 * Multilingual Speech Recognition and High-Fluency Audio Synthesis Utilities
 * Ensures fluent native accents, cadence, and phonetics in user's native language.
 */

// Check browser SpeechRecognition support
const SpeechRecognitionConstructor =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export class VoiceRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(lang?: string) {
    if (SpeechRecognitionConstructor) {
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (this.onTranscriptCallback) {
          if (finalTranscript) {
            this.onTranscriptCallback(finalTranscript.trim(), true);
          } else if (interimTranscript) {
            this.onTranscriptCallback(interimTranscript.trim(), false);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error !== 'no-speech' && this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
            if (this.onEndCallback) this.onEndCallback();
          }
        } else {
          if (this.onEndCallback) this.onEndCallback();
        }
      };
    }
  }

  public setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public isSupported(): boolean {
    return Boolean(SpeechRecognitionConstructor);
  }

  public start(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void,
    onEnd?: () => void
  ) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition not supported in this browser.');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;
    this.onEndCallback = onEnd || null;
    this.isListening = true;

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }
  }

  public stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }
}

let activeAudioElement: HTMLAudioElement | null = null;

/**
 * Plays base64 WAV audio (from Gemini TTS when available)
 */
export function playWavBase64(
  base64Audio: string,
  onStart?: () => void,
  onEnded?: () => void
): () => void {
  stopCurrentAudio();

  const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
  activeAudioElement = audio;

  audio.onplay = () => {
    if (onStart) onStart();
  };

  audio.onended = () => {
    activeAudioElement = null;
    if (onEnded) onEnded();
  };

  audio.onerror = (e) => {
    console.error('Audio playback error:', e);
    activeAudioElement = null;
    if (onEnded) onEnded();
  };

  audio.play().catch((err) => {
    console.warn('Audio play was prevented or aborted:', err);
    activeAudioElement = null;
    if (onEnded) onEnded();
  });

  return () => {
    audio.pause();
    activeAudioElement = null;
  };
}

/**
 * Stops any actively playing audio or speech synthesis
 */
export function stopCurrentAudio() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

interface LanguageSpec {
  code: string;
  tags: string[];
  keywords: string[];
  phoneticSiblings?: string[]; // Closer phonetic matching for regional dialects
}

const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
  tagalog: {
    code: 'fil-PH',
    tags: ['fil-ph', 'tl-ph', 'fil', 'tl'],
    keywords: ['tagalog', 'filipino', 'philippines', 'fil-ph', 'tl-ph', 'blessica', 'angelo', 'mabuhay'],
    phoneticSiblings: ['id-id', 'ms-my', 'es-es', 'es-mx'], // Indonesian/Spanish vowel systems match Tagalog phonetics beautifully
  },
  filipino: {
    code: 'fil-PH',
    tags: ['fil-ph', 'tl-ph', 'fil', 'tl'],
    keywords: ['tagalog', 'filipino', 'philippines', 'fil-ph', 'tl-ph', 'blessica', 'angelo', 'mabuhay'],
    phoneticSiblings: ['id-id', 'ms-my', 'es-es', 'es-mx'],
  },
  spanish: {
    code: 'es-ES',
    tags: ['es-es', 'es-mx', 'es-us', 'es-419', 'es'],
    keywords: ['spanish', 'español', 'castellano', 'es-es', 'es-mx', 'monica', 'paulino', 'jorge'],
  },
  japanese: {
    code: 'ja-JP',
    tags: ['ja-jp', 'ja'],
    keywords: ['japanese', 'nihongo', 'ja-jp', 'kyoko', 'otoya'],
  },
  french: {
    code: 'fr-FR',
    tags: ['fr-fr', 'fr-ca', 'fr'],
    keywords: ['french', 'français', 'fr-fr', 'thomas', 'audrey'],
  },
  german: {
    code: 'de-DE',
    tags: ['de-de', 'de'],
    keywords: ['german', 'deutsch', 'de-de'],
  },
  chinese: {
    code: 'zh-CN',
    tags: ['zh-cn', 'zh-tw', 'zh'],
    keywords: ['chinese', 'mandarin', 'zh-cn'],
  },
  korean: {
    code: 'ko-KR',
    tags: ['ko-kr', 'ko'],
    keywords: ['korean', 'ko-kr'],
  },
  portuguese: {
    code: 'pt-BR',
    tags: ['pt-br', 'pt-pt', 'pt'],
    keywords: ['portuguese', 'português', 'pt-br'],
  },
  hindi: {
    code: 'hi-IN',
    tags: ['hi-in', 'hi'],
    keywords: ['hindi', 'hi-in'],
  },
  italian: {
    code: 'it-IT',
    tags: ['it-it', 'it'],
    keywords: ['italian', 'italiano', 'it-it'],
  },
  english: {
    code: 'en-US',
    tags: ['en-us', 'en-gb', 'en'],
    keywords: ['english', 'en-us'],
  },
};

/**
 * Detects language key from string name or text keywords
 */
export function resolveLanguageSpec(langName?: string, text?: string): LanguageSpec {
  if (langName) {
    const lower = langName.toLowerCase();
    for (const [key, spec] of Object.entries(LANGUAGE_SPECS)) {
      if (lower.includes(key) || spec.keywords.some((k) => lower.includes(k))) {
        return spec;
      }
    }
  }

  // Quick heuristic check on words
  if (text) {
    const t = ` ${text.toLowerCase()} `;
    if (
      t.includes(' po ') ||
      t.includes(' opo ') ||
      t.includes(' lola ') ||
      t.includes(' lolo ') ||
      t.includes(' ako ') ||
      t.includes(' ikaw ') ||
      t.includes(' hindi ') ||
      t.includes(' sobrang ') ||
      t.includes(' dahil ') ||
      t.includes(' mahal ') ||
      t.includes(' kita ') ||
      t.includes(' anak ') ||
      t.includes(' yakap ')
    ) {
      return LANGUAGE_SPECS.tagalog;
    }
    if (
      t.includes(' de ') ||
      t.includes(' que ') ||
      t.includes(' no ') ||
      t.includes(' mi ') ||
      t.includes(' por ') ||
      t.includes(' con ') ||
      t.includes(' mamá ') ||
      t.includes(' papá ') ||
      t.includes(' cariño ') ||
      t.includes(' gracias ')
    ) {
      return LANGUAGE_SPECS.spanish;
    }
  }

  return LANGUAGE_SPECS.english;
}

/**
 * Asynchronously loads browser synthesis voices, handling Chrome/Safari lazy loading
 */
export async function getLoadedVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const current = window.speechSynthesis.getVoices();
  if (current && current.length > 0) return current;

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve(window.speechSynthesis.getVoices());
      }
    };

    window.speechSynthesis.onvoiceschanged = finish;
    setTimeout(finish, 300);
  });
}

export interface SynthesisOptions {
  characterId?: string;
  detectedLanguage?: string;
}

/**
 * Formats written response into natural spoken cadence with breath pauses
 */
function prepareTextForSpeech(text: string): string {
  return text
    .replace(/[*#_~`]/g, '')
    .replace(/([.?!])\s+/g, '$1... ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * High-Fluency Multilingual Speech Synthesis
 * Matches native voices for Tagalog, Spanish, English, etc. with persona pitch/rate.
 */
export async function speakWithBrowserSynthesis(
  text: string,
  options?: SynthesisOptions,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  stopCurrentAudio();

  const formattedText = prepareTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(formattedText);

  const langSpec = resolveLanguageSpec(options?.detectedLanguage, formattedText);
  utterance.lang = langSpec.code;

  // Character specific vocal cadence: warm, paced, gentle
  const charId = (options?.characterId || 'grandma').toLowerCase();
  const isFemale = charId === 'grandma' || charId === 'mother' || charId === 'daughter';

  if (charId === 'grandma') {
    utterance.rate = 0.86; // Gentle, maternal, elder comforting cadence
    utterance.pitch = 1.05;
  } else if (charId === 'grandpa') {
    utterance.rate = 0.82; // Deep, patient, grounded
    utterance.pitch = 0.85;
  } else if (charId === 'mother') {
    utterance.rate = 0.90; // Caring, clear, soothing
    utterance.pitch = 1.08;
  } else if (charId === 'father') {
    utterance.rate = 0.88; // Steady, calm, protective
    utterance.pitch = 0.88;
  } else if (charId === 'son') {
    utterance.rate = 0.96; // Youthful, earnest
    utterance.pitch = 1.15;
  } else if (charId === 'daughter') {
    utterance.rate = 0.94; // Sweet, bright, tender
    utterance.pitch = 1.20;
  } else {
    // cousin
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
  }

  // Load voices reliably
  const voices = await getLoadedVoices();

  // Step 1: Look for direct native voices matching this language (e.g. fil-PH, tl-PH)
  let matchingVoices = voices.filter((v) => {
    const vLang = v.lang.toLowerCase();
    const vName = v.name.toLowerCase();
    return (
      langSpec.tags.some((tag) => vLang.startsWith(tag)) ||
      langSpec.keywords.some((k) => vName.includes(k) || vLang.includes(k))
    );
  });

  // Step 2: If no direct voice exists for Tagalog on this device, check phonetic siblings (Indonesian / Spanish)
  if (matchingVoices.length === 0 && langSpec.phoneticSiblings) {
    matchingVoices = voices.filter((v) => {
      const vLang = v.lang.toLowerCase();
      return langSpec.phoneticSiblings!.some((sib) => vLang.startsWith(sib));
    });
    if (matchingVoices.length > 0) {
      // Set utterance language to the phonetic sibling so the browser uses proper open vowel phonetics
      utterance.lang = matchingVoices[0].lang;
    }
  }

  if (matchingVoices.length > 0) {
    // Select voice matching gender / character preference
    const genderedVoice = matchingVoices.find((v) => {
      const name = v.name.toLowerCase();
      if (isFemale) {
        return (
          name.includes('female') ||
          name.includes('woman') ||
          name.includes('girl') ||
          name.includes('blessica') ||
          name.includes('maria') ||
          name.includes('monica') ||
          name.includes('paulina') ||
          name.includes('rosa') ||
          name.includes('gadis') ||
          name.includes('siti')
        );
      } else {
        return (
          name.includes('male') ||
          name.includes('man') ||
          name.includes('boy') ||
          name.includes('angelo') ||
          name.includes('jorge') ||
          name.includes('diego') ||
          name.includes('budi')
        );
      }
    });

    utterance.voice = genderedVoice || matchingVoices[0];
  } else {
    // Fallback to highest quality natural voice available
    const naturalVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('neural') ||
        v.name.toLowerCase().includes('google')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
  }

  // Prevent browser garbage collection during speech playback
  (window as any).__activeSpeechUtterance = utterance;

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    (window as any).__activeSpeechUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    (window as any).__activeSpeechUtterance = null;
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}
