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
} from './utils/speech';
import { detectUserMoodFromText } from './utils/mood';
import { Volume2 } from 'lucide-react';

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProfile>(FAMILY_CHARACTERS[0]);
  const [messages, setMessages] = useState<CharacterMessage[]>([
    {
      id: 'initial-greeting',
      role: 'assistant',
      characterId: FAMILY_CHARACTERS[0].id,
      content: FAMILY_CHARACTERS[0].greeting,
      timestamp: Date.now(),
    },
  ]);

  // Voice Engine State: Defaults to Native Filipino Voice (Likas na Tagalog)
  const [voiceEngine, setVoiceEngine] = useState<'filipino_native' | 'gemini_studio'>('filipino_native');
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

    const greetingMessage: CharacterMessage = {
      id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
      role: 'assistant',
      characterId: char.id,
      content: char.greeting,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, greetingMessage]);

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
      if (voiceEngine === 'filipino_native') {
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
        return;
      }

      // 1. Primary AI Voice Engine: Dedicated Native Cloud Voice Engine (Layer 1) & Gemini Flash TTS (Layer 2)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          characterId: character.id,
          voiceName: character.voiceName,
          language: detectedLanguage || latestDetectedLanguage,
          emotion: emotionDetected || latestEmotionDetected,
          mood: selectedMood,
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

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200 ${
        highContrast ? 'bg-slate-950 text-slate-50' : 'bg-slate-950 text-slate-100'
      }`}
      style={{ fontSize: largeText ? '1.08rem' : undefined }}
    >
      {/* Top Controls */}
      <header className="px-4 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() =>
              setVoiceEngine(voiceEngine === 'filipino_native' ? 'gemini_studio' : 'filipino_native')
            }
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              voiceEngine === 'filipino_native'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 bg-slate-900/60 text-slate-300'
            }`}
            title="Click to switch voice engine"
          >
            <span>
              {voiceEngine === 'filipino_native'
                ? '🇵🇭 Boses Pilipino (Native Filipino)'
                : '🎙️ Gemini Studio Voice'}
            </span>
          </button>

          {voiceEngine === 'filipino_native' && (
            <span className="hidden sm:inline-block text-[11px] text-slate-400">
              {activeVoiceLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const nextState = !angryMode;
              setAngryMode(nextState);

              if (nextState) {
                setLastNonAngryMood(selectedMood === 'angry' ? lastNonAngryMood : selectedMood);
                setSelectedMood('angry');
              } else {
                setSelectedMood(lastNonAngryMood);
              }
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
              angryMode
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-slate-800 bg-slate-900/60 text-slate-300'
            }`}
          >
            <span>{angryMode ? 'Angry mode on' : 'Angry mode'}</span>
          </button>

          <button
            onClick={() => setBackupAiMode(!backupAiMode)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
              backupAiMode
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-slate-800 bg-slate-900/60 text-slate-300'
            }`}
          >
            <span>{backupAiMode ? 'Backup AI' : 'Primary AI'}</span>
          </button>

          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300"
          >
            Voice settings
          </button>

          <button
            onClick={() => setLargeText((prev) => !prev)}
            className={`rounded-xl border px-3 py-1.5 text-xs transition ${
              largeText ? 'border-violet-500/40 bg-violet-500/10 text-violet-300' : 'border-slate-800 bg-slate-900/60 text-slate-300'
            }`}
          >
            {largeText ? 'Large text on' : 'Large text'}
          </button>

          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
              autoSpeak
                ? 'border-teal-500/40 bg-teal-500/10 text-teal-300'
                : 'border-slate-800 text-slate-400'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voice Out:</span> {autoSpeak ? 'On' : 'Muted'}
          </button>
        </div>
      </header>

      <div className="mx-auto mt-3 w-full max-w-4xl px-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${backupAiMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">AI status</div>
              <div className="text-xs text-slate-200">{aiStatusText}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">Mood: {selectedMood}</span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">Engine: {voiceEngine === 'filipino_native' ? 'Native' : 'Gemini'}</span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">Audio: {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-3 w-full max-w-4xl px-4">
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/40 p-4 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">Vent / trash-talk mode</div>
              <div className="mt-1 text-sm font-medium text-slate-100">Need to say it straight? Let it out honestly.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLastNonAngryMood(selectedMood === 'angry' ? lastNonAngryMood : selectedMood);
                setSelectedMood('angry');
                setAngryMode(true);
              }}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200"
            >
              Set Mad Mood
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "I'm so mad and fed up. I need a blunt answer.",
              "I need to vent and I don't want a soft response.",
              "Give me a savage but honest reply for this mess.",
            ].map((ventText) => (
              <button
                key={ventText}
                type="button"
                onClick={() => handleSendProblem(ventText)}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 transition hover:border-rose-500/40 hover:text-rose-200"
              >
                {ventText.length > 34 ? 'Rant now' : ventText}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="mx-auto mt-2 w-full max-w-4xl px-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Character mood
                </div>
                <div className="flex flex-wrap gap-2">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => applyMoodSelection(mood.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        selectedMood === mood.value
                          ? 'border-teal-400/60 bg-teal-500/15 text-teal-200'
                          : 'border-slate-700 bg-slate-950/40 text-slate-300'
                      }`}
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 md:max-w-md">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Voice tuning
                </div>
                <div className="space-y-3">
                  {[
                    ['Speed', 'speed', 0.7, 1.4, 0.1],
                    ['Pitch', 'pitch', 0.8, 1.4, 0.1],
                    ['Warmth', 'warmth', 0.5, 1.2, 0.1],
                  ].map(([label, key, min, max, step]) => (
                    <label key={label} className="block text-[11px] text-slate-300">
                      <div className="mb-1 flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-slate-400">
                          {
                            key === 'speed'
                              ? voiceSettings.speed.toFixed(1)
                              : key === 'pitch'
                              ? voiceSettings.pitch.toFixed(1)
                              : voiceSettings.warmth.toFixed(1)
                          }
                        </span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={
                          key === 'speed'
                            ? voiceSettings.speed
                            : key === 'pitch'
                            ? voiceSettings.pitch
                            : voiceSettings.warmth
                        }
                        onChange={(e) =>
                          setVoiceSettings((prev) => ({
                            ...prev,
                            [key]: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-teal-400"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Accent</span>
                <select
                  value={voiceSettings.accent}
                  onChange={(e) =>
                    setVoiceSettings((prev) => ({
                      ...prev,
                      accent: e.target.value as VoiceSettings['accent'],
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                >
                  <option value="filipino">Filipino</option>
                  <option value="english">English</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <button
                onClick={() => setHighContrast((prev) => !prev)}
                className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                  highContrast
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300'
                }`}
              >
                {highContrast ? 'High contrast on' : 'High contrast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start w-full py-4 pb-12">
        {/* 1. Character Selector on Main Screen */}
        <CharacterSelector
          selectedCharacterId={selectedCharacter.id}
          onSelectCharacter={handleSelectCharacter}
        />

        {/* 2. Prominent Speaking Avatar on Main Screen */}
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

        {/* 3. Problem Conversation Feed on Main Screen */}
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
      </main>
    </div>
  );
}
