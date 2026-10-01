# Vibe Match

Describe how you feel in your own words, and Vibe Match plays a song that fits.

## Try it

It's a plain web page with no build step and no API keys.

```bash
npm start            # serves the folder at http://localhost:8000
```

(Any static server works, e.g. `python3 -m http.server 8000`. Opening
`index.html` straight from disk won't work because browsers block ES modules on
`file://`.)

1. Type how you feel, e.g. *"Long week, I'm drained but kind of proud of myself"*.
2. Optionally tap the genres you like (Country, Reggae, ...). They're remembered
   in your browser for next time.
3. Press **Match my vibe**. A song starts playing.
4. **Another song for this vibe** plays a different one without repeating.

## How it works

- **Feeling → mood** (`mood.js`): a keyword and phrase lexicon scores nine moods
  (happy, sad, calm, energetic, angry, in love, nostalgic, hopeful, anxious).
  It handles simple negation ("not happy" leans sad) and intensifiers ("so
  happy"). For anxious moods it picks soothing songs rather than tense ones.
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
