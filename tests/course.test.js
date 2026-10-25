import test from 'node:test';
import assert from 'node:assert/strict';
import { RULE_TEXT, ANNEX_TEXT } from '../src/rules-text.js';
import { COURSE_CARDS, COURSE_MODULES, cardsForModule, loadCourseProgress, recordCourseAnswer, COURSE_STORAGE_KEY } from '../src/course.js';
import { CourseGame } from '../src/course-game.js';

test('the local library contains all 41 rules and four annexes without active or external content',()=>{
  assert.deepEqual(RULE_TEXT.map(r=>r.id),Array.from({length:41},(_,i)=>i+1));
  assert.equal(ANNEX_TEXT.length,4);
  assert.match(ANNEX_TEXT[0].title,/Расположение/);
  assert.match(ANNEX_TEXT[3].title,/бедствия/);
  for(const rule of [...RULE_TEXT,...ANNEX_TEXT]){
    assert.ok(rule.title && rule.text.length>60 && rule.html.length>60);
    assert.doesNotMatch(rule.html,/<(?:script|iframe|img|style)|\bon\w+=|href=["']https?:|rulecomm/);
  }
  assert.match(ANNEX_TEXT[0].html,/a \+ 17ψ/);
  assert.match(ANNEX_TEXT[0].html,/<table/);
  assert.doesNotMatch(RULE_TEXT[15].text,/Последовательность небольших/,'authored source commentary must not be mixed into rule 16');
});

test('every rule and annex has a question; modules have no orphan or ambiguous answers',()=>{
  const rules=new Set([...RULE_TEXT,...ANNEX_TEXT].map(r=>r.id));
  assert.equal(new Set(COURSE_CARDS.map(q=>q.id)).size,COURSE_CARDS.length);
  for(const id of rules)assert.ok(COURSE_CARDS.some(q=>q.rule===id),`missing question for ${id}`);
  for(const q of COURSE_CARDS){
    assert.ok(rules.has(q.rule));assert.equal(q.options.length,3);
    assert.equal(new Set(q.options.map(a=>a.text)).size,3);
    assert.equal(q.options.filter(a=>a.id==='correct').length,1);
    assert.equal(q.options.find(a=>a.id==='correct').text,q.answer);
    assert.equal(COURSE_MODULES.filter(m=>m.rules.includes(q.rule)).length,1);
    if(q.sound)assert.match(q.sound,/^[.-]+$/);
  }
  for(const module of COURSE_MODULES)assert.ok(cardsForModule(module.id).length>=2);
});

test('verified international amendments and interval limits survive source imports',()=>{
  assert.match(RULE_TEXT.find(r=>r.id===31).text,/экраноплан/);
  assert.match(RULE_TEXT.find(r=>r.id===33).text,/20 м и более — колоколом/);
  assert.doesNotMatch(RULE_TEXT.find(r=>r.id===35).text,/другой эффективный звуковой сигнал через промежутки не менее/);
  assert.match(ANNEX_TEXT[0].text,/был не менее 27°/);
  assert.doesNotMatch(ANNEX_TEXT[2].text,/200 мм для судов длиной 12/);
  assert.match(ANNEX_TEXT[3].text,/SOS/);
  assert.doesNotMatch(ANNEX_TEXT[3].text,/Yes|Charly|EPIRB \(/);
});

test('course mastery persists, clears on a mistake, and rejects corrupted storage',()=>{
  let progress={};const id=COURSE_CARDS[0].id;
  for(let i=0;i<3;i++)progress=recordCourseAnswer(progress,id,true);
  assert.equal(progress[id].streak,3);
  const storage={getItem:()=>JSON.stringify(progress)};
  assert.deepEqual(loadCourseProgress(storage),progress);
  progress=recordCourseAnswer(progress,id,false);assert.equal(progress[id].streak,0);
  assert.deepEqual(loadCourseProgress({getItem:()=>'{bad'}),{});
  assert.deepEqual(loadCourseProgress({getItem:()=>JSON.stringify({[id]:{seen:1,correct:7,streak:4}})}),{});
});

test('a full course session ends after ten answers and writes its progress',()=>{
  const oldCancel=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
  try{
    const saved=new Map(),storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
    const game=new CourseGame(storage,()=>{},()=>{});game.start('mixed','practice');
    for(let i=0;i<10;i++){assert.equal(game.state.phase,'question');game.submit('correct');game.next();}
    assert.equal(game.state.phase,'results');assert.equal(game.state.score,1000);
    assert.equal(game.state.answers.length,10);assert.ok(saved.has(COURSE_STORAGE_KEY));
    assert.ok(Object.keys(loadCourseProgress(storage)).length>=8);
  }finally{globalThis.cancelAnimationFrame=oldCancel;}
});

test('pause blocks answers; three mistakes end a timed session; practice continues',()=>{
  const oldCancel=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
  try{
    const storage={getItem:()=>null,setItem:()=>{throw Error('blocked');}};
    const game=new CourseGame(storage,()=>{},()=>{});game.start('fog');
    game.pause();game.submit('correct');assert.equal(game.state.answers.length,0);game.pause();
    for(let i=0;i<3;i++){game.submit('wrong-0');game.next();}
    assert.equal(game.state.phase,'results');assert.equal(game.state.lives,0);assert.equal(game.storageOK,false);
    game.start('fog','practice');for(let i=0;i<4;i++){game.submit('wrong-0');game.next();}
    assert.equal(game.state.phase,'question');assert.equal(game.state.lives,3);
  }finally{globalThis.cancelAnimationFrame=oldCancel;}
});
