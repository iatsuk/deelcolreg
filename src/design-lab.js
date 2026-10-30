import { WATCH_OBSERVATIONS, watchFrame } from './design-encounter.js';
import { STORIES, createStory, act, inspect, result, storyScene, storyChoices } from './design-stories.js';
import { createIsland } from './design-island.js';
import { cabinetArt, radarArt } from './design-illustration.js';
import { RULE_TEXT, ANNEX_TEXT } from './rules-text.js';

const root=document.querySelector('#design-app');
const params=new URLSearchParams(location.search);
const STYLES={island:{no:'01',name:'Островная диорама',caption:'Объём, свет, исследование'},cabinet:{no:'02',name:'Каюта смотрителя',caption:'Рисунок, предметы, разговор'},signal:{no:'03',name:'Радиорубка',caption:'Радар, протокол, выбор реплики'}};
let style=Object.hasOwn(STYLES,params.get('style'))?params.get('style'):'island',state=createStory(params.get('role')||'watch'),world=null;
let radarMoment=watchFrame(Number(params.get('moment')??2)).index,showProposal=params.get('proposal')==='1',islandCamera=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ruleDoc=id=>[...RULE_TEXT,...ANNEX_TEXT].find(r=>String(r.id)===String(id));
const ruleLabel=id=>{const d=ruleDoc(id);return `${typeof id==='number'?`Правило ${id}`:'Приложение'}. ${d?.title||''}`;};
function nav(){return `<header class="lab-bar"><a class="lab-brand" href="./designs.html"><span aria-hidden="true">✳</span><b>ДЕЛЬНЫЙ МППСС</b><small>ДИЗАЙН-ПРОТОТИПЫ</small></a><nav aria-label="Выбрать визуальный прототип">${Object.entries(STYLES).map(([id,s])=>`<button data-style="${id}" class="${id===style?'active':''}" ${id===style?'aria-current="page"':''}><span>${s.no}</span> ${s.name}</button>`).join('')}</nav><button class="role-switch" data-ui="roles">${STORIES[state.id].roleShort} <span>⌄</span></button></header>`;}
function paragraphs(){const scene=storyScene(state),r=result(state);return [...(r&&!r.correct?[r.text]:[]),...scene.paragraphs].map(p=>`<p>${esc(p)}</p>`).join('');}
function title(){return storyScene(state).title;}
function choiceList(){return storyChoices(state);}
function dialogue(separatePrompt=false){
 const scene=storyScene(state),lines=separatePrompt&&!scene.end?scene.dialogue.slice(0,-1):scene.dialogue;
 return `<section class="quest-dialogue" aria-label="Разговор">${lines.map(line=>`<div class="dialogue-line ${line.speaker==='Вы'?'player-line':''}"><span>${esc(line.speaker)}</span><p>${esc(line.text)}</p></div>`).join('')}</section>`;
}
function decisionPrompt(){const scene=storyScene(state);if(scene.end)return '';const line=scene.dialogue.at(-1);return `<div class="decision-prompt"><span>${esc(line.speaker)}</span><p>${esc(line.text)}</p></div>`;}
function conversationHistory(){
 if(!state.history.length)return '';
 return `<details class="conversation-history"><summary>Разговор с начала · ${state.history.length} ${state.history.length===1?'решение':state.history.length<5?'решения':'решений'}</summary>${state.history.map(entry=>`<section>${entry.dialogue.map(line=>`<p><b>${esc(line.speaker)}:</b> ${esc(line.text)}</p>`).join('')}<p class="history-player ${entry.correct?'answer-correct':'answer-wrong'}"><b>Вы:</b> ${esc(entry.playerText)}</p><p class="history-feedback ${entry.correct?'answer-correct':'answer-wrong'}">${entry.correct?'✓ Верно. ':'✕ Ошибка. '}${esc(entry.text)}</p><button data-rule="${entry.rule}">${ruleLabel(entry.rule)} · ${entry.clause} ↗</button></section>`).join('')}</details>`;
}
function choices(kind='normal'){const list=choiceList();return `<div class="quest-choices ${kind}">${list.map((c,i)=>`<button data-choice="${c.id}"><span class="choice-index">${String(i+1).padStart(2,'0')}</span><span>${esc(c.text)}</span><i aria-hidden="true">↗</i></button>`).join('')}</div>`;}
function explanation(){const r=result(state);if(!r)return '';return `<details class="story-rule ${r.correct?'answer-correct':'answer-wrong'}" ${r.correct?'':'open'}><summary>${r.correct?'✓ Обоснование решения':'✕ Разбор ошибки'} <small>${r.clause}</small></summary><p>${esc(r.why)}</p><button data-rule="${r.rule}">${ruleLabel(r.rule)} · ${r.clause} <i>↗</i></button></details>`;}
function evidence(className=''){const s=STORIES[state.id];return `<div class="evidence-links ${className}">${s.evidence.map((e,i)=>`<button data-evidence="${e.id}" class="${state.evidence.includes(e.id)?'visited':''}"><span>${['⌁','◈','≋'][i]}</span>${e.name}<i>${state.evidence.includes(e.id)?'✓':'+'}</i></button>`).join('')}</div>`;}
function ending(){return state.stage==='closing'?'<div class="end-actions"><button class="new-role" data-ui="roles">Другая роль →</button><button data-ui="restart">Вернуться к началу эпизода</button></div>':'';}
function chartControls(worldMode=false){
 if(state.id!=='watch')return '<div class="chart-legend"><span>Схема условная. Материалы эпизода — по точкам на экране.</span></div>';
 const f=watchFrame(radarMoment);
 return `<div class="chart-controls ${worldMode?'world-controls':''}"><div class="chart-record"><span>ЗАПИСИ ВСТРЕЧИ</span><div role="group" aria-label="Выбрать время наблюдения">${WATCH_OBSERVATIONS.map((p,i)=>`<button data-moment="${i}" aria-pressed="${i===radarMoment}">${p.time}</button>`).join('')}</div><button data-ui="proposal" aria-pressed="${showProposal&&radarMoment===2}" ${radarMoment!==2?'disabled':''}>${radarMoment!==2?'Курс предложен в 22:10':showProposal?'Скрыть предлагаемый курс':'Показать предлагаемый курс'}</button></div><p class="chart-observation" aria-live="polite">${f.note}</p><div class="chart-key"><span><i class="key-track"></i>Пройденный путь</span><span><i class="key-heading"></i>Текущий курс</span><span><i class="key-proposal"></i>Предлагаемый манёвр</span></div></div>`;
}
function island(){
 const s=STORIES[state.id],watch=state.id==='watch';
 return `<main class="island-layout"><section class="island-world ${watch?'has-navigation':''}" aria-label="Островная сцена встречи"><div class="island-heading"><span>АРХИПЕЛАГ / ${watch?`ЗАПИСЬ ${watchFrame(radarMoment).time}`:s.clock}</span><h1>${s.location.replace(/ (?!.* )/,'<br>')}.</h1><p>У каждой встречи есть история.</p></div><canvas id="island-canvas" tabindex="0" aria-label="Изометрический остров с маяком. Потяните для поворота, прокрутите для масштаба. Треки и предлагаемый курс показаны на воде; точки открывают документы."></canvas><div class="island-world-note"><span>↔ ПОТЯНИТЕ, ЧТОБЫ ПОВЕРНУТЬ</span><button data-ui="camera">Сбросить ракурс ⟲</button></div><div class="island-world-bottom"><span>01 / ЖИВОЙ МИР</span><button data-evidence="conditions">Обстановка встречи <i>↗</i></button></div>${watch?chartControls(true):''}</section><aside class="island-quest"><div class="quest-scroll"><div class="quest-eyebrow"><span>${s.chapter}</span><span>${s.clock}</span></div><p class="player-role">ВЫ — ${s.role.toLocaleUpperCase('ru')}</p><h2>${title()}</h2><div class="quest-copy">${paragraphs()}</div>${dialogue(true)}${explanation()}${conversationHistory()}<div class="island-evidence"><div><span>МАТЕРИАЛЫ ВАХТЫ</span><small id="evidence-count">${state.evidence.length}/3</small></div>${evidence()}</div></div><div class="quest-actions">${decisionPrompt()}${choices()}${ending()}</div></aside></main>`;
}
function cabinet(){const s=STORIES[state.id];return `<main class="cabinet-layout"><section class="cabinet-stage" aria-label="Рисованная сцена каюты"><div class="cabinet-page-number">ПОВЕСТЬ О ВАХТЕ<br><strong>III</strong></div>${cabinetArt(state.id)}<div class="cabinet-stage-label"><span>${s.location.toLocaleUpperCase('ru')}</span><i>${s.clock}</i></div><span class="cabinet-look">Предметы помнят больше, чем кажется.</span></section><section class="cabinet-page"><div class="cabinet-narration"><div class="cabinet-running"><span>${s.chapter}</span><i>${s.role}</i></div><h1>${title()}</h1><div class="quest-copy">${paragraphs()}</div>${explanation()}</div><div class="cabinet-decisions">${dialogue()}${choices('written')}${ending()}${conversationHistory()}${evidence('cabinet-items')}</div></section></main>`;}
function signal(){const s=STORIES[state.id],list=choiceList();return `<main class="signal-layout"><section class="signal-board"><div class="signal-heading"><span>ДЕЛЬНЫЙ / МППСС</span><h1>ПРОТОКОЛ<br><b>${String(s.rule).padStart(2,'0')}</b><i>_</i></h1><p>${s.location.toLocaleUpperCase('ru')} / ${s.clock}</p></div>${radarArt(state.id,{moment:radarMoment,proposal:showProposal})}${chartControls()}<div class="signal-live"><i></i> ЖУРНАЛ НАБЛЮДЕНИЙ<span>UTC + СУДОВОЕ ВРЕМЯ</span></div><div class="signal-evidence">${evidence()}</div></section><section class="signal-console"><div class="signal-stamp"><span>${s.stamp}</span><b>${state.node==='opening'?'ОЖИДАЕТ РЕШЕНИЯ':state.stage==='playing'?'РАЗГОВОР ПРОДОЛЖАЕТСЯ':'ЭПИЗОД ЗАВЕРШЁН'}</b></div><article class="signal-card" id="signal-card" ${state.node==='opening'?'tabindex="0" aria-label="Карточка эпизода. Потяните влево для первой реплики, вправо для второй."':''}><div class="signal-card-header"><span>${s.role.toLocaleUpperCase('ru')}</span><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"/><path d="m18 6 7 22-7-6-7 6Z" fill="currentColor"/></svg></div><h2>${title()}</h2><div class="quest-copy">${paragraphs()}</div>${dialogue()}${state.node==='opening'?`<div class="signal-quoted">Выберите реплику.</div><div class="swipe-label left"><span>←</span>${s.choices[0].short}</div><div class="swipe-label right">${s.choices[1].short}<span>→</span></div>`:explanation()}</article>${state.node==='opening'?`<div class="signal-gestures"><span>← ${s.choices[0].short}</span><span>${s.choices[1].short} →</span></div><p class="gesture-help">Потяните карточку — выберите реплику.</p><div class="signal-direct">${s.choices.map((c,i)=>`<button data-choice="${c.id}"><span>0${i+1}</span>${c.text}</button>`).join('')}</div>`:choices('terminal')}${ending()}${conversationHistory()}<div class="signal-footer">СИТУАЦИЯ СОХРАНЯЕТСЯ ПРИ СМЕНЕ ДИЗАЙНА <span>●</span></div></section></main>`;}
function render(){
 if(world)islandCamera=world.getCamera();world?.destroy();world=null;document.body.dataset.design=style;
 root.innerHTML=`${nav()}${style==='island'?island():style==='cabinet'?cabinet():signal()}<footer class="lab-footer"><span>Фрагмент текстового квеста · оригинальная программная графика</span><div><a href="./campaign.html">Сюжетное демо: До первого света →</a><button data-ui="restart">Начать эпизод заново</button><button data-ui="about">О прототипах</button></div></footer><dialog id="lab-dialog" aria-labelledby="dialog-title"><button class="dialog-close" data-ui="close" aria-label="Закрыть">×</button><div id="dialog-body"></div></dialog>`;
 if(style==='island')world=createIsland(document.querySelector('#island-canvas'),{onInspect:openEvidence,getState:()=>({...state,observationIndex:radarMoment,showProposal}),camera:islandCamera});
 if(style==='signal')attachSwipe();
 attachDialogDismiss();
 const url=new URL(location.href);url.searchParams.set('style',style);url.searchParams.set('role',state.id);url.searchParams.delete('view');url.searchParams.set('moment',radarMoment);url.searchParams.set('proposal',showProposal?'1':'0');history.replaceState(null,'',url);
}
function attachDialogDismiss(){
 const d=document.querySelector('#lab-dialog');let beganOutside=false;
 const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 d.addEventListener('pointerdown',e=>{beganOutside=e.target===d&&outside(e);});
 d.addEventListener('pointerup',e=>{if(beganOutside&&e.target===d&&outside(e))d.close();beganOutside=false;});
}
function modal(title,body,kicker='МАТЕРИАЛЫ ВАХТЫ'){
 document.querySelector('#dialog-body').innerHTML=`<span class="dialog-kicker">${kicker}</span><h2 id="dialog-title">${esc(title)}</h2>${body}`;
 const d=document.querySelector('#lab-dialog');if(!d.open)d.showModal();
}
function openEvidence(id){const e=STORIES[state.id].evidence.find(e=>e.id===id);if(!e)return;inspect(state,id);for(const b of root.querySelectorAll(`[data-evidence="${id}"]`)){b.classList.add('visited');const mark=b.querySelector('i');if(mark)mark.textContent='✓';}const count=document.querySelector('#evidence-count');if(count)count.textContent=`${state.evidence.length}/3`;modal(e.name,`<p>${esc(e.text)}</p><button class="dialog-back" data-ui="close">Вернуться в сцену →</button>`,e.kind);}
function openRule(id){const d=ruleDoc(id);if(!d)return;modal(ruleLabel(id),`<p class="rule-edition">Полный текст в игре${Number(id)===(result(state)?.rule??STORIES[state.id].rule)?` · ${result(state)?.clause??STORIES[state.id].clause}`:''}</p><div class="normative-text">${d.html}</div>`, 'ОСНОВАНИЕ РЕШЕНИЯ');}
function showRoles(){modal('Одна теория — разные роли',`<p>Это три отдельных ролевых шаблона. Выберите, чьё решение принять. Оформление останется тем же.</p><div class="role-list">${Object.values(STORIES).map(s=>`<button data-story="${s.id}"><small>${s.role}</small><strong>${s.title}</strong><span>${s.id==='watch'?'Что сохраняется после смены взаимного положения':s.id==='electric'?'Какая скорость должна управлять огнями':'Что опознавательный сигнал меняет — и чего не меняет'}</span><i>↗</i></button>`).join('')}</div>`,'ДРУГАЯ РОЛЬ');}
function choose(id){if(!act(state,id))return;render();document.querySelector('.quest-scroll')?.scrollTo({top:0,behavior:'instant'});}
root.addEventListener('click',e=>{
 const ruleLink=e.target.closest('a[href^="#rule-"],a[href^="#annex-"]');if(ruleLink){e.preventDefault();const hash=ruleLink.getAttribute('href').slice(1);openRule(hash.startsWith('rule-')?Number(hash.slice(5)):hash);return;}
 const inspectTarget=e.target.closest('[data-inspect]');if(inspectTarget){openEvidence(inspectTarget.dataset.inspect);return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.style){style=b.dataset.style;render();return;}
 if(b.dataset.story){state=createStory(b.dataset.story);radarMoment=2;showProposal=false;render();return;}
 if(b.dataset.moment!==undefined){radarMoment=Number(b.dataset.moment);render();return;}
 if(b.dataset.evidence){openEvidence(b.dataset.evidence);return;}
 if(b.dataset.rule){openRule(Number(b.dataset.rule));return;}
 if(b.dataset.choice){choose(b.dataset.choice);return;}
 switch(b.dataset.ui){
  case 'close':document.querySelector('#lab-dialog').close();break;
  case 'roles':showRoles();break;
  case 'camera':world?.reset();break;
  case 'proposal':showProposal=!showProposal;render();break;
  case 'restart':state=createStory(state.id);radarMoment=2;showProposal=false;render();break;
  case 'about':modal('Три разных визуальных языка','<p><b>01. Островная диорама.</b> Исследование объёмной сцены: вращение, масштаб, предметы и судовой журнал. Ориентир — изометрические миры и пример маяка MetalForge.</p><p><b>02. Каюта смотрителя.</b> Рисованная театральная сцена, предметные улики и литературный диалог. Ориентиры — камерные приключения из ваших примеров.</p><p><b>03. Радиорубка.</b> Строгая схема, минимум цвета, выбор реплики жестом. Ориентиры — информационная ясность Defcon и карточный жест Reigns.</p><p>Все иллюстрации и объёмные предметы в этих прототипах отрисовываются кодом. Картинки из предыдущих генераций не используются. Это фрагменты дизайна с ветвлением, не готовая кампания.</p><p>Треки, текущие курсы и предлагаемый манёвр доступны на острове. «Радиорубка» сохранена как отдельный вариант оформления для сравнения.</p><p><a href="./index.html#sources">МППСС и источники внутри проекта</a> · <a href="https://forcesail.ru/sealaw/lawlib/mppss">ForceSail</a> · <a href="./index.html#impressum">Impressum</a> · <a href="./index.html#datenschutz">Datenschutz</a></p>','ДИЗАЙН-ЛАБОРАТОРИЯ');break;
 }
});
root.addEventListener('keydown',e=>{const target=e.target.closest('[data-inspect]');if(target&&['Enter',' '].includes(e.key)){e.preventDefault();openEvidence(target.dataset.inspect);}});
document.addEventListener('keydown',e=>{
 if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||document.querySelector('#lab-dialog')?.open)return;
 const list=choiceList();if(['1','2','3'].includes(e.key)&&list[Number(e.key)-1]){e.preventDefault();choose(list[Number(e.key)-1].id);}
 else if(style==='signal'&&state.node==='opening'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();choose(STORIES[state.id].choices[e.key==='ArrowLeft'?0:1].id);}
});
function attachSwipe(){
 if(state.node!=='opening')return;const card=document.querySelector('#signal-card');let drag=null;
 card.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;drag={x:e.clientX,y:e.clientY,dx:0};card.setPointerCapture(e.pointerId);});
 card.addEventListener('pointermove',e=>{if(!drag)return;drag.dx=e.clientX-drag.x;const dx=Math.max(-190,Math.min(190,drag.dx));card.style.transform=`translateX(${dx*.55}px) rotate(${dx*.035}deg)`;card.dataset.swipe=dx<0?'left':'right';card.style.setProperty('--swipe',Math.min(1,Math.abs(dx)/90));});
 card.addEventListener('pointerup',()=>{if(!drag)return;const dx=drag.dx;drag=null;if(Math.abs(dx)>90)choose(STORIES[state.id].choices[dx<0?0:1].id);else{card.style.transform='';card.dataset.swipe='';card.style.setProperty('--swipe',0);}});
 card.addEventListener('pointercancel',()=>{drag=null;card.style.transform='';card.dataset.swipe='';});
}
render();
