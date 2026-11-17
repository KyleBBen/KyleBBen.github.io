import {
  createDeck,
  hasValidChoice,
  isValidMatch,
  makePlayableLayout,
  nextMultiplier,
  rankFor,
  scoreMatch,
  shuffle,
  shuffledRuleRun
} from "./logic.mjs";

const $ = (selector) => document.querySelector(selector);
const els = {
  app: $("#app"), intro: $("#intro"), game: $("#game"), results: $("#results"),
  start: $("#startButton"), restart: $("#restartButton"), restartTop: $("#restartTop"),
  score: $("#score"), scoreDelta: $("#scoreDelta"), multiplier: $("#multiplier"),
  momentumFill: $("#momentumFill"), matchCount: $("#matchCount"), phasePips: $("#phasePips"),
  ruleIndex: $("#ruleIndex"), ruleBadge: $("#ruleBadge"), ruleName: $("#ruleName"),
  ruleDescription: $("#ruleDescription"), phaseFill: $("#phaseFill"), phaseCount: $("#phaseCount"),
  anchor: $("#anchorCard"), choices: $("#choices"), deckCount: $("#deckCount"), hint: $("#hint"),
  comboText: $("#comboText"), runStatus: $("#runStatus"), mutation: $("#mutationOverlay"),
  mutationName: $("#mutationName"), mutationDescription: $("#mutationDescription"),
  finalScore: $("#finalScore"), peakMultiplier: $("#peakMultiplier"), fastMatches: $("#fastMatches"),
  rank: $("#rank"), particleLayer: $("#particleLayer"), flash: $("#flash")
};

const state = {
  active: false,
  inputLocked: false,
  deck: [],
  anchor: null,
  choices: [],
  rules: [],
  ruleIndex: 0,
  phaseMatches: 0,
  matches: 0,
  score: 0,
  multiplier: 1,
  peakMultiplier: 1,
  fastMatches: 0,
  lastMatchAt: 0,
  mutationTimer: null
};

const totalMatches = 15;
const matchesPerPhase = 5;

function currentRule() {
  return state.rules[state.ruleIndex];
}

function cardMarkup(card) {
  return `
    <span class="corner top"><b>${card.rank}</b><i>${card.suit}</i></span>
    <span class="suit-main">${card.suit}</span>
    <span class="corner bottom"><b>${card.rank}</b><i>${card.suit}</i></span>
  `;
}

function renderCard(element, card) {
  element.className = `card ${card.color}`;
  element.innerHTML = cardMarkup(card);
  element.setAttribute("aria-label", `${card.rank} of ${card.suitName}`);
}

