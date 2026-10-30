import { createWatch, answer, next, tick, CASES, LENGTH, SAVE_KEY, readHistory, saveWatch, angle, turn, velocity, clamp } from './watch-engine.js';
import { Sea } from './voyage-sea.js';
import { fullRuleMarkup, getDocument, escapeHTML } from './pages.js';

const $ = s => document.querySelector(s), seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const querySeed = Number(new URLSearchParams(location.search).get('seed'));
let watch = createWatch(Number.isInteger(querySeed) && querySeed > 0 ? querySeed : seed());
let storage; try { storage = localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw Error(); } }; }
const sea = new Sea($('#sea'));
let scene, sceneIndex = -1, rendered = '', last = 0, lastUI = 0, resumeReader = false, saved = false;
const ruleName = id => `${typeof id === 'number' ? `Правило ${id}` : 'Приложение'}. ${getDocument(id)?.title || 'МППСС'}`;
function makeScene() {
  const q = watch.current;
  scene = { own: { ...q.own }, contact: { ...q.target, trail: [] }, course: q.own.h, leg: 0, phase: 'question', time: 0, trail: [], history: [], fit: { points: [q.own, q.target] }, selected: null, correct: null, motion: 0 };
  sceneIndex = watch.index;
  $('.decision-panel').scrollTop = 0;
  if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' });
}
function render() {
  const key = `${watch.index}:${watch.phase}:${watch.helped}`;
  if (key !== rendered) {
    rendered = key;
    if (watch.phase === 'results') renderResults();
    else {
      if (sceneIndex !== watch.index) makeScene();
      const q = watch.current, f = watch.feedback;
      $('#question-panel').hidden = false; $('#question-panel').classList.toggle('answered', Boolean(f)); $('#results-panel').hidden = true;
      $('#question-panel').innerHTML = `<span class="question-kicker">${q.kind === 'duty' ? 'ВЗАИМНЫЕ ОБЯЗАННОСТИ · ВЫБОР СУДНА' : 'ПРИМЕНЕНИЕ ПРАВИЛА · ВЫБОР ДЕЙСТВИЯ'}</span><h1 id="question-title">${q.prompt}</h1><div class="facts"><span>ЧТО МЫ НАБЛЮДАЕМ</span>${escapeHTML(q.fact)}</div><p class="decision-instruction">${q.kind === 'duty' ? 'Нажмите на судно А или Б на схеме либо выберите его ниже.' : 'Выберите действие относительно носа нашего судна А.'}</p><div class="choices ${q.kind}" id="choices">${q.choices.map((c, i) => `<button class="choice ${f && q.expected.includes(c.id) ? 'is-correct' : ''} ${f && f.choice === c.id && !f.correct ? 'is-wrong' : ''}" data-answer="${c.id}" ${f ? 'disabled' : ''}><i>${c.icon}</i><span>${c.label}</span><kbd>${i + 1}</kbd></button>`).join('')}</div>${f ? feedbackMarkup() : `<button class="hint-button" data-w="hint">Разобраться с правилом перед ответом</button>${watch.helped ? '<p class="decision-instruction">Вы открыли правило. Этот ответ отметим как выполненный с подсказкой.</p>' : ''}`}`;
      if (f) { scene.selected = q.kind === 'duty' ? f.choice : 'own'; scene.expectedActor = q.kind === 'duty' ? q.expected[0] : null; scene.correct = f.correct; scene.phase = 'feedback'; }
    }
  }
  $('#round-count').textContent = watch.phase === 'results' ? 'Вахта завершена' : `Решение ${watch.index + 1} из ${LENGTH}`;
  $('#correct-count').textContent = `${watch.answers.filter(a => a.correct && !a.helped).length} без подсказки`;
  $('#progress-dots').innerHTML = Array.from({ length: LENGTH }, (_, i) => { const a = watch.answers[i]; return `<i class="${a ? a.correct ? a.helped ? 'helped' : 'correct' : 'wrong' : i === watch.index ? 'current' : ''}" title="${a ? a.correct ? 'Верно' : 'Ошибка' : `Решение ${i + 1}`}"></i>`; }).join('');
  $('#progress-dots').setAttribute('aria-label', `${watch.answers.length} решений из ${LENGTH}, ${watch.answers.filter(a => a.correct && !a.helped).length} верно без подсказки`);
  $('#pause-overlay').hidden = !watch.paused || $('#reader').open;
  $('#pause-button').textContent = watch.paused ? '▷' : 'Ⅱ'; $('#pause-button').setAttribute('aria-label', watch.paused ? 'Продолжить' : 'Пауза');
  document.body.classList.toggle('watch-paused', watch.paused);
  $('#scene-caption').textContent = watch.phase === 'results' ? 'В следующей вахте — новые условия встреч' : watch.phase === 'feedback' ? watch.feedback.correct ? 'Сравните действие с объяснением правила →' : 'Ошибка — повод разобрать условие, затем попробовать вариацию' : watch.current.kind === 'duty' ? 'А — наше судно · Б — другое' : 'Курс и борта отсчитываются от нашего судна А';
  const countdown = $('#countdown'); if (countdown) countdown.textContent = watch.advanceIn === null ? 'Разбор без ограничения времени' : `следующая через ${Math.ceil(watch.advanceIn)} с`;
  $('#learning-status').textContent = watch.due.length ? 'Ошибочная тема вернётся через несколько других решений' : '12 коротких решений · ошибочные темы вернутся с вариацией';
}
function feedbackMarkup() {
  const q = watch.current, f = watch.feedback;
  const actionWhy = f.correct && q.kind === 'action' && q.family === 'right' ? f.choice === 'slow' ? 'Снижение хода даёт другому судну пройти впереди нас. ' : 'Поворот вправо в этой свободной акватории позволяет пройти за кормой. ' : '';
  const chosen = q.choices.find(c => c.id === f.choice).label;
  return `<section class="feedback ${f.correct ? '' : 'wrong'}" aria-live="polite"><div class="feedback-heading"><img src="./assets/captain-elena.png" alt="" width="47" height="47"><div>${f.correct ? f.helped ? 'Верно, с подсказкой' : 'Верно' : 'Разберём условие'}<small>ЕЛЕНА · ОБЪЯСНЕНИЕ РЕШЕНИЯ</small></div></div><p class="answer-recap">Ваш выбор: ${chosen}${!f.correct ? `<br>Верный выбор: ${q.expected.map(id => q.choices.find(c => c.id === id).label).join(' или ')}` : ''}</p>${!f.correct ? `<p class="why-wrong">${q.wrong}</p>` : ''}<p>${actionWhy}${q.why}</p>${!f.correct ? `<p class="contrast">${q.contrast}</p>` : `<details class="feedback-detail"><summary>Какое условие изменит ответ?</summary><p>${q.contrast}</p></details>`}<button class="rule-link" data-rule="${q.rule}">${ruleName(q.rule)} · открыть целиком</button><div class="next-row"><button class="primary" data-w="next">Следующая ситуация →</button><small id="countdown"></small>${f.correct ? '<button class="stop-auto" data-w="hold-review">Задержаться на разборе</button>' : ''}</div></section>`;
}
function renderResults() {
  $('#question-panel').hidden = true; $('#results-panel').hidden = false;
  const independent = watch.answers.filter(a => a.correct && !a.helped).length, helped = watch.answers.filter(a => a.correct && a.helped).length;
  const errors = [...new Set(watch.answers.filter(a => !a.correct).map(a => a.family))];
  const prior = readHistory(storage);
  $('#results-panel').innerHTML = `<div class="results"><span class="question-kicker">ВАХТА ЗАВЕРШЕНА</span><h1>Разобрали ${LENGTH} ситуаций.</h1><div class="result-stats"><div><strong>${independent}<small> / ${LENGTH}</small></strong><span>верно без подсказки</span></div><div><strong>${helped}</strong><span>с подсказкой</span></div></div><p>${errors.length ? 'В этой вахте ошибки были в следующих условиях. Сравните правило с тем, что видели на схеме.' : 'Попробуйте новую вахту: изменятся направления, состав встреч и расположение вариантов ответа.'}</p>${errors.map(id => `<div class="review-topic"><b>${CASES[id].title}</b><small>${CASES[id].why}</small><button class="rule-link" data-rule="${CASES[id].rule}">${ruleName(CASES[id].rule)}</button></div>`).join('')}<button class="primary" data-w="new">Новая вахта →</button><p class="note">Одна вахта проверяет решения в ограниченном наборе условий. Для устойчивого навыка нужны новые варианты и повторение спустя время.</p><p class="note">В этом браузере пройдено вахт: ${prior.length + Number(!saved)}. Журнал хранится локально.</p><p class="save-note" id="save-note"></p></div>`;
  if (!saved) { saved = true; if (!saveWatch(storage, watch)) $('#save-note').textContent = 'Сохранить журнал не удалось; игра продолжает работать в этой вкладке.'; }
}
function reader(title, content) {
  if (!$('#reader').open) { resumeReader = !watch.paused; watch.paused = true; }
  $('#reader-content').innerHTML = `<h2 id="reader-title">${title}</h2>${content}`;
  if (!$('#reader').open) $('#reader').showModal(); render();
}
function openRule(id) {
  if (watch.phase === 'question') watch.helped = true;
  reader(ruleName(id), fullRuleMarkup(id));
}
function rules() {
  if (watch.phase === 'question') watch.helped = true;
  const ids = [...new Set([watch.current.rule, ...watch.current.related, 13, 14, 15, 17, 18])];
  reader('Правила этой вахты', `<p>Вопросы касаются взаимных обязанностей и действий в открытой воде, когда суда находятся на виду.</p><div class="rule-menu">${ids.map(id => `<button class="rule-link" data-rule="${id}">${ruleName(id)}</button>`).join('')}</div><p><a href="./index.html#rules">Весь МППСС внутри сайта →</a></p>`);
}
function help() {
  reader('Частые решения, понятный разбор', '<p>В этой вахте 12 коротких визуальных ситуаций. Сначала оцените условия и виды судов, затем выберите обязанность или действие. Свободного вождения между упражнениями нет.</p><p>Нажимайте на судно А или Б прямо на схеме либо используйте кнопки. В задачах на манёвр выбирайте действие. Клавиши 1, 2, 3 соответствуют расположению кнопок; Enter — следующая ситуация после разбора, пробел — пауза.</p><p>После каждого ответа показаны правило и причина. Ошибочный ответ остаётся на экране, пока вы не продолжите; тема вернётся позже с другой геометрией. После верного ответа можно задержаться на разборе или отключить автопереход.</p><p>Суда находятся на виду, видимость хорошая, открытая вода. Узкостей и систем разделения движения в этих задачах нет. Вопрос про парусное при обгоне специально проверяет исключение из обычного сравнения видов судов.</p><p class="reader-note">Схема условная; размеры судов увеличены для читаемости. Анимация показывает движение и выбранное действие, а не сертифицированную модель судовождения. Прототип отрабатывает отдельные применения правил 3, 13–18, 25–27 и не заменяет полный курс.</p>');
}
function submit(id) { if (answer(watch, id)) { scene.motion = 0; rendered = ''; render(); $('.feedback')?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } }
function newWatch() {
  watch = createWatch(seed()); watch.auto = $('#auto').checked; saved = false; rendered = ''; sceneIndex = -1; if ($('#reader').open) $('#reader').close(); history.replaceState(null, '', location.pathname); render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#rule-"],a[href^="#annex-"]');
  if (a) { e.preventDefault(); const hash = a.getAttribute('href').slice(1); openRule(hash.startsWith('rule-') ? Number(hash.slice(5)) : hash); return; }
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.answer) { submit(b.dataset.answer); return; }
  if (b.dataset.rule) { openRule(Number(b.dataset.rule)); return; }
  switch (b.dataset.w) {
    case 'next': next(watch); rendered = ''; render(); break;
    case 'new': newWatch(); break;
    case 'hint': openRule(watch.current.rule); break;
    case 'rules': rules(); break;
    case 'help': help(); break;
    case 'pause': watch.paused = !watch.paused; render(); break;
    case 'close': $('#reader').close(); break;
    case 'hold-review': watch.advanceIn = null; render(); break;
  }
});
$('#auto').addEventListener('change', e => { watch.auto = e.target.checked; if (watch.phase === 'feedback') watch.advanceIn = e.target.checked && watch.feedback.correct ? 6 : null; render(); });
$('#question-panel').addEventListener('toggle', e => { if (e.target.matches('details') && e.target.open) watch.advanceIn = null; }, true);
$('#sea').addEventListener('pointerdown', e => {
  if (watch.phase !== 'question' || watch.paused || watch.current.kind !== 'duty') return;
  const r = $('#sea').getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top };
  const own = sea.toScreen(scene.own), other = sea.toScreen(scene.contact);
  if (Math.hypot(p.x - own.x, p.y - own.y) < 55) submit('own');
  else if (Math.hypot(p.x - other.x, p.y - other.y) < 55) submit('other');
});
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || $('#reader').open || e.target.matches('input')) return;
  if (['1', '2', '3'].includes(e.key) && watch.phase === 'question') { e.preventDefault(); const choice = watch.current.choices[Number(e.key) - 1]; if (choice) submit(choice.id); }
  if (e.code === 'Space') { e.preventDefault(); watch.paused = !watch.paused; render(); }
  if (e.key === 'Enter' && watch.phase === 'feedback' && !watch.paused && !e.target.closest('button')) { e.preventDefault(); next(watch); rendered = ''; render(); }
});
$('#reader').addEventListener('close', () => { if (resumeReader && !document.hidden) watch.paused = false; resumeReader = false; render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { watch.paused = true; resumeReader = false; render(); } });
function moveScene(dt) {
  if (!scene || watch.paused || watch.phase === 'results') return;
  scene.time += dt * 3;
  const q = watch.current, f = watch.feedback;
  if (!f && scene.time > q.ttc * .15) return;
  if (f) {
    scene.motion += dt;
    if (scene.motion > 3) return;
    const ownTurns = q.kind === 'duty' ? f.choice === 'own' : ['right', 'left'].includes(f.choice);
    const otherTurns = scene.contact.type !== 'nuc' && (q.kind === 'duty' ? f.choice === 'other' : CASES[q.family].duty !== 'own');
    const ownTarget = angle(q.own.h + (f.choice === 'left' ? -38 : 38));
    if (ownTurns) scene.own.h = angle(scene.own.h + clamp(turn(ownTarget, scene.own.h), -dt * 12, dt * 12));
    if (otherTurns) scene.contact.h = angle(scene.contact.h + clamp(turn(angle(q.target.h + 38), scene.contact.h), -dt * 12, dt * 12));
    if (f.choice === 'slow') scene.own.speed = Math.max(0, scene.own.speed - dt * 5);
  } else if (q.kind === 'action' && CASES[q.family].duty === 'other') scene.contact.h = angle(scene.contact.h + clamp(turn(angle(q.target.h + 35), scene.contact.h), -dt * 12, dt * 12));
  for (const boat of [scene.own, scene.contact]) { const v = velocity(boat.h, boat.speed); boat.x += v.x * dt * 3; boat.y += v.y * dt * 3; }
}
function animate(now) {
  const dt = Math.min(.08, last ? (now - last) / 1000 : 0); last = now;
  tick(watch, dt); if (sceneIndex !== watch.index && watch.phase !== 'results') render(); moveScene(dt); sea.draw(scene);
  if (now - lastUI > 120) { render(); lastUI = now; }
  requestAnimationFrame(animate);
}
render(); requestAnimationFrame(animate);
