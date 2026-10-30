import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadQuest,begin,take,choices,screen,outcomes,starts,mastWrite,mastConfigs,compileExpr} from '../src/quest-vm.js';
import {compileQuest} from '../tools/questlab/compile.js';
import {analyse} from '../tools/questlab/solve.js';
import {lint} from '../tools/questlab/lint.js';
import {fromLegacy} from '../tools/questlab/legacy.js';
import {visibleLights} from '../src/freight-sea.js';
import {practiceRound,practiceCheck} from '../src/freight-practice.js';

const build=src=>{const raw=compileQuest(src),q=loadQuest(raw);q.raw=raw;return q;};
const seeded=n=>{let r=n>>>0;return ()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};
const source=await readFile(new URL('../quests/freight/plombir.quest',import.meta.url),'utf8');
const plombir=()=>build(source);
const go=(q,s,re,rand=()=>.5)=>{const c=choices(q,s).find(c=>c.enabled&&re.test(c.text));assert.ok(c,`нет выбора ${re} в ${s.loc}`);return take(q,s,c.id,rand);};

const TINY=`quest tiny
param gold "Золото" 0..10 =0
param risk "Риск" 0..3 =0 hidden
crit risk>=2 -> dead

== start
Развилка. Золота: {gold}.
* Взять
  once
  ~ gold+=4
  -> start
* Рискнуть
  ~ risk+=1
  -> gamble
* Уйти с пустыми руками
  if gold==0
  -> poor
* Уйти с золотом
  if gold>0
  -> rich

== gamble
> -> start 1 | dead 1

== rich win
Богаты.

== poor fail
Бедны.

== dead death
Конец.
`;

