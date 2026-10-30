export const WORLD_KEY='deelstuff.colreg.openworld.v1';
export const BOUNDS={minX:-80,maxX:80,minZ:-68,maxZ:68};
export const LAND=[
 {id:'port',x:-45,z:8,rx:18,rz:25,name:'Старый порт'},
 {id:'lighthouse',x:-30,z:-54,rx:7,rz:7,name:'Северный маяк'},
 {id:'village',x:-23,z:50,rx:10,rz:9,name:'Рыбачий посёлок'},
 {id:'pines',x:54,z:-48,rx:11,rz:8,name:'Сосновый остров'},
 {id:'rocks',x:58,z:49,rx:9,rz:8,name:'Каменный остров'},
];
export const PLACES=[
 {id:'port',name:'Старый порт',person:'Мила',role:'начальник причала',x:-24,z:16,berth:{x:-16,z:25},radius:10},
 {id:'lighthouse',name:'Северный маяк',person:'Олег',role:'смотритель',x:-23,z:-50,berth:{x:-18,z:-46},radius:9},
 {id:'village',name:'Рыбачий посёлок',person:'Илья',role:'местный шкипер',x:-14,z:49,berth:{x:-7,z:45},radius:10},
 {id:'school',name:'Учебная бухта',person:'Нина',role:'занятие на воде',x:-8,z:-22,berth:{x:-8,z:-22},radius:12},
];
export const ZONES=[
 {id:'bay',name:'Учебная бухта',x:-10,z:-22,r:28,description:'Редкое движение · простые встречи'},
 {id:'busy',name:'Восточный рейд',x:35,z:0,r:32,description:'Плотное движение · несколько целей одновременно'},
 {id:'islands',name:'Островной маршрут',x:0,z:-48,r:26,description:'Переход к маяку · открытая вода между островами'},
];
export const norm=a=>(a%360+360)%360;
export const delta=(a,b)=>((a-b+540)%360)-180;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const vec=(h,s)=>({x:Math.sin(h*Math.PI/180)*s,z:-Math.cos(h*Math.PI/180)*s});
export const bearing=(a,b)=>norm(Math.atan2(b.x-a.x,a.z-b.z)*180/Math.PI);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function isWater(p,margin=1.7){
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x<BOUNDS.minX+margin||p.x>BOUNDS.maxX-margin||p.z<BOUNDS.minZ+margin||p.z>BOUNDS.maxZ-margin)return false;
 if(LAND.some(i=>((p.x-i.x)/(i.rx+margin))**2+((p.z-i.z)/(i.rz+margin))**2<=1))return false;
 // Harbour quay is also solid, including its projection beyond the natural coast.
 if(p.x>-30-margin&&p.x<-21+margin&&p.z>10-margin&&p.z<22+margin)return false;
 return true;
}
export function lineClear(a,b,margin=4.5){
 const n=Math.max(1,Math.ceil(distance(a,b)/1.2));
 for(let i=0;i<=n;i++)if(!isWater({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},margin))return false;
 return true;
}
export function planRoute(a,b){
 if(!isWater(b,3))return null;
 if(lineClear(a,b,3.5))return [{x:b.x,z:b.z}];
 const step=4,key=(x,z)=>x+','+z;
 const start={x:Math.round(a.x/step),z:Math.round(a.z/step)},goal={x:Math.round(b.x/step),z:Math.round(b.z/step)};
 const queue=[{...start,g:0,f:0}],cost=new Map([[key(start.x,start.z),0]]),prev=new Map(),nodes=new Map();
 let end=null,guard=0;
 while(queue.length&&guard++<4500){
  queue.sort((a,b)=>b.f-a.f);const n=queue.pop(),k=key(n.x,n.z);if(n.g>cost.get(k))continue;
  const p={x:n.x*step,z:n.z*step};nodes.set(k,p);
  if(distance(p,b)<6&&lineClear(p,b,3.5)){end=k;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
   const x=n.x+dx,z=n.z+dz,q={x:x*step,z:z*step},nk=key(x,z),g=n.g+Math.hypot(dx,dz)*step;
   if(!lineClear(p,q,4.5)||g>=(cost.get(nk)??Infinity))continue;
   cost.set(nk,g);prev.set(nk,k);queue.push({x,z,g,f:g+distance(q,b)});
  }
 }
 if(!end)return null;
 const path=[{x:b.x,z:b.z}];let k=end;
 while(k){const p=nodes.get(k)||(()=>{const [x,z]=k.split(',').map(Number);return {x:x*step,z:z*step};})();path.unshift(p);k=prev.get(k);}
 path.unshift({x:a.x,z:a.z});
 const smooth=[];let i=0;
 while(i<path.length-1){let j=path.length-1;while(j>i+1&&!lineClear(path[i],path[j],3.5))j--;smooth.push(path[j]);i=j;}
 return smooth;
}
const trafficSpec=[
 ['lada','Лада','sail',-2,3,180,1.15,'bay'],
 ['marta','Марта','cargo',8,8,0,1.15,'bay'],
 ['cedar','Кедр','cargo',26,25,0,1.7,'busy'],
 ['vega','Вега','cargo',41,-26,180,1.8,'busy'],
 ['pilot','Лоцман-4','motor',51,20,0,2,'busy'],
 ['gull','Чайка','motor',20,0,90,1.5,'busy'],
 ['ferry','Островной','cargo',49,-13,270,1.65,'busy'],
 ['salt','Соль','sail',29,-20,180,1.05,'busy'],
 ['north','Север','motor',61,11,0,1.2,'busy'],
 ['rill','Ручей','motor',36,32,270,1.45,'busy'],
 ['dawn','Заря','cargo',16,-53,90,1.4,'islands'],
];
function makeTraffic(){return trafficSpec.map(([id,name,type,x,z,h,s,zone])=>({id,name,type,x,z,h,s,zone,base:{x,z,h},trail:[],nextTrail:0,cruise:s}));}
export function createWorld(seed=Date.now()>>>0){
 return {version:1,seed:seed>>>0,time:0,own:{x:-16,z:25,h:0,s:0,trail:[]},command:0,throttle:0,route:[],traffic:makeTraffic(),paused:false,incident:null,lastSafe:{x:-16,z:25,h:0},nextTrail:0,notice:'Вы у Старого порта. Можно зайти к Миле или сразу выйти в море.',quest:{cargo:'none',letter:'none',training:0},flags:{},log:[],cooldowns:{},encounter:null,training:null,completed:[],decisions:[],contacts:[]};
}
export function zoneAt(p){const place=PLACES.find(a=>a.id!=='school'&&distance(a.berth,p)<14);if(place)return {id:place.id,name:place.name,description:'Причал · местная история'};return ZONES.find(z=>distance(z,p)<z.r)||{id:'sea',name:'Открытая вода',description:'Свободное плавание'};}
export function setDestination(s,p){if(s.incident){s.notice='Сначала вернитесь к последней свободной точке.';return false;}const path=planRoute(s.own,p);if(!path){s.notice='Маршрут здесь не проходит: выберите точку на открытой воде.';return false;}s.route=path;s.throttle=2.8;s.notice='Маршрут проложен. Движение остальных судов учитывайте сами.';return true;}
export function manual(s,turn=0,throttle=0,dt=.1){s.route=[];s.command=norm(s.command+turn*55*dt);s.throttle=clamp(s.throttle+throttle*2*dt,0,4.2);}
export function stop(s){s.route=[];s.throttle=0;s.notice='Машинам — стоп. Судно ещё погасит инерцию.';}
export function cpa(a,b){
 const av=vec(a.h,a.s),bv=vec(b.h,b.s),rx=b.x-a.x,rz=b.z-a.z,vx=bv.x-av.x,vz=bv.z-av.z,t=clamp(-(rx*vx+rz*vz)/(vx*vx+vz*vz||1),0,35);
 return {t,d:Math.hypot(rx+vx*t,rz+vz*t),range:Math.hypot(rx,rz)};
}
export function classify(a,b){
 const rel=delta(bearing(a,b),a.h),course=Math.abs(delta(a.h,b.h)),behind=Math.abs(delta(bearing(b,a),b.h))>112.5;
 if(behind&&a.s>b.s+.15&&course<65)return {kind:'overtake',rule:13,clause:'13(a), 13(d)',duty:'give',reason:'Вы подходите к другому судну с направления позади его траверза более чем на 22,5°. Обгоняющий держится в стороне до полного завершения обгона.'};
 if(b.type==='sail')return {kind:'sail',rule:18,clause:'18(a)(iv)',duty:'give',reason:'При этих условиях механическое судно на ходу уступает парусному. Здесь нет узкости, СРД или обгона.'};
 if(course>165&&Math.abs(rel)<12)return {kind:'headon',rule:14,clause:'14(a)',duty:'both',reason:'При встрече двух механических судов прямо или почти прямо с опасностью столкновения оба изменяют курс вправо.'};
 if(rel>0&&rel<112.5)return {kind:'cross',rule:15,clause:'15',duty:'give',reason:'В этой видимой встрече механических судов другое находится справа. «Смена» уступает, по возможности не проходя у него по носу.'};
 return {kind:'standon',rule:17,clause:'17(a), 17(b)',duty:'stand',reason:'Пока другое механическое судно надлежащим образом уступает, сохраняют курс и скорость. Его бездействие и позднее сближение меняют обязанности по правилу 17.'};
}
function baseEncounterChoices(e){
 if(e.kind==='headon')return [{id:'starboard',text:'Оба заранее изменяем курс вправо.',correct:true},{id:'port',text:'Оба изменяем курс влево.',correct:false},{id:'stand',text:'Сохраняем всё: он разойдётся один.',correct:false}];
 if(e.duty==='stand')return [{id:'stand',text:'Сохраняем курс и скорость, наблюдаем. При бездействии другого переоцениваем ситуацию.',correct:true},{id:'starboard',text:'Немедленно делаем любой поворот, даже если другое судно уже правильно уступает.',correct:false},{id:'ignore',text:'Больше не наблюдаем: теперь это чужая ответственность.',correct:false}];
 return [{id:'give',text:e.kind==='overtake'?'Держимся в стороне до полного завершения обгона.':'Заблаговременно уступаем; проверяем манёвр по всей обстановке.',correct:true},{id:'stand',text:'Сохраняем курс и скорость: другое судно должно уступить нам.',correct:false},{id:'radio',text:'Наш груз важнее: по радио попросим освободить путь и продолжим без изменений.',correct:false}];
}
export function discussEncounter(s,id){
 const e=s.encounter,c=e&&encounterChoices(e).find(c=>c.id===id);if(!c||e.answered)return false;
 e.answered=true;e.correct=c.correct;e.plan=c.id;s.decisions.push({kind:e.kind,rule:e.rule,clause:e.clause,correct:c.correct,text:c.text,why:e.reason,time:s.time});
 s.log.push({time:s.time,title:c.correct?'План согласован':'Нина исправляет план',text:e.reason,rule:e.rule});return true;
}
export function canVisit(s,id){const p=PLACES.find(p=>p.id===id);return !!p&&distance(s.own,p.berth)<p.radius&&s.own.s<1.4;}
export function startTraining(s){
 if(s.training){s.notice='Занятие уже идёт. Его можно закончить и вернуться к буям.';return false;}if(!canVisit(s,'school'))return false;
 const o=s.own,vFar=vec(o.h,36),target={id:'training-'+s.quest.training,name:'Ветер',type:'motor',x:o.x+vFar.x,z:o.z+vFar.z,h:norm(o.h+180),s:1.3,zone:'bay',trail:[],nextTrail:0,training:true};
 if(!lineClear(o,target,2.7)){s.notice='Для занятия нужен свободный прямой участок воды впереди. Разверните судно к выходу из бухты.';return false;}
 s.route=[];s.command=o.h;s.throttle=0;s.traffic.push(target);s.training={id:target.id,start:{x:o.x,z:o.z},answered:false};s.notice='«Ветер» идёт навстречу. Возьмите ход и расходитесь своим манёвром. Нина рядом, если нужен разбор.';return true;
}
function raiseIncident(s,kind,message){
 s.incident={kind,message,at:{...s.own}};s.throttle=0;s.route=[];s.log.push({time:s.time,title:'Переход остановлен',text:message});s.own.s=0;
}
export function recover(s){if(!s.incident)return false;if(s.training)cancelTraining(s);s.own={...s.own,...s.lastSafe,s:0};s.command=s.own.h;s.throttle=0;s.incident=null;s.route=[];s.encounter=null;s.notice='Вернулись к последней свободной точке. Можно продолжить другим манёвром.';return true;}
export function stepWorld(s,dt){
 if(s.paused||s.incident)return;
 dt=clamp(dt,0,.1);s.time+=dt;const o=s.own;
 if(s.route.length){
  const p=s.route[0],d=distance(o,p);s.command=bearing(o,p);
  if(d<2.3){s.route.shift();if(!s.route.length){s.throttle=0;s.notice='Прибыли к выбранной точке. Дайте судну погасить инерцию.';}}
  s.throttle=s.route.length?Math.min(2.8,Math.max(.6,d*.36),Math.abs(delta(s.command,o.h))>40?.85:2.8):0;
 }
 o.h=norm(o.h+clamp(delta(s.command,o.h),-65*dt,65*dt));
 o.s+=clamp(s.throttle-o.s,-1.7*dt,1.05*dt);
 const v=vec(o.h,o.s),next={x:o.x+v.x*dt,z:o.z+v.z*dt};
 if(!isWater(next,3)){if(next.x<BOUNDS.minX+3||next.x>BOUNDS.maxX-3||next.z<BOUNDS.minZ+3||next.z>BOUNDS.maxZ-3){s.route=[];s.throttle=0;o.s=0;s.notice='Граница доступного района. Машины остановлены; выберите курс обратно в архипелаг.';}else raiseIncident(s,'ground','Корпус подошёл к берегу слишком близко. Переход остановлен.');return;}
 o.x=next.x;o.z=next.z;
 s.traffic=s.traffic.filter(t=>!t.retired||distance(o,t)<50);
 avoidTraffic(s);
 for(const t of s.traffic){
  const obstacle=cpa(o,t);if(o.s<.35&&obstacle.t<8&&obstacle.t>.2&&obstacle.d<5&&obstacle.range<18&&!(t.ownAvoidUntil>s.time)){t.targetH=norm(t.h+35);t.ownAvoidUntil=s.time+10;}
  const old={x:t.x,z:t.z,h:t.h};if(t.targetH!==undefined)t.h=norm(t.h+clamp(delta(t.targetH,t.h),-45*dt,45*dt));
  if(t.slowUntil&&s.time>t.slowUntil){t.s=t.cruise||t.s;t.slowUntil=0;}
  const tv=vec(t.h,t.s),proposed={x:t.x+tv.x*dt,z:t.z+tv.z*dt};
  const outsideZone=!t.training&&((t.zone==='busy'&&(proposed.x<14||proposed.x>67||proposed.z<-33||proposed.z>37))||(t.zone==='bay'&&(proposed.z<-5||proposed.z>12)));
  if(outsideZone||!isWater(proposed,3.5)||Math.abs(proposed.x-t.base?.x)>58||Math.abs(proposed.z-t.base?.z)>65){
   if(t.training){t.s=0;}else if(t.targetH===undefined||Math.abs(delta(t.targetH,t.h))<5){t.targetH=norm(t.h+180);}
  }else {t.x=proposed.x;t.z=proposed.z;}
  if(!t.training&&s.traffic.some(b=>b!==t&&hullsOverlap(t,b))){t.x=old.x;t.z=old.z;t.h=old.h;t.s=.08;t.slowUntil=s.time+3;t.targetH=norm(old.h+45);}
  if(s.time>=t.nextTrail){t.trail.push({x:t.x,z:t.z});t.trail=t.trail.slice(-20);t.nextTrail=s.time+1.4;}
  if(hullsOverlap(o,t)){raiseIncident(s,'collision','Корпуса «Смены» и «'+t.name+'» сблизились до столкновения в игровой модели. Разберите обстановку и повторите манёвр.');return;}
 }
 if(s.time>s.nextTrail){o.trail.push({x:o.x,z:o.z});o.trail=o.trail.slice(-70);s.nextTrail=s.time+1; if(isWater(o,4)&&s.traffic.every(t=>distance(o,t)>9))s.lastSafe={x:o.x,z:o.z,h:o.h};}
 const risks=s.traffic.map(t=>({ship:t,...cpa(o,t)})).filter(r=>r.t>1&&r.t<28&&r.d<7&&r.range<45&&o.s>.35&&r.ship.trail.length>=3).sort((a,b)=>a.t-b.t);
 s.contacts=risks.map(r=>({id:r.ship.id,t:r.t,d:r.d,range:r.range}));
 if(!s.encounter&&risks.length){
  const r=risks.find(r=>!(s.cooldowns[r.ship.id]>s.time));
  if(r){const assessment=classify(o,r.ship);s.encounter={...assessment,id:r.ship.id,name:r.ship.name,at:s.time,initialH:o.h,initialS:o.s,minRange:r.range,answered:false,otherType:r.ship.type};s.notice='Нина: «'+r.ship.name+'» сближается. Смотрим движение, не только название.';}
 }
 const e=s.encounter;
 if(e){
  const t=s.traffic.find(t=>t.id===e.id);
  if(!t){s.encounter=null;return;}
  const r=distance(o,t);e.minRange=Math.min(e.minRange,r);const change=delta(o.h,e.initialH);if(!e.firstTurn&&Math.abs(change)>12)e.firstTurn=change;e.maxSpeedChange=Math.max(e.maxSpeedChange||0,Math.abs(o.s-e.initialS));e.deviated=e.deviated||Math.abs(change)>12||Math.abs(o.s-e.initialS)>.65;
  // Other traffic yields to the stand-on player in ordinary, visible crossings.
  if(e.kind==='headon'&&s.time-e.at>3&&!e.otherYielded){t.h=norm(t.h+28);e.otherYielded=true;}
  if(e.duty==='stand'&&s.time-e.at>4&&!e.otherYielded){t.h=norm(t.h+40);t.s=Math.min(t.s,.8);e.otherYielded=true;}
  if(r>e.minRange+6&&s.time-e.at>7){
   const headingChange=delta(o.h,e.initialH),speedChange=Math.abs(o.s-e.initialS);
   const actionOK=e.kind==='headon'?(e.firstTurn||0)>12:e.duty==='stand'?!e.deviated:!!e.firstTurn||e.maxSpeedChange>.55;
   const axis=vec(t.h,1),past=(o.x-t.x)*axis.x+(o.z-t.z)*axis.z>7,aborted=e.kind==='overtake'&&!past&&r>25&&cpa(o,t).d>15;
   if(e.kind==='overtake'&&!past&&!aborted)return;
   const ok=!aborted&&e.minRange>6&&actionOK;
   s.completed.push({kind:e.kind,rule:e.rule,safe:aborted?null:ok,aborted,plan:e.correct??null,time:s.time});
   s.log.push({time:s.time,title:aborted?'Обгон прерван':ok?'Встреча завершена':'Расхождение требует разбора',text:aborted?'Вы прекратили сближение и уходите по другому направлению. Завершённый обгон не засчитан; продолжайте наблюдение.':ok?'Вы сохранили учебный запас и выполнили подходящее действие. '+e.reason:'В игровой модели не хватило запаса или действие не соответствовало плану. '+e.reason,rule:e.rule});
   s.notice=ok?'Нина: «Чисто разошлись. Теперь снова смотрим всю воду».':'Нина: «Эту встречу стоит разобрать в журнале».';
   if(s.training?.id===e.id){if(ok)s.quest.training++;s.training=null;t.retired=true;s.notice=ok?'Нина: «Чисто разошлись. Занятие закончено. Куда пойдём дальше?»':'Нина: «Занятие закончено. Посмотри разбор; у буёв можно повторить». ';}
   s.cooldowns[e.id]=s.time+65;s.encounter=null;
  }
 }
}
export function saveWorld(s){
 return JSON.stringify({version:1,seed:s.seed,time:s.time,own:s.incident?{...s.lastSafe}:{x:s.own.x,z:s.own.z,h:s.own.h},safe:{...s.lastSafe},quest:s.quest,flags:s.flags,log:s.log.slice(-80),completed:s.completed.slice(-50),decisions:s.decisions.slice(-60),traffic:s.traffic.filter(t=>!t.training).map(t=>({id:t.id,x:t.x,z:t.z,h:t.h,s:t.s}))});
}
export function restoreWorld(raw){
 try{const v=JSON.parse(raw);if(v.version!==1||!v.own||!isWater(v.own,3)||!Number.isFinite(v.own.h)||!['none','carried','delivered'].includes(v.quest?.cargo)||!['none','carried','delivered'].includes(v.quest?.letter)||!Number.isInteger(v.quest?.training)||v.quest.training<0||v.quest.training>100)return null;
 const s=createWorld(Number.isInteger(v.seed)?v.seed:1);s.own={...s.own,...v.own,s:0,trail:[]};s.command=norm(v.own.h);s.time=Number.isFinite(v.time)&&v.time>=0&&v.time<1e8?v.time:0;if(Array.isArray(v.traffic))for(const t of s.traffic){const a=v.traffic.find(a=>a?.id===t.id);if(a&&isWater(a,3)&&Number.isFinite(a.h)&&Number.isFinite(a.s)&&a.s>=0&&a.s<5)Object.assign(t,{x:a.x,z:a.z,h:norm(a.h),s:a.s});}if(s.traffic.some(t=>hullsOverlap(s.own,t))){const fallback=v.safe&&isWater(v.safe,3)&&Number.isFinite(v.safe.h)?v.safe:{x:-16,z:25,h:0};Object.assign(s.own,{x:fallback.x,z:fallback.z,h:fallback.h,s:0});s.command=norm(s.own.h);}s.quest={cargo:v.quest.cargo,letter:v.quest.letter,training:v.quest.training};s.lastSafe={x:s.own.x,z:s.own.z,h:s.own.h};s.flags=Object.fromEntries(Object.entries(v.flags||{}).filter(([k,a])=>['metMila','metOleg','metIlya','cargoExplained'].includes(k)&&typeof a==='boolean'));for(const k of ['log','completed','decisions'])s[k]=Array.isArray(v[k])?v[k].slice(-80).filter(e=>e&&typeof e==='object'):[];
 return s;}catch{return null;}
}

