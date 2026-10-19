import { GENRES, MOODS, detectMood } from './mood.js';
import { findSong, subscriptionLinks } from './music.js';
import { moodFromImageFile } from './image.js';
import {
  musicCaption, songReason, toggleSaved, isSaved, loadSaved, addHistory, loadHistory,
  checkIn, checkedInToday, streak, pulseInterval,
} from './vibe.js';
import { makeVibeCard } from './card.js';

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

// Each vibe becomes a short playlist: the first song plays as soon as it's
// found, the rest load in the background and play straight through.
const PLAYLIST_SIZE = 6;
const store = (() => { try { return window.localStorage; } catch { return null; } })()
  || { getItem: () => null, setItem: () => {} };

let queue = [];
let current = -1;
let vibeId = 0;          // bumps on every new vibe so stale loads are ignored
let loading = false;
let advanceWhenReady = false;

async function nextSong(mood) {
  const song = await findSong(mood, selectedGenres, played);
  if (!song) return null;
  played.add(`${song.title}|${song.artist}`);
  return { ...song, mood, reason: songReason(mood, song), caption: musicCaption(mood, song) };
}

async function startVibe(mood) {
  const id = ++vibeId;
  queue = [];
  current = -1;
  advanceWhenReady = false;
  renderQueue();
  $('matchBtn').disabled = true;
  $('anotherBtn').disabled = true;
  setStatus('Finding a song…');

  const first = await nextSong(mood);
  if (id !== vibeId) return;
  $('matchBtn').disabled = false;
  $('anotherBtn').disabled = false;
  if (!first) {
    setStatus('I couldn’t reach the free music sources just now. Check your connection and try again.');
    return;
  }
  queue.push(first);
  playAt(0);
  fillQueue(mood, id);
}

async function fillQueue(mood, id, target = PLAYLIST_SIZE) {
  if (loading) return;
  loading = true;
  renderQueue();
  while (id === vibeId && queue.length < target) {
    const song = await nextSong(mood).catch(() => null);
    if (id !== vibeId || !song) break;
    queue.push(song);
    renderQueue();
    if (advanceWhenReady) { advanceWhenReady = false; playAt(queue.length - 1); }
  }
  loading = false;
  if (id === vibeId) renderQueue();
  if (id === vibeId && advanceWhenReady) {
    advanceWhenReady = false;
    $('anotherBtn').disabled = false;
    setStatus('That’s every song I found for this vibe. Try different words for more.');
  }
}

function playNext() {
  if (current + 1 < queue.length) { playAt(current + 1); return; }
  // Past the end of the list: load one more and play it when it arrives.
  advanceWhenReady = true;
  $('anotherBtn').disabled = true;
  setStatus('Finding another song…');
  fillQueue(currentMood, vibeId, queue.length + 1);
}

function showSong(song) {
  $('songCard').hidden = false;
  $('artwork').src = song.artwork || '';
  $('artwork').alt = song.artwork ? `Cover art for ${song.title}` : '';
  $('artwork').style.visibility = song.artwork ? 'visible' : 'hidden';
  $('songTitle').textContent = song.title;
  $('songArtist').textContent = song.artist;
  $('songSource').textContent = `${song.source} · no cost to you`;
  $('songReason').textContent = song.reason || '';
  $('songReason').hidden = !song.reason;
  $('caption').textContent = song.caption || '';
  $('captionRow').hidden = !song.caption;
  $('copyCaption').textContent = 'Copy';
  updateSaveBtn(song);

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
}

async function playSong(song) {
  showSong(song);
  const player = $('player');
  player.hidden = false;
  player.src = song.audioUrl;
  player.onloadedmetadata = () => {
    if (song.startAt && song.startAt < player.duration) player.currentTime = song.startAt;
  };
  $('anotherBtn').hidden = false;
  $('anotherBtn').disabled = false;
  $('actionRow').hidden = false;
  try {
    await player.play();
    setStatus('');
  } catch {
    setStatus('Press play to listen.');
  }
}

