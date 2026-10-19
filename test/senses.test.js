import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SENSES, accessibleOutputs } from '../senses.js';
import { MOODS } from '../mood.js';

test('every mood can be seen, heard and felt', () => {
  for (const mood of Object.keys(MOODS)) {
    const s = SENSES[mood];
    assert.ok(s, `${mood} has senses`);
    assert.match(s.caption, /^\[.+\]$/, `${mood} caption is in [brackets], like captions for deaf viewers`);
    assert.ok(s.description.length > 10, `${mood} has a spoken description`);
    assert.match(s.color, /^#[0-9a-f]{6}$/i);
    assert.ok(s.beat > 0);
  }
});

test('vibration patterns are short and valid', () => {
  for (const [mood, s] of Object.entries(SENSES)) {
    assert.ok(s.haptic.length > 0 && s.haptic.length % 2 === 1, `${mood} pattern ends on a vibration`);
    assert.ok(s.haptic.every((ms) => Number.isInteger(ms) && ms > 0), `${mood} uses positive whole milliseconds`);
    const total = s.haptic.reduce((a, b) => a + b, 0);
    assert.ok(total <= 3000, `${mood} pattern lasts at most 3 seconds (${total}ms)`);
  }
});

test('spoken text names the song and describes the mood', () => {
  const out = accessibleOutputs('happy', { title: 'Here Comes the Sun', artist: 'The Beatles' });
  assert.equal(out.spoken, 'Now playing Here Comes the Sun by The Beatles. A bright, cheerful song with a bouncy beat.');
  assert.equal(out.caption, '[bright, upbeat music]');
});

test('unknown mood or missing song still gives usable output', () => {
  const out = accessibleOutputs('nope', null);
  assert.equal(out.caption, SENSES.calm.caption);
  assert.match(out.spoken, /^Now playing a song\./);
});
