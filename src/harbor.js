import {HARBOR_KEY,LOCATIONS,createHarbor,canPlay,opportunities,atLocation,enterLocal,startStory,parkStory,finishStory,beginVoyage,voyageProgress,advanceVoyage,skipVoyage,restoreHarbor} from './harbor-engine.js';
import {textChoices,chooseText,continueText,markHelp,textEnding,commandMeeting,runMeeting,stepMeeting,recordMeeting,retryMeeting,inspectEvidence,gradeInvestigation,validatePackage} from './expedition-engine.js';
import {createWorldView} from './world-renderer.js';
import {PLACES,LAND,vec,norm} from './world-engine.js';
import {cabinDetails} from './harbor-cabin-details.js';
import {createHarborIllustration} from './harbor-illustration.js';
import {ensureHarborTraffic,stepHarborTraffic} from './harbor-traffic.js';
import {RULE_TEXT,ANNEX_TEXT} from './rules-text.js';
const root=document.querySelector('#world-app'),sceneMotion=matchMedia('(prefers-reduced-motion: reduce)');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs=a=>(a||[]).map(p=>'<p>'+esc(p)+'</p>').join('');
const revision=new URL(import.meta.url).searchParams.get('v')||'local';
let catalog=[],s,view=null,screen='home',selected='lighthouse',route='direct',crew='alone',audio=null,sound=false,storageOK=true,lastSave=0,meetingChart=false;
const active=()=>catalog.find(q=>q.id===s.session?.id);
const place=id=>LOCATIONS.find(p=>p.id===id);
const rule=id=>[...RULE_TEXT,...ANNEX_TEXT].find(r=>String(r.id)===String(id));
const ruleButtons=ids=>ids.map(id=>'<button class="rule-ref" data-rule="'+id+'">'+id+'. '+esc(rule(id)?.title)+'</button>').join('');
const clock=()=>{const m=Math.floor(s.minutes)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const unread=()=>s.line.mail.filter(m=>!m.read).length;
function save(){try{localStorage.setItem(HARBOR_KEY,JSON.stringify(s));}catch{storageOK=false;}lastSave=performance.now();}
async function getJSON(u){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw Error('Не удалось загрузить '+u.pathname);return r.json();}
async function init(){
 const u=new URL('../quests/line/catalog.json',import.meta.url);u.searchParams.set('v',revision);const index=await getJSON(u);
 catalog=await Promise.all(index.packages.map(async path=>{const url=new URL(path,u);url.searchParams.set('v',revision);const q=await getJSON(url),errors=validatePackage(q);if(errors.length)throw Error(q.id+': '+errors.join(', '));q.media=Object.fromEntries(Object.entries(q.media).map(([k,v])=>{if(!['scene','music'].includes(k))return [k,v];const a=new URL(v,url);a.searchParams.set('v',revision);return [k,a.href];}));return q;}));
 try{s=restoreHarbor(localStorage.getItem(HARBOR_KEY),catalog);}catch{storageOK=false;}
 s=s||createHarbor();ensureHarborTraffic(s.world,s.seed);sound=!!s.sound;screen=s.session?'quest':s.travel?'travel':'home';render();
}
function shell(content,subtitle='Малая линия'){
 view?.destroy();view=null;
 root.innerHTML='<header class="exp-bar"><a href="./world.html" class="exp-brand"><span>✳</span><div>ДЕЛЬНЫЙ МППСС<small>МАЛАЯ ЛИНИЯ · ПРОТОТИП 0.9</small></div></a><div class="exp-subtitle">'+esc(subtitle)+'</div><nav>'+[['home','Причал'],['atlas','Атлас'],['cabin','Каюта'+(unread()?' · '+unread():'')]].map(([id,label])=>'<button data-screen="'+id+'" aria-current="'+(screen===id?'page':'false')+'">'+label+'</button>').join('')+'<button data-action="library">МППСС</button><button data-action="sound" aria-label="Переключить звук" aria-pressed="'+sound+'">'+(sound?'♫':'♪')+'</button><button data-action="help" aria-label="Помощь и настройки">?</button></nav></header>'+content+'<dialog id="info-dialog" aria-labelledby="info-title"><button class="info-close" data-action="close" aria-label="Закрыть">×</button><div id="info-body"></div></dialog>';
 const d=document.querySelector('#info-dialog');let down=false;const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 d.addEventListener('pointerdown',e=>down=e.target===d&&outside(e));d.addEventListener('pointerup',e=>{if(down&&e.target===d&&outside(e))d.close();down=false;});
}
function render(){if(screen==='quest')renderQuest();else if(screen==='atlas')renderAtlas();else if(screen==='cabin')renderCabin();else if(screen==='travel'&&s.travel)renderTravel();else renderHome();save();syncMusic();}
function leaveStory(target){
 if(s.session?.mode!=='encounter')parkStory(s);
 screen=target;if(target==='home'&&s.travel)screen='travel';render();
}
function frozenNotice(){return s.session?'<div class="suspended"><b>На переходе: '+esc(active().title)+'</b><p>Морская сцена приостановлена. Продолжите её, прежде чем менять маршрут.</p><button class="primary" data-action="resume">Вернуться на мостик →</button></div>':'';}
function storyCard(q){return '<button class="harbor-story" data-story="'+q.id+'"><span class="eyebrow">'+(s.line.parked[q.id]?'ВЫ УЖЕ НАЧАЛИ · ПРОДОЛЖИТЬ':esc(q.subtitle))+'</span><h3>'+esc(q.title)+'</h3><p>'+esc(q.nodes?.[q.entry]?.text?.[0]||q.intro?.[0])+'</p><span class="story-link">'+(q.mode==='investigation'?'Подняться в аппаратную':'Войти в историю')+' ↗</span></button>';}
function cargo(){return s.inventory.map(id=>({'power-unit':'▣ Блок питания','mila-letter':'✉ Письмо Милы','oleg-reply':'✉ Ответ Олега','liza-aboard':'◉ Лиза · до Старого порта'})[id]||id).join(' · ')||'На борту свободно';}
function locationDescription(p){
 if(p.id==='port'&&s.inventory.includes('oleg-reply'))return 'Мила ещё не знает, что написано в ответе Олега. Конверт у вас в рубке — она ждёт его у своего причала.';
 if(p.id==='port'&&s.inventory.includes('liza-aboard'))return 'Нина ждёт Лизу в мастерской. Илье обещали дать знать по прибытии. Здесь заканчивается первая самостоятельная поездка его дочери.';
 if(p.id==='lighthouse'&&s.flags.lighthouseLink)return 'Олег прислал список на четверг. Маяк работает, старый аккумулятор убран. На следующей неделе он ждёт вас уже по расписанию.';
 if(p.id==='lighthouse'&&s.flags.beaconRepaired)return 'Олег убирает старый аккумулятор в шкаф. Новый блок работает, письмо прочитано. Для Милы он написал ответ — тот лежит у вас в рубке.';
 if(p.id==='village'&&s.flags.villageLink)return 'У Ильи больше нет синей сумки на причале. Он уже знает, что Лиза добралась. Теперь они оба ждут субботнего рейса.';
 if(p.id==='village'&&s.flags.lizaMet)return 'Илья смотрит вслед вашему катеру. Лиза уже на борту. Следующий берег для неё — Старый порт.';
 if(p.id==='workshop'&&s.flags.yachtLaunched)return 'Дверь мастерской заперта. Нина впервые ушла домой без инструментов. Яхта ждёт следующей субботы на воде.';
 if(p.id==='workshop'&&s.flags.windshieldFixed)return 'Щётка «Смены» работает. У Нины на столе три кружки: Лада обещала прийти, когда закончит рейс.';
 if(p.id==='port'&&s.line.links.length===2)return 'На доске две строки: маяк — четверг, посёлок — суббота. Мила наливает чай. Оказывается, местная линия начинается именно так.';
 if(p.id==='port'&&s.flags.lighthouseLink)return 'Ответ Олега у Милы в кармане. Под навесом появилось первое расписание: «Маяк — четверг». Она всё ещё ждёт новостей с южного берега.';
 if(p.id==='port'&&s.flags.villageLink)return 'Лиза уже у Нины, Илья получил сообщение. Мила вписала первый регулярный рейс: «Посёлок — суббота». Для маяка пока оставлена пустая строка.';
 return p.description;
}
function commitments(){
 const list=[];
 if(s.inventory.includes('liza-aboard'))list.push(['port','Лизу ждут в Старом порту','Довезти пассажирку и сообщить Илье']);
 if(s.inventory.includes('oleg-reply'))list.push(['port','Ответ на обратный берег','Отвезти письмо Миле']);
 if(s.inventory.includes('power-unit'))list.push(['lighthouse','Ящик под крышей рубки','Доставить блок и письмо Олегу']);
 return list.length?'<div class="commitments"><span class="eyebrow">ВЫ ДОГОВОРИЛИСЬ</span>'+list.map(([id,title,text])=>'<button data-destination="'+id+'"><b>'+title+'</b><span>'+text+' →</span></button>').join('')+'</div>':'';
}
function nextPlaces(){return LOCATIONS.filter(p=>p.id!==s.line.location).map(p=>({p,qs:opportunities(s,catalog,p.id)})).filter(e=>e.qs.length);}
function renderHome(){
 if(s.travel){screen='travel';renderTravel();return;}
 const loc=place(s.line.location),local=opportunities(s,catalog,loc.id),nearHome=['port','workshop'].includes(loc.id),others=nextPlaces(),links=s.line.links.length;
 shell('<main class="harbor-layout'+(nearHome?' illustrated-home':'')+'"><section class="harbor-diorama">'+(nearHome?'<div id="port-stage" role="group" aria-label="Старый порт: мастерская, почтовый причал и суда"></div>':'<canvas id="harbor-canvas" aria-label="'+esc(loc.name)+': причал и местные жители"></canvas>')+'<div class="harbor-title"><span class="eyebrow">'+(nearHome?'ВАШ ДОМ НА БЕРЕГУ':'ПРИБЫТИЕ')+'</span><h1>'+esc(loc.name)+'</h1><p>'+clock()+' · '+(nearHome?'«Смена» у своего причала':loc.tag)+'</p></div><div class="diorama-actions"><button data-screen="cabin">На борт «Смены» ↗</button></div><div class="harbor-weather">'+(s.flags.yachtLaunched&&nearHome?'У причала сушится парус Нины.':s.flags.beaconRepaired?(loc.id==='lighthouse'?'Олег подключил блок. Маяк снова работает.':'С северного берега снова виден маяк.'):'Ветер с моря. Под навесом ещё сухо.')+'<span>'+(nearHome?'Выберите человека на причале или дело справа':'Карту можно двигать и приближать')+'</span></div></section><aside class="harbor-paper"><div class="line-progress"><span class="eyebrow">МАЛАЯ ЛИНИЯ</span><span>'+links+' / 2 берега</span></div><h2>'+(links===2?'Теперь нас ждут':'Кому-то нужно на другой берег')+'</h2><p class="harbor-lead">'+(links===2?'У нашей линии появились четверг и суббота. Маяк ждёт посылки, Илья — возвращения Лизы. Остальные истории можно закончить в своём порядке.':locationDescription(loc))+'</p>'+frozenNotice()+commitments()+local.map(storyCard).join('')+(!local.length?'<div class="quiet-state"><span>Здесь пока спокойно</span><p>'+esc(loc.id==='lighthouse'&&!s.flags.supplyTaken?'Олег на острове. За ящиком и письмом сначала стоит зайти к Миле.':s.completed['mila-cargo']?.vars.rushed&&loc.id==='port'&&!s.line.links.length?'Мила придерживает пустое место под навесом. «В следующий раз не слушай, когда Семён начинает торопить. Он всегда успевает на свой паром».':'Никто не зовёт вас срочно отходить. Можно разобрать почту или выбрать следующее дело.')+'</p></div>':'')+'<div class="harbor-elsewhere"><span class="eyebrow">ЕЩЁ ЕСТЬ ПОВОД ЗАЙТИ</span>'+others.slice(0,3).map(({p,qs})=>'<button data-destination="'+p.id+'"><span>'+esc(p.person)+' · '+esc(p.name)+'</span><strong>'+esc(qs[0].title)+' ↗</strong></button>').join('')+'</div><button class="primary" data-screen="atlas">Развернуть атлас · выбрать рейс →</button><div class="port-note">'+(unread()?'<button data-screen="cabin">✉ Новая почта · '+unread()+'</button>':'<button data-screen="cabin">Каюта · письма и вещи</button>')+'<span>'+esc(cargo())+'</span></div></aside></main>');
 const pins=nearHome?LOCATIONS.filter(p=>['port','workshop'].includes(p.id)).map(p=>({...p,berth:PLACES[0].berth,radius:100})):LOCATIONS.filter(p=>p.id===loc.id).map(p=>({...p,berth:PLACES.find(b=>b.id===p.id).berth,radius:100}));
 if(nearHome)mountPort('#port-stage',loc.id==='workshop');
 else makeView('#harbor-canvas',{places:pins,initialZoom:1.7,onPlace:openPlace},loc.id==='village'?{x:-22,z:49}:{x:-29,z:-52});
}
function mountPort(selector,workshop=false,narrative=false){
 ensureHarborTraffic(s.world,s.seed);
 view=createHarborIllustration(document.querySelector(selector),{getState:visibleWorld,onFrame:ambientFrame,revision,workshop,narrative,onInspect:ship=>{showInfo('«'+esc(ship.name)+'»','<p>'+(ship.type==='sail'?'Парусная яхта проходит мимо домашнего причала.':'Местное судно идёт вдоль рейда.')+' Здесь можно спокойно осмотреть порт. Встречи, требующие решения по МППСС, начинаются на переходах.</p>');}});
}
function visibleWorld(){
 const w={...s.world,portSchedule:s.line.links.length};
 if(s.flags.yachtLaunched&&['port','workshop'].includes(s.line.location)&&!s.travel)w.traffic=[...w.traffic,{id:'nina-yacht',name:'Яхта Нины',type:'sail',x:-14,z:15,h:180,s:0,trail:[]}];
 return w;
}
function makeView(selector,options={},focus){
 ensureHarborTraffic(s.world,s.seed);
 view=createWorldView(document.querySelector(selector),{getState:visibleWorld,onFrame:ambientFrame,places:[],zones:[],showBounds:false,characters:[{x:-24,z:16,color:'#a3624c'},{x:-32,z:1,color:'#556d73'},{x:-14,z:49,color:'#9a7953'},{x:-23,z:-50,color:'#556d73'}],...options});if(focus)view.focus(focus);
}
function ambientFrame(dt){
 if(document.hidden||document.querySelector('#info-dialog')?.open)return;
 if(!sceneMotion.matches)stepHarborTraffic(s.world.traffic,dt);s.world.sceneryClock=(s.world.sceneryClock||0)+dt;
 if(performance.now()-lastSave>5000)save();
 if(screen==='travel'&&!s.session){const speed=Math.max(8,(s.line.voyage?.total||100)/17.5);const e=advanceVoyage(s,dt,catalog,speed);if(e){screen=e.type==='quest'?'quest':'home';render();return;}document.querySelector('#voyage-progress')?.setAttribute('value',voyageProgress(s));if(performance.now()-lastSave>1000)save();}
}
function atlasLand(i){
 const ring=Array.from({length:30},(_,n)=>{const a=n/30*Math.PI*2,r=.94+.06*Math.sin(n*1.7+i.x);return [i.x+Math.cos(a)*i.rx*r,i.z+Math.sin(a)*i.rz*r];});
 const coast='<path d="M'+ring.map(p=>p.join(',')).join('L')+'Z" fill="#bdc4a4" stroke="#8d9d81" stroke-width=".5"/>';
 const home=(x,z)=>'<path d="m'+x+' '+z+' 3-2.5 3 2.5v4h-6Z" fill="#ebe1bd" stroke="#9c9d7d" stroke-width=".3"/><path d="m'+x+' '+z+' 3-2.5 3 2.5" fill="none" stroke="#a2815f" stroke-width="1"/>';
 const tree=(x,z)=>'<path d="m'+x+' '+z+'-2 5h4Z" fill="#7d9b81"/><path d="m'+x+' '+(z+4)+'v3" stroke="#8a9574" stroke-width=".4"/>';
 let objects='';
 if(i.id==='port')objects=home(-52,3)+home(-42,10)+home(-50,16)+'<path d="M-30 13h6v8h-6" fill="none" stroke="#a79772" stroke-width="1.4"/>'+tree(-48,-8)+tree(-55,9);
 if(i.id==='lighthouse')objects='<path d="m-32-52 1-10h2l1 10Z" fill="#f3dfb4" stroke="#aa8b63" stroke-width=".4"/><path d="M-31-56h2M-31-59h2" stroke="#b37d5d" stroke-width="1"/><circle cx="-30" cy="-62" r="1" fill="#b5945a"/>';
 if(i.id==='village')objects=home(-29,49)+home(-22,53)+tree(-25,43);
 if(i.id==='pines')objects=tree(50,-51)+tree(56,-52)+tree(53,-45);
 if(i.id==='rocks')objects='<path d="m53 52 2-9 4 4 2-2 4 7Z" fill="#9caa91" stroke="#879c8b" stroke-width=".4"/>';
 return '<ellipse cx="'+i.x+'" cy="'+i.z+'" rx="'+(i.rx+2)+'" ry="'+(i.rz+2)+'" fill="none" stroke="#73948c33" stroke-width=".5"/>'+coast+objects;
}
function atlasSVG(){
 const dest=selected==='workshop'?'port':selected,copy=JSON.parse(JSON.stringify(s));copy.session=null;copy.travel=null;
 const preview=beginVoyage(copy,dest,route),points=preview?[s.world.own,...copy.travel.route]:[];
 return '<svg viewBox="-85 -78 170 150" class="atlas-map" role="group" aria-label="Атлас берегов. Выбранный путь огибает сушу."><defs><pattern id="atlas-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#758f8522" stroke-width=".2"/></pattern></defs><rect x="-85" y="-78" width="170" height="150" fill="url(#atlas-grid)"/>'+LAND.map(atlasLand).join('')+(points.length?'<polyline points="'+points.map(p=>p.x+','+p.z).join(' ')+'" fill="none" stroke="#b27248" stroke-width=".7" stroke-dasharray="2 1.5"/>':'')+LOCATIONS.filter(p=>p.id!=='workshop').map(p=>{const berth=PLACES.find(b=>b.id===p.id).berth;return '<a href="#'+p.id+'" data-map-place="'+p.id+'" aria-label="Выбрать '+esc(p.name)+'"><circle cx="'+berth.x+'" cy="'+berth.z+'" r="2" fill="'+(p.id===dest?'#a76545':'#e9e6cb')+'" stroke="#5b7b6a" stroke-width=".4"/><text x="'+(berth.x+5)+'" y="'+(berth.z+1)+'">'+esc(p.name)+'</text></a>';}).join('')+'<circle cx="'+s.world.own.x+'" cy="'+s.world.own.z+'" r="1" fill="#314f4b"/><text x="45" y="-60" class="map-north">N ↑</text><text x="19" y="-3" class="map-water">ВОСТОЧНЫЙ РЕЙД</text><text x="32" y="58" class="map-water">МАЛАЯ ЛИНИЯ</text></svg>';
}
function renderAtlas(){
 const p=place(selected),local=atLocation(s,selected),qs=opportunities(s,catalog,selected),needsPort=selected==='workshop',dest=needsPort?'port':selected;
 shell('<main class="atlas-layout"><section class="atlas-sheet"><div class="atlas-heading"><span class="eyebrow">ЛОЦИЯ ЗНАКОМЫХ БЕРЕГОВ</span><h1>Куда сегодня?</h1><p>Дела не исчезают, пока вы выбираете. Чтение не двигает часы.</p></div>'+atlasSVG()+'<div class="atlas-ports">'+LOCATIONS.map(p=>'<button data-select="'+p.id+'" aria-pressed="'+(selected===p.id)+'"><span>'+esc(p.person)+'</span><b>'+esc(p.name)+'</b><small>'+((s.line.location===p.id)?'Вы здесь':'Доступно: '+opportunities(s,catalog,p.id).length)+'</small></button>').join('')+'</div></section><aside class="harbor-paper atlas-plan"><span class="eyebrow">'+esc(p.tag)+'</span><h2>'+esc(p.name)+'</h2><p class="harbor-lead">'+esc(locationDescription(p))+'</p>'+frozenNotice()+(s.travel&&!s.session?'<div class="suspended"><p>Вы уже в пути. Сначала завершите текущий переход.</p><button class="primary" data-screen="travel">Вернуться к переходу →</button></div>':'')+'<div class="destination-stories">'+qs.map(q=>'<article><span class="eyebrow">'+({text:'История',encounter:'Манёвр',investigation:'Расследование'})[q.mode]+'</span><h3>'+esc(q.title)+'</h3><p>'+esc(q.subtitle)+'</p></article>').join('')+(!qs.length?'<p class="quiet-state">'+(selected==='port'&&(s.inventory.includes('oleg-reply')||s.inventory.includes('liza-aboard'))?'Здесь вас ждут. Доставка завершится, когда «Смена» дойдёт до причала.':selected==='lighthouse'&&!s.flags.supplyTaken?'Для истории на маяке нужен ящик Милы. Сначала поговорите с ней в Старом порту.':'Можно зайти без поручения. Новых историй здесь пока нет.')+'</p>':'')+'</div>'+(local?'<button class="primary" data-open-place="'+selected+'">'+(selected==='workshop'?'Пройти к мастерской':'Сойти на причал')+' →</button>':!s.travel&&!s.session?'<fieldset class="route-picker"><legend>Как идём</legend><button data-route="direct" aria-pressed="'+(route==='direct')+'"><b>Через плёс</b><span>Коротко · '+(s.completed['marta-crossing']?'знакомый рейд':'возможна встреча с «Мартой»')+'</span></button><button data-route="outer" aria-pressed="'+(route==='outer')+'"><b>Восточным обходом</b><span>Дальше · в стороне от рейда</span></button></fieldset>'+(s.flags.ninaReady?'<label class="crew-picker">Кто на борту<select id="crew"><option value="alone" '+(crew==='alone'?'selected':'')+'>Иду самостоятельно</option><option value="nina" '+(crew==='nina'?'selected':'')+'>Позвать Нину</option></select></label>':'<p class="crew-note">Вы на мостике. Нину можно пригласить после встречи в мастерской.</p>')+(needsPort?'<p class="crew-note">Мастерская в Старом порту. Сначала дойдём до его причала.</p>':'')+'<button class="primary" data-depart="'+dest+'">Отдать швартовы →</button>':'')+'<div class="cargo-strip">'+esc(cargo())+'</div></aside></main>','Атлас рейсов');
}
function openPlace(id){
 if(s.travel){screen='travel';render();return;}
 if(!atLocation(s,id)){selected=id;screen='atlas';render();return;}
 if(['port','workshop'].includes(id))enterLocal(s,id);
 s.line.location=id;screen='home';render();
}
function renderTravel(){
 const to=place(s.travel.place),from=place(s.line.voyage?.from)||place('port');
 shell('<main class="harbor-layout travel-layout"><section class="harbor-diorama"><canvas id="harbor-canvas" aria-label="Короткий переход по проложенному пути"></canvas><div class="harbor-title"><span class="eyebrow">В ПУТИ</span><h1>'+esc(to.name)+'</h1><p>'+esc(from.name)+' → '+esc(to.name)+' · '+(s.travel.style==='outer'?'восточным обходом':'через плёс')+'</p></div><div class="voyage-meter"><progress id="voyage-progress" max="1" value="'+voyageProgress(s)+'"></progress><span>Спокойный переход · морские решения запускаются отдельными сценами</span></div></section><aside class="harbor-paper"><span class="eyebrow">НА БОРТУ «СМЕНЫ»</span><h2>Берег медленно отходит</h2>'+frozenNotice()+'<div class="story-copy">'+paragraphs(s.line.crew==='nina'?['Нина держит кружку двумя руками. В открытой рубке чай остывает быстрее, чем успеваешь пить.','— Когда была маленькая, всё смотрела, как берег отходит. Считала, что лодка стоит, а мир едет. Иногда до сих пор так кажется.']:s.inventory.includes('liza-aboard')?['Лиза открывает тетрадь и тут же закрывает её снова. Убирает телефон. Потом всё-таки достаёт и фотографирует берег.','— Только папе не говори, что я ещё ни разу не ездила одна. Он и так знает, но пусть думает, что я не заметила.']:['На берегу уменьшаются окна и люди. Какое-то время ещё видна рука у дверей мастерской, потом остаётся только светлый прямоугольник.','В рубке тихо потрескивает приёмник.'])+'</div><div class="cargo-strip">'+esc(cargo())+'</div><button class="primary" data-action="skip-voyage" '+(s.session?'disabled':'')+'>Пропустить спокойную часть →</button><p class="control-note">Важная встреча остановит переход, даже если его пропустить.</p></aside></main>','Между берегами');
 makeView('#harbor-canvas',{initialZoom:.85});
}
function cabinSVG(){return '<svg viewBox="0 0 650 650" aria-label="Каюта Смены: окно, настольная лампа, письма и карта" role="img"><defs><linearGradient id="wood" x2="1" y2="1"><stop stop-color="#4b6c63"/><stop offset="1" stop-color="#2c4845"/></linearGradient><radialGradient id="lamp"><stop stop-color="#e9c584" stop-opacity=".48"/><stop offset="1" stop-color="#e9c584" stop-opacity="0"/></radialGradient></defs><rect width="650" height="650" fill="url(#wood)"/>'+Array.from({length:14},(_,i)=>'<path d="M0 '+i*50+'h650" stroke="#234a4566"/>').join('')+'<rect x="100" y="45" width="450" height="265" rx="110" fill="#223e3b" stroke="#a99770" stroke-width="9"/><rect x="120" y="64" width="410" height="226" rx="95" fill="#8baeb2"/><path d="M120 187q80-10 150 0t140 0t120 0v16H120" fill="#b5c8b9"/><path d="M415 189l-40-26-9-34-19 15-30-19-19 54-21 10" fill="#678b79"/><path d="M120 238q110-16 200 0t210 0" fill="none" stroke="#c1d0bd"/><path d="M325 65v225M120 180h410" stroke="#536f63" stroke-width="5"/><circle cx="210" cy="438" r="200" fill="url(#lamp)"/><path d="M42 400h566l42 250H0Z" fill="#a88d67"/><path d="M42 400h566M15 550h620" stroke="#776e53"/><path d="m280 436 218 30-41 143-220-35Z" fill="#ded6b5"/><path d="m310 467 46 67 80-27-22 60" fill="none" stroke="#8caa96" stroke-dasharray="5 5" stroke-width="3"/><path d="m301 476 16-12 6 11-13 12Z" fill="#9a8057"/><path d="M181 454v-107l-25-26" fill="none" stroke="#314e45" stroke-width="9"/><path d="m132 302 41 12 33 42-93-18Z" fill="#d3b77e"/><ellipse cx="182" cy="454" rx="35" ry="10" fill="#3e5a4d"/><path d="m88 500 104-12 5 67-105 12Z" fill="#e7dcc0"/><path d="m88 500 56 24 48-36" fill="none" stroke="#b4a882"/><circle cx="552" cy="427" r="22" fill="#e3ddc1"/><circle cx="552" cy="427" r="15" fill="#7e6350"/><text x="365" y="641" font-family="Georgia" font-size="14" fill="#d9ceac">СМЕНА · ВСЕГДА ЕСТЬ КУДА ВЕРНУТЬСЯ</text>'+cabinDetails()+'</svg>';}
function renderCabin(){
 shell('<main class="cabin-layout"><section class="cabin-scene">'+cabinSVG()+'<div class="cabin-title"><span class="eyebrow">ВАША ЛОДКА</span><h1>На борту «Смены»</h1><p>'+esc(cargo())+'</p></div><button class="cabin-map" data-screen="atlas">Карта на столе · выбрать следующий берег ↗</button></section><section class="cabin-paper"><div class="episode-kicker">ПОЧТА И ВЕЩИ <span>'+clock()+'</span></div><h2>То, что остаётся с вами</h2>'+frozenNotice()+'<div class="cabin-tabs"><button data-action="mail-read">Отметить почту прочитанной</button><button data-action="journal">Разборы решений ↗</button></div><div class="mail-stack">'+s.line.mail.map(m=>'<article class="letter '+(m.read?'':'unread')+'"><span class="eyebrow">'+esc(m.from)+(m.read?'':' · НОВОЕ')+'</span><h3>'+esc(m.title)+'</h3><p>'+esc(m.text)+'</p></article>').join('')+'</div><h3 class="memory-heading">Вещи с историей · '+s.line.memories.length+'</h3><div class="memory-shelf">'+s.line.memories.map(m=>'<article><span>✧</span><h4>'+esc(m.title)+'</h4><p>'+esc(m.text)+'</p></article>').join('')+(!s.line.memories.length?'<p class="empty-shelf">Полка пока пустая. После рейсов здесь останутся вещи и договорённости.</p>':'')+'</div></section></main>','Каюта и почта');
}
function renderQuest(){const q=active();if(!q){screen=s.travel?'travel':'home';render();return;}if(q.mode==='text')renderText(q);if(q.mode==='encounter')renderMeeting(q);if(q.mode==='investigation')renderInvestigation(q);}
function decisionDiagram(kind){
 const crossing=kind==='crossing';
 return '<div class="quest-chart"><span class="eyebrow">ОБСТАНОВКА В ЭТОЙ СЦЕНЕ</span><svg viewBox="0 0 500 350" role="img" aria-label="'+(crossing?'Заря слева от Смены, поворачивает для прохода за кормой':'Парусная яхта подходит к моторному катеру с кормы: обгон')+'"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10" fill="#bf8552"/></marker></defs><path d="M250 310V45" stroke="#e6d8ab" stroke-width="2" stroke-dasharray="6 6" fill="none"/>'+(crossing?'<path d="M30 185H140Q175 185 175 240Q175 275 220 275H420" stroke="#bf8552" stroke-width="3" stroke-dasharray="7 5" fill="none" marker-end="url(#arrow)"/><path d="m130 177 24 8-24 8Z" fill="#bb855f"/><text x="38" y="161">«ЗАРЯ» · МЕХАНИЧЕСКОЕ</text><text x="36" y="331">Намерение: пройти за кормой</text><path d="m250 182-8 24 8-4 8 4Z" fill="#f1d7a2"/><text x="273" y="207">«СМЕНА»</text>':'<path d="M237 300V225Q237 165 205 110V45" stroke="#bf8552" stroke-width="3" stroke-dasharray="7 5" fill="none" marker-end="url(#arrow)"/><path d="m250 110-8 24 8-4 8 4Z" fill="#f1d7a2"/><text x="275" y="132">МОТОРНЫЙ КАТЕР</text><path d="m237 255-8 24 8-4 8 4Z" fill="#bf8552"/><text x="45" y="282">ВАША ЯХТА · ПОД ПАРУСОМ</text><text x="36" y="331">Подходим более 22,5° позади траверза</text>')+'<text x="20" y="28" class="diagram-note">Условная схема · вид сверху · север ↑</text></svg></div>';
}
function renderText(q){
 const t=s.session,n=q.nodes[t.node],p=t.pending,ending=textEnding(t,q),notes=t.history.filter(e=>e.correct!==null),rainScene=n.visual==='rain-watch',homeScene=!n.diagram&&!rainScene&&['port','workshop'].includes(q.trigger.place);
 const content=p?'<div class="verdict '+(p.correct?'correct':'wrong')+'" role="status"><span>'+(p.correct?'✓ Обоснованное решение':'✕ В решении есть ошибка')+'</span><p>'+esc(p.feedback)+'</p>'+ruleButtons([p.rule])+'</div><button class="primary" data-action="text-next">'+(p.correct?'Продолжить сцену':'Продолжить с исправлением')+' →</button>':n.ending?'<div class="ending-note"><span class="eyebrow">ЭТОТ ЭПИЗОД ЗАВЕРШЁН</span><p>'+esc(ending.summary)+'</p></div><button class="primary" data-action="finish-story">'+esc(ending.label)+' →</button>':'<div class="story-choices">'+textChoices(t,q).map(c=>'<button data-choice="'+esc(c.id)+'">'+esc(c.text)+'</button>').join('')+'</div>';
 shell('<main class="episode-layout text-episode"><section class="story-scene harbor-story-scene'+(homeScene?' illustrated-story':'')+'">'+(n.diagram?decisionDiagram(n.diagram):rainScene?'<img src="'+new URL('../assets/harbor/rain-watch.svg?v='+revision,import.meta.url).href+'" alt="Дождь за стеклом рубки; щётка очищает только левую половину. Другого судна не видно.">':homeScene?'<div id="story-port" class="story-port" aria-hidden="true"></div>':'<canvas id="story-canvas" aria-label="Место этой истории"></canvas>')+'<div class="scene-heading"><span class="eyebrow">'+esc(q.subtitle)+'</span><h1>'+esc(q.title)+'</h1></div><div class="scene-notebook"><span>В ЭТОЙ ИСТОРИИ</span>'+notes.map(e=>'<p class="'+(e.correct?'good-note':'bad-note')+'">'+(e.correct?'✓':'✕')+' '+esc(rule(e.rule)?.title)+'</p>').join('')+'<small>'+t.history.length+' реплик · решения сохраняются</small></div></section><article class="story-panel"><div class="episode-kicker">ТЕКСТОВОЕ ПРИКЛЮЧЕНИЕ <button data-action="park-story">Отложить</button></div><h2>'+esc(n.title)+'</h2><div class="speaker">'+esc(n.speaker)+'</div><div class="story-copy">'+paragraphs(n.text)+'</div>'+content+'<details class="transcript"><summary>Предыдущие реплики · '+t.history.length+'</summary>'+t.history.slice().reverse().map(e=>'<div><p>'+esc(e.text)+'</p>'+(e.feedback?'<small>'+esc(e.feedback)+'</small>':'')+'</div>').join('')+'</details></article></main>',q.title);
 if(homeScene)mountPort('#story-port',q.trigger.place==='workshop',true);
 else if(!n.diagram&&!rainScene){const id=q.trigger.place;makeView('#story-canvas',{initialZoom:id==='village'?1.7:1.6},id==='village'?{x:-22,z:48}:id==='workshop'?{x:-33,z:3}:{x:-32,z:13});}
}
function repaintInvestigation(){const pane=document.querySelector('.investigation-episode'),cards=document.querySelector('.evidence-cards'),top=pane?.scrollTop||0,left=cards?.scrollLeft||0;render();document.querySelector('.investigation-episode').scrollTop=top;document.querySelector('.evidence-cards').scrollLeft=left;}

function meetingState(){const m=s.session.local;return {own:m.own,traffic:[m.target],route:[],encounter:{id:'marta'},beacon:false};}
function meetingOverlay({c,project,width,height}){
 const m=s.session?.local;if(!m||s.session.mode!=='encounter')return;
 const label=(text,x,y,color='#fff8e8')=>{c.font='500 14px Golos,sans-serif';const w=c.measureText(text).width+22;x=Math.max(12,Math.min(width-w-12,x-w/2));y=Math.max(200,Math.min(height-135,y));c.fillStyle='#234c56';c.fillRect(x,y-23,w,32);c.fillStyle=color;c.textAlign='left';c.fillText(text,x+11,y-2);};
 if(m.preview&&m.phase==='planning'){
  for(const [ship,color,h,sp] of [[m.own,'#ffe0a1',m.command,m.speed],[m.target,'#e6f0df',m.target.h,m.target.s]]){
   const v=vec(h,sp),a=project([ship.x,.05,ship.z]),b=project([ship.x+v.x*22,.05,ship.z+v.z*22]);c.strokeStyle='#244651';c.lineWidth=5;c.setLineDash([]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle=color;c.lineWidth=2.5;c.setLineDash(ship===m.own?[9,6]:[2,6]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.setLineDash([]);const an=Math.atan2(b.y-a.y,b.x-a.x);c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-10*Math.cos(an-.4),b.y-10*Math.sin(an-.4));c.moveTo(b.x,b.y);c.lineTo(b.x-10*Math.cos(an+.4),b.y-10*Math.sin(an+.4));c.stroke();
   if(ship===m.own)label('Ваш план · '+Math.round(h)+'°',b.x,b.y+54,color);
  }
 }
 const compact=width<500,lines=m.preview?['Сплошная линия — наблюдавшийся след','Штрихи — ваш план','Точки — «Марта», если сохранит ход']:['Сплошная линия — наблюдавшийся след'];
 const boxH=lines.length*24+18;c.fillStyle='#234c56';c.fillRect(16,height-boxH-16,width-32,boxH);c.fillStyle='#fff8e8';c.textAlign='left';c.font=(compact?'12':'14')+'px Golos,sans-serif';lines.forEach((text,i)=>c.fillText(text,28,height-boxH+10+i*24));
}

function renderMeeting(q){
 shell('<main class="episode-layout maneuver-episode"><section class="maneuver-scene"><canvas id="meeting-canvas" aria-label="Встреча двух судов на открытой воде: подписи, треки и прогноз выбранного манёвра"></canvas><div class="scene-heading"><span class="eyebrow">ОТДЕЛЬНАЯ ИГРА / ОТКРЫТАЯ ВОДА</span><h1>Граница рейда</h1><p>«Смена» и «Марта» · учебный масштаб</p></div><div class="scene-time" id="meeting-time"></div><button class="meeting-camera" data-action="meeting-camera" aria-pressed="'+meetingChart+'">'+(meetingChart?'Вернуть наклонный вид':'Вид сверху')+'</button></section><aside class="maneuver-panel" id="meeting-panel"></aside></main>',q.title);
 view=createWorldView(document.querySelector('#meeting-canvas'),{getState:meetingState,onFrame:meetingFrame,places:[],zones:[],showLand:false,showBounds:false,onDraw:meetingOverlay,projection:meetingChart?'chart':'island',padding:{top:190,bottom:105}});view.focus({x:0,z:0});updateMeetingPanel();
}
function updateMeetingPanel(){
 if(screen!=='quest'||active()?.mode!=='encounter')return;const q=active(),m=s.session.local,ruleID=m.kind==='headon'?14:15;
 document.querySelector('#meeting-panel').innerHTML='<div class="episode-kicker">02 / УПРАВЛЕНИЕ <button data-screen="atlas">К атласу</button></div><h2>'+(m.kind==='headon'?'Нос к носу':'Судно справа')+'</h2>'+(m.phase==='planning'?'<div class="story-copy compact">'+paragraphs(q.intro)+'</div><div class="observation"><span>НАБЛЮДЕНИЯ ДО НАЧАЛА МАНЁВРА</span><p>Пеленг сохраняется, дистанция уменьшается. По имеющимся наблюдениям есть опасность столкновения.</p><p>«Смена»: '+Math.round(m.initialH)+'° · «Марта»: '+Math.round(norm(m.rotation+(m.kind==='headon'?180:270)))+'°</p></div>':'')+(m.phase!=='result'?'<div class="helm-planner"><span class="eyebrow">ВАШЕ УПРАВЛЕНИЕ</span><div class="course-display"><button data-turn="-30" aria-label="Изменить заданный курс на 30 градусов влево">↶ 30°</button><strong>'+String(Math.round(m.command)).padStart(3,'0')+'°</strong><button data-turn="30" aria-label="Изменить заданный курс на 30 градусов вправо">30° ↷</button></div><div class="speed-options">'+[[0,'Стоп'],[.4,'Малый ход'],[1,'Исходный ход']].map(([n,name])=>'<button data-meeting-speed="'+n+'" aria-pressed="'+(Math.abs(m.speed-m.initialS*n)<.01)+'">'+name+'</button>').join('')+'</div></div>'+(m.phase==='planning'?'<button class="quiet-button" data-action="preview" aria-pressed="'+m.preview+'">'+(m.preview?'☑':'☐')+' План и прогноз движения</button><button class="primary" data-action="run-meeting">Выполнить манёвр →</button><p class="control-note">Сейчас сцена ждёт вашего решения. После команды суда начнут движение; курс и ход можно менять.</p>':'<button class="quiet-button" data-action="pause-meeting">'+(m.paused?'▶ Продолжить движение':'Ⅱ Приостановить движение')+'</button><p class="control-note">Суда движутся. Наблюдайте увеличение дистанции и результат своего действия.</p>'):
 '<div class="verdict '+(m.success?'correct':'wrong')+'"><span>'+(m.success?'✓ Суда разошлись':'✕ Встреча требует разбора')+'</span><p>'+esc(m.reason)+'</p>'+ruleButtons([ruleID,8])+'</div>'+(m.success?'<p class="story-copy">«Спасибо за понятный манёвр, — говорит капитан „Марты“. — Я Лада. После смены буду у Нины в мастерской. Заходи».</p><button class="primary" data-action="finish-meeting">Продолжить рейс →</button>':'<button class="primary" data-action="retry-meeting">Повторить эту встречу →</button><button class="quiet-button" data-action="retreat-meeting">После разбора выбрать обходной путь</button>'))+'<div class="episode-reference">МППСС под рукой: '+ruleButtons([ruleID,7,8])+'</div>';
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
 shell('<main class="investigation-episode"><section class="investigation-intro"><div class="workshop-image" style="background-image:url(&quot;'+esc(q.media.scene)+'&quot;)"><span class="eyebrow">03 / АППАРАТНАЯ МАЯКА</span><h1>Огни у маяка</h1></div><div class="workshop-story">'+paragraphs(q.intro)+'</div></section><section class="evidence-workspace"><div class="episode-kicker">СОПОСТАВЬТЕ СВИДЕТЕЛЬСТВА <button data-screen="atlas">К атласу</button></div><div class="evidence-cards">'+q.puzzle.evidence.map(e=>'<button data-evidence="'+e.id+'" class="evidence-card '+(l.evidence.includes(e.id)?'read':'')+'"><span>'+(l.evidence.includes(e.id)?'✓ ПРОЧИТАНО':'ОТКРЫТЬ СВИДЕТЕЛЬСТВО')+'</span><h3>'+esc(e.label)+'</h3><small>'+esc(e.stamp)+'</small>'+(l.evidence.includes(e.id)?'<p>'+esc(e.text)+'</p><em>'+esc(e.finding)+'</em>':'<p>Нажмите, чтобы положить запись на стол.</p>')+'</button>').join('')+'</div><section class="light-workbench"><div class="light-schema"><span class="eyebrow">СОСТАВ ОГНЕЙ «ЗАРИ»</span>'+lanternDiagram(l.lights)+'</div><div class="light-controls"><h2>Какие огни были нужны?</h2><label>Статус судна<select id="vessel-status" '+(f?.correct?'disabled':'')+'><option value="">Выберите по свидетельствам</option>'+q.puzzle.statuses.map(a=>'<option value="'+a.id+'" '+(a.id===l.status?'selected':'')+'>'+esc(a.label)+'</option>').join('')+'</select></label><div class="light-switches">'+['upper','lower'].map((key,i)=>'<label>Круговой · '+(i?'нижний':'верхний')+'<select data-lamp="'+key+'" '+(f?.correct?'disabled':'')+'>'+Object.entries(colorName).map(([id,name])=>'<option value="'+id+'" '+(l.lights[key]===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label>').join('')+'</div><div class="navigation-switches">'+[['mast','Топовый'],['sides','Бортовые · пара'],['stern','Кормовой']].map(([k,name])=>'<label><input type="checkbox" data-lamp="'+k+'" '+(l.lights[k]?'checked':'')+' '+(f?.correct?'disabled':'')+'> '+name+'</label>').join('')+'</div><p class="control-note">Исправьте схему под фактическое состояние судна. Выключенные огни показаны серым.</p>'+(f?'<div class="verdict '+(f.correct===true?'correct':f.correct===false?'wrong':'neutral')+'" role="status"><span>'+(f.correct===true?'✓ Картина восстановлена':f.correct===false?'✕ Есть противоречие':'Ещё не все сведения')+'</span><p>'+esc(f.text)+'</p>'+ruleButtons([3,26,23])+'</div>':'')+'<button class="primary" data-action="'+(f?.correct?'finish-investigation':'check-investigation')+'">'+(f?.correct?'Передать вывод и закончить заказ':'Передать Олегу вывод')+' →</button></div></section><div class="episode-reference">МППСС под рукой: '+ruleButtons(q.rules)+'</div></section></main>',q.title);
}

function showInfo(title,body){document.querySelector('#info-body').innerHTML='<span class="eyebrow">БОРТ «СМЕНЫ»</span><h2 id="info-title">'+esc(title)+'</h2>'+body;const d=document.querySelector('#info-dialog');if(!d.open)d.showModal();}
function showRule(id){const r=rule(id);if(!r)return;markHelp(s,r.id);save();showInfo((typeof r.id==='number'?'Правило '+r.id+'. ':'Приложение. ')+r.title,'<div class="normative-text">'+r.html+'</div><button class="quiet-button" data-action="library">← Все правила и приложения</button>');}
function library(){showInfo('МППСС под рукой','<p>Полные тексты правил и приложений доступны во время любого эпизода.</p><label class="library-search">Номер или название<input id="rule-search" type="search" placeholder="Например: обгон"></label><div class="exp-library">'+[...RULE_TEXT,...ANNEX_TEXT].map(r=>'<button data-rule="'+r.id+'" data-search="'+esc((r.id+' '+r.title).toLowerCase())+'">'+esc((typeof r.id==='number'?r.id+'. ':'Приложение. ')+r.title)+'</button>').join('')+'</div>');}
function journal(){showInfo('Решения на воде','<p>История и знание правил учитываются отдельно. Можно закончить рейс с исправленной ошибкой; запись о первой попытке сохранится.</p>'+(!s.learning.length?'<p>Морских решений пока не было.</p>':'')+s.learning.slice().reverse().map(e=>'<article class="learning-entry '+(e.correct?'correct':'wrong')+'"><b>'+(e.correct?'✓ Обоснованное решение':'✕ Потребовалось исправление')+'</b><span>'+esc(catalog.find(q=>q.id===e.quest)?.title)+' · '+(e.help?'со справочником':'без справочника')+'</span><p>'+esc(e.reason)+'</p>'+ruleButtons([e.rule])+'</article>').join(''));}
function syncMusic(){const url=screen==='quest'?active()?.media.music:null;if(audio?.src!==url){if(audio){audio.pause();audio.src='';}audio=url?new Audio(url):null;if(audio){audio.loop=true;audio.volume=.25;}}if(audio){if(sound)audio.play().catch(()=>{});else audio.pause();}}
function help(){showInfo('Малая линия · прототип 0.9','<p>Вы — капитан «Смены», небольшого катера в прибрежном посёлке. Мила хочет наладить местную линию, Нина — вернуть на воду отцовскую яхту, Илья — отпустить дочь учиться. С чего начать, решаете вы.</p><p><b>Причал</b> — место встреч. <b>Атлас</b> — выбор следующего берега и пути. <b>Каюта</b> — почта, вещи с историей и разборы решений. Чтобы линия появилась, довезите Лизу в порт и верните туда ответ Олега.</p><p>Чтение не двигает часы. Спокойный переход можно пропустить. Морская сцена сохраняется отдельно и не пропускается. Текстовый квест можно отложить, заняться другим делом и продолжить с прежней реплики.</p><p>Зелёный разбор означает обоснованное решение, красный — ошибку с объяснением. Справочник содержит все 41 правило и 4 приложения. Одна удачная попытка ещё не означает освоения правила.</p><p>Это шесть небольших пакетов, три вида игр и конечный круг возвращений. Повторных процедурных рейсов пока нет. Плавание и схемы имеют условный масштаб.</p><div class="help-actions"><a href="./expedition.html">Предыдущее демо 0.7 ↗</a><a href="./index.html#sources">О проекте и источниках ↗</a><button data-action="reset">Начать новую историю</button></div><p class="control-note">'+(storageOK?'Автосохранение в этом браузере.':'Хранилище браузера недоступно: после закрытия прогресс может потеряться.')+' Прогресс прежних демо хранится отдельно.</p>');}
function completeActive(outcome){const q=active();if(finishStory(s,q,outcome)){screen=s.travel?'travel':'home';render();}}
root.addEventListener('click',e=>{
 const pin=e.target.closest('[data-map-place]');if(pin){e.preventDefault();selected=pin.dataset.mapPlace;render();return;}
 const b=e.target.closest('button');if(!b||b.disabled)return;const q=active(),t=s.session;
 if(b.dataset.rule){showRule(b.dataset.rule);return;}
 if(b.dataset.screen){leaveStory(b.dataset.screen);return;}
 if(b.dataset.story){const story=catalog.find(q=>q.id===b.dataset.story);if(story&&startStory(s,story)){screen='quest';render();}else if(s.session){screen='quest';render();}return;}
 if(b.dataset.destination){selected=b.dataset.destination;leaveStory('atlas');return;}
 if(b.dataset.select){selected=b.dataset.select;render();return;}
 if(b.dataset.local){if(enterLocal(s,b.dataset.local)){screen='home';render();}else if(s.session){screen='quest';render();}return;}
 if(b.dataset.openPlace){if(s.session){screen='quest';render();}else openPlace(b.dataset.openPlace);return;}
 if(b.dataset.route){route=b.dataset.route;render();return;}
 if(b.dataset.depart){if(beginVoyage(s,b.dataset.depart,route,crew)){screen='travel';render();}return;}
 if(b.dataset.choice){if(chooseText(s,q,b.dataset.choice))render();return;}
 if(b.dataset.evidence){inspectEvidence(s,q,b.dataset.evidence);repaintInvestigation();return;}
 if(b.dataset.turn){commandMeeting(t.local,t.local.command+Number(b.dataset.turn),t.local.speed);save();updateMeetingPanel();return;}
 if(b.dataset.meetingSpeed){commandMeeting(t.local,t.local.command,t.local.initialS*Number(b.dataset.meetingSpeed));save();updateMeetingPanel();return;}
 switch(b.dataset.action){
  case 'park-story':if(parkStory(s)){screen='home';render();}break;
  case 'resume':screen='quest';render();break;
  case 'text-next':continueText(s);render();break;
  case 'finish-story':completeActive();break;
  case 'skip-voyage':{const e=skipVoyage(s,catalog);screen=e?.type==='quest'?'quest':s.travel?'travel':'home';render();break;}
  case 'run-meeting':runMeeting(t.local);save();updateMeetingPanel();break;
  case 'meeting-camera':meetingChart=!meetingChart;view?.setProjection(meetingChart?'chart':'island');b.textContent=meetingChart?'Вернуть наклонный вид':'Вид сверху';b.setAttribute('aria-pressed',meetingChart);break;
  case 'preview':t.local.preview=!t.local.preview;save();updateMeetingPanel();break;
  case 'pause-meeting':t.local.paused=!t.local.paused;save();updateMeetingPanel();break;
  case 'retry-meeting':retryMeeting(s);render();break;
  case 'finish-meeting':completeActive('complete');break;
  case 'retreat-meeting':completeActive('retreated');break;
  case 'check-investigation':gradeInvestigation(s,q);repaintInvestigation();break;
  case 'finish-investigation':completeActive('complete');break;
  case 'mail-read':s.line.mail.forEach(m=>m.read=true);render();break;
  case 'sound':sound=!sound;s.sound=sound;save();b.textContent=sound?'♫':'♪';b.setAttribute('aria-pressed',sound);syncMusic();break;
  case 'close':document.querySelector('#info-dialog').close();break;
  case 'library':library();break;
  case 'journal':journal();break;
  case 'help':help();break;
  case 'reset':showInfo('Начать новую историю?','<p>Сохранение «Малой линии» будет заменено. Прогресс других прототипов останется.</p><button class="primary" data-action="reset-confirm">Начать заново</button><button class="quiet-button" data-action="close">Оставить текущую историю</button>');break;
  case 'reset-confirm':s=createHarbor();s.sound=sound;screen='home';selected='lighthouse';route='direct';crew='alone';render();break;
 }
});
root.addEventListener('change',e=>{
 if(e.target.id==='crew'){crew=e.target.value;return;}
 const t=s.session;if(t?.mode!=='investigation')return;
 if(e.target.id==='vessel-status')t.local.status=e.target.value;
 if(e.target.dataset.lamp)t.local.lights[e.target.dataset.lamp]=e.target.type==='checkbox'?e.target.checked:e.target.value;
 if(e.target.id==='vessel-status'||e.target.dataset.lamp){if(!t.local.feedback?.correct){t.local.feedback=null;document.querySelector('.light-controls .verdict')?.remove();}document.querySelector('.light-schema').innerHTML='<span class="eyebrow">СОСТАВ ОГНЕЙ «ЗАРИ»</span>'+lanternDiagram(t.local.lights);save();}
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
init().catch(e=>{root.innerHTML='<main class="load-error"><h1>Не удалось открыть историю</h1><p>'+esc(e.message)+'</p><a href="./world.html">Повторить загрузку</a></main>';});
