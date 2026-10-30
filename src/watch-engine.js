export const SAVE_KEY = 'deelstuff.colreg.watch.v1';
export const LENGTH = 12;
export const angle = n => (n % 360 + 360) % 360;
export const turn = (a, b) => (a - b + 540) % 360 - 180;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const velocity = (h, s) => ({ x: Math.sin(h * Math.PI / 180) * s, y: Math.cos(h * Math.PI / 180) * s });
export function random(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shuffle = (a, rng) => { a = [...a]; for (let i = a.length - 1; i; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const ISLANDS = [{ x: -640, y: 430, r: 180, houses: true }, { x: 660, y: 400, r: 160 }, { x: -730, y: -500, r: 160 }, { x: 720, y: -520, r: 185 }];
export const CASES = {
  right: { title: 'Пересечение курсов', type: 'motor', side: 1, duty: 'own', rule: 15, related: [16, 8], fact: 'Оба судна — механические, на ходу. Другое судно подходит с нашего правого борта.', why: 'Механическое судно, имеющее другое механическое судно справа, уступает ему дорогу.', contrast: 'Если в такой же встрече другое механическое судно находится слева, первоначально уступает оно.', wrong: 'Посмотрите на правый борт нашего судна, а не на правую сторону экрана. В этой встрече другое судно находится справа от нас.' },
  left: { title: 'Та же встреча, другой борт', type: 'motor', side: -1, duty: 'other', rule: 15, related: [17], fact: 'Оба судна — механические, на ходу. Другое судно подходит слева и заблаговременно уступает.', why: 'Другое механическое судно имеет нас справа и уступает. Пока оно действует надлежащим образом, мы сохраняем курс и скорость.', contrast: 'Сохранение курса не освобождает от наблюдения: бездействие уступающего потребовало бы новой оценки по правилу 17.', wrong: 'Здесь справа находимся мы для другого судна. Оно уже предпринимает достаточное действие; наш лишний манёвр нарушает предсказуемость.' },
  sail: { title: 'Слева под парусами', type: 'sail', side: -1, duty: 'own', rule: 18, related: [3], fact: 'Мы идём под двигателем. Другое судно слева идёт только под парусами; двигатель не используется.', why: 'В этой обстановке механическое судно уступает парусному, хотя парусное находится слева.', contrast: 'Правило о судне справа относится к двум механическим судам. Здесь состав участников другой.', wrong: 'Сначала определите виды судов. Правило пересечения двух механических судов здесь не решает, кто уступает.' },
  fish: { title: 'Павел на промысле', type: 'fishing', side: -1, duty: 'own', rule: 18, related: [3, 26], fact: 'Мы под двигателем. Павел слева ведёт лов снастями, ограничивающими маневренность. На мачте два конуса вершинами вместе.', why: 'Наше механическое судно уступает судну, занятому ловом рыбы. Здесь важны работа и ограничивающие маневренность снасти.', contrast: 'Рыбацкий корпус сам по себе этого статуса не даёт: на переходе без лова обязанности будут другими.', wrong: 'Павел сейчас занят ловом рыбы, а не просто идёт на рыбацком катере. В этих условиях мы обязаны уступить.' },
  transit: { title: 'Павел идёт домой', type: 'fisher-transit', side: -1, duty: 'other', rule: 15, related: [3, 17], fact: 'Тот же рыбацкий катер слева идёт в порт под двигателем. Лов не ведётся, снасти убраны, рыболовного знака нет. Катер заблаговременно уступает.', why: 'Катер на переходе — обычное механическое судно. Он имеет нас справа и уступает; мы сохраняем курс и скорость.', contrast: 'Сравните с Павлом на промысле: тот же корпус, но другая деятельность и другие обязанности.', wrong: 'Не присваивайте особый статус по внешнему виду катера. Сейчас лов не ведётся; это пересечение двух механических судов.' },
  motorSail: { title: 'Паруса и двигатель', type: 'motor-sail', side: -1, duty: 'other', rule: 3, related: [15, 17, 25], fact: 'Мы под двигателем. Слева судно с парусами одновременно использует двигатель. Выставлен конус вершиной вниз. Оно заблаговременно уступает.', why: 'Судно с парусами при работающем двигателе считается механическим. В этой встрече оно имеет нас справа и уступает.', contrast: 'Поднятые паруса не означают статус парусного судна: существенен факт использования двигателя.', wrong: 'Обратите внимание на конус вершиной вниз и работающий двигатель. Здесь нужно применять обязанности механических судов.' },
  overtake: { title: 'Парусное догоняет моторное', type: 'motor', ownType: 'sail', duty: 'own', rule: 13, related: [18], fact: 'Наше судно идёт только под парусами и догоняет более медленное механическое судно прямо по корме. Это обгон.', why: 'Любое обгоняющее судно держится в стороне от обгоняемого до полного завершения обгона, включая парусное.', contrast: 'Это исключение из привычного применения взаимных обязанностей: в данной встрече действует правило обгона.', wrong: 'Обгон устанавливают прежде общего сравнения видов судов. Статус парусного не освобождает обгоняющего от обязанности держаться в стороне.' },
  headon: { title: 'Встречные курсы', type: 'motor', duty: 'both', rule: 14, related: [8], fact: 'Два механических судна на ходу идут прямо друг на друга. Риск столкновения есть, место с обоих бортов свободно.', why: 'При встрече прямо или почти прямо оба механических судна изменяют курс вправо и расходятся левыми бортами.', contrast: 'То, что встречное судно уже повернуло, не отменяет требуемого действия нашего судна.', wrong: 'Для этой встречной ситуации правило предписывает поворот вправо обоим судам. Просто ждать манёвра другого недостаточно.' },
  nuc: { title: 'Два шара на мачте', type: 'nuc', side: -1, duty: 'own', rule: 18, related: [3, 27], fact: 'Мы под двигателем. Судно слева из-за поломки не может маневрировать по правилам. Днём выставлены два чёрных шара по вертикали.', why: 'Наше механическое судно уступает судну, лишённому возможности управляться. Два шара обозначают этот особый статус.', contrast: 'Это не обычное пересечение двух исправных механических судов; определение статуса меняет применимую обязанность.', wrong: 'Здесь сначала нужно учесть невозможность другого судна маневрировать. Нахождение слева не делает его обычным уступающим участником.' },
};
const rotated = (p, h) => { const r = h * Math.PI / 180; return { ...p, x: p.x * Math.cos(r) + p.y * Math.sin(r), y: -p.x * Math.sin(r) + p.y * Math.cos(r), h: angle(p.h + h) }; };
export function question(family, rng = random(1), previousRotation = null) {
  const f = CASES[family]; let rotation = Math.floor(rng() * 8) * 45; if (rotation === previousRotation) rotation = angle(rotation + 90);
  const action = family === 'headon' || (['right', 'left', 'transit', 'motorSail'].includes(family) && rng() > .55);
  const ttc = 18 + rng() * 6, ownSpeed = family === 'overtake' ? 20 : 11 + rng() * 3, otherSpeed = family === 'overtake' ? 7 : 10 + rng() * 4;
  const own = { x: 0, y: -ownSpeed * ttc / 2, h: 0, speed: ownSpeed, type: f.ownType || 'motor', name: 'Мы' };
  let target;
  if (family === 'overtake') target = { x: 0, y: own.y + (ownSpeed - otherSpeed) * ttc, h: 0, speed: otherSpeed };
  else if (family === 'headon') target = { x: 0, y: own.y + (ownSpeed + otherSpeed) * ttc, h: 180, speed: otherSpeed };
  else target = { x: (f.side || 1) * otherSpeed * ttc, y: own.y + ownSpeed * ttc, h: f.side === -1 ? 90 : 270, speed: otherSpeed };
  Object.assign(target, { type: f.type, name: ['fish', 'transit'].includes(family) ? 'Павел' : 'Другое судно' });
  const expected = action ? f.duty === 'both' ? ['right'] : f.duty === 'own' ? ['right', 'slow'] : ['hold'] : [f.duty];
  const choices = action ? family === 'headon' ? [{ id: 'right', label: 'Вправо', icon: '↱' }, { id: 'left', label: 'Влево', icon: '↰' }, { id: 'hold', label: 'Оставить прежним', icon: '↑' }] : [{ id: 'right', label: 'Изменить курс вправо', icon: '↱' }, { id: 'slow', label: 'Уменьшить ход', icon: '−' }, { id: 'hold', label: 'Сохранить курс и скорость', icon: '↑' }] : [{ id: 'own', label: 'Наше судно', icon: 'А' }, { id: 'other', label: 'Другое судно', icon: 'Б' }];
  let fact = f.fact;
  if (!action) fact = fact.replace(' и заблаговременно уступает.', '.').replace(' Катер заблаговременно уступает.', '').replace(' Оно заблаговременно уступает.', '');
  return { family, rotation, kind: action ? 'action' : 'duty', prompt: action ? family === 'headon' ? 'Куда изменить наш курс?' : 'Что должно сделать наше судно?' : 'Какое судно обязано уступить дорогу?', own: rotated(own, rotation), target: rotated(target, rotation), ttc, expected, choices: shuffle(choices, rng), fact, why: f.why, contrast: f.contrast, wrong: f.wrong, rule: f.rule, related: f.related, title: f.title };
}
export function createWatch(seed = Date.now() >>> 0) {
  const rng = random(seed), deck = shuffle(Object.keys(CASES), rng); while (deck.length < LENGTH) deck.push(...shuffle(Object.keys(CASES), rng).slice(0, LENGTH - deck.length));
  const s = { seed: seed >>> 0, rng, deck, index: 0, answers: [], due: [], rotations: {}, paused: false, phase: 'question', feedback: null, elapsed: 0, helped: false, auto: true, advanceIn: null };
  deal(s); return s;
}
function deal(s) {
  const due = s.due.findIndex(e => e.at <= s.index && e.family !== s.current?.family);
  const family = due >= 0 ? s.due.splice(due, 1)[0].family : s.deck.shift();
  s.current = question(family, s.rng, s.rotations[family]); s.rotations[family] = s.current.rotation;
  s.elapsed = 0; s.helped = false; s.feedback = null; s.advanceIn = null; s.phase = 'question';
}
export function answer(s, choice) {
  if (s.phase !== 'question' || s.paused || !s.current.choices.some(c => c.id === choice)) return false;
  const correct = s.current.expected.includes(choice);
  const record = { family: s.current.family, rotation: s.current.rotation, kind: s.current.kind, choice, correct, helped: s.helped, seconds: s.elapsed, rule: s.current.rule };
  s.answers.push(record); s.feedback = record; s.phase = 'feedback'; s.advanceIn = correct && s.auto ? 6 : null;
  if (!correct) s.due.push({ family: s.current.family, at: s.index + 3 });
  return true;
}
export function next(s) {
  if (s.phase !== 'feedback') return false;
  s.index++;
  if (s.index >= LENGTH) { s.phase = 'results'; s.advanceIn = null; return true; }
  deal(s); return true;
}
export function tick(s, dt) {
  if (s.paused || !Number.isFinite(dt)) return;
  dt = clamp(dt, 0, .1);
  if (s.phase === 'question') s.elapsed += dt;
  if (s.phase === 'feedback' && s.advanceIn !== null) { s.advanceIn = Math.max(0, s.advanceIn - dt); if (s.advanceIn === 0) next(s); }
}
export function readHistory(storage) {
  try { const a = JSON.parse(storage.getItem(SAVE_KEY) || '[]'); return Array.isArray(a) ? a.filter(e => Number.isInteger(e.seed) && Array.isArray(e.answers) && e.answers.every(v => CASES[v.family] && typeof v.correct === 'boolean' && typeof v.helped === 'boolean')).slice(-20) : []; } catch { return []; }
}
export function saveWatch(storage, s) {
  const a = readHistory(storage); a.push({ seed: s.seed, date: new Date().toISOString(), answers: s.answers });
  try { storage.setItem(SAVE_KEY, JSON.stringify(a.slice(-20))); return true; } catch { return false; }
}
