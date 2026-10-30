import {loadQuest,begin,take,screen,mastRead,mastWrite,mastStock,mastFits,fill} from './quest-vm.js';
import {RULE_TEXT} from './rules-text.js';
import {Sea} from './freight-sea.js';
import {Ambience} from './freight-audio.js';
import {practiceRound,practiceCheck} from './freight-practice.js';

const KEY='deelstuff.colreg.freight.v1',BOOK_MINUTES=5;
const root=document.getElementById('freight');
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}};
const store={endings:{},debts:{},active:null,...load()};
const ENDLABEL={win:'Удалось',soft:'Удалось наполовину',fail:'Провал',death:'Гибель'};
const LAMPS=['','Белый','Красный','Зелёный'],LAMPCLASS=['off','white','red','green'];
const SHAPES=['','шар','конус вершиной вверх','конус вершиной вниз','ромб','цилиндр','корзина'];
const SHAPEICON=['','<circle cx="12" cy="12" r="9"/>','<path d="M12 3 21 21H3z"/>','<path d="M12 21 21 3H3z"/>','<path d="M12 2 21 12 12 22 3 12z"/>','<rect x="6" y="3" width="12" height="18"/>','<path d="M3 8h18l-3 13H6zM7 8c0-7 10-7 10 0" fill="none" stroke="currentColor" stroke-width="2"/>'];
const shapeSvg=k=>k?`<svg viewBox="0 0 24 24" aria-hidden="true">${SHAPEICON[k]}</svg>`:'';

let quests=[],q=null,state=null,sea=null,round=null,screenName='board',drawer=null;
const audio=new Ambience();

function shell(){
 root.innerHTML='<canvas id="sea" aria-hidden="true"></canvas><div id="hud" class="hud"></div><div id="mast" class="mast"></div><aside id="panel" class="panel"></aside><nav class="tools" aria-label="Инструменты"></nav><div id="drawer" class="drawer" hidden></div>';
 sea=new Sea(root.querySelector('#sea'));sea.start();
 const fit=()=>{const wide=innerWidth>=900,panel=root.querySelector('#panel');sea.inset(wide?panel.offsetWidth:0);sea.resize();};
 addEventListener('resize',fit);fit();
 root.addEventListener('click',onClick);
 addEventListener('keydown',onKey);
}
function tools(extra=''){
 const t=root.querySelector('.tools');
 t.innerHTML=`${extra}<button data-do="rules">МППСС</button><button data-do="sound" aria-pressed="${audio.on}">${audio.on?'Звук вкл':'Звук'}</button>`;
}

// Board: the thin layer between quests. Debts are the rules the sea has already punished you for.
function board(){
 screenName='board';q=null;state=null;
 sea.set('port',[]);sea.own={stack:[],top:0,nav:0};
 root.className='is-board';sea.resize();
 root.querySelector('#hud').innerHTML='';root.querySelector('#mast').innerHTML='';
 const debts=Object.entries(store.debts).sort((a,b)=>b[1].length-a[1].length);
 const found=Object.keys(store.endings).filter(k=>quests.some(x=>k.startsWith(`${x.raw.id}:`))).length,total=quests.reduce((n,x)=>n+Object.values(x.raw.locations).filter(l=>l.end).length,0);
 const contract=x=>{
  const live=store.active?.id===x.raw.id,ends=Object.keys(store.endings).filter(k=>k.startsWith(`${x.raw.id}:`)).length,all=Object.values(x.raw.locations).filter(l=>l.end).length;
  return `<button class="contract" data-do="quest" data-id="${x.raw.id}"><span class="eyebrow">${live?'Рейс не закончен':'Контракт'}</span><strong>${esc(x.raw.title)}</strong><span>${esc(x.raw.brief)}</span><em>${ends?`Финалов найдено: ${ends} из ${all}`:'Около 15 минут'}</em></button>`;
 };
 root.querySelector('#panel').innerHTML=`<header class="brand"><span class="eyebrow">Дельный МППСС · прототип</span><h1>Ночной фрахт</h1><p>Портовая контора Архипелага. Заказы берут вечером, отвечают за них утром. Правила здесь не экзамен, а единственный инструмент шкипера.</p></header><section><h2>Доска заказов</h2>${quests.map(contract).join('')}</section>${debts.length?`<section class="debts"><h2>Хвосты перед инспектором</h2><p>На этих правилах вы уже попались. В море они вернутся в другом виде.</p><ul>${debts.slice(0,5).map(([rule,list])=>`<li><button class="rule-link" data-do="rule" data-rule="${esc(rule)}">Правило ${esc(rule)}</button><span>${esc(list[0])}</span></li>`).join('')}</ul></section>`:''}<section class="practice-entry"><h2>Огни на горизонте</h2><p>Пять встречных судов за пару минут. Только огни, никакого текста. Чаще покажет то, на чём вы ошибались.</p><button class="ghost" data-do="practice">Выйти на ночной переход</button></section>${found?`<p class="tally">Всего финалов найдено: ${found} из ${total}</p>`:''}`;
 tools();
}

