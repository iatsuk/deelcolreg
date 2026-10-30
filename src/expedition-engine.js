import {createWorld, planRoute, distance, bearing, norm, vec, delta, isWater, hullsOverlap, PLACES} from './world-engine.js';

export const EXPEDITION_KEY='deelstuff.colreg.expedition.v1';
const copy=o=>JSON.parse(JSON.stringify(o));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createExpedition(seed=Date.now()>>>0){
 const world=createWorld(seed);world.beacon=false;
 return {version:1,seed:seed>>>0,world,minutes:21*60+40,inventory:[],flags:{},completed:{},learning:[],journal:[],travel:null,session:null,credits:0,trust:0,visits:['port'],notice:'Мила ждёт у причала. На Северном маяке заканчивается резерв питания.'};
}
export function eligible(s,q){
 return !s.completed[q.id]&&!(q.requires?.completed||[]).some(id=>!s.completed[id])&&!(q.requires?.flags||[]).some(id=>!s.flags[id])&&!(q.requires?.items||[]).some(id=>!s.inventory.includes(id));
}
export function availableAt(s,catalog,place){return catalog.filter(q=>q.trigger.type==='place'&&q.trigger.place===place&&eligible(s,q));}
export function startQuest(s,q){
 if(s.session||!eligible(s,q))return false;
 // The package controls its local state. Only completeQuest may apply rewards.
 s.session={id:q.id,version:q.version,seed:s.seed,mode:q.mode,node:q.entry||null,vars:{},seen:[],history:[],pending:null,help:[],attempts:[],local:q.mode==='encounter'?createMeeting(s.seed):q.mode==='investigation'?{status:null,evidence:[],lights:copy(q.puzzle.initial),feedback:null}:null,ending:null};
 return true;
}
export function textChoices(session,q){
 const node=q.nodes[session.node];
 const a=(node?.choices||[]).filter(c=>!c.unless||!session.vars[c.unless]).map(c=>({...c}));
 // Shuffle decisions, preserve the conversational order of ungraded replies.
 if(a.some(c=>typeof c.correct==='boolean'))a.sort((x,y)=>hash(q.id+session.node+x.id+session.seed)-hash(q.id+session.node+y.id+session.seed));
 return a;
}
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function chooseText(s,q,id){
 const t=s.session;if(!t||t.id!==q.id||t.pending||t.ending)return false;
 const c=textChoices(t,q).find(c=>c.id===id);if(!c)return false;
 const event={node:t.node,choice:c.id,text:c.text,correct:c.correct??null,feedback:c.feedback||null,rule:c.rule||null};
 t.history.push(event);Object.assign(t.vars,c.set||{});s.minutes+=c.minutes||0;
 if(typeof c.correct==='boolean'){s.learning.push({quest:q.id,rule:c.rule,correct:c.correct,help:t.help.length>0,decision:c.id,text:c.text,reason:c.feedback,nodeTitle:q.nodes[t.node].title});t.pending={...event,next:c.next};}
 else t.node=c.next;
 return true;
}
export function continueText(s){const t=s.session;if(!t?.pending)return false;t.node=t.pending.next;t.pending=null;return true;}
export function markHelp(s,rule){if(s.session&&!s.session.help.includes(rule))s.session.help.push(rule);}
export function finishText(s,q){
 const t=s.session;if(!t||t.pending||!q.nodes[t.node]?.ending)return false;
 t.ending=textEnding(t,q).outcome;return completeQuest(s,q,t.ending);
}
export function textEnding(t,q){
 const e=q.nodes[t.node]?.ending;if(!e)return null;
 if(e===true)return {outcome:t.vars.rushed?'late':'careful',summary:'Эпизод завершён.',label:'Вернуться в архипелаг'};
 return (e.cases||[]).find(c=>Object.entries(c.when||{}).every(([k,v])=>t.vars[k]===v))||e;
}
export function completeQuest(s,q,outcome='complete'){
 const t=s.session;if(!t||t.id!==q.id||s.completed[q.id])return false;
 if(q.mode==='text'&&!q.nodes[t.node]?.ending)return false;
 if(q.mode==='encounter'&&t.local.phase!=='result')return false;
 if(q.mode==='encounter'&&outcome!=='retreated'&&!t.local.success)return false;
 if(q.mode==='investigation'&&!t.local.feedback?.correct)return false;
 const reward=q.outcomes[outcome];if(!reward)return false;
 const details={id:q.id,title:q.title,outcome,at:s.minutes,help:t.help.slice(),vars:copy(t.vars),decisions:t.history.length,attempts:copy(t.attempts)};
 s.completed[q.id]=details;s.credits+=reward.credits||0;s.trust+=reward.trust||0;s.minutes+=reward.minutes||0;
 for(const item of reward.addItems||[])if(!s.inventory.includes(item))s.inventory.push(item);
 s.inventory=s.inventory.filter(i=>!(reward.removeItems||[]).includes(i));Object.assign(s.flags,reward.flags||{});
 s.world.beacon=!!s.flags.beaconRepaired;
 s.journal.push({...details,text:reward.text});s.notice=reward.text;s.session=null;
 if(reward.travel){
  // Leave the dangerous leg through an authored, navigable alternative.
  s.travel=null;beginTravel(s,reward.travel.place,reward.travel.style);
 }
 return true;
}
export function beginTravel(s,place,style='direct'){
 if(s.session||!PLACES.some(p=>p.id===place))return false;
 const goal=PLACES.find(p=>p.id===place).berth;
 let through=[];
 if(place==='lighthouse')through=style==='outer'?[{x:28,z:35},{x:65,z:0},{x:30,z:-60}]:[{x:1,z:4},{x:8,z:-14}];
 if(distance(s.world.own,goal)<3){s.world.own.s=0;return false;}
 const route=[];let from=s.world.own;
 for(const p of [...through,goal]){const leg=planRoute(from,p);if(!leg)return false;route.push(...leg);from=p;}
 s.world.route=route;s.travel={place,style,route:copy(route),arrived:false};s.notice=style==='outer'?'Идём вокруг островов. Переход длиннее, встреча на рейде остаётся в стороне.':s.inventory.includes('power-unit')&&!s.completed['reid-crossing']?'Идём через рейд. На границе района Нина поможет оценить встречу.':'Идём через плёс. Спокойную часть перехода можно ускорить.';
 return true;
}
export function sailTo(s,p){
 if(s.session)return false;const route=planRoute(s.world.own,p);if(!route)return false;
 s.world.route=route;s.travel={place:null,style:'free',route:copy(route),arrived:false};s.notice='Курс выбран. Причалы и местные истории доступны на карте.';return true;
}
export function advanceWorld(s,dt,catalog,speed=1){
 if(s.session)return null;
 dt=clamp(dt,0,.15);const travel=s.travel,w=s.world;
 if(travel?.route.length){
  const step=dt*speed*3.5;let left=step;
  while(left>0&&travel.route.length){const p=travel.route[0],d=distance(w.own,p),n=Math.min(left,d);w.own.h=bearing(w.own,p);w.own.s=3.5;
   if(d>.001){w.own.x+=(p.x-w.own.x)*n/d;w.own.z+=(p.z-w.own.z)*n/d;}left-=n;
   // Time belongs to the voyage; accelerated travel never changes its cost.
   s.minutes+=n*(travel.style==='outer'?.45:.65);w.time+=n;
   if(d<=n+.001)travel.route.shift();
  }
  w.route=copy(travel.route);
  const last=w.own.trail.at(-1);if(!last||distance(last,w.own)>1)w.own.trail.push({x:w.own.x,z:w.own.z});w.own.trail=w.own.trail.slice(-100);
  const trigger=catalog.find(q=>q.trigger.type==='boundary'&&eligible(s,q)&&travel.style!=='outer'&&w.own.z<=q.trigger.z);
  if(trigger){startQuest(s,trigger);w.own.s=0;return {type:'quest',id:trigger.id};}
  if(!travel.route.length){w.own.s=0;s.travel=null;const place=travel.place;if(place&&!s.visits.includes(place))s.visits.push(place);s.notice=place?'Прибыли: '+PLACES.find(p=>p.id===place).name+'. Можно сойти к причалу.':'Пришли к выбранной точке.';return {type:'arrival',place};}
 }
 return null;
}
export function isAt(s,place){const p=PLACES.find(p=>p.id===place);return !!p&&distance(s.world.own,p.berth)<p.radius&&!s.travel;}
export function saveExpedition(s){return JSON.stringify(s);}
export function restoreExpedition(raw,catalog){
 try{
  const s=JSON.parse(raw);if(s?.version!==1||!s.world?.own||!Number.isFinite(s.minutes)||!Number.isInteger(s.seed)||!Array.isArray(s.inventory)||!Array.isArray(s.learning)||!Array.isArray(s.journal)||!s.flags||!s.completed||!Array.isArray(s.visits))return null;
  if(!isWater(s.world.own,2)||!Number.isFinite(s.world.own.h))return null;
  if(s.travel&&(!Array.isArray(s.travel.route)||!s.travel.route.every(p=>isWater(p,2))))return null;
  if(s.session){const t=s.session,q=catalog.find(q=>q.id===t.id);if(!q||q.version!==t.version||q.mode!==t.mode||!Array.isArray(t.history)||!Array.isArray(t.help)||!Array.isArray(t.attempts)||!t.vars)return null;
   if(q.mode==='text'&&(!q.nodes[t.node]||(t.pending&&!q.nodes[t.pending.next])))return null;
   if(q.mode!=='text'&&!t.local)return null;
   if(q.mode==='encounter'&&(!['planning','running','result'].includes(t.local.phase)||!Number.isFinite(t.local.time)||!Number.isFinite(t.local.minRange)||!['own','target'].every(k=>['x','z','h','s'].every(v=>Number.isFinite(t.local[k]?.[v])))))return null;
   if(q.mode==='investigation'&&(!Array.isArray(t.local.evidence)||!t.local.lights))return null;
  }
  return s;
 }catch{return null;}
}
export function deliverReply(s){
 if(s.flags.homecoming||!s.inventory.includes('oleg-reply')||!isAt(s,'port'))return false;
 s.inventory=s.inventory.filter(i=>i!=='oleg-reply');s.flags.homecoming=true;s.notice='Рейс завершён. Олег приедет в воскресенье; маяк снова работает.';s.journal.push({title:'Письмо на обратный берег',at:s.minutes,text:s.notice});return true;
}
export function createMeeting(seed=0){
 const rotation=[0,90,180,270][seed%4],kind=(seed>>>2)%2?'headon':'crossing',speed=1.3+(seed%3)*.1,T=24;
 const rotate=p=>{const r=rotation*Math.PI/180;return {x:p.x*Math.cos(r)-p.z*Math.sin(r),z:p.x*Math.sin(r)+p.z*Math.cos(r)};};
 const own={...rotate({x:0,z:speed*T}),h:norm(rotation),s:speed,trail:[]};
 const target={id:'marta',name:'Марта',type:'cargo',...rotate(kind==='crossing'?{x:speed*T,z:0}:{x:0,z:-speed*T}),h:norm(rotation+(kind==='crossing'?270:180)),s:speed,trail:[]};
 for(const p of [own,target])for(const t of [-12,-8,-4,0]){const v=vec(p.h,p.s);p.trail.push({x:p.x+v.x*t,z:p.z+v.z*t});}
 return {seed,kind,rotation,phase:'planning',time:0,own,target,initialH:own.h,initialS:speed,command:own.h,speed,minRange:distance(own,target),firstAction:null,actions:[],preview:true,success:null,reason:null,recorded:false,crossingAhead:false};
}
export function commandMeeting(m,course,speed){
 if(m.phase==='result')return false;m.command=norm(course);m.speed=clamp(speed,0,m.initialS);
 if(m.phase==='planning')return true;
 m.actions.push({time:m.time,course:m.command,speed:m.speed});
 if(!m.firstAction&&(Math.abs(delta(m.command,m.initialH))>=15||m.speed<m.initialS*.6))m.firstAction={time:m.time,turn:delta(m.command,m.initialH),slow:m.speed<m.initialS*.6};
 return true;
}
export function meetingCPA(a,b){const av=vec(a.h,a.s),bv=vec(b.h,b.s),x=b.x-a.x,z=b.z-a.z,vx=bv.x-av.x,vz=bv.z-av.z,t=Math.max(0,-(x*vx+z*vz)/(vx*vx+vz*vz||1));return {time:t,distance:Math.hypot(x+vx*t,z+vz*t)};}
export function runMeeting(m){if(m.phase!=='planning')return false;m.phase='running';commandMeeting(m,m.command,m.speed);return true;}
export function stepMeeting(m,dt){
 if(m.phase!=='running')return false;
 dt=clamp(dt,0,.1);m.time+=dt;
 const axis=vec(m.target.h,1),side=()=>-(m.own.x-m.target.x)*axis.z+(m.own.z-m.target.z)*axis.x,oldSide=side();
 m.own.h=norm(m.own.h+clamp(delta(m.command,m.own.h),-16*dt,16*dt));m.own.s+=clamp(m.speed-m.own.s,-.4*dt,.4*dt);
 if(m.kind==='headon'&&m.time>3)m.target.h=norm(m.target.h+clamp(delta(norm(m.initialH+180+30),m.target.h),-16*dt,16*dt));
 for(const p of [m.own,m.target]){const v=vec(p.h,p.s);p.x+=v.x*dt;p.z+=v.z*dt;if(m.time-(p.lastTrail||0)>1){p.trail.push({x:p.x,z:p.z});p.lastTrail=m.time;p.trail=p.trail.slice(-60);}}
 const range=distance(m.own,m.target);m.minRange=Math.min(m.minRange,range);
 if(m.kind==='crossing'&&oldSide*side()<=0){const ahead=(m.own.x-m.target.x)*axis.x+(m.own.z-m.target.z)*axis.z;m.crossingAhead=m.crossingAhead||ahead>0;}
 if(hullsOverlap(m.own,m.target)){m.phase='result';m.success=false;m.reason='В игровой модели корпуса судов столкнулись. Нужно было раньше оценить риск и выполнить заметное действие.';return true;}
 if(m.time>=48||(m.time>27&&range>m.minRange+18&&meetingCPA(m.own,m.target).time<.01)){
  const early=m.firstAction&&m.firstAction.time<10,adequate=m.kind==='headon'?m.firstAction?.turn>=15:!!m.firstAction;
  m.phase='result';m.success=!!(early&&adequate&&m.minRange>=7&&!m.crossingAhead);
  m.reason=m.success?'Манёвр выполнен заблаговременно, запас при расхождении сохранён. Вы проследили встречу до увеличения дистанции.':!early?'Действие началось слишком поздно или не было выполнено. Случайного расхождения недостаточно для надлежащего исполнения обязанности.':!adequate?'При встрече прямо или почти прямо с опасностью столкновения оба механических судна изменяют курс вправо. Одного уменьшения хода здесь недостаточно.':m.crossingAhead?'Вы пересекли курс «Марты» у неё по носу. В заданной открытой воде был доступен заблаговременный проход за кормой или снижение хода. Правило 15 требует, если обстоятельства позволяют, избегать такого пересечения.':'Суда разошлись слишком тесно для этой учебной сцены. Выберите более заметный заблаговременный манёвр.';return true;
 }
 return false;
}
export function recordMeeting(s){
 const t=s.session,m=t?.local;if(t?.mode!=='encounter'||m.phase!=='result'||m.recorded)return false;
 m.recorded=true;const a={correct:m.success,rule:m.kind==='headon'?14:15,reason:m.reason,minRange:Math.round(m.minRange*10)/10,help:t.help.length>0};t.attempts.push(a);s.learning.push({quest:t.id,...a});return true;
}
export function retryMeeting(s){const t=s.session;if(t?.mode!=='encounter'||t.local.phase!=='result')return false;t.local=createMeeting(t.local.seed);return true;}
export function inspectEvidence(s,q,id){const l=s.session?.local;if(s.session?.mode!=='investigation'||!q.puzzle.evidence.some(e=>e.id===id))return false;if(!l.evidence.includes(id))l.evidence.push(id);return true;}
export function gradeInvestigation(s,q){
 const t=s.session,l=t?.local;if(t?.id!==q.id||t.mode!=='investigation'||l.feedback?.correct)return false;
 if(q.puzzle.evidence.some(e=>!l.evidence.includes(e.id))){l.feedback={correct:null,text:'Олег просит сначала сопоставить все три свидетельства. Откройте карточки на столе: важно знать и занятие судна, и его движение, и длину.'};return true;}
 const status=l.status===q.puzzle.status,lights=Object.entries(q.puzzle.solution).every(([k,v])=>l.lights[k]===v);
 const correct=status&&lights;
 l.feedback={correct,text:correct?q.puzzle.success:!status?q.puzzle.statusError:q.puzzle.lightError};
 const attempt={correct,rule:!status?3:26,help:t.help.length>0,reason:l.feedback.text,status:l.status,lights:copy(l.lights)};t.attempts.push(attempt);s.learning.push({quest:q.id,...copy(attempt)});return true;
}
export function validatePackage(q){
 const errors=[];if(!q.id||!Number.isInteger(q.version)||!['text','encounter','investigation'].includes(q.mode)||!q.trigger||!q.outcomes||!q.media?.scene||!q.media?.music)errors.push('Incomplete manifest');
 if(q.mode==='text'){
  if(!q.nodes?.[q.entry])errors.push('Missing entry');
  for(const [id,n] of Object.entries(q.nodes||{})){if(!n.ending&&!n.choices?.length)errors.push('Dead end: '+id);if(n.ending&&n.ending!==true)for(const e of [n.ending,...(n.ending.cases||[])])if(!q.outcomes[e.outcome])errors.push('Missing outcome: '+e.outcome);for(const c of n.choices||[]){if(!q.nodes[c.next])errors.push('Missing node: '+c.next);if(typeof c.correct==='boolean'&&(!c.rule||!c.feedback))errors.push('Missing explanation: '+c.id);}}
 }
 return errors;
}
