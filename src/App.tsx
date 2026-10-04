import React, { useState, useEffect, useRef } from 'react';
import { FAMILY_CHARACTERS } from './data/characters';
import { CharacterId, CharacterProfile, CharacterMessage, CharacterMood, VoiceSettings } from './types';
import { CharacterSelector } from './components/CharacterSelector';
import { SpeakingAvatar } from './components/SpeakingAvatar';
import { ProblemChatFeed } from './components/ProblemChatFeed';
import {
  VoiceRecognitionService,
  playAudioBase64,
  playWavBase64,
  stopCurrentAudio,
  speakWithBrowserSynthesis,
  getDetectedVoiceSummary,
  resolveLanguageSpec,
} from './utils/speech';
import { detectUserMoodFromText } from './utils/mood';
import { Volume2 } from 'lucide-react';

export function ensureSingleGreeting(messages: CharacterMessage[], character: CharacterProfile): CharacterMessage[] {
  const greetingTexts = new Set(FAMILY_CHARACTERS.map((profile) => profile.greeting.trim()));
  const greetingIndex = messages.findIndex(
    (message) => message.role === 'assistant' && greetingTexts.has(message.content.trim())
  );
  const cleanMessages = messages.filter(
    (message) => !(message.role === 'assistant' && greetingTexts.has(message.content.trim()))
  );

  cleanMessages.splice(Math.min(greetingIndex < 0 ? 0 : greetingIndex, cleanMessages.length), 0, {
    id: 'initial-greeting',
    role: 'assistant',
    characterId: character.id,
    content: character.greeting.trim(),
    timestamp: Date.now(),
  });

  return cleanMessages;
}

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProfile>(FAMILY_CHARACTERS[0]);
  const [messages, setMessages] = useState<CharacterMessage[]>(() => ensureSingleGreeting([], FAMILY_CHARACTERS[0]));

  // Voice Engine State: Defaults to the most natural Filipino AI voice path
  const [voiceEngine, setVoiceEngine] = useState<'filipino_native' | 'filipino_ai' | 'gemini_studio'>('filipino_ai');
  const [activeVoiceLabel, setActiveVoiceLabel] = useState<string>('Native Filipino Voice (Likas na Tagalog)');
  const [selectedMood, setSelectedMood] = useState<CharacterMood>('comforting');
  const [lastNonAngryMood, setLastNonAngryMood] = useState<CharacterMood>('comforting');
  const [angryMode, setAngryMode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    speed: 1,
    pitch: 1,
    warmth: 0.9,
    accent: 'filipino',
  });
  const [backupAiMode, setBackupAiMode] = useState<boolean>(true);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [largeText, setLargeText] = useState<boolean>(false);

  // Audio and Speaking States
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isVoiceCallMode, setIsVoiceCallMode] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  // Subtitle display
  const [currentSpeechText, setCurrentSpeechText] = useState<string>(FAMILY_CHARACTERS[0].greeting);
  const [latestAdviceSummary, setLatestAdviceSummary] = useState<string | undefined>(
    'Take a slow breath. You are safe and supported here.'
  );
  const [latestDetectedLanguage, setLatestDetectedLanguage] = useState<string | undefined>(undefined);
  const [latestEmotionDetected, setLatestEmotionDetected] = useState<string | undefined>(undefined);

  // Speech Recognition service
  const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    voiceServiceRef.current = new VoiceRecognitionService();

    getDetectedVoiceSummary().then((summary) => {
      if (summary.voiceName) {
        setActiveVoiceLabel(summary.voiceName);
      }
    });

    return () => {
      stopCurrentAudio();
      if (voiceServiceRef.current) {
        voiceServiceRef.current.stop();
      }
    };
  }, []);

  const moodOptions: { value: CharacterMood; label: string }[] = [
    { value: 'calm', label: 'Calm' },
    { value: 'comforting', label: 'Comforting' },
    { value: 'firm', label: 'Firm' },
    { value: 'playful', label: 'Playful' },
    { value: 'supportive', label: 'Supportive' },
    { value: 'angry', label: 'Mad / Vent' },
  ];

  const applyMoodSelection = (mood: CharacterMood) => {
    if (mood === 'angry') {
      setLastNonAngryMood(selectedMood === 'angry' ? lastNonAngryMood : selectedMood);
      setSelectedMood('angry');
      setAngryMode(true);
      return;
    }

    setSelectedMood(mood);
    setLastNonAngryMood(mood);
    setAngryMode(false);
  };

  const createFallbackReply = (character: CharacterProfile) => {
    if (selectedMood === 'angry') {
      return character.id === 'man'
        ? 'Okay, ramdam ko ang galit mo. Huminga ka muna, at sabihin ang punto—para may tama tayong plano.'
        : 'Okay, ramdam ko ang galit mo. Huminga ka muna, at sabihin mo ang totoo—hindi kita hahayaan na mag-isa sa galit na yan.';
    }

    if (character.id === 'man') {
      return selectedMood === 'firm'
        ? 'Tama na ang pag-aalala. Huminga ka muna, at tayo na mismo ang magplano ng next step.'
        : 'Handa akong makinig. Huminga ka muna, at sabay natin lutasin ang problema mo.';
    }

    return selectedMood === 'playful'
      ? 'Andito ako para sa iyo, tara, huminga ka muna at sabihin mo ang totoo—tulungan kita.'
      : 'Andito ako para sa iyo. Huminga ka nang malalim at sabihin mo ang totoo, magkasama natin aayusin ito.';
  };

  // When user switches character
  const handleSelectCharacter = (char: CharacterProfile) => {
    stopCurrentAudio();
    if (voiceServiceRef.current) voiceServiceRef.current.stop();
    setIsListening(false);
    setIsSpeaking(false);

    setSelectedCharacter(char);
    setCurrentSpeechText(char.greeting);
    setLatestAdviceSummary(undefined);

    setMessages((prev) => ensureSingleGreeting(prev, char));

    if (autoSpeak) {
      playCharacterVoice(char.greeting, char);
    }
  };

  // Play Character Voice via Native Voice Engine or Gemini Studio Voice
  const playCharacterVoice = async (
    text: string,
    character: CharacterProfile,
    detectedLanguage?: string,
    emotionDetected?: string
  ) => {
    stopCurrentAudio();
    setIsSpeaking(true);

    try {
      // Cloud speech is the primary path; browser synthesis is only a fallback.
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          characterId: character.id,
          voiceName: character.voiceName,
          language:
            detectedLanguage ||
            latestDetectedLanguage ||
            (resolveLanguageSpec(undefined, text).code === 'fil-PH' ? 'Tagalog' : undefined),
          emotion: emotionDetected || latestEmotionDetected,
          mood: selectedMood,
          voiceEngine,
          voiceSettings,
        }),
      });

      const data = await response.json();

      if (data.audioBase64) {
        stopAudioRef.current = playAudioBase64(
          data.audioBase64,
          data.mimeType || 'audio/mp3',
          character.id,
          () => setIsSpeaking(true),
          () => {
            setIsSpeaking(false);
            if (isVoiceCallMode) {
              startLiveListening();
            }
          }
        );
        return;
      }

      // 2. Backup Voice Engine: Client Speech Synthesis (Layer 3)
      speakWithBrowserSynthesis(
        text,
        {
          characterId: character.id,
          detectedLanguage: detectedLanguage || latestDetectedLanguage,
          emotionDetected: emotionDetected || latestEmotionDetected,
          mood: selectedMood,
          voiceSettings,
        },
        () => setIsSpeaking(true),
        () => {
          setIsSpeaking(false);
          if (isVoiceCallMode) {
            startLiveListening();
          }
        }
      );
    } catch (err) {
      console.warn('Primary cloud voice engine error, invoking backup client speech engine:', err);
      // 3. Resilient Fallback: Client Speech Synthesis
      speakWithBrowserSynthesis(
        text,
        {
          characterId: character.id,
          detectedLanguage: detectedLanguage || latestDetectedLanguage,
          emotionDetected: emotionDetected || latestEmotionDetected,
          mood: selectedMood,
          voiceSettings,
        },
        () => setIsSpeaking(true),
        () => {
          setIsSpeaking(false);
          if (isVoiceCallMode) {
            startLiveListening();
          }
        }
      );
    }
  };

  // Process user's problem
  const handleSendProblem = async (problemText: string) => {
    if (!problemText.trim() || isThinking) return;

    const detectedMood = detectUserMoodFromText(problemText);
    const requestMood = angryMode || detectedMood === 'angry' ? 'angry' : selectedMood;

    if (angryMode || detectedMood === 'angry') {
      setLastNonAngryMood(selectedMood === 'angry' ? lastNonAngryMood : selectedMood);
      setSelectedMood('angry');
      setAngryMode(true);
    }

    stopCurrentAudio();
    if (voiceServiceRef.current) voiceServiceRef.current.stop();
    setIsListening(false);
    setIsThinking(true);

    const userMsg: CharacterMessage = {
      id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      role: 'user',
      content: problemText,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          characterId: selectedCharacter.id,
          voiceMode: isVoiceCallMode,
          mood: requestMood,
          aiMode: backupAiMode ? 'backup' : 'primary',
          voiceSettings,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch character response');
      }

      const data = await res.json();
      const replyText = data.reply || createFallbackReply(selectedCharacter);

      const aiMsg: CharacterMessage = {
        id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now() + 1),
        role: 'assistant',
        characterId: selectedCharacter.id,
        content: replyText,
        timestamp: Date.now(),
        detectedLanguage: data.detectedLanguage,
        emotionDetected: data.emotionDetected,
        adviceSummary: data.adviceSummary,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setCurrentSpeechText(replyText);
      setLatestAdviceSummary(data.adviceSummary);
      setLatestDetectedLanguage(data.detectedLanguage);
      setLatestEmotionDetected(data.emotionDetected);
      setIsThinking(false);

      if (autoSpeak || isVoiceCallMode) {
        playCharacterVoice(replyText, selectedCharacter, data.detectedLanguage, data.emotionDetected);
      }
    } catch (error) {
      console.error('Error getting response:', error);
      setIsThinking(false);
      const fallbackReply = createFallbackReply(selectedCharacter);
      const fallbackMsg: CharacterMessage = {
        id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
        role: 'assistant',
        characterId: selectedCharacter.id,
        content: fallbackReply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setCurrentSpeechText(fallbackReply);
      playCharacterVoice(fallbackReply, selectedCharacter, latestDetectedLanguage, latestEmotionDetected);
    }
  };

  // Start live microphone recognition
  const startLiveListening = () => {
    if (!voiceServiceRef.current || isSpeaking || isThinking) return;

    setIsListening(true);
    voiceServiceRef.current.start(
      (transcript, isFinal) => {
        if (isFinal && transcript.trim().length > 2) {
          handleSendProblem(transcript.trim());
        }
      },
      () => setIsListening(false),
      () => setIsListening(false)
    );
  };

  // Toggle Voice Call mode
  const handleToggleVoiceCall = () => {
    if (isVoiceCallMode) {
      setIsVoiceCallMode(false);
      setIsListening(false);
      stopCurrentAudio();
      if (voiceServiceRef.current) voiceServiceRef.current.stop();
    } else {
      setIsVoiceCallMode(true);
      setAutoSpeak(true);
      startLiveListening();
    }
  };

  // Toggle Dictation button in input field
  const handleToggleDictation = () => {
    if (isListening) {
      setIsListening(false);
      if (voiceServiceRef.current) voiceServiceRef.current.stop();
    } else {
      setIsListening(true);
      voiceServiceRef.current?.start(
        (transcript, isFinal) => {
          if (isFinal && transcript.trim()) {
            handleSendProblem(transcript.trim());
          }
        },
        () => setIsListening(false),
        () => setIsListening(false)
      );
    }
  };

  const handleStopSpeech = () => {
    stopCurrentAudio();
    setIsSpeaking(false);
  };

  const handleReplaySpeech = () => {
    playCharacterVoice(currentSpeechText, selectedCharacter, latestDetectedLanguage, latestEmotionDetected);
  };

  const aiStatusText = backupAiMode ? 'Backup AI is active to keep the conversation going.' : 'Primary AI is active for the main voice flow.';

  const LogoMark = () => (
    <svg
      viewBox="0 0 80 80"
      className="h-11 w-11 drop-shadow-[0_0_18px_rgba(45,212,191,0.35)]"
      aria-label="SPILL IT logo"
      role="img"
    >
      <defs>
        <linearGradient id="spillit-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="50%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="64" height="52" rx="16" fill="url(#spillit-gradient)" opacity="0.95" />
      <path d="M22 26C22 20.477 26.477 16 32 16H48C53.523 16 58 20.477 58 26V35C58 40.523 53.523 45 48 45H35L24 54V45C22.895 45 22 44.105 22 43V26Z" fill="#f8fafc" opacity="0.96" />
      <path d="M30 22.5h20M30 30h16M30 37.5h10" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M52 52C54.3 52 56.2 54.1 56.2 56.5C56.2 59 54.2 61 52 61C49.8 61 47.8 59.1 47.8 56.5C47.8 54.1 49.8 52 52 52Z" fill="#f8fafc" opacity="0.9" />
    </svg>
  );

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200 ${
        highContrast ? 'bg-slate-950 text-slate-50' : 'bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.22),_transparent_34%),linear-gradient(180deg,#020817_0%,#0b1120_32%,#020817_100%)] text-slate-100'
      }`}
      style={{ fontSize: largeText ? '1.08rem' : undefined }}
    >
      <header className="w-full px-4 pt-5 pb-2">
        <div className="mx-auto max-w-6xl rounded-[24px] border border-slate-700/80 bg-slate-900/80 px-4 py-3 shadow-[0_20px_60px_rgba(15,118,110,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-teal-500/40 bg-slate-950/80 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                <LogoMark />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">SPILL IT</div>
                <div className="text-xs text-slate-200">{aiStatusText}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setVoiceEngine((current) => {
                    if (current === 'filipino_native') return 'filipino_ai';
                    if (current === 'filipino_ai') return 'gemini_studio';
                    return 'filipino_native';
                  })
                }
                className={`rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
                  voiceEngine === 'filipino_native' || voiceEngine === 'filipino_ai'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.14)]'
                    : 'border-slate-700 bg-slate-950/80 text-slate-300'
                }`}
              >
                {voiceEngine === 'filipino_native'
                  ? 'Native Filipino'
                  : voiceEngine === 'filipino_ai'
                  ? 'Premium Filipino AI'
                  : 'Gemini Studio'}
              </button>

              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300">
                Mood: {selectedMood}
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300">
                Audio: {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full py-4 pb-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_56px_rgba(15,23,42,0.28)] backdrop-blur-md">
                <CharacterSelector
                  selectedCharacterId={selectedCharacter.id}
                  onSelectCharacter={handleSelectCharacter}
                />
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_56px_rgba(15,23,42,0.28)] backdrop-blur-md">
                <SpeakingAvatar
                  character={selectedCharacter}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  isThinking={isThinking}
                  isVoiceCallMode={isVoiceCallMode}
                  onToggleVoiceCall={handleToggleVoiceCall}
                  onReplaySpeech={handleReplaySpeech}
                  onStopSpeech={handleStopSpeech}
                  currentSpeechText={currentSpeechText}
                  adviceSummary={latestAdviceSummary}
                  detectedLanguage={latestDetectedLanguage}
                  autoSpeak={autoSpeak}
                  onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
                  selectedMood={selectedMood}
                  voiceSettings={voiceSettings}
                  memorySummary={`${Math.min(messages.length, 6)} recent context items`}
                  backupAiMode={backupAiMode}
                  highContrast={highContrast}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_56px_rgba(15,23,42,0.28)] backdrop-blur-md">
              <ProblemChatFeed
                character={selectedCharacter}
                messages={messages}
                onSendMessage={handleSendProblem}
                isLoading={isThinking}
                isDictating={isListening && !isVoiceCallMode}
                onToggleDictation={handleToggleDictation}
                onPlayMessageVoice={(msg) => {
                  const targetChar = FAMILY_CHARACTERS.find((c) => c.id === msg.characterId) || selectedCharacter;
                  playCharacterVoice(msg.content, targetChar, msg.detectedLanguage, msg.emotionDetected);
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