function open(id){
 q=quests.find(x=>x.raw.id===id);
 const saved=store.active?.id===id?store.active.state:null;
 state=saved||begin(q);
 screenName='quest';root.className='is-quest';sea.resize();
 render();sea.snap();
}
function persist(){store.active=state.end?null:{id:q.raw.id,state};save();}

function hud(view){
 const items=view.status.map(s=>{
  if(s.fmt==='clock')return `<div class="clock"><span>Время</span><strong>${fill(q,`{${s.id}|clock}`,state.v)}</strong></div>`;
  if(s.fmt==='money'||s.kind==='count')return `<div class="money"><span>${esc(s.label)}</span><strong>${s.value}</strong></div>`;
  const pct=(s.value-s.min)/(s.max-s.min)*100,tone=s.kind==='threat'?(pct>=60?'bad':pct>=30?'warn':'ok'):(pct<=30?'bad':pct<=60?'warn':'ok');
  return `<div class="meter ${tone}"><span>${esc(s.label)}</span><i style="--v:${pct}%"></i><strong>${esc(s.text)}</strong></div>`;
 });
 root.querySelector('#hud').innerHTML=items.join('');
}
function mast(view){
 const box=root.querySelector('#mast');
 const mode=view.mast||(q.mast?.shapes&&state.v[q.index.t]>=1740?'shapes':'lights');
 box.className='mast';
 if(!q.mast?.[mode]){box.innerHTML='';sea.own={stack:[],top:0,nav:0};return;}
 const cfg=mastRead(q,mode,state.v),live=!!view.mast&&!view.end;
 const stock=mastStock(q,mode,state.v);
 sea.own={stack:mode==='lights'?cfg.slots.filter(Boolean):[],top:mode==='lights'?cfg.top:0,nav:mode==='lights'?cfg.nav:0};
 const slot=(k,i)=>{
  const open=i===0||cfg.slots[i-1];
  const name=mode==='lights'?(LAMPS[k]||'пусто'):(SHAPES[k]||'пусто');
  return `<button class="slot ${mode==='lights'?LAMPCLASS[k]:'shape'}" data-do="slot" data-i="${i}" data-mode="${mode}" ${live&&open?'':'disabled'} aria-label="${i+1}-е место на мачте: ${esc(name)}">${mode==='shapes'?shapeSvg(k):''}</button>`;
 };
 const toggles=mode==='lights'?`<button class="toggle ${cfg.top?'on':''}" data-do="flip" data-what="top" data-mode="${mode}" aria-pressed="${!!cfg.top}" ${live?'':'disabled'}>Топовый</button><button class="toggle ${cfg.nav?'on':''}" data-do="flip" data-what="nav" data-mode="${mode}" aria-pressed="${!!cfg.nav}" ${live?'':'disabled'}>Бортовые и кормовой</button>`:'';
 box.className=`mast ${live?'live':''}`;
 box.innerHTML=`<div class="mast-head"><span class="eyebrow">${mode==='lights'?'Огни на мачте':'Знаки на фале'}</span>${live?'<span class="hint">Нажимайте на места</span>':''}</div><div class="mast-body"><div class="pole">${cfg.slots.map(slot).join('')}</div><div class="side">${toggles}${stock?`<p class="stock">В рундуке: ${stock.map((n,i)=>`<b class="${LAMPCLASS[i+1]}">${n}</b>`).join(' ')}</p>`:''}</div></div>`;
}
function panel(view){
 const p=root.querySelector('#panel');
 const body=[...view.say.map(t=>`<p class="say">${esc(t)}</p>`),...view.paragraphs.map(t=>`<p>${esc(t)}</p>`)].join('');
 const list=view.choices.map((c,i)=>`<button class="choice" data-do="choice" data-id="${esc(c.id)}" ${c.enabled?'':'disabled'}><kbd>${i+1}</kbd><span>${esc(c.text)}${c.enabled?'':`<em>${esc(c.lockText||'')}</em>`}</span></button>`).join('');
 const radio=/канал/.test(view.speaker||'');
 if(radio)audio.radio();
 const ending=view.end?endingBlock(view):'';
 p.innerHTML=`<div class="page">${view.title?`<h2>${esc(view.title)}</h2>`:''}${view.speaker?`<p class="speaker ${radio?'radio':''}">${esc(view.speaker)}</p>`:''}<div class="prose">${body}</div>${ending}<div class="choices">${list}</div></div>`;
 p.scrollTop=0;
}
function endingBlock(view){
 const notes=state.notes;
 const rule=n=>`<li><button class="rule-link" data-do="rule" data-rule="${esc(n.rule)}">Правило ${esc(n.rule)}</button><span>${esc(n.text)}</span></li>`;
 const label=`<p class="ending ${view.end}">${ENDLABEL[view.end]}</p>`;
 const review=notes.length?`<section class="review"><h3>Разбор инспектора</h3><ul>${notes.map(rule).join('')}</ul></section>`:`<section class="review"><h3>Разбор инспектора</h3><p>Замечаний по правилам нет. Инспектора это огорчает.</p></section>`;
 const legal=q.raw.legal?`<p class="legal">${esc(q.raw.legal)}</p>`:'';
 return `${label}${review}${legal}<div class="after"><button class="primary" data-do="again">Сначала</button><button class="ghost" data-do="home">В контору</button></div>`;
}
function render(){
 const view=screen(q,state);
 if(view.scene||view.see)sea.set(view.scene?.name,view.see);
 hud(view);mast(view);panel(view);
 const docs=view.docs.map(d=>`<button data-do="doc" data-id="${esc(d.id)}">${esc(d.title)}</button>`).join('');
 tools(`${docs}<button data-do="home">Контора</button>`);
 if(state.end)finish();
 persist();
}
function finish(){
 store.endings[`${q.raw.id}:${state.loc}`]=(store.endings[`${q.raw.id}:${state.loc}`]||0)+1;
 for(const n of state.notes){const list=store.debts[n.rule]||=[];if(!list.includes(n.text))list.unshift(n.text);}
 save();
}
function choose(id){
 state=take(q,state,id);render();
}

