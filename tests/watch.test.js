import test from 'node:test';
import assert from 'node:assert/strict';
import { createWatch, question, random, answer, next, tick, CASES, velocity, turn, LENGTH, saveWatch, readHistory, SAVE_KEY } from '../src/watch-engine.js';
import { RULE_TEXT } from '../src/rules-text.js';

test('all visual cases establish their conditions and reference existing rules', () => {
  for (const [id, f] of Object.entries(CASES)) {
    const q = question(id, random(12));
    assert.ok(q.fact.trim()); assert.ok(q.why.trim()); assert.ok(q.wrong.trim()); assert.ok(q.contrast.trim());
    for (const n of [q.rule, ...q.related]) assert.ok(RULE_TEXT.some(r => r.id === n), `${id}: rule ${n}`);
    assert.ok(q.expected.every(a => q.choices.some(c => c.id === a)));
  }
  assert.match(CASES.fish.fact, /снастями, ограничивающими маневренность/);
  assert.match(CASES.transit.fact, /Лов не ведётся/);
  assert.match(CASES.motorSail.fact, /одновременно использует двигатель/);
  assert.match(CASES.overtake.fact, /прямо по корме/);
});

test('counterexamples change the duty rather than just changing the drawing', () => {
  const q = id => question(id, random(1));
  assert.deepEqual(q('sail').expected, ['own']); assert.deepEqual(q('fish').expected, ['own']);
  assert.equal(CASES.transit.duty, 'other'); assert.equal(CASES.motorSail.duty, 'other');
  assert.deepEqual(q('overtake').expected, ['own']); assert.equal(q('overtake').own.type, 'sail'); assert.equal(q('overtake').rule, 13);
  assert.deepEqual(q('headon').expected, ['right']); assert.ok(q('headon').choices.some(c => c.id === 'left'));
});

test('chart rotation preserves relative bearings, overtaking sector and collision geometry', () => {
  for (let seed = 1; seed <= 50; seed++) for (const family of Object.keys(CASES)) {
    const q = question(family, random(seed)), o = q.own, t = q.target;
    const ov = velocity(o.h, o.speed), tv = velocity(t.h, t.speed), dx = t.x - o.x, dy = t.y - o.y, vx = tv.x - ov.x, vy = tv.y - ov.y;
    const tcpa = -(dx * vx + dy * vy) / (vx * vx + vy * vy);
    assert.ok(tcpa > 0); assert.ok(Math.hypot(dx + vx * tcpa, dy + vy * tcpa) < 1e-8);
    const bearing = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    if (CASES[family].side === 1) assert.ok(turn(bearing, o.h) > 0);
    if (CASES[family].side === -1) assert.ok(turn(bearing, o.h) < 0);
  }
});

test('seeds vary order, layout, answer positions and task interaction', () => {
  assert.equal(createWatch(42).current.family, createWatch(42).current.family);
  const watches = Array.from({ length: 40 }, (_, i) => createWatch(i));
  assert.ok(new Set(watches.map(s => s.current.family)).size > 5);
  assert.ok(new Set(watches.map(s => s.current.rotation)).size > 4);
  assert.ok(new Set(watches.map(s => s.current.choices[0].id)).size > 2);
});

test('wrong decisions return after intervening cases with a changed geometry', () => {
  const s = createWatch(21), first = s.current;
  const wrong = first.choices.find(c => !first.expected.includes(c.id)); answer(s, wrong.id); next(s);
  for (let i = 0; i < 2; i++) { assert.notEqual(s.current.family, first.family); answer(s, s.current.expected[0]); next(s); }
  assert.equal(s.current.family, first.family); assert.notEqual(s.current.rotation, first.rotation);
});

test('review time pauses for errors and reading; assisted decisions remain distinguishable', () => {
  const s = createWatch(3); s.paused = true; tick(s, .1); assert.equal(s.elapsed, 0); assert.equal(answer(s, s.current.expected[0]), false);
  s.paused = false; s.helped = true; answer(s, s.current.expected[0]); assert.equal(s.answers[0].helped, true);
  const remaining = s.advanceIn; s.paused = true; tick(s, .1); assert.equal(s.advanceIn, remaining);
  s.paused = false; next(s); const wrong = s.current.choices.find(c => !s.current.expected.includes(c.id)); answer(s, wrong.id); assert.equal(s.advanceIn, null);
  for (let i = 0; i < 100; i++) tick(s, .1); assert.equal(s.phase, 'feedback');
});

test('a complete watch ends at twelve decisions and neither duplicate nor invalid answers count', () => {
  const s = createWatch(5);
  for (let i = 0; i < LENGTH; i++) { assert.equal(answer(s, 'bad'), false); assert.equal(answer(s, s.current.expected[0]), true); assert.equal(answer(s, s.current.expected[0]), false); next(s); }
  assert.equal(s.phase, 'results'); assert.equal(s.answers.length, LENGTH); assert.equal(next(s), false);
});

test('history survives reload and handles corrupt or unavailable storage', () => {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  const s = createWatch(42); answer(s, s.current.expected[0]); assert.equal(saveWatch(storage, s), true); assert.equal(readHistory(storage)[0].answers[0].family, s.current.family);
  data.set(SAVE_KEY, '{}'); assert.deepEqual(readHistory(storage), []); data.set(SAVE_KEY, 'invalid'); assert.deepEqual(readHistory(storage), []);
  assert.equal(saveWatch({ getItem: () => null, setItem: () => { throw Error(); } }, s), false);
});

test('rule boundaries keep general definitions separate from responsibility', () => {
  const responsibility = RULE_TEXT.find(r => r.id === 2), definitions = RULE_TEXT.find(r => r.id === 3);
  assert.match(responsibility.text, /ни капитана, ни экипаж/);
  assert.doesNotMatch(responsibility.html, /<h3>Общие определения/);
  assert.doesNotMatch(responsibility.text, /Термин "парусное судно"/);
  assert.match(definitions.text, /парусное судно/);
  assert.doesNotMatch(RULE_TEXT.find(r => r.id === 39).html, /<\.li>/);
});
