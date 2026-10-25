import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, RULES } from '../src/content.js';
import { STORAGE_KEY, emptyProgress, loadProgress, saveProgress, shuffle, poolFor, nextScenario, recordAnswer, masteredCount, timeLimit, geometryFor, heading } from '../src/engine.js';

test('all scenarios have an unambiguous answer and reference existing rules', () => {
  assert.equal(SCENARIOS.length, 12);
  assert.equal(new Set(SCENARIOS.map(s => s.id)).size, 12);
  for (const s of SCENARIOS) {
    assert.equal(s.options.length, 3);
    assert.equal(s.options.filter(a => a.id === 'correct').length, 1);
    assert.equal(s.options.find(a => a.id === 'correct').text, s.answer);
    for (const rule of s.rules) assert.ok(RULES.some(r => r.id === rule));
    assert.ok(geometryFor(s.geometry));
  }
});

test('a mistake clears mastery and three consecutive successes restore it', () => {
  let progress = emptyProgress();
  const id = 'cross-right';
  for (let i = 0; i < 3; i++) progress = recordAnswer(progress, id, true, 2);
  assert.equal(masteredCount(progress), 1);
  progress = recordAnswer(progress, id, false, 8);
  assert.equal(masteredCount(progress), 0);
  assert.equal(progress.attempts[id].streak, 0);
  assert.equal(progress.attempts[id].seen, 4);
  assert.equal(progress.totalAnswers, 4);
  assert.equal(progress.totalCorrect, 3);
});

test('an error returns after two intervening questions', () => {
  const progress = emptyProgress();
  const retry = [{ id: 'cross-right', at: 3 }];
  assert.notEqual(nextScenario(progress, 'all', ['cross-right'], retry, () => 0).id, 'cross-right');
  assert.notEqual(nextScenario(progress, 'all', ['cross-right', 'cross-left'], retry, () => 0).id, 'cross-right');
  assert.equal(nextScenario(progress, 'all', ['cross-right', 'cross-left', 'head-on'], retry, () => 0).id, 'cross-right');
});

test('topic filter and repeated selection work even with only two concepts', () => {
  const progress = emptyProgress();
  const history = [];
  for (let i = 0; i < 30; i++) {
    const q = nextScenario(progress, 'headon', history, [], () => .7);
    assert.equal(q.topic, 'headon');
    assert.notEqual(q.id, history.at(-1));
    history.push(q.id);
  }
  assert.equal(poolFor('crossing').length, 6);
});

test('rotation preserves relative starboard, port and collision geometry', () => {
  for (let rotation = 0; rotation < 360; rotation += 45) {
    for (const name of ['right', 'left', 'right-diagonal', 'left-diagonal', 'headon', 'headon-near', 'overtake', 'overtaken', 'overtake-offset', 'overtaken-offset']) {
      const g = geometryFor(name, rotation);
      assert.ok(Math.hypot(...g.own) < 180, 'own ship must have drawing margin');
      assert.ok(Math.hypot(...g.target) < 180, 'target ship must have drawing margin');
      const ownEnd = g.own.map((value, i) => value + g.ownMove[i]);
      const targetEnd = g.target.map((value, i) => value + g.targetMove[i]);
      assert.ok(Math.hypot(ownEnd[0] - targetEnd[0], ownEnd[1] - targetEnd[1]) < .00001);
      if (name === 'right' || name === 'left') {
        const relative = g.target.map((value, i) => value - g.own[i]);
        const cross = g.ownMove[0] * relative[1] - g.ownMove[1] * relative[0];
        assert.ok(name === 'right' ? cross > 0 : cross < 0);
      }
    }
  }
  assert.equal(heading([0, -1]), 0);
  assert.equal(heading([1, 0]), 90);
});

test('time pressure increases in bounded steps', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => timeLimit(i)), [21, 21, 18, 18, 15, 15, 12, 12, 9, 9]);
  assert.equal(timeLimit(100), 9);
});

test('save and restore; malformed or unavailable storage degrades safely', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  const progress = recordAnswer(emptyProgress(), 'head-on', true, 2.4);
  assert.ok(saveProgress(storage, progress));
  assert.deepEqual(loadProgress(storage), progress);
  store.set(STORAGE_KEY, '{bad');
  assert.deepEqual(loadProgress(storage), emptyProgress());
  store.set(STORAGE_KEY, JSON.stringify({ ...progress, totalAnswers: 'bad', attempts: { 'head-on': { streak: 500, correct: 0, seen: 0 } } }));
  assert.deepEqual(loadProgress(storage), emptyProgress());
  const blocked = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  assert.deepEqual(loadProgress(blocked), emptyProgress());
  assert.equal(saveProgress(blocked, progress), false);
});

test('answer positions are shuffled without altering the source', () => {
  const source = ['a', 'b', 'c'];
  const shuffled = shuffle(source, () => 0);
  assert.deepEqual(source, ['a', 'b', 'c']);
  assert.notDeepEqual(shuffled, source);
  assert.deepEqual([...shuffled].sort(), source);
});
