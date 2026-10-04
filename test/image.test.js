import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelStats, moodFromStats } from '../image.js';

// Builds RGBA data from a list of [r, g, b] colours, each repeated `times`.
function img(colours, times = 50) {
  const out = [];
  for (const [r, g, b] of colours) for (let i = 0; i < times; i++) out.push(r, g, b, 255);
  return Uint8ClampedArray.from(out);
}
const moodOf = (colours) => moodFromStats(pixelStats(img(colours))).mood;

test('sunny yellow/orange beach -> happy', () => assert.equal(moodOf([[255, 214, 90], [250, 170, 70], [240, 230, 200]]), 'happy'));
test('dark grey rainy street -> sad', () => assert.equal(moodOf([[40, 42, 48], [60, 62, 66], [30, 30, 34]]), 'sad'));
test('neon party, high contrast -> energetic', () => assert.equal(moodOf([[255, 0, 120], [0, 0, 0], [0, 220, 255]]), 'energetic'));
test('pale misty blue -> calm', () => assert.equal(moodOf([[200, 215, 230], [180, 200, 220]]), 'calm'));
test('candlelit red, dark -> romantic', () => assert.equal(moodOf([[90, 10, 20], [40, 5, 10], [120, 30, 30]]), 'romantic'));
test('green park -> hopeful', () => assert.equal(moodOf([[80, 160, 70], [140, 200, 100], [200, 220, 180]]), 'hopeful'));
test('sepia old photo -> nostalgic', () => assert.equal(moodOf([[170, 140, 100], [130, 105, 75], [190, 165, 125]]), 'nostalgic'));
test('fully transparent image falls back to calm', () => assert.equal(moodFromStats(pixelStats(new Uint8ClampedArray(16))).mood, 'calm'));
