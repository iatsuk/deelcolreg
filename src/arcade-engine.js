// Compass headings, metres and seconds. A deliberately accelerated teaching basin.
export const ARCADE_KEY = 'deelstuff.colreg.arcade.v1';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angle=v=>(v%360+360)%360;
export const turn=(a,b)=>((a-b+540)%360)-180;
export const vector=(h,s)=>({x:Math.sin(h*Math.PI/180)*s,y:Math.cos(h*Math.PI/180)*s});
const ship=(x,y,h,s)=>({x,y,h,s});
const common='Два механических судна на ходу, на виду друг у друга. Опасность столкновения установлена. Просторная акватория, свободное место для манёвра; особых обстоятельств нет.';
export const VOYAGES=[
  {id:'headon',title:'Встреча нос к носу',tag:'Встречные курсы',rule:14,brief:common,goal:'Разойдитесь левыми бортами. Измените курс заблаговременно и заметно.',own:ship(0,-420,0,6),target:ship(0,420,180,6),autoAt:23,autoTurn:35,duration:110,lesson:'При встрече прямо или почти прямо каждое механическое судно изменяет курс вправо. Поворот должен быть заметным и своевременным.',hint:'Ваш нос смотрит вверх. Поворот вправо направит его к востоку.'},
  {id:'crossing',title:'Судно справа',tag:'Пересечение курсов',rule:15,brief:common,goal:'Уступите дорогу и пройдите за кормой другого судна. Можно изменить курс, уменьшить ход или сочетать эти действия.',own:ship(0,-420,0,6),target:ship(420,0,270,6),duration:150,lesson:'Видите другое механическое судно справа — уступайте. Если позволяют обстоятельства, избегайте пересечения его курса по носу. Проверяйте результат до полного расхождения.',hint:'Заметный поворот вправо или раннее снижение скорости дают судну пройти впереди.'},
  {id:'standon',title:'Судно слева',tag:'Сохраняем курс',rule:17,brief:common+' Другое судно своевременно предпринимает достаточное действие, чтобы уступить вам.',goal:'Проведите судно через расхождение, сохранив курс и скорость. Наблюдайте за действиями уступающего.',own:ship(0,-420,0,6),target:ship(-420,0,90,6),autoAt:20,autoTurn:45,duration:115,lesson:'Пока уступающее судно действует надлежащим образом, сохраняйте курс и скорость. При его бездействии правило 17 предусматривает другие стадии: сохранение курса не означает ожидание столкновения.',hint:'Не нужно маневрировать одновременно с судном, которое уже правильно уступает.'},
  {id:'standon-late',title:'Он не уступает',tag:'Наблюдение и действие',rule:17,brief:common+' Вы сохраняете курс и скорость. После нескольких наблюдений станет очевидно, действует ли уступающее судно.',goal:'Сначала наблюдайте. Когда станет очевидно, что судно не уступает, помогите избежать столкновения своим манёвром.',own:ship(0,-420,0,6),target:ship(-420,0,90,6),duration:120,lesson:'Когда становится очевидно, что уступающее судно не действует надлежащим образом, сохраняющее курс судно может действовать само. В этой ситуации избегайте поворота влево в сторону судна слева. Если действия одного уступающего уже недостаточны, действие становится обязательным.',hint:'Дождитесь подтверждения по наблюдениям, затем заметно поверните вправо. Секунды здесь — условное игровое время.'},
  {id:'overtake',title:'Догнать и обойти',tag:'Обгон',rule:13,brief:'Вы догоняете более медленное механическое судно прямо по корме. Открытая вода, хорошая видимость; с обоих бортов свободно.',goal:'Обгоните судно, держась в стороне, пока оно не будет окончательно пройдено и оставлено позади.',own:ship(0,-400,0,8),target:ship(0,-120,0,3),duration:140,lesson:'Обгоняющее судно держится в стороне от обгоняемого до полного завершения обгона. В открытой воде правило 13 само по себе не назначает обязательный борт обгона.',hint:'Начните обход заблаговременно. Возможен проход с любого свободного борта.'},
  {id:'overtaken',title:'Вас обгоняют',tag:'Держим курс',rule:17,brief:'Открытая вода, хорошая видимость. Более быстрое судно сзади начало безопасный обгон с вашего правого борта и продолжает держаться в стороне.',goal:'Сохраните курс и скорость до завершения обгона.',own:ship(0,-130,0,3),target:ship(110,-420,0,8),duration:100,lesson:'Обгоняющий обязан держаться в стороне. Сохраняющее курс судно поддерживает курс и скорость, продолжая наблюдение; опасное бездействие другого судна меняет ситуацию.',hint:'Управление иногда означает удержание режима, а не новый поворот.'},
  {id:'channel',title:'Свой край фарватера',tag:'Узкость',rule:9,brief:'Механическое судно следует на север по прямому узкому проходу. Осадка позволяет держаться у правой внешней границы. Берега обозначены, течение сносит влево.',goal:'Пройдите к северным воротам, держась настолько близко к правой границе, насколько безопасно и практически возможно.',own:ship(125,-370,0,4),target:null,duration:220,current:{x:-.35,y:0},lesson:'В узкости или на фарватере держитесь внешней границы с правого борта настолько близко, насколько безопасно и практически возможно. Учитывайте снос и границы прохода.',hint:'Правый край — справа от направления движения, здесь на востоке. Небольшая поправка вправо компенсирует снос.'},
  {id:'fog',title:'Цель в тумане',tag:'Ограниченная видимость',rule:19,brief:'Вы идёте с безопасной для этой учебной обстановки скоростью. Судно обнаружено только радаром впереди траверза справа, визуального контакта нет. Это не обгон. Радиолокационная прокладка установила опасность столкновения.',goal:'Примите заблаговременное действие. По возможности избегайте изменения курса влево для этой цели.',own:ship(0,-420,0,6),target:ship(420,0,270,6),duration:150,radar:true,lesson:'Без визуального контакта применяется правило ограниченной видимости, а не обычная пара «уступающее — сохраняющее курс». Для цели впереди траверза, кроме обгоняемого, по возможности избегайте поворота влево. Безопасная скорость и готовность двигателей обязательны.',hint:'Наблюдайте радиолокационную отметку. Ранний поворот вправо или достаточное снижение хода позволяют разойтись.'},
];
export function createVoyage(id){
 const m=VOYAGES.find(v=>v.id===id)||VOYAGES[0];
 return {mission:m,own:{...m.own},target:m.target?{...m.target}:null,time:0,command:m.own.h,speed:m.own.s,phase:'brief',paused:false,minRange:Infinity,trail:[],otherTrail:[],actions:[],auto:false,passedBehind:false,violations:new Set(),nextTrail:0};
}
export function commandVoyage(s,heading,speed){
 if(s.phase!=='running'||s.paused)return;
 s.command=angle(heading);s.speed=clamp(speed,0,9);
 if(Math.abs(turn(s.command,s.mission.own.h))>=10||Math.abs(speed-s.mission.own.s)>.6)s.actions.push({time:s.time,turn:turn(s.command,s.mission.own.h),speed});
}
export function cpa(a,b){
 const av=vector(a.h,a.s),bv=vector(b.h,b.s),r={x:b.x-a.x,y:b.y-a.y},v={x:bv.x-av.x,y:bv.y-av.y};
 const t=Math.max(0,-(r.x*v.x+r.y*v.y)/(v.x*v.x+v.y*v.y||1));
 return {distance:Math.hypot(r.x+v.x*t,r.y+v.y*t),time:t};
}
function finish(s,success,reason){s.phase='result';s.success=success;s.reason=reason;return s;}
export function stepVoyage(s,dt){
 if(s.phase!=='running'||s.paused)return s;
 dt=clamp(dt,0,.2);s.time+=dt;
 const m=s.mission,o=s.own,t=s.target;
 o.h=angle(o.h+clamp(turn(s.command,o.h),-3*dt,3*dt));
 o.s+=clamp(s.speed-o.s,-.45*dt,.35*dt);
 const ov=vector(o.h,o.s);o.x+=(ov.x+(m.current?.x||0))*dt;o.y+=(ov.y+(m.current?.y||0))*dt;
 if(t){
  if(m.autoAt&&s.time>=m.autoAt){s.auto=true;t.h=angle(t.h+clamp(turn(m.target.h+m.autoTurn,t.h),-3*dt,3*dt));}
  const tv=vector(t.h,t.s);t.x+=tv.x*dt;t.y+=tv.y*dt;
  const distance=Math.hypot(t.x-o.x,t.y-o.y);s.minRange=Math.min(s.minRange,distance);
  if(distance<38)return finish(s,false,'Суда вошли в зону столкновения. Действие нужно начинать раньше и проверять его результат.');
  if(['crossing','fog'].includes(m.id)&&o.y>=0&&!s.crossed){s.crossed=true;s.passedBehind=o.x>t.x+40;}
 }
 const deviation=turn(o.h,m.own.h);
 if(['standon','overtaken'].includes(m.id)&&(Math.abs(deviation)>7||Math.abs(o.s-m.own.s)>.65))s.violations.add('hold');
 if(m.id==='headon'&&deviation < -8)s.violations.add('port');
 if(m.id==='standon-late'){
  if(s.time<25&&(Math.abs(deviation)>7||Math.abs(o.s-m.own.s)>.65))s.violations.add('early');
  if(deviation < -8)s.violations.add('port');
 }
 if(m.id==='fog'&&deviation < -8)s.violations.add('port');
 if(m.id==='channel'){
  if(Math.abs(o.x)>195)return finish(s,false,'Судно вышло за безопасную границу прохода. Следите за сносом.');
  if(o.x<65)s.violations.add('side');
  if(o.y>=350)return finish(s,!s.violations.size,s.violations.size?'Вы прошли вдали от правой границы, хотя условия позволяли держаться правее.':'Снос учтён, правый край выдержан, проход пройден.');
 }
 if(s.time>=s.nextTrail){s.trail.push([o.x,o.y]);if(t)s.otherTrail.push([t.x,t.y]);s.nextTrail=s.time+2;}
 if(t&&s.time>55){
  const av=vector(o.h,o.s),bv=vector(t.h,t.s);
  const separating=(t.x-o.x)*(bv.x-av.x)+(t.y-o.y)*(bv.y-av.y)>0;
  const range=Math.hypot(t.x-o.x,t.y-o.y);
  const overtakingDone=m.id==='overtake'?o.y>t.y+95:m.id==='overtaken'?t.y>o.y+95:true;
  if(separating&&range>220&&overtakingDone&&s.minRange<650&&(!['crossing','fog'].includes(m.id)||s.crossed))return evaluateVoyage(s);
 }
 if(s.time>=m.duration)return m.id==='channel'?finish(s,false,'Северные ворота не достигнуты. Продолжайте движение и учитывайте снос.'):evaluateVoyage(s);
 return s;
}
export function evaluateVoyage(s){
 const id=s.mission.id,actions=s.actions,early=actions.some(a=>a.time<35),starboard=actions.some(a=>a.turn>=20);
 if(s.minRange<75)return finish(s,false,'Слишком тесное расхождение для этой учебной акватории. В следующей попытке действуйте раньше и заметнее.');
 if(s.violations.has('hold'))return finish(s,false,'Другое судно правильно держалось в стороне. В этой ситуации требовалось сохранить курс и скорость.');
 if(s.violations.has('port'))return finish(s,false,id==='headon'?'При встрече нос к носу требовалось изменить курс вправо.':'В этой обстановке следовало избегать поворота влево.');
 if(s.violations.has('early'))return finish(s,false,'Вы начали манёвр до того, как стало очевидно бездействие уступающего судна. Сначала оцените развитие ситуации.');
 if(id==='headon'&&(!early||!starboard))return finish(s,false,'Безопасного расстояния недостаточно: при встрече требовался ранний заметный поворот вправо.');
 if(['crossing','fog'].includes(id)&&(!early||!s.crossed||!s.passedBehind))return finish(s,false,'Рейс не завершён за кормой цели. Уступите раньше, затем проследите расхождение до конца.');
 if(id==='standon-late'&&!actions.some(a=>a.time>=25&&a.turn>=20))return finish(s,false,'После подтверждения бездействия уступающего судна требовалась ваша помощь в предотвращении столкновения.');
 if(id==='overtake'&&s.own.y<s.target.y+95)return finish(s,false,'Обгон ещё не завершён: обгоняемое судно должно остаться позади.');
 return finish(s,true,'Суда разошлись. Манёвр соответствует условиям задачи, вы проконтролировали результат.');
}

