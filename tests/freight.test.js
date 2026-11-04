import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadQuest,begin,take,choices,screen,outcomes,starts,mastWrite,mastConfigs,compileExpr} from '../src/quest-vm.js';
import {compileQuest} from '../tools/questlab/compile.js';
import {compile,makeBundle} from '../tools/questlab/files.js';
import {analyse} from '../tools/questlab/solve.js';
import {lint} from '../tools/questlab/lint.js';
import {fromLegacy} from '../tools/questlab/legacy.js';
import {visibleLights} from '../src/freight-sea.js';
import {practiceRound,practiceCheck} from '../src/freight-practice.js';
import {buildErrand,splice} from '../src/quest-assemble.js';
import {PORTS,EDGES,UPGRADES,DEATH_NEWS,LOST_SHIP,edgeBetween,neighbours,newWorld,newStore,dealOffers,pickEncounters,settle,forSale,buy,enterWorld,leaveWorld,hearNews,payDebts} from '../src/freight-world.js';
import {renderChart} from '../src/freight-chart.js';
import {CREW,hire,hirable,mate,haggle} from '../src/freight-world.js';
import {portPanel} from '../src/freight-port.js';

const build=src=>{const raw=compile(src),q=loadQuest(raw);q.raw=raw;return q;};
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
test('the compiled quests in the repository match their sources',async()=>{
 for(const name of ['plombir','varvara']){
  const read=ext=>readFile(new URL(`../quests/freight/${name}.${ext}`,import.meta.url),'utf8');
  assert.deepEqual(JSON.parse(await read('json')),JSON.parse(JSON.stringify(compile(await read('quest')))));
 }
 const bundle=JSON.parse(await readFile(new URL('../quests/freight/errands.json',import.meta.url),'utf8'));
 assert.deepEqual(bundle,JSON.parse(JSON.stringify(makeBundle())));
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
 assert.equal(s.loc,'cross.cross__');
 s=go(q,s,/Держать курс/);s=go(q,s,/Дальше/);
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
 assert.equal(s.loc,'tanker.pilotcall','белый над красным в проливе делает вас лоцманом');
});
test('the stand-on duty depends on what the mast claims',()=>{
 const q=plombir();
 const at=(slots,top,side)=>{const s=begin(q,()=>.5),n={...s,loc:'cross.cross__',v:s.v.slice()};n.v[q.index.side]=side;return set(q,n,slots,top,1);};
 assert.equal(go(q,at([2,1],0,1),/Держать курс/).loc,'cross.cross-held');
 assert.equal(go(q,at([],1,1),/Держать курс/).loc,'cross.cross-near');
 assert.equal(go(q,at([],1,2),/Держать курс/).loc,'cross.cross-held');
 assert.equal(go(q,at([],1,1),/вправо/).loc,'cross.cross-gave');
 assert.equal(go(q,at([2,1],0,1),/вправо/).loc,'cross.cross-flinch');
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

const bundle=makeBundle();
const permutations=(list,n)=>n?list.flatMap(x=>permutations(list.filter(y=>y!==x),n-1).map(rest=>[x,...rest])):[[]];
const errandOffers=()=>Object.values(bundle.errands).flatMap(e=>e.routes.flatMap(([from,to])=>permutations(edgeBetween(from,to).deck,edgeBetween(from,to).legs).map(picks=>({errand:e.id,from,to,picks,fromName:PORTS[from].name,toName:PORTS[to].to}))));
const errandQuest=o=>{const raw=buildErrand(bundle,o),q=loadQuest(raw);q.raw=raw;return q;};

test('a fragment keeps its text and returns to the host through exit',()=>{
 const host={params:[],defs:{},locations:{back:{}}};
 const f=compileQuest(`encounter x\nparam side "б" 0..1 =0 hidden\n== main\nТекст.\n* Вперёд\n  -> inner\n== inner\n> -> exit\n`);
 splice(host,f,'a','back');
 assert.equal(host.locations.a.choices[0].to[0].id,'a.inner');
 assert.equal(host.locations['a.inner'].auto[0].to[0].id,'back');
 assert.equal(host.params[0].id,'side');
});
test('every errand route is a real passage and every encounter it needs exists',()=>{
 for(const e of Object.values(bundle.errands))for(const [from,to] of e.routes){assert.ok(PORTS[from]&&PORTS[to],e.id);assert.ok(edgeBetween(from,to),`${e.id}: ${from}-${to}`);}
 for(const edge of EDGES){assert.ok(edge.deck.length>=edge.legs,edge.name);for(const name of edge.deck)assert.ok(bundle.deck[name],name);}
 for(const port of Object.keys(PORTS))assert.ok(Object.values(bundle.errands).some(e=>e.routes.some(r=>r[0]===port)),`из ${PORTS[port].name} нет поручений`);
});
test('all sixty deals assemble, and random play always reaches an ending',()=>{
 const offers=errandOffers();
 assert.equal(offers.length,60);
 for(const o of offers){
  const q=errandQuest(o),rand=seeded(o.picks.join().length+o.errand.length);
  assert.ok(!JSON.stringify(q.raw).includes('{{'),o.errand);
  for(let run=0;run<4;run++){
   let s=begin(q,rand),steps=0;
   while(!s.end&&steps++<120){
    const L=q.loc[s.loc];
    if(L.mast){const list=mastConfigs(q,L.mast,s.v);s=mastWrite(q,L.mast,s,list[Math.floor(rand()*list.length)]);}
    const list=choices(q,s).filter(c=>c.enabled);
    s=take(q,s,list[Math.floor(rand()*list.length)].id,rand);
   }
   assert.ok(s.end,`${o.errand} ${o.picks} застряло в ${s.loc}`);
  }
 }
});
test('one deal per route is winnable and punishes guessing',()=>{
 for(const e of Object.values(bundle.errands))for(const [from,to] of e.routes){
  const a=analyse(errandQuest({errand:e.id,from,to,picks:edgeBetween(from,to).deck.slice(0,edgeBetween(from,to).legs),toName:PORTS[to].to}));
  assert.ok(a.optimal>=.8,`${e.id}: лучшая игра ${a.optimal}`);
  assert.ok(a.random<=.3,`${e.id}: наугад ${a.random}`);
  assert.deepEqual(a.deadEnds,[]);
 }
});
test('a delivered errand pays exactly what the board promised',()=>{
 const o={errand:'piano',from:'old',to:'fish',picks:['yacht','cross'],toName:PORTS.fish.to};
 const q=errandQuest(o),rand=()=>.5;
 let s=go(q,begin(q,rand),/Взять рояль/);
 assert.equal(s.loc,'helm');
 assert.match(screen(q,s).paragraphs.join(' '),/Участок 1 из 2/);
 s=go(q,s,/Средним/);s=go(q,s,/Дальше/);
 assert.equal(s.loc,'s1');
 s=go(q,s,/Обойти его/);s=go(q,s,/закрепить/);
 assert.equal(s.loc,'helm');
 s=go(q,s,/Средним/);s=go(q,s,/Дальше/);
 assert.equal(s.loc,'s2.cross__');
 s=go(q,s,screen(q,s).paragraphs[0].startsWith('Справа')?/вправо/:/Держать курс/);s=go(q,s,/Дальше/);
 assert.equal(s.loc,'win');assert.equal(s.end,'win');
 assert.equal(s.v[q.index.money],120+bundle.errands.piano.pay);
});
test('the same encounter reads differently under different cargo',()=>{
 const tanker=bundle.deck.tanker.locations.collision.text.map(p=>p.when||'').join();
 assert.match(tanker,/ice==1/);assert.match(tanker,/ice==0/);
});
test('ports deal offers along real passages, one encounter per leg',()=>{
 const rand=seeded(3);
 for(const port of Object.keys(PORTS)){
  const offers=dealOffers(port,bundle,{},rand);
  assert.ok(offers.length>=1,port);
  for(const o of offers){
   assert.equal(o.from,port);
   const edge=edgeBetween(o.from,o.to);
   assert.equal(o.picks.length,edge.legs);assert.equal(new Set(o.picks).size,o.picks.length);
   for(const p of o.picks)assert.ok(edge.deck.includes(p));
  }
 }
});
test('rules the player tripped on are dealt into errands more often',()=>{
 const edge=edgeBetween('old','far'),rand=seeded(11);let hit=0,base=0;
 const small={...edge,legs:1};
 for(let i=0;i<600;i++){if(pickEncounters(small,bundle.deck,{24:['x']},rand)[0]==='tow')hit++;if(pickEncounters(small,bundle.deck,{},rand)[0]==='tow')base++;}
 assert.ok(hit>base*1.5,`${hit} против ${base}`);
});
test('the world moves with the boat and a wreck goes home',()=>{
 const w=newWorld();w.offers.fish=[{}];
 settle(w,{to:'fish'},'win',300);
 assert.equal(w.port,'fish');assert.equal(w.money,300);assert.equal(w.trips,1);assert.equal(w.offers.fish,undefined);
 settle(w,{to:'far'},'death',150);
 assert.equal(w.port,'old');assert.equal(w.money,150-LOST_SHIP);
 settle(w,{to:'far'},'death',10);
 assert.equal(w.money,0);
 assert.ok(DEATH_NEWS.includes(String(LOST_SHIP)));
 assert.deepEqual(neighbours('light').map(n=>n.to).sort(),['far','fish']);
});
test('the chart draws every port and marks only reachable ones',()=>{
 const svg=renderChart('old');
 for(const p of Object.values(PORTS))assert.ok(svg.includes(p.name),p.name);
 assert.ok(svg.includes('data-to="fish"'));assert.ok(svg.includes('data-to="far"'));assert.ok(!svg.includes('data-to="light"'));
});

const world=(vars={},money=120)=>({...newWorld(),vars,money});
const playErrand=(q,w,rand=()=>.5)=>{enterWorld(q,w);return begin(q,rand);};

test('fittings are sold in one port, cost money and cannot be bought twice',()=>{
 const w=world();
 assert.deepEqual(forSale(w,'light').map(u=>u.id),['radar']);
 assert.equal(buy(w,'radar'),false,'радар продают на маяке');
 w.port='light';
 assert.equal(buy(w,'radar'),false,'денег мало');
 w.money=400;
 assert.equal(buy(w,'radar'),true);assert.equal(w.money,100);assert.equal(w.vars.radar,1);
 assert.equal(buy(w,'radar'),false);assert.deepEqual(forSale(w,'light'),[]);
 for(const [id,u] of Object.entries(UPGRADES)){assert.ok(PORTS[u.port],id);assert.ok(plombir().params.some(p=>p.id===id&&p.world),`${id} не параметр мира`);}
});
test('the purse and the world enter a quest and what the voyage changed comes back',()=>{
 const q=plombir(),w=world({gasket:1,lg:1},300);
 let s=playErrand(q,w);
 assert.equal(s.v[q.index.money],300);assert.equal(s.v[q.index.gasket],1);
 s=go(q,s,/Осмотреться/);s=go(q,s,/Лавка/);
 const shop=choices(q,s).map(c=>c.text).join();
 assert.ok(!/Прокладка/.test(shop)&&!/Зелёный/.test(shop),'купленное второй раз не продаётся');
 s=go(q,s,/Таблица/);
 const after=world();leaveWorld(q,s,after);
 assert.equal(after.vars.table,1);assert.equal(after.vars.gasket,1);assert.equal(after.vars.zaz,0);
});
test('fittings change the numbers of a voyage',()=>{
 const o={errand:'piano',from:'old',to:'fish',picks:['yacht','cross'],toName:PORTS.fish.to};
 const leg=vars=>{const q=errandQuest(o);let s=go(q,playErrand(q,world(vars)),/Взять/);s=go(q,s,/Средним/);return {t:s.v[q.index.t],pl:s.v[q.index.pl]};};
 const base=leg({}),fitted=leg({gasket:1,screw:1});
 assert.equal(base.pl-fitted.pl,-5);assert.equal(base.t-fitted.t,10);
});
test('radar tells what the next leg holds, and only with radar',()=>{
 const o={errand:'piano',from:'old',to:'fish',picks:['yacht','cross'],toName:PORTS.fish.to};
 const helm=vars=>{const q=errandQuest(o);return screen(q,go(q,playErrand(q,world(vars)),/Взять/)).paragraphs.join(' ');};
 assert.ok(!helm({}).includes('На радаре'));
 assert.ok(helm({radar:1}).includes(bundle.deck.yacht.radar));
 for(const [name,f] of Object.entries(bundle.deck))assert.ok(f.radar,name);
 const raw=compile(source);
 assert.ok(!JSON.stringify(raw).includes('{{radar'));
});
test('the inspector remembers: a debt forgives once, a grudge starts you under watch',()=>{
 const o={errand:'piano',from:'old',to:'fish',picks:['yacht','cross'],toName:PORTS.fish.to};
 const q=errandQuest(o),s0=go(q,playErrand(q,world({zaz:-1})),/Взять/);
 assert.equal(s0.v[q.index.sus],20);
 const owed=errandQuest(o);let s=go(owed,playErrand(owed,world({zaz:1})),/Взять/);
 s={...s,v:s.v.slice()};s.v[owed.index.sus]=90;s=mastWrite(owed,'lights',s,{slots:[],top:0,nav:0});
 s=go(owed,s,/Средним/);
 assert.equal(s.loc,'pardon');assert.equal(s.v[owed.index.zaz],0);assert.equal(s.v[owed.index.sus],70);
 const none=errandQuest(o);let n=go(none,playErrand(none,world({})),/Взять/);
 n={...n,v:n.v.slice()};n.v[none.index.sus]=90;n=mastWrite(none,'lights',n,{slots:[],top:0,nav:0});
 n=go(none,n,/Средним/);
 assert.equal(n.loc,'caught');assert.equal(n.v[none.index.zaz],-1);
});
test('a pleased Marfa keeps a slip out of the log',()=>{
 const pass=vars=>{const q=plombir();let s=go(q,playErrand(q,world(vars)),/Осмотреться/);s=go(q,s,/швартовы/);s=mastWrite(q,'lights',s,{slots:[],top:0,nav:0});s=go(q,s,/Пройти мимо/);return {q,s,view:screen(q,s).paragraphs.join(' ')};};
 const strict=pass({}),kind=pass({marfa:1});
 assert.match(strict.view,/В журнал пишу/);assert.match(kind.view,/В журнал не пишу/);
 const on=x=>go(x.q,x.s,/Выйти в море/).v[x.q.index.sus];
 assert.equal(on(strict),15);assert.equal(on(kind),0);
});
test('a watchkeeper is hired in their own port, sends the last one home and haggles',()=>{
 const w=world({},100);
 assert.equal(hire(w,'gena'),false,'Геннадия Палыча нанимают в Рыбачьей слободе');
 assert.ok(hire(w,'gosha'));assert.equal(w.money,70);assert.equal(mate(w).name,'Гоша');
 assert.equal(hire(w,'gosha'),false,'одного и того же второй раз не нанимают');
 assert.deepEqual(hirable(w,'old'),[]);assert.equal(haggle(w,160),0);
 w.port='light';assert.ok(hire(w,'zina'));assert.equal(w.vars.crew,CREW.zina.n);assert.equal(w.money,30);
 assert.equal(haggle(w,160),32);assert.deepEqual(hirable(w,'old').map(c=>c.id),['gosha']);
 w.port='fish';assert.equal(hire(w,'gena'),false,'денег мало');
 for(const [id,c] of Object.entries(CREW))assert.ok(PORTS[c.port],id);
 assert.ok(plombir().params.some(p=>p.id==='crew'&&p.world));
});
test('every encounter gives each watchkeeper a line, and Venya keeps quiet beside them',()=>{
 for(const [name,f] of Object.entries(bundle.deck)){
  const text=(f.locations[`${f.start}__`]||f.locations[f.start]).text;
  for(const c of Object.values(CREW))assert.ok(text.some(p=>new RegExp(`crew==${c.n}\\b`).test(p.when||'')),`${name}: нет реплики для «${c.name}»`);
  for(const p of text.filter(p=>/Веня/.test(p.text)))assert.match(p.when||'',/crew==0/,`${name}: Веня говорит при вахтенном`);
 }
});
test('the port offers its watchkeeper, shows who stands the watch and the haggled pay',()=>{
 const store=newStore(),w=store.world;
 w.port='light';w.offers.light=[{errand:'piano',from:'old',to:'fish',toName:PORTS.fish.to}];
 assert.match(portPanel(store,bundle,[]),/data-do="hire" data-id="zina"/);
 assert.match(portPanel(store,bundle,[]),new RegExp(`${bundle.errands.piano.pay} монет`));
 w.vars.crew=CREW.zina.n;
 const html=portPanel(store,bundle,[]);
 assert.doesNotMatch(html,/data-id="zina"/);assert.match(html,/на вахте Зинаида Павловна/);
 assert.match(html,new RegExp(`${bundle.errands.piano.pay*6/5} монет`));
});
test('ports remember what happened, newest first, three at most',()=>{
 const w=newWorld();
 for(const t of ['a','b','c','d'])hearNews(w,'old',t);
 hearNews(w,'old',undefined);
 assert.deepEqual(w.news.old,['d','c','b']);
 for(const e of Object.values(bundle.errands))for(const k of ['win','soft','fail','late'])assert.ok(e.news?.[k],`${e.id}: нет новости ${k}`);
 assert.ok(compile(source).news.confess);
});
test('an encounter passed cleanly pays its debt, a repeated mistake does not',()=>{
 const debts={24:['трос'],18:['танкер','ещё'],26:['сеть']};
 payDebts(debts,[24,18],[{rule:'18',text:'снова'}]);
 assert.equal(debts[24],undefined);assert.equal(debts[18].length,2);assert.equal(debts[26].length,1);
});
test('a finished errand rests before it is offered again',()=>{
 const rand=seeded(5),recent=['piano'];
 for(let i=0;i<40;i++){const offers=dealOffers('old',bundle,{},rand,1,recent);assert.ok(!offers.some(o=>o.errand==='piano'),'рояль только что возили');}
 const w=newWorld();settle(w,{to:'fish',errand:'piano'},'win',200);settle(w,{to:'far',errand:'crayfish'},'win',200);
 assert.deepEqual(w.recent,['crayfish','piano']);
 assert.ok(dealOffers('old',bundle,{},rand,2,['piano','ruler']).length>0,'лучше повтор, чем пустая доска');
});
test('commas inside calls stay in the expression',()=>{
 const q=build(`quest c\nparam a "a" -1..1 =0 hidden\nparam b "b" 0..1 =0 hidden\n== s\n* x\n  ~ a=min(1,a+1), b=1\n  -> e\n== e win\nКонец.\n`);
 const s=take(q,begin(q),choices(q,begin(q))[0].id);
 assert.equal(s.v[q.index.a],1);assert.equal(s.v[q.index.b],1);
});
test('starting over leaves nothing of the old voyage and shares nothing between saves',()=>{
 const a=newStore(),b=newStore();
 a.world.vars.radar=1;a.world.news.old=['x'];a.debts[24]=['трос'];a.endings['plombir:win']=1;
 assert.deepEqual(b,{endings:{},debts:{},active:null,world:newWorld()});
 const used={...newStore(),debts:{24:['трос']},active:{id:'plombir'}};used.world.money=900;
 Object.assign(used,newStore());
 assert.equal(used.active,null);assert.deepEqual(used.debts,{});assert.equal(used.world.money,120);
});
