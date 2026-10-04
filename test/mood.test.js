import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectMood, candidatePicks, PICKS, MOODS, GENRES } from '../mood.js';

const cases = [
  ["I just got promoted and I'm so happy!", 'happy'],
  ['Feeling really lonely tonight, I miss her', 'sad'],
  ['I am not happy at all', 'sad'],
  ['Stressed about my exam tomorrow, can\'t sleep', 'anxious'],
  ['Pumped for the gym, let\'s go', 'energetic'],
  ['So fed up with my boss', 'angry'],
  ['Lazy Sunday, just want to chill', 'calm'],
  ['Thinking about the good old days with my childhood friends', 'nostalgic'],
  ['Falling in love with my best friend, butterflies', 'romantic'],
  ['Tough year but I believe tomorrow will be better', 'hopeful'],
];

for (const [text, mood] of cases) {
  test(`"${text}" -> ${mood}`, () => assert.equal(detectMood(text).mood, mood));
}

test('unclear text falls back to calm and says so', () => {
  const r = detectMood('asdf qwerty');
  assert.equal(r.mood, 'calm');
  assert.equal(r.confident, false);
});

test('preferred genres come first and only them', () => {
  const picks = candidatePicks('happy', ['reggae']);
  assert.ok(picks.length > 0);
  assert.ok(picks.every((p) => p.genre === 'reggae'));
});

test('every mood has picks for every genre in "Title — Artist" form', () => {
  for (const mood of Object.keys(MOODS)) {
    for (const genre of Object.keys(GENRES)) {
      const list = PICKS[mood][genre];
      assert.ok(list?.length, `${mood}/${genre} empty`);
      for (const p of list) assert.equal(p.split(' — ').length, 2, p);
    }
  }
});
