import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createExpedition,eligible,availableAt,startQuest,textChoices,chooseText,continueText,markHelp,finishText,completeQuest,beginTravel,advanceWorld,isAt,saveExpedition,restoreExpedition,createMeeting,commandMeeting,meetingCPA,runMeeting,stepMeeting,recordMeeting,retryMeeting,inspectEvidence,gradeInvestigation,validatePackage,deliverReply} from '../src/expedition-engine.js';
import {isWater,distance} from '../src/world-engine.js';
import {RULE_TEXT} from '../src/rules-text.js';
const indexURL=new URL('../quests/catalog.json',import.meta.url),index=JSON.parse(await readFile(indexURL));
const catalog=await Promise.all(index.packages.map(async p=>JSON.parse(await readFile(new URL(p,indexURL))))),[watch,meeting,lights]=catalog;
function accept(s,wrong=false){startQuest(s,watch);let guard=0;while(!watch.nodes[s.session.node].ending&&guard++<30){if(s.session.pending){continueText(s);continue;}const a=textChoices(s.session,watch);chooseText(s,watch,(a.find(c=>c.correct===!wrong)||a.find(c=>c.id==='aboard')||a[0]).id);}assert.ok(finishText(s,watch));return s;}
function endMeeting(m){runMeeting(m);for(let i=0;i<1500&&m.phase==='running';i++)stepMeeting(m,.05);assert.equal(m.phase,'result');return m;}
function sail(s,destination,style){assert.ok(beginTravel(s,destination,style));for(let i=0;i<5000&&s.travel&&!s.session;i++){advanceWorld(s,.1,catalog,12);assert.ok(isWater(s.world.own,2.9));}return s;}

