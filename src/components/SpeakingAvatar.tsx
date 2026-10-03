import React from 'react';
import { Volume2, VolumeX, Sparkles, Mic, PhoneCall, PhoneOff } from 'lucide-react';
import { CharacterProfile, CharacterMood, VoiceSettings } from '../types';

const CartoonBadge: React.FC<{ character: CharacterProfile; sizeClassName?: string }> = ({
  character,
  sizeClassName = 'h-9 w-9',
}) => {
  const isWoman = character.id === 'woman';

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-950/90 shadow-md ${sizeClassName}`}>
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-label={character.name} role="img">
        <circle cx="32" cy="24" r="13" fill={isWoman ? '#f9c7d5' : '#b8d7ff'} stroke="#f8fafc" strokeWidth="2" />
        <path
          d={
            isWoman
              ? 'M22 22c2-10 18-10 22 0v3H22v-3Z'
              : 'M18 22c2-8 26-8 28 1v4H18v-5Z'
          }
          fill={isWoman ? '#392435' : '#1f3a5f'}
        />
        {isWoman ? (
          <>
            <circle cx="27" cy="24" r="1.2" fill="#1f2937" />
            <circle cx="37" cy="24" r="1.2" fill="#1f2937" />
            <path d="M28 29c2 2 6 2 8 0" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M22 46c2-8 7-12 10-12s8 4 10 12" fill={isWoman ? '#fda4af' : '#93c5fd'} />
            <path d="M24 40h16v8H24z" fill={isWoman ? '#f9a8d4' : '#7dd3fc'} opacity="0.7" />
          </>
        ) : (
          <>
            <circle cx="27" cy="24" r="1.2" fill="#1f2937" />
            <circle cx="37" cy="24" r="1.2" fill="#1f2937" />
            <path d="M28 29c2 2 6 2 8 0" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M20 46c3-8 7-12 12-12s9 4 12 12" fill="#93c5fd" />
            <path d="M25 42h14v8H25z" fill="#1d4ed8" opacity="0.9" />
          </>
        )}
      </svg>
    </div>
  );
};

const VoiceWave: React.FC<{ active: boolean; accentClass: string }> = ({ active, accentClass }) => (
  <div className="flex h-4 items-end gap-1">
    {[0.6, 1, 0.7, 1.2, 0.8, 1.4, 0.9, 1.1, 0.75].map((height, index) => (
      <span
        key={index}
        className={`w-1 rounded-full transition-all duration-300 ${active ? accentClass : 'bg-slate-600'} ${
          active ? 'animate-pulse' : ''
        }`}
        style={{ height: `${height * 10}px`, animationDelay: `${index * 80}ms` }}
      />
    ))}
  </div>
);

interface SpeakingAvatarProps {
  character: CharacterProfile;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  isVoiceCallMode: boolean;
  onToggleVoiceCall: () => void;
  onReplaySpeech: () => void;
  onStopSpeech: () => void;
  currentSpeechText: string;
  adviceSummary?: string;
  detectedLanguage?: string;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  selectedMood?: CharacterMood;
  voiceSettings?: VoiceSettings;
  memorySummary?: string;
  backupAiMode?: boolean;
  highContrast?: boolean;
}

export const SpeakingAvatar: React.FC<SpeakingAvatarProps> = ({
  character,
  isSpeaking,
  isListening,
  isThinking,
  isVoiceCallMode,
  onToggleVoiceCall,
  onReplaySpeech,
  onStopSpeech,
  currentSpeechText,
  adviceSummary,
  detectedLanguage,
  autoSpeak,
  onToggleAutoSpeak,
  selectedMood = 'supportive',
  voiceSettings,
  memorySummary,
  backupAiMode = true,
  highContrast = false,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center text-center p-4">
      {/* Background ambient glow matching character theme */}
      <div
        className={`absolute h-72 w-72 sm:h-96 sm:w-96 rounded-full blur-3xl transition-all duration-700 pointer-events-none opacity-40 ${
          isSpeaking
            ? `${character.color.bg} scale-125 opacity-70`
            : isListening
            ? 'bg-emerald-500/30 scale-110'
            : isThinking
            ? 'bg-amber-500/30 scale-95'
            : `${character.color.bg} scale-100`
        }`}
      />

      {/* Main Avatar Stage with Concentric Speaking Rings */}
      <div className="relative flex items-center justify-center my-4">
        {/* Outermost Animated Ripple (Active when speaking or listening) */}
        <div
          className={`absolute h-52 w-52 sm:h-64 sm:w-64 rounded-full border transition-all duration-500 ${
            isSpeaking
              ? `${character.color.border} scale-110 opacity-70 animate-ping`
              : isListening
              ? 'border-emerald-400/50 scale-110 animate-pulse'
              : 'border-slate-800/40 opacity-20'
          }`}
        />

        {/* Mid-Ring Aura */}
        <div
          className={`absolute h-44 w-44 sm:h-52 sm:w-52 rounded-full border transition-all duration-500 ${
            isSpeaking
              ? `${character.color.border} ${character.color.bg} scale-105 shadow-lg`
              : isListening
              ? 'border-emerald-400/40 bg-emerald-500/10'
              : 'border-slate-800/60'
          }`}
        />

        {/* Character Portrait Container */}
        <div
          className={`relative z-10 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full overflow-hidden border-4 transition-all duration-300 shadow-2xl ${
            isSpeaking
              ? `${character.color.ring} ring-4 ring-offset-4 ring-offset-slate-950 scale-105`
              : isListening
              ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-950 scale-100'
              : isThinking
              ? 'ring-4 ring-amber-400/80 animate-pulse'
              : 'border-slate-800'
          }`}
        >
          <img
            src={character.avatarImage}
            alt={character.name}
            className={`h-full w-full object-cover transition-transform duration-500 ${
              isSpeaking ? 'scale-110' : 'scale-100'
            }`}
          />

          {/* Cartoon badge overlay */}
          <div className="absolute bottom-2 right-2">
            <CartoonBadge character={character} sizeClassName="h-9 w-9" />
          </div>

          {/* Thinking overlay */}
          {isThinking && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center text-amber-300">
              <Sparkles className="h-8 w-8 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Speaking Indicator & Voice Equalizer Bars */}
      <div className="z-10 mt-1 flex items-center gap-2">
        {isSpeaking ? (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-3.5 py-1 shadow-sm">
            <VoiceWave active={true} accentClass="bg-gradient-to-t from-teal-400 to-emerald-300" />
            <span className={`text-xs font-semibold ${character.color.accent}`}>
              {character.name} is speaking...
            </span>
          </div>
        ) : isListening ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-600/40 px-3.5 py-1 shadow-sm">
            <VoiceWave active={true} accentClass="bg-gradient-to-t from-emerald-400 to-teal-300" />
            <span className="text-xs font-semibold text-emerald-300">Listening to you... speak freely</span>
          </div>
        ) : isThinking ? (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-950/80 border border-amber-600/40 px-3.5 py-1 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            <span className="text-xs font-semibold text-amber-300">{character.name} is thinking...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 border border-slate-800 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs text-slate-300 font-medium">Ready to listen</span>
          </div>
        )}
      </div>

      {/* Spoken Quote / Subtitle Card */}
      <div className="z-10 mt-4 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 text-left backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold ${character.color.accent}`}>{character.name}</span>
            <span className="text-slate-500">•</span>
            <span>{character.role}</span>
            {detectedLanguage && (
              <span className="ml-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[10px] text-teal-300 font-medium">
                🌐 {detectedLanguage}
              </span>
            )}
            <span className="ml-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300 font-medium">
              Mood: {selectedMood}
            </span>
            {voiceSettings && (
              <span className="ml-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-medium">
                {voiceSettings.speed.toFixed(1)}x / {voiceSettings.pitch.toFixed(1)}p / {voiceSettings.warmth.toFixed(1)}w
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <button
                onClick={onStopSpeech}
                className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 bg-rose-950/50 border border-rose-800/50 px-2 py-0.5 rounded-md"
              >
                <VolumeX className="h-3 w-3" />
                Stop Voice
              </button>
            ) : (
              <button
                onClick={onReplaySpeech}
                className="flex items-center gap-1 text-[11px] text-teal-300 hover:text-teal-200 bg-teal-950/50 border border-teal-800/50 px-2 py-0.5 rounded-md"
                title="Play character's voice aloud"
              >
                <Volume2 className="h-3 w-3" />
                Listen Again
              </button>
            )}

            <button
              onClick={onToggleAutoSpeak}
              className={`text-[10px] px-2 py-0.5 rounded border transition ${
                autoSpeak
                  ? 'border-teal-500/40 bg-teal-500/10 text-teal-300'
                  : 'border-slate-800 text-slate-500'
              }`}
              title="Automatically read responses out loud in character's voice"
            >
              Auto-Voice: {autoSpeak ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Current spoken dialogue */}
        <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-serif italic">
          "{currentSpeechText}"
        </p>

        {detectedLanguage && (
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
              {memorySummary || 'Context memory on'}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
              {backupAiMode ? 'Backup AI active' : 'Primary AI active'}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
              {highContrast ? 'High contrast' : 'Standard contrast'}
            </span>
          </div>
        )}

        {/* Advice key takeaway banner */}
        {adviceSummary && (
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs">
            <span className="rounded bg-teal-500/20 text-teal-300 px-1.5 py-0.5 font-sans font-semibold text-[10px] uppercase tracking-wider">
              {character.name}'s Advice
            </span>
            <span className="text-slate-300 font-sans">{adviceSummary}</span>
          </div>
        )}
      </div>

      {/* Main Call / Speaking Bar */}
      <div className="z-10 mt-4 flex items-center gap-3">
        <button
          onClick={onToggleVoiceCall}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition shadow-xl ${
            isVoiceCallMode
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
              : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950'
          }`}
        >
          {isVoiceCallMode ? (
            <>
              <PhoneOff className="h-4 w-4" />
              <span>End Voice Call</span>
            </>
          ) : (
            <>
              <PhoneCall className="h-4 w-4" />
              <span>Start Live Voice Call with {character.name}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
