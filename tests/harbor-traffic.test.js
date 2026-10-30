import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarborTraffic,stepHarborTraffic,ensureHarborTraffic} from '../src/harbor-traffic.js';
import {createWorld,stepWorld,isWater,distance,delta,hullsOverlap} from '../src/world-engine.js';
test('background ships complete many laps without teleportation, sharp heading snaps or grounding',()=>{
 for(const seed of [0,731]){
  const ships=createHarborTraffic(seed),laps=new Set();
  for(let i=0;i<12000;i++){
   const before=ships.map(t=>({...t}));stepHarborTraffic(ships,.1);
   ships.forEach((t,n)=>{const a=before[n];assert.ok(distance(t,a)<=t.s*.101,'continuous position: '+t.id);assert.ok(Math.abs(delta(t.h,a.h))<1.6,'continuous turn: '+t.id);assert.ok(isWater(t,3.5),'navigable loop: '+t.id);if(t.phase<a.phase)laps.add(t.id);});
  }
  assert.equal(laps.size,ships.length,'every ship crosses its former reset boundary');
 }
});
test('separate traffic circuits never put hulls through each other or a moored player',()=>{
 const ships=createHarborTraffic(77),own={x:-16,z:25,h:30};
 for(let i=0;i<6000;i++){
  stepHarborTraffic(ships,.2);
  for(let a=0;a<ships.length;a++){assert.equal(hullsOverlap(ships[a],own),false);for(let b=a+1;b<ships.length;b++)assert.equal(hullsOverlap(ships[a],ships[b]),false,ships[a].id+' and '+ships[b].id);}
 }
});
test('background motion resumes unchanged across views and saves; old decorative traffic migrates once',()=>{
 const world=createWorld(12);ensureHarborTraffic(world,12);for(let i=0;i<300;i++)stepHarborTraffic(world.traffic,.1);
 const before=JSON.stringify(world.traffic);ensureHarborTraffic(world,88);assert.equal(JSON.stringify(world.traffic),before);
 const restored=JSON.parse(JSON.stringify(world));ensureHarborTraffic(restored,12);stepHarborTraffic(world.traffic,.1);stepHarborTraffic(restored.traffic,.1);assert.deepEqual(restored.traffic,world.traffic);
});
test('frame stalls and pause never jump ships to another point on a circuit',()=>{
 const ships=createHarborTraffic(20),before=JSON.stringify(ships);stepHarborTraffic(ships,0);assert.equal(JSON.stringify(ships),before);stepHarborTraffic(ships,NaN);assert.equal(JSON.stringify(ships),before);
 const old=ships.map(t=>({...t}));stepHarborTraffic(ships,30);ships.forEach((t,i)=>assert.ok(distance(t,old[i])<=t.s*1.01));
});
test('legacy free-sailing traffic also turns at its boundary rather than respawning',()=>{
 const s=createWorld(7);s.own={x:-70,z:-60,h:0,s:0,trail:[]};s.lastSafe={x:-70,z:-60,h:0};
 for(let i=0;i<1200;i++){const before=new Map(s.traffic.map(t=>[t.id,{...t}]));stepWorld(s,.1);for(const t of s.traffic)assert.ok(distance(t,before.get(t.id))<=Math.max(t.s,before.get(t.id).s)*.101+.001,t.id+' jumped');}
});
