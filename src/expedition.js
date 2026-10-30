import {EXPEDITION_KEY,createExpedition,availableAt,startQuest,textChoices,chooseText,continueText,markHelp,finishText,textEnding,completeQuest,beginTravel,sailTo,advanceWorld,isAt,saveExpedition,restoreExpedition,commandMeeting,runMeeting,stepMeeting,recordMeeting,retryMeeting,inspectEvidence,gradeInvestigation,validatePackage,deliverReply} from './expedition-engine.js';
import {createWorldView} from './world-renderer.js';
import {PLACES,LAND,vec,norm,zoneAt,createWorld,stepWorld} from './world-engine.js';
import {RULE_TEXT,ANNEX_TEXT} from './rules-text.js';

const root=document.querySelector('#world-app'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const revision=new URL(import.meta.url).searchParams.get('v')||'local';
let catalog=[],s,view=null,screen='world',speed=1,paused=false,storageOK=true,lastSave=0,lastUI=0,audio=null,sound=false,ambientWorld=null;
const ports=PLACES.filter(p=>['port','lighthouse'].includes(p.id));
const active=()=>catalog.find(q=>q.id===s.session?.id);
const rule=id=>[...RULE_TEXT,...ANNEX_TEXT].find(r=>String(r.id)===String(id));
const ruleButtons=ids=>ids.map(id=>'<button class="rule-ref" data-rule="'+id+'">'+id+'. '+esc(rule(id)?.title)+'</button>').join('');
const clock=()=>{const m=Math.floor(s.minutes)%(24*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const save=()=>{try{localStorage.setItem(EXPEDITION_KEY,saveExpedition(s));}catch{storageOK=false;}lastSave=performance.now();};
const paragraphs=a=>(a||[]).map(p=>'<p>'+esc(p)+'</p>').join('');
const packageURL=path=>{const u=new URL(path,import.meta.url);u.searchParams.set('v',revision);return u;};

async function init(){
 const url=packageURL('../quests/catalog.json'),index=await getJSON(url);
 catalog=await Promise.all(index.packages.map(async path=>{const u=new URL(path,url);u.searchParams.set('v',revision);const q=await getJSON(u),errors=validatePackage(q);if(errors.length)throw Error(q.id+': '+errors.join(', '));q.media=Object.fromEntries(Object.entries(q.media).map(([k,v])=>{if(!['scene','music'].includes(k))return [k,v];const asset=new URL(v,u);asset.searchParams.set('v',revision);return [k,asset.href];}));return q;}));
 try{s=restoreExpedition(localStorage.getItem(EXPEDITION_KEY),catalog);}catch{storageOK=false;}
 s=s||createExpedition();sound=!!s.sound;screen=s.session?'quest':'world';render();
}
async function getJSON(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error('Не удалось загрузить '+url.pathname);return r.json();}
function shell(content,subtitle){
 view?.destroy();view=null;
 root.innerHTML='<header class="exp-bar"><a href="./expedition.html" class="exp-brand"><span>✳</span><div>ДЕЛЬНЫЙ МППСС<small>АРХИПЕЛАГ · ДЕМО 0.7</small></div></a><div class="exp-subtitle">'+esc(subtitle)+'</div><nav><button data-action="world">Архипелаг</button><button data-action="journal">Журнал</button><button data-action="library">МППСС</button><button data-action="sound" aria-pressed="'+sound+'">'+(sound?'♫ Звук вкл.':'♪ Звук выкл.')+'</button><button data-action="help" aria-label="Помощь и настройки">?</button></nav></header>'+content+'<dialog id="info-dialog" aria-labelledby="info-title"><button class="info-close" data-action="close" aria-label="Закрыть">×</button><div id="info-body"></div></dialog>';
 const d=document.querySelector('#info-dialog');let down=false;const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 d.addEventListener('pointerdown',e=>down=e.target===d&&outside(e));d.addEventListener('pointerup',e=>{if(down&&e.target===d&&outside(e))d.close();down=false;});
 d.addEventListener('close',()=>{if(screen==='quest'&&active()?.mode==='encounter')updateMeetingPanel();});
}
function render(){if(screen==='world')renderWorld();else renderQuest();save();}
function objective(){
 if(s.session)return {title:'Эпизод приостановлен',text:active().title+'. Состояние сохранено; можно продолжить с того же места.',button:'Продолжить эпизод',action:'resume'};
 if(s.flags.homecoming)return {title:'Свет до утра',text:'Первый рейс завершён. Маяк работает, письмо доставлено. Можно остаться в архипелаге или начать новый рейс с другой встречей.',button:'Итоги рейса',action:'journal'};
 if(s.flags.beaconRepaired)return {title:'Письмо на обратный берег',text:'Олег передал ответ Миле. Вернитесь в Старый порт — там закончится эта история.',button:isAt(s,'port')?'Передать письмо':'Курс в Старый порт',action:isAt(s,'port')?'homecoming':'route-port'};
 if(s.inventory.includes('power-unit'))return {title:'Запас до утра',text:isAt(s,'lighthouse')?'Олег ждёт у трапа. Заберите ящик и поднимитесь в аппаратную.':'Доставьте блок питания и письмо на Северный маяк. Путь выбираете вы.',button:isAt(s,'lighthouse')?'Подняться к Олегу':'Выбрать путь к маяку',action:isAt(s,'lighthouse')?'visit-lighthouse':'route-lighthouse'};
 return {title:'Мила держит причал',text:'На маяке заканчивается резерв питания. Взять заказ и принять судно можно у Милы в Старом порту.',button:isAt(s,'port')?'Поговорить с Милой':'Вернуться к Миле',action:isAt(s,'port')?'visit-port':'route-port'};
}
function renderWorld(){
 ambientWorld=createWorld(s.seed);ambientWorld.own={x:-70,z:-60,h:0,s:0,trail:[]};ambientWorld.lastSafe={x:-70,z:-60,h:0};ambientWorld.traffic=s.world.traffic;ambientWorld.time=s.world.ambientClock||0;
 const o=objective();shell('<main class="archipelago"><canvas id="hub-canvas" tabindex="0" aria-label="Изометрический архипелаг. Нажмите на воду для свободного плавания, на подпись причала для посещения."></canvas><div class="world-heading"><span>ПЕРВЫЙ РЕЙС</span><h1>Свет до утра</h1><p id="world-location"></p><button data-action="follow">⊙ Вернуться к судну</button></div><aside class="voyage-card"><span class="eyebrow">'+(s.flags.homecoming?'ИСТОРИЯ ЗАВЕРШЕНА':'БОРТОВОЕ ПОРУЧЕНИЕ')+'</span><h2>'+esc(o.title)+'</h2><p>'+esc(o.text)+'</p><button class="primary" data-action="'+o.action+'">'+esc(o.button)+' →</button><ol class="episode-list">'+catalog.map((q,i)=>'<li class="'+(s.completed[q.id]?'done':s.session?.id===q.id?'current':'')+'"><span>'+(s.completed[q.id]?'✓':'0'+(i+1))+'</span><div>'+esc(q.title)+'<small>'+({text:'Текстовый квест',encounter:'Управление расхождением',investigation:'Расследование'})[q.mode]+(s.completed[q.id]?.outcome==='retreated'?' · обходной путь':'')+'</small></div></li>').join('')+'</ol><div class="cargo-strip">'+(s.inventory.includes('power-unit')?'▣ Блок питания · письмо Милы':s.inventory.includes('oleg-reply')?'✉ Ответ Олега':s.flags.beaconRepaired?'✳ Маяк работает':'Трюм свободен')+'</div></aside><div class="travel-console"><div><strong id="world-clock">'+clock()+'</strong><span id="travel-status"></span></div><div class="time-controls"><button data-action="pause" aria-label="Приостановить переход">Ⅱ</button>'+[1,4,12].map(n=>'<button data-timescale="'+n+'" aria-pressed="'+(speed===n)+'">×'+n+'</button>').join('')+'</div><p id="world-notice" aria-live="polite"></p></div><aside class="chart-card"><span class="eyebrow">АРХИПЕЛАГ</span><div id="chart"></div><button data-action="visit-port">Старый порт ↗</button><button data-action="visit-lighthouse">Северный маяк ↗</button></aside><div class="world-caption">'+(storageOK?'Сохранение в этом браузере':'Сохранение недоступно')+' · <button data-action="help">Как играть</button></div></main>','Рейс «Смены»');
 view=createWorldView(document.querySelector('#hub-canvas'),{getState:()=>s.world,onFrame:hubFrame,places:ports,onWater:p=>{if(s.session){resumeNotice();return;}if(sailTo(s,p)){save();updateWorld();}},onPlace:visit,onContact:id=>showInfo('Суда на карте','<p>Карта связывает места и приключения. Сложные встречи запускаются отдельными сценами при переходе между районами. Здесь можно выбрать путь и ускорить спокойную часть перехода.</p>')});
 updateWorld();syncMusic();
}
function hubFrame(dt){
 if(document.hidden||document.querySelector('#info-dialog')?.open||paused)return;
 const event=advanceWorld(s,dt,catalog,speed);stepWorld(ambientWorld,dt);s.world.traffic=ambientWorld.traffic;s.world.ambientClock=ambientWorld.time;
 if(event?.type==='quest'){screen='quest';render();return;}
 if(event?.type==='arrival'){save();renderWorld();return;}
 lastUI+=dt;if(lastUI>.3){lastUI=0;updateWorld();}if(performance.now()-lastSave>2000)save();
}
function chart(){return '<svg viewBox="-82 -70 164 140" role="img" aria-label="Карта: Старый порт, Северный маяк и выбранный путь">'+LAND.map(i=>'<ellipse cx="'+i.x+'" cy="'+i.z+'" rx="'+i.rx+'" ry="'+i.rz+'" fill="#a8b18a"/>').join('')+(s.travel?'<polyline points="'+[s.world.own,...s.travel.route].map(p=>p.x+','+p.z).join(' ')+'" fill="none" stroke="#a87340" stroke-width="1.2" stroke-dasharray="3 2"/>':'')+ports.map(p=>'<circle cx="'+p.berth.x+'" cy="'+p.berth.z+'" r="2.5" fill="'+(p.id==='lighthouse'&&s.flags.beaconRepaired?'#f3d58c':'#eee4bd')+'" stroke="#7d8d6e" stroke-width=".7"/>').join('')+'<path d="M0 -3 1.6 2 0 1-1.6 2Z" transform="translate('+s.world.own.x+' '+s.world.own.z+') rotate('+s.world.own.h+')" fill="#ad704b"/><text x="65" y="-58" fill="#647b69" font-size="6">N ↑</text></svg>';}
function updateWorld(){if(screen!=='world')return;document.querySelector('#world-clock').textContent=clock();document.querySelector('#world-location').textContent=zoneAt(s.world.own).name+' · '+(s.flags.beaconRepaired?'маяк работает':'маяк на резерве');document.querySelector('#world-notice').textContent=s.notice;document.querySelector('#travel-status').textContent=s.session?'Эпизод ждёт продолжения':paused?'Переход приостановлен':s.travel?'В пути · '+(s.travel.style==='outer'?'вокруг островов':'через плёс'):'Машины остановлены';document.querySelector('#chart').innerHTML=chart();}
function resumeNotice(){showInfo('История ещё продолжается','<p>Эпизод «'+esc(active().title)+'» приостановлен. Его время и обстановка сохранены.</p><button class="primary" data-action="resume">Продолжить эпизод →</button>');}
function visit(id){
 if(s.session){resumeNotice();return;}
 if(!isAt(s,id)){chooseRoute(id);return;}
 if(id==='port'&&s.inventory.includes('oleg-reply')){homecoming();return;}
 const q=availableAt(s,catalog,id)[0];if(q){startQuest(s,q);screen='quest';render();return;}
 const title=id==='port'?'Мила у причала':'Северный маяк';
 showInfo(title,'<p>'+(id==='port'?(s.flags.homecoming?'Мила уже убрала письмо в карман. На причале снова начинается обычная смена. Ваш первый рейс закончен.':'Груз уже принят. Мила подняла руку на прощание: «Если задержитесь — сообщи Олегу».'):(s.flags.beaconRepaired?'Олег работает в аппаратной. Новый блок подключён, письмо Милы лежит рядом с чайником.':'За окном аппаратной горит слабый свет. Олег ждёт блок питания из Старого порта.'))+'</p><button class="primary" data-action="'+(id==='port'?'route-lighthouse':'route-port')+'">Выбрать следующий путь →</button>');
}
function chooseRoute(id){
 if(s.session){resumeNotice();return;}const p=ports.find(p=>p.id===id);if(!p)return;
 if(isAt(s,id)){visit(id);return;}
 const hasCargo=s.inventory.includes('power-unit');
 showInfo('Курс: '+p.name,'<p>'+(id==='lighthouse'?'До маяка можно пройти через плёс или обогнуть острова с востока. Переход можно ускорить; при начале эпизода движение мира остановится.':'В Старом порту Мила ещё заканчивает смену. Короткий путь ведёт обратно через плёс.')+'</p><div class="route-options"><button data-travel="'+id+'" data-route="direct"><b>Через рейд</b><span>Короткий переход'+(hasCargo&&!s.completed['reid-crossing']?' · возможна встреча с «Мартой»':'')+'</span></button>'+(id==='lighthouse'?'<button data-travel="lighthouse" data-route="outer"><b>Вокруг островов</b><span>Дольше · встреча на рейде остаётся в стороне</span></button>':'')+'</div>');
}
function renderQuest(){
 const q=active();if(!q){screen='world';renderWorld();return;}
 if(q.mode==='text')renderText(q);if(q.mode==='encounter')renderMeeting(q);if(q.mode==='investigation')renderInvestigation(q);syncMusic();
}
function repaintInvestigation(){
 const pane=document.querySelector('.investigation-episode'),cards=document.querySelector('.evidence-cards'),top=pane?.scrollTop||0,left=cards?.scrollLeft||0;
 render();document.querySelector('.investigation-episode').scrollTop=top;document.querySelector('.evidence-cards').scrollLeft=left;
}
function scene(q,extra=''){return '<section class="story-scene"><img src="'+esc(q.media.scene)+'" alt="'+esc(q.media.alt)+'"><div class="scene-heading"><span class="eyebrow">'+esc(q.subtitle)+'</span><h1>'+esc(q.title)+'</h1></div>'+extra+'</section>';}
function renderText(q){
 const t=s.session,n=q.nodes[t.node],p=t.pending,ending=textEnding(t,q);
 const content=p?'<div class="verdict '+(p.correct?'correct':'wrong')+'"><span>'+(p.correct?'✓ Обоснованное решение':'✕ В решении есть ошибка')+'</span><p>'+esc(p.feedback)+'</p>'+ruleButtons([p.rule])+'</div><button class="primary" data-action="text-next">'+(p.correct?'Продолжить сцену':'Посмотреть последствия')+' →</button>':n.ending?'<div class="ending-note"><span class="eyebrow">КОНЕЦ ТЕКСТОВОГО КВЕСТА</span><p>'+esc(ending?.summary)+'</p></div><button class="primary" data-action="text-finish">'+esc(ending?.label||'Вернуться в архипелаг')+' →</button>':'<div class="story-choices">'+textChoices(t,q).map(c=>'<button data-choice="'+esc(c.id)+'">'+esc(c.text)+'</button>').join('')+'</div>'+(n.exit?'<button class="quiet-button" data-action="decline-offer">Вернуться в архипелаг без заказа</button>':'');
 const notes=t.history.filter(e=>e.correct!==null);
 shell('<main class="episode-layout text-episode">'+scene(q,'<div class="scene-notebook"><span>ПЕРЕДАЧА ВАХТЫ</span>'+notes.map(e=>'<p class="'+(e.correct?'good-note':'bad-note')+'">'+(e.correct?'✓':'✕')+' '+esc(rule(e.rule)?.title)+'</p>').join('')+'<small>21:40 → '+clock()+' · '+(t.vars.knowsOleg?'Вы знаете историю старого аккумулятора':'Олег ждёт на маяке')+'</small></div>')+'<article class="story-panel"><div class="episode-kicker">01 / ТЕКСТОВЫЙ КВЕСТ <button data-action="world">Отложить</button></div><h2>'+esc(n.title)+'</h2><div class="speaker">'+esc(n.speaker)+'</div><div class="story-copy">'+paragraphs(n.text)+'</div>'+content+'<details class="transcript"><summary>Предыдущие решения · '+t.history.length+'</summary>'+t.history.slice().reverse().map(e=>'<div><p>'+esc(e.text)+'</p>'+(e.feedback?'<small>'+esc(e.feedback)+'</small>':'')+'</div>').join('')+'</details></article></main>',q.title);
}
function meetingState(){const m=s.session.local;return {own:m.own,traffic:[m.target],route:[],encounter:{id:'marta'},beacon:false};}
function meetingOverlay({c,project,width,height}){
 const m=s.session?.local;if(!m||s.session.mode!=='encounter')return;
 if(m.preview&&m.phase==='planning'){
  for(const [ship,color,h,sp] of [[m.own,'#ffe0a1',m.command,m.speed],[m.target,'#d7e9df',m.target.h,m.target.s]]){
   const v=vec(h,sp),a=project([ship.x,.05,ship.z]),b=project([ship.x+v.x*22,.05,ship.z+v.z*22]);c.strokeStyle=color;c.lineWidth=2;c.setLineDash([7,6]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.setLineDash([]);const an=Math.atan2(b.y-a.y,b.x-a.x);c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-9*Math.cos(an-.4),b.y-9*Math.sin(an-.4));c.moveTo(b.x,b.y);c.lineTo(b.x-9*Math.cos(an+.4),b.y-9*Math.sin(an+.4));c.stroke();
   c.font='11px Golos,sans-serif';c.fillStyle=color;c.textAlign='center';c.fillText(ship===m.own?'План «Смены» · '+Math.round(h)+'°':'«Марта» · текущий курс',b.x,b.y-14);
  }
 }
 c.fillStyle='#e8eddb';c.textAlign='left';c.font='10px Golos,sans-serif';c.fillText('Следы — наблюдения · пунктир — прогноз по курсу и скорости',22,height-24);
}
function renderMeeting(q){
 shell('<main class="episode-layout maneuver-episode"><section class="maneuver-scene"><canvas id="meeting-canvas" aria-label="Встреча двух судов на открытой воде: подписи, треки и прогноз выбранного манёвра"></canvas><div class="scene-heading"><span class="eyebrow">ОТДЕЛЬНАЯ ИГРА / ОТКРЫТАЯ ВОДА</span><h1>Граница рейда</h1><p>«Смена» и «Марта» · учебный масштаб</p></div><div class="scene-time" id="meeting-time"></div></section><aside class="maneuver-panel" id="meeting-panel"></aside></main>',q.title);
 view=createWorldView(document.querySelector('#meeting-canvas'),{getState:meetingState,onFrame:meetingFrame,places:[],zones:[],showLand:false,showBounds:false,onDraw:meetingOverlay});view.focus({x:0,z:0});updateMeetingPanel();
}
function updateMeetingPanel(){
 if(screen!=='quest'||active()?.mode!=='encounter')return;const q=active(),m=s.session.local,ruleID=m.kind==='headon'?14:15;
 document.querySelector('#meeting-panel').innerHTML='<div class="episode-kicker">02 / УПРАВЛЕНИЕ <button data-action="world">Отложить</button></div><h2>'+(m.kind==='headon'?'Нос к носу':'Судно справа')+'</h2>'+(m.phase==='planning'?'<div class="story-copy compact">'+paragraphs(q.intro)+'</div><div class="observation"><span>НАБЛЮДЕНИЯ ДО НАЧАЛА МАНЁВРА</span><p>Пеленг сохраняется, дистанция уменьшается. По имеющимся наблюдениям есть опасность столкновения.</p><p>«Смена»: '+Math.round(m.initialH)+'° · «Марта»: '+Math.round(norm(m.rotation+(m.kind==='headon'?180:270)))+'°</p></div>':'')+(m.phase!=='result'?'<div class="helm-planner"><span class="eyebrow">ВАШЕ УПРАВЛЕНИЕ</span><div class="course-display"><button data-turn="-30" aria-label="Изменить заданный курс на 30 градусов влево">↶ 30°</button><strong>'+String(Math.round(m.command)).padStart(3,'0')+'°</strong><button data-turn="30" aria-label="Изменить заданный курс на 30 градусов вправо">30° ↷</button></div><div class="speed-options">'+[[0,'Стоп'],[.4,'Малый ход'],[1,'Исходный ход']].map(([n,name])=>'<button data-meeting-speed="'+n+'" aria-pressed="'+(Math.abs(m.speed-m.initialS*n)<.01)+'">'+name+'</button>').join('')+'</div></div>'+(m.phase==='planning'?'<button class="quiet-button" data-action="preview" aria-pressed="'+m.preview+'">'+(m.preview?'☑':'☐')+' Прогноз выбранного движения</button><button class="primary" data-action="run-meeting">Выполнить манёвр →</button><p class="control-note">Сейчас сцена ждёт вашего решения. После команды суда начнут движение; курс и ход можно менять.</p>':'<button class="quiet-button" data-action="pause-meeting">'+(m.paused?'▶ Продолжить движение':'Ⅱ Приостановить движение')+'</button><p class="control-note">Суда движутся. Наблюдайте увеличение дистанции и результат своего действия.</p>'):
 '<div class="verdict '+(m.success?'correct':'wrong')+'"><span>'+(m.success?'✓ Суда разошлись':'✕ Встреча требует разбора')+'</span><p>'+esc(m.reason)+'</p>'+ruleButtons([ruleID,8])+'</div>'+(m.success?'<p class="story-copy">«Марта» выходит на связь: «Спасибо. У маяка „Заря“ ещё с рыболовными огнями. Передайте смотрителю, пусть посмотрит». Нина записывает время.</p><button class="primary" data-action="finish-meeting">Продолжить рейс →</button>':'<button class="primary" data-action="retry-meeting">Повторить эту встречу →</button><button class="quiet-button" data-action="retreat-meeting">После разбора выбрать обходной путь</button>'))+'<div class="episode-reference">МППСС под рукой: '+ruleButtons([ruleID,7,8])+'</div>';
 document.querySelector('#meeting-time').textContent=m.phase==='planning'?'ПЛАНИРОВАНИЕ · ВРЕМЯ ОСТАНОВЛЕНО':m.phase==='result'?'ВСТРЕЧА ЗАВЕРШЕНА':(m.paused?'ПАУЗА · ':'')+Math.floor(m.time)+' с';
}
function meetingFrame(dt){
 const t=s.session;if(screen!=='quest'||t?.mode!=='encounter'||document.hidden||document.querySelector('#info-dialog')?.open||t.local.paused)return;
 const m=t.local;for(let i=0;i<3;i++)if(stepMeeting(m,dt)){recordMeeting(s);save();updateMeetingPanel();break;}
 if(m.phase==='running'){document.querySelector('#meeting-time').textContent=Math.floor(m.time)+' с · ДВИЖЕНИЕ';if(performance.now()-lastSave>1000)save();}
}
const colorName={off:'Выключен',red:'Красный',green:'Зелёный',white:'Белый'};
function lanternDiagram(l){
 const light=(x,y,color,label)=>'<g><circle cx="'+x+'" cy="'+y+'" r="'+(color==='off'?7:9)+'" fill="'+({off:'#64746d',white:'#ffedbb',red:'#e49d7a',green:'#97ccad'})[color]+'" stroke="#cad2ad" stroke-width="1"/>'+(color!=='off'?'<circle cx="'+x+'" cy="'+y+'" r="17" fill="'+({white:'#ffedbb',red:'#e49d7a',green:'#97ccad'})[color]+'" opacity=".12"/>':'')+'<text x="'+(x+25)+'" y="'+(y+4)+'">'+label+'</text></g>';
 return '<svg viewBox="0 0 500 295" role="img" aria-label="Схема выбранных огней. Специальные сверху вниз: '+colorName[l.upper]+', '+colorName[l.lower]+'. Топовый '+(l.mast?'включён':'выключен')+'."><path d="m49 223 170-46 112 38-39 30H90Z" fill="#8d9c89"/><path d="M148 205v-55h75v49M187 151V40" fill="none" stroke="#9daa90" stroke-width="4"/>'+light(187,47,l.upper,'Круговой · верхний')+light(187,91,l.lower,'Круговой · нижний')+light(113,139,l.mast?'white':'off','Топовый')+light(82,230,l.stern?'white':'off','Кормовой')+'<g transform="translate(0 20)">'+light(257,165,l.sides?'green':'off','Бортовые · пара')+'</g><text x="25" y="284" class="diagram-note">Схема состава огней; все сектора показаны условно.</text></svg>';
}
function renderInvestigation(q){
 const t=s.session,l=t.local,f=l.feedback;
 shell('<main class="investigation-episode"><section class="investigation-intro"><div class="workshop-image" style="background-image:url(&quot;'+esc(q.media.scene)+'&quot;)"><span class="eyebrow">03 / АППАРАТНАЯ МАЯКА</span><h1>Огни у маяка</h1></div><div class="workshop-story">'+paragraphs(q.intro)+'<p class="continuity">'+(s.flags.martaMet?'Капитан «Марты» уже передал вам время наблюдения. Можно сравнить его с журналом Олега.':s.flags.martaRetreated?'Вы пришли внешним путём после разбора встречи. Олег сохранил сообщение «Марты» в журнале.':'Вы обошли рейд с востока. Сообщение «Марты» Олег принял сам и сохранил для сравнения.')+'</p></div></section><section class="evidence-workspace"><div class="episode-kicker">СОПОСТАВЬТЕ СВИДЕТЕЛЬСТВА <button data-action="world">Отложить</button></div><div class="evidence-cards">'+q.puzzle.evidence.map(e=>'<button data-evidence="'+e.id+'" class="evidence-card '+(l.evidence.includes(e.id)?'read':'')+'"><span>'+(l.evidence.includes(e.id)?'✓ ПРОЧИТАНО':'ОТКРЫТЬ СВИДЕТЕЛЬСТВО')+'</span><h3>'+esc(e.label)+'</h3><small>'+esc(e.stamp)+'</small>'+(l.evidence.includes(e.id)?'<p>'+esc(e.text)+'</p><em>'+esc(e.finding)+'</em>':'<p>Нажмите, чтобы положить запись на стол.</p>')+'</button>').join('')+'</div><section class="light-workbench"><div class="light-schema"><span class="eyebrow">СОСТАВ ОГНЕЙ «ЗАРИ»</span>'+lanternDiagram(l.lights)+'</div><div class="light-controls"><h2>Какие огни были нужны?</h2><label>Статус судна<select id="vessel-status" '+(f?.correct?'disabled':'')+'><option value="">Выберите по свидетельствам</option>'+q.puzzle.statuses.map(a=>'<option value="'+a.id+'" '+(a.id===l.status?'selected':'')+'>'+esc(a.label)+'</option>').join('')+'</select></label><div class="light-switches">'+['upper','lower'].map((key,i)=>'<label>Круговой · '+(i?'нижний':'верхний')+'<select data-lamp="'+key+'" '+(f?.correct?'disabled':'')+'>'+Object.entries(colorName).map(([id,name])=>'<option value="'+id+'" '+(l.lights[key]===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label>').join('')+'</div><div class="navigation-switches">'+[['mast','Топовый'],['sides','Бортовые · пара'],['stern','Кормовой']].map(([k,name])=>'<label><input type="checkbox" data-lamp="'+k+'" '+(l.lights[k]?'checked':'')+' '+(f?.correct?'disabled':'')+'> '+name+'</label>').join('')+'</div><p class="control-note">Исправьте схему под фактическое состояние судна. Выключенные огни показаны серым.</p>'+(f?'<div class="verdict '+(f.correct===true?'correct':f.correct===false?'wrong':'neutral')+'" role="status"><span>'+(f.correct===true?'✓ Картина восстановлена':f.correct===false?'✕ Есть противоречие':'Ещё не все сведения')+'</span><p>'+esc(f.text)+'</p>'+ruleButtons([3,26,23])+'</div>':'')+'<button class="primary" data-action="'+(f?.correct?'finish-investigation':'check-investigation')+'">'+(f?.correct?'Передать вывод и закончить заказ':'Передать Олегу вывод')+' →</button></div></section><div class="episode-reference">МППСС под рукой: '+ruleButtons(q.rules)+'</div></section></main>',q.title);
}
function showInfo(title,body){document.querySelector('#info-body').innerHTML='<span class="eyebrow">БОРТ «СМЕНЫ»</span><h2 id="info-title">'+esc(title)+'</h2>'+body;const d=document.querySelector('#info-dialog');if(!d.open)d.showModal();}
function showRule(id){const r=rule(id);if(!r)return;markHelp(s,r.id);save();showInfo((typeof r.id==='number'?'Правило '+r.id+'. ':'Приложение. ')+r.title,'<div class="normative-text">'+r.html+'</div><button class="quiet-button" data-action="library">← Все правила и приложения</button>');}
function library(){showInfo('МППСС под рукой','<p>Полные тексты правил и приложений доступны во время любого эпизода.</p><label class="library-search">Номер или название<input id="rule-search" type="search" placeholder="Например: обгон"></label><div class="exp-library">'+[...RULE_TEXT,...ANNEX_TEXT].map(r=>'<button data-rule="'+r.id+'" data-search="'+esc((r.id+' '+r.title).toLowerCase())+'">'+esc((typeof r.id==='number'?r.id+'. ':'Приложение. ')+r.title)+'</button>').join('')+'</div>');}
function journal(){
 showInfo('Рейс «Смены»','<div class="voyage-numbers"><span>'+clock()+' · время рейса</span><span>'+s.credits+' монет</span><span>Доверие экипажа: '+s.trust+'</span></div>'+catalog.map(q=>{const r=s.completed[q.id];return '<article class="journal-entry"><span class="eyebrow">'+esc(q.subtitle)+'</span><h3>'+esc(q.title)+'</h3><p>'+(r?esc(q.outcomes[r.outcome].text):s.session?.id===q.id?'Эпизод начат. Сохранены текущая сцена и решения.':'Эпизод ещё не пройден'+(q.mode==='encounter'?' · можно выбрать внешний путь.':'.'))+'</p></article>';}).join('')+'<h3>Решения и разборы</h3><p class="journal-note">Груз и награда отражают исход истории. Записи ниже показывают отдельные учебные решения; одна удачная попытка ещё не означает освоенное правило.</p>'+s.learning.slice().reverse().map(e=>'<div class="learning-entry '+(e.correct?'correct':'wrong')+'"><b>'+(e.correct?'✓ Обоснованное решение':'✕ Потребовалось исправление')+'</b><span>'+esc(rule(e.rule)?.title)+' · '+(e.help?'со справочником':'без справочника')+'</span>'+(e.reason?'<p>'+esc(e.reason)+'</p>':'')+ruleButtons([e.rule])+'</div>').join(''));
}
function homecoming(){
 showInfo('Письмо на обратный берег','<div class="dialogue-name">Мила</div><p>Мила берёт конверт, но открывает не сразу. «Доехали? Он опять сказал, что справился бы сам?»</p><p>Внутри всего несколько строк: «Блок поставили. Свет держится. В воскресенье приеду. О.»</p><p>Мила перечитывает последнюю фразу. «Вот за это — спасибо».</p><p>'+(s.flags.martaMet?'Позади остаются проверка судна, встреча с «Мартой» и восстановленная история огней «Зари».':s.flags.martaRetreated?'Вы выбрали обход после разбора встречи и всё же довели рейс до конца.':'Вы выбрали длинный путь вокруг островов и довели заказ до конца.')+'</p><button class="primary" data-action="deliver-reply">Передать письмо · закончить рейс →</button>');
}
function syncMusic(){
 const url=screen==='quest'?active()?.media.music:null;if(audio?.src!==url){if(audio){audio.pause();audio.src='';}audio=url?new Audio(url):null;if(audio){audio.loop=true;audio.volume=.32;}}
 if(audio){if(sound)audio.play().catch(()=>{});else audio.pause();}
}
function help(){showInfo('Свет до утра · демо 0.7','<p>Начните у Милы в Старом порту. После передачи вахты выберите путь к маяку. На коротком пути запускается встреча судов; у маяка — расследование.</p><p>Нажатие на воду прокладывает свободный путь вокруг берегов. Кнопки ×1 / ×4 / ×12 ускоряют переход. Карту можно двигать и масштабировать. Подписи причалов позволяют подойти и начать местную историю.</p><p>«Отложить» возвращает к карте и сохраняет эпизод. Чтобы продолжить плавание, завершите эпизод или выберите предусмотренный им выход. Справочник и уведомления закрываются по фону и Escape.</p><p>В игре звучат три короткие авторские темы; звук включается отдельно. Прогресс автоматически хранится в этом браузере, включая незаконченный манёвр.</p><p>Первый рейс охватывает несколько правил. Архипелаг и масштаб встреч условны. Источник нормативных текстов и замечания: раздел «О проекте» основной версии.</p><div class="help-actions"><a href="./index.html#sources">О проекте и источниках ↗</a><a href="./sailing.html">Свободное плавание 0.6 ↗</a><button data-action="reset">Начать другой рейс</button></div>');}

root.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;const q=active(),t=s.session;
 if(b.dataset.rule){showRule(b.dataset.rule);return;}
 if(b.dataset.choice){if(chooseText(s,q,b.dataset.choice))render();return;}
 if(b.dataset.evidence){inspectEvidence(s,q,b.dataset.evidence);repaintInvestigation();return;}
 if(b.dataset.travel){if(beginTravel(s,b.dataset.travel,b.dataset.route)){document.querySelector('#info-dialog').close();paused=false;render();}return;}
 if(b.dataset.timescale){speed=Number(b.dataset.timescale);paused=false;renderWorld();return;}
 if(b.dataset.turn){commandMeeting(t.local,t.local.command+Number(b.dataset.turn),t.local.speed);save();updateMeetingPanel();return;}
 if(b.dataset.meetingSpeed){commandMeeting(t.local,t.local.command,t.local.initialS*Number(b.dataset.meetingSpeed));save();updateMeetingPanel();return;}
 const action=b.dataset.action;
 if(action?.startsWith('visit-')){visit(action.slice(6));return;}if(action?.startsWith('route-')){chooseRoute(action.slice(6));return;}
 switch(action){
  case 'world':screen='world';render();break;
  case 'resume':screen='quest';render();break;
  case 'follow':view?.focus();break;
  case 'pause':paused=!paused;updateWorld();b.textContent=paused?'▶':'Ⅱ';break;
  case 'text-next':continueText(s);render();break;
  case 'text-finish':if(finishText(s,q)){screen='world';render();}break;
  case 'decline-offer':s.session=null;screen='world';render();break;
  case 'run-meeting':runMeeting(t.local);save();updateMeetingPanel();break;
  case 'preview':t.local.preview=!t.local.preview;save();updateMeetingPanel();break;
  case 'pause-meeting':t.local.paused=!t.local.paused;save();updateMeetingPanel();break;
  case 'retry-meeting':retryMeeting(s);render();break;
  case 'finish-meeting':if(completeQuest(s,q,'complete')){screen='world';render();}break;
  case 'retreat-meeting':if(completeQuest(s,q,'retreated')){screen='world';render();}break;
  case 'check-investigation':gradeInvestigation(s,q);repaintInvestigation();break;
  case 'finish-investigation':if(completeQuest(s,q)){screen='world';render();showInfo('Свет до утра','<p>Олег подключает блок. За стеклом медленно поворачивается тёплый луч. Первый полный оборот он смотрит молча.</p><p>«Работает. Передай Миле — в воскресенье приеду». Он протягивает вам сложенный листок.</p><p>Заказ выполнен: <b>120 монет</b>. Маяк теперь освещает воду на карте. На борту — ответ Олега.</p><button class="primary" data-action="close">Вернуться в архипелаг →</button>');}break;
  case 'deliver-reply':if(deliverReply(s))render();break;
  case 'sound':sound=!sound;s.sound=sound;save();b.textContent=sound?'♫ Звук вкл.':'♪ Звук выкл.';b.setAttribute('aria-pressed',sound);syncMusic();break;
  case 'close':document.querySelector('#info-dialog').close();break;
  case 'library':library();break;
  case 'journal':journal();break;
  case 'homecoming':homecoming();break;
  case 'help':help();break;
  case 'reset':showInfo('Начать другой рейс?','<p>Сохранение этого демо будет заменено. Прогресс прежних прототипов хранится отдельно.</p><button class="primary" data-action="reset-confirm">Начать заново</button><button class="quiet-button" data-action="close">Продолжить текущий рейс</button>');break;
  case 'reset-confirm':s=createExpedition();s.sound=sound;screen='world';paused=false;speed=1;render();break;
 }
});
root.addEventListener('change',e=>{
 const t=s.session;if(t?.mode!=='investigation')return;
 if(e.target.id==='vessel-status')t.local.status=e.target.value;
 if(e.target.dataset.lamp)t.local.lights[e.target.dataset.lamp]=e.target.type==='checkbox'?e.target.checked:e.target.value;
 if(e.target.id==='vessel-status'||e.target.dataset.lamp){
  if(!t.local.feedback?.correct){t.local.feedback=null;document.querySelector('.light-controls .verdict')?.remove();}
  document.querySelector('.light-schema').innerHTML='<span class="eyebrow">СОСТАВ ОГНЕЙ «ЗАРИ»</span>'+lanternDiagram(t.local.lights);save();
 }
});
root.addEventListener('input',e=>{if(e.target.id==='rule-search'){const value=e.target.value.trim().toLowerCase();for(const b of root.querySelectorAll('[data-search]'))b.hidden=!b.dataset.search.includes(value);}});
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector('#info-dialog')?.open||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;
 const t=s.session;if(screen==='quest'&&t?.mode==='encounter'&&t.local.phase!=='result'){
  if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();commandMeeting(t.local,t.local.command+(e.key==='ArrowRight'?15:-15),t.local.speed);save();updateMeetingPanel();}
  if(e.key===' '){e.preventDefault();if(t.local.phase==='planning')runMeeting(t.local);else t.local.paused=!t.local.paused;save();updateMeetingPanel();}
 }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&s)save();});window.addEventListener('pagehide',()=>{if(s)save();audio?.pause();});
init().catch(e=>{root.innerHTML='<main class="load-error"><h1>Не удалось открыть рейс</h1><p>'+esc(e.message)+'</p><a href="./expedition.html">Повторить загрузку</a></main>';});
