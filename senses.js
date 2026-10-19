// Every mood, in more than one sense: a caption line for people who can't hear
// the music, a spoken description for people who can't see the screen, a
// colour and motion to watch, and a vibration pattern to feel. Pure data and
// logic, so it runs in the browser and in `node --test`.

export const SENSES = {
  happy: {
    caption: '[bright, upbeat music]',
    description: 'A bright, cheerful song with a bouncy beat.',
    color: '#f5b700',
    motion: 'bounce',
    beat: 0.5, // seconds per pulse on screen
    haptic: [80, 120, 80, 120, 80, 120, 200],
  },
  sad: {
    caption: '[slow, gentle, melancholy music]',
    description: 'A slow, gentle song with a heavy, wistful feel.',
    color: '#4a6fa5',
    motion: 'sway',
    beat: 2.4,
    haptic: [400, 600, 400],
  },
  calm: {
    caption: '[soft, relaxed music]',
    description: 'A soft, relaxed song that takes its time.',
    color: '#3fa7a0',
    motion: 'breathe',
    beat: 4,
    haptic: [300, 900, 300],
  },
  energetic: {
    caption: '[fast, driving, high-energy music]',
    description: 'A fast, driving song with a strong beat you can move to.',
    color: '#ff5a36',
    motion: 'bounce',
    beat: 0.35,
    haptic: [60, 60, 60, 60, 60, 60, 60, 60, 120],
  },
  angry: {
    caption: '[loud, intense, aggressive music]',
    description: 'A loud, intense song with a hard edge.',
    color: '#c62828',
    motion: 'shake',
    beat: 0.4,
    haptic: [150, 50, 150, 50, 300],
  },
  romantic: {
    caption: '[warm, tender love song]',
    description: 'A warm, tender love song.',
    color: '#e05780',
    motion: 'heartbeat',
    beat: 1,
    haptic: [100, 100, 200, 600, 100, 100, 200],
  },
  nostalgic: {
    caption: '[wistful, old-school music]',
    description: 'A wistful song with an old-school, looking-back feel.',
    color: '#b5835a',
    motion: 'sway',
    beat: 2,
    haptic: [200, 400, 200, 400, 200],
  },
  hopeful: {
    caption: '[uplifting, building music]',
    description: 'An uplifting song that builds and lifts as it goes.',
    color: '#5cb85c',
    motion: 'rise',
    beat: 1.5,
    haptic: [80, 300, 140, 300, 220, 300, 320],
  },
  anxious: {
    caption: '[soothing, steady music]',
    description: 'A soothing, steady song to help you slow down and breathe.',
    color: '#7e6bc4',
    motion: 'breathe',
    beat: 4,
    haptic: [400, 800, 400, 800, 400],
  },
};

// Everything the page needs to show, say and play for one song.
export function accessibleOutputs(mood, song) {
  const s = SENSES[mood] || SENSES.calm;
  const who = song && song.title ? `${song.title}${song.artist ? ` by ${song.artist}` : ''}` : 'a song';
  return {
    caption: s.caption,
    description: s.description,
    spoken: `Now playing ${who}. ${s.description}`,
    color: s.color,
    motion: s.motion,
    beat: s.beat,
    haptic: s.haptic,
  };
}
