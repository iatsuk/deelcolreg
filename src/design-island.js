import { watchFrame, toIslandPosition, toSceneryPoint, proposedWatchTrack, ISLAND_SEA, WATCH_SHIPS } from './design-encounter.js';
// Original polygon scene. All surfaces, boats, lights and camera motion are
// rendered here; no generated background or borrowed model is used.
const TAU=Math.PI*2;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function tint(hex,n){const c=rgb(hex);return `rgb(${c.map(v=>Math.round(Math.min(255,v*n))).join(',')})`;}
function face(points,color,edge=true,alpha=1){return {points,color,edge,alpha};}
function box(out,x,y,z,w,h,d,color){
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];
 const up=p=>[p[0],p[1]+h,p[2]];
 out.push(face([a,b,c,e],color),face([up(a),up(e),up(c),up(b)],color),face([a,up(a),up(b),b],color),face([b,up(b),up(c),c],color),face([c,up(c),up(e),e],color),face([e,up(e),up(a),a],color));
}
function cylinder(out,x,y,z,r,h,color,n=12,topR=r){
 const low=[],top=[];for(let i=0;i<n;i++){const a=i/n*TAU;low.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);top.push([x+Math.cos(a)*topR,y+h,z+Math.sin(a)*topR]);}
 out.push(face([...top].reverse(),color));for(let i=0;i<n;i++)out.push(face([low[i],top[i],top[(i+1)%n],low[(i+1)%n]],color));
}
function cone(out,x,y,z,r,h,color,n=12){cylinder(out,x,y,z,r,h,color,n,.01);}
function wire(out,points,color='#354c4c',width=1,alpha=1){out.push({points,color,line:true,width,alpha});}
function roof(out,x,y,z,w,h,d,color){
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],m=[x,y+h,z-d/2],n=[x,y+h,z+d/2];
 out.push(face([a,m,b],color),face([e,c,n],color),face([a,e,n,m],color),face([m,n,c,b],color));
 wire(out,[m,n],'#293d41',1.3);
}
function rock(out,x,y,z,r,h=1,color='#89958a',seed=1){
 const ring=[];for(let i=0;i<7;i++){const a=i/7*TAU;const rr=r*(1+.13*Math.sin(i*4+seed));ring.push([x+Math.cos(a)*rr,y+h*(.28+.1*Math.sin(i+seed)),z+Math.sin(a)*rr]);}
 const top=[x+r*.1,y+h,z-r*.1];for(let i=0;i<7;i++){const next=ring[(i+1)%7];out.push(face([ring[i],next,top],color));out.push(face([[ring[i][0],y-.1,ring[i][2]],ring[i],next,[next[0],y-.1,next[2]]],color));}
}
function tree(out,x,y,z,size=1){cylinder(out,x,y,z,.07*size,.9*size,'#8b7760',6);cone(out,x,y+.4*size,z,.43*size,1.05*size,'#537667',7);cone(out,x,y+.9*size,z,.32*size,.9*size,'#66866c',7);}
function house(out,x,y,z,w=1.65,d=1.35){
 box(out,x,y,z,w,.95,d,'#e1dfc9');roof(out,x,y+.97,z,w+.25,.6,d+.25,'#465765');
 for(const dx of [-.5,0,.5]){box(out,x+dx,y+.35,z+d/2+.015,.28,.36,.035,'#d2ac5d');wire(out,[[x+dx,y+.35,z+d/2+.04],[x+dx,y+.7,z+d/2+.04]],'#46606a',.8);}
 box(out,x+w/2+.01,y+.1,z,.035,.63,.4,'#696d65');box(out,x+.42,y+1.24,z-.25,.2,.65,.22,'#9a9c90');
}
export function buildIslandScene(environment='island'){
 // The sea slab is an underlay, not another surface in the object sort.
 // A single average depth for its large top face hides the far shore.
 const base=[],out=[],{minX,maxX,minZ,maxZ}=ISLAND_SEA;
 box(base,0,-1.25,0,maxX-minX,.65,maxZ-minZ,'#8e8673');box(base,0,-.6,0,maxX-minX,.5,maxZ-minZ,'#568398');
 for(const yy of [-1.12,-.97,-.79,-.49,-.3])wire(base,[[minX,yy,maxZ],[maxX,yy,maxZ],[maxX,yy,minZ]],yy<-.6?'#766f61':'#83a1ad',.7,.8);
 const water=face([[minX,-.09,minZ],[maxX,-.09,minZ],[maxX,-.09,maxZ],[minX,-.09,maxZ]],'#6399ae');base.push(water);
 if(environment!=='island')return {base,objects:buildVoyageShore(environment)};
 const island=[];for(let i=0;i<17;i++){const a=i/17*TAU,rad=1+.12*Math.sin(i*3.4);island.push([-.9+Math.cos(a)*3.25*rad,.75+.2*Math.sin(i*2.1),-.55+Math.sin(a)*1.85*rad]);}
 for(let i=0;i<island.length;i++){const p=island[i],q=island[(i+1)%island.length];out.push(face([p,q,[-1,1.04,-.6]],'#92a67c'));out.push(face([[p[0],-.1,p[2]],p,q,[q[0],-.1,q[2]]],'#92998a'));}
 for(let i=0;i<23;i++){const a=i/23*TAU,rr=1+.08*Math.sin(i);rock(out,-.9+Math.cos(a)*3.3*rr,-.05,-.55+Math.sin(a)*1.9*rr,.35+.14*Math.sin(i*4),.45+(i%4)*.1,'#939b90',i);}
 for(const [x,z,r] of [[-4.7,1.5,.55],[3.2,-2.3,.4],[-4.2,-2.7,.4],[4.6,2.1,.28]])rock(out,x,-.1,z,r,r*.9,'#899b98',x);
 for(let i=0;i<7;i++)box(out,-1.6+i*.48,.95,1.1-i*.04,.39,.05,.34,'#d0c9a8');
 cylinder(out,-2.25,1,-.7,.68,.16,'#d8dac8',12);
 let y=1.16;for(let i=0;i<6;i++){cylinder(out,-2.25,y,-.7,.44-i*.019,.62,i%2?'#ad5a49':'#e4e1cb',12,.44-(i+1)*.019);y+=.62;}
 cylinder(out,-2.25,y,-.7,.49,.12,'#354b52',16);cylinder(out,-2.25,y+.12,-.7,.34,.65,'#c9ae69',12);cone(out,-2.25,y+.78,-.7,.56,.42,'#9b594a',12);
 cylinder(out,-2.25,y+.72,-.7,.54,.04,'#304852',16);cone(out,-2.25,y+1.22,-.7,.035,.26,'#35474e',8);
 for(let i=0;i<12;i++){const a=i/12*TAU,x=-2.25+Math.cos(a)*.48,z=-.7+Math.sin(a)*.48;wire(out,[[x,y+.08,z],[x,y+.43,z]],'#344b51',1);}
 const rail=[];for(let i=0;i<=24;i++){const a=i/24*TAU;rail.push([-2.25+Math.cos(a)*.49,y+.43,-.7+Math.sin(a)*.49]);}wire(out,rail,'#344b51',1.2);
 for(let i=0;i<4;i++)box(out,-2.25,1.8+i*.68,-.7+.39-i*.02,.16,.23,.025,'#40585f');
 house(out,.05,1.05,-.65,1.8,1.4);box(out,1.8,.4,.35,.66,.7,.9,'#7a8680');roof(out,1.8,1.1,.35,.85,.4,1.05,'#4f646c');
 for(let i=0;i<7;i++)box(out,2.25+i*.22,.65-i*.095,.62,.26,.12,.65,'#beb596');
 box(out,3.9,.02,.65,1.8,.12,.72,'#a88d69');for(let i=0;i<15;i++)wire(out,[[3+i*.12,.15,.28],[3+i*.12,.15,1.02]],'#6a6f60',.7);
 for(const x of [3.15,4.65])for(const z of [.35,.93])cylinder(out,x,-.16,z,.055,.45,'#687567',6);
 for(const [x,z,size] of [[-3.1,-1.5,.75],[-3.8,-.5,.6],[.5,-1.5,.7],[1.2,-1.1,.5]])tree(out,x,.93,z,size);
 for(let i=0;i<13;i++){const x=-1.6+i*.25,z=-1.93+.11*Math.sin(i*.4);box(out,x,1,z,.055,.38,.055,'#d1d1b7');if(i)wire(out,[[x-.25,1.28,z-.03],[x,1.28,z]],'#bcc5a8',1.2);}
 cylinder(out,.9,1.01,.7,.11,1.1,'#55666a',8);box(out,.9,2.09,.7,.24,.26,.24,'#e5c575');cone(out,.9,2.36,.7,.17,.15,'#455b60',8);
 return {base,objects:out.map(f=>({...f,points:f.points.map(toSceneryPoint)}))};
}
function makeBoat(x,z,heading=0,cargo=false,bob=0){
 const dimensions=cargo?WATCH_SHIPS.target:WATCH_SHIPS.own;
 const out=[],col=cargo?'#b86c4e':'#e5dfc8',w=dimensions.halfBeam,l=dimensions.length,y=.05+bob;
 const hull=[[-w,-l*.35],[-w*.8,-l*.62],[0,-l*.79],[w*.8,-l*.62],[w,l*.42],[w*.7,l*.55],[-w*.7,l*.55]];
 const low=hull.map(([xx,zz])=>[xx*.85,y,zz*.9]),top=hull.map(([xx,zz])=>[xx,y+.24,zz]);
 out.push(face(top,col));for(let i=0;i<top.length;i++)out.push(face([low[i],top[i],top[(i+1)%top.length],low[(i+1)%top.length]],cargo?'#a75a45':'#526e78'));
 box(out,0,y+.25,cargo?-.15:0,w*1.45,.32,l*.33,'#e7e2cf');box(out,0,y+.51,cargo?-.15:0,w*1.49,.08,l*.35,'#446476');
 for(const side of [-1,1])box(out,side*w*.73,y+.36,cargo?-.15:0,.018,.1,l*.2,'#365560');
 cylinder(out,0,y+.55,-.15,.018,.67,'#54656b',6);wire(out,[[-.17,y+.98,-.15],[.17,y+.98,-.15]],'#3f565c',.8);
 if(cargo){for(const dx of [-.13,.13])box(out,dx,y+.25,.45,.21,.18,.3,'#7a8a72');}else box(out,0,y+.26,.38,.28,.08,.25,'#91a294');
 for(const side of [-1,1]){wire(out,[[side*w*.8,y+.32,.4],[side*w*.85,y+.32,-.3]],'#d6d6bb',.8);cylinder(out,side*w,y+.14,.19,.05,.08,'#40525a',8);}
 const a=heading*Math.PI/180;
 for(const f of out)f.points=f.points.map(([xx,yy,zz])=>[x+xx*Math.cos(a)-zz*Math.sin(a),yy,z+xx*Math.sin(a)+zz*Math.cos(a)]);
 return out;
}
function normal(points){const a=points[0],b=points[1],c=points[2],u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;return n.map(v=>v/l);}
export function createIsland(canvas,{onInspect=()=>{},getState=()=>({}),camera=null,environment='island'}={}){
 const c=canvas.getContext('2d'),world=buildIslandScene(environment),abort=new AbortController();
 let raf=0,w=0,h=0,drawH=0,scale=1,yaw=-.75,elevation=.57,zoom=1,drag=null,moved=false,hover=null;
 if(camera){yaw=camera.yaw;elevation=camera.elevation;zoom=camera.zoom;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const spots=getState().hotspots??[{id:'record',p:[5,.7,-.65],label:'ИСТОРИЯ ВСТРЕЧИ'},{id:'conditions',p:toSceneryPoint([-2.25,5.7,-.7]),label:'РАЙОН ВСТРЕЧИ'},{id:'voice',p:toSceneryPoint([3.8,.4,.7]),label:'СВЯЗЬ С МОСТИКОМ'}];
 function project(p){const x=p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),z=p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);return {x:w*.51+x*scale,y:drawH*.57+(z*Math.sin(elevation)-p[1]*Math.cos(elevation))*scale,d:z*Math.cos(elevation)+p[1]*Math.sin(elevation)};}
 function size(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(w!==r.width||h!==r.height){w=r.width;h=r.height;canvas.width=w*dpr;canvas.height=h*dpr;}c.setTransform(dpr,0,0,dpr,0,0);drawH=h-(getState().reservedHeight??(getState().id==='watch'?(w<600?132:104):0));scale=Math.min(w/19,drawH/13.9)*zoom;}
 function render(now){
  size();if(!w||!h){raf=requestAnimationFrame(render);return;}
  const t=reduced?0:now/1000,state=getState();c.clearRect(0,0,w,h);
  c.fillStyle='#dae3e3';c.fillRect(0,0,w,h);
  const shadow=c.createRadialGradient(w*.5,h*.74,1,w*.5,h*.74,w*.39);shadow.addColorStop(0,'#677c7d33');shadow.addColorStop(1,'#677c7d00');c.fillStyle=shadow;c.save();c.translate(0,h*.3);c.scale(1,.62);c.fillRect(0,0,w,h*1.6);c.restore();
  const frames=[...world.objects],waterMarks=[],navMarks=[];
  const meeting=watchFrame(state.observationIndex),custom=state.encounter;
  const vessels=custom?custom.ships.map(s=>({...s})):null;
  const own=custom?vessels[0]:toIslandPosition(meeting.own),target=custom?(vessels[1]||own):toIslandPosition(meeting.target);
  if(custom){for(const ship of vessels){if(ship.radar)continue;frames.push(...(ship.sail?makeSailboat(ship.x,ship.z,ship.heading,Math.sin(t*1.5)*.018):makeBoat(ship.x,ship.z,ship.heading,ship.cargo,Math.sin(t*1.5)*.018)));if(ship.mooring){wire(frames,[[ship.x-.3,.3,ship.z-.15],[ship.x-.6,.2,-.49]],'#877457',1);wire(frames,[[ship.x+.4,.3,ship.z-.15],[ship.x+.6,.2,-.49]],'#877457',1);}if(ship.lights)ship.lights.forEach((col,i)=>frames.push(face([[ship.x-.06,1.45-i*.22,ship.z],[ship.x+.06,1.45-i*.22,ship.z],[ship.x+.06,1.57-i*.22,ship.z],[ship.x-.06,1.57-i*.22,ship.z]],col,false)));}}else frames.push(...makeBoat(own.x,own.z,0,false,Math.sin(t*1.5)*.018),...makeBoat(target.x,target.z,0,true,Math.cos(t*1.7)*.019));
  spots[0].p=[own.x,.7,own.z];
  const atWater=p=>{const q=toIslandPosition(p);return [q.x,-.035,q.z];};
  const arrow=(points,color,width=1.8,dash=[])=>{
   const a=points.at(-2),b=points.at(-1),dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l;
   wire(navMarks,points,color,width);navMarks.at(-1).dash=dash;
   wire(navMarks,[[b[0]-ux*.32-uz*.18,b[1],b[2]-uz*.32+ux*.18],b,[b[0]-ux*.32+uz*.18,b[1],b[2]-uz*.32-ux*.18]],color,width);
  };
  if(custom){for(const ship of vessels){const points=(ship.track||[]).map(([x,z])=>[x,-.035,z]);if(points.length>1){wire(navMarks,points,'#365f73',4,.55);wire(navMarks,points,'#f0efcd',2);}if(!ship.stopped&&!ship.radar){const a=ship.heading*Math.PI/180;arrow([[ship.x,-.035,ship.z],[ship.x+Math.sin(a)*1.15,-.035,ship.z-Math.cos(a)*1.15]],'#e7efdf');}}}
  else if(state.id==='watch'){
   for(const track of [meeting.ownTrack,meeting.targetTrack]){const points=track.map(atWater);wire(navMarks,points,'#365f73',4,.55);wire(navMarks,points,'#f0efcd',2);}
   for(const boat of [own,target])arrow([[boat.x,-.035,boat.z],[boat.x,-.035,boat.z-2.25]],'#e7efdf');
   if(state.showProposal&&meeting.index===2)arrow(proposedWatchTrack().map(atWater),'#fbd08a',2.8,[7,5]);
  }
  if(custom){arrow([[-5.3,-.03,4.4],[-5.3,-.03,3.2]],'#3e6671',1.5);}
  const smoke=[];for(let i=0;i<3;i++)rock(smoke,.48+.08*Math.sin(t+i),2.8+i*.33+((t*.13)% .33),-.9,.12+i*.02,.18,'#e5e7d8',i);frames.push(...smoke.map(f=>({...f,points:f.points.map(toSceneryPoint)})));
  const waves=[];
  for(let x=-6.5;x<6.8;x+=.72)for(let z=-5.4;z<5.4;z+=.8){if(((x+3.298)/(3.95*.72))**2+((z+2.146)/(2.4*.72))**2<1)continue;const off=Math.sin(z*5+x*3)*.18,yy=-.066+Math.sin(t*1.4+x+z)*.008;wire(waves,[[x+off,yy,z],[x+.08+off,yy,z+.04],[x+.2+off,yy,z],[x+.29+off,yy,z+.04]],'#afd0d3',.7,.75);}
  waterMarks.push(...waves);
  for(const boat of (custom?vessels.filter(s=>!s.stopped&&!s.radar):[own,target]))for(const side of [-1,1]){const a=(boat.heading||0)*Math.PI/180,trail=[[side*.18,.55],[side*.3,.9],[side*.45,1.25]].map(([x,z])=>[boat.x+x*Math.cos(a)-z*Math.sin(a),-.04,boat.z+x*Math.sin(a)+z*Math.cos(a)]);wire(waterMarks,trail,'#d1e1d7',1,.6);}
  const beamAngle=t*.35,source=[-2.25,5.55,-.7],end=[source[0]+Math.cos(beamAngle)*6,1,source[2]+Math.sin(beamAngle)*6];
  if(environment==='island')frames.push(face([source,[end[0]+Math.sin(beamAngle)*.45,end[1],end[2]-Math.cos(beamAngle)*.45],[end[0]-Math.sin(beamAngle)*.45,end[1],end[2]+Math.cos(beamAngle)*.45]].map(toSceneryPoint),'#f7d67e',false,.12));
  else if(environment==='beacon'||environment==='fog'){const a=[-4.3,5,-3],b=[a[0]+Math.cos(beamAngle)*5,.1,a[2]+Math.sin(beamAngle)*5];frames.push(face([a,[b[0],b[1],b[2]-.4],[b[0],b[1],b[2]+.4]],'#f7d67e',false,.12));}
  const depthOrder=items=>items.map(f=>({...f,projected:f.points.map(project)})).sort((a,b)=>a.projected.reduce((s,p)=>s+p.d,0)/a.projected.length-b.projected.reduce((s,p)=>s+p.d,0)/b.projected.length);
  const faces=[...depthOrder(world.base),...depthOrder(waterMarks),...depthOrder(navMarks),...depthOrder(frames)];
  for(const f of faces){c.globalAlpha=f.alpha??1;c.beginPath();f.projected.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(f.line){c.setLineDash(f.dash||[]);c.strokeStyle=f.color;c.lineWidth=f.width;c.stroke();c.setLineDash([]);}else{c.closePath();const n=normal(f.points),light=.77+.23*Math.abs(n[1])+.1*(n[0]*-.6+n[2]*-.5);c.fillStyle=tint(f.color,light);c.fill();if(f.edge){c.strokeStyle='#30434b99';c.lineWidth=.45;c.stroke();}}}
  c.globalAlpha=1;
  if(custom){const n=project([-5.3,.05,2.9]);c.font='10px Golos,sans-serif';c.textAlign='center';c.fillStyle='#3f6570';c.fillText('N',n.x,n.y);}
  if(custom?.fog){c.fillStyle='#e5e9e5b8';c.fillRect(0,0,w,h);}
  if(custom)for(const ship of vessels){const p=project([ship.x,.55,ship.z]);if(ship.radar){c.strokeStyle='#476b72';c.lineWidth=1;c.setLineDash([3,3]);c.beginPath();c.arc(p.x,p.y,13,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle='#476b72';c.fillRect(p.x-2,p.y-2,4,4);}const side=ship===own?1:-1,x=p.x+side*48,y=p.y+(side===1?30:-32);c.strokeStyle='#5d7c7d88';c.beginPath();c.moveTo(p.x,p.y+7);c.lineTo(x,y);c.stroke();c.font='9px Golos,sans-serif';c.textAlign='center';const labelWidth=c.measureText?c.measureText(ship.name).width+16:110;c.fillStyle='#edf0e6ed';c.fillRect(x-labelWidth/2,y-9,labelWidth,19);c.fillStyle='#3f6266';c.fillText(ship.name,x,y+4);}
  else if(state.id==='watch')for(const [name,boat,side] of [['СМЕНА',own,1],['МАРТА',target,-1]]){const p=project([boat.x,.45,boat.z]),x=p.x+side*46,y=p.y+(side===1?30:-34);c.strokeStyle='#5d7c7d88';c.lineWidth=.7;c.beginPath();c.moveTo(p.x,p.y+7);c.lineTo(x,y+(side===1?-9:10));c.stroke();c.font='10px Golos,sans-serif';c.textAlign='center';c.fillStyle='#edf0e6e6';c.fillRect(x-31,y-9,62,19);c.fillStyle='#3f6266';c.fillText(name,x,y+4);}
  for(let i=0;i<3;i++){const b=project(toSceneryPoint([2.7+Math.sin(t*.1+i)*1.5,3.5+i*.4,-2.8+Math.cos(t*.1+i)*.4]));c.strokeStyle='#506e76';c.lineWidth=1;c.beginPath();c.moveTo(b.x-6,b.y+Math.sin(t*2+i)*2);c.quadraticCurveTo(b.x-3,b.y-2,b.x,b.y+1);c.quadraticCurveTo(b.x+3,b.y-2,b.x+6,b.y+Math.sin(t*2+i)*2);c.stroke();}
  for(const spot of spots){const p=project(spot.p),active=hover===spot.id;c.fillStyle=active?'#213f43':'#f1f1e9';c.strokeStyle='#344e5480';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,active?12:8,0,TAU);c.fill();c.stroke();c.strokeStyle=active?'#e8e8d4':'#4c6769';c.lineWidth=1;c.beginPath();c.moveTo(p.x-3,p.y);c.lineTo(p.x+3,p.y);c.moveTo(p.x,p.y-3);c.lineTo(p.x,p.y+3);c.stroke();if(active){c.font='9px Golos,sans-serif';c.textAlign='center';c.fillStyle='#29454a';c.fillText(spot.label,p.x,p.y-20);}}
  raf=requestAnimationFrame(render);
 }
 const pos=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,elevation};moved=false;canvas.setPointerCapture(e.pointerId);},{signal:abort.signal});
 canvas.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;yaw=drag.yaw+dx*.006;elevation=Math.max(.3,Math.min(.92,drag.elevation+dy*.003));}const p=pos(e);hover=spots.find(s=>{const q=project(s.p);return Math.hypot(q.x-p.x,q.y-p.y)<20;})?.id;canvas.style.cursor=hover?'pointer':drag?'grabbing':'grab';},{signal:abort.signal});
 canvas.addEventListener('pointerup',e=>{if(!moved){const p=pos(e),hit=spots.find(s=>{const q=project(s.p);return Math.hypot(q.x-p.x,q.y-p.y)<24;});if(hit)onInspect(hit.id);}drag=null;},{signal:abort.signal});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.7,Math.min(1.4,zoom-e.deltaY*.0006));},{signal:abort.signal,passive:false});
 raf=requestAnimationFrame(render);
 return {getCamera(){return {yaw,elevation,zoom};},destroy(){cancelAnimationFrame(raf);abort.abort();},reset(){yaw=-.75;elevation=.57;zoom=1;}};
}

