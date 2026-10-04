// Reads a mood from a photo's colours and light, entirely in the browser.
// No upload, no AI service, no cost: we shrink the image, average its pixels,
// and map brightness, colourfulness and warmth to one of the moods in mood.js.

// Summarises RGBA pixel data into a few 0..1 numbers.
export function pixelStats(data) {
  let n = 0, bright = 0, sat = 0, warm = 0, green = 0, blue = 0, red = 0, lumSq = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent pixels
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const s = max === 0 ? 0 : (max - min) / max;
    bright += l; lumSq += l * l; sat += s; n++;
    if (s < 0.15) continue; // greys say nothing about hue
    let h;
    if (max === r) h = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h *= 60;
    if (h < 70 || h >= 330) warm += s;
    if (h < 20 || h >= 330) red += s;
    if (h >= 70 && h < 170) green += s;
    if (h >= 170 && h < 270) blue += s;
  }
  if (!n) return null;
  const mean = bright / n;
  const hueTotal = warm + green + blue || 1;
  return {
    brightness: mean,
    contrast: Math.sqrt(Math.max(0, lumSq / n - mean * mean)) * 2,
    saturation: sat / n,
    warmth: warm / hueTotal,
    greenness: green / hueTotal,
    blueness: blue / hueTotal,
    redness: red / hueTotal,
  };
}

// Maps the summary to a mood plus a few plain words explaining why.
export function moodFromStats(s) {
  if (!s) return { mood: 'calm', reasons: [] };
  const words = [];
  const bright = s.brightness > 0.6, dark = s.brightness < 0.3;
  const vivid = s.saturation > 0.45, muted = s.saturation < 0.2;
  if (bright) words.push('bright'); if (dark) words.push('dark');
  if (vivid) words.push('vivid'); if (muted) words.push('soft');
  if (s.warmth > 0.6) words.push('warm colours');
  if (s.blueness > 0.6) words.push('cool blues');
  if (s.greenness > 0.5) words.push('greens');

  let mood;
  if (dark && muted) mood = 'sad';
  else if (dark && s.redness > 0.5) mood = 'romantic';
  else if (vivid && s.contrast > 0.45) mood = 'energetic';
  else if (s.warmth > 0.6 && !vivid && !dark && s.saturation > 0.15) mood = 'nostalgic';
  else if (s.greenness > 0.5 && !dark) mood = 'hopeful';
  else if (bright && s.warmth > 0.45 && s.saturation > 0.25) mood = 'happy';
  else if (s.blueness > 0.6 && s.brightness < 0.45) mood = 'sad';
  else mood = 'calm';
  return { mood, reasons: words };
}

// Browser only: loads a File into a small canvas and returns its mood.
export async function moodFromImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image'));
      el.src = url;
    });
    const size = 64;
    const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return moodFromStats(pixelStats(ctx.getImageData(0, 0, canvas.width, canvas.height).data));
  } finally {
    URL.revokeObjectURL(url);
  }
}
