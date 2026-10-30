// Text-quest machine in the spirit of Space Rangers: numeric parameters, locations, conditional jumps.
// Quests are data: expressions are parsed here and never reach eval. Every random branch is a weighted
// jump, so the same code runs the game in a browser and lets tools/questlab enumerate the whole quest.
const TOKEN=/\s*(\d+(?:\.\d+)?|[A-Za-z_][\w]*|==|!=|<=|>=|[-+*/%()<>,?:])/y;
const FN={min:Math.min,max:Math.max,abs:Math.abs,floor:Math.floor,round:Math.round,clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
const BIN={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'%':(a,b)=>a%b,'==':(a,b)=>+(a===b),'!=':(a,b)=>+(a!==b),'<':(a,b)=>+(a<b),'<=':(a,b)=>+(a<=b),'>':(a,b)=>+(a>b),'>=':(a,b)=>+(a>=b)};
const LEVELS=[['or'],['and'],['==','!='],['<','<=','>','>='],['+','-'],['*','/','%']];

function tokens(src){
 const out=[];TOKEN.lastIndex=0;
 while(TOKEN.lastIndex<src.length){
  const at=TOKEN.lastIndex,m=TOKEN.exec(src);
  if(!m){if(!src.slice(at).trim())break;throw new Error(`Не разобрать выражение «${src}» с позиции ${at}`);}
  out.push(m[1]);
 }
 return out;
}
export function compileExpr(src,resolve){
 const t=tokens(String(src));let i=0;
 const peek=()=>t[i],next=()=>t[i++],expect=x=>{if(next()!==x)throw new Error(`В выражении «${src}» ожидается «${x}»`);};
 function ternary(){const c=level(0);if(peek()!=='?')return c;next();const a=ternary();expect(':');const b=ternary();return v=>c(v)?a(v):b(v);}
 function level(n){
  if(n===LEVELS.length)return unary();
  let a=level(n+1);
  while(LEVELS[n].includes(peek())){
   const op=next(),l=a,r=level(n+1);
   a=op==='and'?v=>+(!!l(v)&&!!r(v)):op==='or'?v=>+(!!l(v)||!!r(v)):(f=>v=>f(l(v),r(v)))(BIN[op]);
  }
  return a;
 }
 function unary(){
  if(peek()==='-'){next();const a=unary();return v=>-a(v);}
  if(peek()==='not'){next();const a=unary();return v=>+!a(v);}
  return atom();
 }
 function atom(){
  const x=next();
  if(x==='('){const a=ternary();expect(')');return a;}
  if(/^\d/.test(x||'')){const n=Number(x);return ()=>n;}
  if(/^[A-Za-z_]/.test(x||'')){
   if(peek()==='('){
    next();const f=FN[x];if(!f)throw new Error(`Неизвестная функция ${x} в «${src}»`);
    const a=[];if(peek()!==')')do{a.push(ternary());}while(peek()===','&&next());
    expect(')');return v=>f(...a.map(e=>e(v)));
   }
   return resolve(x);
  }
  throw new Error(`Не разобрать выражение «${src}»`);
 }
 const out=ternary();
 if(i<t.length)throw new Error(`Лишнее «${t[i]}» в выражении «${src}»`);
 return out;
}

export function exprNames(src){return tokens(String(src)).filter(x=>/^[A-Za-z_]/.test(x)&&!FN[x]&&!['and','or','not'].includes(x));}

export function loadQuest(raw){
 const params=raw.params.map(p=>({...p})),index=Object.fromEntries(params.map((p,i)=>[p.id,i]));
 const defs={};
 const resolve=name=>{
  if(Object.hasOwn(index,name)){const i=index[name];return v=>v[i];}
  if(Object.hasOwn(defs,name)){const d=defs[name];return v=>d.fn(v);}
  throw new Error(`Неизвестное имя «${name}»`);
 };
 const expr=src=>compileExpr(src,resolve);
 for(const [k,src] of Object.entries(raw.defs||{}))defs[k]={src,fn:null};
 for(const d of Object.values(defs))d.fn=expr(d.src);
 const effects=list=>(list||[]).map(({id,op,value})=>{
  if(!Object.hasOwn(index,id))throw new Error(`Эффект меняет неизвестный параметр «${id}»`);
  const i=index[id],f=expr(value),p=params[i];
  return v=>{const n=op==='='?f(v):op==='+='?v[i]+f(v):v[i]-f(v);v[i]=Math.max(p.min,Math.min(p.max,n));};
 });
 const targets=list=>list.map(t=>({id:t.id,weight:expr(t.weight??1)}));
 const notes=list=>(list||[]).map(n=>({...n,test:n.when?expr(n.when):null}));
 const loc={};
 for(const [id,l] of Object.entries(raw.locations)){
  const choices=(l.choices||[]).map((c,n)=>{
   let used=null;
   if(c.limit){used=params.length;index[`__u_${id}_${n}`]=used;params.push({id:`__u_${id}_${n}`,min:0,max:c.limit,start:0,hidden:true,internal:true});}
   return {...c,id:c.id||`${id}.${n}`,used};
  });
  loc[id]={...l,id,choices};
 }
 for(const l of Object.values(loc)){
  l.on=effects(l.on);l.noteList=notes(l.notes);
  l.auto=(l.auto||[]).map(a=>({when:a.when?expr(a.when):null,fx:effects(a.fx),to:targets(a.to),notes:notes(a.notes),say:a.say||null}));
  l.paras=(l.text||[]).map(p=>({when:p.when?expr(p.when):null,text:p.text}));
  for(const c of l.choices){
   c.test=c.when?expr(c.when):null;c.lockTest=c.lock?expr(c.lock):null;c.effects=effects(c.fx);c.targets=targets(c.to);c.noteList=notes(c.notes);
   for(const t of c.to)if(!loc[t.id])throw new Error(`Переход ${c.id} ведёт в неизвестную локацию ${t.id}`);
  }
  for(const a of l.auto)for(const t of a.to)if(!loc[t.id])throw new Error(`Автопереход из ${l.id} ведёт в неизвестную локацию ${t.id}`);
 }
 if(!loc[raw.start])throw new Error(`Нет стартовой локации ${raw.start}`);
 const crit=(raw.crit||[]).map(c=>{if(!loc[c.to])throw new Error(`crit ведёт в неизвестную локацию ${c.to}`);return {when:expr(c.when),to:c.to};});
 return {...raw,params,index,defs,loc,crit,expr,startValues:params.map(p=>p.start??p.min)};
}

const clone=s=>({loc:s.loc,v:s.v.slice(),say:s.say.slice(),notes:s.notes.slice(),end:s.end,turns:s.turns});
const addNotes=(s,list)=>{for(const n of list)if((!n.test||n.test(s.v))&&!s.notes.some(x=>x.rule===n.rule&&x.text===n.text))s.notes.push({rule:n.rule,text:n.text});};

function enter(q,base,id,p,out,depth=0){
 if(depth>80)throw new Error(`Зацикленные автопереходы около ${id}`);
 const L=q.loc[id],s=clone(base);s.loc=id;
 for(const f of L.on)f(s.v);addNotes(s,L.noteList);
 if(L.end){s.end=L.end;out.push({p,s});return out;}
 const c=q.crit.find(c=>c.when(s.v));
 if(c)return enter(q,s,c.to,p,out,depth+1);
 for(const a of L.auto){
  if(a.when&&!a.when(s.v))continue;
  const n=clone(s);for(const f of a.fx)f(n.v);addNotes(n,a.notes);if(a.say)n.say.push(a.say);
  branch(q,n,a.to,p,out,depth);return out;
 }
 out.push({p,s});return out;
}
function branch(q,s,to,p,out,depth){
 const w=to.map(t=>Math.max(0,t.weight(s.v))),sum=w.reduce((a,b)=>a+b,0);
 if(!sum)throw new Error(`Все веса нулевые на выходе из ${s.loc}`);
 to.forEach((t,i)=>{if(w[i]>0)enter(q,s,t.id,p*w[i]/sum,out,depth+1);});
}
// Every possible start or result of a choice, with probabilities. Browser and solver share this.
export function starts(q){return enter(q,{loc:null,v:q.startValues.slice(),say:[],notes:[],end:null,turns:0},q.start,1,[]);}
export function outcomes(q,state,choiceId){
 const c=q.loc[state.loc].choices.find(c=>c.id===choiceId);
 if(!c||!available(c,state.v))throw new Error(`Выбор ${choiceId} недоступен`);
 const s=clone(state);s.say=[];s.turns++;
 for(const f of c.effects)f(s.v);addNotes(s,c.noteList);
 if(c.used!==null)s.v[c.used]++;
 if(c.say)s.say.push(c.say);
 const out=[],crit=q.crit.find(x=>x.when(s.v));
 if(crit)return enter(q,s,crit.to,1,out);
 branch(q,s,c.targets,1,out,0);return out;
}
const visible=(c,v)=>(!c.test||!!c.test(v))&&(c.used===null||v[c.used]<c.limit);
const available=(c,v)=>visible(c,v)&&(!c.lockTest||!!c.lockTest(v));
export function choices(q,s,plain=false){
 if(s.end)return [];
 return q.loc[s.loc].choices.filter(c=>visible(c,s.v)).map(c=>({id:c.id,text:plain?c.text:fill(q,c.text,s.v),enabled:available(c,s.v),lockText:c.lockText||null,tags:c.tags||[]}));
}
export function pick(list,rand){let r=rand();for(const o of list){r-=o.p;if(r<=0)return o.s;}return list[list.length-1].s;}
export function begin(q,rand=Math.random){return pick(starts(q),rand);}
export function take(q,s,id,rand=Math.random){return pick(outcomes(q,s,id),rand);}

const CLOCK=m=>{const d=((m%1440)+1440)%1440;return `${String(Math.floor(d/60)).padStart(2,'0')}:${String(d%60).padStart(2,'0')}`;};
export function statusText(q,id,v){
 const p=q.params[q.index[id]],x=v[q.index[id]];
 return (p.ranges||[]).find(r=>x>=r.from&&x<=r.to)?.text||'';
}
export function fill(q,text,v){
 return text.replace(/\{([^{}|]+)(?:\|(\w+))?\}/g,(_,e,fmt)=>{
  const key=e.trim(),value=q.expr(key)(v);
  if(fmt==='clock')return CLOCK(value);
  if(fmt==='text')return statusText(q,key,v);
  return String(Math.round(value*10)/10);
 });
}
export function screen(q,s){
 const L=q.loc[s.loc];
 return {
  id:L.id,title:L.title?fill(q,L.title,s.v):null,speaker:L.speaker||null,end:s.end,scene:L.scene||null,mast:L.mast||null,
  see:(L.see||[]).filter(x=>!x.when||q.expr(x.when)(s.v)),
  docs:(q.docs||[]).filter(d=>q.expr(d.when)(s.v)),
  say:s.say.map(t=>fill(q,t,s.v)),
  paragraphs:L.paras.filter(p=>!p.when||p.when(s.v)).map(p=>fill(q,p.text,s.v)),
  choices:choices(q,s),
  status:q.params.filter(p=>!p.hidden).filter(p=>!p.showIf||q.expr(p.showIf)(s.v)).map(p=>({id:p.id,label:p.label,value:s.v[q.index[p.id]],min:p.min,max:p.max,fmt:p.fmt||null,kind:p.kind||null,text:statusText(q,p.id,s.v)})),
 };
}

// The mast is the one direct-manipulation toy: a stack of lamps or day shapes the player sets by hand.
export function mastRead(q,mode,v){
 const m=q.mast?.[mode];if(!m)return null;
 const read=id=>v[q.index[id]];
 return {slots:m.slots.map(read),top:m.top?read(m.top):null,nav:m.nav?read(m.nav):null};
}
export function mastWrite(q,mode,s,cfg){
 const m=q.mast[mode],n=clone(s),vals=cfg.slots.filter(Boolean);
 m.slots.forEach((id,i)=>{n.v[q.index[id]]=vals[i]||0;});
 if(m.top)n.v[q.index[m.top]]=cfg.top?1:0;
 if(m.nav)n.v[q.index[m.nav]]=cfg.nav?1:0;
 return n;
}
export function mastStock(q,mode,v){
 const m=q.mast[mode];return m.stock?m.stock.map(id=>v[q.index[id]]):null;
}
export function mastFits(q,mode,v,slots){
 const stock=mastStock(q,mode,v);if(!stock)return true;
 return stock.every((have,i)=>slots.filter(x=>x===i+1).length<=have);
}
export function mastConfigs(q,mode,v){
 const m=q.mast[mode],values=m.values,out=[];
 const walk=(prefix)=>{
  if(mastFits(q,mode,v,prefix))for(const top of m.top?[0,1]:[0])for(const nav of m.nav?[0,1]:[0])out.push({slots:prefix.slice(),top,nav});
  if(prefix.length<m.slots.length)for(let x=1;x<=values;x++)walk([...prefix,x]);
 };
 walk([]);return out;
}
