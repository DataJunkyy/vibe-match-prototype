// Finds a playable song for a mood using free sources only. Nothing here needs
// an API key or a paid account.
//
// 1. Apple's iTunes Search API: free 30-second previews of mainstream songs
//    (old and new). Previews are usually the hook/chorus, i.e. the part of the
//    song that carries its vibe.
// 2. Audius: a free, open music platform with full-length indie tracks, used
//    as a fallback when no preview is found.

import { GENRES, MOODS, candidatePicks, genreOrder, shuffle } from './mood.js';

const ITUNES = 'https://itunes.apple.com/search';
const AUDIUS = 'https://api.audius.co/v1';
const APP_NAME = 'VibeMatchPrototype';

// iTunes allows cross-origin requests, but fall back to JSONP if a browser
// or network blocks the fetch.
async function itunesSearch(params) {
  const query = new URLSearchParams({ media: 'music', entity: 'song', limit: '15', ...params });
  try {
    const res = await fetch(`${ITUNES}?${query}`);
    if (!res.ok) throw new Error(`iTunes ${res.status}`);
    return (await res.json()).results || [];
  } catch (err) {
    return itunesJsonp(query);
  }
}

function itunesJsonp(query) {
  return new Promise((resolve) => {
    const cb = `vibeMatchCb${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    const done = (results) => {
      delete window[cb];
      script.remove();
      resolve(results);
    };
    window[cb] = (data) => done(data?.results || []);
    script.onerror = () => done([]);
    setTimeout(() => window[cb] && done([]), 8000);
    query.set('callback', cb);
    script.src = `${ITUNES}?${query}`;
    document.head.appendChild(script);
  });
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function fromItunes(r, extra) {
  return {
    title: r.trackName,
    artist: r.artistName,
    genre: r.primaryGenreName,
    artwork: (r.artworkUrl100 || '').replace('100x100', '400x400'),
    audioUrl: r.previewUrl,
    startAt: 0,
    source: 'Free 30-second preview via Apple',
    link: r.trackViewUrl,
    ...extra,
  };
}

// Look up one hand-picked song and return its free preview if available.
async function findPick(pick) {
  const results = await itunesSearch({ term: `${pick.title} ${pick.artist}`, limit: '10' });
  const wantArtist = norm(pick.artist).slice(0, 6);
  const wantTitle = norm(pick.title).slice(0, 6);
  const hit = results.find((r) => r.previewUrl
    && norm(r.artistName || '').includes(wantArtist)
    && norm(r.trackName || '').includes(wantTitle))
    || results.find((r) => r.previewUrl && norm(r.artistName || '').includes(wantArtist));
  return hit ? fromItunes(hit, { why: 'hand-picked' }) : null;
}

// Keyword search within a genre, e.g. "sunshine reggae".
async function keywordSearch(mood, genre) {
  const word = shuffle(MOODS[mood].searchWords)[0];
  const results = await itunesSearch({ term: `${word} ${GENRES[genre].label.split(' ')[0]}` });
  const inGenre = results.filter((r) => r.previewUrl && GENRES[genre].match.test(r.primaryGenreName || ''));
  return inGenre.length ? fromItunes(shuffle(inGenre)[0], { why: 'search' }) : null;
}

// Full-length free tracks from Audius. Start about a third of the way in,
// which is usually past the intro and into the main section.
async function audiusSearch(mood) {
  const word = shuffle(MOODS[mood].searchWords)[0];
  const res = await fetch(`${AUDIUS}/tracks/search?query=${encodeURIComponent(word)}&app_name=${APP_NAME}`);
  if (!res.ok) return null;
  const tracks = ((await res.json()).data || []).filter((t) => t.is_streamable !== false);
  if (!tracks.length) return null;
  const t = shuffle(tracks)[0];
  return {
    title: t.title,
    artist: t.user?.name || 'Unknown artist',
    genre: t.genre,
    artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
    audioUrl: `${AUDIUS}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
    startAt: Math.floor((t.duration || 0) / 3),
    source: 'Free full track via Audius',
    link: t.permalink ? `https://audius.co${t.permalink}` : null,
    why: 'audius',
  };
}

// Returns the first playable song, trying sources from best fit to broadest.
// `exclude` holds "title|artist" keys of songs already played this session.
export async function findSong(mood, preferredGenres, exclude = new Set()) {
  const fresh = (song) => song && !exclude.has(`${song.title}|${song.artist}`);

  for (const pick of candidatePicks(mood, preferredGenres)) {
    if (exclude.has(`${pick.title}|${pick.artist}`)) continue;
    const song = await findPick(pick).catch(() => null);
    if (fresh(song)) return song;
  }

  for (const genre of shuffle(genreOrder(preferredGenres))) {
    const song = await keywordSearch(mood, genre).catch(() => null);
    if (fresh(song)) return song;
  }

  const song = await audiusSearch(mood).catch(() => null);
  return fresh(song) ? song : null;
}

// Links that open the same song in apps the person may already pay for.
export function subscriptionLinks(song) {
  const q = encodeURIComponent(`${song.title} ${song.artist}`);
  return [
    { label: 'Spotify', url: `https://open.spotify.com/search/${q}` },
    { label: 'YouTube Music', url: `https://music.youtube.com/search?q=${q}` },
    { label: 'Apple Music', url: song.link && song.why !== 'audius' ? song.link : `https://music.apple.com/us/search?term=${q}` },
  ];
}