function slotNext(i,mode){
 const cfg=mastRead(q,mode,state.v),m=q.mast[mode],slots=cfg.slots.slice();
 for(let step=1;step<=m.values+1;step++){
  const value=(slots[i]+step)%(m.values+1),next=slots.slice();next[i]=value;
  if(mastFits(q,mode,state.v,next)){slots[i]=value;break;}
 }
 state=mastWrite(q,mode,state,{...cfg,slots});render();
}
function flip(what,mode){
 const cfg=mastRead(q,mode,state.v);cfg[what]=cfg[what]?0:1;state=mastWrite(q,mode,state,cfg);render();
}

function ruleHtml(id){
 const n=parseInt(id),r=RULE_TEXT.find(x=>x.id===n);
 return r?`<h2>Правило ${n}. ${esc(r.title)}</h2><div class="rule-body">${r.html.replace(/<a [^>]*>|<\/a>/g,'')}</div>`:'<p>Правило не найдено.</p>';
}
function showDrawer(html){
 const d=root.querySelector('#drawer');d.hidden=false;
 d.innerHTML=`<div class="drawer-box" role="dialog" aria-modal="true"><button class="close" data-do="close" aria-label="Закрыть">×</button>${html}</div>`;
 drawer=d;d.querySelector('.close').focus();
}
function closeDrawer(){if(drawer){drawer.hidden=true;drawer=null;}}
function bookIndex(){
 const cost=q&&state&&!state.end&&q.index.t!==undefined?`<p class="cost">Вы листаете книгу при свете фонарика. Каждое открытое правило стоит ${BOOK_MINUTES} минут рейса.</p>`:'';
 const list=RULE_TEXT.filter(r=>r.id>=1&&r.id<=38).map(r=>`<button class="rule-row" data-do="rule" data-rule="${r.id}"><b>${r.id}</b>${esc(r.title)}</button>`).join('');
 showDrawer(`<h2>МППСС</h2>${cost}<div class="rule-list">${list}</div>`);
}
function openRule(id){
 if(q&&state&&!state.end&&screenName==='quest'&&q.index.t!==undefined){state.v[q.index.t]+=BOOK_MINUTES;hud(screen(q,state));persist();}
 showDrawer(ruleHtml(id));
}

