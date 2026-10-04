import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureSingleGreeting } from '../src/App';
import { FAMILY_CHARACTERS } from '../src/data/characters';

describe('chat flow', () => {
  it('replaces old character greetings instead of accumulating chat cards', () => {
    const [woman, man] = FAMILY_CHARACTERS;
    const messages = [
      { id: 'g1', role: 'assistant' as const, characterId: woman.id, content: woman.greeting, timestamp: 1 },
      { id: 'u1', role: 'user' as const, content: 'I am overwhelmed', timestamp: 3 },
      { id: 'g2', role: 'assistant' as const, characterId: man.id, content: man.greeting, timestamp: 4 },
    ];

    const next = ensureSingleGreeting(messages, man);

    const greetings = next.filter((message) =>
      FAMILY_CHARACTERS.some((character) => message.role === 'assistant' && message.content === character.greeting)
    );
    assert.equal(greetings.length, 1);
    assert.equal(greetings[0].content, man.greeting);
    assert.equal(next[1].content, 'I am overwhelmed');
  });
});
