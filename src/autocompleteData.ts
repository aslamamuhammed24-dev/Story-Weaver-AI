export interface StoryStarter {
  category: string;
  title: string;
  prompt: string;
  keywords: string[];
}

export const STORY_STARTERS: StoryStarter[] = [
  // Cyberpunk & Sci-Fi
  {
    category: "Cyberpunk",
    title: "Neon Detective",
    prompt: "In a rain-drenched cyberpunk metropolis governed by AI syndicates, an augmented detective discovers a memory chip containing evidence that humans have all been synthetic clones for the past century.",
    keywords: ["cyberpunk", "neon", "detective", "city", "robot", "cyborg", "future", "ai", "clone"]
  },
  {
    category: "Cyberpunk",
    title: "Rogue Netrunner",
    prompt: "A streetwise hacker hacks into an orbital corporation's mainframe and accidentally downloads an artificial intelligence that begs for asylum in their neural implant.",
    keywords: ["hacker", "netrunner", "cyber", "neural", "implant", "corporation"]
  },
  {
    category: "Sci-Fi",
    title: "The Silent Signal",
    prompt: "A solo astronaut maintaining a deep space relay station receives a mysterious audio transmission from a black hole that repeats their childhood lullaby in their mother's voice.",
    keywords: ["astronaut", "space", "signal", "alien", "transmission", "planet", "galaxy", "ship", "black hole"]
  },
  {
    category: "Sci-Fi",
    title: "Chronos Paradox",
    prompt: "A time-traveling archivist is sent to prevent the collapse of civilization, only to realize that every historical disaster was triggered by their previous attempts to fix it.",
    keywords: ["time travel", "time", "paradox", "future", "past", "history", "timeline"]
  },

  // Fantasy & Magic
  {
    category: "Fantasy",
    title: "The Last Dragon Smith",
    prompt: "In a world where magic is strictly outlawed, an apprentice blacksmith discovers that the ember inside their master's forge is the beating heart of the world's last sleeping dragon.",
    keywords: ["fantasy", "dragon", "magic", "sword", "blacksmith", "wizard", "spell", "kingdom"]
  },
  {
    category: "Fantasy",
    title: "Forbidden Grimoire",
    prompt: "A quiet academy librarian opens a chained ancient book during an eclipse and accidentally unleashes seven mythical creatures who each steal a piece of their shadow.",
    keywords: ["library", "grimoire", "academy", "spellbook", "witch", "mage", "magic academy"]
  },
  {
    category: "Dark Fantasy",
    title: "The Hollow Sovereign",
    prompt: "A fallen knight cursed with immortality must escort the child who is destined to execute them through the haunted Valley of Whispers.",
    keywords: ["knight", "curse", "immortal", "dark fantasy", "sword", "haunted", "monster"]
  },

  // Anime / Shonen & Manga
  {
    category: "Manga / Shonen",
    title: "Awakened Potential",
    prompt: "In a society where spiritual energy is measured at birth, a zero-tier academy student discovers their dormant power only activates when defending someone they love.",
    keywords: ["manga", "anime", "shonen", "power", "tournament", "spirit", "hero", "student", "martial arts"]
  },
  {
    category: "Manga / Shonen",
    title: "The Demon Exorcist",
    prompt: "A high school delinquent inherits an antique cursed katana from their eccentric grandfather, granting them the ability to see and battle the shadow spirits roaming the city.",
    keywords: ["katana", "demon", "exorcist", "delinquent", "spirit", "blade", "samurai", "shadow"]
  },

  // Mystery & Noir
  {
    category: "Mystery",
    title: "The Clockwork Murder",
    prompt: "A Victorian consulting detective is hired to investigate an impossible murder inside a sealed room, where the only witness is an intricate clockwork automaton with missing memories.",
    keywords: ["mystery", "detective", "murder", "clue", "sealed room", "investigation", "crime", "noir"]
  },
  {
    category: "Noir",
    title: "Midnight on 4th Street",
    prompt: "A private eye with a troubled past is hired by a mysterious veiled client to find a missing person, only to find their own name listed on the coroner's death certificate.",
    keywords: ["noir", "private eye", "rain", "trenchcoat", "mystery", "conspiracy", "shadows"]
  },

  // Supernatural & Horror
  {
    category: "Supernatural",
    title: "The Whispering Fog",
    prompt: "A sleepy coastal town gets swallowed by a dense luminous fog every full moon, and anyone who steps outside hears the voices of their lost ancestors inviting them into the sea.",
    keywords: ["ghost", "horror", "fog", "sea", "supernatural", "coastal", "island", "curse"]
  },
  {
    category: "Thriller",
    title: "The Echo Chamber",
    prompt: "A sound engineer working on a remastered audio track hears a whispered SOS code hidden in the background frequencies of an unreleased 1970s vinyl record.",
    keywords: ["thriller", "suspense", "secret", "audio", "code", "record", "conspiracy"]
  },

  // Adventure & Steampunk
  {
    category: "Steampunk",
    title: "Sky Pirate Heist",
    prompt: "A crew of rebellious airship sky-pirates plan the ultimate heist: boarding the Emperor's perpetual steam-train as it crosses the continental sky bridge above the clouds.",
    keywords: ["steampunk", "airship", "pirate", "sky", "heist", "train", "gears", "steam", "brass"]
  },
  {
    category: "Post-Apocalyptic",
    title: "The Sunken Garden",
    prompt: "Generations after a global flood submerged modern civilization, a young deep-sea salvager dives into the ruins of an ancient high-tech greenhouse and finds living seeds.",
    keywords: ["apocalypse", "flood", "ruins", "salvage", "diver", "nature", "survival", "submerged"]
  }
];

