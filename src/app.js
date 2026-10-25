import { Arcade } from './arcade.js';
import { arcadeHub, arcadeMarkup, GAME_TYPES } from './arcade-pages.js';
import { CourseGame, playSignal, stopSignal } from './course-game.js';
import { COURSE_CARDS } from './course.js';
import { libraryMarkup, libraryTOC, fullRuleMarkup, getDocument, courseMarkup, drillMarkup, informationMarkup } from './pages.js';
import { CONDITIONS, RULES, SCENARIOS, SOURCES, TOPICS } from './content.js';
import { SESSION_LENGTH, STORAGE_KEY, emptyProgress, loadProgress, saveProgress, shuffle, poolFor, nextScenario, recordAnswer, masteredCount, timeLimit, geometryFor, heading } from './engine.js';

const root = document.querySelector('#app');
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } }; }
let progress = loadProgress(storage);
let page = 'course';
let selectedRule = 1;
let courseMode = 'watch';
let modalCourseResume = false;
let modalArcadeResume = false;
let topic = 'all';
let mode = 'watch';
let session = null;
let frame = 0;
let storageOK = true;
let modalResume = false;
const courseGame = new CourseGame(storage, () => render(), state => {
  const time=document.querySelector('#drill-time'),fill=document.querySelector('#drill-fill');
  if(time)time.textContent=`${Math.ceil(state.remaining)} с`;
  if(fill){fill.style.width=`${state.remaining/state.limit*100}%`;fill.classList.toggle('urgent',state.remaining<5);}
});
const arcade = new Arcade(storage, () => render(), () => { page='course';history.replaceState(null,'','#course');render();window.scrollTo(0,0); });
const embedded = new URLSearchParams(location.search).get('embed') === '1';
if (embedded) document.body.classList.add('embedded');