function render() {
  const rule = currentRule();
  els.score.textContent = String(state.score).padStart(6, "0");
  els.multiplier.textContent = `×${state.multiplier.toFixed(2)}`;
  els.momentumFill.style.width = `${Math.min(100, ((state.multiplier - 1) / 4) * 100)}%`;
  els.matchCount.textContent = state.matches;
  els.ruleIndex.textContent = String(state.ruleIndex + 1).padStart(2, "0");
  els.ruleBadge.textContent = rule.badge;
  els.ruleName.textContent = rule.name;
  els.ruleDescription.textContent = rule.description;
  els.phaseCount.textContent = `${state.phaseMatches} / ${matchesPerPhase}`;
  els.phaseFill.style.width = `${(state.phaseMatches / matchesPerPhase) * 100}%`;
  els.deckCount.textContent = `${state.deck.length} CARDS IN RESERVE`;
  els.hint.innerHTML = `<span class="hint-dot"></span> ${rule.hint}`;
  renderCard(els.anchor, state.anchor);

  els.phasePips.innerHTML = Array.from({ length: totalMatches }, (_, index) => {
    const phaseClass = `phase-${Math.floor(index / matchesPerPhase) + 1}`;
    return `<i class="${index < state.matches ? `filled ${phaseClass}` : ""}"></i>`;
  }).join("");

  els.choices.innerHTML = "";
  state.choices.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card choice-card ${card.color}`;
    button.innerHTML = `${cardMarkup(card)}<span class="card-key">${index + 1}</span>`;
    button.setAttribute("aria-label", `Play ${card.rank} of ${card.suitName}`);
    button.dataset.index = index;
    button.addEventListener("click", () => playCard(index, button));
    els.choices.append(button);
  });
}

function ensurePlayable() {
  const layout = makePlayableLayout(currentRule(), state.anchor, state.choices, state.deck);
  state.anchor = layout.anchor;
  state.choices = layout.choices;
  state.deck = layout.deck;
  if (layout.rewired) els.comboText.textContent = "AUTO-REWIRE";
}

function startRun() {
  clearTimeout(state.mutationTimer);
  const deck = shuffle(createDeck());
  state.active = true;
  state.inputLocked = false;
  state.anchor = deck.shift();
  state.choices = deck.splice(0, 4);
  state.deck = deck;
  state.rules = shuffledRuleRun();
  state.ruleIndex = 0;
  state.phaseMatches = 0;
  state.matches = 0;
  state.score = 0;
  state.multiplier = 1;
  state.peakMultiplier = 1;
  state.fastMatches = 0;
  state.lastMatchAt = performance.now();
  els.intro.classList.add("hidden");
  els.results.classList.add("hidden");
  els.game.classList.remove("hidden");
  els.restartTop.classList.remove("hidden");
  els.runStatus.textContent = "RUN ACTIVE";
  els.comboText.textContent = "MAKE A MATCH";
  ensurePlayable();
  render();
  els.game.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.9,.2,1)" });
}

function playCard(index, button) {
  if (!state.active || state.inputLocked) return;
  const candidate = state.choices[index];
  if (!isValidMatch(currentRule(), state.anchor, candidate)) {
    button.classList.remove("invalid");
    void button.offsetWidth;
    button.classList.add("invalid");
    els.comboText.textContent = "RULE REJECTED";
    els.app.classList.add("micro-shake");
    setTimeout(() => els.app.classList.remove("micro-shake"), 220);
    tone(92, 0.06, "sawtooth", 0.025);
    return;
  }

  const now = performance.now();
  const elapsed = now - state.lastMatchAt;
  state.multiplier = nextMultiplier(state.multiplier, elapsed);
  if (elapsed <= 2500) state.fastMatches += 1;
  state.peakMultiplier = Math.max(state.peakMultiplier, state.multiplier);
  const gain = scoreMatch(candidate, state.multiplier, state.ruleIndex);
  state.score += gain;
  state.matches += 1;
  state.phaseMatches += 1;
  state.lastMatchAt = now;

  const oldAnchor = state.anchor;
  state.anchor = candidate;
  state.choices[index] = state.deck.shift() || oldAnchor;
  els.scoreDelta.textContent = `+${gain}`;
  els.scoreDelta.classList.remove("pop");
  void els.scoreDelta.offsetWidth;
  els.scoreDelta.classList.add("pop");
  els.comboText.textContent = state.multiplier >= 2.5 ? "OVERDRIVE" : state.multiplier >= 1.5 ? "CHAINING" : "LINK ACCEPTED";
  burst(button, candidate.color);
  powerPulse(state.multiplier);
  tone(210 + state.multiplier * 55, 0.075, "square", 0.025);

  if (state.matches >= totalMatches) {
    render();
    state.inputLocked = true;
    setTimeout(endRun, 520);
    return;
  }

  if (state.phaseMatches >= matchesPerPhase) {
    state.inputLocked = true;
    render();
    setTimeout(changeRule, 420);
    return;
  }

  ensurePlayable();
  render();
}

function changeRule() {
  state.ruleIndex += 1;
  state.phaseMatches = 0;
  state.multiplier = Math.max(1, state.multiplier - 0.5);
  state.lastMatchAt = performance.now();
  ensurePlayable();
  const rule = currentRule();
  els.mutationName.textContent = rule.name;
  els.mutationDescription.textContent = rule.description;
  els.mutation.classList.remove("hidden");
  els.mutation.classList.add("active");
  els.runStatus.textContent = "RULE MUTATION";
  mutationGlitch();
  render();
  state.mutationTimer = setTimeout(() => {
    els.mutation.classList.remove("active");
    setTimeout(() => els.mutation.classList.add("hidden"), 250);
    els.runStatus.textContent = "RUN ACTIVE";
    state.inputLocked = false;
    state.lastMatchAt = performance.now();
  }, 1550);
}

function endRun() {
  state.active = false;
  state.inputLocked = false;
  els.game.classList.add("hidden");
  els.results.classList.remove("hidden");
  els.runStatus.textContent = "RUN COMPLETE";
  els.finalScore.textContent = String(state.score).padStart(6, "0");
  els.peakMultiplier.textContent = `×${state.peakMultiplier.toFixed(2)}`;
  els.fastMatches.textContent = state.fastMatches;
  els.rank.textContent = rankFor(state.score);
  els.results.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "scale(1)" }], { duration: 520, easing: "cubic-bezier(.2,.9,.2,1)" });
  celebratoryBurst();
  tone(330, 0.12, "square", 0.025);
  setTimeout(() => tone(495, 0.16, "square", 0.025), 130);
}

let audioContext;
function tone(frequency, duration, type, volume) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch (_) {
    // Audio feedback is optional.
  }
}

function burst(origin, color) {
  const rect = origin.getBoundingClientRect();
  const palette = color === "red" ? ["#ff477e", "#ff8fab", "#ffe66d"] : ["#4dfcff", "#8b5cf6", "#ffffff"];
  for (let i = 0; i < 18; i += 1) {
    const particle = document.createElement("i");
    particle.className = "particle";
    particle.style.left = `${rect.left + rect.width / 2}px`;
    particle.style.top = `${rect.top + rect.height / 2}px`;
    particle.style.background = palette[i % palette.length];
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
    const distance = 50 + Math.random() * 110;
    particle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--rot", `${Math.random() * 360}deg`);
    els.particleLayer.append(particle);
    particle.addEventListener("animationend", () => particle.remove());
  }
}

function powerPulse(multiplier) {
  els.app.classList.remove("power-pulse", "heavy-pulse");
  void els.app.offsetWidth;
  els.app.classList.add(multiplier >= 3 ? "heavy-pulse" : "power-pulse");
  els.flash.classList.remove("flash-on");
  void els.flash.offsetWidth;
  els.flash.classList.add("flash-on");
  setTimeout(() => els.app.classList.remove("power-pulse", "heavy-pulse"), 260);
}

function mutationGlitch() {
  document.body.classList.add("mutating");
  setTimeout(() => document.body.classList.remove("mutating"), 700);
}

function celebratoryBurst() {
  const fake = { getBoundingClientRect: () => ({ left: innerWidth / 2 - 1, top: innerHeight / 2 - 1, width: 2, height: 2 }) };
  burst(fake, "black");
  setTimeout(() => burst(fake, "red"), 220);
}

els.start.addEventListener("click", startRun);
els.restart.addEventListener("click", startRun);
els.restartTop.addEventListener("click", startRun);
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !state.active && !els.intro.classList.contains("hidden")) startRun();
  if (event.key.toLowerCase() === "r" && !els.intro.classList.contains("hidden") === false) startRun();
  const number = Number(event.key);
  if (state.active && number >= 1 && number <= 4) {
    const button = els.choices.children[number - 1];
    if (button) playCard(number - 1, button);
  }
});
