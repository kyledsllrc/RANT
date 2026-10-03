import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureSingleGreeting } from '../src/App';
import { FAMILY_CHARACTERS } from '../src/data/characters';

describe('chat flow', () => {
  it('keeps only one greeting for the active character', () => {
    const character = FAMILY_CHARACTERS[0];
    const messages = [
      { id: 'g1', role: 'assistant' as const, characterId: character.id, content: character.greeting, timestamp: 1 },
      { id: 'g2', role: 'assistant' as const, characterId: character.id, content: character.greeting, timestamp: 2 },
      { id: 'u1', role: 'user' as const, content: 'I am overwhelmed', timestamp: 3 },
    ];

    const next = ensureSingleGreeting(messages, character);

    assert.equal(next.filter((m) => m.role === 'assistant' && m.characterId === character.id && m.content === character.greeting).length, 1);
  });
});
