import React from 'react';
import { FAMILY_CHARACTERS } from '../data/characters';
import { CharacterId, CharacterProfile } from '../types';

const CartoonBadge: React.FC<{ character: CharacterProfile; sizeClassName?: string }> = ({
  character,
  sizeClassName = 'h-12 w-12 sm:h-14 sm:w-14',
}) => {
  const isWoman = character.id === 'woman';

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-950/90 shadow-sm ${sizeClassName}`}>
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
            <path d="M22 46c2-8 7-12 10-12s8 4 10 12" fill="#fda4af" />
            <path d="M24 40h16v8H24z" fill="#f9a8d4" opacity="0.7" />
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

interface CharacterSelectorProps {
  selectedCharacterId: CharacterId;
  onSelectCharacter: (char: CharacterProfile) => void;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacterId,
  onSelectCharacter,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-2">
      <div className="text-center mb-3">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Select Voice & Companion:
        </h2>
      </div>

      {/* 2 Clean Companion Options: Woman & Man */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
        {FAMILY_CHARACTERS.map((char) => {
          const isSelected = char.id === selectedCharacterId;
          return (
            <button
              key={char.id}
              onClick={() => onSelectCharacter(char)}
              className={`flex items-center gap-3 rounded-2xl p-3 sm:p-3.5 border transition text-left cursor-pointer ${
                isSelected
                  ? `${char.color.border} ${char.color.bg} shadow-lg ring-2 ${char.color.ring} scale-[1.02]`
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden border border-slate-700 shrink-0 shadow">
                <img
                  src={char.avatarImage}
                  alt={char.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 right-0 rounded-full border border-slate-700 bg-slate-950/80">
                  <CartoonBadge character={char} sizeClassName="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <span className={`text-base font-bold block ${isSelected ? char.color.accent : 'text-slate-100'}`}>
                  {char.name}
                </span>
                <span className="text-xs text-slate-400 block truncate">
                  {char.role}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