function buildVoyageShore(environment){
 const o=[];
 // All solid shore geometry stays west of the traffic area.
 if(environment==='harbor'||environment==='village'){
  box(o,-4.25,-.06,-1.8,4.1,.75,6.4,'#879b81');
  box(o,-1.98,.02,-1.8,.42,.55,6.4,'#a69d88');
  for(const z of [-3.8,-1.8,.2])house(o,-4.25,.7,z,1.45,1.2);
  if(environment==='harbor'){
   for(const z of [-3.7,-.5]){box(o,-2.7,.72,z,1.05,.7,1.2,'#b2b69f');roof(o,-2.7,1.42,z,1.15,.3,1.3,'#586a71');}
   cylinder(o,-2.3,.72,-2,.08,3,'#a47c53',7);
   wire(o,[[-2.3,3.72,-2],[-.9,3.72,-2],[-.9,2,-2]],'#66716a',2);
   box(o,-.9,1.6,-2,.25,.4,.3,'#bba576');
   for(let i=0;i<5;i++)box(o,-3.5+i*.23,.76,1.1,.19,.25,.3,'#a38a66');
  }else{
   for(const z of [-4,-1,1])tree(o,-2.9,.72,z,.75);
   box(o,-1.3,.02,1.2,1.6,.12,.7,'#ab9671');
   cylinder(o,-4.1,.75,-4,.12,2.4,'#7d7562',7);cone(o,-4.1,3.15,-4,.45,.8,'#9a7054');
  }
 }else{
  cylinder(o,-3.9,-.09,-2.3,2.1,1,'#8f9b85',14,1.7);
  house(o,-3.9,.95,-2.1,1.4,1.2);
  cylinder(o,-4.3,.95,-3,.44,3.6,'#e1ddc4',12,.32);
  cylinder(o,-4.3,4.55,-3,.5,.14,'#475e65',12);
  cylinder(o,-4.3,4.7,-3,.3,.48,'#d6b46d',12);
  cone(o,-4.3,5.18,-3,.48,.4,'#a5684f',12);
  for(let i=0;i<9;i++){const a=i/9*TAU;rock(o,-3.9+Math.cos(a)*2,-.05,-2.3+Math.sin(a)*2,.33,.52,'#909d96',i);}
  box(o,-1.7,.04,-.8,2.1,.14,.62,'#ab9671');
  for(const x of [-2.6,-.8])cylinder(o,x,-.12,-.8,.07,.5,'#66796e',7);
  tree(o,-4.9,1,-1.9,.6);
 }
 return o;
}

