import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveCharacterVoiceConfig } from '../src/utils/speech';

describe('character voice resolution', () => {
  it('keeps the woman character on a female voice profile', () => {
    const profile = resolveCharacterVoiceConfig('woman', 'Tagalog');
    assert.equal(profile.gender, 'female');
    assert.ok(profile.voiceNames.some((name) => name.toLowerCase().includes('kore')));
  });

  it('keeps the man character on a male voice profile', () => {
    const profile = resolveCharacterVoiceConfig('man', 'English');
    assert.equal(profile.gender, 'male');
    assert.ok(profile.voiceNames.some((name) => name.toLowerCase().includes('fenrir')));
  });
});
