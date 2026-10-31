// Quests are assembled from parts: a host and encounters from the deck. Fragments keep their own ids;
// here they get a prefix, and the reserved target `exit` becomes the host location to return to.
const copy=x=>JSON.parse(JSON.stringify(x));

export function splice(host,fragment,as,exit){
 const f=copy(fragment),name=id=>id==='exit'?exit:id===f.start?as:`${as}.${id}`;
 for(const [id,L] of Object.entries(f.locations)){
  for(const a of L.auto||[])for(const t of a.to)t.id=name(t.id);
  for(const c of L.choices||[])for(const t of c.to)t.id=name(t.id);
  host.locations[name(id)]=L;
 }
 for(const p of f.params)if(!host.params.some(x=>x.id===p.id))host.params.push(p);
 Object.assign(host.defs,f.defs);
 return host;
}

// One errand is a template, an authored hook with its endings, and encounters dealt for this trip.
export function buildErrand(bundle,offer){
 const e=JSON.parse(JSON.stringify(bundle.errands[offer.errand]).replaceAll('{{to}}',offer.toName||'').replaceAll('{{from}}',offer.fromName||''));
 const q=copy(bundle.template),param=id=>q.params.find(p=>p.id===id),depart=param('t').start;
 q.id=e.id;q.title=e.title;q.brief=e.brief;q.start=e.start;q.rules=[...new Set([...e.rules,...offer.picks.flatMap(p=>bundle.deck[p].rules)])];
 if(e.legal)q.legal=e.legal;
 q.news=e.news||{};
 Object.assign(param('pl'),{label:e.cargo.label,ranges:e.cargo.ranges});
 for(const [k,v] of Object.entries(e.set||{}))param(k).start=v;
 param('legs').start=offer.picks.length;
 param('tlimit').start=depart+e.perleg*offer.picks.length;
 Object.assign(q.locations,e.locations);
 q.locations.win.on.push({id:'money',op:'+=',value:String(e.pay)});
 q.locations.soft.on.push({id:'money',op:'+=',value:String(Math.floor(e.pay/2))});
 offer.picks.forEach((pick,i)=>{
  const n=i+1;
  splice(q,bundle.deck[pick],`s${n}`,`after${n}`);
  q.locations[`slot${n}`].auto=[{when:null,to:[{id:`s${n}`}],fx:[]}];
  q.locations.helm.text.splice(n,0,{when:`radar==1 and pos==${n}`,text:`На радаре впереди: ${bundle.deck[pick].radar}`});
 });
 return q;
}
