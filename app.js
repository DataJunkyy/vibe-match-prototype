import { GENRES, MOODS, detectMood } from './mood.js';
import { findSong, subscriptionLinks } from './music.js';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'vibeMatch.genres';

// Genre preferences are kept in this browser only.
function loadGenres() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveGenres(genres) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(genres)); } catch { /* private mode */ }
}

let selectedGenres = loadGenres();
let currentMood = null;
const played = new Set();

function renderChips() {
  const box = $('genreChips');
  box.innerHTML = '';
  for (const [key, g] of Object.entries(GENRES)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = g.label;
    chip.setAttribute('aria-pressed', String(selectedGenres.includes(key)));
    chip.addEventListener('click', () => {
      selectedGenres = selectedGenres.includes(key)
        ? selectedGenres.filter((k) => k !== key)
        : [...selectedGenres, key];
      saveGenres(selectedGenres);
      chip.setAttribute('aria-pressed', String(selectedGenres.includes(key)));
    });
    box.appendChild(chip);
  }
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function setStatus(text) { $('status').textContent = text; }

function describeMood({ mood, matched, confident }) {
  const m = MOODS[mood];
  const because = matched.length ? ` (I picked up on: ${[...new Set(matched)].slice(0, 4).map(escapeHtml).join(', ')})` : '';
  const genreText = selectedGenres.length
    ? ` Looking in ${selectedGenres.map((g) => GENRES[g].label).join(', ')}.`
    : '';
  if (!confident) return `${m.emoji} I couldn't quite read that, so here's something calm.${genreText}`;
  const soothe = mood === 'anxious' ? ' Here’s something to help you breathe.' : '';
  return `${m.emoji} Sounds like you're feeling <strong>${m.label.toLowerCase()}</strong>${because}.${soothe}${genreText}`;
}

async function playSong(mood) {
  $('matchBtn').disabled = true;
  $('anotherBtn').hidden = true;
  setStatus('Finding a song…');

  const song = await findSong(mood, selectedGenres, played);
  $('matchBtn').disabled = false;

  if (!song) {
    setStatus('I couldn’t reach the free music sources just now. Check your connection and try again.');
    return;
  }
  played.add(`${song.title}|${song.artist}`);

  $('songCard').hidden = false;
  $('artwork').src = song.artwork || '';
  $('artwork').alt = song.artwork ? `Cover art for ${song.title}` : '';
  $('artwork').style.visibility = song.artwork ? 'visible' : 'hidden';
  $('songTitle').textContent = song.title;
  $('songArtist').textContent = song.artist;
  $('songSource').textContent = `${song.source} · no cost to you`;

  const links = $('subscribeLinks');
  links.innerHTML = '';
  subscriptionLinks(song).forEach((l, i, all) => {
    const a = document.createElement('a');
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = l.label;
    links.append(a, i < all.length - 2 ? ', ' : i === all.length - 2 ? ' or ' : '.');
  });
  $('subscribeLine').hidden = false;

  const player = $('player');
  player.hidden = false;
  player.src = song.audioUrl;
  player.onloadedmetadata = () => {
    if (song.startAt && song.startAt < player.duration) player.currentTime = song.startAt;
  };
  try {
    await player.play();
    setStatus('');
  } catch {
    setStatus('Press play to listen.');
  }
  $('anotherBtn').hidden = false;
}

$('vibeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('feeling').value.trim();
  if (!text) return;
  const result = detectMood(text);
  currentMood = result.mood;
  $('result').hidden = false;
  $('moodLine').innerHTML = describeMood(result);
  playSong(currentMood);
});

$('anotherBtn').addEventListener('click', () => currentMood && playSong(currentMood));

renderChips();
