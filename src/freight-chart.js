// Night chart of the archipelago, drawn from the same data the rules use: a new port or passage
// appears here by itself. Ports carry the only bright marks, in keeping with the night scene.
import {PORTS,EDGES,neighbours} from './freight-world.js';

const TAU=Math.PI*2;
const seeded=n=>{let r=n>>>0;return ()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};
const LAND=[[104,640,150,3],[52,104,170,5],[606,86,56,8],[644,596,126,13],[372,446,58,21],[372,684,74,34]];
function blob(cx,cy,r,seed,grow=0){
 const rand=seeded(seed),a=rand()*TAU,b=rand()*TAU,c=rand()*TAU,n=36,pts=[];
 for(let i=0;i<n;i++){const t=i/n*TAU,R=(r+grow)*(1+.2*Math.sin(3*t+a)+.11*Math.sin(5*t+b)+.06*Math.sin(11*t+c));pts.push([cx+Math.cos(t)*R,cy+Math.sin(t)*R]);}
 const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2],start=mid(pts[n-1],pts[0]);
 let d=`M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
 pts.forEach((p,i)=>{const m=mid(p,pts[(i+1)%n]);d+=`Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;});
 return `${d}Z`;
}
const onLand=(x,y)=>LAND.some(([cx,cy,r])=>Math.hypot(x-cx,y-cy)<r*1.3);
function soundings(){
 const rand=seeded(77),out=[];
 for(let i=0;i<150;i++){
  const x=20+rand()*680,y=20+rand()*660;
  if(onLand(x,y))continue;
  const shoal=Math.hypot(x-404,(y-318)*1.5)<86,depth=shoal?2+Math.floor(rand()*5):14+Math.floor(rand()*70);
  out.push(`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}"${shoal?' class="shoal"':''}>${depth}</text>`);
 }
 return out.join('');
}
const edgePath=e=>`M${PORTS[e.a].x} ${PORTS[e.a].y}Q${e.via[0]} ${e.via[1]} ${PORTS[e.b].x} ${PORTS[e.b].y}`;
const midPoint=e=>[.25*PORTS[e.a].x+.5*e.via[0]+.25*PORTS[e.b].x,.25*PORTS[e.a].y+.5*e.via[1]+.25*PORTS[e.b].y];
const rose=(x,y,r)=>`<g class="rose" transform="translate(${x} ${y})">${[0,1,2,3,4,5,6,7].map(i=>`<line y2="${-(i%2?r*.55:r)}" transform="rotate(${i*45})"/>`).join('')}<circle r="${r*.28}"/><text y="${-r-6}">N</text></g>`;
const STATIC=`<rect width="720" height="700" class="water"/>${[120,240,360,480,600].map(v=>`<path class="grid" d="M${v} 0V700M0 ${v}H720"/>`).join('')}<g class="soundings">${soundings()}</g>${LAND.map(([x,y,r,s])=>`<path class="isobath" d="${blob(x,y,r,s,16)}"/>`).join('')}${LAND.map(([x,y,r,s])=>`<path class="land" d="${blob(x,y,r,s)}"/>`).join('')}<ellipse class="bank" cx="404" cy="318" rx="84" ry="56"/>${rose(486,214,34)}`;

export function renderChart(port,course=null){
 const live=new Set(neighbours(port).map(n=>n.to));
 const edges=EDGES.map(e=>{const on=e.a===port||e.b===port,[x,y]=midPoint(e);return `<path id="edge-${e.a}-${e.b}" class="edge ${on?'live':''}" d="${edgePath(e)}"/><text class="edge-name ${on?'live':''}" x="${x.toFixed(0)}" y="${(y-8).toFixed(0)}">${e.name}</text>`;}).join('');
 const ports=Object.entries(PORTS).map(([id,p])=>{
  const here=id===port,go=live.has(id);
  const attrs=go?`data-do="course" data-to="${id}" role="button" tabindex="0" aria-label="Идти ${p.to}"`:'';
  return `<g class="port ${here?'here':''} ${go?'go':''}" ${attrs}><circle class="halo" cx="${p.x}" cy="${p.y}" r="26"/><circle class="dot" cx="${p.x}" cy="${p.y}" r="${here?7:5}"/><text x="${p.x}" y="${p.y+(p.y>300?-22:32)}">${p.name}</text></g>`;
 }).join('');
 const p=PORTS[port];
 return `<svg viewBox="0 0 720 700" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Карта Архипелага, вы ${p.name}">${STATIC}${edges}${ports}<g id="boat" transform="translate(${p.x} ${p.y})"><path d="M0-11 6 8H-6Z"/></g></svg>`;
}
export function sailChart(host,from,to,done){
 const e=EDGES.find(x=>(x.a===from&&x.b===to)||(x.a===to&&x.b===from));
 const path=host.querySelector(`#edge-${e.a}-${e.b}`),boat=host.querySelector('#boat'),len=path?.getTotalLength?.()||0;
 if(!len||matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}
 const forward=e.a===from,started=performance.now(),span=1100;
 const step=now=>{
  const k=Math.min(1,(now-started)/span),s=k*k*(3-2*k),at=len*(forward?s:1-s),p=path.getPointAtLength(at),q=path.getPointAtLength(Math.min(len,Math.max(0,at+(forward?2:-2))));
  boat.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI+90})`);
  if(k<1)requestAnimationFrame(step);else done();
 };
 requestAnimationFrame(step);
}
