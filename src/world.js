import {WORLD_KEY,BOUNDS,LAND,PLACES,ZONES,createWorld,restoreWorld,saveWorld,zoneAt,setDestination,manual,stop,stepWorld,startTraining,cancelTraining,discussEncounter,encounterChoices,recover,distance,bearing,norm} from './world-engine.js';
import {placeScene,questAction} from './world-quests.js';
import {createWorldView} from './world-renderer.js';
import {RULE_TEXT,ANNEX_TEXT} from './rules-text.js';
const root=document.querySelector('#world-app'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null,storageOK=true;try{state=restoreWorld(localStorage.getItem(WORLD_KEY));}catch{storageOK=false;}
state=state||createWorld();
const keys=new Set();let world,refresh=0,nextSave=0,incidentOpen=false,manualPause=false;
const doc=id=>[...RULE_TEXT,...ANNEX_TEXT].find(r=>String(r.id)===String(id));
const ruleName=id=>'Правило '+id+'. '+(doc(id)?.title||'');
function persist(){try{localStorage.setItem(WORLD_KEY,saveWorld(state));}catch{storageOK=false;}}
function boot(){
 root.innerHTML='<header class="sea-bar"><a class="lab-brand" href="./world.html"><span>✳</span><b>ДЕЛЬНЫЙ МППСС</b><small>АРХИПЕЛАГ / 0.6</small></a><div class="sea-title">Своя вахта<span>СВОБОДНОЕ ПЛАВАНИЕ</span></div><nav><button data-ui="map">Карта</button><button data-ui="journal">Журнал</button><button data-ui="library">МППСС</button><button data-ui="help">Управление</button></nav></header><main class="free-world"><canvas id="sea-canvas" tabindex="0" aria-label="Изометрический архипелаг. Нажмите на воду, чтобы проложить путь, или управляйте клавишами W A S D. Подписи причалов открывают местные истории."></canvas><div class="zone-card"><span id="zone-density"></span><h1 id="zone-name"></h1><p>Суда на виду · хорошая видимость</p><button data-ui="follow" id="follow">Камера за судном ⊙</button></div><div class="quest-tracker"><span>ВАШ РЕЙС</span><div id="objective"></div><button data-ui="ports">Причалы и занятия →</button></div><section class="risk-card" id="risk" aria-live="polite" hidden></section><div class="sea-notice" id="sea-notice" role="status"></div><section class="helm"><div class="helm-readings"><span>СМЕНА <small>механическое судно</small></span><b id="heading">000°</b><span id="motion">Стоп</span></div><div class="helm-buttons"><button data-steer="-20" aria-label="Курс на 20 градусов влево">↶ Влево</button><button data-ui="engine-stop">Стоп</button><button data-steer="20" aria-label="Курс на 20 градусов вправо">Вправо ↷</button></div><div class="throttle"><button data-speed="-1" aria-label="Уменьшить ход">−</button><div><span id="throttle-label">Задано: стоп</span><meter id="speed-meter" min="0" max="4.2" value="0">0</meter></div><button data-speed="1" aria-label="Увеличить ход">+</button><button class="pause-button" data-ui="pause" id="pause">Ⅱ</button></div><p id="control-mode">W / S — ход · A / D — курс · Пробел — стоп</p></section><div class="mini-chart"><button data-ui="map" aria-label="Открыть большую карту"><span>АРХИПЕЛАГ ↗</span><div id="mini-map"></div></button></div></main><footer class="sea-footer"><span id="storage-note">'+(storageOK?'Прогресс хранится в этом браузере':'Сохранение недоступно')+'</span><span>Canvas 2D · учебный масштаб</span><button data-ui="about">О прототипе</button></footer><dialog id="sea-dialog" aria-labelledby="sea-dialog-title"><button class="dialog-close" data-ui="close" aria-label="Закрыть">×</button><div id="sea-dialog-body"></div></dialog>';
 world=createWorldView(document.querySelector('#sea-canvas'),{getState:()=>state,onFrame:frame,onWater:p=>{if(state.incident)return;setDestination(state,p);updateHUD();},onPlace:visit,onContact:contact,onCamera:following=>{document.querySelector('#follow').textContent=following?'Камера за судном ⊙':'Вернуться к судну ⊙';}});
 const d=document.querySelector('#sea-dialog');let down=false;const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};d.addEventListener('pointerdown',e=>down=e.target===d&&outside(e));d.addEventListener('pointerup',e=>{if(down&&e.target===d&&outside(e))d.close();down=false;});d.addEventListener('close',()=>{state.paused=manualPause||document.hidden;keys.clear();updateHUD();});
 updateHUD();
}
function frame(dt){
 const dialog=document.querySelector('#sea-dialog');state.paused=manualPause||document.hidden||dialog.open;
 if(!state.paused){
  const turn=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),speed=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0);
  if(turn||speed)manual(state,turn,speed,dt);
  stepWorld(state,dt);
 }
 if(state.incident&&!incidentOpen){incidentOpen=true;modal('Переход остановлен','<p>'+esc(state.incident.message)+'</p><p>Последняя свободная точка сохранена. Нина предлагает вернуться туда и повторить подход.</p><div class="dialog-actions"><button data-ui="recover">Повторить от свободной точки</button><button data-ui="journal">Посмотреть журнал</button></div>','БОРТОВОЙ РАЗБОР');}
 refresh+=dt;if(refresh>.2){refresh=0;updateHUD();}
 if(state.time>nextSave&&!state.incident){persist();nextSave=state.time+5;}
}
function motion(s){return s<.12?'Стоп':s<1.25?'Малый ход':s<2.9?'Средний ход':'Полный ход';}
function mapSVG(mini=false){
 const ships=[{...state.own,own:true},...state.traffic];
 return '<svg viewBox="-82 -70 164 140" role="img" aria-label="Карта архипелага, районов, судов и причалов">'+(mini?'':'<rect x="-82" y="-70" width="164" height="140" fill="#d9e4de"/>')+ZONES.map(z=>'<circle cx="'+z.x+'" cy="'+z.z+'" r="'+z.r+'" fill="'+(z.id==='busy'?'#c3cbbb55':'#adcac055')+'" stroke="#7f9f9355" stroke-width=".4" stroke-dasharray="2 2"/>').join('')+LAND.map(i=>'<ellipse cx="'+i.x+'" cy="'+i.z+'" rx="'+i.rx+'" ry="'+i.rz+'" fill="#99ad86" stroke="#6d8e73" stroke-width=".5"/>').join('')+(state.route.length?'<polyline points="'+[state.own,...state.route].map(p=>p.x+','+p.z).join(' ')+'" fill="none" stroke="#a57742" stroke-width="1" stroke-dasharray="2 2"/>':'')+ships.map(t=>'<path d="M0 -2.5 L1.2 1.8 L0 .9 L-1.2 1.8Z" transform="translate('+t.x+' '+t.z+') rotate('+t.h+')" fill="'+(t.own?'#b57045':'#66867a')+'" stroke="'+(t.own?'#fff0cb':'none')+'" stroke-width=".4"/>').join('')+PLACES.map(p=>'<circle cx="'+p.berth.x+'" cy="'+p.berth.z+'" r="1.6" fill="#f4e9c5" stroke="#9c805b" stroke-width=".5"/>').join('')+(mini?'':PLACES.map(p=>'<text x="'+(p.berth.x+3)+'" y="'+(p.berth.z+1)+'" fill="#426357" font-size="3" font-family="sans-serif">'+esc(p.name)+'</text>').join('')+'<text x="72" y="-59" fill="#668675" font-size="4" font-family="sans-serif">N ↑</text>')+'</svg>';
}
function updateHUD(){
 const z=zoneAt(state.own);document.querySelector('#zone-name').textContent=z.name;document.querySelector('#zone-density').textContent=z.description;document.querySelector('#heading').textContent=String(Math.round(state.own.h)%360).padStart(3,'0')+'°';document.querySelector('#motion').textContent=motion(state.own.s);document.querySelector('#throttle-label').textContent='Задано: '+motion(state.throttle).toLocaleLowerCase('ru');document.querySelector('#speed-meter').value=state.own.s;
 document.querySelector('#pause').textContent=manualPause?'▶':'Ⅱ';document.querySelector('#pause').setAttribute('aria-label',manualPause?'Продолжить плавание':'Пауза');document.querySelector('#control-mode').textContent=state.route.length?'Идём по маршруту · расхождения — ваша вахта':'W / S — ход · A / D — курс · Пробел — стоп';
 document.querySelector('#sea-notice').textContent=manualPause?'Плавание на паузе':state.notice;
 const objective=state.training?'<b>Занятие с «Ветром»</b><p>Возьмите ход и выполните расхождение. Разбор с Ниной доступен при сближении.</p><button data-ui="cancel-training">Закончить занятие</button>':state.quest.cargo==='carried'?'<b>Запас до утра</b><p>Доставить ящик Олегу на Северный маяк.</p>':state.quest.letter==='carried'?'<b>Письмо с другого берега</b><p>Передать конверт Ильи Миле в Старом порту.</p>':state.quest.cargo==='delivered'?'<b>Свет с запасом</b><p>Ящик доставлен. Можно остаться в море или зайти в посёлок.</p>':state.quest.training?'<b>Своя вахта</b><p>Занятие закончено. Можно взять поручение у Милы или выйти на Восточный рейд.</p>':'<b>Первый выход</b><p>Мила ждёт у причала. У учебных буёв Нина поможет освоиться.</p>';
 document.querySelector('#objective').innerHTML=objective;
 document.querySelector('#mini-map').innerHTML=mapSVG(true);
 const e=state.encounter,risk=document.querySelector('#risk');risk.hidden=!e;
 if(state.incident){risk.hidden=false;risk.innerHTML='<span>ПЕРЕХОД ОСТАНОВЛЕН</span><h2>Нужен повтор</h2><p>'+esc(state.incident.message)+'</p><button data-ui="recover">К свободной точке →</button>';}
 else if(e)risk.innerHTML='<span>НИНА / ЦЕЛЕЙ В НАБЛЮДЕНИИ: '+Math.max(1,state.contacts.length)+'</span><h2>'+esc(e.name)+'</h2><p>'+(e.answered?(e.correct?'План согласован. Теперь выполните расхождение.':'Совет исправлен. Выполните манёвр с учётом правила.'):'Есть риск сближения. Можем обсудить исходную встречу или продолжить наблюдение.')+'</p><button data-ui="encounter">'+(e.answered?'Перечитать план':'Обсудить встречу')+' →</button>';
}
function modal(title,body,kicker='МЕСТНАЯ ИСТОРИЯ'){
 keys.clear();state.paused=true;document.querySelector('#sea-dialog-body').innerHTML='<span class="dialog-kicker">'+esc(kicker)+'</span><h2 id="sea-dialog-title">'+esc(title)+'</h2>'+body;const d=document.querySelector('#sea-dialog');if(!d.open)d.showModal();
}
const dialogue=lines=>'<section class="port-dialogue">'+lines.map(l=>'<div><span>'+esc(l.speaker)+'</span><p>'+esc(l.text)+'</p></div>').join('')+'</section>';
function visit(id){
 const scene=placeScene(state,id);if(!scene)return;
 modal(scene.title,dialogue(scene.lines)+'<div class="port-choices">'+scene.choices.map(c=>'<button data-story="'+esc(c.id)+'">'+esc(c.text)+'</button>').join('')+'</div>',id==='school'?'ЗАНЯТИЕ НА ВОДЕ':'ПРИЧАЛ / '+PLACES.find(p=>p.id===id).name);
}
function ports(){
 modal('Куда держать курс','<p>Все районы открыты. Путь к причалу или в район прокладывается по воде; судно пройдёт его своим ходом.</p><div class="port-destinations">'+PLACES.map(p=>'<div><span>'+esc(p.role)+'</span><h3>'+esc(p.person)+' · '+esc(p.name)+'</h3><button data-place="'+p.id+'">Связаться</button><button data-destination="'+p.id+'">Проложить путь →</button></div>').join('')+'<div><span>ПЛОТНОЕ ДВИЖЕНИЕ</span><h3>Восточный рейд</h3><p>Несколько судов, разные курсы и скорости. Открытая вода, без узкости и СРД.</p><button data-destination="busy">Проложить путь →</button></div></div>','АРХИПЕЛАГ');
}
function openMap(){modal('Море между островами','<p>Нажмите на воду на карте, чтобы задать путь. Для возвращения камеры к судну используйте кнопку ⊙.</p><div class="large-chart" id="large-chart">'+mapSVG(false)+'</div><div class="map-destinations">'+PLACES.map(p=>'<button data-destination="'+p.id+'">'+esc(p.name)+'</button>').join('')+'<button data-destination="busy">Восточный рейд</button></div>','КАРТА РАЙОНА');}
function go(id){
 const p=id==='busy'?{x:35,z:0}:PLACES.find(p=>p.id===id)?.berth;if(!p)return;
 if(setDestination(state,p)){document.querySelector('#sea-dialog').close();world.focus();}else {modal('Путь не проложен','<p>'+esc(state.notice)+'</p><button data-ui="map">Выбрать другую точку</button>','МАРШРУТ');}
 updateHUD();
}
function encounter(){
 const e=state.encounter;if(!e)return;
 const type=e.otherType==='sail'?'парусное судно, двигатель не используется':'судно с механическим двигателем';
 const copy='<p class="encounter-context">Исходная встреча: «'+esc(e.name)+'» — '+type+'. Суда на виду в открытой воде. Узкости и СРД нет. Оценка сделана при возникновении риска; последующее движение видно по трекам.</p>';
 if(e.answered){modal('План встречи с «'+e.name+'»',copy+'<div class="plan-result '+(e.correct?'correct':'wrong')+'"><strong>'+(e.correct?'✓ Верно':'✕ Ошибка исправлена')+'</strong><p>'+esc(e.reason)+'</p></div><button class="rule-link" data-rule="'+e.rule+'">'+esc(ruleName(e.rule))+' · '+esc(e.clause)+' ↗</button><p>Дальше — ваше управление. Проверьте место для манёвра и остальные цели.</p><button class="primary" data-ui="close">Вернуться к рулю →</button>','ВСТРЕЧА / РАЗБОР');return;}
 modal('«'+e.name+'» сближается',copy+dialogue([{speaker:'Нина',text:'Обстановку видишь. Какую обязанность берём за основу, прежде чем менять курс или ход?'}])+'<div class="port-choices">'+encounterChoices(e).map(c=>'<button data-plan="'+c.id+'">'+esc(c.text)+'</button>').join('')+'</div>','ОДНА ВСТРЕЧА / ОДНО РЕШЕНИЕ');
}
function contact(id){const t=state.traffic.find(t=>t.id===id);if(!t)return;if(state.encounter?.id===id){encounter();return;}
 modal(t.name,'<p>'+(t.type==='sail'?'Парусная яхта, двигатель не используется.':'Механическое судно на ходу.')+'</p><p>Текущий курс '+Math.round(t.h)+'°. Пеленг от «Смены» '+Math.round(bearing(state.own,t))+'°. След за кормой показывает пройденный путь.</p><p>Наличие судна поблизости само по себе не означает опасность столкновения. Продолжайте наблюдение.</p><button class="primary" data-ui="close">Вернуться к наблюдению →</button>','НАБЛЮДАЕМОЕ СУДНО');}
