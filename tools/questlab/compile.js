// .quest source -> JSON for src/quest-vm.js. The format is line-based on purpose: prose stays readable,
// structure stays greppable, and a model or a person can edit one location without touching the rest.
import {splice} from '../../src/quest-assemble.js';

const fail=(n,msg)=>{throw new Error(`строка ${n}: ${msg}`);};

function parseEffects(src,fxs,n){
 const out=[];
 // Commas inside calls such as min(1,zaz+1) belong to the expression, not to the list of effects.
 for(const raw of src.split(/,(?![^()]*\))/).map(x=>x.trim()).filter(Boolean)){
  if(fxs[raw]){out.push(...fxs[raw]);continue;}
  const m=raw.match(/^([A-Za-z_]\w*)\s*(\+=|-=|=)\s*(.+)$/);
  if(!m)fail(n,`не разобрать эффект «${raw}»`);
  out.push({id:m[1],op:m[2],value:m[3]});
 }
 return out;
}
function parseTargets(src,n){
 return src.split('|').map(x=>x.trim()).filter(Boolean).map(part=>{
  const m=part.match(/^([\w-]+)(?:\s+(.+))?$/);
  if(!m)fail(n,`не разобрать переход «${part}»`);
  return {id:m[1],weight:m[2]??1};
 });
}
function keyValues(src){
 const out={};
 for(const m of src.matchAll(/([\w-]+)=("[^"]*"|\S+)/g)){const v=m[2].replace(/^"|"$/g,'');out[m[1]]=Number.isNaN(Number(v))?v:Number(v);}
 return out;
}

export function compileQuest(source,{load}={}){
 const q={id:null,title:'',brief:'',rules:[],params:[],defs:{},crit:[],locations:{},start:null,mast:{}};
 const fxs={},uses=[];
 const lines=source.split('\n').flatMap(line=>{
  const inc=line.trim().match(/^include\s+([\w-]+)$/);
  return inc?load(inc[1]).split('\n'):[line];
 });
 let L=null,choice=null,para=[],paraWhen=null,param=null,paraAt=0;
 const flush=()=>{
  if(!para.length)return;
  if(!L)fail(paraAt,'текст вне локации');
  L.text.push(paraWhen?{when:paraWhen,text:para.join(' ')}:{text:para.join(' ')});
  para=[];paraWhen=null;
 };
 for(let i=0;i<lines.length;i++){
  const n=i+1,line=lines[i],t=line.trim();
  if(t.startsWith('//'))continue;
  if(!t){flush();continue;}
  if(!L){
   let m;
   if((m=t.match(/^quest\s+([\w-]+)$/)))q.id=m[1];
   else if((m=t.match(/^encounter\s+([\w-]+)$/))){q.id=m[1];q.kind='encounter';}
   else if((m=t.match(/^errand\s+([\w-]+)$/))){q.id=m[1];q.kind='errand';}
   else if((m=t.match(/^route\s+(\w+)\s+(\w+)$/)))q.route=[m[1],m[2]];
   else if((m=t.match(/^routes\s+(.+)$/)))q.routes=m[1].split(/\s+/).map(x=>x.split('-'));
   else if((m=t.match(/^pay\s+(\d+)$/)))q.pay=+m[1];
   else if((m=t.match(/^radar\s+(.+)$/)))q.radar=m[1];
   else if((m=t.match(/^news\s+([\w-]+)\s+(.+)$/)))(q.news||={})[m[1]]=m[2];
   else if((m=t.match(/^perleg\s+(\d+)$/)))q.perleg=+m[1];
   else if((m=t.match(/^set\s+(.+)$/)))q.set=keyValues(m[1]);
   else if((m=t.match(/^cargo\s+"([^"]*)"$/))){q.cargo={label:m[1],ranges:[]};param=q.cargo;}
   else if((m=t.match(/^use\s+([\w-]+)(?:\s+as\s+([\w-]+))?\s+exit=([\w-]+)$/)))uses.push({name:m[1],as:m[2]||m[1],exit:m[3]});
   else if((m=t.match(/^title\s+(.+)$/)))q.title=m[1];
   else if((m=t.match(/^brief\s+(.+)$/)))q.brief=m[1];
   else if((m=t.match(/^legal\s+(.+)$/)))q.legal=m[1];
   else if((m=t.match(/^rules\s+(.+)$/)))q.rules=m[1].split(/\s+/).map(Number);
   else if((m=t.match(/^start\s+([\w-]+)$/)))q.start=m[1];
   else if((m=t.match(/^mast\s+(\w+)\s+(.+)$/))){
    const o=keyValues(m[2]),list=x=>typeof x==='string'?x.split(','):x;
    q.mast[m[1]]={slots:list(o.slots),top:o.top||null,nav:o.nav||null,stock:o.stock?list(o.stock):null,values:o.values};
   }
   else if((m=t.match(/^param\s+(\w+)\s+"([^"]*)"\s+(-?\d+)\.\.(-?\d+)\s+=(-?\d+)(.*)$/))){
    const flags=m[6]||'';
    param={id:m[1],label:m[2],min:+m[3],max:+m[4],start:+m[5],ranges:[]};
    if(/\bhidden\b/.test(flags))param.hidden=true;
    if(/\bworld\b/.test(flags))param.world=true;
    Object.assign(param,keyValues(flags));
    const at=q.params.findIndex(p=>p.id===param.id);
    if(at>=0)q.params[at]=param;else q.params.push(param);
   }
   else if((m=t.match(/^\|\s*(-?\d+)\.\.(-?\d+)\s+(.+)$/))){if(!param)fail(n,'диапазон без параметра');param.ranges.push({from:+m[1],to:+m[2],text:m[3]});}
   else if((m=t.match(/^def\s+(\w+)\s*=\s*(.+)$/)))q.defs[m[1]]=m[2];
   else if((m=t.match(/^fx\s+(\w+)\s*=\s*(.+)$/)))fxs[m[1]]=parseEffects(m[2],fxs,n);
   else if((m=t.match(/^crit\s+(.+?)\s*->\s*([\w-]+)$/)))q.crit.push({when:m[1],to:m[2]});
   else if((m=t.match(/^doc\s+(\w+)\s+"([^"]*)"\s+when=(\S+)$/)))(q.docs||=[]).push({id:m[1],title:m[2],when:m[3],lines:[]});
   else if((m=t.match(/^\+\s+(.+)$/))){if(!q.docs?.length)fail(n,'строка документа без doc');q.docs.at(-1).lines.push(m[1]);}
   else if(!t.startsWith('=='))fail(n,`не понял заголовок: ${t}`);
  }
  let m;
  if((m=t.match(/^==\s*([\w-]+)(?:\s+(win|soft|fail|death))?$/))){
   flush();choice=null;
   if(q.locations[m[1]])fail(n,`локация ${m[1]} уже есть`);
   L={text:[],choices:[],auto:[],on:[],notes:[],line:n};
   if(m[2])L.end=m[2];
   q.locations[m[1]]=L;
   continue;
  }
  if(!L)continue;
  if(choice&&/^\s/.test(line)){
   if((m=t.match(/^if\s+(.+)$/)))choice.when=m[1];
   else if((m=t.match(/^lock\s+(.+?)\s*\|\s*(.+)$/))){choice.lock=m[1];choice.lockText=m[2];}
   else if((m=t.match(/^~\s*(.+)$/)))choice.fx.push(...parseEffects(m[1],fxs,n));
   else if((m=t.match(/^:\s*(.+)$/)))choice.say=choice.say?`${choice.say} ${m[1]}`:m[1];
   else if(t==='once')choice.limit=1;
   else if((m=t.match(/^limit\s+(\d+)$/)))choice.limit=+m[1];
   else if((m=t.match(/^note\s+(\S+)\s+(.+)$/)))choice.notes.push({rule:m[1],text:m[2]});
   else if(t.startsWith('#'))choice.tags.push(...t.split(/\s+/).map(x=>x.slice(1)));
   else if((m=t.match(/^->\s*(.+)$/)))choice.to=parseTargets(m[1],n);
   else fail(n,`не понял строку выбора: ${t}`);
   continue;
  }
  flush();
  if((m=t.match(/^\*\s+(.+)$/))){
   choice={text:m[1],fx:[],tags:[],notes:[],to:null,line:n};L.choices.push(choice);continue;
  }
  choice=null;
  if((m=t.match(/^@scene\s+(\S+)(.*)$/)))L.scene={name:m[1],...keyValues(m[2])};
  else if((m=t.match(/^@see\s+(\S+)(.*)$/)))(L.see||=[]).push({type:m[1],...keyValues(m[2])});
  else if((m=t.match(/^@mast\s+(\w+)$/)))L.mast=m[1];
  else if((m=t.match(/^@title\s+(.+)$/)))L.title=m[1];
  else if((m=t.match(/^@speaker\s+(.+)$/)))L.speaker=m[1];
  else if((m=t.match(/^@tags\s+(.+)$/)))L.tags=t.slice(6).trim().split(/\s+/).map(x=>x.replace(/^#/,''));
  else if((m=t.match(/^!\s*(.+)$/)))L.on.push(...parseEffects(m[1],fxs,n));
  else if((m=t.match(/^note\s+(\S+)\s+(.+)$/)))L.notes.push({rule:m[1],text:m[2]});
  else if((m=t.match(/^\?note\s+(.+?)\s*::\s*(\S+)\s+(.+)$/)))L.notes.push({when:m[1],rule:m[2],text:m[3]});
  else if((m=t.match(/^@roll\s+(\w+)\s+(\d+)\.\.(\d+)$/)))L.roll={id:m[1],from:+m[2],to:+m[3]};
  else if((m=t.match(/^>\s*(?:(.*?)\s*)?->\s*(.+)$/))){
   const parts=m[2].split('~'),when=(m[1]||'').trim();
   L.auto.push({when:when||null,to:parseTargets(parts[0],n),fx:parts[1]?parseEffects(parts[1],fxs,n):[]});
  }
  else if((m=t.match(/^\?\s*(.+?)\s*::\s*(.+)$/))){paraWhen=m[1];para=[m[2]];paraAt=n;flush();}
  else if(t.startsWith('@'))fail(n,`неизвестная директива ${t}`);
  else{para.push(t);paraAt=n;}
 }
 flush();
 // A roll becomes a fan of one-line locations: chance stays visible to the solver as weighted jumps.
 for(const [id,l] of Object.entries(q.locations)){
  if(!l.roll)continue;
  const {id:param,from,to}=l.roll,body=`${id}__`;
  q.locations[body]={...l,roll:undefined};
  const fan=[];
  for(let k=from;k<=to;k++){q.locations[`${id}__${k}`]={text:[],choices:[],auto:[{when:null,to:[{id:body}],fx:[]}],on:[{id:param,op:'=',value:String(k)}],notes:[]};fan.push({id:`${id}__${k}`});}
  q.locations[id]={text:[],choices:[],auto:[{when:null,to:fan,fx:[]}],on:[],notes:[]};
 }
 q.start||=Object.keys(q.locations)[0];
 const parts=uses.map(u=>({...u,fragment:compileQuest(load(u.name),{load})}));
 for(const u of parts)splice(q,u.fragment,u.as,u.exit);
 const radar=text=>text.replace(/\{\{radar:([\w-]+)\}\}/g,(_,name)=>parts.find(u=>u.name===name).fragment.radar);
 for(const l of Object.values(q.locations))for(const p of l.text||[])p.text=radar(p.text);
 for(const [id,l] of Object.entries(q.locations))for(const c of l.choices)if(!c.to)fail(c.line,`у выбора «${c.text}» в ${id} нет перехода ->`);
 return q;
}
