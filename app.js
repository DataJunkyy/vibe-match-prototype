import { GENRES, MOODS, detectMood } from './mood.js';
import { findSong, subscriptionLinks } from './music.js';
import { moodFromImageFile } from './image.js';

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

function describeMood({ mood, matched, confident, photo }) {
  const m = MOODS[mood];
  if (photo && !matched.length) {
    const why = photo.reasons.length ? ` (${photo.reasons.slice(0, 3).join(', ')})` : '';
    const genres = selectedGenres.length ? ` Looking in ${selectedGenres.map((g) => GENRES[g].label).join(', ')}.` : '';
    return `${m.emoji} Your photo feels <strong>${m.label.toLowerCase()}</strong>${why}.${genres}`;
  }
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

// A photo's mood counts as a strong signal; typed or spoken words can still
// outweigh it when they're clear.
let photoMood = null;

const NO_TEXT = { mood: 'calm', scores: Object.fromEntries(Object.keys(MOODS).map((m) => [m, 0])), matched: [], confident: false };

function combine(textResult) {
  if (!photoMood) return { ...textResult, photo: null };
  const scores = { ...textResult.scores };
  scores[photoMood.mood] += 2;
  let mood = photoMood.mood;
  for (const [m, v] of Object.entries(scores)) if (v > scores[mood]) mood = m;
  return { ...textResult, scores, mood, confident: true, photo: photoMood };
}

$('vibeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('feeling').value.trim();
  if (!text && !photoMood) {
    $('feeling').focus();
    $('result').hidden = false;
    setStatus('Tell me how you feel, or add a photo.');
    return;
  }
  $('micHint').hidden = true;
  const result = combine(text ? detectMood(text) : NO_TEXT);
  currentMood = result.mood;
  $('result').hidden = false;
  $('moodLine').innerHTML = describeMood(result);
  playSong(currentMood);
});

$('anotherBtn').addEventListener('click', () => currentMood && playSong(currentMood));

// Photo input: analysed in the browser (see image.js), never uploaded.
$('photoInput').addEventListener('change', async () => {
  const file = $('photoInput').files[0];
  if (!file) return;
  $('photoThumb').src = URL.createObjectURL(file);
  $('photoPreview').hidden = false;
  try {
    photoMood = await moodFromImageFile(file);
    $('vibeForm').requestSubmit();
  } catch {
    photoMood = null;
    $('result').hidden = false;
    setStatus('I couldn’t read that photo. Try a different one, or describe how you feel.');
  }
});

$('photoRemove').addEventListener('click', () => {
  photoMood = null;
  $('photoInput').value = '';
  $('photoPreview').hidden = true;
});

// Voice input: the browser's built-in speech recognition turns what the person
// says into text, then we match it exactly like typed text. Free, no keys.
// Supported in Chrome, Edge and Safari; the mic button stays hidden elsewhere.
function setupVoice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    document.querySelector('.lead').textContent = 'Tell me how you feel, in your own words, or add a photo. I\'ll play a song that matches.';
    return;
  }

  const mic = $('micBtn');
  const hint = $('micHint');
  const box = $('feeling');
  let rec = null;
  let finalText = '';

  const showHint = (text) => { hint.textContent = text; hint.hidden = !text; };
  const setListening = (on) => {
    mic.setAttribute('aria-pressed', String(on));
    mic.setAttribute('aria-label', on ? 'Stop listening' : 'Say how you feel');
  };

  mic.hidden = false;
  mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new Recognition();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    finalText = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      box.value = (finalText + interim).trim();
    };
    rec.onerror = (e) => {
      const msg = {
        'not-allowed': 'Microphone access was blocked. Allow it in your browser to speak, or just type.',
        'service-not-allowed': 'Microphone access was blocked. Allow it in your browser to speak, or just type.',
        'no-speech': 'I didn’t hear anything. Tap 🎤 and try again.',
        'audio-capture': 'No microphone found. You can type instead.',
        network: 'Speech recognition needs an internet connection. You can type instead.',
      }[e.error];
      showHint(msg || 'Voice input didn’t work this time. You can type instead.');
    };
    rec.onend = () => {
      rec = null;
      setListening(false);
      // Spoke something? Match it straight away, like pressing the button.
      if (finalText.trim()) {
        box.value = finalText.trim();
        $('vibeForm').requestSubmit();
      }
    };

    showHint('Listening… tell me how you feel.');
    setListening(true);
    rec.start();
  });

  box.addEventListener('input', () => showHint(''));
}

setupVoice();

renderChips();
