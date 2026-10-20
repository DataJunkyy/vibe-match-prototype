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

// What Read aloud says: the song, then why it fits, for people who can't see
// the screen.
export function spokenLine(song = {}) {
  if (!song.title) return '';
  const who = song.artist ? `${song.title} by ${song.artist}` : song.title;
  return song.reason ? `Now playing ${who}. ${song.reason}` : `Now playing ${who}.`;
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

// Daily check-in: one tap a day, with a streak for coming back on consecutive days.
export const CHECKIN_KEY = 'vibeSong.checkins';

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadCheckins(store) { return read(store, CHECKIN_KEY); }

// Records today's mood (replacing an earlier check-in today). Keeps a year.
export function checkIn(store, mood, date = new Date()) {
  const today = dayKey(date);
  const list = loadCheckins(store).filter((c) => c.day !== today);
  list.unshift({ day: today, mood });
  write(store, CHECKIN_KEY, list.slice(0, 366));
}

export function checkedInToday(store, date = new Date()) {
  const today = dayKey(date);
  return loadCheckins(store).find((c) => c.day === today) || null;
}

// Consecutive days ending today (or yesterday, so the streak survives until
// the person checks in today).
export function streak(store, date = new Date()) {
  const days = new Set(loadCheckins(store).map((c) => c.day));
  const d = new Date(date);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Feel it: a pulse at a pace that fits the mood, felt as vibration on phones
// that support it and seen as a pulsing ring everywhere. For anxious moods
// it is slow enough to breathe along to.
export const MOOD_PACE = {
  happy: 116, sad: 70, calm: 64, energetic: 128, angry: 140,
  romantic: 76, nostalgic: 86, hopeful: 100, anxious: 56,
};
export const pulseInterval = (mood) => Math.round(60000 / (MOOD_PACE[mood] || 80));

// Colours for the shareable vibe card.
export const MOOD_COLORS = {
  happy: ['#ffb347', '#ff6f91'], sad: ['#3a4a7a', '#1c2240'], calm: ['#4fc3c8', '#2b6c8f'],
  energetic: ['#ff5e3a', '#ff2a68'], angry: ['#b31217', '#3d0c0c'], romantic: ['#ff7eb3', '#b24592'],
  nostalgic: ['#c79a6b', '#6b4f3a'], hopeful: ['#7ed957', '#2e9e83'], anxious: ['#8e9eab', '#4a5a73'],
};

// Creator mode: someone describes a video scene instead of a feeling. Scene
// words ("sunset", "workout", "wedding") count toward the mood that usually
// fits them, on top of the normal feeling words.
const SCENE_WORDS = {
  calm: ['sunset', 'sunrise', 'beach', 'ocean', 'sea', 'waves', 'rain', 'forest', 'nature', 'mountain',
    'mountains', 'lake', 'coffee', 'morning', 'reading', 'yoga', 'meditation', 'timelapse', 'drone',
    'landscape', 'sky', 'clouds', 'snow', 'candle', 'skincare', 'asmr', 'study', 'garden'],
  energetic: ['sports', 'game', 'highlight', 'highlights', 'skate', 'skateboarding', 'montage', 'action',
    'race', 'racing', 'car', 'cars', 'nightlife', 'club', 'festival', 'concert', 'transition', 'hiit',
    'basketball', 'soccer', 'football', 'boxing', 'training', 'fitness'],
  happy: ['vlog', 'birthday', 'kids', 'puppy', 'dog', 'cat', 'pets', 'picnic', 'summer', 'friends',
    'vacation', 'holiday', 'food', 'cooking', 'recipe', 'unboxing', 'haul', 'graduation', 'baby'],
  romantic: ['wedding', 'proposal', 'couple', 'anniversary', 'engagement', 'honeymoon', 'valentine', 'valentines'],
  nostalgic: ['throwback', 'recap', 'flashback', 'vintage', 'retro', 'family', 'slideshow', 'archive', 'reunion'],
  hopeful: ['launch', 'transformation', 'journey', 'progress', 'glowup', 'motivational', 'inspiring',
    'inspirational', 'startup', 'announcement', 'testimonial', 'opening', 'graduates'],
  sad: ['memorial', 'tribute', 'goodbye', 'farewell', 'funeral', 'remembrance'],
};

export function detectScene(text, detect) {
  const base = detect(text);
  const scores = { ...base.scores };
  const matched = [...base.matched];
  for (const token of text.toLowerCase().match(/[a-z]+/g) || []) {
    for (const [mood, words] of Object.entries(SCENE_WORDS)) {
      if (words.includes(token)) { scores[mood] += 1; matched.push(token); }
    }
  }
  let best = null;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > 0 && (best === null || score > scores[best])) best = mood;
  }
  return { mood: best || base.mood, scores, matched, confident: best !== null };
}

// Caption file for a video of `seconds` length: the music caption when the
// music starts, and a closing cue as it ends. SRT works in YouTube, TikTok,
// CapCut, Premiere and most editors.
function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

export function makeSrt(caption, seconds = 30) {
  const len = Math.max(1, Math.min(Number(seconds) || 30, 3600));
  const cues = [[0, Math.min(4, len), caption]];
  if (len >= 8) cues.push([len - 2, len, '[music fades out]']);
  return cues.map(([a, b, text], i) => `${i + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${text}\n`).join('\n');
}

// One line for a post description: credits the artist and describes the
// music for people using a screen reader.
export function creditLine(song) {
  const sound = song.caption ? ` ${song.caption}` : '';
  return `🎵 Music: "${song.title}" by ${song.artist}${sound}\nSong found with vibesong.vercel.app`;
}
