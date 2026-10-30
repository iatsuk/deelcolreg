// Full state-space analysis. An LLM cannot feel a quest's structure, so this gives it numbers:
// the best possible win rate, what a player without a given rule achieves, which choices are false.
import {starts,outcomes,choices,mastConfigs,mastWrite} from '../../src/quest-vm.js';
import {exprNames} from '../../src/quest-vm.js';

const VALUE={win:1,soft:.5,fail:0,death:0};
const keyOf=s=>`${s.loc}|${s.v.join(',')}`;

// Lamp stacks that no rule of the quest distinguishes are one action for the solver.
function mastSignature(q,mode){
 const m=q.mast[mode],ids=[...m.slots,m.top,m.nav].filter(Boolean);
 const names=Object.entries(q.defs).filter(([,d])=>exprNames(d.src).some(x=>ids.includes(x)||(q.defs[x]&&exprNames(q.defs[x].src).some(y=>ids.includes(y))))).map(([k])=>k);
 return v=>names.map(k=>q.defs[k].fn(v)?1:0).join('');
}
function mastActions(q,s,mode,signature){
 const seen=new Map();
 for(const cfg of mastConfigs(q,mode,s.v)){
  const next=mastWrite(q,mode,s,cfg),sig=signature(next.v);
  if(!seen.has(sig))seen.set(sig,next);
 }
 return [...seen.values()];
}

// Backward data flow: a variable no future condition reads is dropped from the state key.
// Money after the last shop and the old mast at a stop where it is reset stop multiplying states.
function liveness(q){
 const raw=q.raw,names=new Map();
 const reads=src=>{
  const key=String(src??'');if(names.has(key))return names.get(key);
  const out=new Set();
  const walk=x=>{for(const n of exprNames(x))if(q.defs[n])walk(q.defs[n].src);else out.add(n);};
  if(src!==null&&src!==undefined)walk(src);
  names.set(key,out);return out;
 };
 const through=(fx,after)=>{
  const live=new Set(after);
  for(const f of [...(fx||[])].reverse()){
   if(!live.has(f.id))continue;
   if(f.op==='=')live.delete(f.id);
   for(const x of reads(f.value))live.add(x);
  }
  return live;
 };
 const always=new Set(raw.crit.flatMap(c=>[...reads(c.when)]));
 const live=Object.fromEntries(Object.keys(raw.locations).map(id=>[id,new Set()]));
 const usedOf=(id,n)=>`__u_${id}_${n}`;
 for(let changed=true;changed;){
  changed=false;
  for(const [id,L] of Object.entries(raw.locations)){
   if(L.end)continue;
   const after=new Set(always);
   const merge=x=>{for(const y of x)after.add(y);};
   for(const a of L.auto||[]){
    merge(reads(a.when));
    for(const t of a.to){merge(reads(t.weight));merge(through(a.fx,live[t.id]));}
   }
   (L.choices||[]).forEach((c,n)=>{
    merge(reads(c.when));merge(reads(c.lock));
    if(c.limit)after.add(usedOf(id,n));
    for(const t of c.to){merge(reads(t.weight));merge(through(c.fx,live[t.id]));}
   });
   if(L.mast){
    const m=raw.mast[L.mast];
    for(const x of [...m.slots,m.top,m.nav])after.delete(x);
    for(const x of m.stock||[])after.add(x);
   }
   const inn=through(L.on,after);
   if([...inn].some(x=>!live[id].has(x))){live[id]=inn;changed=true;}
  }
 }
 return Object.fromEntries(Object.entries(live).map(([id,set])=>[id,q.params.map((p,i)=>set.has(p.id)?-1:i).filter(i=>i>=0)]));
}

