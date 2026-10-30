// Reads the old dialogue packages into the same model, so before and after are measured by one ruler.
export function fromLegacy(old){
 const locations={},used=new Set();
 for(const [id,n] of Object.entries(old.nodes||{})){
  const choices=(n.choices||[]).map(c=>{
   const fx=Object.entries(c.set||{}).map(([k,v])=>{used.add(k);return {id:k,op:'=',value:String(+v)};});
   const tags=[];if(typeof c.correct==='boolean'){tags.push(`r${c.rule}`);tags.push(c.correct?'good':`trap:${c.id}`);}
   return {text:c.text,fx,tags,notes:[],to:[{id:c.next}]};
  });
  locations[id]={text:(n.text||[]).map(text=>({text})),choices,auto:[],on:[],notes:[]};
  if(n.ending)locations[id].end='win';
 }
 return {id:old.id,title:old.title,rules:old.rules||[],params:[...used].map(id=>({id,label:id,min:0,max:1,start:0,hidden:true})),defs:{},crit:[],locations,start:old.entry,mast:{}};
}
