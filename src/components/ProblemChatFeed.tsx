import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Sparkles } from 'lucide-react';
import { CharacterMessage, CharacterProfile } from '../types';

interface ProblemChatFeedProps {
  character: CharacterProfile;
  messages: CharacterMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isDictating: boolean;
  onToggleDictation: () => void;
  onPlayMessageVoice: (msg: CharacterMessage) => void;
}

const COMMON_PROBLEMS = [
  "I'm overwhelmed by stress and burnout.",
  "I feel so lonely and like nobody cares.",
  "I'm going through heartbreak and can't stop crying.",
  "I made a huge mistake and feel like a total failure.",
  "I'm having panic attacks and my chest feels tight.",
  "I don't know what direction my life is going.",
];

export const ProblemChatFeed: React.FC<ProblemChatFeedProps> = ({
  character,
  messages,
  onSendMessage,
  isLoading,
  isDictating,
  onToggleDictation,
  onPlayMessageVoice,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="w-full flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Conversation</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-50">Talk it through</h2>
        </div>
      </div>

      {messages.length <= 2 && (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[11px] text-slate-400 mb-2 font-medium">
            Common problems you can talk about with {character.name}:
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_PROBLEMS.map((prob, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(prob)}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:border-teal-500/40 hover:text-teal-300 transition"
              >
                "{prob}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-[430px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-tr from-teal-600 to-teal-700 text-white rounded-br-xs'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-75">
                  <span className="font-semibold">
                    {isUser ? 'You' : character.name}
                  </span>
                  <span className="text-[10px] font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.content}
                </p>

                {/* Response metadata & audio button for character responses */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {msg.detectedLanguage && (
                        <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[10px] text-teal-300">
                          🌐 {msg.detectedLanguage}
                        </span>
                      )}
                      {msg.emotionDetected && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          Feeling: {msg.emotionDetected}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onPlayMessageVoice(msg)}
                      className="flex items-center gap-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition shrink-0"
                      title="Replay in character voice"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-teal-400" />
                      <span>Hear Voice</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 py-2 animate-pulse">
            <Sparkles className="h-4 w-4 text-teal-400 animate-spin" />
            <span>{character.name} is listening and formulating personal advice...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/80 p-2 shadow-[0_12px_30px_rgba(2,6,23,0.28)] backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Microphone Dictation Button */}
          <button
            type="button"
            onClick={onToggleDictation}
            className={`rounded-xl p-2.5 transition ${
              isDictating
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={isDictating ? 'Stop microphone' : 'Speak to input your problem'}
          >
            {isDictating ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isDictating
                ? 'Listening to your voice...'
                : `Tell ${character.name} what problem is on your mind...`
            }
            className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-slate-950 transition hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500"
            title="Send problem"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