test('standalone packages resolve their own media, rules and all dialogue destinations',async()=>{
 for(let i=0;i<catalog.length;i++){const q=catalog[i];assert.deepEqual(validatePackage(q),[]);for(const r of q.rules)assert.ok(RULE_TEXT.some(d=>d.id===r));for(const key of ['scene','music'])await access(new URL(q.media[key],new URL(index.packages[i],indexURL)));}
});
test('all text branches have a finite ending and wrong decisions lead to authored consequences',()=>{
 const queue=[createExpedition(5)];startQuest(queue[0],watch);let endings=0;
 while(queue.length){const s=queue.pop(),n=watch.nodes[s.session.node];if(n.ending){assert.ok(finishText(s,watch));endings++;continue;}
  for(const c of textChoices(s.session,watch)){if(c.next==='decline')continue;const next=structuredClone(s);assert.ok(chooseText(next,watch,c.id));if(next.session.pending){assert.ok(next.session.pending.feedback);continueText(next);}queue.push(next);}
 }
 assert.ok(endings>=8);
});
test('handover has materially different outcomes, with responsibility and observation recorded',()=>{
 const careful=accept(createExpedition(1)),late=accept(createExpedition(1),true);
 assert.equal(careful.completed[watch.id].outcome,'careful');assert.equal(late.completed[watch.id].outcome,'late');assert.ok(late.minutes>careful.minutes);assert.ok(careful.trust>late.trust);assert.deepEqual(careful.learning.map(e=>e.rule),[2,5,6]);assert.equal(late.learning.filter(e=>e.correct).length,0);
});
test('reading a rule and reloading pending feedback cannot advance a branch or repeat its effect',()=>{
 const s=createExpedition(8);startQuest(s,watch);chooseText(s,watch,'aboard');markHelp(s,2);chooseText(s,watch,'sign');const r=restoreExpedition(saveExpedition(s),catalog);
 assert.equal(r.session.node,'handover');assert.equal(r.session.pending.correct,false);assert.equal(r.learning.length,1);assert.equal(r.learning[0].help,true);assert.equal(chooseText(r,watch,'check'),false);assert.equal(completeQuest(r,watch,'careful'),false);continueText(r);assert.equal(r.session.node,'missed');
});
test('authored order survives while answer positions vary reproducibly between voyage seeds',()=>{
 const orders=new Set();for(let seed=0;seed<50;seed++){const s=createExpedition(seed);startQuest(s,watch);chooseText(s,watch,'aboard');const a=textChoices(s.session,watch).map(c=>c.id);orders.add(a.join());assert.deepEqual(textChoices(s.session,watch).map(c=>c.id),a);}assert.ok(orders.size>1);
});
test('only eligible place packages appear; completed contracts and rewards are applied once',()=>{
 const s=createExpedition(2);assert.deepEqual(availableAt(s,catalog,'lighthouse'),[]);assert.equal(startQuest(s,lights),false);accept(s);assert.equal(startQuest(s,watch),false);assert.ok(eligible(s,lights));const trust=s.trust;assert.equal(completeQuest(s,watch,'careful'),false);assert.equal(s.trust,trust);assert.equal(s.inventory.filter(i=>i==='power-unit').length,1);
});
test('short route launches one separate encounter at the boundary and freezes world time',()=>{
 const s=accept(createExpedition(0));sail(s,'lighthouse','direct');assert.equal(s.session.id,meeting.id);const before=saveExpedition(s);advanceWorld(s,.1,catalog,12);assert.equal(saveExpedition(s),before);assert.ok(s.travel.route.length);assert.ok(s.world.own.z<=-8);
});
test('outer route skips the optional encounter, remains on water and costs more voyage time',()=>{
 const a=accept(createExpedition(0)),b=structuredClone(a);sail(a,'lighthouse','outer');assert.equal(a.session,null);assert.ok(isAt(a,'lighthouse'));assert.ok(availableAt(a,catalog,'lighthouse').some(q=>q.id===lights.id));
 sail(b,'lighthouse','direct');commandMeeting(b.session.local,b.session.local.initialH+30,b.session.local.initialS);endMeeting(b.session.local);recordMeeting(b);assert.ok(completeQuest(b,meeting));while(b.travel)advanceWorld(b,.1,catalog,12);assert.ok(a.minutes>b.minutes);
});
test('all rotations and both encounter kinds preserve risk and permit a real early starboard manoeuvre',()=>{
 for(let seed=0;seed<24;seed++){const m=createMeeting(seed);assert.ok(meetingCPA(m.own,m.target).distance<.0001);commandMeeting(m,m.initialH+30,m.initialS);endMeeting(m);assert.equal(m.success,true,'seed '+seed+': '+m.reason);assert.ok(m.own.trail.length>10);}
});
test('uncontrolled encounter fails; reducing speed can work at a crossing but does not replace a head-on turn',()=>{
 assert.equal(endMeeting(createMeeting(0)).success,false);
 const crossing=createMeeting(0);commandMeeting(crossing,crossing.initialH,0);assert.equal(endMeeting(crossing).success,true);
 const headon=createMeeting(4);commandMeeting(headon,headon.initialH,0);assert.equal(endMeeting(headon).success,false);
});
test('exploring a proposed course has no consequences until the manoeuvre is executed',()=>{
 const m=createMeeting(4);commandMeeting(m,m.initialH-30,m.initialS);commandMeeting(m,m.initialH+30,m.initialS);assert.equal(m.firstAction,null);assert.equal(m.time,0);endMeeting(m);assert.equal(m.success,true);
});
test('a crossing with adequate distance still rejects avoidable crossing ahead of the other vessel',()=>{
 const m=createMeeting(0);commandMeeting(m,m.initialH-45,m.initialS);endMeeting(m);assert.equal(m.crossingAhead,true);assert.equal(m.success,false);assert.match(m.reason,/носу/);
});
test('travel acceleration changes waiting time without changing the route cost or destination',()=>{
 const slow=accept(createExpedition(2)),fast=structuredClone(slow);beginTravel(slow,'lighthouse','outer');beginTravel(fast,'lighthouse','outer');let count=0;while(slow.travel){advanceWorld(slow,.05,catalog,1);count++;}let fastCount=0;while(fast.travel){advanceWorld(fast,.1,catalog,12);fastCount++;}assert.ok(count>fastCount*10);assert.ok(distance(slow.world.own,fast.world.own)<.001);assert.ok(Math.abs(slow.minutes-fast.minutes)<.001);
});
test('a newly catalogued text package can run and grant its own ending without map code changes',()=>{
 const q={id:'guest',version:1,mode:'text',trigger:{type:'place',place:'port'},media:{scene:'./guest.svg',music:'./guest.wav'},entry:'hello',nodes:{hello:{choices:[{id:'yes',text:'Принять',next:'done',set:{agreed:true}}]},done:{ending:{outcome:'accepted',label:'Выйти',summary:'Договорились.'}}},outcomes:{accepted:{credits:5,addItems:['guest-letter']}}};
 assert.deepEqual(validatePackage(q),[]);const s=createExpedition(0);assert.ok(availableAt(s,[...catalog,q],'port').some(p=>p.id==='guest'));startQuest(s,q);chooseText(s,q,'yes');assert.ok(finishText(s,q));assert.equal(s.credits,5);assert.ok(s.inventory.includes('guest-letter'));assert.equal(s.completed.guest.vars.agreed,true);
});
test('encounter state resumes exactly mid-manoeuvre, including inertia, track and remaining route',()=>{
 const s=accept(createExpedition(0));sail(s,'lighthouse','direct');const m=s.session.local;commandMeeting(m,30,m.initialS);runMeeting(m);for(let i=0;i<170;i++)stepMeeting(m,.05);
 const r=restoreExpedition(saveExpedition(s),catalog);assert.ok(r);assert.deepEqual(r.session.local,m);while(m.phase==='running')stepMeeting(m,.05);while(r.session.local.phase==='running')stepMeeting(r.session.local,.05);assert.deepEqual(r.session.local,m);
});
test('failed attempts stay in the learning journal after retry; completing does not double grant',()=>{
 const s=accept(createExpedition(0));sail(s,'lighthouse','direct');endMeeting(s.session.local);assert.ok(recordMeeting(s));assert.equal(recordMeeting(s),false);assert.equal(completeQuest(s,meeting),false);assert.ok(retryMeeting(s));commandMeeting(s.session.local,30,s.session.local.initialS);endMeeting(s.session.local);recordMeeting(s);assert.ok(completeQuest(s,meeting));assert.equal(s.completed[meeting.id].attempts.length,2);assert.equal(s.learning.at(-2).correct,false);assert.equal(s.learning.at(-1).correct,true);assert.equal(completeQuest(s,meeting),false);
});
test('a retreat is an explicit alternative outcome and supplies a navigable continuation',()=>{
 const s=accept(createExpedition(0));sail(s,'lighthouse','direct');endMeeting(s.session.local);recordMeeting(s);assert.ok(completeQuest(s,meeting,'retreated'));assert.equal(s.travel.style,'outer');while(s.travel)advanceWorld(s,.1,catalog,12);assert.ok(isAt(s,'lighthouse'));assert.equal(s.completed[meeting.id].outcome,'retreated');
});
test('the evidence board requires observation, distinguishes status from lights, and restores its work',()=>{
 const s=accept(createExpedition(0));sail(s,'lighthouse','outer');startQuest(s,lights);gradeInvestigation(s,lights);assert.equal(s.session.local.feedback.correct,null);assert.equal(s.learning.length,3);
 for(const e of lights.puzzle.evidence)inspectEvidence(s,lights,e.id);s.session.local.status='trawl';gradeInvestigation(s,lights);assert.equal(s.session.local.feedback.correct,false);s.session.local.status='motor';gradeInvestigation(s,lights);assert.equal(s.session.local.feedback.correct,false);
 const r=restoreExpedition(saveExpedition(s),catalog);assert.deepEqual(r.session.local,s.session.local);r.session.local.lights=structuredClone(lights.puzzle.solution);gradeInvestigation(r,lights);assert.equal(r.session.local.feedback.correct,true);assert.ok(completeQuest(r,lights));assert.equal(r.world.beacon,true);assert.equal(r.credits,120);assert.ok(r.inventory.includes('oleg-reply'));assert.ok(!r.inventory.includes('power-unit'));assert.equal(completeQuest(r,lights),false);assert.equal(r.credits,120);
});
test('a whole alternative-route voyage closes with a letter delivered only at its destination',()=>{
 const s=accept(createExpedition(7));sail(s,'lighthouse','outer');startQuest(s,lights);for(const e of lights.puzzle.evidence)inspectEvidence(s,lights,e.id);s.session.local.status='motor';s.session.local.lights=structuredClone(lights.puzzle.solution);gradeInvestigation(s,lights);completeQuest(s,lights);assert.equal(deliverReply(s),false);sail(s,'port','direct');assert.ok(deliverReply(s));assert.equal(deliverReply(s),false);assert.ok(s.flags.homecoming);assert.equal(s.inventory.length,0);
});
test('corrupt or incompatible saves fail safely; valid planning saves retain a finite minimum distance',()=>{
 assert.equal(restoreExpedition('not json',catalog),null);const s=createExpedition(0);assert.ok(restoreExpedition(saveExpedition(s),catalog));s.world.own.x=NaN;assert.equal(restoreExpedition(saveExpedition(s),catalog),null);
 const r=accept(createExpedition(0));sail(r,'lighthouse','direct');assert.ok(restoreExpedition(saveExpedition(r),catalog));r.session.version=99;assert.equal(restoreExpedition(saveExpedition(r),catalog),null);
});
