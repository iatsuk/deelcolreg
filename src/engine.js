import { SCENARIOS } from './content.js';

export const STORAGE_KEY = 'deelstuff.colreg.v1';
export const SESSION_LENGTH = 10;
export const MASTERY_TARGET = 3;

export function emptyProgress() {
  return { version: 1, attempts: {}, sessions: 0, bestScore: 0, totalCorrect: 0, totalAnswers: 0 };
}

export function loadProgress(storage) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (raw?.version !== 1 || !raw.attempts || typeof raw.attempts !== 'object' || Array.isArray(raw.attempts)) return emptyProgress();
    const safe = emptyProgress();
    for (const key of ['sessions', 'bestScore', 'totalCorrect', 'totalAnswers']) {
      if (Number.isFinite(raw[key]) && raw[key] >= 0) safe[key] = raw[key];
    }
    safe.totalCorrect = Math.min(safe.totalCorrect, safe.totalAnswers);
    for (const scenario of SCENARIOS) {
      const item = raw.attempts[scenario.id];
      if (!item || !Number.isInteger(item.streak) || !Number.isInteger(item.correct) || !Number.isInteger(item.seen)) continue;
      if (item.streak < 0 || item.correct < 0 || item.seen < item.correct || item.streak > item.correct) continue;
      safe.attempts[scenario.id] = { streak: Math.min(MASTERY_TARGET, item.streak), correct: item.correct, seen: item.seen, last: Number.isFinite(item.last) ? item.last : 0, times: Array.isArray(item.times) ? item.times.filter(t => Number.isFinite(t) && t >= 0).slice(-10) : [] };
    }
    return safe;
  } catch { return emptyProgress(); }
}

export function saveProgress(storage, progress) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function poolFor(topic) {
  return SCENARIOS.filter(item => topic === 'all' || item.topic === topic);
}

// A missed concept returns after two intervening questions (one in a two-item topic).
// Otherwise prioritize unseen and weak concepts, avoiding the previous two if possible.
export function nextScenario(progress, topic, history, retries = [], random = Math.random) {
  const pool = poolFor(topic);
  const due = retries.find(item => item.at <= history.length && pool.some(s => s.id === item.id) && history.at(-1) !== item.id);
  if (due) return pool.find(s => s.id === due.id);
  const recent = history.slice(-Math.min(2, pool.length - 1));
  const available = pool.filter(item => !recent.includes(item.id));
  const weighted = available.map(item => {
    const a = progress.attempts[item.id];
    const recentCount = history.filter(id => id === item.id).length;
    return { item, weight: (a ? 2 + (MASTERY_TARGET - a.streak) * 3 : 14) / (1 + recentCount * 2) };
  });
  let pick = random() * weighted.reduce((sum, value) => sum + value.weight, 0);
  for (const candidate of weighted) {
    pick -= candidate.weight;
    if (pick <= 0) return candidate.item;
  }
  return available.at(-1);
}

export function recordAnswer(progress, id, correct, seconds, now = Date.now()) {
  const old = progress.attempts[id] || { streak: 0, correct: 0, seen: 0, times: [] };
  return {
    ...progress,
    totalAnswers: progress.totalAnswers + 1,
    totalCorrect: progress.totalCorrect + Number(correct),
    attempts: { ...progress.attempts, [id]: {
      streak: correct ? Math.min(MASTERY_TARGET, old.streak + 1) : 0,
      correct: old.correct + Number(correct), seen: old.seen + 1, last: now,
      times: correct ? [...old.times, seconds].slice(-10) : old.times,
    } },
  };
}

export function masteredCount(progress, topic = 'all') {
  return poolFor(topic).filter(item => progress.attempts[item.id]?.streak >= MASTERY_TARGET).length;
}

export function timeLimit(questionIndex) { return Math.max(9, 21 - Math.floor(questionIndex / 2) * 3); }

const baseGeometries = {
  right: { own: [0, 155], target: [220, -65], ownMove: [0, -220], targetMove: [-220, 0] },
  left: { own: [0, 155], target: [-220, -65], ownMove: [0, -220], targetMove: [220, 0] },
  'right-diagonal': { own: [0, 155], target: [180, -155], ownMove: [0, -190], targetMove: [-180, 120] },
  'left-diagonal': { own: [0, 155], target: [-180, -155], ownMove: [0, -190], targetMove: [180, 120] },
  headon: { own: [0, 155], target: [0, -155], ownMove: [0, -155], targetMove: [0, 155] },
  'headon-near': { own: [0, 155], target: [14, -155], ownMove: [0, -155], targetMove: [-14, 155] },
  overtake: { own: [0, 160], target: [0, 10], ownMove: [0, -240], targetMove: [0, -90] },
  'overtake-offset': { own: [-45, 160], target: [0, 10], ownMove: [45, -240], targetMove: [0, -90] },
  overtaken: { own: [0, 10], target: [0, 160], ownMove: [0, -90], targetMove: [0, -240] },
  'overtaken-offset': { own: [0, 10], target: [45, 160], ownMove: [0, -90], targetMove: [-45, -240] },
};

export function geometryFor(key, rotation = 0) {
  const base = baseGeometries[key];
  const angle = rotation * Math.PI / 180;
  // Keep hulls and labels inside the chart even after an arbitrary rotation.
  const rotate = ([x, y]) => [(x * Math.cos(angle) - y * Math.sin(angle)) * 0.72, (x * Math.sin(angle) + y * Math.cos(angle)) * 0.72];
  return Object.fromEntries(Object.entries(base).map(([key, vector]) => [key, rotate(vector)]));
}

export function heading([x, y]) { return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360; }