export function makeSailboat(x,z,heading=0,bob=0){
 const out=[],y=.08+bob,w=.24,l=1.75;
 const hull=[[-w,-.65],[-w*.7,-1.02],[0,-1.38],[w*.7,-1.02],[w,.62],[w*.65,.83],[-w*.65,.83]];
 const deck=hull.map(([a,b])=>[a,y+.24,b]),low=hull.map(([a,b])=>[a*.8,y,b*.96]);
 out.push(face(deck,'#e8e3ce'));
 for(let i=0;i<hull.length;i++)out.push(face([low[i],deck[i],deck[(i+1)%hull.length],low[(i+1)%hull.length]],'#386071'));
 box(out,0,y+.25,.15,.32,.13,.58,'#bd9671');
 box(out,0,y+.28,.45,.22,.025,.3,'#465d61');
 cylinder(out,0,y+.25,-.34,.018,2.8,'#7e725b',6);
 wire(out,[[0,y+2.98,-.34],[0,y+.36,-1.35]],'#83775c',.8);
 wire(out,[[0,y+2.98,-.34],[0,y+.35,.81]],'#83775c',.8);
 const top=[0,y+2.93,-.34],clew=[.26,y+.55,.77],tack=[0,y+.53,-.31],belly=[.18,y+1.36,.06];
 out.push(face([top,belly,tack],'#f3edd6'),face([top,clew,belly],'#e7dcbf'),face([tack,belly,clew],'#f4eedb'));
 out.push(face([[0,y+2.6,-.38],[.12,y+.48,-.7],[0,y+.4,-1.32]],'#e9e3c9'));
 wire(out,[tack,clew],'#84795d',1.1);
 wire(out,[[0,y+2.99,-.34],[.22,y+2.96,-.34]],'#aa6850',1.8);
 const a=heading*Math.PI/180;
 for(const f of out)f.points=f.points.map(([xx,yy,zz])=>[x+xx*Math.cos(a)-zz*Math.sin(a),yy,z+xx*Math.sin(a)+zz*Math.cos(a)]);
 return out;
}
export {box,cylinder,cone,wire,face,house,tree,rock,makeBoat};
