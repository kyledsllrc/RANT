import React from 'react';
import { FAMILY_CHARACTERS } from '../data/characters';
import { CharacterId, CharacterProfile } from '../types';

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
                <span className="absolute bottom-0 right-0 text-sm bg-slate-950/80 rounded-full px-1">
                  {char.avatarIcon}
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
