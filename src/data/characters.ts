import { CharacterProfile } from '../types';

export const FAMILY_CHARACTERS: CharacterProfile[] = [
  {
    id: 'woman',
    name: 'Woman',
    role: 'Female Voice (Babae)',
    tagline: 'Warm, empathetic & gentle reassuring presence',
    avatarIcon: '👩',
    avatarImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
    color: {
      accent: 'text-rose-300',
      border: 'border-rose-500/40',
      bg: 'bg-rose-500/10',
      ring: 'ring-rose-400/50',
    },
    greeting: "Andito ako para sa'yo. Sabihin mo sa akin ang problema mo.",
    voiceName: 'Kore',
  },
  {
    id: 'man',
    name: 'Man',
    role: 'Male Voice (Lalaki)',
    tagline: 'Steady, calm & reassuring supportive presence',
    avatarIcon: '👨',
    avatarImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    color: {
      accent: 'text-blue-300',
      border: 'border-blue-500/40',
      bg: 'bg-blue-500/10',
      ring: 'ring-blue-400/50',
    },
    greeting: "Andito ako para makinig. Sabihin mo sa akin, aayusin natin 'yan.",
    voiceName: 'Fenrir',
  },
];
