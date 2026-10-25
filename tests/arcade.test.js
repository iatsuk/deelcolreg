import test from 'node:test';
import assert from 'node:assert/strict';
import { VOYAGES,LANTERNS,WHISTLES,LOOKOUT_ROUNDS,createVoyage,stepVoyage,commandVoyage,lookoutAt,stepLookout,gradeLantern,gradeWhistle,loadArcade,saveArcade,ARCADE_KEY,turn } from '../src/arcade-engine.js';
import {arcadeHub,arcadeMarkup} from '../src/arcade-pages.js';
import {COURSE_CARDS} from '../src/course.js';
function sail(id,actions=[]){const s=createVoyage(id);s.phase='running';const pending=[...actions];for(let i=0;i<5000&&s.phase==='running';i++){while(pending.length&&s.time>=pending[0].at){const a=pending.shift();commandVoyage(s,a.h,a.speed??s.speed);}stepVoyage(s,.1);}assert.equal(s.phase,'result');return s;}

test('all helm missions can be completed by actions that respect their conditions',()=>{
 const routes=[['headon',35,1],['crossing',40,1],['crossing',0,1,3],['standon',0,1],['standon-late',35,28],['overtake',30,1],['overtake',-30,1],['overtaken',0,1],['channel',5,1],['fog',40,1],['fog',0,1,3]];
 for(const [id,h,at,speed] of routes){const result=sail(id,[{at,h,speed}]);assert.equal(result.success,true,`${id}: ${result.reason}`);}
});

test('uncontrolled collision courses fail, and safe geometry alone cannot override the duty',()=>{
 for(const id of ['headon','crossing','standon-late','overtake','fog'])assert.equal(sail(id).success,false,id);
 assert.equal(sail('headon',[{at:1,h:325}]).success,false,'port alteration is not accepted for head-on');
 assert.equal(sail('standon',[{at:1,h:35}]).success,false,'unnecessary maneuver in cooperative encounter');
 assert.equal(sail('standon-late',[{at:1,h:35}]).success,false,'early maneuver before established failure');
 assert.equal(sail('fog',[{at:1,h:325}]).success,false,'port alteration for radar-only target ahead');
 assert.equal(sail('channel').success,false,'ignoring a persistent set drifts away from starboard edge');
});

test('helm inertia and pause affect actual movement; commands are not teleports',()=>{
 const s=createVoyage('crossing');s.phase='running';commandVoyage(s,40,3);stepVoyage(s,.1);assert.ok(s.own.h>0&&s.own.h<1);assert.ok(s.own.s>3&&s.own.s<6);
 const point={...s.own},time=s.time;s.paused=true;stepVoyage(s,.1);commandVoyage(s,90,0);assert.deepEqual(s.own,point);assert.equal(s.time,time);assert.equal(s.command,40);
});

test('radar risk follows relative motion and is invariant under chart rotation',()=>{
 for(const round of LOOKOUT_ROUNDS){const a=lookoutAt(round,0),b=lookoutAt(round,20);const dangerous=a.targets.filter(t=>t.risk);assert.equal(dangerous.length,1);for(const target of a.targets){const later=b.targets.find(t=>t.id===target.id);if(target.risk){assert.ok(Math.abs(turn(later.bearing,target.bearing))<.01);assert.ok(later.range<target.range);}else assert.ok(Math.abs(turn(later.bearing,target.bearing))>1);}assert.ok(a.targets.every(t=>Math.abs(t.x-a.own.x)<600&&Math.abs(t.y-a.own.y)<500),'all contacts initially visible');}
});

test('light and shape assembly checks order, repeated elements and completeness',()=>{
 for(const task of LANTERNS){assert.equal(gradeLantern(task,task.tokens),true);assert.equal(gradeLantern(task,[]),false);assert.equal(gradeLantern(task,[...task.tokens,'yellow']),false);}
 const ram=LANTERNS.find(t=>t.id==='ram');assert.equal(gradeLantern(ram,['red','red','white']),false);assert.equal(gradeLantern(ram,['red',,'red']),false);
});

test('whistle grading checks real duration, order and meaningful spacing',()=>{
 function blasts(pattern,gap=.4){let time=0;return [...pattern].map(v=>{const duration=v==='-'?4.6:1;const result={start:time,duration};time+=duration+gap;return result;});}
 for(const task of WHISTLES){assert.equal(gradeWhistle(task,blasts(task.pattern,task.id==='fog-stopped'?2:.4)).correct,true,task.id);assert.equal(gradeWhistle(task,[]).correct,false);}
 assert.equal(gradeWhistle(WHISTLES[0],[{start:0,duration:2.5}]).correct,false,'neither short nor prolonged');
 assert.equal(gradeWhistle(WHISTLES.find(t=>t.id==='fog-stopped'),blasts('--',.3)).correct,false,'two prolonged need about two seconds gap');
 assert.equal(gradeWhistle(WHISTLES.find(t=>t.id==='doubt'),blasts('......')).correct,true,'at least five short blasts');
 assert.equal(gradeWhistle(WHISTLES.find(t=>t.id==='doubt'),blasts('.....',1.8)).correct,false,'warning blasts must be rapid');
});

test('arcade journal survives reload, rejects corrupt values and tolerates blocked storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},progress={};
 assert.equal(saveArcade(storage,progress,'nav-crossing',false),true);saveArcade(storage,progress,'nav-crossing',true);assert.deepEqual(loadArcade(storage),{'nav-crossing':{tries:2,wins:1}});assert.ok(map.has(ARCADE_KEY));
 assert.deepEqual(loadArcade({getItem:()=>'{bad'}),{});assert.deepEqual(loadArcade({getItem:()=>'{"nav-x":{"tries":1,"wins":8}}'}),{});assert.equal(saveArcade({setItem:()=>{throw Error();}},progress,'sound-right',true),false);assert.equal(progress['sound-right'].wins,1);
});

test('every game has a complete briefing and debrief without multiple-choice answer buttons',()=>{
 assert.match(arcadeHub({}),/На мостике/);assert.match(arcadeHub({}),/Проверка знаний/);
 for(const type of ['bridge','lookout','lantern','whistle']){const items={bridge:VOYAGES,lookout:LOOKOUT_ROUNDS,lantern:LANTERNS,whistle:WHISTLES}[type];for(let index=0;index<items.length;index++)for(const phase of ['brief','running','result']){const state=type==='bridge'?createVoyage(items[index].id):{slots:[],selected:null,picks:new Set(),samples:[],blasts:[]};Object.assign(state,{type,index,phase,success:false,reason:'Разбор',samples:[]});const html=arcadeMarkup({state,progress:{}});assert.match(html,/arcade-sea/);assert.doesNotMatch(html,/data-answer=|data-drill-answer=/);}}
 const question=COURSE_CARDS.find(q=>q.rule===4);assert.doesNotMatch(question.question,/5–10/);assert.match(question.question,/Наблюдение/);assert.doesNotMatch(COURSE_CARDS.find(q=>q.rule===11).question,/12–18/);
});

 test('observation windows wait for a slow player without making the third sample unreachable',()=>{
  const state={time:0,samples:[]};
  for(let i=0;i<3;i++){stepLookout(state,120);assert.equal(state.time,(i+1)*10);state.samples.push({time:state.time});}
  stepLookout(state,120);assert.equal(state.time,30);
 });
