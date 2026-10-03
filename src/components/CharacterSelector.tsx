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
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      <div className="text-center mb-3">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Choose Who You Want To Talk With:
        </h2>
      </div>

      {/* Horizontal Scrollable or Flex Grid of Characters */}
      <div className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {FAMILY_CHARACTERS.map((char) => {
          const isSelected = char.id === selectedCharacterId;
          return (
            <button
              key={char.id}
              onClick={() => onSelectCharacter(char)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 sm:p-2.5 border transition shrink-0 ${
                isSelected
                  ? `${char.color.border} ${char.color.bg} shadow-lg ring-2 ${char.color.ring} scale-105`
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/80 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden border border-slate-700">
                <img
                  src={char.avatarImage}
                  alt={char.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 right-0 text-xs bg-slate-950/80 rounded-full px-1">
                  {char.avatarIcon}
                </span>
              </div>

              <div className="text-center">
                <span className={`text-xs font-semibold block ${isSelected ? char.color.accent : 'text-slate-200'}`}>
                  {char.name}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:block">
                  {char.role.split(' ')[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
