# Vibe Match

Describe how you feel in your own words, and Vibe Match plays a song that fits.

## Try it

Locally it's a plain web page with no build step and no API keys.

```bash
npm start            # serves the folder at http://localhost:8000
```

(Any static server works, e.g. `python3 -m http.server 8000`. Opening
`index.html` straight from disk won't work because browsers block ES modules on
`file://`.)

1. Say how you feel any of three ways:
   - **Type it**, e.g. *"Long week, I'm drained but kind of proud of myself"*.
   - **Say it**: tap 🎤 and talk. The browser's built-in speech recognition
     (Chrome, Edge, Safari) turns it into text and matches it right away.
   - **Show it**: add a photo (a selfie, the view, anything). Its colours and
     light are read in the browser; the photo is never uploaded. You can add a
     photo and words together; clear words win over the photo.
2. Optionally tap the genres you like (Country, Reggae, ...). They're remembered
   in your browser for next time.
3. Press **Match my vibe**. A song starts playing.
4. **Another song for this vibe** plays a different one without repeating.

## Put it online (Vercel, free)

The app is ready for Vercel's free Hobby plan as is. No settings to change, no
build step, no environment variables.

**Option A, from GitHub (easiest):**
1. Open the [RxServicesSolutions team's new-project page](https://vercel.com/new?teamSlug=rx-services-solutions).
2. Under **Import Git Repository**, pick `vibe-match-prototype`. If it isn't
   listed, click **Adjust GitHub App Permissions** and give Vercel access to
   that repository first.
3. Press **Deploy**.
3. You get a public link like `https://vibe-match-prototype.vercel.app`. Every
   push to `main` redeploys it automatically.

**Option B, from your computer:**
```bash
npx vercel          # first run asks you to log in, then gives a preview link
npx vercel --prod   # publish to the main link
```
For a scripted deploy, create a token at vercel.com/account/tokens and put it
in a `VERCEL_TOKEN` environment variable (`npx vercel --prod --token "$VERCEL_TOKEN"`).
Never commit the token or paste it anywhere public.

When hosted, the page asks its own server functions (`api/itunes.js`,
`api/audius.js`) to look songs up, so lookups don't depend on the browser being
allowed to call Apple or Audius directly, and repeat searches are cached by
Vercel. The audio itself still streams straight from the free services.

## How it works

- **Feeling → mood** (`mood.js`): a keyword and phrase lexicon scores nine moods
  (happy, sad, calm, energetic, angry, in love, nostalgic, hopeful, anxious).
  It handles simple negation ("not happy" leans sad) and intensifiers ("so
  happy"). For anxious moods it picks soothing songs rather than tense ones.
- **Photo → mood** (`image.js`): the photo is shrunk to 64px and summarised
  as brightness, colourfulness, contrast and warm/cool/green balance, e.g.
  dark and muted reads as sad, bright warm colours as happy, vivid and
  high-contrast as energetic, sepia tones as nostalgic.
- **Mood → song** (`music.js`):
  1. A hand-picked list of songs per mood and genre, old and new, filtered to
     your preferred genres first.
  2. Each pick is looked up on Apple's free iTunes Search API, which returns a
     free 30-second preview. Previews are usually the hook or chorus, the part
     that carries the song's vibe.
  3. If no pick is found, a keyword search within your genres.
  4. Last resort: a full-length free track from [Audius](https://audius.co),
     started about a third of the way in to skip the intro.
- **Already paying for music?** Each result links to the same song in Spotify,
  YouTube Music and Apple Music so you can play the full track there.

Nothing here costs the listener anything and no API keys are needed.

## Tests

```bash
npm test
```

## Next steps

- Real Spotify playback for subscribers (Spotify login with PKCE plus the Web
  Playback SDK; requires the listener to have Spotify Premium and a Spotify app
  client ID, which would be read from an environment variable, never committed).
- Smarter mood reading with a language model instead of keywords.