export function shipHull(s){
 const shape=s.type==='sail'?[[-.24,-.65],[-.168,-1.02],[0,-1.38],[.168,-1.02],[.24,.62],[.156,.83],[-.156,.83]]:(()=>{
  const w=s.type==='cargo'?.36:.25,l=s.type==='cargo'?1.6:1.25;
  return [[-w,-l*.35],[-w*.8,-l*.62],[0,-l*.79],[w*.8,-l*.62],[w,l*.42],[w*.7,l*.55],[-w*.7,l*.55]];
 })();
 const a=s.h*Math.PI/180;
 return shape.map(([x,z])=>({x:s.x+(x*Math.cos(a)-z*Math.sin(a))*2.4,z:s.z+(x*Math.sin(a)+z*Math.cos(a))*2.4}));
}
export function hullsOverlap(a,b){
 const pa=shipHull(a),pb=shipHull(b);
 for(const poly of [pa,pb])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],axis={x:-(q.z-p.z),z:q.x-p.x};
  const da=pa.map(p=>p.x*axis.x+p.z*axis.z),db=pb.map(p=>p.x*axis.x+p.z*axis.z);
  if(Math.max(...da)<Math.min(...db)||Math.max(...db)<Math.min(...da))return false;
 }
 return true;
}
export function encounterChoices(e){
 const list=baseEncounterChoices(e);let x=2166136261;
 for(const c of String(e.id||e.kind)+String(Math.floor(e.at||0)))x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;
 for(let i=list.length-1;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=x%(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;
}
export function cancelTraining(s){
 if(!s.training)return false;const id=s.training.id,t=s.traffic.find(t=>t.id===id);if(t)t.retired=true;
 s.training=null;if(s.encounter?.id===id){s.cooldowns[id]=s.time+60;s.encounter=null;}
 stop(s);s.notice='Занятие закончено по вашему решению. Можно вернуться к буям или продолжить рейс.';return true;
}
function avoidTraffic(s){
 const ships=s.traffic.filter(t=>!t.training);
 for(let i=0;i<ships.length;i++)for(let j=i+1;j<ships.length;j++){
  const a=ships[i],b=ships[j],r=cpa(a,b);
  if(r.t<.2||r.t>18||r.d>9||r.range>55)continue;
  const e=classify(a,b);
  if(e.kind==='headon'){
   for(const t of [a,b])if(!(t.avoidUntil>s.time)){t.targetH=norm(t.h+25);t.avoidUntil=s.time+10;}
  }else{
   const t=e.duty==='stand'?b:a;
   if(!(t.avoidUntil>s.time)){t.cruise=t.cruise||t.s;t.s=.08;t.slowUntil=s.time+16;t.avoidUntil=s.time+3;}
  }
 }
}
