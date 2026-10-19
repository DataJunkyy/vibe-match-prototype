// AI scene matching for Creator Pro: Claude reads a video scene and suggests
// songs, each with a reason and a music caption. Pure helpers here so they can
// be tested; the network call lives in match.js.

export const MOOD_KEYS = ['happy', 'sad', 'calm', 'energetic', 'angry', 'romantic', 'nostalgic', 'hopeful', 'anxious'];

export function buildPrompt(scene, seconds) {
  return {
    system: 'You pick music for short videos. Reply with JSON only, no prose. '
      + 'Shape: {"mood": one of ' + MOOD_KEYS.join('|') + ', "summary": one short sentence on the feel of the scene, '
      + '"songs": [{"title", "artist", "why": one short sentence, "caption": an accessible music caption in square brackets, '
      + 'e.g. "[warm, rising acoustic guitar]"}]}. Suggest 6 real, well-known songs that are easy to find on TikTok, '
      + 'Instagram and YouTube music pickers, varied in era and genre unless the scene asks otherwise.',
    user: `Video scene: ${scene}\nVideo length: ${seconds} seconds`,
  };
}

const clean = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

// Pulls the JSON out of Claude's reply and keeps only well-formed fields.
export function parseReply(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let data;
  try { data = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  const songs = (Array.isArray(data.songs) ? data.songs : [])
    .map((s) => ({ title: clean(s?.title, 120), artist: clean(s?.artist, 120), why: clean(s?.why, 200), caption: clean(s?.caption, 120) }))
    .filter((s) => s.title && s.artist)
    .map((s) => ({ ...s, caption: /^\[.*\]$/.test(s.caption) ? s.caption : (s.caption ? `[${s.caption.replace(/^\[|\]$/g, '')}]` : '') }))
    .slice(0, 8);
  if (!songs.length) return null;
  return { mood: MOOD_KEYS.includes(data.mood) ? data.mood : 'calm', summary: clean(data.summary, 200), songs };
}