function openRule(id){const r=doc(id);if(!r)return;modal((typeof r.id==='number'?'Правило '+r.id+'. ':'Приложение. ')+r.title,'<div class="normative-text">'+r.html+'</div><button data-ui="library">← К справочнику</button>','ПОЛНЫЙ ТЕКСТ МППСС');}
function library(){modal('МППСС под рукой','<label class="search-label">Номер или название<input id="rule-search" type="search" placeholder="Например: 13 или обгон"></label><div class="library-list">'+[...RULE_TEXT,...ANNEX_TEXT].map(r=>'<button data-rule="'+r.id+'" data-search="'+esc((r.id+' '+r.title).toLocaleLowerCase('ru'))+'">'+esc((typeof r.id==='number'?r.id+'. ':'Приложение. ')+r.title)+'</button>').join('')+'</div>','СПРАВОЧНИК');}
function journal(){
 modal('Рейс «Смены»','<div class="journal-stats"><span>Чистых расхождений: '+state.completed.filter(c=>c.safe).length+'</span><span>Верных планов: '+state.decisions.filter(d=>d.correct).length+' / '+state.decisions.length+'</span><span>Завершено поручений: '+[state.quest.cargo,state.quest.letter].filter(q=>q==='delivered').length+'</span></div>'+(state.log.length?state.log.slice().reverse().map(e=>'<article class="log-entry"><span>'+Math.floor(e.time/60)+':'+String(Math.floor(e.time%60)).padStart(2,'0')+'</span><h3>'+esc(e.title)+'</h3><p>'+esc(e.text)+'</p>'+(e.rule?'<button class="rule-link" data-rule="'+e.rule+'">'+esc(ruleName(e.rule))+' ↗</button>':'')+'</article>').join(''):'<p>Здесь появятся поручения, встречи и разборы. Можно просто выйти в море и выбрать свой маршрут.</p>'),'БОРТОВОЙ ЖУРНАЛ');
}
function help(){
 modal('Курс выбираете вы','<ol class="help-list"><li><b>W / S</b> увеличивают и уменьшают заданный ход. Судно разгоняется и останавливается с инерцией.</li><li><b>A / D</b> меняют заданный курс. Кнопки под экраном делают то же.</li><li><b>Нажатие на воду</b> прокладывает путь вокруг островов. Вы по-прежнему отвечаете за расхождения с судами.</li><li><b>Пробел</b> — машинам стоп. <b>P</b> — пауза. Во время чтения разговоров и правил плавание приостановлено.</li><li><b>Потяните карту</b>, чтобы осмотреть мир. Колесо меняет масштаб, кнопка ⊙ возвращает камеру к судну.</li><li><b>Подойдите к причалу на малом ходу</b>, чтобы поговорить с местным персонажем. Подпись на земле привязана к человеку у причала; учебные буи открывают занятие с Ниной на борту.</li></ol><p>Начните с Милиного ящика или короткой встречи у учебных буёв. На Восточном рейде несколько целей: оценивайте всю обстановку.</p><button class="primary" data-ui="close">Вернуться в море →</button>','КАК ИГРАТЬ');
}
function about(){modal('Архипелаг / прототип 0.6','<p>Свободное плавание в одном мире. Поручения привязаны к местам, встречи — к движению судов. Разговоры ограничены одной местной историей или конкретной встречей.</p><p>Есть спокойная бухта, оживлённый открытый рейд, острова и три причала. Персонажи, кран, флаг, мельница и маяк двигаются. Яхта имеет отдельный корпус, кокпит и два паруса.</p><p>Масштаб, время, запас расхождения и скорость условные. Текущий мир — хорошая видимость и открытая вода, без узкостей и СРД. Ночные сектора, туман и сложная физика пока не входят в свободное плавание. Результаты манёвра — оценка этой игровой модели.</p><p>Прогресс сохраняется в этом браузере. Внешней аналитики нет. Нормативный корпус выбран пользователем: <a href="https://forcesail.ru/sealaw/lawlib/mppss/" target="_blank" rel="noopener">ForceSail</a>; полный текст доступен внутри.</p><p><a href="./campaign.html">Предыдущее линейное демо</a> · <a href="./index.html#impressum">Impressum</a> · <a href="./index.html#datenschutz">Datenschutz</a></p><button data-ui="restart">Начать новый выход</button>','О ПРОТОТИПЕ');}
root.addEventListener('click',e=>{
 const ref=e.target.closest('a[href^="#rule-"],a[href^="#annex-"]');if(ref){e.preventDefault();const h=ref.getAttribute('href').slice(1);openRule(h.startsWith('rule-')?Number(h.slice(5)):h);return;}
 if(e.target.closest('#large-chart')){const svg=document.querySelector('#large-chart svg'),point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const mapPoint=point.matrixTransform(svg.getScreenCTM().inverse()),x=mapPoint.x,z=mapPoint.y;if(setDestination(state,{x,z})){document.querySelector('#sea-dialog').close();world.focus();}else document.querySelector('#sea-notice').textContent=state.notice;return;}
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.steer){state.route=[];state.command=norm(state.command+Number(b.dataset.steer));updateHUD();return;}
 if(b.dataset.speed){state.route=[];state.throttle=Math.max(0,Math.min(4.2,state.throttle+Number(b.dataset.speed)*.8));updateHUD();return;}
 if(b.dataset.destination){go(b.dataset.destination);return;}
 if(b.dataset.place){visit(b.dataset.place);return;}
 if(b.dataset.rule){const id=Number.isNaN(Number(b.dataset.rule))?b.dataset.rule:Number(b.dataset.rule);openRule(id);return;}
 if(b.dataset.plan){if(discussEncounter(state,b.dataset.plan)){persist();encounter();updateHUD();}return;}
 if(b.dataset.story){
  const id=b.dataset.story;
  if(id==='close'){document.querySelector('#sea-dialog').close();return;}
  if(id.startsWith('route-')){go(id.slice(6));return;}
  if(id==='cargo-story'){state.flags.cargoExplained=true;modal('Мила говорит тише',dialogue([{speaker:'Мила',text:'Он сам этот блок и собирал. После отца всё переделал, кроме корпуса. Говорит, если новая деталь помещается в старое место, значит ещё можно жить без капитального ремонта.'},{speaker:'Вы',text:'А на самом деле?'},{speaker:'Мила',text:'На самом деле у него сегодня день рождения. Не говорите, что я сказала.'}])+'<div class="port-choices"><button data-story="take-cargo">Возьмём ящик. Про день рождения — молчим.</button><button data-place="port">Вернуться к разговору</button></div>');persist();return;}
  if(id==='training'){if(startTraining(state)){document.querySelector('#sea-dialog').close();world.focus();}else modal('Нужен свободный курс','<p>'+esc(state.notice)+'</p><button class="primary" data-ui="close">Вернуться к рулю</button>','УЧЕБНОЕ ЗАНЯТИЕ');updateHUD();return;}
  const outcome=questAction(state,id);if(outcome){persist();modal(outcome.title,'<div class="plan-result '+(outcome.correct===false?'wrong':'correct')+'">'+(outcome.why?'<strong>'+(outcome.correct?'✓ Верно':'✕ Ошибка исправлена')+'</strong><p>'+esc(outcome.why)+'</p>':'')+'</div><p>'+esc(outcome.text)+'</p>'+(outcome.rule?'<button class="rule-link" data-rule="'+outcome.rule+'">'+esc(ruleName(outcome.rule))+' ↗</button>':'')+'<button class="primary" data-ui="close">Вернуться к рулю →</button>','КОНЕЦ МЕСТНОЙ СЦЕНЫ');updateHUD();}return;
 }
 switch(b.dataset.ui){
  case 'close':document.querySelector('#sea-dialog').close();break;
  case 'map':openMap();break;
  case 'ports':ports();break;
  case 'follow':world.focus();break;
  case 'help':help();break;
  case 'about':about();break;
  case 'library':library();break;
  case 'journal':journal();break;
  case 'encounter':encounter();break;
  case 'cancel-training':cancelTraining(state);updateHUD();break;
  case 'engine-stop':stop(state);updateHUD();break;
  case 'pause':manualPause=!manualPause;keys.clear();updateHUD();break;
  case 'recover':if(recover(state)){incidentOpen=false;document.querySelector('#sea-dialog').close();world.focus();persist();}break;
  case 'restart':modal('Начать новый выход?','<p>Поручения, журнал и положение судна этого прототипа будут заменены новым выходом.</p><div class="dialog-actions"><button data-ui="restart-confirm">Начать заново</button><button data-ui="close">Продолжить текущий</button></div>','НОВЫЙ ВЫХОД');break;
  case 'restart-confirm':state=createWorld();manualPause=false;incidentOpen=false;nextSave=0;document.querySelector('#sea-dialog').close();persist();world.focus();updateHUD();break;
 }
});
root.addEventListener('input',e=>{if(e.target.id==='rule-search'){const q=e.target.value.trim().toLocaleLowerCase('ru');for(const b of root.querySelectorAll('[data-search]'))b.hidden=!b.dataset.search.includes(q);}});
document.addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey||document.querySelector('#sea-dialog').open||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
 const k=e.key.toLocaleLowerCase('en');if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||['w','a','s','d'].includes(k)){e.preventDefault();keys.add(k.startsWith('arrow')?e.key:k);}
 if(e.key===' '){e.preventDefault();stop(state);updateHUD();}if(k==='p'&&!e.repeat){manualPause=!manualPause;keys.clear();updateHUD();}
});
document.addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.key.toLocaleLowerCase('en'));});
window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden)persist();});window.addEventListener('pagehide',persist);
boot();
