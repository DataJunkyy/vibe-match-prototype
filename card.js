// Draws a shareable "vibe card" (story-sized, 1080x1920) in the browser:
// mood, the person's photo or the song's cover, the song and its music caption.
// Nothing is uploaded; the image is built on a canvas and handed back as a file.

import { MOOD_COLORS } from './vibe.js';

const W = 1080;
const H = 1920;

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Breaks text into lines that fit `maxWidth`, at most `maxLines` (last one ellipsised).
function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws `img` to fill the square like CSS object-fit: cover.
function drawCover(ctx, img, x, y, size) {
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
}

function toBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export async function makeVibeCard({ mood, label, emoji, song, photoUrl }) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  const [c1, c2] = MOOD_COLORS[mood] || MOOD_COLORS.calm;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c1);
  bg.addColorStop(1, c2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.globalAlpha = 0.85;
  ctx.font = `600 44px ${font}`;
  ctx.fillText('MY VIBE RIGHT NOW', W / 2, 190);
  ctx.globalAlpha = 1;
  ctx.font = `800 104px ${font}`;
  ctx.fillText(`${emoji} ${label}`, W / 2, 320);

  // The photo they shared wins; otherwise the song's cover art; otherwise a big emoji.
  const size = 780;
  const x = (W - size) / 2;
  const y = 400;
  let img = await loadImage(photoUrl);
  if (!img) img = await loadImage(song.artwork);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundedRect(ctx, x, y, size, size, 48);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.restore();
  if (img) {
    ctx.save();
    roundedRect(ctx, x, y, size, size, 48);
    ctx.clip();
    drawCover(ctx, img, x, y, size);
    ctx.restore();
  } else {
    ctx.font = `360px ${font}`;
    ctx.fillText(emoji, W / 2, y + size / 2 + 130);
  }

  let ty = y + size + 130;
  ctx.font = `800 72px ${font}`;
  for (const line of wrap(ctx, song.title, W - 160, 2)) { ctx.fillText(line, W / 2, ty); ty += 84; }
  ctx.globalAlpha = 0.9;
  ctx.font = `500 52px ${font}`;
  for (const line of wrap(ctx, song.artist, W - 160, 1)) { ctx.fillText(line, W / 2, ty); ty += 70; }
  ctx.globalAlpha = 1;

  if (song.caption) {
    ty += 20;
    ctx.font = `italic 500 44px ${font}`;
    const lines = wrap(ctx, song.caption, W - 220, 2);
    const boxH = lines.length * 58 + 48;
    roundedRect(ctx, 90, ty - 58, W - 180, boxH, 28);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (const line of lines) { ctx.fillText(line, W / 2, ty); ty += 58; }
  }

  ctx.globalAlpha = 0.9;
  ctx.font = `700 46px ${font}`;
  ctx.fillText('Find your song at vibesong.vercel.app', W / 2, H - 110);
  ctx.globalAlpha = 1;

  try {
    return await toBlob(canvas);
  } catch {
    // A cross-origin image without CORS taints the canvas; redraw without it.
    return makeVibeCard({ mood, label, emoji, song: { ...song, artwork: '' }, photoUrl: null });
  }
}
