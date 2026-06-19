const seedTerms = [
  "vintage", "old", "unusual", "rare", "retro", "miniature", "handmade", "boxed", "metal", "wooden",
  "1970s", "1980s", "badge", "manual", "ticket", "sign", "part", "clock", "model", "map", "postcard",
  "tool", "aviation", "railway", "hovercraft", "bakelite", "enamel", "brass", "cast iron", "celluloid",
  "ceramic", "chrome", "copper", "leather", "porcelain", "wicker", "wool", "folding", "pocket", "portable",
  "mini", "tiny", "novelty", "commemorative", "souvenir", "advertising", "shop display", "trade card", "sample",
  "prototype", "industrial", "workshop", "laboratory", "school", "military", "naval", "aerospace", "motoring",
  "cycling", "scouting", "seaside", "circus", "theatre", "cinema", "pub", "garage", "post office", "railwayana",
  "farm", "medical", "optical", "chemist", "haberdashery", "sewing", "printing", "measuring", "navigation",
  "compass", "gauge", "dial", "token", "medal", "plaque", "label", "receipt", "catalogue", "diagram",
  "blueprint", "key", "lock", "tinplate", "wind up", "clockwork", "boxed set", "unused", "new old stock",
  "pre war", "interwar", "victorian", "edwardian", "art deco", "mid century", "1960s", "1990s", "toy",
  "diecast", "figure", "train", "doll", "puppet", "marbles", "jigsaw", "lead figure", "plastic kit", "instrument",
  "pedal", "case", "guitar", "keyboard", "amp", "microphone", "harmonica", "metronome", "mouthpiece", "camera",
  "lens", "tripod", "darkroom", "slide", "35mm", "flash", "viewer", "projector", "negative", "light meter",
  "comic", "magazine", "annual", "pamphlet", "guide", "almanac", "zine", "atlas", "emblem", "speedometer",
  "car mascot", "tax disc", "spark plug", "radio", "turntable", "vhs", "hi-fi", "reel to reel", "walkman",
  "valve", "headphones", "odd", "fixture", "display", "mould", "handle", "stand", "bracket", "paperweight"
];

const recentSeeds: string[] = [];
const recentLimit = 45;

export function pickSeedTerms(_categories: string[] = ["All"], count = 10): string[] {
  const pool = [...new Set(seedTerms)];
  const fresh = pool.filter((term) => !recentSeeds.includes(term));
  const selected = shuffle(fresh.length >= count ? fresh : pool).slice(0, count);
  recentSeeds.push(...selected);
  while (recentSeeds.length > recentLimit) recentSeeds.shift();
  return selected;
}

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function randomSortOrder(): string {
  const values = ["BestMatch", "StartTimeNewest", "EndTimeSoonest", "PricePlusShippingLowest"];
  return values[Math.floor(Math.random() * values.length)];
}

export function randomPage(): number {
  return Math.floor(Math.random() * 8) + 1;
}