export function explore(q,{cap=2500000}={}){
 const index=new Map(),nodes=[],queue=[],dead=liveness(q);
 const signatures=Object.fromEntries(Object.keys(q.mast||{}).map(m=>[m,mastSignature(q,m)]));
 const seenLoc=new Set(),seenChoice=new Set();
 const overflow=()=>{
  const by={};
  for(const k of index.keys()){const [l,v]=k.split('|');(by[l]||=[]).push(v);}
  const top=Object.entries(by).sort((a,b)=>b[1].length-a[1].length).slice(0,6).map(([l,vs])=>`${l} ${vs.length}: ${q.params.map((p,i)=>[p.id,new Set(vs.map(v=>v.split(',')[i])).size]).filter(x=>x[1]>1).map(x=>x.join(':')).join(' ')}`);
  return new Error(`Больше ${cap} состояний. Больше всего:\n${top.join('\n')}`);
 };
 // Spare lamps that open no new class of mast are the same state: only the classes on offer matter.
 const stockOf=mode=>q.mast?.[mode]?.stock?.map(id=>q.index[id]);
 const stockIds=Object.keys(q.mast||{}).flatMap(m=>stockOf(m)||[]),stockMemo=new Map(),stockClasses=new Map();
 const canonStock=s=>{
  if(!stockIds.length||dead[s.loc].includes(stockIds[0]))return;
  const mode=Object.keys(q.mast).find(m=>stockOf(m)),tuple=stockIds.map(i=>s.v[i]).join();
  let canon=stockMemo.get(tuple);
  if(!canon){
   const classes=[...new Set(mastConfigs(q,mode,s.v).map(c=>signatures[mode](mastWrite(q,mode,s,c).v)))].sort().join();
   canon=stockClasses.get(classes)||stockIds.map(i=>s.v[i]);
   stockClasses.set(classes,canon);stockMemo.set(tuple,canon);
  }
  stockIds.forEach((i,k)=>{s.v[i]=canon[k];});
 };
 // A screen with one way forward is not a decision: follow it and store only where it leads.
 const forced=s=>{
  for(let steps=0;steps<64;steps++){
   seenLoc.add(s.loc);
   if(s.end||q.loc[s.loc].mast)return s;
   const list=choices(q,s,true);
   if(list.length!==1||!list[0].enabled)return s;
   const out=outcomes(q,s,list[0].id);
   if(out.length!==1)return s;
   seenChoice.add(list[0].id);s=out[0].s;
  }
  return s;
 };
 const visit=raw=>{
  const s=forced(raw);
  if(!s.end){for(const i of dead[s.loc])s.v[i]=0;canonStock(s);}
  const key=s.end?s.loc:keyOf(s);
  let id=index.get(key);
  if(id===undefined){id=nodes.length;index.set(key,id);nodes.push({s,loc:s.loc,end:s.end,actions:[]});queue.push(id);if(nodes.length>cap)throw overflow();}
  return id;
 };
 const roots=starts(q).map(o=>({p:o.p,id:visit(o.s)}));
 for(let head=0;head<queue.length;head++){
  const node=nodes[queue[head]],s=node.s;node.s=null;
  if(node.end)continue;
  const L=q.loc[s.loc];
  const variants=L.mast?mastActions(q,s,L.mast,signatures[L.mast]):[s];
  variants.forEach((variant,group)=>{
   for(const c of choices(q,variant,true))if(c.enabled){
    seenChoice.add(c.id);
    const merged=new Map();for(const o of outcomes(q,variant,c.id)){const id=visit(o.s);merged.set(id,(merged.get(id)||0)+o.p);}
    node.actions.push({id:c.id,len:c.text.length,tags:c.tags,group,out:[...merged].map(([id,p])=>({id,p}))});
   }
  });
 }
 for(const n of nodes)n.value=n.end?VALUE[n.end]:0;
 return {q,nodes,roots,seenLoc,seenChoice};
}

