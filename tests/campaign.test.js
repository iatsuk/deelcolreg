import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, NODES, ENCOUNTERS, REVIEW_CASES, CONVERSATIONS } from '../src/campaign-data.js';
import { createCampaign, campaignScene, answer, continueCampaign, talk, useReference, stats, startReview, reviewCase, answerReview, nextReview, serializeCampaign, restoreCampaign } from '../src/campaign-engine.js';
import { RULE_TEXT } from '../src/rules-text.js';
import { buildIslandScene } from '../src/design-island.js';
import { WATCH_SHIPS, ISLAND_SEA } from '../src/design-encounter.js';

function correctToEnd(s){let guard=0;while(!campaignScene(s).end){assert.ok(guard++<50);if(s.pending)assert.ok(continueCampaign(s));else assert.ok(answer(s,campaignScene(s).choices.find(c=>c.correct).id));}return s;}
function pathTo(id){
 const queue=[createCampaign(42)],seen=new Set();
 while(queue.length){const s=queue.shift();if(s.node===id)return s;if(seen.has(s.node))continue;seen.add(s.node);for(const c of campaignScene(s).choices){const n=structuredClone(s);answer(n,c.id);assert.ok(continueCampaign(n));queue.push(n);}}
 throw Error('unreachable '+id);
}
test('a complete voyage connects five chapters and 17 meaningful decisions',()=>{
 const s=correctToEnd(createCampaign(11));
 assert.equal(s.history.length,17);assert.equal(stats(s).errors,0);assert.equal(stats(s).chapters,5);
 assert.equal(s.node,'ending');assert.equal(campaignScene(s).dialogue.length,2);
 assert.deepEqual([...new Set(s.history.map(h=>h.chapter))],[0,1,2,3,4]);
 assert.ok(s.history.some(h=>h.rule===18));assert.ok(s.history.some(h=>h.rule===2));
 assert.equal(answer(s,'lookout'),false);assert.equal(continueCampaign(s),false);
});
test('every reachable decision edge has feedback and can finish without a dead end',()=>{
 for(const [id,n] of Object.entries(NODES)){
  const start=pathTo(id),scene=campaignScene(start);assert.ok(scene.title&&scene.dialogue.length>=2);
  if(n.end)continue;
  assert.equal(scene.choices.filter(c=>c.correct).length,1);
  assert.ok(RULE_TEXT.some(r=>r.id===scene.rule));assert.ok(scene.clause&&scene.why);
  for(const c of scene.choices){
   const s=structuredClone(start);assert.ok(answer(s,c.id));assert.equal(s.node,id,'feedback must remain on the question');
   assert.equal(s.pending.correct,c.correct);assert.ok(s.pending.feedback&&s.pending.why);
   assert.equal(answer(s,c.id),false,'no double scoring');assert.ok(continueCampaign(s));
   correctToEnd(s);assert.ok(stats(s).decisions>=17&&stats(s).decisions<=18);
   assert.deepEqual(restoreCampaign(serializeCampaign(s)),s,'saved path reconstructs outcomes');
  }
 }
});
test('recovery and captain decisions carry consequences into later chapters',()=>{
 const recovered=pathTo('watch-recovery');answer(recovered,'cancel-return');continueCampaign(recovered);
 assert.equal(recovered.flags.recovered,true);correctToEnd(recovered);assert.equal(recovered.history.length,18);
 const escalated=pathTo('watch-recovery');answer(escalated,'confirm-return');continueCampaign(escalated);correctToEnd(escalated);
 assert.equal(escalated.flags.masterCalled,true);assert.ok(campaignScene(escalated).paragraphs.join(' ').includes('исправляли'));
 const solo=correctToEnd(createCampaign(7));assert.equal(solo.flags.masterCalled,undefined);
 assert.notEqual(campaignScene(solo).paragraphs[0],campaignScene(escalated).paragraphs[0]);
});
test('hints, pending feedback and optional conversations survive reload without advancing',()=>{
 const s=createCampaign(99);assert.ok(useReference(s));assert.equal(useReference(s),false);
 assert.ok(talk(s,'askedCargo'));assert.equal(talk(s,'askedCargo'),false);assert.equal(talk(s,'askedIlya'),false);
 assert.ok(answer(s,'lookout'));assert.ok(s.pending.assisted);assert.equal(stats(s).correct,0);assert.equal(stats(s).assisted,1);
 assert.deepEqual(restoreCampaign(serializeCampaign(s)),s);
 assert.equal(s.node,'departure');continueCampaign(s);assert.equal(s.node,'speed');
 correctToEnd(s);assert.match(campaignScene(s).dialogue[1].text,/крепления|Крепления/);
});
test('new voyages shuffle choices reproducibly and preserve exactly one correct option',()=>{
 const orders=new Set();
 for(let seed=1;seed<20;seed++){const s=createCampaign(seed),first=campaignScene(s).choices.map(c=>c.id);orders.add(first.join());assert.deepEqual(campaignScene(s).choices.map(c=>c.id),first);}
 assert.ok(orders.size>=3);assert.equal(campaignScene(createCampaign(3)).choices.filter(c=>c.correct).length,1);
});
test('post-voyage transfer cases target mistakes and do not inflate story results',()=>{
 const s=pathTo('speed');answer(s,'limit');continueCampaign(s);correctToEnd(s);
 const before=stats(s);assert.ok(startReview(s));assert.equal(startReview(s),false);
 assert.equal(reviewCase(s).rule,6);
 while(!s.review.done){const c=reviewCase(s);assert.ok(answerReview(s,c.choices.find(c=>c.correct).id));assert.equal(answerReview(s,'0'),false);assert.ok(nextReview(s));}
 assert.deepEqual(stats(s),before);assert.deepEqual(restoreCampaign(serializeCampaign(s)),s);
 assert.ok(s.review.answers.every(a=>a.correct));
 for(const node of Object.values(NODES).filter(n=>!n.end))assert.ok(REVIEW_CASES.some(c=>c.rule===node.rule),'a transfer case for every practiced rule');
});
test('invalid or tampered saves fail closed; all-correct review has new cases',()=>{
 for(const raw of [null,'bad','{}',JSON.stringify({version:2,seed:1,events:[]}),JSON.stringify({version:1,seed:1,events:[['continue']]}),JSON.stringify({version:1,seed:1,events:[['answer','constructor']]}),JSON.stringify({version:1,seed:1,events:[['toString']]})])assert.equal(restoreCampaign(raw),null);
 const s=correctToEnd(createCampaign(2));startReview(s);assert.deepEqual(s.review.ids,['cross','fog','water']);
 assert.equal(nextReview(s),false);
});
test('scenery differs between ports and islands while whole ship tracks stay on open water',()=>{
 const environments=[...new Set(CHAPTERS.map(c=>c.environment))];
 assert.equal(environments.length,5);
 const shapes=environments.map(e=>JSON.stringify(buildIslandScene(e).objects));
 assert.ok(new Set(shapes).size>=3,'different layouts, not just tint variants');
 for(const [id,enc] of Object.entries(ENCOUNTERS)){
  const chapter=Object.values(NODES).find(n=>n.visual===id)?.chapter??4,shore=buildIslandScene(CHAPTERS[chapter].environment),maxShore=Math.max(...shore.objects.flatMap(f=>f.points.map(p=>p[0])));
  for(const ship of enc.ships){
   if(ship.radar)continue;
   const d=ship.cargo?WATCH_SHIPS.target:WATCH_SHIPS.own,a=ship.heading*Math.PI/180;
   const hull=[[-d.halfBeam,-d.length*.35],[-d.halfBeam*.8,-d.length*.62],[0,-d.length*.79],[d.halfBeam*.8,-d.length*.62],[d.halfBeam,d.length*.42],[d.halfBeam*.7,d.length*.55],[-d.halfBeam*.7,d.length*.55]];
   for(const [x,z] of [...ship.track,[ship.x,ship.z]])for(const [xx,zz] of hull){
    const px=x+xx*Math.cos(a)-zz*Math.sin(a),pz=z+xx*Math.sin(a)+zz*Math.cos(a);
    if(ship.mooring){const pier=shore.objects.filter(f=>f.color==='#ab9671'),maxZ=Math.max(...pier.flatMap(f=>f.points.map(p=>p[2])));assert.ok(pz>maxZ+.05,'moored hull is alongside, not inside the pier');assert.ok(px>-2.2,'moored hull clears the island');}else assert.ok(px>maxShore+.08,id+' clears shore');assert.ok(px>ISLAND_SEA.minX&&px<ISLAND_SEA.maxX&&pz>ISLAND_SEA.minZ&&pz<ISLAND_SEA.maxZ,id+' stays on sea');
   }
  }
 }
});
test('crossing tracks and numerical observations describe the same constant bearing and closure',()=>{
 const [a,b]=ENCOUNTERS.cross.ships,rs=a.track.map((p,i)=>[b.track[i][0]-p[0],p[1]-b.track[i][1]]);
 for(const [dx,north] of rs)assert.ok(Math.abs(dx-north)<1e-9,'045 degrees');
 const ranges=rs.map(([x,y])=>Math.hypot(x,y));
 assert.ok(Math.abs(ranges[0]/ranges[2]-2)<1e-9);
 assert.ok(Math.abs(ranges[1]/ranges[2]-1.5)<1e-9);
});
