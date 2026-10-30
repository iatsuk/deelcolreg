import { CHAPTERS, ENCOUNTERS, CONVERSATIONS } from './campaign-data.js';
import { SAVE_KEY, createCampaign, campaignScene, answer, continueCampaign, talk, useReference, stats, startReview, reviewCase, answerReview, nextReview, serializeCampaign, restoreCampaign } from './campaign-engine.js';
import { createIsland } from './design-island.js';
import { watchFrame, WATCH_OBSERVATIONS } from './design-encounter.js';
import { RULE_TEXT, ANNEX_TEXT } from './rules-text.js';

const root=document.querySelector('#campaign-app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const doc=id=>[...RULE_TEXT,...ANNEX_TEXT].find(r=>String(r.id)===String(id));
const label=id=>(typeof id==='number'?'Правило '+id:'Приложение')+'. '+(doc(id)?.title||'');
let saved=null,storageOK=true;
try{saved=restoreCampaign(localStorage.getItem(SAVE_KEY));}catch{storageOK=false;}
let state=saved||createCampaign(),world=null,camera=null,moment=2,proposal=false,audio=null,readingObserver=null;
let saveNote=saved?'Рейс восстановлен':'Сохраняется в этом браузере';
function persist(){try{localStorage.setItem(SAVE_KEY,serializeCampaign(state));saveNote='Прогресс сохранён';}catch{storageOK=false;saveNote='Сохранение недоступно · рейс работает до закрытия страницы';}}
function lines(dialogue){return dialogue.map(l=>'<div class="dialogue-line"><span>'+esc(l.speaker)+'</span><p>'+esc(l.text)+'</p></div>').join('');}
function header(scene){return '<header class="campaign-bar"><a class="lab-brand" href="./campaign.html"><span aria-hidden="true">✳</span><b>ДЕЛЬНЫЙ МППСС</b><small>СЮЖЕТНОЕ ДЕМО</small></a><div class="voyage-title">До первого света <span>ОДИН РЕЙС / ПЯТЬ ГЛАВ</span></div><nav aria-label="Materials"><a class="world-entry" href="./world.html">&#1040;&#1088;&#1093;&#1080;&#1087;&#1077;&#1083;&#1072;&#1075; &#8599;</a><button data-ui="route">Маршрут <small>'+String(scene.chapter+1).padStart(2,'0')+'/05</small></button><button data-ui="journal">Журнал</button><button data-ui="library">МППСС</button><button data-ui="about">О демо</button></nav></header>';}
function controls(scene){
 if(scene.visual==='watch')return '<div class="sea-record"><div class="sea-times"><span>ЗАПИСИ ВСТРЕЧИ</span>'+WATCH_OBSERVATIONS.map((f,i)=>'<button data-moment="'+i+'" aria-pressed="'+(i===moment)+'">'+f.time+'</button>').join('')+'<button class="proposal" data-ui="proposal" '+(moment!==2?'disabled':'')+' aria-pressed="'+proposal+'">'+(proposal?'Скрыть':'Показать')+' предложенный курс</button></div><p>'+watchFrame(moment).note+'</p><small>Линия — пройденный путь · Стрелка — текущий курс · Пунктир — предложение</small></div>';
 const enc=ENCOUNTERS[scene.visual]||ENCOUNTERS.finish;
 return '<div class="sea-record"><span class="record-tag">'+(enc.fog?'ВИДИМОСТЬ ОГРАНИЧЕНА / КОНТАКТЫ РЛС':'ОБСТАНОВКА')+'</span><p>'+esc(enc.description)+'</p>'+(enc.observations?'<div class="observation-strip">'+enc.observations.map(o=>'<span><b>'+o[0]+'</b> '+o[1]+' / '+o[2]+'</span>').join('')+'</div>':'')+'<small>Схематическая запись · размеры судов увеличены для читаемости</small></div>';
}
function routeRail(scene){return '<div class="route-rail" aria-label="Главы рейса">'+CHAPTERS.map((c,i)=>'<button data-ui="route" class="'+(i===scene.chapter?'current':i<scene.chapter?'passed':'')+'" '+(i===scene.chapter?'aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><b>'+esc(c.title)+'</b><i>'+esc(c.time)+'</i></button>').join('')+'</div>';}
function feedback(p){
 return '<section class="answer-feedback '+(p.correct?'correct':'wrong')+'" aria-label="Результат решения"><div class="verdict" role="status">'+(p.correct?'✓ Верно':'✕ Ошибка')+(p.assisted?' <small>с обращением к справочнику</small>':'')+'</div><p>'+esc(p.why)+'</p><button class="text-link" data-rule="'+p.rule+'">'+esc(label(p.rule))+' · '+esc(p.clause)+' ↗</button><div class="story-consequence"><span>ЧТО ПРОИСХОДИТ ДАЛЬШЕ</span><p>'+esc(p.feedback)+'</p></div></section>';
}
function choiceButtons(scene,pending){
 return '<div class="quest-choices campaign-choices">'+scene.choices.map((c,i)=>{
  const selected=pending?.choice===c.id;if(pending&&!selected&&!c.correct)return '';const clazz=pending?(selected?(c.correct?'selected-correct':'selected-wrong'):c.correct?'revealed-correct':'muted-choice'):'';
  return '<button data-choice="'+esc(c.id)+'" class="'+clazz+'" '+(pending?'disabled':'')+'><span class="choice-index">'+(pending?(c.correct?'✓':selected?'✕':'·'):String(i+1).padStart(2,'0'))+'</span><span>'+esc(c.text)+'</span></button>';
 }).join('')+'</div>';
}
function summary(){
 const x=stats(state),r=state.review;
 return '<div class="voyage-results"><span>СУДОВОЙ ЖУРНАЛ</span><h3>Рейс завершён</h3><div class="result-numbers"><div><b>'+x.decisions+'</b><small>решений</small></div><div><b>'+x.correct+'</b><small>верно без справочника</small></div><div><b>'+x.errors+'</b><small>ошибок</small></div></div><p>Обращений к справочнику до ответа: '+x.assisted+'. Разговоров с экипажем: '+state.talks.length+'/5.</p>'+(r?.done?'<p class="review-result">Новые случаи: '+r.answers.filter(a=>a.correct).length+' из '+r.answers.length+' верно. Это результат короткой проверки, а не отметка полного освоения.</p>':'<p>В разборе — до трёх новых случаев по ошибкам и ответам с подсказкой. Если их нет, будут контрольные ситуации.</p>')+'</div>';
}
function tools(scene){const c=CONVERSATIONS.find(c=>c.chapter===scene.chapter);
 return '<div class="scene-tools"><button data-ui="conditions">Бортовой журнал</button>'+(c?'<button data-talk="'+c.flag+'">'+esc(c.speaker)+(state.talks.includes(c.flag)?' · перечитать':' · поговорить')+'</button>':'')+'</div>';
}
function render(){
 const scene=campaignScene(state),r=reviewCase(state),pending=state.pending;
 if(world)camera=world.getCamera();world?.destroy();readingObserver?.disconnect();
 document.body.dataset.design='island';
 const reviewMode=!!r,ending=scene.end&&!reviewMode,shownTitle=reviewMode?'После рейса: новый случай':scene.title;
 let body='';
 if(reviewMode){body='<p class="review-count">СЛУЧАЙ '+(state.review.index+1)+' / '+state.review.ids.length+'</p><div class="quest-copy"><p>'+esc(r.prompt)+'</p></div>';if(state.review.pending)body+=feedback({...state.review.pending,why:r.why,rule:r.rule,clause:r.clause,feedback:'Разбор записан отдельно от решений основной истории.'});}
 else if(pending)body=feedback(pending)+'<details class="scene-reread"><summary>Перечитать сцену и разговор</summary><div class="quest-copy">'+scene.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>'+lines(scene.dialogue)+'</details>';
 else body='<div class="quest-copy">'+scene.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div><section class="quest-dialogue" aria-label="Разговор">'+lines(ending?scene.dialogue:scene.dialogue.slice(0,-1))+'</section>'+(ending?summary():tools(scene));
 let actions='';
 if(reviewMode){
  actions='<div class="quest-choices campaign-choices">'+r.choices.map((c,i)=>'<button data-review="'+c.id+'" class="'+(state.review.pending?(c.correct?'revealed-correct':state.review.pending.choice===c.id?'selected-wrong':'muted-choice'):'')+'" '+(state.review.pending?'disabled':'')+'><span class="choice-index">'+(state.review.pending?(c.correct?'✓':state.review.pending.choice===c.id?'✕':'·'):String(i+1).padStart(2,'0'))+'</span><span>'+esc(c.text)+'</span></button>').join('')+'</div>'+(state.review.pending?'<button class="continue-button" data-ui="review-next">Дальше в разборе →</button>':'');
 }else if(ending)actions=(state.review?'':'<button class="continue-button" data-ui="review">Разобрать новые случаи →</button>')+'<div class="end-links"><button data-ui="journal">Перечитать журнал</button><button data-ui="restart">Новый рейс</button></div>';
 else actions=(!pending?'<div class="decision-prompt"><span>'+esc(scene.dialogue.at(-1).speaker)+'</span><p>'+esc(scene.dialogue.at(-1).text)+'</p></div>':'')+choiceButtons(scene,pending)+(pending?'<button class="continue-button" data-ui="continue">'+(chapterEndsHere(scene)?'Продолжить рейс':'Продолжить разговор')+' →</button>':'')+(scene.signal&&!pending?'<div class="sound-tools"><button data-sound="long">▷ Один продолжительный</button><button data-sound="pair">▷ Два продолжительных</button><button data-ui="stop-sound">Стоп</button></div>':'');
 root.innerHTML=header(scene)+'<main class="campaign-layout"><section class="campaign-world" aria-label="Обстановка рейса"><div class="island-heading"><span>ГЛАВА '+String(scene.chapter+1).padStart(2,'0')+' / '+esc(scene.chapterInfo.time)+'</span><h1>'+esc(scene.chapterInfo.place)+'</h1><p>'+esc(scene.chapterInfo.goal)+'</p></div><canvas id="island-canvas" tabindex="0" aria-label="Изометрическая сцена. Потяните для поворота; колесо изменяет масштаб. Положение и треки судов подписаны."></canvas><div class="camera-hint"><span>↔ Повернуть · колесо — масштаб</span><button data-ui="camera">Сбросить ракурс</button></div>'+controls(scene)+routeRail(scene)+'</section><aside class="island-quest campaign-quest"><div class="quest-scroll"><div class="quest-eyebrow"><span>'+esc(scene.chapterInfo.title)+'</span><span>'+String(state.history.length).padStart(2,'0')+' РЕШЕНИЙ</span></div><p class="player-role">ВЫ — ВАХТЕННЫЙ ПОМОЩНИК «СМЕНЫ»</p><h2 tabindex="-1" id="scene-title">'+esc(shownTitle)+'</h2>'+body+'</div><div class="quest-actions"><button class="read-rest" data-ui="read-rest" hidden>Дочитать сцену ↓</button>'+actions+'</div></aside></main><footer class="campaign-footer"><span>'+esc(storageOK?saveNote:'Сохранение недоступно · прогресс только до закрытия страницы')+'</span><span>До первого света · демо 0.5</span><a href="./index.html#impressum">Источники и правовая информация</a></footer><dialog id="campaign-dialog" aria-labelledby="dialog-title"><button class="dialog-close" data-ui="close" aria-label="Закрыть">×</button><div id="dialog-body"></div></dialog>';
 world=createIsland(document.querySelector('#island-canvas'),{environment:scene.chapterInfo.environment,camera,onInspect:id=>id==='conditions'?conditions():id==='voice'?openTalk(CONVERSATIONS.find(c=>c.chapter===scene.chapter).flag):journal(),getState:()=>({reservedHeight:205,hotspots:[],id:scene.visual==='watch'?'watch':'campaign',observationIndex:moment,showProposal:proposal,encounter:scene.visual==='watch'?null:ENCOUNTERS[scene.visual]||ENCOUNTERS.finish})});
 const reading=document.querySelector('.campaign-quest .quest-scroll'),cue=root.querySelector('.read-rest');
 const updateReading=()=>{cue.hidden=reading.scrollHeight-reading.clientHeight-reading.scrollTop<12;cue.textContent=state.pending?'Дочитать разбор ↓':'Дочитать сцену и разговор ↓';};
 reading.addEventListener('scroll',updateReading,{passive:true});readingObserver=new ResizeObserver(updateReading);readingObserver.observe(reading);requestAnimationFrame(updateReading);
 const d=document.querySelector('#campaign-dialog');let outsideDown=false;
 const outside=e=>{const b=d.getBoundingClientRect();return e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom;};
 d.addEventListener('pointerdown',e=>outsideDown=e.target===d&&outside(e));d.addEventListener('pointerup',e=>{if(outsideDown&&e.target===d&&outside(e))d.close();outsideDown=false;});
}
function chapterEndsHere(scene){if(!state.pending)return false;return ['motor','watch-responsibility','standon','stopped','handover'].includes(scene.id);}
function modal(title,html,kicker='СУДОВЫЕ МАТЕРИАЛЫ'){
 document.querySelector('#dialog-body').innerHTML='<span class="dialog-kicker">'+esc(kicker)+'</span><h2 id="dialog-title">'+esc(title)+'</h2>'+html;
 const d=document.querySelector('#campaign-dialog');if(!d.open)d.showModal();
}
function conditions(){const s=campaignScene(state);modal('Запись обстановки','<p>'+esc(s.chapterInfo.note)+'</p><p>'+esc(s.visual==='watch'?watchFrame(moment).note:(ENCOUNTERS[s.visual]||ENCOUNTERS.finish).description)+'</p><p>'+esc(s.chapterInfo.goal)+'</p>','ГЛАВА '+(s.chapter+1));}
function openTalk(id){const c=CONVERSATIONS.find(c=>c.flag===id);if(!c)return;if(talk(state,id))persist();modal(c.topic,lines(c.lines),'РАЗГОВОР С ЭКИПАЖЕМ');}
function journal(){
 modal('Журнал «Смены»',state.history.length?state.history.map((e,i)=>'<details class="journal-entry '+(e.correct?'correct':'wrong')+'"><summary><span>'+String(i+1).padStart(2,'0')+'</span> '+esc(e.title)+' <b>'+(e.correct?'✓ Верно':'✕ Ошибка')+'</b></summary>'+lines(e.dialogue)+'<p><b>Вы:</b> '+esc(e.playerText)+'</p><p>'+esc(e.feedback)+'</p><p>'+esc(e.why)+'</p><button class="text-link" data-rule="'+e.rule+'">'+esc(label(e.rule))+' · '+esc(e.clause)+'</button>'+(e.assisted?'<small>С обращением к справочнику до ответа</small>':'')+'</details>').join('')+CONVERSATIONS.filter(c=>state.talks.includes(c.flag)).map(c=>'<details class="journal-entry"><summary>Разговор · '+esc(c.speaker)+' · '+esc(c.topic)+'</summary>'+lines(c.lines)+'</details>').join(''):'<p>После первого решения здесь появится запись разговора, ваше действие и объяснение.</p>','РЕШЕНИЯ И ИХ ОСНОВАНИЯ');
}
function openRule(id){
 const r=doc(id);if(!r)return;if(useReference(state))persist();
 modal(label(r.id),'<p class="rule-edition">Полный текст правила · нормативный корпус проекта</p><div class="normative-text">'+r.html+'</div><button class="dialog-back" data-ui="library">← К справочнику</button>','МППСС ВНУТРИ ИГРЫ');
}
function library(){modal('МППСС','<label class="rule-search">Номер или название<input type="search" id="rule-search" placeholder="Например: 13 или обгон"></label><div class="rule-library">'+[...RULE_TEXT,...ANNEX_TEXT].map(r=>'<button data-rule="'+r.id+'" data-search="'+esc((r.id+' '+r.title).toLocaleLowerCase('ru'))+'">'+esc(label(r.id))+'</button>').join('')+'</div>','СПРАВОЧНИК');}
function route(){const s=campaignScene(state);modal('Один рейс до маяка','<p>Груз: резервный блок питания. Получатель: смотритель Олег.</p><ol class="route-list">'+CHAPTERS.map((c,i)=>'<li class="'+(i===s.chapter?'current':i<s.chapter?'passed':'')+'"><span>'+c.time+' / '+esc(c.place)+'</span><h3>'+esc(c.title)+(i<s.chapter?' ✓':i===s.chapter?' · сейчас':'')+'</h3><p>'+esc(c.goal)+'</p></li>').join('')+'</ol>','МАРШРУТ «СМЕНЫ»');}
function about(){modal('До первого света','<p>Завершённая короткая история из пяти глав: наблюдение и скорость, передача вахты, взаимные обязанности, туман и огни траулера. Ошибки останавливает экипаж до исполнения; это условие этой учебной истории.</p><p>Варианты ответов перемешиваются в новом рейсе. Разбор предлагает новые случаи по ошибкам и ответам с подсказкой. При открытии справочника до ответа решение отмечается как выполненное с подсказкой.</p><p>Прогресс хранится в этом браузере. Данные не отправляются на сервер. Нажмите на фон или Escape, чтобы закрыть информационное окно.</p><p>Все сцены отрисованы через Canvas 2D. Масштаб и время условные; анимация не является расчётом безопасной дистанции. Это демонстрационная мини-кампания, не весь МППСС.</p><p>Русский нормативный корпус: <a href="https://forcesail.ru/sealaw/lawlib/mppss/" target="_blank" rel="noopener">ForceSail</a>. Ссылки на полный текст правил работают внутри игры. <a href="./index.html#sources">Редакционные сведения и источники</a>.</p><p><a href="./index.html#impressum">Impressum</a> · <a href="./index.html#datenschutz">Datenschutz</a> · <a href="./designs.html?style=island">Лаборатория дизайна</a></p>','О ДЕМО');}
function stopSound(){audio?.close();audio=null;}
function playSound(pair){
 stopSound();const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 audio=new Audio();const count=pair?2:1;
 for(let i=0;i<count;i++){const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*7;osc.type='sine';osc.frequency.value=220;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.12);gain.gain.setValueAtTime(.12,start+4.85);gain.gain.linearRampToValueAtTime(0,start+5);osc.connect(gain).connect(audio.destination);osc.start(start);osc.stop(start+5.02);}
}
function moveFocus(){document.querySelector('#scene-title')?.focus({preventScroll:true});}
root.addEventListener('click',e=>{
 const cross=e.target.closest('a[href^="#rule-"],a[href^="#annex-"]');
 if(cross){e.preventDefault();const h=cross.getAttribute('href').slice(1);openRule(h.startsWith('rule-')?Number(h.slice(5)):h);return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.choice){if(answer(state,b.dataset.choice)){stopSound();persist();render();moveFocus();}return;}
 if(b.dataset.review!==undefined){if(answerReview(state,b.dataset.review)){persist();render();moveFocus();}return;}
 if(b.dataset.rule){const id=Number.isNaN(Number(b.dataset.rule))?b.dataset.rule:Number(b.dataset.rule);openRule(id);return;}
 if(b.dataset.talk){openTalk(b.dataset.talk);return;}
 if(b.dataset.sound){playSound(b.dataset.sound==='pair');return;}
 if(b.dataset.moment!==undefined){moment=Number(b.dataset.moment);render();return;}
 switch(b.dataset.ui){
  case 'continue':if(continueCampaign(state)){persist();render();moveFocus();}break;
  case 'review':if(startReview(state)){persist();render();moveFocus();}break;
  case 'review-next':if(nextReview(state)){persist();render();moveFocus();}break;
  case 'camera':world.reset();break;
  case 'proposal':proposal=!proposal;render();break;
  case 'read-rest':{const el=document.querySelector('.campaign-quest .quest-scroll');el.scrollBy({top:el.clientHeight*.75,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});break;}
  case 'conditions':conditions();break;
  case 'journal':journal();break;
  case 'route':route();break;
  case 'library':library();break;
  case 'about':about();break;
  case 'close':document.querySelector('#campaign-dialog').close();break;
  case 'stop-sound':stopSound();break;
  case 'restart':modal('Начать новый рейс?','<p>Текущий журнал этого демо будет заменён новым рейсом. Варианты ответов перемешаются.</p><div class="restart-actions"><button data-ui="new-confirm">Начать новый рейс</button><button data-ui="close">Оставить текущий</button></div>','НОВЫЙ РЕЙС');break;
  case 'new-confirm':stopSound();state=createCampaign();moment=2;proposal=false;camera=null;persist();render();moveFocus();break;
 }
});
root.addEventListener('input',e=>{if(e.target.id==='rule-search'){const q=e.target.value.trim().toLocaleLowerCase('ru');for(const b of root.querySelectorAll('[data-search]'))b.hidden=!b.dataset.search.includes(q);}});
document.addEventListener('keydown',e=>{
 if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||document.querySelector('dialog')?.open||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
 if(['1','2','3'].includes(e.key)){const r=reviewCase(state),choices=r?r.choices:campaignScene(state).choices,c=choices[Number(e.key)-1];if(!c)return;e.preventDefault();const ok=r?answerReview(state,c.id):answer(state,c.id);if(ok){stopSound();persist();render();moveFocus();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSound();});
render();
