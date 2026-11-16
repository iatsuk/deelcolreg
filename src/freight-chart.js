// Night chart of the archipelago, drawn from the same data the rules use: a new port or passage
// appears here by itself. Ports carry the only bright marks, in keeping with the night scene.
import {PORTS,EDGES,neighbours} from './freight-world.js';

const TAU=Math.PI*2;
const seeded=n=>{let r=n>>>0;return ()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};
const LAND=[[104,640,150,3],[52,104,170,5],[606,86,56,8],[644,596,126,13],[372,446,58,21],[372,684,74,34]];
// An island is a wobbling circle: its radius by bearing from the centre. The outline and the land test share it.
function coast(r,seed){
 const rand=seeded(seed),a=rand()*TAU,b=rand()*TAU,c=rand()*TAU;
 return t=>r*(1+.2*Math.sin(3*t+a)+.11*Math.sin(5*t+b)+.06*Math.sin(11*t+c));
}
function blob(cx,cy,r,seed,grow=0){
 const radius=coast(r+grow,seed),n=36,pts=[];
 for(let i=0;i<n;i++){const t=i/n*TAU,R=radius(t);pts.push([cx+Math.cos(t)*R,cy+Math.sin(t)*R]);}
 const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2],start=mid(pts[n-1],pts[0]);
 let d=`M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
 pts.forEach((p,i)=>{const m=mid(p,pts[(i+1)%n]);d+=`Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;});
 return `${d}Z`;
}
const nearLand=(x,y)=>LAND.some(([cx,cy,r])=>Math.hypot(x-cx,y-cy)<r*1.3);
const COASTS=LAND.map(([cx,cy,r,seed])=>({cx,cy,radius:coast(r,seed)}));
export const onLand=(x,y,clearance=0)=>COASTS.some(c=>Math.hypot(x-c.cx,y-c.cy)<c.radius(Math.atan2(y-c.cy,x-c.cx))+clearance);
function soundings(){
 const rand=seeded(77),out=[];
 for(let i=0;i<150;i++){
  const x=20+rand()*680,y=20+rand()*660;
  if(nearLand(x,y))continue;
  const shoal=Math.hypot(x-404,(y-318)*1.5)<86,depth=shoal?2+Math.floor(rand()*5):14+Math.floor(rand()*70);
  out.push(`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}"${shoal?' class="shoal"':''}>${depth}</text>`);
 }
 return out.join('');
}
// A passage runs through its waypoints as a Catmull-Rom spline: straight legs in open water, rounded where the helm goes over.
function legs(e){
 const p=[PORTS[e.a],...e.via.map(([x,y])=>({x,y})),PORTS[e.b]];
 return p.slice(0,-1).map((a,i)=>{const b=p[i+1],z=p[i-1]||a,c=p[i+2]||b;return [a,{x:a.x+(b.x-z.x)/6,y:a.y+(b.y-z.y)/6},{x:b.x-(c.x-a.x)/6,y:b.y-(c.y-a.y)/6},b];});
}
const edgePath=e=>legs(e).map(([a,c1,c2,b],i)=>`${i?'':`M${a.x} ${a.y}`}C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x} ${b.y}`).join('');
const bezier=(a,c1,c2,b,t)=>{const u=1-t,k=[u*u*u,3*u*u*t,3*u*t*t,t*t*t];return {x:k[0]*a.x+k[1]*c1.x+k[2]*c2.x+k[3]*b.x,y:k[0]*a.y+k[1]*c1.y+k[2]*c2.y+k[3]*b.y};};
export const track=e=>legs(e).flatMap(leg=>[0,1,2,3,4,5,6,7].map(k=>bezier(...leg,k/8))).concat(PORTS[e.b]);
const rose=(x,y,r)=>`<g class="rose" transform="translate(${x} ${y})">${[0,1,2,3,4,5,6,7].map(i=>`<line y2="${-(i%2?r*.55:r)}" transform="rotate(${i*45})"/>`).join('')}<circle r="${r*.28}"/><text y="${-r-6}">N</text></g>`;
const STATIC=`<rect width="720" height="700" class="water"/>${[120,240,360,480,600].map(v=>`<path class="grid" d="M${v} 0V700M0 ${v}H720"/>`).join('')}<g class="soundings">${soundings()}</g>${LAND.map(([x,y,r,s])=>`<path class="isobath" d="${blob(x,y,r,s,16)}"/>`).join('')}${LAND.map(([x,y,r,s])=>`<path class="land" d="${blob(x,y,r,s)}"/>`).join('')}<ellipse class="bank" cx="404" cy="318" rx="84" ry="56"/>${rose(486,214,34)}`;

export function renderChart(port,course=null){
 const live=new Set(neighbours(port).map(n=>n.to));
 const edges=EDGES.map(e=>{const on=e.a===port||e.b===port,t=track(e),{x,y}=t[t.length>>1];return `<path id="edge-${e.a}-${e.b}" class="edge ${on?'live':''}" d="${edgePath(e)}"/><text class="edge-name ${on?'live':''}" x="${x.toFixed(0)}" y="${(y-8).toFixed(0)}">${e.name}</text>`;}).join('');
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