export const LANTERNS=[
 {id:'trawl',title:'Траулер за работой',rule:26,scene:'Судно тянет трал. Соберите его опознавательные круговые огни сверху вниз.',tokens:['green','white'],kind:'lights',note:'Зелёный над белым — судно, занятое тралением.'},
 {id:'fish',title:'Рыбаки с сетями',rule:26,scene:'Судно занято ловом рыбы, кроме траления. Соберите опознавательные круговые огни.',tokens:['red','white'],kind:'lights',note:'Красный над белым — лов рыбы, кроме траления.'},
 {id:'nuc',title:'Не слушается руля',rule:27,scene:'Из-за исключительных обстоятельств судно не способно маневрировать по правилам. Соберите опознавательные огни.',tokens:['red','red'],kind:'lights',note:'Два красных круговых огня — судно, лишённое возможности управляться.'},
 {id:'ram',title:'Подводные работы',rule:27,scene:'Характер работ ограничивает способность судна маневрировать. Соберите его общие опознавательные огни (без обозначения сторон прохода).',tokens:['red','white','red'],kind:'lights',note:'Красный — белый — красный: судно, ограниченное в возможности маневрировать.'},
 {id:'pilot',title:'Лоцман идёт на вызов',rule:29,scene:'Лоцманское судно исполняет свои обязанности. Соберите его опознавательные круговые огни.',tokens:['white','red'],kind:'lights',note:'Белый над красным — лоцманское судно при исполнении обязанностей.'},
 {id:'draught',title:'Большая осадка',rule:28,scene:'Механическое судно стеснено своей осадкой. Капитан решил дополнительно обозначить этот статус. Какие круговые огни он выставит?',tokens:['red','red','red'],kind:'lights',note:'Три красных по вертикали могут дополнительно выставляться судном, стеснённым своей осадкой.'},
 {id:'day-nuc',title:'Авария днём',rule:27,scene:'День. Судно лишено возможности управляться. Поднимите его опознавательные знаки.',tokens:['ball','ball'],kind:'shapes',note:'Два шара по вертикали — судно, лишённое возможности управляться.'},
 {id:'day-ram',title:'Работы днём',rule:27,scene:'День. Судно ограничено в возможности маневрировать характером работ. Соберите общие опознавательные знаки.',tokens:['ball','diamond','ball'],kind:'shapes',note:'Шар — ромб — шар: ограниченное в возможности маневрировать судно.'},
 {id:'day-fish',title:'Сети за бортом',rule:26,scene:'День. Судно занято ловом рыбы. Поднимите общий рыболовный знак.',tokens:['cones'],kind:'shapes',note:'Два конуса вершинами вместе обозначают судно, занятое ловом рыбы.'},
 {id:'day-engine',title:'Паруса и двигатель',rule:25,scene:'Парусное судно одновременно идёт под двигателем. Какой знак нужно выставить днём?',tokens:['cone'],kind:'shapes',note:'Конус вершиной вниз указывает: судно под парусами одновременно использует двигатель.'},
 {id:'day-anchor',title:'Якорь отдан',rule:30,scene:'День. Судно длиной 60 м стоит на якоре, не на мели. Поднимите якорный знак.',tokens:['ball'],kind:'shapes',note:'Один шар — судно на якоре.'},
 {id:'day-ground',title:'На мели',rule:30,scene:'День. Судно длиной 60 м находится на мели. Поднимите предписанные дневные знаки.',tokens:['ball','ball','ball'],kind:'shapes',note:'Три шара по вертикали — судно на мели.'},
];
export const WHISTLES=[
 {id:'right',title:'Меняем курс вправо',rule:34,scene:'Хорошая видимость. Другое судно на виду. Ваше механическое судно на ходу изменяет курс вправо. Сообщите об этом свистком.',pattern:'.',note:'Один короткий: «Я изменяю свой курс вправо».'},
 {id:'left',title:'Меняем курс влево',rule:34,scene:'Хорошая видимость. Другое судно на виду. Ваше механическое судно на ходу изменяет курс влево. Подайте сигнал.',pattern:'..',note:'Два коротких: «Я изменяю свой курс влево».'},
 {id:'astern',title:'Задний ход',rule:34,scene:'Механическое судно на ходу, другое судно на виду. Ваши движители работают на задний ход. Подайте сигнал.',pattern:'...',note:'Три коротких: «Мои движители работают на задний ход» — это не утверждение о движении судна назад.'},
 {id:'doubt',title:'Намерения непонятны',rule:34,scene:'Другое судно на виду. Вы сомневаетесь, предпринимает ли оно достаточные действия для избежания столкновения. Подайте сигнал сомнения.',pattern:'.....',note:'Не менее пяти коротких и частых звуков выражают сомнение или предупреждение.'},
 {id:'fog-going',title:'В тумане с ходом',rule:35,scene:'Ограниченная видимость. Механическое судно имеет ход относительно воды. Подайте один цикл сигнала.',pattern:'-',note:'Один продолжительный звук; повторять с промежутками не более двух минут.'},
 {id:'fog-stopped',title:'В тумане без хода',rule:35,scene:'Ограниченная видимость. Механическое судно на ходу, но остановилось и не имеет хода относительно воды. Подайте один цикл.',pattern:'--',note:'Два продолжительных звука с промежутком около двух секунд; цикл повторяют не реже чем раз в две минуты.'},
 {id:'fog-sail',title:'Паруса в тумане',rule:35,scene:'Ограниченная видимость. Парусное судно на ходу. Подайте один цикл его сигнала.',pattern:'-..',note:'Один продолжительный и два коротких. Это также сигнал ряда других категорий по правилу 35(c).'},
];
export const TOKEN_NAMES={red:'Красный',green:'Зелёный',white:'Белый',yellow:'Жёлтый',ball:'Шар',diamond:'Ромб',cones:'Конусы вместе',cone:'Конус вниз',cylinder:'Цилиндр'};
export function gradeLantern(task,slots){return slots.length===task.tokens.length&&task.tokens.every((t,i)=>slots[i]===t);}
export function gradeWhistle(task,blasts){
 const pattern=blasts.map(b=>b.duration>=.6&&b.duration<=1.6?'.':b.duration>=4&&b.duration<=6?'-':'?').join('');
 let spacing=true;
 for(let i=1;i<blasts.length;i++){
  const gap=blasts[i].start-(blasts[i-1].start+blasts[i-1].duration);
  if(gap<.12||gap>3.2)spacing=false;
  if(task.id==='fog-stopped'&&(gap<1||gap>3))spacing=false;
  if(task.id==='doubt'&&gap>1)spacing=false;
 }
 const match=task.id==='doubt'?/^\.{5,}$/.test(pattern):pattern===task.pattern;
 return {correct:match&&spacing,pattern,reason:pattern.includes('?')?'Короткий звук длится около 1 секунды, продолжительный — от 4 до 6 секунд.':!spacing?'Проверьте промежутки между звуками. Для двух продолжительных нужен промежуток около 2 секунд. Для сигнала сомнения звуки должны быть частыми.':!match?'Последовательность не соответствует этой ситуации.':'Сигнал подан верно.'};
}
export const LOOKOUT_ROUNDS=[
 {id:'bearings-a',title:'Первое сближение',rotation:0,targets:[{id:'A',x:400,y:400,h:270,s:5},{id:'B',x:-360,y:330,h:90,s:3},{id:'C',x:330,y:-180,h:0,s:7}]},
 {id:'bearings-b',title:'Новая вахта',rotation:90,targets:[{id:'A',x:-360,y:330,h:90,s:3},{id:'B',x:330,y:-180,h:0,s:7},{id:'C',x:400,y:400,h:270,s:5}]},
 {id:'bearings-c',title:'Среди отметок',rotation:225,targets:[{id:'A',x:330,y:-180,h:0,s:7},{id:'B',x:400,y:400,h:270,s:5},{id:'C',x:-360,y:330,h:90,s:3}]},
];
export function lookoutAt(round,t){
 const rot=round.rotation*Math.PI/180;
 const rotate=(x,y)=>({x:x*Math.cos(rot)+y*Math.sin(rot),y:-x*Math.sin(rot)+y*Math.cos(rot)});
 const own={...rotate(0,5*t),h:round.rotation,s:5};
 return {own,targets:round.targets.map(b=>{const v=vector(b.h,b.s),p=rotate(b.x+v.x*t,b.y+v.y*t);const dx=p.x-own.x,dy=p.y-own.y;return {...b,...p,h:angle(b.h+round.rotation),bearing:angle(Math.atan2(dx,dy)*180/Math.PI),range:Math.hypot(dx,dy),risk:cpa(own,{...b,...p,h:angle(b.h+round.rotation)}).distance<75};})};
}
export function loadArcade(storage){
 try{const obj=JSON.parse(storage.getItem(ARCADE_KEY)||'{}');return Object.fromEntries(Object.entries(obj).filter(([k,v])=>/^(nav|light|sound|look)-/.test(k)&&v&&Number.isInteger(v.wins)&&v.wins>=0&&Number.isInteger(v.tries)&&v.tries>=v.wins));}catch{return {};}
}
export function saveArcade(storage,progress,key,win){const p=progress[key]||{tries:0,wins:0};progress[key]={tries:p.tries+1,wins:p.wins+Number(win)};try{storage.setItem(ARCADE_KEY,JSON.stringify(progress));return true;}catch{return false;}}
