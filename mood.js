// Turns a free-text description of how someone feels into a mood, and knows
// which songs and search words fit each mood. No network, no keys: pure logic,
// so it runs in the browser and in `node --test`.

export const MOODS = {
  happy: {
    label: 'Happy',
    emoji: '☀️',
    words: ['happy', 'great', 'good', 'amazing', 'awesome', 'joy', 'joyful', 'glad', 'cheerful',
      'excited', 'blessed', 'grateful', 'thankful', 'fun', 'celebrate', 'celebrating', 'smile',
      'smiling', 'wonderful', 'fantastic', 'sunny', 'proud', 'yay', 'delighted', 'thrilled', 'promoted'],
    searchWords: ['happy', 'sunshine', 'good day', 'celebrate'],
  },
  sad: {
    label: 'Sad',
    emoji: '🌧️',
    words: ['sad', 'down', 'cry', 'crying', 'cried', 'tears', 'lonely', 'alone', 'heartbroken',
      'broken', 'hurt', 'grief', 'grieving', 'miss', 'missing', 'lost', 'depressed', 'blue',
      'empty', 'unhappy', 'breakup', 'dumped', 'sorrow', 'gloomy', 'low', 'disappointed'],
    searchWords: ['sad', 'tears', 'lonely', 'heartbreak'],
  },
  calm: {
    label: 'Calm',
    emoji: '🌊',
    words: ['calm', 'relaxed', 'relaxing', 'chill', 'peaceful', 'peace', 'tired', 'drained', 'exhausted', 'sleepy',
      'mellow', 'quiet', 'easy', 'lazy', 'slow', 'cozy', 'rest', 'unwind', 'content', 'serene', 'sunday'],
    searchWords: ['easy', 'slow', 'peaceful', 'relax'],
  },
  energetic: {
    label: 'Energetic',
    emoji: '⚡',
    words: ['energetic', 'energy', 'pumped', 'hyped', 'hype', 'workout', 'gym', 'run', 'running',
      'party', 'dance', 'dancing', 'wild', 'lit', 'turnt', 'motivated', 'ready', 'unstoppable',
      'strong', 'powerful', 'fired'],
    searchWords: ['dance', 'party', 'power', 'fire'],
  },
  angry: {
    label: 'Angry',
    emoji: '🔥',
    words: ['angry', 'mad', 'furious', 'annoyed', 'pissed', 'rage', 'frustrated', 'frustrating',
      'irritated', 'hate', 'betrayed', 'fed', 'livid', 'upset', 'bitter'],
    searchWords: ['fight', 'rage', 'enough', 'done'],
  },
  romantic: {
    label: 'In love',
    emoji: '💗',
    words: ['love', 'loving', 'romantic', 'crush', 'date', 'kiss', 'butterflies', 'darling',
      'baby', 'sweetheart', 'wedding', 'married', 'adore', 'together', 'falling'],
    searchWords: ['love', 'baby', 'forever', 'kiss'],
  },
  nostalgic: {
    label: 'Nostalgic',
    emoji: '📼',
    words: ['nostalgic', 'nostalgia', 'remember', 'remembering', 'memories', 'memory', 'childhood',
      'reminiscing', 'throwback', 'hometown', 'homesick', 'grandma', 'grandpa'],
    searchWords: ['memories', 'remember', 'yesterday', 'home'],
  },
  hopeful: {
    label: 'Hopeful',
    emoji: '🌱',
    words: ['hopeful', 'hope', 'better', 'new', 'start', 'fresh', 'optimistic', 'believe',
      'faith', 'dream', 'dreaming', 'tomorrow', 'growing', 'healing', 'brave', 'courage', 'determined'],
    searchWords: ['hope', 'rise', 'tomorrow', 'better'],
  },
  anxious: {
    label: 'Anxious',
    emoji: '🌀',
    words: ['anxious', 'anxiety', 'stressed', 'stress', 'worried', 'worry', 'nervous', 'overwhelmed',
      'scared', 'afraid', 'panic', 'pressure', 'restless', 'uneasy', 'tense', 'deadline', 'exam'],
    // For anxiety we pick songs that soothe rather than mirror the stress.
    searchWords: ['breathe', 'alright', 'okay', 'calm'],
  },
};

