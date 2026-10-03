import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { detectUserMoodFromText } from '../src/utils/mood';

describe('user mood detection', () => {
  it('detects angry venting and trash-talk prompts as angry', () => {
    const mood = detectUserMoodFromText("I'm so pissed and fed up with this nonsense. I need a savage, blunt response.");
    assert.equal(mood, 'angry');
  });

  it('keeps sad or overwhelmed messages supportive instead of hostile', () => {
    const mood = detectUserMoodFromText("I feel overwhelmed and I just need someone to calm me down.");
    assert.equal(mood, 'supportive');
  });
});
