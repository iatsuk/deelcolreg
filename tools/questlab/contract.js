// What a quest names but the compiler cannot confirm: game code owns scenes, sights and world memory,
// and text is filled only on screen. A typo here passes every solver check and breaks in front of a player.
import {exprNames} from '../../src/quest-vm.js';
import {SCENE_NAMES,SIGHTS,SIGHT_KEYS} from '../../src/freight-sea.js';
import {WORLD_VARS} from '../../src/freight-world.js';
import {RULE_TEXT} from '../../src/rules-text.js';

const RULES=new Set(RULE_TEXT.map(r=>r.id));
const FORMATS=[undefined,'clock','text'];

export function contract(raw,shared={}){
 const bad=[],params=[...raw.params,...shared.params||[]],known=new Set([...params.map(p=>p.id),...Object.keys({...raw.defs,...shared.defs})]);
 const names=(where,src)=>{
  try{for(const n of exprNames(src))if(!known.has(n))bad.push(`${where}: неизвестное имя «${n}»`);}
  catch(e){bad.push(`${where}: ${e.message}`);}
 };
 const text=(where,src='')=>{
  for(const m of src.replace(/\{\{\w+\}\}/g,'').matchAll(/\{([^{}|]+)(?:\|(\w+))?\}/g)){
   names(where,m[1]);
   if(!FORMATS.includes(m[2]))bad.push(`${where}: неизвестный формат «${m[2]}»`);
  }
 };
 const rule=(where,x)=>{if(!RULES.has(parseInt(String(x).replace(/^r/,''))))bad.push(`${where}: нет правила «${x}»`);};
 const notes=(where,list=[])=>{for(const n of list)rule(where,n.rule);};
 const tags=(where,list=[])=>{for(const t of list)if(/^r\d/.test(t))rule(where,t);};
 for(const p of raw.params){
  if(p.world&&!WORLD_VARS.includes(p.id))bad.push(`параметр ${p.id}: мир его не хранит`);
  if(p.showIf)names(`параметр ${p.id}`,p.showIf);
 }
 for(const d of raw.docs||[])names(`документ ${d.id}`,d.when);
 for(const [id,l] of Object.entries(raw.locations)){
  if(l.scene&&!SCENE_NAMES.includes(l.scene.name))bad.push(`${id}: нет сцены «${l.scene.name}»`);
  if(l.mast&&!raw.mast?.[l.mast])bad.push(`${id}: нет мачты «${l.mast}»`);
  for(const s of l.see||[]){
   if(!SIGHTS.includes(s.type))bad.push(`${id}: море не рисует «${s.type}»`);
   for(const k of Object.keys(s))if(k!=='type'&&!SIGHT_KEYS.includes(k))bad.push(`${id}: у @see нет ключа «${k}»`);
   if(s.when)names(id,s.when);
  }
  text(id,l.title);tags(id,l.tags);notes(id,l.notes);
  for(const p of l.text||[])text(id,p.text);
  for(const c of l.choices||[]){text(id,c.text);text(id,c.say);tags(id,c.tags);notes(id,c.notes);}
 }
 return bad.map(x=>`${raw.id}/${x}`);
}

// Encounters and errands share the template's parameters, so they are checked against it.
export function bundleContract({template:t,deck,errands}){
 const shared={params:t.params,defs:t.defs},bad=contract(t);
 for(const f of Object.values(deck))bad.push(...contract(f,shared));
 for(const e of Object.values(errands)){
  bad.push(...contract(e,shared));
  for(const k of Object.keys(e.set||{}))if(!t.params.some(p=>p.id===k))bad.push(`${e.id}: set меняет неизвестный параметр ${k}`);
  for(const k of Object.keys(e.news||{}))if(!e.locations[k]?.end&&!t.locations[k]?.end)bad.push(`${e.id}: новость к несуществующему финалу ${k}`);
 }
 for(const id of WORLD_VARS)if(!t.params.some(p=>p.id===id&&p.world))bad.push(`шаблон поручения не хранит ${id}`);
 return bad;
}

// A known debt stays listed with its reason, so the gate itself stays strict. A paid debt must leave the list.
export const verdict=(failed,waived={})=>({fresh:failed.filter(x=>!Object.hasOwn(waived,x)),stale:Object.keys(waived).filter(x=>!failed.includes(x))});
