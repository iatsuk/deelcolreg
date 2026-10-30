import test from 'node:test';
import assert from 'node:assert/strict';
import { STORIES, QUESTS, createStory, storyScene, storyChoices, act, inspect, result } from '../src/design-stories.js';
import { RULE_TEXT } from '../src/rules-text.js';

const take=(s,ids)=>{for(const id of ids)assert.equal(act(s,id),true,`${s.id}/${s.node}/${id}`);return s;};

test('every dialogue branch terminates, carries rule feedback and has no filler actions',()=>{
 for(const id of Object.keys(STORIES)){
  const queue=[createStory(id)],visited=new Set();let endings=0;
  while(queue.length){
   const s=queue.pop(),scene=storyScene(s);visited.add(s.node);
   assert.ok(s.history.length<8,'conversation must terminate');
   assert.ok(scene.dialogue.length>=2);
   assert.ok(scene.dialogue.every(line=>line.speaker&&line.text));
   const before=JSON.stringify(s);
   for(const invalid of ['journal','talk','unknown'])assert.equal(act(s,invalid),false);
   assert.equal(JSON.stringify(s),before);
   if(scene.end){assert.equal(s.stage,'closing');assert.ok(s.history.length>=2);assert.deepEqual(storyChoices(s),[]);endings++;continue;}
   assert.equal(scene.choices.filter(c=>c.correct).length,1);
   for(const choice of scene.choices){
    const next=structuredClone(s);assert.equal(act(next,choice.id),true);
    const feedback=result(next);
    assert.equal(feedback.correct,choice.correct);assert.ok(feedback.text&&feedback.why&&feedback.clause);
    assert.ok(RULE_TEXT.some(rule=>rule.id===feedback.rule));
    assert.ok(QUESTS[id][next.node]);queue.push(next);
   }
  }
  assert.equal(visited.size,Object.keys(QUESTS[id]).length,`${id}: every scene is reachable`);
  assert.ok(endings>1);
 }
});

test('correct watch decisions continue into new problems instead of journal/talk buttons',()=>{
 const s=take(createStory(),['finish']);
 assert.equal(s.node,'uncertain');assert.equal(s.stage,'playing');
 assert.ok(storyScene(s).dialogue.some(line=>/следующий|следующую|следующий раз|самописец/.test(line.text)));
 take(s,['assume-overtake','accept-duty']);
 assert.equal(s.stage,'closing');assert.equal(storyScene(s).title,'Вахта принята');
 assert.deepEqual(s.history.map(h=>h.clause),['13(d)','13(c)','2(a)']);
});

test('correction, escalation and refused responsibility lead to different handovers',()=>{
 const corrected=take(createStory(),['cross','cancel-return','assume-overtake','accept-duty']);
 const escalated=take(createStory(),['cross','confirm-return','accept-duty']);
 const refused=take(createStory(),['finish','assume-overtake','leave-old-duty']);
 assert.equal(corrected.flags.recovered,true);assert.equal(corrected.history.length,4);
 assert.equal(corrected.flags.masterCalled,undefined);
 assert.equal(escalated.flags.masterCalled,true);
 assert.equal(refused.flags.dutyAccepted,undefined);
 assert.equal(new Set([corrected,escalated,refused].map(s=>storyScene(s).title)).size,3);
});

test('the other roles test changed conditions in a second dialogue decision',()=>{
 const electric=take(createStory('electric'),['water','underway-zero-stw']);
 const pilot=take(createStory('pilot'),['add','two-prolonged']);
 assert.deepEqual(electric.history.map(h=>h.clause),['26(b)(iii)','3(i)']);
 assert.deepEqual(pilot.history.map(h=>h.clause),['35(a), 35(k)','35(b), 35(k)']);
 assert.equal(electric.stage,'closing');assert.equal(pilot.stage,'closing');
});

test('documents do not advance the conversation and transcripts belong to each playthrough',()=>{
 const s=createStory('electric');
 assert.equal(inspect(s,'unknown'),false);assert.equal(inspect(s,'record'),true);inspect(s,'record');
 assert.deepEqual(s.evidence,['record']);assert.equal(s.node,'opening');assert.equal(result(s),null);
 act(s,'water');s.history[0].dialogue[0].text='changed';
 assert.notEqual(storyScene(createStory('electric')).dialogue[0].text,'changed');
 for(const invalid of ['unknown','constructor','toString'])assert.equal(createStory(invalid).id,'watch');
});

test('role conditions keep normative distinctions explicit',()=>{
 assert.match(STORIES.watch.brief,/Оба механических судна на ходу и на виду/);
 assert.match(STORIES.watch.evidence[0].text,/ещё не пройдена/);
 assert.match(STORIES.electric.brief,/занят тралением/);
 assert.match(STORIES.electric.brief,/относительно воды — ноль/);
 assert.match(STORIES.pilot.brief,/исполняет обязанности/);
 assert.match(STORIES.pilot.outcomes.ban.text,/необязательны/);
 assert.match(QUESTS.watch.uncertain.paragraphs[0],/В этой встрече начало обгона известно/);
 assert.match(QUESTS.pilot.stopped.why,/около двух секунд/);
});
