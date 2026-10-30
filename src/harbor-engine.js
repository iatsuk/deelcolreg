import {createExpedition, eligible, startQuest, finishText, completeQuest, textEnding, beginTravel, advanceWorld, restoreExpedition} from './expedition-engine.js';
import {PLACES, distance, planRoute} from './world-engine.js';

export const HARBOR_KEY='deelstuff.colreg.harbor.v1';
export const LOCATIONS=[
 {id:'port',name:'Старый порт',person:'Мила',tag:'Домашний причал',x:-24,z:16,description:'Под навесом сушатся накладные. Мила пытается собрать из случайных попуток постоянную местную линию.'},
 {id:'workshop',name:'Мастерская',person:'Нина',tag:'За углом от причала',x:-32,z:1,description:'За открытой дверью пахнет олифой. Нина чинит отцовскую яхту и ищет человека для её первого выхода.'},
 {id:'village',name:'Рыбацкий посёлок',person:'Илья',tag:'Южный берег',x:-14,z:49,description:'Илья попросил зайти без груза. Дело, судя по паузам в его сообщении, совсем не в рыбе.'},
 {id:'lighthouse',name:'Северный маяк',person:'Олег',tag:'За рейдом',x:-23,z:-50,description:'Олег остался на острове после смены. На причале ждут посылку, в доме — письмо.'}
];
const clone=o=>JSON.parse(JSON.stringify(o));
export function addMessage(s,id,from,title,text){
 if(s.line.mail.some(m=>m.id===id))return false;
 s.line.mail.unshift({id,from,title,text,at:s.minutes,read:false});return true;
}
export function createHarbor(seed=Date.now()>>>0){
 const s=createExpedition(seed),berth=PLACES.find(p=>p.id==='port').berth;s.world.lineReady=false;
 Object.assign(s.world.own,berth,{s:0,h:30,trail:[]});s.minutes=9*60+10;
 s.line={version:1,location:'port',mail:[],memories:[],parked:{},returns:0,crew:'alone',voyage:null,links:[]};
 s.notice='«Смена» у своего причала. До отхода можно заглянуть в мастерскую или разобрать почту.';
 addMessage(s,'ilya-invite','Илья','Загляни к нам','Будешь у южного берега — причаль. Лиза собралась в город. По радио не хочу объяснять. Илья.');
 return s;
}
export function canPlay(s,q){
 return eligible(s,q)&&(!q.requires?.anyFlags||q.requires.anyFlags.some(f=>s.flags[f]));
}
export function opportunities(s,catalog,place){
 return catalog.filter(q=>q.trigger.type==='place'&&(!place||q.trigger.place===place)&&canPlay(s,q));
}
export function atLocation(s,id){return !s.travel&&(s.line.location===id||(['port','workshop'].includes(id)&&['port','workshop'].includes(s.line.location)));}
export function enterLocal(s,id){
 if(s.travel||s.session||!['port','workshop'].includes(id)||!atLocation(s,'port'))return false;
 if(s.line.location!==id)s.minutes+=2;s.line.location=id;return true;
}
export function startStory(s,q){
 if(s.session||s.travel||q.trigger.type!=='place'||!atLocation(s,q.trigger.place)||!canPlay(s,q))return false;
 s.line.location=q.trigger.place;
 const parked=s.line.parked[q.id];
 if(parked){s.session=parked;delete s.line.parked[q.id];return true;}
 const ok=startQuest(s,q);
 if(ok&&q.mode==='text'){
  const entry=q.entryCases?.find(c=>c.flags.every(f=>s.flags[f]));
  if(entry&&q.nodes[entry.node])s.session.node=entry.node;
 }
 return ok;
}
export function parkStory(s){
 if(!s.session||s.session.mode==='encounter'||s.travel)return false;
 s.line.parked[s.session.id]=s.session;s.session=null;return true;
}
export function finishStory(s,q,outcome='complete'){
 if(!s.session||s.session.id!==q.id)return false;
 if(q.mode==='text')outcome=textEnding(s.session,q)?.outcome;
 const ok=q.mode==='text'?finishText(s,q):completeQuest(s,q,outcome);
 if(!ok)return false;
 const r=q.outcomes[outcome];
 if(r.memory&&!s.line.memories.some(m=>m.id===q.id))s.line.memories.push({id:q.id,title:r.memory.title,text:r.memory.text});
 if(r.message)addMessage(s,q.id,r.message.from,r.message.title,r.message.text);
 if(q.id==='marta-crossing'&&outcome==='retreated'&&s.travel){
  const dest=s.travel.place;s.travel=null;beginVoyage(s,dest,'outer');
 }
 updateLinks(s);return true;
}
function updateLinks(s){
 s.line.links=['village','lighthouse'].filter(id=>s.flags[id+'Link']);
 s.world.lineReady=s.line.links.length===2;
}
export function beginVoyage(s,destination,route='direct',crew='alone'){
 if(s.session||s.travel||!['port','village','lighthouse'].includes(destination)||!['direct','outer'].includes(route))return false;
 if(atLocation(s,destination))return false;
 if(crew==='nina'&&!s.flags.ninaReady)return false;
 const candidate=clone(s);
 if(!beginTravel(candidate,destination,route))return false;
 if(route==='outer'){
  const northStart=s.world.own.z<0,northEnd=destination==='lighthouse';
  const through=northStart?[{x:30,z:-60},{x:65,z:0},{x:28,z:35}]:northEnd?[{x:28,z:35},{x:65,z:0},{x:30,z:-60}]:[{x:28,z:35}];
  const path=[];let from=candidate.world.own;
  for(const point of [...through,PLACES.find(p=>p.id===destination).berth]){const leg=planRoute(from,point);if(!leg)return false;path.push(...leg);from=point;}
  candidate.travel.route=path;candidate.world.route=clone(path);
 }
 s.travel=candidate.travel;s.world.route=candidate.world.route;
 const points=[s.world.own,...s.travel.route],total=points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);
 s.line.crew=crew;s.line.voyage={from:s.line.location,to:destination,total};
 s.notice=route==='outer'?'Идём восточным обходом. Открытая вода, длинный путь; рейд остаётся в стороне.':'Идём через плёс. У рейда может потребоваться отдельное решение.';
 return true;
}
export function voyageProgress(s){
 if(!s.travel||!s.line.voyage)return 1;
 const pts=[s.world.own,...s.travel.route],left=pts.slice(1).reduce((n,p,i)=>n+distance(pts[i],p),0);
 return Math.max(0,Math.min(1,1-left/(s.line.voyage.total||1)));
}
export function advanceVoyage(s,dt,catalog,speed=1){
 if(!s.travel||s.session)return null;
 // World movement is connective tissue. Encounters are separate, saved games.
 const event=advanceWorld(s,dt,[],speed);
 const q=catalog.find(q=>q.trigger.type==='boundary'&&canPlay(s,q));
 if(s.travel&&q&&s.travel.style==='direct'&&voyageProgress(s)>.32){startQuest(s,q);s.world.own.s=0;return {type:'quest',id:q.id};}
 if(event?.type==='arrival'){arrive(s,event.place);return event;}
 return null;
}
export function skipVoyage(s,catalog){
 if(!s.travel||s.session)return null;
 // Small physical steps keep boundary encounters from being skipped by fast travel.
 for(let i=0;i<5000;i++){const event=advanceVoyage(s,.15,catalog,12);if(event)return event;}
 return null;
}
function arrive(s,place){
 s.line.location=place;s.line.voyage=null;s.world.own.trail=[];
 if(place==='port'){
  s.line.returns++;
  if(s.inventory.includes('liza-aboard')){
   s.inventory=s.inventory.filter(i=>i!=='liza-aboard');s.flags.villageLink=true;
   s.line.memories.push({id:'liza-arrived',title:'Тетрадь с синим корешком',text:'Лиза оставила список своих первых вопросов о море. На последней странице — номер Ильи и «обратно в субботу».'});
   addMessage(s,'liza-arrived','Мила','У меня тут гостья','Твоя пассажирка уже спорит с Ниной о поступлении. Илья позвонил дважды. Я обещала ему рейс в субботу — теперь у нашей линии есть первый постоянный пассажир.');
  }
  if(s.inventory.includes('oleg-reply')){
   s.inventory=s.inventory.filter(i=>i!=='oleg-reply');s.flags.lighthouseLink=true;
   s.line.memories.push({id:'oleg-reply',title:'Расписание от руки',text:'Олег приписал под ответом Миле: «Продукты — по четвергам. Если вы и вправду решитесь ходить регулярно».'});
   addMessage(s,'oleg-return','Мила','Он написал «приеду»','Олег прочёл письмо. В воскресенье будет здесь. И ещё: на маяк теперь можно ходить по четвергам. Я повесила его расписание под навесом.');
  }
 }
 updateLinks(s);
 if(s.line.links.length===2)addMessage(s,'line-founded','Мила','Малая линия','На доске теперь две строки: посёлок — суббота, маяк — четверг. Ни названия компании, ни печати. Только люди, которые знают, кого ждать. Заходи — чай ещё горячий.');
}
export function restoreHarbor(raw,catalog){
 const s=restoreExpedition(raw,catalog);
 if(!s||s.line?.version!==1||!LOCATIONS.some(p=>p.id===s.line.location)||!Array.isArray(s.line.mail)||!Array.isArray(s.line.memories)||!s.line.parked||!Array.isArray(s.line.links))return null;
 if(s.travel&&(!s.line.voyage||!Number.isFinite(s.line.voyage.total)||s.line.voyage.total<=0))return null;
 for(const [id,t] of Object.entries(s.line.parked)){
  const q=catalog.find(q=>q.id===id);if(!q||q.mode==='encounter'||t.id!==id||!restoreExpedition(JSON.stringify({...s,session:t}),catalog))return null;
 }
 updateLinks(s);return s;
}
