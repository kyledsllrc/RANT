import type { CharacterMood } from '../types';

const angryKeywords = [
  'angry',
  'mad',
  'pissed',
  'furious',
  'fed up',
  'sick of',
  'hate',
  'hatred',
  'roast',
  'savage',
  'trash talk',
  'blunt',
  'rage',
  'done with',
  "can't stand",
  'disgusted',
  'irritated',
  'annoyed',
  'frustrated',
  'upset',
  'bad mood',
  'vent',
  'bitter',
];

const supportiveKeywords = [
  'overwhelmed',
  'stressed',
  'burnout',
  'panic',
  'anxious',
  'sad',
  'lonely',
  'heartbroken',
  'crying',
  'scared',
  'confused',
  'need help',
  'need comfort',
  'support',
  'exhausted',
];

export function detectUserMoodFromText(text: string): CharacterMood {
  const normalized = text.toLowerCase();

  if (angryKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'angry';
  }

  if (supportiveKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'supportive';
  }

  return 'supportive';
}
