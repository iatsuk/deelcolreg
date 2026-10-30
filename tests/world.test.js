import test from 'node:test';
import assert from 'node:assert/strict';
import {BOUNDS,LAND,PLACES,ZONES,createWorld,isWater,lineClear,planRoute,setDestination,manual,stop,stepWorld,cpa,classify,encounterChoices,discussEncounter,canVisit,startTraining,recover,saveWorld,restoreWorld,shipHull,hullsOverlap,distance} from '../src/world-engine.js';
import {placeScene,questAction} from '../src/world-quests.js';
import {makeSailboat,makeBoat} from '../src/design-island.js';
const run=(s,seconds)=>{for(let i=0;i<seconds*20;i++)stepWorld(s,.05);};
test('free helm has inertia, continuous movement, real pause and no dialogue requirement',()=>{
 const s=createWorld(7);s.traffic=[];manual(s,0,1,1);assert.equal(s.own.s,0);run(s,2);assert.ok(s.own.s>1);assert.ok(s.own.z<25);
 const before={...s.own};s.paused=true;run(s,4);assert.deepEqual(s.own,before);s.paused=false;
 manual(s,1,0,.5);run(s,1);assert.ok(s.own.h>10);stop(s);assert.ok(s.own.s>0);run(s,3);assert.equal(s.own.s,0);
 assert.equal(s.decisions.length,0);
});
test('all regions are open and every pier can be reached by a shore-safe route',()=>{
 const s=createWorld(1);s.traffic=[];
 for(const p of [...PLACES.map(p=>p.berth),{x:35,z:0}]){
  const route=planRoute(s.own,p);assert.ok(route?.length,'route to '+JSON.stringify(p));
  let a=s.own;for(const b of route){assert.ok(lineClear(a,b,3.4));a=b;}
  const n=createWorld(2);n.traffic=[];assert.ok(setDestination(n,p));run(n,100);assert.equal(n.incident,null);assert.ok(distance(n.own,p)<5,'actual navigation to destination');
 }
 assert.equal(ZONES.length,3);
});
test('route finding detours around land rather than teleporting or crossing an island',()=>{
 const a={x:-70,z:6},b={x:-14,z:6};assert.equal(lineClear(a,b),false);
 const path=planRoute(a,b);assert.ok(path?.length>1);
 let p=a;for(const q of path){assert.ok(lineClear(p,q,3.4));p=q;}
 assert.equal(planRoute(a,{x:-45,z:8}),null);
});
test('solid shore stops a moving hull and recovery returns to a prior free point',()=>{
 const s=createWorld(8);s.traffic=[];s.own={...s.own,x:-16,z:16,h:270,s:3};s.command=270;s.throttle=3;
 run(s,8);assert.equal(s.incident?.kind,'ground');assert.equal(s.own.s,0);
 const before={...s.own};run(s,4);assert.deepEqual(s.own,before);assert.ok(recover(s));assert.ok(isWater(s.own));assert.equal(s.throttle,0);
});
test('ship collisions use oriented hulls and match the distinct yacht model footprint',()=>{
 const a={x:0,z:0,h:0},b={x:0,z:-4,h:180,type:'cargo'};
 assert.ok(hullsOverlap(a,b));assert.equal(hullsOverlap(a,{...b,x:8}),false);
 const yacht=makeSailboat(0,0,0),motor=makeBoat(0,0,0);
 assert.ok(Math.max(...yacht.flatMap(f=>f.points.map(p=>p[1])))>2.9);
 assert.ok(Math.max(...yacht.flatMap(f=>f.points.map(p=>p[1])))>Math.max(...motor.flatMap(f=>f.points.map(p=>p[1])))*2);
 const poly=shipHull({x:0,z:0,h:0,type:'sail'});
 const verts=yacht.flatMap(f=>f.points).filter(p=>p[1]<.4);
 assert.ok(Math.min(...poly.map(p=>p.z))<=Math.min(...verts.map(p=>p[2]))*2.4+.01);
});
test('visible encounter assessment preserves overtaking before vessel-type hierarchy',()=>{
 const own={x:0,z:0,h:0,s:2};
 assert.equal(classify(own,{x:0,z:-25,h:180,s:2,type:'motor'}).rule,14);
 assert.equal(classify(own,{x:18,z:-18,h:270,s:2,type:'motor'}).rule,15);
 assert.equal(classify(own,{x:-18,z:-18,h:90,s:2,type:'motor'}).rule,17);
 assert.equal(classify(own,{x:0,z:-12,h:0,s:1,type:'sail'}).rule,13);
 assert.equal(classify(own,{x:18,z:-18,h:270,s:2,type:'sail'}).rule,18);
 for(const b of [{x:0,z:-25,h:180,s:2,type:'motor'},{x:18,z:-18,h:270,s:2,type:'sail'}]){
  const e=classify(own,b);assert.equal(encounterChoices(e).filter(c=>c.correct).length,1);
 }
});
test('encounters arise from relative motion; a discussion does not execute the manoeuvre',()=>{
 const s=createWorld(1);s.own={x:0,z:20,h:0,s:2,trail:[]};s.command=0;s.throttle=2;
 s.traffic=[{id:'test',name:'Ветер',type:'motor',x:0,z:-15,h:180,s:1.3,zone:'bay',trail:[],nextTrail:0,training:true}];
 run(s,3.2);assert.ok(s.encounter);assert.equal(s.encounter.kind,'headon');
 const h=s.own.h;assert.ok(discussEncounter(s,'starboard'));assert.equal(s.own.h,h);assert.equal(s.command,h);
 assert.equal(discussEncounter(s,'starboard'),false);assert.equal(s.decisions.length,1);
});
test('training and short quests require physical arrival and have finite endings',()=>{
 const s=createWorld(2);assert.ok(canVisit(s,'port'));assert.ok(questAction(s,'take-cargo'));assert.equal(s.quest.cargo,'carried');
 assert.equal(questAction(s,'deliver-cargo'),null);
 s.own.x=-18;s.own.z=-46;assert.ok(questAction(s,'deliver-cargo'));assert.equal(s.quest.cargo,'delivered');assert.equal(questAction(s,'deliver-cargo'),null);
 s.own.x=-7;s.own.z=45;assert.ok(placeScene(s,'village').question);assert.ok(questAction(s,'fishing-no'));assert.equal(s.quest.letter,'carried');
 s.own.x=-16;s.own.z=25;assert.ok(questAction(s,'deliver-letter'));assert.equal(s.quest.letter,'delivered');
 s.own.x=-8;s.own.z=-22;s.own.h=0;assert.ok(startTraining(s));assert.equal(startTraining(s),false);assert.ok(isWater(s.traffic.at(-1),3));
});
test('save restores position, quests and traffic stopped, and rejects corrupted coordinates',()=>{
 const s=createWorld(17);questAction(s,'take-cargo');const restored=restoreWorld(saveWorld(s));
 assert.ok(restored);assert.equal(restored.quest.cargo,'carried');assert.equal(restored.own.s,0);assert.equal(restored.traffic.length,s.traffic.length);
 for(const own of [{x:NaN,z:0,h:0},{x:-45,z:8,h:0},{x:1e5,z:0,h:0}])assert.equal(restoreWorld(JSON.stringify({version:1,own,quest:s.quest})),null);
 assert.equal(restoreWorld('garbage'),null);
});
test('a correct plan still needs a real manoeuvre, which can finish a finite training encounter',()=>{
 const s=createWorld(9);s.traffic=[];Object.assign(s.own,{x:-8,z:-22,h:0});s.command=0;assert.ok(startTraining(s));
 s.throttle=2.4;run(s,4);assert.equal(s.encounter.kind,'headon');assert.ok(discussEncounter(s,'starboard'));
 assert.equal(s.quest.training,0);s.command=35;run(s,15);
 assert.equal(s.incident,null);assert.equal(s.quest.training,1);assert.equal(s.training,null);
 assert.ok(s.completed.at(-1).safe);assert.equal(s.decisions.length,1);
});
test('traffic keeps busy lanes distinct from the bay and hulls do not pass through each other',()=>{
 const s=createWorld(5);
 for(let i=0;i<1200;i++){
  stepWorld(s,.1);
  for(const t of s.traffic.filter(t=>t.zone==='busy'))assert.ok(t.x>=14&&t.x<=67&&t.z>=-33&&t.z<=37);
  for(let a=0;a<s.traffic.length;a++)for(let b=a+1;b<s.traffic.length;b++)assert.equal(hullsOverlap(s.traffic[a],s.traffic[b]),false);
 }
 assert.ok(s.traffic.filter(t=>t.s>.3).length>=4);
});
test('leaving the prototype boundary stops engines without calling it grounding',()=>{
 const s=createWorld(1);s.traffic=[];Object.assign(s.own,{x:0,z:-64,h:0,s:2});s.command=0;s.throttle=2;
 run(s,2);assert.equal(s.incident,null);assert.equal(s.own.s,0);assert.equal(s.throttle,0);assert.match(s.notice,/Граница/);
});
test('saving an incident restores the last safe point instead of the collided hull',()=>{
 const s=createWorld(3);s.own={...s.own,x:26,z:25,h:0};s.incident={kind:'collision'};
 const r=restoreWorld(saveWorld(s));assert.ok(r);assert.equal(r.own.x,s.lastSafe.x);assert.equal(r.own.z,s.lastSafe.z);assert.equal(r.incident,null);
});
test('aborting an overtake does not count as finally past and clear',()=>{
 const s=createWorld(1);s.own={x:0,z:20,h:0,s:2.5,trail:[]};s.command=0;s.throttle=2.5;
 s.traffic=[{id:'slow',name:'Тихий',type:'motor',x:0,z:0,h:0,s:1,training:true,trail:[{x:0,z:2},{x:0,z:1},{x:0,z:0}],nextTrail:0}];
 run(s,.1);assert.equal(s.encounter.kind,'overtake');s.command=75;run(s,22);
 const result=s.completed.find(e=>e.kind==='overtake');assert.ok(result?.aborted);assert.equal(result.safe,null);
});