// Phrases are checked before single words so "fed up" or "on top of the world"
// count as one strong signal.
const PHRASES = [
  ['on top of the world', 'happy', 3],
  ['over the moon', 'happy', 3],
  ['good mood', 'happy', 2],
  ['fed up', 'angry', 3],
  ['had enough', 'angry', 2],
  ['broke up', 'sad', 3],
  ['let me down', 'sad', 2],
  ['miss you', 'sad', 2],
  ['can\'t sleep', 'anxious', 2],
  ['on edge', 'anxious', 3],
  ['in love', 'romantic', 3],
  ['good old days', 'nostalgic', 3],
  ['back in the day', 'nostalgic', 3],
  ['new chapter', 'hopeful', 3],
  ['fresh start', 'hopeful', 3],
  ['let\'s go', 'energetic', 2],
  ['wind down', 'calm', 3],
  ['take it easy', 'calm', 3],
];

const NEGATORS = new Set(['not', 'no', 'never', "don't", 'dont', "isn't", "wasn't", "aren't", 'hardly', 'barely']);

// When a mood word is negated ("not happy"), lean toward its opposite.
const OPPOSITE = {
  happy: 'sad', sad: 'happy', calm: 'anxious', anxious: 'calm', energetic: 'calm',
  angry: 'calm', romantic: 'sad', hopeful: 'sad', nostalgic: 'hopeful',
};

const INTENSIFIERS = new Set(['so', 'very', 'really', 'super', 'extremely', 'totally', 'incredibly', 'too']);

function tokenize(text) {
  return text.toLowerCase().replace(/[’]/g, "'").match(/[a-z']+/g) || [];
}

// Returns { mood, scores, matched } where matched lists the words that drove the choice.
export function detectMood(text) {
  const scores = Object.fromEntries(Object.keys(MOODS).map((m) => [m, 0]));
  const matched = [];
  let lower = ` ${text.toLowerCase().replace(/[’]/g, "'")} `;

  for (const [phrase, mood, weight] of PHRASES) {
    if (lower.includes(phrase)) {
      scores[mood] += weight;
      matched.push(phrase);
      lower = lower.replace(phrase, ' ');
    }
  }

  const tokens = tokenize(lower);
  tokens.forEach((token, i) => {
    for (const [mood, def] of Object.entries(MOODS)) {
      if (!def.words.includes(token)) continue;
      const prev = tokens.slice(Math.max(0, i - 3), i);
      const negated = prev.some((t) => NEGATORS.has(t));
      const boost = INTENSIFIERS.has(tokens[i - 1]) ? 1.5 : 1;
      if (negated) {
        scores[OPPOSITE[mood] || mood] += boost;
        matched.push(`not ${token}`);
      } else {
        scores[mood] += boost;
        matched.push(token);
      }
    }
  });

  // Exclamation marks nudge toward upbeat moods when nothing else is clear.
  const bangs = (text.match(/!/g) || []).length;
  if (bangs) scores.energetic += Math.min(bangs, 3) * 0.25;

  let best = null;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > 0 && (best === null || score > scores[best])) best = mood;
  }
  return { mood: best || 'calm', scores, matched, confident: best !== null };
}

export const GENRES = {
  pop: { label: 'Pop', match: /pop/i },
  country: { label: 'Country', match: /country|americana/i },
  reggae: { label: 'Reggae', match: /reggae|dancehall/i },
  hiphop: { label: 'Hip-Hop', match: /hip-?hop|rap/i },
  rnb: { label: 'R&B / Soul', match: /r&b|soul/i },
  rock: { label: 'Rock', match: /rock|alternative/i },
  gospel: { label: 'Gospel', match: /gospel|christian/i },
  afrobeats: { label: 'Afrobeats', match: /afro|african|highlife/i },
  jazz: { label: 'Jazz', match: /jazz/i },
  electronic: { label: 'Electronic', match: /electronic|dance|house/i },
  latin: { label: 'Latin', match: /latin|reggaeton|salsa/i },
  classical: { label: 'Classical', match: /classical/i },
};

