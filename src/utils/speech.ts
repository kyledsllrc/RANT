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

export interface CharacterAudioProfile {
  id: string;
  playbackRate: number;
  preservesPitch: boolean;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  gain?: number;
  description: string;
}

export const CHARACTER_AUDIO_PROFILES: Record<string, CharacterAudioProfile> = {
  woman: {
    id: 'woman',
    playbackRate: 0.95, // Warm, soothing, natural female cadence
    preservesPitch: true, // Natural, clear female pitch
    filterType: 'peaking',
    filterFreq: 1200,
    filterQ: 0.8,
    gain: 1.05,
    description: 'Female Voice (Babae) - Warm, empathetic & gentle voice',
  },
  man: {
    id: 'man',
    playbackRate: 0.82, // Calm, grounded male pacing
    preservesPitch: false, // Shifts into deep, steady male baritone
    filterType: 'peaking',
    filterFreq: 260, // Chest resonance
    filterQ: 1.1,
    gain: 1.15,
    description: 'Male Voice (Lalaki) - Steady, calm & reassuring male baritone',
  },
};

// Aliases for compatibility
CHARACTER_AUDIO_PROFILES.grandma = CHARACTER_AUDIO_PROFILES.woman;
CHARACTER_AUDIO_PROFILES.mother = CHARACTER_AUDIO_PROFILES.woman;
CHARACTER_AUDIO_PROFILES.daughter = CHARACTER_AUDIO_PROFILES.woman;
CHARACTER_AUDIO_PROFILES.grandpa = CHARACTER_AUDIO_PROFILES.man;
CHARACTER_AUDIO_PROFILES.father = CHARACTER_AUDIO_PROFILES.man;
CHARACTER_AUDIO_PROFILES.son = CHARACTER_AUDIO_PROFILES.man;
CHARACTER_AUDIO_PROFILES.cousin = CHARACTER_AUDIO_PROFILES.man;

let activeAudioElement: HTMLAudioElement | null = null;
let sharedAudioContext: AudioContext | null = null;

/**
 * Plays base64 MP3 or WAV audio stream directly with character vocal DSP
 */
export function playAudioBase64(
  base64Audio: string,
  mimeType: string = 'audio/mp3',
  characterId?: string,
  onStart?: () => void,
  onEnded?: () => void
): () => void {
  stopCurrentAudio();

  const mime = mimeType || (base64Audio.startsWith('UklGR') ? 'audio/wav' : 'audio/mp3');
  const audio = new Audio(`data:${mime};base64,${base64Audio}`);
  activeAudioElement = audio;

  const charId = (characterId || 'grandma').toLowerCase();
  const profile = CHARACTER_AUDIO_PROFILES[charId] || CHARACTER_AUDIO_PROFILES.grandma;

  // Apply character acoustic playback rate & pitch preserve settings
  audio.playbackRate = profile.playbackRate;
  (audio as any).preservesPitch = profile.preservesPitch;
  (audio as any).mozPreservesPitch = profile.preservesPitch;
  (audio as any).webkitPreservesPitch = profile.preservesPitch;

  // Enhance with Web Audio API filters for character vocal tract styling
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new AudioCtx();
      }
      if (sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume();
      }

      const source = sharedAudioContext.createMediaElementSource(audio);
      let lastNode: AudioNode = source;

      if (profile.filterType && profile.filterFreq) {
        const filter = sharedAudioContext.createBiquadFilter();
        filter.type = profile.filterType;
        filter.frequency.value = profile.filterFreq;
        if (profile.filterQ) filter.Q.value = profile.filterQ;
        lastNode.connect(filter);
        lastNode = filter;
      }

      if (profile.gain && profile.gain !== 1.0) {
        const gainNode = sharedAudioContext.createGain();
        gainNode.gain.value = profile.gain;
        lastNode.connect(gainNode);
        lastNode = gainNode;
      }

      lastNode.connect(sharedAudioContext.destination);
    }
  } catch (audioCtxErr) {
    // Media element source already attached or not supported; standard audio playback continues smoothly
  }

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

export const playWavBase64 = (
  base64Audio: string,
  onStart?: () => void,
  onEnded?: () => void
) => playAudioBase64(base64Audio, 'audio/wav', 'grandma', onStart, onEnded);

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
}