function playAt(i) {
  current = i;
  renderQueue();
  playSong(queue[i]);
}

function renderQueue() {
  const list = $('queueList');
  list.innerHTML = '';
  queue.forEach((song, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'queue-item';
    if (i === current) btn.setAttribute('aria-current', 'true');
    const title = document.createElement('span');
    title.className = 'queue-title';
    title.textContent = `${song.title} · ${song.artist}`;
    const reason = document.createElement('span');
    reason.className = 'queue-reason';
    reason.textContent = song.reason;
    btn.append(title, reason);
    btn.addEventListener('click', () => playAt(i));
    li.append(btn);
    list.append(li);
  });
  if (loading && queue.length < PLAYLIST_SIZE) {
    const li = document.createElement('li');
    li.className = 'queue-loading';
    li.textContent = 'Finding more…';
    list.append(li);
  }
  $('queueBox').hidden = queue.length < 2 && !loading;
}

$('player').addEventListener('ended', () => queue.length && playNext());
$('anotherBtn').addEventListener('click', () => currentMood && playNext());

// Music caption: a subtitle line describing the music, for people who can't
// hear it. Creators can paste it straight into their captions.
$('copyCaption').addEventListener('click', async () => {
  const text = $('caption').textContent;
  try {
    await navigator.clipboard.writeText(text);
    $('copyCaption').textContent = 'Copied';
  } catch {
    // Older browsers: select the text so the person can copy it themselves.
    const range = document.createRange();
    range.selectNodeContents($('caption'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    $('copyCaption').textContent = 'Press Ctrl+C';
  }
});

// Saved songs and recent vibes stay in this browser; no account needed.
function updateSaveBtn(song) {
  const saved = isSaved(store, song);
  const btn = $('saveBtn');
  btn.textContent = saved ? '♥' : '♡';
  btn.setAttribute('aria-pressed', String(saved));
  btn.setAttribute('aria-label', saved ? 'Remove from saved songs' : 'Save this song');
  btn.title = saved ? 'Saved' : 'Save this song';
}

$('saveBtn').addEventListener('click', () => {
  const song = queue[current];
  if (!song) return;
  toggleSaved(store, song);
  updateSaveBtn(song);
  renderSaved();
});

function renderSaved() {
  const saved = loadSaved(store);
  const list = $('savedList');
  list.innerHTML = '';
  for (const song of saved) {
    const li = document.createElement('li');
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'drawer-item';
    play.textContent = `▶ ${song.title} · ${song.artist}`;
    play.addEventListener('click', () => {
      currentMood = song.mood || currentMood;
      queue = [song];
      vibeId++;
      $('result').hidden = false;
      $('moodLine').textContent = `From your saved songs${song.mood ? ` (${MOODS[song.mood]?.label.toLowerCase()})` : ''}.`;
      playAt(0);
    });
    li.append(play);
    list.append(li);
  }
  $('savedCount').textContent = saved.length ? `(${saved.length})` : '';
  $('savedBox').hidden = !saved.length;
}

// Shareable vibe card: built on a canvas in the browser, then shared through
// the phone's share sheet (Stories, TikTok, WhatsApp...) or downloaded.
let cardUrl = null;
let cardFile = null;

$('shareBtn').addEventListener('click', async () => {
  const song = queue[current];
  if (!song) return;
  const mood = song.mood || currentMood;
  const m = MOODS[mood] || MOODS.calm;
  $('shareBtn').disabled = true;
  const photoUrl = photoMood && !$('photoPreview').hidden ? $('photoThumb').src : null;
  const blob = await makeVibeCard({ mood, label: m.label, emoji: m.emoji, song, photoUrl });
  $('shareBtn').disabled = false;
  if (!blob) { setStatus('Couldn’t make the card on this browser.'); return; }
  if (cardUrl) URL.revokeObjectURL(cardUrl);
  cardUrl = URL.createObjectURL(blob);
  cardFile = new File([blob], 'my-vibe.png', { type: 'image/png' });
  $('cardImg').src = cardUrl;
  $('cardDownload').href = cardUrl;
  $('cardShare').hidden = !(navigator.canShare && navigator.canShare({ files: [cardFile] }));
  $('cardDialog').showModal();
});

$('cardShare').addEventListener('click', async () => {
  try {
    await navigator.share({
      files: [cardFile],
      title: 'My vibe',
      text: 'Find a song for your mood at https://vibesong.vercel.app',
    });
  } catch { /* cancelled */ }
});
$('cardClose').addEventListener('click', () => $('cardDialog').close());

// Feel it: a pulse at the mood's pace while music plays. Phones that support
// vibration buzz; every screen sees the cover art beat.
let feelOn = false;
let feelTimer = null;

function stopPulse() { clearInterval(feelTimer); feelTimer = null; }
function startPulse() {
  stopPulse();
  if (!feelOn || $('player').paused) return;
  const mood = queue[current]?.mood || currentMood;
  feelTimer = setInterval(() => {
    if (navigator.vibrate) navigator.vibrate(45);
    const art = $('artwork');
    art.classList.add('beat');
    setTimeout(() => art.classList.remove('beat'), 140);
  }, pulseInterval(mood));
}

$('feelBtn').addEventListener('click', () => {
  feelOn = !feelOn;
  $('feelBtn').setAttribute('aria-pressed', String(feelOn));
  if (feelOn) startPulse(); else stopPulse();
});
$('player').addEventListener('play', startPulse);
$('player').addEventListener('pause', stopPulse);

// Daily check-in: tap today's mood, keep a streak, get a song for it.
function renderCheckin() {
  const box = $('checkinMoods');
  box.innerHTML = '';
  const today = checkedInToday(store);
  for (const [key, m] of Object.entries(MOODS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mood-btn';
    b.textContent = `${m.emoji} ${m.label}`;
    b.setAttribute('aria-pressed', String(today?.mood === key));
    b.addEventListener('click', () => {
      checkIn(store, key);
      renderCheckin();
      currentMood = key;
      $('result').hidden = false;
      $('moodLine').innerHTML = `${m.emoji} Checked in as <strong>${m.label.toLowerCase()}</strong>. Here’s your song for today.`;
      addHistory(store, { text: `Daily check-in: ${m.label}`, mood: key });
      renderHistory();
      startVibe(key);
    });
    box.append(b);
  }
  const days = streak(store);
  $('checkinText').textContent = today
    ? `Today: ${MOODS[today.mood]?.emoji || ''} ${MOODS[today.mood]?.label || ''}. Tap to change.`
    : 'How are you today? One tap.';
  $('streak').textContent = days > 1 ? `🔥 ${days}-day streak` : days === 1 ? '🔥 Day 1. Come back tomorrow to start a streak.' : '';
  $('streak').hidden = !days;
}

function renderHistory() {
  const history = loadHistory(store);
  const list = $('historyList');
  list.innerHTML = '';
  for (const h of history) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drawer-item';
    const m = MOODS[h.mood];
    const what = h.text ? `“${h.text}”` : 'A photo';
    btn.textContent = `${m ? m.emoji : ''} ${what}`;
    btn.title = 'Play this vibe again';
    btn.addEventListener('click', () => {
      if (h.text) $('feeling').value = h.text;
      currentMood = h.mood;
      $('result').hidden = false;
      $('moodLine').innerHTML = `${m ? m.emoji : ''} Playing your <strong>${m ? m.label.toLowerCase() : ''}</strong> vibe again.`;
      startVibe(h.mood);
    });
    li.append(btn);
    list.append(li);
  }
  $('historyBox').hidden = !history.length;
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
  addHistory(store, { text, mood: currentMood, photo: Boolean(photoMood) });
  renderHistory();
  startVibe(currentMood);
});

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
renderSaved();
renderHistory();
renderCheckin();
