import {makeBoat,makeSailboat} from './design-island.js';

// Same fixed authoring camera as scripts/create-harbor-art.py. Geography and
// vessels remain in world coordinates; only the viewport crop changes on mobile.
import {portProject,PORT_SCALE} from './harbor-port-layout.js';
import {portTrafficAt} from './harbor-port-traffic.js';
const TAU=Math.PI*2;
const normal=p=>{const a=p[0],b=p[1],v=p[2],x=b.map((n,i)=>n-a[i]),y=v.map((n,i)=>n-a[i]);const n=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],l=Math.hypot(...n)||1;return n.map(v=>v/l);};
const tint=(hex,k)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*k)).toString(16).padStart(2,'0')).join('');
export function createHarborIllustration(host,{getState,onFrame,revision='local',workshop=false,narrative=false,onInspect=()=>{}}){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
 host.classList.add('illustrated-port');if(narrative)host.classList.add('narrative-port');
 host.innerHTML='<img class="port-plate" src="'+new URL('../assets/harbor/old-port.svg?v='+revision,import.meta.url).href+'" alt="" draggable="false"><canvas class="port-motion" aria-hidden="true"></canvas><div class="port-labels"></div><div class="port-controls"><button type="button" data-port-control="tracks" aria-pressed="true"><span class="track-sample" aria-hidden="true"></span>Следы</button><button type="button" data-port-control="motion" aria-pressed="'+(!reduce.matches)+'">'+(reduce.matches?'Оживить порт':'Пауза в порту')+'</button></div><div class="port-legend"><span class="track-sample" aria-hidden="true"></span>След — где судно уже было<span>Местное время не меняется</span></div>';
 const plate=host.querySelector('.port-plate'),canvas=host.querySelector('canvas'),c=canvas.getContext('2d'),labels=host.querySelector('.port-labels');
 let w=0,h=0,k=1,ox=0,oy=0,last=0,raf=0,stopped=false,motion=!reduce.matches,tracks=!narrative;
 const tags=new Map();let shownShips=[];
 function tag(id,title,subtitle,kind,data={}){
  let el=tags.get(id);
  if(!el){el=document.createElement('button');el.className='port-tag '+kind;el.type='button';el.innerHTML='<span class="port-tag-mark" aria-hidden="true"></span><span><b></b><small></small></span>';labels.append(el);tags.set(id,el);}
  if(el.querySelector('b').textContent!==title)el.querySelector('b').textContent=title;
  if(el.querySelector('small').textContent!==subtitle)el.querySelector('small').textContent=subtitle;
  for(const [key,v] of Object.entries(data))el.dataset[key]=v;
  return el;
 }
 const nina=tag('nina','Нина','Мастерская','person-tag',{local:'workshop'}),mila=tag('mila','Мила','Почтовый причал','person-tag',{local:'port'}),ownTag=tag('own','«Смена»','На борт →','own-tag',{screen:'cabin'});
 nina.setAttribute('aria-current',workshop?'location':'false');mila.setAttribute('aria-current',workshop?'false':'location');
 function resize(){
  const r=host.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  if(w===r.width&&h===r.height)return;
  w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);c.setTransform(dpr,0,0,dpr,0,0);
  const mobile=w<580,box=mobile?{x:410,y:175,w:720,h:760}:{x:130,y:70,w:1200,h:940};
  k=Math.min(w/box.w,h/box.h);ox=(w-box.w*k)/2-box.x*k;oy=(h-box.h*k)/2-box.y*k;
  Object.assign(plate.style,{width:1440*k+'px',height:1000*k+'px',left:ox+'px',top:oy+'px'});
 }
 function point(x,z,y=0){const p=portProject(x,z,y);return {x:ox+p.x*k,y:oy+p.y*k,d:p.d};}
 function path(points,color,width=1,dash=[]){if(points.length<2)return;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);}
 function face(points,color,stroke=null,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function boat(ship,own,t){
  const a=ship.h*Math.PI/180,mesh=ship.type==='sail'?makeSailboat(0,0):makeBoat(0,0,0,ship.type==='cargo');
  const bob=Math.sin(t*.8+ship.x)*.012;
  const faces=mesh.map(f=>{
   let color=f.color;if(ship.paint&&['#a75a45','#526e78','#386071'].includes(color))color=ship.paint;
   const n=f.line?null:normal(f.points),points=f.points.map(([x,y,z])=>point(ship.x+(x*Math.cos(a)-z*Math.sin(a))*2.4,ship.z+(x*Math.sin(a)+z*Math.cos(a))*2.4,(y+bob)*2.4));
   return {...f,color:f.line?color:tint(color,.83+.17*Math.abs(n[1])),points,d:points.reduce((n,p)=>n+p.d,0)/points.length};
  }).sort((a,b)=>a.d-b.d);
  const p=point(ship.x,ship.z);c.fillStyle='#1e485a33';c.beginPath();c.ellipse(p.x+3,p.y+4,PORT_SCALE*k*.75,PORT_SCALE*k*.35,0,0,TAU);c.fill();
  if(ship.s>.15){const wake=[];for(const side of [-1,1]){wake.length=0;for(const [x,z] of [[side*.5,1.7],[side*.9,3],[side*1.25,4.3]])wake.push(point(ship.x+x*Math.cos(a)-z*Math.sin(a),ship.z+x*Math.sin(a)+z*Math.cos(a)));path(wake,'#e9f2df88',1);}}
  for(const f of faces){if(f.line)path(f.points,f.color,Math.max(.6,(f.width||1)*k));else face(f.points,f.color,'#254b502b',.4);}
  if(own){c.strokeStyle='#f1d69c';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y+3,26*k+7,12*k+4,0,0,TAU);c.stroke();}
 }
 function person(x,z,color,stride=0,bag=false){
  const a=point(x,z,.85),head=point(x,z,2.7),hip=point(x,z,1.35),shoulder=point(x,z,2.18),swing=Math.sin(stride)*2.3;
  c.fillStyle='#224e4c22';c.beginPath();c.ellipse(a.x+2,a.y+3,8*k,3*k,0,0,TAU);c.fill();
  path([{x:hip.x-2*k,y:hip.y},{x:a.x-3*k+swing*k,y:a.y}], '#3b4f53',3*k);
  path([{x:hip.x+2*k,y:hip.y},{x:a.x+3*k-swing*k,y:a.y}], '#3b4f53',3*k);
  path([shoulder,hip],color,9*k);path([{x:shoulder.x-4*k,y:shoulder.y+2*k},{x:hip.x-6*k,y:hip.y-1*k-swing*k}],color,3*k);
  path([{x:shoulder.x+4*k,y:shoulder.y+2*k},{x:hip.x+6*k,y:hip.y-1*k+swing*k}],color,3*k);
  c.fillStyle='#dcb88a';c.beginPath();c.arc(head.x,head.y,3.7*k,0,TAU);c.fill();
  c.fillStyle='#595845';c.beginPath();c.ellipse(head.x,head.y-2*k,4*k,2.3*k,0,Math.PI,TAU);c.fill();
  if(bag)c.fillStyle='#c2a16e',c.fillRect(hip.x+3*k,hip.y-1*k,8*k,7*k);
 }
 function scenery(t,state){
  person(-24,16,'#a96749');person(-32,1,'#486a78');
  // A complete walk under the awning and back, with a continuous turnaround.
  const f=(1-Math.cos(t*.22))/2,walk=Math.sin(t*.22),x=-27.6+f*1.9,z=18-f*5;
  person(x,z,'#727a57',t*4*Math.abs(walk),f>.08&&f<.94);
  person(-40.8,25.3,'#b3a274',Math.sin(t*.4)*.3);
  for(let i=0;i<5;i++){
   const age=(t*.05+i/5)%1,p=point(-44.7+age*.9,10.2+age*.7,6.9+age*4),opacity=Math.sin(age*Math.PI)**2*.2;
   c.fillStyle='rgba(239,232,208,'+opacity+')';c.beginPath();c.ellipse(p.x,p.y,(3+age*9)*k,(4+age*7)*k,0,0,TAU);c.fill();
  }
  const foot=point(-23.5,21,.8),top=point(-23.5,21,5.5);path([foot,top],'#6f7561',1.6*k);
  face([top,{x:top.x+23*k,y:top.y+4*k+Math.sin(t*1.7)*2*k},{x:top.x+18*k,y:top.y+14*k},{x:top.x,y:top.y+12*k}],'#b6744d');
  // A gull circles continuously above land; no endpoint jump.
  const a=t*.032,p=point(-40+Math.cos(a)*7,8+Math.sin(a)*9,9),wing=Math.sin(t*2.4)*3*k;
  path([{x:p.x-7*k,y:p.y+wing},{x:p.x-3*k,y:p.y-1*k},p,{x:p.x+3*k,y:p.y-1*k},{x:p.x+7*k,y:p.y+wing}],'#e4dfc7',1.5*k);
  if(state.portSchedule){const p=point(-28.4,15,2.5);c.fillStyle='#e6d8b6';c.fillRect(p.x-13*k,p.y-15*k,26*k,30*k);path([{x:p.x-9*k,y:p.y-6*k},{x:p.x+9*k,y:p.y-6*k}],'#647769',1);}
 }
 function placeTag(el,p,dx,dy,occupied,critical=true){
  const rect={w:el.offsetWidth||150,h:el.offsetHeight||50};let found=null;
  for(const [sx,sy] of [[dx,dy],[dx,dy-65],[dx,dy+65],[-rect.w/2,45]]){
   const q={x:Math.max(12,Math.min(w-rect.w-12,p.x+sx)),y:Math.max(144,Math.min(h-104-rect.h,p.y+sy)),...rect};
   if(!occupied.some(a=>q.x<a.x+a.w+8&&q.x+q.w+8>a.x&&q.y<a.y+a.h+8&&q.y+q.h+8>a.y)){found=q;break;}
  }
  if(!found&&!critical){el.hidden=true;return;}
  const q=found||{x:Math.max(8,Math.min(w-rect.w-8,p.x+dx)),y:Math.max(145,Math.min(h-100-rect.h,p.y+dy)),...rect};
  el.hidden=false;el.style.transform='translate('+q.x+'px,'+q.y+'px)';occupied.push(q);
  path([p,{x:Math.max(q.x+12,Math.min(q.x+q.w-12,p.x)),y:q.y>p.y?q.y:q.y+q.h}],'#e9eed0b3',1);
  c.fillStyle='#f2e4b9';c.beginPath();c.arc(p.x,p.y,2.3,0,TAU);c.fill();
 }
 function draw(now){
  if(stopped)return;resize();const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(!document.hidden)onFrame(motion&&!reduce.matches?dt:0);if(stopped)return;
  const state=getState(),t=state.sceneryClock||0;c.clearRect(0,0,w,h);
  const vessels=[state.own,...portTrafficAt(t),...state.traffic.filter(ship=>ship.id==='nina-yacht')].filter(ship=>{const p=point(ship.x,ship.z);return p.x>-80&&p.x<w+80&&p.y>100&&p.y<h-60;});
  shownShips=vessels;
  if(tracks)for(const ship of vessels){const trail=ship.trail.map(p=>point(p.x,p.z));path(trail,'#234d57aa',4);path(trail,'#f0efcf',1.6);}
  const own=state.own;
  c.save();c.beginPath();c.rect(ox,oy,1440*k,1000*k);c.clip();
  if(own.s<.05){for(const [x,z] of [[-21.5,18],[-21.5,21.2]])path([point(x,z,.9),point(own.x-.4,own.z+.7,.5)],'#d4c89b',1);}
  for(const ship of vessels.sort((a,b)=>point(a.x,a.z).d-point(b.x,b.z).d))boat(ship,ship===state.own,t);
  c.restore();scenery(t,state);
  if(!narrative){
  const occupied=[];
  placeTag(nina,point(-32,1,2.6),w<580?-120:-150,-85,occupied);
  placeTag(mila,point(-24,16,2.7),w<580?10:26,-75,occupied);
  placeTag(ownTag,point(own.x,own.z,.8),w<580?-94:18,39,occupied);
  let count=0;
  for(const ship of vessels.filter(s=>s!==own)){
   const p=point(ship.x,ship.z,.6);if(p.y<165||p.x<16||p.x>w-20||p.y>h-180||count>=2)continue;
   const el=tag(ship.id,'«'+ship.name+'»',ship.type==='sail'?'Парусная яхта':'Судно на ходу','traffic-tag',{portContact:ship.id});el.dataset.frame=String(now);
   placeTag(el,p,-60,-68,occupied,false);if(!el.hidden)count++;
  }
  for(const [id,el] of tags)if(!['nina','mila','own'].includes(id)&&el.dataset.frame!==String(now))el.hidden=true;
  }
  raf=requestAnimationFrame(draw);
 }
 host.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.portControl==='tracks'){tracks=!tracks;b.setAttribute('aria-pressed',tracks);host.querySelector('.port-legend').hidden=!tracks;}
  if(b.dataset.portControl==='motion'){motion=!motion;b.setAttribute('aria-pressed',motion);b.textContent=motion?'Пауза в порту':'Оживить порт';}
  if(b.dataset.portContact){const ship=shownShips.find(s=>s.id===b.dataset.portContact);if(ship)onInspect(ship);}
 },{signal:abort.signal});
 reduce.addEventListener('change',()=>{motion=!reduce.matches;const b=host.querySelector('[data-port-control="motion"]');b.setAttribute('aria-pressed',motion);b.textContent=motion?'Пауза в порту':'Оживить порт';},{signal:abort.signal});
 raf=requestAnimationFrame(draw);
 return {destroy(){stopped=true;cancelAnimationFrame(raf);abort.abort();}};
}
