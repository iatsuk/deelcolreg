import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compile,makeBundle} from '../tools/questlab/files.js';
import {contract,bundleContract,verdict} from '../tools/questlab/contract.js';
import {WORLD_VARS} from '../src/freight-world.js';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const quest=(body,head='')=>compile(`quest t\nparam a "a" 0..1 =0\n${head}\n== s\n${body}\n* Дальше\n  -> e\n== e win\nКонец.\n`);
const flags=(body,head)=>contract(quest(body,head)).join('\n');

test('every quest in the game names only what the game has',async()=>{
 for(const name of ['plombir','varvara'])assert.deepEqual(contract(compile(await read(`quests/freight/${name}.quest`))),[]);
 assert.deepEqual(bundleContract(makeBundle()),[]);
});
test('a quest cannot ask the sea for something it does not draw',()=>{
 assert.equal(flags('@scene sea\n@see patrol brg=10 dist=.4 aspect=0\nТекст.'),'');
 assert.match(flags('@scene fogg\nТекст.'),/нет сцены «fogg»/);
 assert.match(flags('@see nonsense\nТекст.'),/не рисует «nonsense»/);
 assert.match(flags('@see patrol aspct=30\nТекст.'),/нет ключа «aspct»/);
});
test('the world keeps only what it knows about',()=>{
 assert.equal(flags('Текст.','param radar "р" 0..1 =0 hidden world'),'');
 assert.match(flags('Текст.','param radarr "р" 0..1 =0 hidden world'),/мир его не хранит/);
});
test('names that are read only on screen are checked before a player reads them',()=>{
 assert.equal(flags('Значение {a} и время {a|clock}, порт {{to}}.'),'');
 assert.match(flags('Значение {b}.'),/неизвестное имя «b»/);
 assert.match(flags('Значение {a|clok}.'),/неизвестный формат «clok»/);
 assert.match(flags('@see patrol when=b==1\nТекст.'),/неизвестное имя «b»/);
 assert.match(flags('Текст.','doc d "Д" when=b==1\n+ строка'),/документ d: неизвестное имя «b»/);
 assert.match(flags('@mast flags\nТекст.'),/нет мачты «flags»/);
});
test('rule tags and notes point at rules that exist',()=>{
 assert.equal(flags('Текст.\n* Другое\n  #r19\n  note 19 Разбор.\n  -> e'),'');
 assert.match(flags('Текст.\n* Другое\n  #r99\n  -> e'),/нет правила «r99»/);
 assert.match(flags('Текст.\n* Другое\n  note 0 Разбор.\n  -> e'),/нет правила «0»/);
});
test('an errand changes only what its template has',()=>{
 const bundle=()=>JSON.parse(JSON.stringify(makeBundle()));
 const b=bundle();b.errands.piano.set={nope:1};
 assert.match(bundleContract(b).join(),/set меняет неизвестный параметр nope/);
 const c=bundle();c.errands.piano.news={nowhere:'Текст'};
 assert.match(bundleContract(c).join(),/новость к несуществующему финалу nowhere/);
 const d=bundle();d.template.params=d.template.params.filter(p=>p.id!=='radar');
 assert.match(bundleContract(d).join(),/не хранит radar/);
 assert.ok(WORLD_VARS.includes('radar'));
});
test('a known debt passes, a new failure does not, a paid debt must leave the list',()=>{
 assert.deepEqual(verdict(['слов'],{слов:'причина'}),{fresh:[],stale:[]});
 assert.deepEqual(verdict(['слов','r5'],{слов:'причина'}),{fresh:['r5'],stale:[]});
 assert.deepEqual(verdict([],{слов:'причина'}),{fresh:[],stale:['слов']});
 assert.deepEqual(verdict(['constructor']),{fresh:['constructor'],stale:[]});
});
test('every debt belongs to a quest in the catalog and gives a reason',async()=>{
 const gates=JSON.parse(await read('tools/questlab/gates.json')),{quests}=JSON.parse(await read('quests/freight/catalog.json'));
 for(const [id,list] of Object.entries(gates.waivers)){
  assert.ok(quests.includes(`./${id}.json`),id);
  for(const [k,why] of Object.entries(list))assert.ok(why.length>10,k);
 }
});