const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
  tagalog: {
    code: 'fil-PH',
    tags: ['fil-ph', 'tl-ph', 'fil', 'tl'],
    keywords: [
      'tagalog',
      'filipino',
      'philippines',
      'fil-ph',
      'tl-ph',
      'blessica',
      'angelo',
      'mabuhay',
      'kumusta',
      'po',
      'opo',
      'sige',
      'salamat',
      'mahal',
      'hindi',
      'bukas',
      'tulong',
      'namin',
      'gusto',
      'mayroon',
      'gising',
    ],
  },
  filipino: {
    code: 'fil-PH',
    tags: ['fil-ph', 'tl-ph', 'fil', 'tl'],
    keywords: [
      'tagalog',
      'filipino',
      'philippines',
      'fil-ph',
      'tl-ph',
      'blessica',
      'angelo',
      'mabuhay',
      'kumusta',
      'po',
      'opo',
      'sige',
      'salamat',
      'mahal',
      'hindi',
      'bukas',
      'tulong',
      'namin',
      'gusto',
      'mayroon',
      'gising',
    ],
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
      t.includes(' yakap ') ||
      t.includes(' kumusta ') ||
      t.includes(' salamat ') ||
      t.includes(' sige ') ||
      t.includes(' tulong ') ||
      t.includes(' gusto ') ||
      t.includes(' mayroon ') ||
      t.includes(' maganda ') ||
      t.includes(' umiyak ') ||
      t.includes(' problema ')
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
  emotionDetected?: string;
  mood?: string;
  voiceSettings?: {
    speed?: number;
    pitch?: number;
    warmth?: number;
    accent?: 'filipino' | 'english' | 'neutral';
  };
}

export interface CharacterVoiceConfig {
  gender: 'female' | 'male';
  voiceNames: string[];
}

export function resolveCharacterVoiceConfig(characterId?: string, detectedLanguage?: string): CharacterVoiceConfig {
  const normalized = (characterId || 'woman').toLowerCase();
  const isFemale =
    normalized === 'woman' ||
    normalized === 'grandma' ||
    normalized === 'mother' ||
    normalized === 'daughter';

  const languageText = (detectedLanguage || '').toLowerCase();
  const tagalog =
    languageText.includes('tagalog') ||
    languageText.includes('filipino') ||
    languageText.includes('fil-ph') ||
    languageText.includes('tl-ph');

  if (isFemale) {
    return {
      gender: 'female',
      voiceNames: tagalog
        ? [
            'Google Filipino Female',
            'Filipino Female',
            'Kore',
            'Samantha',
            'Google UK English Female',
            'Google US English Female',
          ]
        : ['Kore', 'Samantha', 'Google UK English Female', 'Google US English Female'],
    };
  }

  return {
    gender: 'male',
    voiceNames: tagalog
      ? [
          'Google Filipino Male',
          'Filipino Male',
          'Fenrir',
          'Zephyr',
          'Google UK English Male',
          'Google US English Male',
        ]
      : ['Fenrir', 'Zephyr', 'Google UK English Male', 'Google US English Male'],
  };
}

/**
 * Formats written response into natural spoken human cadence with gentle breath pauses
 */
