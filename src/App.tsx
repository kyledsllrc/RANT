import React, { useState, useEffect, useRef } from 'react';
import { FAMILY_CHARACTERS } from './data/characters';
import { CharacterId, CharacterProfile, CharacterMessage } from './types';
import { CharacterSelector } from './components/CharacterSelector';
import { SpeakingAvatar } from './components/SpeakingAvatar';
import { ProblemChatFeed } from './components/ProblemChatFeed';
import { VoiceRecognitionService, playWavBase64, stopCurrentAudio, speakWithBrowserSynthesis } from './utils/speech';
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

  // Speech Recognition service
  const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    voiceServiceRef.current = new VoiceRecognitionService();
    return () => {
      stopCurrentAudio();
      if (voiceServiceRef.current) {
        voiceServiceRef.current.stop();
      }
    };
  }, []);

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

  // Play Character Voice via TTS with Web Speech fallback
  const playCharacterVoice = async (text: string, character: CharacterProfile, detectedLanguage?: string) => {
    stopCurrentAudio();
    setIsSpeaking(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          characterId: character.id,
          voiceName: character.voiceName,
        }),
      });

      const data = await response.json();

      if (data.audioBase64) {
        stopAudioRef.current = playWavBase64(
          data.audioBase64,
          () => setIsSpeaking(true),
          () => {
            setIsSpeaking(false);
            if (isVoiceCallMode) {
              startLiveListening();
            }
          }
        );
      } else {
        speakWithBrowserSynthesis(
          text,
          {
            characterId: character.id,
            detectedLanguage: detectedLanguage || latestDetectedLanguage,
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
    } catch (err) {
      console.warn('TTS playback error, fallback to browser synthesis:', err);
      speakWithBrowserSynthesis(
        text,
        {
          characterId: character.id,
          detectedLanguage: detectedLanguage || latestDetectedLanguage,
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
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch character response');
      }

      const data = await res.json();
      const replyText = data.reply || `I hear you, sweetheart. Take a slow breath.`;

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
      setIsThinking(false);

      if (autoSpeak || isVoiceCallMode) {
        playCharacterVoice(replyText, selectedCharacter, data.detectedLanguage);
      }
    } catch (error) {
      console.error('Error getting response:', error);
      setIsThinking(false);
      const fallbackReply = `I am listening to you closely, but my connection dipped for a second. Please send your message again, I am right here with you.`;
      const fallbackMsg: CharacterMessage = {
        id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
        role: 'assistant',
        characterId: selectedCharacter.id,
        content: fallbackReply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setCurrentSpeechText(fallbackReply);
      playCharacterVoice(fallbackReply, selectedCharacter, latestDetectedLanguage);
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
    playCharacterVoice(currentSpeechText, selectedCharacter, latestDetectedLanguage);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Controls */}
      <header className="px-4 pt-3 pb-1 flex items-center justify-end max-w-4xl mx-auto w-full">
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
      </header>

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
        />

        {/* 3. Problem Conversation Feed on Main Screen */}
        <ProblemChatFeed
          character={selectedCharacter}
          messages={messages}
          onSendMessage={handleSendProblem}
          isLoading={isThinking}
          isDictating={isListening && !isVoiceCallMode}
          onToggleDictation={handleToggleDictation}
          onPlayMessageVoice={(msg) => playCharacterVoice(msg.content, selectedCharacter, msg.detectedLanguage)}
        />
      </main>
    </div>
  );
}
