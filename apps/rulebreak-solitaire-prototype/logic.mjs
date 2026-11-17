export const SUITS = [
  { symbol: "♠", name: "spades", color: "black" },
  { symbol: "♥", name: "hearts", color: "red" },
  { symbol: "♦", name: "diamonds", color: "red" },
  { symbol: "♣", name: "clubs", color: "black" }
];

export const RANKS = [
  { label: "A", value: 1 }, { label: "2", value: 2 }, { label: "3", value: 3 },
  { label: "4", value: 4 }, { label: "5", value: 5 }, { label: "6", value: 6 },
  { label: "7", value: 7 }, { label: "8", value: 8 }, { label: "9", value: 9 },
  { label: "10", value: 10 }, { label: "J", value: 11 }, { label: "Q", value: 12 },
  { label: "K", value: 13 }
];

const PRIME_VALUES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

export const RULES = [
  {
    id: "neighbor",
    badge: "BASE PROTOCOL",
    name: "NEIGHBOR LINK",
    description: "Match a card exactly one rank above or below the anchor.",
    hint: "Choose a neighboring rank",
    test: (anchor, candidate) => Math.abs(anchor.value - candidate.value) === 1
  },
  {
    id: "prime",
    badge: "ARITHMETIC ANOMALY",
    name: "PRIME CIRCUIT",
    description: "The anchor and chosen rank must add to a prime number.",
    hint: "Choose a pair whose ranks sum to a prime",
    test: (anchor, candidate) => PRIME_VALUES.has(anchor.value + candidate.value)
  },
  {
    id: "black",
    badge: "COLOR LOCK",
    name: "BLACK SIGNAL",
    description: "Only black cards can enter the signal chain.",
    hint: "Choose spades or clubs",
    test: (_anchor, candidate) => candidate.color === "black"
  },
  {
    id: "skip",
    badge: "SEQUENCE FAULT",
    name: "SKIP STEP",
    description: "Jump exactly two ranks above or below the anchor.",
    hint: "Choose a rank two steps away",
    test: (anchor, candidate) => Math.abs(anchor.value - candidate.value) === 2
  },
  {
    id: "parity",
    badge: "BINARY SYNC",
    name: "ODD / EVEN",
    description: "Connect ranks with the same parity: odd to odd, even to even.",
    hint: "Choose a rank with matching odd/even parity",
    test: (anchor, candidate) => anchor.value % 2 === candidate.value % 2
  }
];

export function createDeck() {
  let id = 0;
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({
    id: `card-${id++}`,
    suit: suit.symbol,
    suitName: suit.name,
    color: suit.color,
    rank: rank.label,
    value: rank.value
  })));
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function isValidMatch(rule, anchor, candidate) {
  return Boolean(rule && anchor && candidate && rule.test(anchor, candidate));
}

export function nextMultiplier(current, elapsedMs) {
  if (elapsedMs <= 1200) return Math.min(5, current + 0.5);
  if (elapsedMs <= 2500) return Math.min(5, current + 0.25);
  if (elapsedMs <= 4500) return Math.max(1, current);
  return 1;
}

export function scoreMatch(card, multiplier, phase) {
  const base = 80 + card.value * 10 + phase * 25;
  return Math.round(base * multiplier);
}

export function shuffledRuleRun(random = Math.random) {
  const mutations = shuffle(RULES.slice(1), random);
  return [RULES[0], mutations[0], mutations[1]];
}

export function hasValidChoice(rule, anchor, choices) {
  return choices.some((card) => isValidMatch(rule, anchor, card));
}

export function makePlayableLayout(rule, anchor, choices, deck, random = Math.random) {
  if (hasValidChoice(rule, anchor, choices)) return { anchor, choices, deck, rewired: false };

  const pool = [anchor, ...choices, ...deck];
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const mixed = shuffle(pool, random);
    const nextAnchor = mixed.shift();
    const nextChoices = mixed.splice(0, 4);
    if (hasValidChoice(rule, nextAnchor, nextChoices)) {
      return { anchor: nextAnchor, choices: nextChoices, deck: mixed, rewired: true };
    }
  }

  const forcedAnchor = pool.find((possibleAnchor) =>
    pool.some((candidate) => candidate.id !== possibleAnchor.id && isValidMatch(rule, possibleAnchor, candidate))
  );
  if (!forcedAnchor) throw new Error(`No playable pair exists for rule ${rule.id}`);
  const forcedChoice = pool.find((candidate) =>
    candidate.id !== forcedAnchor.id && isValidMatch(rule, forcedAnchor, candidate)
  );
  const rest = pool.filter((card) => card.id !== forcedAnchor.id && card.id !== forcedChoice.id);
  return {
    anchor: forcedAnchor,
    choices: [forcedChoice, ...rest.splice(0, 3)],
    deck: rest,
    rewired: true
  };
}

export function rankFor(score) {
  if (score >= 5000) return "S";
  if (score >= 4000) return "A";
  if (score >= 3000) return "B";
  return "C";
}
