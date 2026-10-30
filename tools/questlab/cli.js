#!/usr/bin/env node
// Quest Lab: compile, verify, playtest. Run through tools/questlab/ql (or `npm run ql --`).
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,basename,join} from 'node:path';
import {loadQuest,begin,take,screen,choices,mastConfigs,mastWrite,mastRead,fill} from '../../src/quest-vm.js';
import {RULE_TEXT} from '../../src/rules-text.js';
import {compileQuest} from './compile.js';
import {analyse} from './solve.js';
import {lint} from './lint.js';
import {fromLegacy} from './legacy.js';

const gates=JSON.parse(await readFile(new URL('./gates.json',import.meta.url),'utf8'));
const pct=x=>`${(x*100).toFixed(0).padStart(3)}%`;
const seeded=seed=>{let r=seed>>>0;return ()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};

async function open(path){
 const src=await readFile(path,'utf8');
 const raw=path.endsWith('.json')?fromLegacy(JSON.parse(src)):compileQuest(src);
 const q=loadQuest(raw);q.raw=raw;return q;
}

function report(q,{json=false}={}){
 const raw=q.raw,a=analyse(q),l=lint(raw);
 const locs=Object.values(raw.locations),ends=locs.filter(x=>x.end);
 const jumps=locs.flatMap(x=>x.choices||[]);
 const params=raw.params.length;
 const checks=[
  ['слов',l.stats.words,l.stats.words>=gates.minWords,`≥${gates.minWords}`],
  ['локаций',locs.length,locs.length>=gates.minLocations,`≥${gates.minLocations}`],
  ['параметров',params,params>=gates.minParams,`≥${gates.minParams}`],
  ['финалов',ends.length,ends.length>=gates.minEndings,`≥${gates.minEndings}`],
  ['победа при лучшей игре',pct(a.optimal),a.optimal>=gates.minOptimal,`≥${pct(gates.minOptimal)}`],
  ['победа наугад',pct(a.random),a.random<=gates.maxRandom,`≤${pct(gates.maxRandom)}`],
  ['победа «всегда самый длинный ответ»',pct(a.longest),a.longest<=gates.maxLongest,`≤${pct(gates.maxLongest)}`],
  ['победа «всегда самый короткий ответ»',pct(a.shortest),a.shortest<=gates.maxShortest,`≤${pct(gates.maxShortest)}`],
  ['решений, меняющих шанс на 5+ п.п.',pct(a.meaningful),a.meaningful>=gates.minMeaningful,`≥${pct(gates.minMeaningful)}`],
  ['ложных выборов',pct(a.falseChoice),a.falseChoice<=gates.maxFalseChoice,`≤${pct(gates.maxFalseChoice)}`],
  ['недостижимых локаций',a.unreachable.length,!a.unreachable.length,'0'],
  ['тупиков',a.deadEnds.length,!a.deadEnds.length,'0'],
  ['мёртвых выборов',a.deadChoices.length,!a.deadChoices.length,'0'],
  ['параметров только на запись',a.writeOnly.length,!a.writeOnly.length,'0'],
 ];
 if(json)return {checks,analysis:a,lint:l};
 console.log(`\n${raw.title||raw.id} · ${raw.id}`);
 console.log(`${locs.length} локаций · ${jumps.length} выборов · ${params} параметров · ${a.states} состояний · партия около ${a.optimalRun.medianTurns} решений\n`);
 for(const [name,value,ok,goal] of checks)console.log(`${ok?' ok ':'FAIL'} ${name.padEnd(38)} ${String(value).padStart(6)}   цель ${goal}`);
 if(a.rules.length){console.log('\nЗнание правила: сколько теряет угадывающий в момент решения · шанс на всю партию');for(const r of a.rules){console.log(`${r.cost>=gates.minRuleCost?' ok ':'FAIL'} ${r.tag.padEnd(8)} −${pct(r.cost)}   партия ${pct(r.value)}`);}}
 if(a.traps.length){console.log('\nЛовушки: цена ошибки в момент выбора · шанс игрока с этим заблуждением');for(const r of a.traps){console.log(`${r.cost>=gates.minTrapCost?' ok ':'FAIL'} ${r.tag.padEnd(26)} −${pct(r.cost)}   партия ${pct(r.value)}`);}}
 const list=(title,items)=>{if(items.length)console.log(`\n${title}\n  ${items.slice(0,14).join('\n  ')}`);};
 list('Недостижимо:',a.unreachable);list('Тупики:',a.deadEnds);list('Мёртвые выборы:',a.deadChoices);list('Ложные выборы в:',a.falseAt);list('Только на запись:',a.writeOnly);
 const show=(title,run)=>console.log(`\n${title}: ${Object.entries(run.ends).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`${k} ${pct(v).trim()}`).join(' · ')}`);
 show('Финалы при лучшей игре',a.optimalRun);show('Финалы наугад',a.randomRun);
 console.log(`\nТекст: ${l.stats.words} слов, предложение ${l.stats.avgSentence}±${l.stats.sdSentence}`);
 for(const i of l.issues){console.log(`  [${i.kind}] ${i.why} × ${i.count}`);for(const w of i.where)console.log(`     ${w}`);}
 return checks.every(c=>c[2]);
}