// One decision of a policy: the value of a node given the values of its successors.
const qValue=(g,a,V)=>{let x=0;for(const o of a.out)x+=o.p*V[o.id];return x;};
function solveWith(g,decide){
 const n=g.nodes.length,V=new Float64Array(n);
 for(let i=0;i<n;i++)V[i]=g.nodes[i].value;
 for(let sweep=0;sweep<4000;sweep++){
  let delta=0;
  for(let i=n-1;i>=0;i--){
   const node=g.nodes[i];if(node.end||!node.actions.length)continue;
   const x=decide(node,V);
   delta=Math.max(delta,Math.abs(x-V[i]));V[i]=x;
  }
  if(delta<1e-7)break;
 }
 return V;
}
const best=(g,node,V)=>{let m=-1;for(const a of node.actions){const x=qValue(g,a,V);if(x>m)m=x;}return m;};
const mean=(g,node,V)=>{let m=0;for(const a of node.actions)m+=qValue(g,a,V);return m/node.actions.length;};
// A mast stop is a choice of config first, then of a move; the blind player guesses the config, not the move.
function meanOfGroups(g,node,V){
 const groups=new Map();
 for(const a of node.actions){const x=qValue(g,a,V);if(!groups.has(a.group)||groups.get(a.group)<x)groups.set(a.group,x);}
 let m=0;for(const x of groups.values())m+=x;return m/groups.size;
}
const touches=(g,node,tag)=>(g.q.loc[node.loc].tags||[]).includes(tag)||node.actions.some(a=>a.tags.includes(tag));
const rootValue=(g,V)=>g.roots.reduce((x,r)=>x+r.p*V[r.id],0);

export const policies={
 optimal:g=>(node,V)=>best(g,node,V),
 random:g=>(node,V)=>mean(g,node,V),
 longest:g=>(node,V)=>{const a=node.actions.reduce((x,y)=>y.len>x.len?y:x);return qValue(g,a,V);},
 shortest:g=>(node,V)=>{const a=node.actions.reduce((x,y)=>y.len<x.len?y:x);return qValue(g,a,V);},
 blind:(g,tag)=>(node,V)=>touches(g,node,tag)?(g.q.loc[node.loc].mast?meanOfGroups(g,node,V):mean(g,node,V)):best(g,node,V),
 trap:(g,tag)=>(node,V)=>{const a=node.actions.find(a=>a.tags.includes(tag));return a?qValue(g,a,V):best(g,node,V);},
};

// Forward sampling under a policy: which endings a kind of player actually meets.
export function sample(g,V,mode='optimal',runs=4000,seed=1){
 let r=seed>>>0;const rand=()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
 const ends={},turns=[];
 const pick=list=>{let x=rand();for(const o of list){x-=o.p;if(x<=0)return o.id;}return list[list.length-1].id;};
 for(let k=0;k<runs;k++){
  let id=pick(g.roots),steps=0;
  while(!g.nodes[id].end&&g.nodes[id].actions.length&&steps<2000){
   const node=g.nodes[id];
   let a;
   if(mode==='optimal'){const vals=node.actions.map(x=>qValue(g,x,V)),m=Math.max(...vals),top=node.actions.filter((x,i)=>vals[i]>m-1e-6);a=top[Math.floor(rand()*top.length)];}
   else a=node.actions[Math.floor(rand()*node.actions.length)];
   id=pick(a.out);steps++;
  }
  const loc=g.nodes[id].end?g.nodes[id].loc:'(тупик)';
  ends[loc]=(ends[loc]||0)+1;turns.push(steps);
 }
 turns.sort((a,b)=>a-b);
 return {ends:Object.fromEntries(Object.entries(ends).map(([k,v])=>[k,v/runs])),medianTurns:turns[turns.length>>1]};
}

