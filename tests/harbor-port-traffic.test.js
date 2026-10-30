import test from 'node:test';
import assert from 'node:assert/strict';
import {portTrafficAt,portTransitIsVisible} from '../src/harbor-port-traffic.js';
import {distance,delta,isWater,hullsOverlap} from '../src/world-engine.js';

test('port transits keep visible boats continuous and reset only outside the illustration',()=>{
 for(let i=0;i<5000;i++){
  const before=portTrafficAt(i*.25),after=portTrafficAt(i*.25+.25);
  for(let j=0;j<after.length;j++){
   const a=before[j],b=after[j];
   if(distance(a,b)>2){assert.equal(portTransitIsVisible(a),false);assert.equal(portTransitIsVisible(b),false);}
   else{assert.ok(distance(a,b)<.6);assert.ok(Math.abs(delta(a.h,b.h))<1);}
   for(let n=1;n<b.trail.length;n++)assert.ok(distance(b.trail[n-1],b.trail[n])<3,'no trail across a turnaround');
  }
 }
});
test('port traffic is clear of land, both berths and the other moving vessel',()=>{
 const berths=[{x:-16,z:25,h:30},{x:-14,z:15,h:180,type:'sail'}];
 for(let i=0;i<8000;i++){
  const ships=portTrafficAt(i*.4);
  for(const ship of ships){assert.ok(isWater(ship,2.5),ship.id);for(const own of berths)assert.equal(hullsOverlap(ship,own),false);}
  assert.equal(hullsOverlap(...ships),false,'passing ships remain separate');
 }
});
test('restoring the saved scenery clock restores the same port movement and observations',()=>{
 const clock=472.62,ships=portTrafficAt(clock),restored=JSON.parse(JSON.stringify({sceneryClock:clock}));
 assert.deepEqual(portTrafficAt(restored.sceneryClock),ships);
 assert.deepEqual(portTrafficAt(clock),ships,'rendering cannot advance time');
 assert.deepEqual(portTrafficAt(NaN),portTrafficAt(0));
});