// Hand-picked songs known to fit each mood, by genre. These are looked up on
// the free preview service first; keyword search is the fallback.
// Format: 'Title — Artist'.
export const PICKS = {
  happy: {
    pop: ['Happy — Pharrell Williams', 'Walking on Sunshine — Katrina & The Waves', 'Good as Hell — Lizzo'],
    country: ['Chicken Fried — Zac Brown Band', 'Life Is a Highway — Rascal Flatts', 'Good Time — Alan Jackson'],
    reggae: ['Three Little Birds — Bob Marley & The Wailers', 'Is This Love — Bob Marley & The Wailers', 'Rivers of Babylon — The Melodians'],
    hiphop: ['Good Day — Ice Cube', 'Gettin\' Jiggy wit It — Will Smith', 'Juicy — The Notorious B.I.G.'],
    rnb: ['September — Earth, Wind & Fire', 'Lovely Day — Bill Withers', 'Ain\'t No Mountain High Enough — Marvin Gaye'],
    rock: ['Don\'t Stop Me Now — Queen', 'Mr. Blue Sky — Electric Light Orchestra', 'Here Comes the Sun — The Beatles'],
    gospel: ['Oh Happy Day — Edwin Hawkins Singers', 'Happy — Tasha Cobbs Leonard', 'I Smile — Kirk Franklin'],
    afrobeats: ['Joro — Wizkid', 'Calm Down — Rema', 'Ye — Burna Boy'],
    jazz: ['What a Wonderful World — Louis Armstrong', 'On the Sunny Side of the Street — Dizzy Gillespie'],
    electronic: ['Titanium — David Guetta', 'Feel So Close — Calvin Harris'],
    latin: ['Vivir Mi Vida — Marc Anthony', 'La Bicicleta — Carlos Vives'],
    classical: ['Spring (The Four Seasons) — Antonio Vivaldi', 'Eine kleine Nachtmusik — Wolfgang Amadeus Mozart'],
  },
  sad: {
    pop: ['Someone Like You — Adele', 'Fix You — Coldplay', 'drivers license — Olivia Rodrigo'],
    country: ['He Stopped Loving Her Today — George Jones', 'Whiskey Lullaby — Brad Paisley', 'Tennessee Whiskey — Chris Stapleton'],
    reggae: ['No Woman, No Cry — Bob Marley & The Wailers', 'Redemption Song — Bob Marley & The Wailers', 'Many Rivers to Cross — Jimmy Cliff'],
    hiphop: ['Lucid Dreams — Juice WRLD', 'Mockingbird — Eminem', 'Dear Mama — 2Pac'],
    rnb: ['Ain\'t No Sunshine — Bill Withers', 'End of the Road — Boyz II Men', 'I Can\'t Make You Love Me — Bonnie Raitt'],
    rock: ['Tears in Heaven — Eric Clapton', 'Everybody Hurts — R.E.M.', 'Wish You Were Here — Pink Floyd'],
    gospel: ['Take Me to the King — Tamela Mann', 'I Need You to Survive — Hezekiah Walker'],
    afrobeats: ['Last Last — Burna Boy', 'Essence — Wizkid'],
    jazz: ['Strange Fruit — Billie Holiday', 'Blue in Green — Miles Davis'],
    electronic: ['Strobe — deadmau5', 'Faded — Alan Walker'],
    latin: ['Hasta Que Me Olvides — Luis Miguel', 'Corazón Sin Cara — Prince Royce'],
    classical: ['Adagio for Strings — Samuel Barber', 'Moonlight Sonata — Ludwig van Beethoven'],
  },
  calm: {
    pop: ['Banana Pancakes — Jack Johnson', 'Sunday Morning — Maroon 5', 'Riptide — Vance Joy'],
    country: ['Wagon Wheel — Darius Rucker', 'Amarillo by Morning — George Strait', 'Take It Easy — Eagles'],
    reggae: ['Sun Is Shining — Bob Marley & The Wailers', 'Waiting in Vain — Bob Marley & The Wailers', 'Feeling Good — Morgan Heritage'],
    hiphop: ['Electric Relaxation — A Tribe Called Quest', 'Passin\' Me By — The Pharcyde'],
    rnb: ['Sunday Candy — Donnie Trumpet & The Social Experiment', 'Put Your Records On — Corinne Bailey Rae', 'Best Part — Daniel Caesar'],
    rock: ['Dreams — Fleetwood Mac', 'Harvest Moon — Neil Young'],
    gospel: ['Peace Be Still — James Cleveland', 'You Are My Hiding Place — Selah'],
    afrobeats: ['Peru — Fireboy DML', 'Love Nwantiti — CKay'],
    jazz: ['Take Five — The Dave Brubeck Quartet', 'So What — Miles Davis'],
    electronic: ['Weightless — Marconi Union', 'Midnight City — M83'],
    latin: ['Bésame Mucho — Andrea Bocelli', 'Despacito — Luis Fonsi'],
    classical: ['Clair de lune — Claude Debussy', 'Gymnopédie No. 1 — Erik Satie'],
  },
  energetic: {
    pop: ['Uptown Funk — Mark Ronson', 'Can\'t Stop the Feeling! — Justin Timberlake', 'Levitating — Dua Lipa'],
    country: ['Boot Scootin\' Boogie — Brooks & Dunn', 'Dirt Road Anthem — Jason Aldean', 'Chattahoochee — Alan Jackson'],
    reggae: ['Could You Be Loved — Bob Marley & The Wailers', 'Temperature — Sean Paul', 'Get Busy — Sean Paul'],
    hiphop: ['Lose Yourself — Eminem', 'Stronger — Kanye West', 'HUMBLE. — Kendrick Lamar'],
    rnb: ['Crazy in Love — Beyoncé', 'Yeah! — Usher'],
    rock: ['Eye of the Tiger — Survivor', 'Thunderstruck — AC/DC', 'Mr. Brightside — The Killers'],
    gospel: ['Stomp — Kirk Franklin', 'Break Every Chain — Tasha Cobbs Leonard'],
    afrobeats: ['Ye — Burna Boy', 'Fall — Davido', 'Rush — Ayra Starr'],
    jazz: ['Sing, Sing, Sing — Benny Goodman', 'Moanin\' — Art Blakey & The Jazz Messengers'],
    electronic: ['Levels — Avicii', 'Titanium — David Guetta'],
    latin: ['Danza Kuduro — Don Omar', 'Gasolina — Daddy Yankee'],
    classical: ['Ride of the Valkyries — Richard Wagner', 'In the Hall of the Mountain King — Edvard Grieg'],
  },
  angry: {
    pop: ['Since U Been Gone — Kelly Clarkson', 'You Oughta Know — Alanis Morissette'],
    country: ['Before He Cheats — Carrie Underwood', 'Goodbye Earl — The Chicks'],
    reggae: ['Get Up, Stand Up — Bob Marley & The Wailers', 'War — Bob Marley & The Wailers'],
    hiphop: ['X Gon\' Give It to Ya — DMX', 'Till I Collapse — Eminem'],
    rnb: ['Irreplaceable — Beyoncé', 'Respect — Aretha Franklin'],
    rock: ['Killing in the Name — Rage Against the Machine', 'Smells Like Teen Spirit — Nirvana'],
    gospel: ['Victory — Yolanda Adams', 'I Won\'t Go Back — William McDowell'],
    afrobeats: ['Anybody — Burna Boy', 'Soldier — Falz'],
    jazz: ['Haitian Fight Song — Charles Mingus'],
    electronic: ['Bangarang — Skrillex'],
    latin: ['La Gozadera — Gente de Zona'],
    classical: ['O Fortuna — Carl Orff'],
  },
  romantic: {
    pop: ['Perfect — Ed Sheeran', 'Just the Way You Are — Bruno Mars', 'All of Me — John Legend'],
    country: ['Amazed — Lonestar', 'Die a Happy Man — Thomas Rhett', 'Then — Brad Paisley'],
    reggae: ['Is This Love — Bob Marley & The Wailers', 'Red Red Wine — UB40', 'Stir It Up — Bob Marley & The Wailers'],
    hiphop: ['Love Galore — SZA', 'You Make Me Wanna — Usher'],
    rnb: ['At Last — Etta James', 'Let\'s Stay Together — Al Green', 'Adorn — Miguel'],
    rock: ['Something — The Beatles', 'Wonderful Tonight — Eric Clapton'],
    gospel: ['Love Theory — Kirk Franklin'],
    afrobeats: ['Essence — Wizkid', 'Love Nwantiti — CKay'],
    jazz: ['The Way You Look Tonight — Frank Sinatra', 'La Vie en rose — Louis Armstrong'],
    electronic: ['Summer — Calvin Harris'],
    latin: ['Bésame Mucho — Andrea Bocelli', 'Te Amo — Makano'],
    classical: ['Romeo and Juliet (Love Theme) — Pyotr Ilyich Tchaikovsky'],
  },
  nostalgic: {
    pop: ['Summer of \'69 — Bryan Adams', 'Yesterday — The Beatles', 'Teenage Dream — Katy Perry'],
    country: ['Remember When — Alan Jackson', 'Glory Days — Bruce Springsteen', 'Take Me Home, Country Roads — John Denver'],
    reggae: ['Buffalo Soldier — Bob Marley & The Wailers', 'Sweat (A La La La La Long) — Inner Circle'],
    hiphop: ['Juicy — The Notorious B.I.G.', 'Summertime — DJ Jazzy Jeff & The Fresh Prince'],
    rnb: ['September — Earth, Wind & Fire', 'Golden Time of Day — Maze'],
    rock: ['Glory Days — Bruce Springsteen', 'Hotel California — Eagles'],
    gospel: ['Precious Lord, Take My Hand — Mahalia Jackson'],
    afrobeats: ['African Queen — 2Baba', 'Sweet Mother — Prince Nico Mbarga'],
    jazz: ['As Time Goes By — Dooley Wilson', 'Autumn Leaves — Nat King Cole'],
    electronic: ['One More Time — Daft Punk'],
    latin: ['Oye Como Va — Santana'],
    classical: ['Nimrod — Edward Elgar'],
  },
  hopeful: {
    pop: ['Rise Up — Andra Day', 'Brave — Sara Bareilles', 'Fight Song — Rachel Platten'],
    country: ['I Hope You Dance — Lee Ann Womack', 'The House That Built Me — Miranda Lambert', 'Humble and Kind — Tim McGraw'],
    reggae: ['Three Little Birds — Bob Marley & The Wailers', 'I Can See Clearly Now — Jimmy Cliff', 'One Love — Bob Marley & The Wailers'],
    hiphop: ['Alright — Kendrick Lamar', 'Keep Ya Head Up — 2Pac'],
    rnb: ['A Change Is Gonna Come — Sam Cooke', 'Rise Up — Andra Day'],
    rock: ['Don\'t Stop Believin\' — Journey', 'Here Comes the Sun — The Beatles'],
    gospel: ['I Smile — Kirk Franklin', 'Way Maker — Sinach'],
    afrobeats: ['Ye — Burna Boy', 'Bloody Samaritan — Ayra Starr'],
    jazz: ['What a Wonderful World — Louis Armstrong'],
    electronic: ['Wake Me Up — Avicii'],
    latin: ['Color Esperanza — Diego Torres'],
    classical: ['Ode to Joy (Symphony No. 9) — Ludwig van Beethoven'],
  },
  anxious: {
    pop: ['Breathe — Faith Hill', 'Keep Your Head Up — Andy Grammer', 'Let It Be — The Beatles'],
    country: ['Breathe — Faith Hill', 'Don\'t Worry \'Bout Me — Zac Brown Band'],
    reggae: ['Three Little Birds — Bob Marley & The Wailers', 'Don\'t Worry Be Happy — Bobby McFerrin'],
    hiphop: ['Alright — Kendrick Lamar', '1-800-273-8255 — Logic'],
    rnb: ['Lean on Me — Bill Withers', 'Golden — Jill Scott'],
    rock: ['Let It Be — The Beatles', 'Don\'t Stop Believin\' — Journey'],
    gospel: ['It Is Well — Kristene DiMarco', 'Peace Be Still — James Cleveland'],
    afrobeats: ['Calm Down — Rema', 'Peru — Fireboy DML'],
    jazz: ['Take Five — The Dave Brubeck Quartet'],
    electronic: ['Weightless — Marconi Union'],
    latin: ['Bésame Mucho — Andrea Bocelli'],
    classical: ['Clair de lune — Claude Debussy'],
  },
};

// Picks a starting genre order: the person's preferred genres first, then the rest.
export function genreOrder(preferred) {
  const all = Object.keys(GENRES);
  const pref = preferred.filter((g) => all.includes(g));
  return pref.length ? pref : all;
}

// Every curated pick for this mood in the preferred genres, shuffled.
export function candidatePicks(mood, preferred, random = Math.random) {
  const out = [];
  for (const genre of genreOrder(preferred)) {
    for (const pick of PICKS[mood]?.[genre] || []) {
      const [title, artist] = pick.split(' — ');
      out.push({ title, artist, genre });
    }
  }
  return shuffle(out, random);
}

export function shuffle(list, random = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