export function analyse(q,opts={}){
 const g=explore(q,opts),{nodes}=g;
 const V=solveWith(g,policies.optimal(g));
 const result={states:nodes.length,optimal:rootValue(g,V)};
 for(const name of ['random','longest','shortest'])result[name]=rootValue(g,solveWith(g,policies[name](g)));
 const allTags=new Set();
 for(const l of Object.values(q.loc)){for(const t of l.tags||[])allTags.add(t);for(const c of l.choices)for(const t of c.tags||[])allTags.add(t);}
 result.rules=[...allTags].filter(t=>/^r\d/.test(t)).sort((a,b)=>parseInt(a.slice(1))-parseInt(b.slice(1))).map(tag=>({tag,value:rootValue(g,solveWith(g,policies.blind(g,tag)))}));
 const cost=tag=>{
  let sum=0,n=0;
  for(const node of nodes){
   if(!node.actions.some(a=>a.tags.includes(tag)))continue;
   const top=best(g,node,V);
   for(const a of node.actions)if(a.tags.includes(tag)){sum+=top-qValue(g,a,V);n++;}
  }
  return n?sum/n:0;
 };
 const spread=tag=>{
  let sum=0,n=0;
  for(const node of nodes){
   if(!touches(g,node,tag)||node.actions.length<2)continue;
   const groups=g.q.loc[node.loc].mast?meanOfGroups(g,node,V):mean(g,node,V);
   sum+=best(g,node,V)-groups;n++;
  }
  return n?sum/n:0;
 };
 for(const r of result.rules)r.cost=spread(r.tag);
 result.traps=[...allTags].filter(t=>t.startsWith('trap:')).sort().map(tag=>({tag,value:rootValue(g,solveWith(g,policies.trap(g,tag))),cost:cost(tag)}));

 result.unreachable=Object.keys(q.loc).filter(id=>!g.seenLoc.has(id)&&!q.loc[id].auto.length);
 result.deadChoices=Object.values(q.loc).flatMap(l=>l.choices.filter(c=>!g.seenChoice.has(c.id)).map(c=>`${l.id}: ${c.text.slice(0,48)}`));
 result.deadEnds=[...new Set(nodes.filter(n=>!n.end&&!n.actions.length).map(n=>n.loc))];

 // Decisions: states with more than one distinct outcome set. A false choice changes nothing at all.
 let decisions=0,meaningful=0,falseChoice=0;
 const falseAt=new Set();
 for(const n of nodes){
  if(n.end||n.actions.length<2)continue;
  decisions++;
  const vals=n.actions.map(a=>qValue(g,a,V));
  if(Math.max(...vals)-Math.min(...vals)>=.05)meaningful++;
  const sets=new Set(n.actions.map(a=>a.out.map(o=>`${o.id}:${o.p.toFixed(4)}`).sort().join('/')));
  if(sets.size===1){falseChoice++;falseAt.add(n.loc);}
 }
 result.decisions=decisions;result.meaningful=decisions?meaningful/decisions:0;result.falseChoice=decisions?falseChoice/decisions:0;result.falseAt=[...falseAt];
 result.optimalRun=sample(g,V,'optimal');
 result.randomRun=sample(g,V,'random');
 const written=new Set(),read=new Set();
 const scan=src=>{if(src)for(const x of exprNames(src))if(q.defs[x])scan(q.defs[x].src);else read.add(x);};
 for(const d of q.raw?.docs||[])scan(d.when);
 for(const c of q.raw?.crit||[])scan(c.when);
 for(const l of Object.values(q.raw?.locations||{})){
  for(const p of l.text||[]){scan(p.when);for(const m of (p.text||'').matchAll(/\{([^{}|]+)/g))scan(m[1]);}
  for(const a of l.auto||[]){scan(a.when);for(const t of a.to)scan(String(t.weight));for(const f of a.fx){written.add(f.id);scan(f.value);}}
  for(const f of l.on||[]){written.add(f.id);scan(f.value);}
  for(const c of l.choices||[]){scan(c.when);scan(c.lock);for(const t of c.to)scan(String(t.weight));for(const f of c.fx){written.add(f.id);scan(f.value);}}
 }
 result.writeOnly=q.params.filter(p=>!p.internal&&!p.fmt&&written.has(p.id)&&!read.has(p.id)&&!p.ranges?.length).map(p=>p.id);
 return result;
}