function prepareTextForSpeech(text: string, emotion?: string): string {
  let cleaned = text.replace(/[*#_~`]/g, '').trim();

  // Natural affectionate human pauses after greetings and comforting phrases
  cleaned = cleaned
    .replace(/\b(apo ko|apo|anak ko|anak|sweetheart|honey|darling|mi amor|mi vida|mi niño|mi niña|iho|iha)\b([,.]?)/gi, '$1... ')
    .replace(/\b(halika rito|come here|ven aquí|listen to me|makinig ka|andito lang si lola|andito si mama|andito si papa)\b([,.]?)/gi, '$1... ')
    .replace(/\b(huminga ka nang malalim|take a deep breath|respira hondo|take a breath)\b([,.]?)/gi, '$1... ')
    .replace(/([.?!])\s+/g, '$1... ')
    .replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * High-Fluency Multilingual Speech Synthesis with Human Emotional Realism
 * Matches native voices for Tagalog, Spanish, English, etc. with emotional persona pitch/rate.
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

  const formattedText = prepareTextForSpeech(text, options?.emotionDetected);
  const utterance = new SpeechSynthesisUtterance(formattedText);

  const langSpec = resolveLanguageSpec(options?.detectedLanguage, formattedText);
  utterance.lang = langSpec.code;

  const voiceProfile = resolveCharacterVoiceConfig(options?.characterId, options?.detectedLanguage);
  const isFemale = voiceProfile.gender === 'female';
  const speedMultiplier = options?.voiceSettings?.speed ?? 1;
  const pitchMultiplier = options?.voiceSettings?.pitch ?? 1;
  const warmthBoost = options?.voiceSettings?.warmth ?? 1;
  const mood = (options?.mood || 'supportive').toLowerCase();

  let rate = (isFemale ? 0.92 : 0.84) * speedMultiplier;
  let pitch = (isFemale ? 1.05 : 0.76) * pitchMultiplier;

  if (langSpec.code === 'fil-PH') {
    rate *= 0.92;
    pitch *= 1.04;
  }

  if (mood === 'firm') {
    rate *= 0.96;
    pitch *= 0.98;
  } else if (mood === 'calm') {
    rate *= 0.9;
    pitch *= 1.02;
  } else if (mood === 'playful') {
    rate *= 1.08;
    pitch *= 1.06;
  } else if (mood === 'comforting') {
    rate *= 0.94;
    pitch *= 1.04;
  }

  // Emotional Modulation: dynamically tune voice to emotional distress
  const em = (options?.emotionDetected || '').toLowerCase();
  if (
    em.includes('grief') ||
    em.includes('sadness') ||
    em.includes('heartbreak') ||
    em.includes('shame') ||
    em.includes('crying') ||
    em.includes('failure')
  ) {
    // Slower, tender whisper-like comforting embrace
    rate = Math.max(0.76, rate - 0.05);
    pitch = pitch * 0.98;
  } else if (
    em.includes('anxiety') ||
    em.includes('panic') ||
    em.includes('fear') ||
    em.includes('overwhelm') ||
    em.includes('stress')
  ) {
    // Slow, reassuring, grounded pacing to soothe nervous system
    rate = Math.max(0.78, rate - 0.04);
  } else if (
    em.includes('exhaustion') ||
    em.includes('burnout') ||
    em.includes('tired') ||
    em.includes('fatigue')
  ) {
    // Gentle, unhurried cadence
    rate = Math.max(0.78, rate - 0.03);
  }

  utterance.rate = Math.min(Math.max(rate, 0.7), 1.7);
  utterance.pitch = Math.min(Math.max(pitch, 0.5), 2);

  if (warmthBoost >= 1.1) {
    utterance.volume = 1;
  }

  // Load voices reliably
  const voices = await getLoadedVoices();

  // Step 1: Look for direct native voices matching this language (e.g. fil-PH, tl-PH)
  const matchingVoices = voices.filter((v) => {
    const vLang = v.lang.toLowerCase();
    const vName = v.name.toLowerCase();
    const isNativeFilipinoMatch =
      langSpec.code === 'fil-PH' &&
      (vLang.includes('fil') || vLang.includes('tl') || vName.includes('filipino') || vName.includes('tagalog') || vName.includes('ph'));

    return (
      langSpec.tags.some((tag) => vLang.startsWith(tag)) ||
      langSpec.keywords.some((k) => vName.includes(k) || vLang.includes(k)) ||
      isNativeFilipinoMatch
    );
  });

  if (matchingVoices.length > 0) {
    const preferredVoiceNames = voiceProfile.voiceNames.map((name) => name.toLowerCase());
    const characterSpecificVoice =
      matchingVoices.find((v) =>
        preferredVoiceNames.some((preferredName) =>
          v.name.toLowerCase().includes(preferredName) || v.lang.toLowerCase().includes(preferredName)
        )
      ) ||
      matchingVoices.find((v) => {
        const name = v.name.toLowerCase();
        if (langSpec.code === 'fil-PH') {
          return (
            name.includes('filipino') ||
            name.includes('tagalog') ||
            name.includes('fil') ||
            name.includes('tl') ||
            name.includes('blessica') ||
            name.includes('angelo') ||
            name.includes('maria') ||
            name.includes('katrina')
          );
        }

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
        }

        return (
          name.includes('male') ||
          name.includes('man') ||
          name.includes('boy') ||
          name.includes('angelo') ||
          name.includes('jorge') ||
          name.includes('diego') ||
          name.includes('budi')
        );
      });

    const selectedVoice = characterSpecificVoice || matchingVoices[0];
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
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
      utterance.lang = naturalVoice.lang;
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

/**
 * Returns summary of the best available Filipino / native voice on the device
 */
export async function getDetectedVoiceSummary(detectedLang?: string): Promise<{
  voiceName: string;
  isNativeFilipino: boolean;
  engineType: string;
}> {
  const voices = await getLoadedVoices();
  const directFil = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('fil') ||
      v.lang.toLowerCase().startsWith('tl') ||
      v.name.toLowerCase().includes('filipino') ||
      v.name.toLowerCase().includes('tagalog') ||
      v.name.toLowerCase().includes('blessica') ||
      v.name.toLowerCase().includes('angelo')
  );

  if (directFil) {
    return {
      voiceName: directFil.name,
      isNativeFilipino: true,
      engineType: 'Device Native Filipino Voice (Likas na Tagalog)',
    };
  }

  return {
    voiceName: 'Dedicated Cloud Filipino Voice AI (Likas na Tagalog)',
    isNativeFilipino: true,
    engineType: 'Cloud Native Filipino Neural Voice',
  };
}
