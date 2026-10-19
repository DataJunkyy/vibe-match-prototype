import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  musicCaption, songReason, soundOf, toggleSaved, isSaved, loadSaved, addHistory, loadHistory,
} from '../vibe.js';

function memoryStore() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

test('caption names the mood and the genre sound', () => {
  assert.equal(musicCaption('hopeful', { genre: 'Country' }), '[uplifting, rising acoustic guitar]');
  assert.equal(musicCaption('anxious', { genre: 'Jazz' }), '[soothing, steady jazz piano and horns]');
});

test('unknown genre falls back to "music"', () => {
  assert.equal(soundOf('Spoken Word'), 'music');
  assert.equal(musicCaption('sad', {}), '[soft, aching music]');
});

test('reason reads as a sentence', () => {
  assert.equal(songReason('calm', { genre: 'Classical' }), 'Gentle and unhurried strings, to help you slow down.');
  assert.equal(songReason('happy', {}), 'Bright and bouncy, to match your happy mood.');
});

test('songs in one playlist get varied wording, the same song always the same', () => {
  const titles = ['Alright', 'Fight Song', 'Ye', 'Color Esperanza', 'The House That Built Me', 'Rise Up'];
  const captions = new Set(titles.map((title) => musicCaption('hopeful', { title, genre: 'Pop' })));
  assert.ok(captions.size > 1);
  assert.equal(musicCaption('hopeful', { title: 'Ye' }), musicCaption('hopeful', { title: 'Ye' }));
});

test('unknown mood uses calm wording', () => {
  assert.equal(musicCaption('confused', { genre: 'Pop' }), '[gentle, unhurried pop vocals]');
});

test('saving toggles a song on and off', () => {
  const store = memoryStore();
  const song = { title: 'Here Comes the Sun', artist: 'The Beatles', genre: 'Rock', mood: 'happy' };
  assert.equal(toggleSaved(store, song), true);
  assert.equal(isSaved(store, song), true);
  assert.equal(loadSaved(store)[0].title, 'Here Comes the Sun');
  assert.equal(toggleSaved(store, song), false);
  assert.equal(isSaved(store, song), false);
});

test('history keeps newest first and drops repeats', () => {
  const store = memoryStore();
  addHistory(store, { text: 'tired but proud', mood: 'calm' }, 1);
  addHistory(store, { text: 'so happy today', mood: 'happy' }, 2);
  addHistory(store, { text: 'tired but proud', mood: 'calm' }, 3);
  const h = loadHistory(store);
  assert.deepEqual(h.map((e) => e.text), ['tired but proud', 'so happy today']);
  assert.equal(h[0].at, 3);
});

test('a broken store does not throw', () => {
  const store = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(loadSaved(store), []);
  assert.doesNotThrow(() => toggleSaved(store, { title: 'a', artist: 'b' }));
});

test('streak counts consecutive days and survives until today is done', async () => {
  const { checkIn, streak, checkedInToday } = await import('../vibe.js');
  const store = memoryStore();
  checkIn(store, 'happy', new Date(2026, 9, 16, 9));
  checkIn(store, 'calm', new Date(2026, 9, 17, 9));
  checkIn(store, 'hopeful', new Date(2026, 9, 18, 21));
  assert.equal(streak(store, new Date(2026, 9, 18, 22)), 3);
  assert.equal(streak(store, new Date(2026, 9, 19, 8)), 3, 'not checked in yet today');
  assert.equal(checkedInToday(store, new Date(2026, 9, 19, 8)), null);
  assert.equal(streak(store, new Date(2026, 9, 21, 8)), 0, 'missed a day');
});

test('checking in twice in one day keeps the latest mood', async () => {
  const { checkIn, loadCheckins } = await import('../vibe.js');
  const store = memoryStore();
  checkIn(store, 'sad', new Date(2026, 9, 19, 8));
  checkIn(store, 'hopeful', new Date(2026, 9, 19, 20));
  assert.deepEqual(loadCheckins(store), [{ day: '2026-10-19', mood: 'hopeful' }]);
});

test('anxious pulses slowest, angry fastest', async () => {
  const { pulseInterval } = await import('../vibe.js');
  assert.ok(pulseInterval('anxious') > pulseInterval('calm'));
  assert.ok(pulseInterval('angry') < pulseInterval('energetic'));
  assert.equal(pulseInterval('unknown'), 750);
});
