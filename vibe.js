// Words that describe a song for a mood: a one-line reason it fits, and an
// accessible music caption like "[warm, hopeful acoustic guitar]" that
// creators can paste into subtitles. Pure logic, no network.

// How each mood sounds: a few adjective pairs (picked per song so a playlist
// doesn't repeat itself), plus the reason line.
const MOOD_SOUND = {
  happy: { words: [['bright', 'bouncy'], ['sunny', 'feel-good'], ['playful', 'upbeat']], reason: 'to match your happy mood' },
  sad: { words: [['soft', 'aching'], ['slow', 'heartfelt'], ['quiet', 'tender']], reason: 'to sit with you while you feel it' },
  calm: { words: [['gentle', 'unhurried'], ['mellow', 'easy'], ['soft', 'airy']], reason: 'to help you slow down' },
  energetic: { words: [['driving', 'high-energy'], ['punchy', 'fast'], ['loud', 'pumping']], reason: 'to keep your energy up' },
  angry: { words: [['heavy', 'fierce'], ['raw', 'pounding'], ['gritty', 'defiant']], reason: 'to let some of that fire out' },
  romantic: { words: [['warm', 'tender'], ['smooth', 'sweet'], ['dreamy', 'intimate']], reason: 'for that in-love feeling' },
  nostalgic: { words: [['warm', 'wistful'], ['vintage', 'bittersweet'], ['hazy', 'familiar']], reason: 'for a walk down memory lane' },
  hopeful: { words: [['uplifting', 'rising'], ['bright', 'building'], ['soaring', 'warm']], reason: 'for the better days ahead' },
  anxious: { words: [['soothing', 'steady'], ['slow', 'reassuring'], ['calm', 'grounding']], reason: 'to help you breathe' },
};

// Same song, same words: a small hash of the title picks the adjective pair.
function wordsFor(mood, song) {
  const pairs = (MOOD_SOUND[mood] || MOOD_SOUND.calm).words;
  let h = 0;
  for (const ch of song.title || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pairs[h % pairs.length];
}

// What a genre sounds like, matched against the song's genre name.
const GENRE_SOUND = [
  [/gospel|christian/i, 'gospel choir'],
  [/country|americana/i, 'acoustic guitar'],
  [/reggae|dancehall/i, 'reggae groove'],
  [/hip-?hop|rap/i, 'hip-hop beat'],
  [/r&b|soul/i, 'R&B vocals'],
  [/afro|highlife/i, 'Afrobeats rhythm'],
  [/latin|reggaeton|salsa/i, 'Latin percussion'],
  [/jazz/i, 'jazz piano and horns'],
  [/classical|soundtrack|score/i, 'strings'],
  [/electronic|dance|house|techno/i, 'synths and beat'],
  [/rock|alternative|metal|punk/i, 'electric guitars'],
  [/folk|singer/i, 'acoustic guitar'],
  [/pop/i, 'pop vocals'],
];

export function soundOf(genre = '') {
  for (const [re, sound] of GENRE_SOUND) if (re.test(genre)) return sound;
  return 'music';
}

export function musicCaption(mood, song = {}) {
  const [a, b] = wordsFor(mood, song);
  return `[${a}, ${b} ${soundOf(song.genre)}]`;
}

export function songReason(mood, song = {}) {
  const m = MOOD_SOUND[mood] || MOOD_SOUND.calm;
  const [a, b] = wordsFor(mood, song);
  const sound = soundOf(song.genre);
  const lead = `${a[0].toUpperCase()}${a.slice(1)} and ${b}`;
  return sound === 'music' ? `${lead}, ${m.reason}.` : `${lead} ${sound}, ${m.reason}.`;
}

// Saved songs and recent vibes live in this browser only. The store is passed
// in so the logic can be tested without a browser.
export const SAVED_KEY = 'vibeSong.saved';
export const HISTORY_KEY = 'vibeSong.history';
const MAX_SAVED = 50;
const MAX_HISTORY = 15;

const songKey = (s) => `${s.title}|${s.artist}`;

function read(store, key) {
  try { return JSON.parse(store.getItem(key)) || []; } catch { return []; }
}
function write(store, key, list) {
  try { store.setItem(key, JSON.stringify(list)); } catch { /* private mode or full */ }
}

export function loadSaved(store) { return read(store, SAVED_KEY); }

export function isSaved(store, song) {
  return loadSaved(store).some((s) => songKey(s) === songKey(song));
}

// Adds the song if it isn't saved yet, removes it if it is. Returns the new state.
export function toggleSaved(store, song, now = Date.now()) {
  const list = loadSaved(store);
  const i = list.findIndex((s) => songKey(s) === songKey(song));
  if (i >= 0) {
    list.splice(i, 1);
    write(store, SAVED_KEY, list);
    return false;
  }
  const { title, artist, genre, artwork, audioUrl, startAt, link, source, why, mood, caption } = song;
  list.unshift({ title, artist, genre, artwork, audioUrl, startAt, link, source, why, mood, caption, savedAt: now });
  write(store, SAVED_KEY, list.slice(0, MAX_SAVED));
  return true;
}

export function loadHistory(store) { return read(store, HISTORY_KEY); }

// Remembers what someone said and the mood it read as. A repeat of the same
// words moves to the top instead of appearing twice.
export function addHistory(store, entry, now = Date.now()) {
  const text = (entry.text || '').trim().slice(0, 140);
  const list = loadHistory(store).filter((h) => !(h.text === text && h.mood === entry.mood));
  list.unshift({ text, mood: entry.mood, photo: Boolean(entry.photo), at: now });
  write(store, HISTORY_KEY, list.slice(0, MAX_HISTORY));
}
