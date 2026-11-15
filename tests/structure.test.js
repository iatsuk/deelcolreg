import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {dirname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

// The boundaries that keep a new region a content change. Every limit here is a ceiling: lower it, never raise it.
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(join(ROOT,path),'utf8');
const list=dir=>readdirSync(join(ROOT,dir)).filter(f=>f.endsWith('.js')).map(f=>`${dir}/${f}`);
const imports=path=>[...read(path).matchAll(/from\s+'(\.[^']+)'/g)].map(m=>normalize(join(dirname(path),m[1])));

const SOURCES=list('src'),LAB=list('tools/questlab');
const RUNTIME=['src/quest-vm.js','src/quest-assemble.js','src/freight-world.js','src/freight-sea.js','src/freight-audio.js','src/freight-practice.js'];
// Only freight.js may see everything: it wires the parts, and the parts do not know each other.
const DEPENDS={
 ...Object.fromEntries(RUNTIME.map(f=>[f,[]])),
 'src/freight-chart.js':['src/freight-world.js'],
 'src/freight-port.js':['src/freight-world.js'],
 'src/freight-about.js':[],
 'src/freight-book.js':['src/rules-text.js'],
 'src/freight-signals.js':[],
 'src/freight-figures.js':['src/freight-sea.js','src/freight-signals.js'],
 'src/freight.js':[...RUNTIME,'src/freight-chart.js','src/freight-port.js','src/freight-about.js','src/freight-book.js','src/freight-figures.js',
  'src/freight-signals.js'],
};
const PURE=['src/quest-vm.js','src/quest-assemble.js','src/freight-world.js','src/freight-practice.js','src/freight-port.js','src/freight-book.js','src/freight-figures.js',
 'src/freight-signals.js'];
const MAX_BYTES=20480,MAX_LINE=200;
const LONG_LINES={'src/freight.js':10,'src/freight-sea.js':11,'src/freight-chart.js':5,'src/freight-practice.js':5,'src/freight-world.js':1,'src/quest-vm.js':2,'tools/questlab/cli.js':7,'tools/questlab/solve.js':1};

test('imports never form a cycle',()=>{
 const done=new Set(),walk=(file,path)=>{
  assert.ok(!path.includes(file),`цикл: ${[...path,file].join(' -> ')}`);
  if(done.has(file))return;
  for(const next of imports(file))walk(next,[...path,file]);
  done.add(file);
 };
 for(const file of [...SOURCES,...LAB])walk(file,[]);
});
// The rule text is data: 290 KB of normative text, outside the ceilings, importing nothing.
const DATA=['src/rules-text.js'];
test('every game module is declared and imports only what it may',()=>{
 for(const file of SOURCES.filter(f=>!DATA.includes(f))){
  assert.ok(DEPENDS[file],`новый модуль ${file} нужно вписать в DEPENDS`);
  for(const dep of imports(file))assert.ok(DEPENDS[file].includes(dep),`${file} не может импортировать ${dep}`);
 }
 for(const file of DATA)assert.deepEqual(imports(file),[],file);
});
test('the game never imports the tools or tests',()=>{
 for(const file of SOURCES)for(const dep of imports(file))assert.ok(!dep.startsWith('tools/')&&!dep.startsWith('tests/'),`${file} импортирует ${dep}`);
});
test('rules, money and quests run without a browser',()=>{
 for(const file of PURE)assert.doesNotMatch(read(file),/\b(document|window|localStorage|navigator|addEventListener|fetch)\b/,file);
});
test('no game or lab module outgrows its ceilings',()=>{
 for(const file of [...Object.keys(DEPENDS),...LAB]){
  assert.ok(statSync(join(ROOT,file)).size<=MAX_BYTES,`${file} больше ${MAX_BYTES} байт: разделите модуль`);
  const long=read(file).split('\n').filter(l=>l.length>MAX_LINE).length;
  assert.ok(long<=(LONG_LINES[file]||0),`${file}: строк длиннее ${MAX_LINE} символов теперь ${long}`);
 }
});
