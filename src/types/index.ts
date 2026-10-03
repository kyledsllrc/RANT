export type CharacterId = 'grandma' | 'grandpa' | 'mother' | 'father' | 'son' | 'daughter' | 'cousin';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  tagline: string;
  avatarIcon: string; // Emoji / icon representation
  avatarImage: string; // Styled SVG / avatar visual
  color: {
    accent: string;
    border: string;
    bg: string;
    ring: string;
  };
  greeting: string;
  voiceName: 'Kore' | 'Zephyr' | 'Fenrir' | 'Puck' | 'Charon';
}

export interface CharacterMessage {
  id: string;
  role: 'user' | 'assistant';
  characterId?: CharacterId;
  content: string;
  timestamp: number;
  detectedLanguage?: string;
  emotionDetected?: string;
  adviceSummary?: string;
  audioBase64?: string;
}