test('expressions never reach eval and reject unknown names',()=>{
 const f=compileExpr('a*2+(b>1?3:0)',n=>({a:v=>v.a,b:v=>v.b})[n]);
 assert.equal(f({a:2,b:2}),7);
 assert.throws(()=>loadQuest(compileQuest('quest x\nparam a "a" 0..1 =0\n== s\n* x\n  if constructor\n  -> s\n')));
 assert.throws(()=>compileExpr('alert(1)',()=>()=>0));
});
test('parameters clamp, once-choices vanish, critical values interrupt',()=>{
 const q=build(TINY);let s=begin(q);
 assert.deepEqual(choices(q,s).map(c=>c.text),['Взять','Рискнуть','Уйти с пустыми руками']);
 s=go(q,s,/Взять/);
 assert.deepEqual(choices(q,s).map(c=>c.text),['Рискнуть','Уйти с золотом']);
 assert.equal(screen(q,s).paragraphs[0],'Развилка. Золота: 4.');
 const end=outcomes(q,s,choices(q,s)[0].id);
 assert.equal(end.reduce((a,o)=>a+o.p,0),1);
});
test('the solver computes exact win rates, finds false choices and dead ends',()=>{
 const q=build(TINY),a=analyse(q);
 assert.equal(a.optimal,1);
 assert.ok(a.random>0&&a.random<1);
 assert.deepEqual(a.unreachable,[]);
 assert.deepEqual(a.deadEnds,[]);
 const f=build(`quest f\nparam a "a" 0..1 =0\n== s\n* Первый\n  -> e\n* Второй\n  -> e\n== e win\nКонец.\n`);
 assert.equal(analyse(f).falseChoice,1);
 const d=build(`quest d\nparam a "a" 0..1 =0\n== s\n* Туда\n  -> stuck\n* Сюда\n  -> e\n== stuck\nНичего.\n== e win\nКонец.\n`);
 assert.deepEqual(analyse(d).deadEnds,['stuck']);
});
test('liveness drops parameters nobody reads again from the state space',()=>{
 const q=build(`quest l\nparam m "m" 0..9 =0 hidden\n== a\n* один\n  ~ m=1\n  -> b\n* два\n  ~ m=2\n  -> b\n== b\n* финал\n  -> e\n* ещё\n  -> c\n== c\n* финал\n  -> e\n* ещё\n  -> e\n== e win\nТекст {m}.\n`);
 assert.equal(analyse(q).states,4);
});
test('rolls are chance nodes the solver can see',()=>{
 const q=build(`quest r\nparam x "x" 0..2 =0 hidden\n== a\n@roll x 1..2\n* Угадать один\n  -> check\n== check\n> x==1 -> w\n> -> l\n== w win\nДа.\n== l fail\nНет.\n`);
 assert.equal(starts(q).length,2);
 assert.equal(analyse(q).optimal,.5);
});
test('old dialogue quests measure as they play: every path wins',async()=>{
 const raw=fromLegacy(JSON.parse(await readFile(new URL('../quests/line/mila-cargo.json',import.meta.url),'utf8')));
 const q=loadQuest(raw);q.raw=raw;
 const a=analyse(q);
 assert.equal(a.optimal,1);assert.equal(a.random,1);assert.equal(a.meaningful,0);
});
test('the linter catches telegraphed answers and quiet-literary tics',()=>{
 const q=compileQuest(`quest s\nparam a "a" 0..1 =0\n== s\nОна делает вид, что занята. Он делает вид, что не видит. Они делают вид. Сделала вид снова.\n* Безопасно и внимательно\n  #good\n  -> e\n* Коротко\n  #trap:x\n  -> e\n== e win\nКонец.\n`);
 const kinds=lint(q).issues.map(i=>i.kind);
 assert.ok(kinds.includes('тик'));assert.ok(kinds.includes('подсказка'));
});
test('the compiled quest in the repository matches its source',async()=>{
 const built=JSON.parse(await readFile(new URL('../quests/freight/plombir.json',import.meta.url),'utf8'));
 assert.deepEqual(built,JSON.parse(JSON.stringify(compileQuest(source))));
});
test('three hundred random voyages all end in an ending',()=>{
 const q=plombir(),ends=new Set();
 for(let seed=1;seed<=300;seed++){
  const rand=seeded(seed);let s=begin(q,rand),steps=0;
  while(!s.end&&steps++<400){
   const L=q.loc[s.loc];
   if(L.mast){const list=mastConfigs(q,L.mast,s.v);s=mastWrite(q,L.mast,s,list[Math.floor(rand()*list.length)]);}
   const list=choices(q,s).filter(c=>c.enabled);
   s=take(q,s,list[Math.floor(rand()*list.length)].id,rand);
  }
  assert.ok(s.end,`партия ${seed} застряла в ${s.loc}`);
  ends.add(s.loc);
 }
 assert.ok(ends.size>=5,[...ends].join());
});
const set=(q,s,slots,top,nav,mode='lights')=>mastWrite(q,mode,s,{slots,top,nav});
function toRock(q,rand=()=>.5){
 let s=go(q,begin(q,rand),/Осмотреться/);
 s=go(q,s,/Лавка/);s=go(q,s,/Зелёный/);s=go(q,s,/Прокладка/);s=go(q,s,/Выйти на причал/);s=go(q,s,/швартовы/);
 s=set(q,s,[],1,1);s=go(q,s,/Пройти мимо/);
 assert.equal(s.loc,'cape-ok');
 s=go(q,s,/Выйти в море/);s=go(q,s,/Средним/);s=go(q,s,/Дальше/);
 assert.equal(s.loc,'rock');
 return s;
}
test('a skipper who reads the lights brings the cargo in solid',()=>{
 const q=plombir();
 let s=go(q,toRock(q),/Внешний рейд/);
 s=set(q,s,[3,1],0,1);s=go(q,s,/Малым/);s=go(q,s,/Дальше/);
 const left=/левее/.test(screen(q,s).paragraphs.join(' '));
 s=go(q,s,left?/справа/:/слева/);
 s=go(q,s,/Средним/);s=go(q,s,/Дальше/);s=go(q,s,/Обойти его/);
 s=go(q,s,/Средним/);s=go(q,s,/Дальше/);s=go(q,s,/Заглушить/);
 s=go(q,s,/Средним/);s=go(q,s,/Дальше/);
 assert.equal(s.loc,'cross__');
 s=go(q,s,/Держать курс/);s=go(q,s,/Идти на рейд/);
 assert.equal(s.loc,'dawn');
 s=set(q,s,[6],0,0,'shapes');s=go(q,s,/Поднять знаки/);
 assert.equal(s.loc,'dawn-ok');
 s=go(q,s,/Идти дальше/);s=go(q,s,/Идти к причалу/);
 assert.equal(s.loc,'end-solid');assert.equal(s.end,'win');assert.deepEqual(s.notes,[]);
});
test('rule mistakes end the voyage the way the rule says',()=>{
 const q=plombir();
 let strait=go(q,toRock(q),/Сквозной/);
 strait=set(q,strait,[1,2],0,1);strait=go(q,strait,/Средним/);strait=go(q,strait,/Дальше/);
 assert.equal(strait.loc,'tow');
 const wire=go(q,strait,/Срезать/);
 assert.equal(wire.end,'death');assert.ok(wire.notes.some(n=>n.rule==='24'));
 let s=go(q,strait,/Обойти низкий/);s=go(q,s,/Средним/);s=go(q,s,/Дальше/);
 assert.equal(s.loc,'tanker');
 const hit=go(q,s,/Держать середину/);
 assert.equal(hit.end,'death');assert.ok(hit.notes.some(n=>n.rule==='18'));
 s=go(q,s,/правой кромке/);
 assert.equal(s.loc,'pilotcall','белый над красным в проливе делает вас лоцманом');
});
test('the stand-on duty depends on what the mast claims',()=>{
 const q=plombir();
 const at=(slots,top,side)=>{const s=begin(q,()=>.5),n={...s,loc:'cross__',v:s.v.slice()};n.v[q.index.side]=side;return set(q,n,slots,top,1);};
 assert.equal(go(q,at([2,1],0,1),/Держать курс/).loc,'cross-held');
 assert.equal(go(q,at([],1,1),/Держать курс/).loc,'cross-near');
 assert.equal(go(q,at([],1,2),/Держать курс/).loc,'cross-held');
 assert.equal(go(q,at([],1,1),/вправо/).loc,'cross-gave');
 assert.equal(go(q,at([2,1],0,1),/вправо/).loc,'cross-flinch');
});
test('lights on screen follow the sectors of Rule 21',()=>{
 assert.equal(visibleLights('patrol',-52),'wr');
 assert.equal(visibleLights('patrol',52),'wg');
 assert.equal(visibleLights('patrol',178),'w');
 assert.equal(visibleLights('patrol',0),'wrg');
 assert.equal(visibleLights('tug',74),'wwwg');
 assert.equal(visibleLights('tug',170),'wy');
 assert.equal(visibleLights('cbd',4),'wwrgrrr');
 assert.equal(visibleLights('cbd',170),'wrrr');
 assert.equal(visibleLights('aground',120),'wwrr');
});
test('practice deals tripped rules more often and grades by the shuffled answer',()=>{
 const rand=seeded(7);let hits=0,base=0;
 for(let i=0;i<300;i++){
  hits+=practiceRound({24:['x']},rand).items.filter(c=>c.rule==='24').length;
  base+=practiceRound({},rand).items.filter(c=>c.rule==='24').length;
 }
 assert.ok(hits>base*1.3,`${hits} против ${base}`);
 const r=practiceRound({},rand);
 for(const item of r.items){assert.equal(item.options[item.answer],item.answer===item.options.indexOf(item.options[item.answer])?item.options[item.answer]:null);assert.ok(practiceCheck(item,item.answer));assert.ok(!practiceCheck(item,(item.answer+1)%item.options.length));}
});