const icons = {
  sail: '<path d="M12 2 3 16h9zm3 4v10h7zM2 19h21l-5 4H7z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  cross: '<path d="M4 20 20 4m-7 0h7v7M4 4l6 6m4 4 6 6m-7 0h7v-7"/>',
  meeting: '<path d="M8 21V4m-4 4 4-4 4 4m4-5v17m-4-4 4 4 4-4"/>',
  overtake: '<path d="M7 21V4m-4 4 4-4 4 4m6 13v-6c0-3-3-3-3-6V4m-4 4 4-4 4 4"/>',
  book: '<path d="M3 4h6c2 0 3 1 3 2 0-1 1-2 3-2h6v15h-6c-2 0-3 1-3 2 0-1-1-2-3-2H3zM12 6v15"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  heart: '<path d="M20 5c-2-2-6-2-8 1-2-3-6-3-8-1-3 4 0 8 8 14 8-6 11-10 8-14Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  signal: '<path d="M4 19v-4m5 4v-8m5 8V7m5 12V3"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.compass}</svg>`;
const formatTime = seconds => `${seconds.toFixed(1).replace('.', ',')} с`;
const currentTopic = () => TOPICS.find(item => item.id === topic);

function persist() { storageOK = saveProgress(storage, progress); }

function shell(content) {
  root.innerHTML = `
    <header class="site-header"><a class="brand" href="#" data-action="home" aria-label="Дельный МППСС — главная"><span class="brand-mark">${icon('sail')}</span><span>Дельный <b>МППСС</b><small>МОРСКАЯ ПРАКТИКА</small></span></a>
      <nav aria-label="Основная навигация">${[['course', 'Играть'], ['rules', 'Правила'], ['progress', 'Прогресс']].map(([id, name]) => `<button data-page="${id}" class="nav-link ${(page === id || id==='course'&&GAME_TYPES[page]) ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''}>${name}</button>`).join('')}</nav>
      <a class="byline" href="https://deelstuff.com/">проект <strong>deelstuff<span>↗</span></strong></a>
    </header>
    <main id="main">${content}</main>
    <footer><span>${icon('sail')} Дельный МППСС <span class="footer-dot">·</span> Сделано, чтобы помнить.</span><div class="footer-links"><button data-page="sources">Об игре и источники</button><button data-page="impressum">Impressum</button><button data-page="datenschutz">Datenschutz</button></div><span class="version">COLREG · V0.3</span></footer>
    <dialog id="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>`;
  document.querySelector('#modal').addEventListener('close', () => { if(modalArcadeResume){modalArcadeResume=false;arcade.state.paused=false;render();return;} if(modalCourseResume && courseGame.state?.phase==='question'){modalCourseResume=false;courseGame.state.paused=false;render();return;} if (modalResume && session?.phase === 'question') { modalResume = false; resume(); } });
}

function render() {
  cancelAnimationFrame(frame);
  courseGame.stopClock();stopSignal();arcade.detach();
  if(page==='course'){shell(arcadeHub(arcade.progress));return;}
  if(GAME_TYPES[page]){if(arcade.state?.type!==page){arcade.start(page);return;}shell(arcadeMarkup(arcade));if(!arcade.saved)document.querySelector('#main').insertAdjacentHTML('beforeend','<p class="arcade-storage-note" role="status">Сохранить прогресс не удалось. Игра продолжает работать в этой вкладке.</p>');arcade.mount();return;}
  if(page==='cards'){shell(courseMarkup(courseGame.progress,courseMode,icon));return;}
  if(['sources','impressum','datenschutz'].includes(page)){shell(informationMarkup(page,SOURCES));return;}
  if(page==='drill'){if(!courseGame.state){page='course';render();return;}shell(drillMarkup(courseGame,icon));courseGame.startClock();if(courseGame.state.phase==='feedback')document.querySelector('[data-action=drill-next]')?.focus({preventScroll:true});return;}
  if (page === 'rules') { renderRules(); return; }
  if (page === 'progress') { renderProgress(); return; }
  const active = session && session.phase !== 'results';
  const completed = session?.phase === 'results';
  shell(`
    <section class="intro"><div><p class="eyebrow"><span class="tiny-flag"></span> ПРАВИЛА ЗНАТЬ. СИТУАЦИЮ УЗНАВАТЬ.</p><h1>Разойдёмся<br class="mobile-break"> по правилам<span class="title-dot">.</span></h1><p class="intro-copy">Превратите знание МППСС в навык. Оцените сближение,<br class="desktop-break"> примите решение и заступите на следующую вахту.</p></div><div class="intro-note"><span class="note-compass">${icon('compass')}</span><span>Спокойная голова.<br>Верное решение.<small>Одна ситуация за раз.</small></span></div></section>
    <section class="training-section" aria-label="Игровой тренажёр">
      <div class="section-bar"><div class="section-label"><span class="section-number">01</span> МАНЕВРИРОВАНИЕ <span class="rule-range">ПРАВИЛА 13–17</span></div><div class="mode-switch" aria-label="Режим тренировки"><button data-mode="watch" class="${mode === 'watch' ? 'selected' : ''}" ${active ? 'disabled' : ''}>${icon('signal')} Вахта</button><button data-mode="practice" class="${mode === 'practice' ? 'selected' : ''}" ${active ? 'disabled' : ''}>Без таймера</button></div></div>
      ${completed ? resultsMarkup() : `<div class="game-layout"><div class="chart-column">${chartMarkup()}<div class="chart-bottom"><span><i class="legend-dot own"></i> Ваше судно</span><span><i class="legend-dot target"></i> Другое судно</span><span class="chart-scale">СХЕМА · НЕ В МАСШТАБЕ</span></div></div><aside class="mission-panel">${active ? missionMarkup() : lobbyMarkup()}</aside></div>`}
      <div class="game-footnote"><span>${icon('compass')} ${active ? 'Опасность столкновения установлена. ' : ''}На виду друг у друга · механические суда · открытое море</span><button data-action="conditions">Условия задачи ${icon('help')}</button></div>
    </section>
    <section class="topics-section"><div class="topics-heading"><h2>Что отработаем?</h2><span>Выберите тему для следующей вахты</span></div><div class="topics">${TOPICS.map(t => `<button data-topic="${t.id}" class="topic-card ${topic === t.id ? 'chosen' : ''}" ${active ? 'disabled' : ''} aria-pressed="${topic === t.id}"><span class="topic-icon">${icon(t.icon)}</span><span class="topic-rule">${t.id === 'all' ? 'СМЕШАННАЯ ВАХТА' : `ПРАВИЛО ${t.rule}`}</span><strong>${t.name}</strong><span class="topic-description">${t.description}</span><span class="topic-bottom"><span>${masteredCount(progress, t.id)} / ${poolFor(t.id).length} закреплено</span>${icon(topic === t.id ? 'check' : 'arrow')}</span></button>`).join('')}</div></section>
    <div class="learning-note"><span class="note-symbol">↻</span><p><strong>Навык растёт с повторением.</strong> Ошиблись — разберём правило и вернём ситуацию через несколько заданий. Постепенно времени на ответ станет меньше.</p><button data-action="how">Как играть ${icon('arrow')}</button></div>
    ${!storageOK ? '<p class="storage-notice" role="status">Браузер не разрешил сохранить прогресс. В этой вкладке тренировка продолжает работать.</p>' : ''}`);
  if (session?.phase === 'question') {
    session.lastTick = performance.now();
    if (!session.paused) frame = requestAnimationFrame(tick);
  }
  if (active && session.phase === 'feedback') document.querySelector('[data-action="next"]')?.focus({ preventScroll: true });
}

function lobbyMarkup() {
  return `<div class="panel-eyebrow"><span class="status-dot"></span> УЧЕБНЫЙ РЕЙС</div><div class="lobby-body"><p class="small-kicker">ВАША ПЕРВАЯ ЗАДАЧА</p><h2>Увидеть.<br>Решить.<br><em>Разойтись.</em></h2><p>Суда сближаются. Определите, что требуют правила, прежде чем закончится время.</p><div class="session-facts"><span><b>10</b> ситуаций</span><span><b>${mode === 'watch' ? '3' : '∞'}</b> ${mode === 'watch' ? 'права на ошибку' : 'попыток'}</span></div><button class="primary-button" data-action="start">${mode === 'watch' ? 'Начать вахту' : 'Начать практику'} ${icon('arrow')}</button><p class="keyboard-hint">${mode === 'watch' ? 'Темп растёт от 21 до 9 секунд' : 'Без спешки. С разбором каждого ответа.'}</p></div><div class="lobby-progress"><span>УЖЕ ЗАКРЕПЛЕНО</span><strong>${masteredCount(progress)} <small>/ 12 ситуаций</small></strong><div class="mini-progress"><i style="width:${masteredCount(progress) / 12 * 100}%"></i></div></div>`;
}

function missionMarkup() {
  const s = session;
  const q = s.question;
  const feedback = s.phase === 'feedback';
  return `<div class="session-top"><span>СИТУАЦИЯ <b>${String(s.history.length).padStart(2, '0')}</b> / 10</span><span class="lives" aria-label="${mode === 'watch' ? `Осталось попыток: ${s.lives}` : 'Практика без ограничения ошибок'}">${mode === 'watch' ? [0, 1, 2].map(i => icon('heart', i < s.lives ? 'filled' : 'empty')).join('') : 'ПРАКТИКА'}</span></div>
    <div class="question-body"><p class="small-kicker">${feedback ? `ПРАВИЛО ${q.rules.join(' / ')}` : 'ОЦЕНИТЕ ОБСТАНОВКУ'}</p><h2>${q.question}</h2><p class="question-detail">${q.detail}</p>
    ${feedback ? `<div class="feedback ${s.lastCorrect ? 'correct' : 'incorrect'}" role="status"><span class="feedback-symbol">${icon(s.lastCorrect ? 'check' : 'close')}</span><strong>${s.lastCorrect ? 'Верное решение' : s.timedOut ? 'Время вышло' : 'Давайте разберёмся'}</strong>${s.lastCorrect ? `<span class="earned">+${s.lastPoints}</span>` : ''}<p>${q.explanation}</p>${!s.lastCorrect ? `<p class="correct-answer">Верный ответ: ${q.answer}</p>` : ''}<div class="feedback-sources">${q.rules.map(id => `<button class="local-rule-link" data-action="rule" data-rule="${id}">Правило ${id}</button>`).join('')}</div></div><button class="primary-button" data-action="next">${s.lives <= 0 || s.history.length >= SESSION_LENGTH ? 'Результат вахты' : 'Следующая ситуация'} ${icon('arrow')}</button><button class="text-button rule-button" data-action="rule" data-rule="${q.rules[0]}">${icon('book')} Разобрать правило ${q.rules[0]}</button>` : `<div class="answer-options">${s.options.map((answer, i) => `<button class="answer-button" data-answer="${answer.id}" ${s.paused ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${answer.text}</span></button>`).join('')}</div><p class="keyboard-hint">Клавиши <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> · <kbd>Пробел</kbd> — пауза</p>`}</div>
    <div class="session-bottom"><span>ОЧКИ <b>${s.score}</b></span><span>СЕРИЯ <b>${s.streak} ${s.streak >= 3 ? '↗' : ''}</b></span><button data-action="finish" aria-label="Завершить текущую вахту">Завершить</button></div>`;
}

function ship(color, label, id, vector) {
  return `<g id="${id}"><g transform="rotate(${heading(vector)})"><path class="ship-wake" d="M-9 33-15 61M9 33l6 28M0 36v38"/><path d="M0-28 13-9 12 26Q0 32-12 26L-13-9Z" fill="${color}" stroke="${color}" stroke-width="3"/><path d="M0-17 7-7v12H-7V-7Z" fill="#fbfcf1" opacity=".9"/><rect x="-7" y="12" width="14" height="9" rx="2" fill="#fbfcf1" opacity=".35"/></g><g class="ship-label"><rect x="22" y="-5" width="${id === 'own-ship' ? 100 : 118}" height="27" rx="4"/><text x="31" y="13">${label}</text></g></g>`;
}

function chartMarkup() {
  const active = session && session.phase !== 'results';
  const q = active ? session.question : SCENARIOS[0];
  const g = geometryFor(q.geometry, active ? session.rotation : 0);
  const percent = active && mode === 'watch' ? Math.min(0.72, (1 - session.remaining / session.limit) * 0.72) : 0;
  const pos = (start, move) => [400 + start[0] + move[0] * percent, 240 + start[1] + move[1] * percent];
  const own = pos(g.own, g.ownMove);
  const target = pos(g.target, g.targetMove);
  const track = (start, move) => `M${400 + start[0]},${240 + start[1]}l${move[0]},${move[1]}`;
  return `<div class="chart ${active ? 'is-active' : ''}"><div class="chart-topline"><span><span class="status-dot"></span> ${active ? q.title : 'УЧЕБНАЯ АКВАТОРИЯ'}</span><div class="chart-controls">${active && session.phase === 'question' ? `<button data-action="pause" aria-label="${session.paused ? 'Продолжить' : 'Пауза'}">${icon(session.paused ? 'play' : 'pause')}</button>` : `<span>${active ? 'РАЗБОР' : 'ВИД СВЕРХУ'}</span>`}</div></div>
    <svg class="sea-chart" viewBox="0 0 800 480" role="img" aria-label="${q.detail} Зелёное судно — ваше, оранжевое — другое. Носы судов и пунктир показывают направления движения."><defs><pattern id="sea-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#c5d4c6" stroke-width=".65"/></pattern><pattern id="sea-grid-small" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".6" fill="#b7cbbc" opacity=".5"/></pattern><marker id="own-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="m0 0 6 3-6 3" fill="none" stroke="#286453" stroke-width="1.3"/></marker><marker id="other-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="m0 0 6 3-6 3" fill="none" stroke="#bf653d" stroke-width="1.3"/></marker></defs><rect width="800" height="480" fill="url(#sea-grid-small)"/><rect width="800" height="480" fill="url(#sea-grid)"/>
    <g class="chart-contours"><path d="M-40 345c130-4 45-190 132-231S124 9 187-25M-24 405c163-16 80-211 147-257S168 39 218-21M650 510c-17-96 124-65 109-177s70-134 86-138M697 510c-22-91 122-63 103-169"/></g>
    <g class="range-rings"><circle cx="400" cy="240" r="82"/><circle cx="400" cy="240" r="160"/><circle cx="400" cy="240" r="238"/><path d="M400 225v30m-15-15h30"/></g>
    <g class="compass-rose" transform="translate(72 75)"><circle r="27"/><path d="M0-23 6 8 0 3-6 8Z" fill="#315d4c" stroke="none"/><path d="M0 23V9M-23 0h11M23 0H12"/><text y="-36" text-anchor="middle">N</text><text x="38" y="4" text-anchor="middle">E</text><text x="-38" y="4" text-anchor="middle">W</text><text y="43" text-anchor="middle">S</text></g>
    <path class="course-line own-course" d="${track(g.own, g.ownMove)}" marker-end="url(#own-arrow)"/><path class="course-line target-course" d="${track(g.target, g.targetMove)}" marker-end="url(#other-arrow)"/>
    <circle class="meeting-ring" cx="${400 + g.own[0] + g.ownMove[0]}" cy="${240 + g.own[1] + g.ownMove[1]}" r="22"/>
    <g transform="translate(${own})">${ship('#225e4c', 'ВАШЕ СУДНО', 'own-ship', g.ownMove)}</g><g transform="translate(${target})">${ship('#ce784c', 'ДРУГОЕ СУДНО', 'target-ship', g.targetMove)}</g>
    <text class="chart-coordinate" x="25" y="458">COLREG / УЧЕБНАЯ СХЕМА</text><text class="chart-coordinate" x="775" y="458" text-anchor="end">КУРС ${String(Math.round(heading(g.ownMove))).padStart(3, '0')}°</text></svg>
    ${!active ? '<div class="demo-caption"><span>01 / ПЕРЕСЕЧЕНИЕ КУРСОВ</span><strong>Увидели судно справа.<br>Уже знаете, что делать?</strong></div>' : `<div class="chart-timer ${mode === 'practice' ? 'practice-timer' : ''}"><span>${mode === 'practice' ? 'БЕЗ СПЕШКИ' : 'ВРЕМЯ НА РЕШЕНИЕ'}</span><b id="timer-value">${mode === 'practice' ? '∞' : `${Math.ceil(session.remaining)} с`}</b>${mode === 'watch' ? `<div class="timer-track"><i id="timer-fill" style="width:${session.remaining / session.limit * 100}%"></i></div>` : ''}</div>${q.alert ? `<div class="chart-alert">${q.alert}</div>` : ''}`}
    ${active && session.paused ? `<div class="pause-overlay"><span>${icon('pause')}</span><h3>Вахта на паузе</h3><p>Продолжим, когда будете готовы.</p><button class="primary-button" data-action="pause">Продолжить ${icon('play')}</button></div>` : ''}
    </div>`;
}

function start() {
  session = { phase: 'question', question: null, options: [], rotation: 0, history: [], retries: [], answers: [], lives: 3, score: 0, streak: 0, maxStreak: 0, paused: false, elapsed: 0, remaining: 21, limit: 21, lastTick: 0 };
  ask();
  document.querySelector('.training-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ask() {
  const s = session;
  s.question = nextScenario(progress, topic, s.history, s.retries);
  s.retries = s.retries.filter(item => item.id !== s.question.id);
  s.limit = timeLimit(s.history.length);
  s.remaining = s.limit;
  s.elapsed = 0;
  s.rotation = Math.floor(Math.random() * 8) * 45;
  s.options = shuffle(s.question.options);
  s.history.push(s.question.id);
  s.phase = 'question';
  s.paused = false;
  render();
  document.querySelector('.answer-button')?.focus({ preventScroll: true });
}

function tick(now) {
  if (!session || session.phase !== 'question' || session.paused || page !== 'trainer') return;
  const s = session;
  const delta = Math.max(0, (now - s.lastTick) / 1000);
  s.lastTick = now;
  s.elapsed += delta;
  if (mode === 'watch') {
    s.remaining = Math.max(0, s.remaining - delta);
    const timer = document.querySelector('#timer-value');
    if (timer) timer.textContent = `${Math.ceil(s.remaining)} с`;
    const fill = document.querySelector('#timer-fill');
    if (fill) { fill.style.width = `${s.remaining / s.limit * 100}%`; fill.classList.toggle('urgent', s.remaining < 5); }
    const g = geometryFor(s.question.geometry, s.rotation);
    const percent = Math.min(0.72, (1 - s.remaining / s.limit) * 0.72);
    for (const [id, start, move] of [['own-ship', g.own, g.ownMove], ['target-ship', g.target, g.targetMove]]) {
      document.getElementById(id)?.parentElement.setAttribute('transform', `translate(${400 + start[0] + move[0] * percent},${240 + start[1] + move[1] * percent})`);
    }
    if (s.remaining <= 0) { answer(null); return; }
  }
  frame = requestAnimationFrame(tick);
}

function answer(id) {
  const s = session;
  if (!s || s.phase !== 'question' || s.paused) return;
  cancelAnimationFrame(frame);
  const correct = id === 'correct';
  s.lastCorrect = correct;
  s.timedOut = id === null;
  s.streak = correct ? s.streak + 1 : 0;
  s.maxStreak = Math.max(s.maxStreak, s.streak);
  s.lastPoints = correct ? 100 + (mode === 'watch' ? Math.round(s.remaining / s.limit * 50) : 0) + Math.min(5, s.streak - 1) * 10 : 0;
  s.score += s.lastPoints;
  if (!correct) {
    if (mode === 'watch') s.lives--;
    s.retries.push({ id: s.question.id, at: s.history.length + Math.min(2, poolFor(topic).length - 1) });
  }
  s.answers.push({ id: s.question.id, correct, seconds: s.elapsed });
  progress = recordAnswer(progress, s.question.id, correct, s.elapsed);
  persist();
  s.phase = 'feedback';
  render();
}

function pause() {
  if (!session || session.phase !== 'question') return;
  session.paused = !session.paused;
  render();
}

function resume() {
  if (!session || session.phase !== 'question') return;
  session.paused = false;
  render();
}

function finish() {
  if (!session || session.phase === 'results') return;
  cancelAnimationFrame(frame);
  if (session.answers.length) {
    progress.sessions++;
    progress.bestScore = Math.max(progress.bestScore, session.score);
    persist();
  }
  session.phase = 'results';
  render();
  document.querySelector('.results-title')?.focus({ preventScroll: true });
}

function resultsMarkup() {
  const s = session;
  const correct = s.answers.filter(a => a.correct);
  const errors = [...new Set(s.answers.filter(a => !a.correct).map(a => a.id))];
  const mean = correct.length ? correct.reduce((sum, a) => sum + a.seconds, 0) / correct.length : 0;
  return `<div class="results"><div class="results-lead"><span class="results-emblem">${icon(s.lives > 0 ? 'compass' : 'reset')}</span><p class="eyebrow">${s.answers.length >= 10 ? 'ВАХТА ЗАВЕРШЕНА' : s.lives <= 0 ? 'ПОРА РАЗОБРАТЬ ОШИБКИ' : 'ВАХТА ОКОНЧЕНА ДОСРОЧНО'}</p><h2 class="results-title" tabindex="-1">${correct.length === 10 ? 'Чистая вахта!' : s.lives <= 0 ? 'Следующая будет увереннее.' : 'Ещё на шаг увереннее.'}</h2><p>Каждое узнавание — часть будущего навыка.</p><div class="result-stats"><div><strong>${correct.length}<small> / ${s.answers.length}</small></strong><span>верных решений</span></div><div><strong>${s.score}</strong><span>очков за вахту</span></div><div><strong>${correct.length ? formatTime(mean) : '—'}</strong><span>среднее время верного ответа</span></div></div><div class="results-actions"><button class="primary-button" data-action="start">Ещё одна вахта ${icon('arrow')}</button><button class="secondary-button" data-action="lobby">К выбору темы</button></div></div><div class="results-review"><p class="small-kicker">${errors.length ? 'СТОИТ ПОВТОРИТЬ' : 'ХОД ВАХТЫ'}</p>${errors.length ? errors.map(id => { const q = SCENARIOS.find(q => q.id === id); return `<button class="review-item" data-action="rule" data-rule="${q.rules[0]}"><span class="review-rule">${q.rules[0]}</span><span><strong>${q.title}</strong><small>${q.answer}</small></span>${icon('arrow')}</button>`; }).join('') : '<p>Продолжайте со смешанными ситуациями: направление вашего курса меняется от задания к заданию.</p>'}<p class="results-note">Закреплено ${masteredCount(progress)} из 12 ситуаций.<br>Для закрепления нужны три верных ответа подряд на каждую.</p></div></div>`;
}

function renderRules() {
  shell(`${courseGame.state?.phase==='question'?'<div class="return-to-game"><button data-page="drill">← Продолжить тренировку</button></div>':''}${libraryMarkup(selectedRule)}`);
}

function ruleMarkup(rule) {
  return `${rule ? `<div class="rule-summary"><span class="source-kind">Учебный пересказ</span><p>${rule.body}</p><p class="rule-note">${rule.note}</p></div>` : ''}${fullRuleMarkup(rule?.id || selectedRule)}`;
}

function renderProgress() {
  const total = progress.totalAnswers;
  const accuracy = total ? Math.round(progress.totalCorrect / total * 100) : 0;
  shell(`<section class="subpage-intro"><p class="eyebrow">ВАШ СУДОВОЙ ЖУРНАЛ</p><h1>Уверенность<br>приходит с практикой.</h1><p>Прогресс хранится в этом браузере. Игровой журнал отмечает пройденные миссии. В дополнительной проверке знаний отметка «закреплено» требует трёх верных ответов подряд.</p></section><div class="course-progress-note"><strong>Проверка знаний: ${COURSE_CARDS.filter(q=>courseGame.progress[q.id]?.streak>=3).length} / ${COURSE_CARDS.length} вопросов закреплено</strong><button data-page="course">К тренировкам →</button></div><h2 class="journal-heading">Игровые миссии</h2><div class="arcade-progress-grid">${Object.entries(GAME_TYPES).map(([id,g])=>`<div><span>${g.name}</span><strong>${g.items.filter(t=>arcade.progress[`${g.prefix}-${t.id}`]?.wins).length}<small> / ${g.items.length}</small></strong><button class="text-button" data-start-game="${id}">Играть →</button></div>`).join('')}</div><h2 class="journal-heading">Архив тренировок со сближением судов</h2><div class="progress-summary"><div><span>ЗАКРЕПЛЕНО СИТУАЦИЙ</span><strong>${masteredCount(progress)}<small> / 12</small></strong></div><div><span>ТОЧНОСТЬ</span><strong>${total ? `${accuracy}%` : '—'}</strong></div><div><span>ЗАВЕРШЕНО ВАХТ</span><strong>${progress.sessions}</strong></div><div><span>ЛУЧШИЙ РЕЗУЛЬТАТ</span><strong>${progress.bestScore}</strong></div></div><div class="progress-list">${SCENARIOS.map(q => { const a = progress.attempts[q.id]; const count = a?.streak || 0; return `<div class="progress-row"><span class="progress-rule">${q.rules[0]}</span><div><strong>${q.title}</strong><small>${a ? `${a.correct} верно из ${a.seen} попыток` : 'Ещё не встречалась'}</small></div><span class="mastery-dots" aria-label="${count} из 3 верных ответов подряд">${[1, 2, 3].map(i => `<i class="${count >= i ? 'done' : ''}"></i>`).join('')}</span><span class="mastery-label">${count >= 3 ? 'Закреплено' : `${count} / 3`}</span></div>`; }).join('')}</div><div class="progress-actions"><button class="primary-button" data-action="home">Продолжить тренировку ${icon('arrow')}</button><button class="text-button" data-action="reset">Сбросить прогресс</button></div>`);
}

function showModal(content) {
  if(GAME_TYPES[page]&&arcade.state?.phase==='running'&&!arcade.state.paused){arcade.suspend();modalArcadeResume=true;}
  if(page==='drill' && courseGame.state?.phase==='question' && !courseGame.state.paused){courseGame.state.paused=true;courseGame.stopClock();modalCourseResume=true;stopSignal();}
  if (session?.phase === 'question' && !session.paused) { session.paused = true; cancelAnimationFrame(frame); modalResume = true; }
  document.querySelector('#modal-content').innerHTML = `<button class="modal-close" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button>${content}`;
  document.querySelector('#modal').showModal();
}

function how() {
  showModal(`<p class="eyebrow">ОДНА СИТУАЦИЯ ЗА РАЗ</p><h2 id="modal-title">Как принять вахту</h2><ol class="how-steps"><li><strong>Оцените сближение</strong><p>Ваше судно зелёное, другое — оранжевое. Нос судна и пунктир показывают направление движения. Север всегда сверху, а ваш курс меняется.</p></li><li><strong>Выберите обязанность</strong><p>Нажмите ответ или клавишу 1, 2, 3. В режиме «Вахта» корабли движутся, время постепенно сокращается; три ошибки завершают рейс.</p></li><li><strong>Разберите и повторите</strong><p>После ответа время останавливается. Ошибка возвращается после одного-двух других заданий, если в вахте осталось место. Три верных узнавания подряд закрепляют ситуацию.</p></li></ol><p class="modal-note">Пробел — пауза, Enter — следующее задание после разбора. При уходе из вкладки игра автоматически останавливается. «Без таймера» позволяет учиться в своём темпе.</p><button class="primary-button" data-action="close-modal">Понятно ${icon('check')}</button>`);
}

root.addEventListener('click', event => {
  const button = event.target.closest('button, a[data-action]');
  if (!button || button.disabled) return;
  if (button.dataset.page) {
    arcade.suspend();
    if (session?.phase === 'question') session.paused = true;
    if(courseGame.state?.phase==='question')courseGame.state.paused=true;
    page = button.dataset.page;
    history.replaceState(null,'',`#${page}`);
    render();window.scrollTo(0,0);
    return;
  }
  if(button.dataset.startGame){arcade.suspend();page=button.dataset.startGame;history.replaceState(null,'',`#${page}`);arcade.start(page);window.scrollTo(0,0);return;}
  if(button.dataset.viewRule){selectedRule=button.dataset.viewRule;page='rules';render();document.querySelector('.library-reader')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(button.dataset.startModule){page='drill';history.replaceState(null,'','#drill');courseGame.start(button.dataset.startModule,courseMode);window.scrollTo(0,0);return;}
  if(button.dataset.courseMode){courseMode=button.dataset.courseMode;render();return;}
  if(button.dataset.drillAnswer){courseGame.submit(button.dataset.drillAnswer);return;}
  if (button.dataset.mode) { mode = button.dataset.mode; session = null; render(); return; }
  if (button.dataset.topic) { topic = button.dataset.topic; session = null; render(); return; }
  if (button.dataset.answer) { answer(button.dataset.answer); return; }
  switch (button.dataset.action) {
    case 'home': event.preventDefault();arcade.suspend(); if(session?.phase==='question')session.paused=true;if(courseGame.state?.phase==='question')courseGame.state.paused=true;page='course';history.replaceState(null,'','#course');render();window.scrollTo(0,0);break;
    case 'drill-next': courseGame.next(); break;
    case 'drill-pause': courseGame.pause(); break;
    case 'play-signal': if(!playSignal(courseGame.state.question.sound))showModal('<h2 id="modal-title">Звук недоступен</h2><p>Используйте визуальную последовательность точек и тире.</p>');break;
    case 'start': start(); break;
    case 'pause': pause(); break;
    case 'next': session.lives <= 0 || session.history.length >= SESSION_LENGTH ? finish() : ask(); break;
    case 'finish': finish(); break;
    case 'lobby': session = null; render(); break;
    case 'how': how(); break;
    case 'conditions': showModal(`<p class="eyebrow">КОНТЕКСТ ПЕРВОЙ ВАХТЫ</p><h2 id="modal-title">Условия задачи</h2><p>${CONDITIONS}</p><p>Текст задания уточняет стадию сближения. На схеме показано направление движения, а не полноценная радиолокационная прокладка. Сближение и таймер — игровая условность; секунды не являются реальным временем до столкновения.</p><p class="modal-note">Здесь тренируем узнавание обязанностей. Выбор конкретного курса, скорости и безопасной дистанции требует полной оценки обстановки.</p>`); break;
    case 'about': page='sources';render();break;
    case 'rule': {
      selectedRule=button.dataset.rule;
      const doc=getDocument(selectedRule);
      if(!doc)break;
      const summary=RULES.find(item=>String(item.id)===String(selectedRule));
      showModal(`<h2 id="modal-title" class="sr-only">${doc.title}</h2>${ruleMarkup(summary)}`);
      break;
    }
    case 'close-modal': document.querySelector('#modal').close(); break;
    case 'reset': showModal('<p class="eyebrow">СУДОВОЙ ЖУРНАЛ</p><h2 id="modal-title">Начать с чистого листа?</h2><p>Локальная история ответов во всех тренировках, очки и закреплённые ситуации будут удалены из этого браузера.</p><div class="modal-actions"><button class="secondary-button" data-action="close-modal">Сохранить прогресс</button><button class="danger-button" data-action="confirm-reset">Сбросить</button></div>'); break;
    case 'confirm-reset': progress = emptyProgress(); persist(); session = null; courseGame.reset();courseGame.state=null; arcade.reset();render(); break;
  }
});

document.addEventListener('keydown', event => {
  if(page==='drill' && courseGame.state && !document.querySelector('#modal')?.open && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey){
    const s=courseGame.state;if(event.code==='Space' && s.phase==='question'){event.preventDefault();courseGame.pause();return;}
    if(['1','2','3'].includes(event.key)&&s.phase==='question'&&!s.paused){event.preventDefault();courseGame.submit(s.options[Number(event.key)-1].id);return;}
  }
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('#modal')?.open || page !== 'trainer' || !session) return;
  if (event.code === 'Space' && session.phase === 'question') { event.preventDefault(); pause(); }
  if (['1', '2', '3'].includes(event.key) && session.phase === 'question' && !session.paused) { event.preventDefault(); answer(session.options[Number(event.key) - 1].id); }
  if (event.key === 'Enter' && session.phase === 'feedback' && !event.target.closest('button, a')) { event.preventDefault(); session.lives <= 0 || session.history.length >= SESSION_LENGTH ? finish() : ask(); }
});
document.addEventListener('visibilitychange', () => { if(document.hidden&&GAME_TYPES[page]&&arcade.state?.phase==='running'&&!arcade.state.paused)arcade.pause(); if(document.hidden && page==='drill' && courseGame.state?.phase==='question'&&!courseGame.state.paused)courseGame.pause(); if (document.hidden && session?.phase === 'question' && !session.paused) { session.paused = true; render(); } });
window.addEventListener('pagehide', () => {arcade.suspend();cancelAnimationFrame(frame);courseGame.stopClock();stopSignal();});
root.addEventListener('input',event=>{if(event.target.matches('[data-library-search]'))document.querySelector('.library-toc').innerHTML=libraryTOC(event.target.value);});
root.addEventListener('change',event=>{if(event.target.matches('[data-library-picker]')){selectedRule=event.target.value;render();}});
function routeFromHash(){
  arcade.suspend();
  const hash=location.hash.slice(1);
  if(/^(rule-\d+|annex-[1-4])$/.test(hash)){selectedRule=hash.startsWith('rule-')?Number(hash.slice(5)):hash;page='rules';if(session?.phase==='question')session.paused=true;if(courseGame.state?.phase==='question')courseGame.state.paused=true;modalCourseResume=false;modalResume=false;}
  else if(['course','cards','bridge','lookout','lantern','whistle','trainer','rules','progress','sources','impressum','datenschutz'].includes(hash))page=hash;
}
window.addEventListener('hashchange',()=>{routeFromHash();render();});
routeFromHash();render();