// Blind playtest: one shell call per move, so an agent with no access to the source can play.
async function play(path,args){
 const q=await open(path),file=args.save||join(process.env.TMPDIR||'/tmp',`ql-${q.raw.id}.json`);
 const seed=Number(args.seed??1);
 let log=[];
 if(!args.new){try{log=JSON.parse(await readFile(file,'utf8')).log;}catch{log=[];}}
 const moves=[...log,...String(args.move??'').split(',').filter(Boolean)];
 const rand=seeded(seed);let s=begin(q,rand);
 for(const m of moves){
  if(m.startsWith('mast:')){
   const [,slots,top,nav]=m.split(':'),L=q.loc[s.loc];
   s=mastWrite(q,L.mast,s,{slots:slots.split('').map(Number).filter(Boolean),top:+top,nav:+nav});continue;
  }
  const list=choices(q,s).filter(c=>c.enabled),c=list[Number(m)-1];
  if(!c)throw new Error(`Нет варианта ${m}`);
  s=take(q,s,c.id,rand);
 }
 await writeFile(file,JSON.stringify({log:moves}));
 const v=screen(q,s);
 console.log(`${v.title?`# ${v.title}\n`:''}${v.speaker?`[${v.speaker}]\n`:''}`);
 for(const t of [...v.say,...v.paragraphs])console.log(`${t}\n`);
 console.log(v.status.map(x=>`${x.label}: ${x.fmt==='clock'?fill(q,`{${x.id}|clock}`,s.v):x.text||x.value}`).join(' · '));
 if(v.see?.length)console.log(`На горизонте: ${v.see.map(x=>x.alt||x.type).join('; ')}`);
 if(v.mast)console.log(`Мачта (${v.mast}): ${JSON.stringify(mastRead(q,v.mast,s.v))}. Сменить: --move mast:<слоты>:<топ>:<борта>`);
 if(v.end){console.log(`\n=== ФИНАЛ: ${v.end} ===`);for(const n of s.notes)console.log(`  правило ${n.rule}: ${n.text}`);}
 else v.choices.filter(c=>c.enabled).forEach((c,i)=>console.log(`  ${i+1}. ${c.text}`));
}

// Every rule-tagged passage beside the normative text, for fact-checking by a person or an agent.
function facts(q){
 const raw=q.raw,byRule=new Map();
 const add=(tag,text)=>{const k=parseInt(String(tag).replace(/^r/,''));if(!Number.isNaN(k)){if(!byRule.has(k))byRule.set(k,[]);byRule.get(k).push(text);}};
 for(const [id,l] of Object.entries(raw.locations)){
  const body=(l.text||[]).map(p=>p.text).join(' ');
  for(const t of l.tags||[])add(t,`${id}: ${body}`);
  for(const n of l.notes||[])add(n.rule,`${id} (разбор): ${n.text}`);
  for(const c of l.choices||[]){for(const t of c.tags||[])if(/^r\d/.test(t))add(t,`${id} → ${c.text}${c.say?` :: ${c.say}`:''}`);for(const n of c.notes||[])add(n.rule,`${id} (разбор): ${n.text}`);}
 }
 for(const k of [...byRule.keys()].sort((a,b)=>a-b)){
  const r=RULE_TEXT.find(x=>x.id===k);
  console.log(`\n## Правило ${k}. ${r?.title||'НЕТ В СПРАВОЧНИКЕ'}\n${r?r.text.replace(/\s+/g,' ').slice(0,1400):''}\n-- в квесте:`);
  for(const t of byRule.get(k))console.log(`  · ${t}`);
 }
}

function graph(q){
 const raw=q.raw;console.log('digraph quest{rankdir=LR;node[shape=box,fontsize=10];');
 for(const [id,l] of Object.entries(raw.locations)){
  if(l.end)console.log(`"${id}"[style=filled,fillcolor="${l.end==='win'?'palegreen':l.end==='soft'?'khaki':l.end==='death'?'lightcoral':'mistyrose'}"];`);
  for(const c of l.choices||[])for(const t of c.to)console.log(`"${id}"->"${t.id}"[label="${c.text.slice(0,24).replace(/"/g,"'")}"];`);
  for(const a of l.auto||[])for(const t of a.to)console.log(`"${id}"->"${t.id}"[style=dashed];`);
 }
 console.log('}');
}

async function build(path){
 const q=await open(path),out=join(dirname(path),`${basename(path,'.quest')}.json`);
 await writeFile(out,`${JSON.stringify(q.raw)}\n`);console.log(`${out}: ${(JSON.stringify(q.raw).length/1024).toFixed(1)} КБ`);
}

const [,,cmd,...rest]=process.argv;
const args={},files=[];
for(let i=0;i<rest.length;i++){if(rest[i].startsWith('--')){const k=rest[i].slice(2);args[k]=rest[i+1]&&!rest[i+1].startsWith('--')?rest[++i]:true;}else files.push(rest[i]);}
const usage=`ql check <файл>...   полный отчёт и пороги качества (выход 1, если порог не пройден)
ql compare <файл>...  таблица для нескольких квестов, включая старые .json
ql play <файл> [--new] [--move 2] [--seed 1]  сыграть вслепую по одному ходу
ql facts <файл>       места, помеченные правилами, рядом с текстом МППСС
ql graph <файл>       граф в формате DOT
ql build <файл>       собрать .quest в .json для игры`;
try{
 if(cmd==='check'){let ok=true;for(const f of files)ok=report(await open(f))&&ok;process.exitCode=ok?0:1;}
 else if(cmd==='compare'){
  console.log(`${'квест'.padEnd(22)}${'слов'.padStart(6)}${'лок'.padStart(5)}${'парам'.padStart(6)}${'фин'.padStart(5)}${'опт'.padStart(6)}${'наугад'.padStart(7)}${'длинн'.padStart(6)}${'значим'.padStart(7)}${'ложных'.padStart(7)}`);
  for(const f of files){const q=await open(f),r=report(q,{json:true}),a=r.analysis,raw=q.raw;console.log(`${raw.id.padEnd(22)}${String(r.lint.stats.words).padStart(6)}${String(Object.keys(raw.locations).length).padStart(5)}${String(raw.params.length).padStart(6)}${String(Object.values(raw.locations).filter(x=>x.end).length).padStart(5)}${pct(a.optimal).padStart(6)}${pct(a.random).padStart(7)}${pct(a.longest).padStart(6)}${pct(a.meaningful).padStart(7)}${pct(a.falseChoice).padStart(7)}`);}
 }
 else if(cmd==='play')await play(files[0],args);
 else if(cmd==='facts')facts(await open(files[0]));
 else if(cmd==='graph')graph(await open(files[0]));
 else if(cmd==='build')for(const f of files)await build(f);
 else console.log(usage);
}catch(e){console.error(`Ошибка: ${e.message}`);process.exitCode=2;}