// Practice: lights only. Weak rules come up more often, so the debts on the board get paid at sea.
function practice(){
 screenName='practice';root.className='is-quest is-practice';q=null;state=null;sea.resize();
 root.querySelector('#hud').innerHTML='';root.querySelector('#mast').innerHTML='';
 round=practiceRound(store.debts);
 sea.own={stack:[],top:0,nav:0};
 practiceStep();tools('<button data-do="home">Контора</button>');
}
function practiceStep(){
 const item=round.items[round.at];
 sea.set(item.scene||'sea',[item.see]);
 const opts=item.options.map((o,i)=>`<button class="choice" data-do="answer" data-i="${i}"><kbd>${i+1}</kbd><span>${esc(o)}</span></button>`).join('');
 root.querySelector('#panel').innerHTML=`<div class="page"><p class="speaker">Встреча ${round.at+1} из ${round.items.length}</p><h2>${esc(item.prompt)}</h2><div class="choices">${opts}</div></div>`;
}
function practiceAnswer(i){
 const item=round.items[round.at],right=practiceCheck(item,i);
 if(right){round.score++;const list=store.debts[item.rule];if(list){list.pop();if(!list.length)delete store.debts[item.rule];}}
 else{const list=store.debts[item.rule]||=[];if(!list.includes(item.lesson))list.unshift(item.lesson);}
 save();
 const last=round.at===round.items.length-1;
 root.querySelector('#panel').innerHTML=`<div class="page"><p class="ending ${right?'win':'fail'}">${right?'Верно':'Неверно'}</p>${right?'':`<h2>${esc(item.options[item.answer])}</h2>`}<div class="prose"><p>${esc(item.lesson)}</p></div><p><button class="rule-link" data-do="rule" data-rule="${esc(item.rule)}">Правило ${esc(item.rule)}</button></p><div class="choices"><button class="choice" data-do="${last?'practice-end':'practice-next'}"><kbd>1</kbd><span>${last?'Закончить переход':'Следующие огни'}</span></button></div></div>`;
}
function practiceEnd(){
 root.querySelector('#panel').innerHTML=`<div class="page"><h2>Переход окончен</h2><div class="prose"><p>Опознано ${round.score} из ${round.items.length}.</p></div><div class="after"><button class="primary" data-do="practice">Ещё переход</button><button class="ghost" data-do="home">В контору</button></div></div>`;
}

function onClick(e){
 if(e.target.id==='drawer'){closeDrawer();return;}
 const b=e.target.closest('[data-do]');if(!b||b.disabled)return;
 const {do:action,id,i,mode,what,rule}=b.dataset;
 if(action==='quest')open(id);
 else if(action==='choice')choose(id);
 else if(action==='slot')slotNext(+i,mode);
 else if(action==='flip')flip(what,mode);
 else if(action==='home')board();
 else if(action==='again'){const x=q.raw.id;store.active=null;save();open(x);}
 else if(action==='rule')openRule(rule);
 else if(action==='rules')bookIndex();
 else if(action==='close')closeDrawer();
 else if(action==='doc'){const d=q.raw.docs.find(x=>x.id===id);showDrawer(`<h2>${esc(d.title)}</h2><ul class="doc">${d.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`);}
 else if(action==='sound'){audio.toggle();tools(screenName==='board'?'':`<button data-do="home">Контора</button>`);}
 else if(action==='practice')practice();
 else if(action==='answer')practiceAnswer(+i);
 else if(action==='practice-next'){round.at++;practiceStep();}
 else if(action==='practice-end')practiceEnd();
}
function onKey(e){
 if(e.key==='Escape'&&drawer){closeDrawer();return;}
 if(drawer||e.metaKey||e.ctrlKey||e.altKey)return;
 const n=Number(e.key);
 if(n>=1&&n<=9){const b=root.querySelectorAll('#panel .choice:not([disabled])')[n-1];if(b)b.click();}
}

const catalog=await (await fetch(new URL('../quests/freight/catalog.json',import.meta.url))).json();
for(const path of catalog.quests){
 const raw=await (await fetch(new URL(`../quests/freight/${path}`,import.meta.url))).json();
 const x=loadQuest(raw);x.raw=raw;quests.push(x);
}
shell();board();