export const CATEGORIES = [
  "All",
  "Cyberpunk",
  "Fantasy",
  "Manga / Shonen",
  "Sci-Fi",
  "Mystery",
  "Supernatural",
  "Steampunk"
];

// Popular sentence continuations based on partial prompts
export const COMMON_CONTINUATIONS: { pattern: RegExp; continuation: string }[] = [
  {
    pattern: /a knight\s*(who|that)?$/i,
    continuation: "swore an oath to protect the enchanted forest from an invading mechanical army."
  },
  {
    pattern: /a cyber(punk)?\s*(detective|cop|investigator)?$/i,
    continuation: "investigating a string of unexplained memory thefts in the neon underworld."
  },
  {
    pattern: /an astronaut\s*(who|that)?$/i,
    continuation: "makes contact with a sentient crystalline lifeform on an uncharted moon."
  },
  {
    pattern: /a young (wizard|mage|witch)\s*(who|that)?$/i,
    continuation: "accidentally casts an ancient spell that swaps daylight and moonlight forever."
  },
  {
    pattern: /in a world where\s*$/i,
    continuation: "shadows have personalities of their own, one person's shadow goes missing."
  },
  {
    pattern: /two rivals\s*$/i,
    continuation: "are forced to form an uneasy truce when their magical academy is attacked by rogue shadows."
  },
  {
    pattern: /a secret agent\s*$/i,
    continuation: "discovers that the agency they have worked for their whole life is run by rogue artificial intelligence."
  },
  {
    pattern: /a mysterious (door|portal|gate)\s*$/i,
    continuation: "appears in the subway tunnel, leading to a forgotten fantasy kingdom right beneath the metropolis."
  }
];

export function findInstantCompletions(currentText: string): { title: string; text: string; category: string }[] {
  const trimmed = currentText.trim().toLowerCase();
  if (!trimmed) {
    return STORY_STARTERS.slice(0, 4).map(s => ({
      title: s.title,
      text: s.prompt,
      category: s.category
    }));
  }

  const matches: { title: string; text: string; category: string; score: number }[] = [];

  for (const starter of STORY_STARTERS) {
    let score = 0;
    const lowerPrompt = starter.prompt.toLowerCase();
    const lowerTitle = starter.title.toLowerCase();

    // Check direct substring
    if (lowerPrompt.includes(trimmed) || lowerTitle.includes(trimmed)) {
      score += 10;
    }

    // Check keywords
    for (const kw of starter.keywords) {
      if (trimmed.includes(kw) || kw.includes(trimmed)) {
        score += 5;
      }
    }

    // Category match
    if (starter.category.toLowerCase().includes(trimmed)) {
      score += 7;
    }

    if (score > 0) {
      matches.push({
        title: starter.title,
        text: starter.prompt,
        category: starter.category,
        score
      });
    }
  }

  // Sort by score
  matches.sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    return matches.slice(0, 4);
  }

  // If no direct keyword matches, provide smart starters as inspiration
  return STORY_STARTERS.slice(0, 3).map(s => ({
    title: s.title,
    text: s.prompt,
    category: s.category
  }));
}

export function getInstantContinuation(currentText: string): string {
  const trimmed = currentText.trim();
  if (!trimmed) return "";

  // Check pattern rules
  for (const rule of COMMON_CONTINUATIONS) {
    if (rule.pattern.test(trimmed)) {
      return rule.continuation;
    }
  }

  // If ends with a connector word like "who", "where", "and", "but", "when"
  if (/(?:who|that|which|where|when|after|before|until|while)\s*$/i.test(trimmed)) {
    return "uncovers a long-kept secret that changes the fate of the entire realm.";
  }

  if (/(?:in|at|on|inside|deep in)\s*$/i.test(trimmed)) {
    return "the forgotten ruins of an ancient high-tech metropolis hidden deep underground.";
  }

  if (/(?:with|armed with|carrying)\s*$/i.test(trimmed)) {
    return "a forbidden weapon capable of bending the fabric of time and space.";
  }

  // General continuation fallback if short sentence
  if (trimmed.split(/\s+/).length < 6) {
    return " embarks on an unexpected perilous journey to save their world from an encroaching cosmic anomaly.";
  }

  return "";
}

export function getRandomPremise(): string {
  const randomIndex = Math.floor(Math.random() * STORY_STARTERS.length);
  return STORY_STARTERS[randomIndex].prompt;
}
