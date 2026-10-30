import {face,box,cylinder,cone,wire,rock,makeBoat,makeSailboat} from './design-island.js';
import {buildShoreScene} from './harbor-scenery.js';
import {LAND,PLACES,ZONES,BOUNDS} from './world-engine.js';
const TAU=Math.PI*2;
const tint=(h,n)=>'rgb('+[1,3,5].map(i=>Math.round(Math.min(255,parseInt(h.slice(i,i+2),16)*n))).join(',')+')';
function person(out,x,z,color='#a46d52',walking=0,y=.7){
 cylinder(out,x,y+.7,z,.18,.65,color,6);
 cylinder(out,x,y+1.35,z,.18,.3,'#c9b18b',7);
 for(const side of [-1,1])wire(out,[[x+side*.13,y+.7,z],[x+side*.16,y+.05,z+side*Math.sin(walking)*.25]],'#526b65',2);
 wire(out,[[x-.26,y+1.2,z],[x-.33,y+.65,z+Math.sin(walking)*.18]],color,2);
 wire(out,[[x+.26,y+1.2,z],[x+.33,y+.65,z-Math.sin(walking)*.18]],color,2);
}
function normal(p){const a=p[0],b=p[1],d=p[2],u=b.map((v,i)=>v-a[i]),v=d.map((n,i)=>n-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;return n.map(v=>v/l);}
function boatMesh(ship,type,bob){
 const out=type==='sail'?makeSailboat(0,0,0,bob):makeBoat(0,0,0,type==='cargo',bob);
 if(ship.paint)for(const f of out)if(['#a75a45','#526e78','#386071'].includes(f.color))f.color=ship.paint;
 if(type!=='sail'){
  const w=type==='cargo'?.36:.25,y=.05+bob;
  for(const side of [-1,1]){
   for(const z of [-.2,-.07,.06])box(out,side*w*.75,y+.37,z,.021,.08,.07,'#afc7bd');
   for(const z of [-.5,.35,.55])wire(out,[[side*w*.82,y+.27,z],[side*w*.82,y+.44,z]],'#d3d4b6',.55);
   wire(out,[[side*w*.82,y+.44,-.5],[side*w*.82,y+.44,.55]],'#d3d4b6',.6);
  }
  wire(out,[[-w*.72,y+.26,-.5],[0,y+.26,-.86],[w*.72,y+.26,-.5]],'#c5bd96',.6);
  box(out,0,y+.62,type==='cargo'?-.15:0,.17,.035,.15,'#a8b7a1');
 }
 const a=ship.h*Math.PI/180;
 return out.map(f=>({...f,points:f.points.map(([x,y,z])=>[ship.x+(x*Math.cos(a)-z*Math.sin(a))*2.4,y*2.4,ship.z+(x*Math.sin(a)+z*Math.cos(a))*2.4])}));
}
export function createWorldView(canvas,{getState,onFrame,onWater=()=>{},onPlace=()=>{},onContact=()=>{},onCamera=()=>{},places=PLACES,zones=ZONES,showBounds=true,showLand=true,onDraw=()=>{},initialZoom=1,characters=null,projection='island',padding={top:0,bottom:0}}){
 const c=canvas.getContext('2d'),staticFaces=showLand?buildShoreScene():[],abort=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let w=0,h=0,originY=0,scale=7.2,zoom=initialZoom,center={x:getState().own.x,z:getState().own.z},yaw=-.62,elevation=projection==='chart'?Math.PI/2:.63,drag=null,moved=false,follow=true,raf=0,last=0,pins=[],hover=null,destroyed=false;
 function size(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}c.setTransform(dpr,0,0,dpr,0,0);const usable=Math.max(180,h-padding.top-padding.bottom);originY=padding.top+usable*.54;scale=Math.max(4.2,Math.min(w/105,usable/63))*zoom;}
 function project([px,py,pz]){const x=px-center.x,z=pz-center.z,rx=x*Math.cos(yaw)-z*Math.sin(yaw),rz=x*Math.sin(yaw)+z*Math.cos(yaw);return {x:w*.5+rx*scale,y:originY+(rz*Math.sin(elevation)-py*Math.cos(elevation))*scale,d:rz*Math.cos(elevation)+py*Math.sin(elevation)};}
 function unproject(p){const x=(p.x-w*.5)/scale,z=(p.y-originY)/scale/Math.sin(elevation);return {x:center.x+x*Math.cos(yaw)+z*Math.sin(yaw),z:center.z-x*Math.sin(yaw)+z*Math.cos(yaw)};}
 function strokeLine(points,color,width=1,dash=[]){if(points.length<2)return;c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();points.map(p=>project([p.x,-.04,p.z])).forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);}
 const terrain=staticFaces.filter(f=>f.ground),structures=staticFaces.filter(f=>!f.ground);
 let projectionKey='',projectedTerrain=[],projectedStructures=[];
 function projectFaces(items,sort=true){
  const projected=items.map(f=>{
   const p=f.points.map(project),xs=p.map(v=>v.x),ys=p.map(v=>v.y);
   return {...f,projected:p,depth:p.reduce((s,v)=>s+v.d,0)/p.length,visible:Math.min(...xs)<w+120&&Math.max(...xs)>-120&&Math.min(...ys)<h+150&&Math.max(...ys)>-180,fill:f.line?f.color:tint(f.color,.79+.21*Math.abs(normal(f.points)[1])+.08*(normal(f.points)[0]*-.6+normal(f.points)[2]*-.5))};
  }).filter(f=>f.visible);
  return sort?projected.sort((a,b)=>a.depth-b.depth):projected;
 }
 function paintFaces(items){
  for(const f of items){c.globalAlpha=f.alpha??1;c.beginPath();f.projected.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(f.line){c.strokeStyle=f.color;c.lineWidth=f.width||1;c.stroke();}else{c.closePath();c.fillStyle=f.fill;c.fill();if(f.edge){c.strokeStyle='#40554d44';c.lineWidth=.4;c.stroke();}}}c.globalAlpha=1;
 }
 function refreshProjection(){
  const key=[w,h,scale,center.x,center.z,yaw,elevation].join(':');if(key===projectionKey)return;
  projectionKey=key;projectedTerrain=projectFaces(terrain,false);projectedStructures=projectFaces(structures);
 }
 function mergeFaces(a,b){const all=[];let i=0,j=0;while(i<a.length||j<b.length)all.push(j>=b.length||(i<a.length&&a[i].depth<=b[j].depth)?a[i++]:b[j++]);return all;}
 function drawFrame(now){
  if(destroyed)return;
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  onFrame(document.hidden?0:dt);if(destroyed)return;const s=getState();size();
  if(follow){center.x+=(s.own.x-center.x)*Math.min(1,dt*3);center.z+=(s.own.z-center.z)*Math.min(1,dt*3);}
  const t=reduced?0:(s.sceneryClock??now/1000);
  refreshProjection();
  const sea=c.createLinearGradient(0,0,w,h);sea.addColorStop(0,'#7bacae');sea.addColorStop(.5,'#719da4');sea.addColorStop(1,'#668c99');c.fillStyle=sea;c.fillRect(0,0,w,h);
  // Sea comes first, so it never covers distant land.
  c.lineWidth=.7;
  for(let x=-78;x<81;x+=5)for(let z=-66;z<67;z+=4){const phase=t*.65+x*1.7+z*.8,p=project([x+Math.sin(z)*.8,-.05,z+Math.sin(phase)*.12]);if(p.x<0||p.x>w||p.y<0||p.y>h)continue;c.strokeStyle='rgba(214,231,212,'+(.1+.12*(.5+.5*Math.sin(phase)))+')';c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(p.x+5,p.y-1.5,p.x+10,p.y);c.stroke();}
  if(showLand)for(const island of LAND){
   const band=(r,color)=>{c.fillStyle=color;c.beginPath();for(let i=0;i<50;i++){const a=i/49*TAU,p=project([island.x+Math.cos(a)*island.rx*r,-.1,island.z+Math.sin(a)*island.rz*r]);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.closePath();c.fill();};
   band(1.12,'#c8d8b721');band(1.05,'#c8d7b82e');
   const foam=[];for(let i=0;i<=48;i++){const a=i/48*TAU;foam.push({x:island.x+Math.cos(a)*island.rx*(1.015+.003*Math.sin(t+a*7)),z:island.z+Math.sin(a)*island.rz*(1.015+.003*Math.sin(t+a*7))});}strokeLine(foam,'#e6e5ca66',.8);
  }
  if(showBounds)strokeLine([{x:-77,z:-65},{x:77,z:-65},{x:77,z:65},{x:-77,z:65},{x:-77,z:-65}],'#d2dfc96b',1,[3,6]);
  for(const z of zones){const p=project([z.x,-.04,z.z]);if(p.x>-150&&p.x<w+150&&p.y>50&&p.y<h-40){c.font='10px Golos,sans-serif';c.textAlign='center';c.fillStyle='#dce8dd66';c.fillText(z.name.toLocaleUpperCase('ru'),p.x,p.y-32);}}
  paintFaces(projectedTerrain);
  for(const ship of [s.own,...s.traffic]){
   if(!showLand){strokeLine(ship.trail,'#244651',4);strokeLine(ship.trail,'#f0efd5',2);}
   else strokeLine(ship.trail,ship===s.own?'#e4e6bfcc':'#dce8d19c',1.5);
  }
  if(s.route.length){strokeLine([s.own,...s.route],'#f5d38c',2,[6,5]);const p=project([s.route.at(-1).x,0,s.route.at(-1).z]);c.strokeStyle='#f5d38c';c.beginPath();c.arc(p.x,p.y,5,0,TAU);c.stroke();}
  const dynamic=[];
  if(showLand){
  // People walk on actual quay/road positions; loads follow the crane hook.
  for(let i=0;i<3;i++){const phase=t*.035+i*2.1,z=7+10*Math.sin(phase),stride=Math.abs(Math.cos(phase));person(dynamic,-29+i*.5,z,['#a56d50','#576f71','#8a8a60'][i],Math.sin(t*3+i)*stride);}
  for(const p of characters||[{x:-24,z:16,color:'#a3624c'},{x:-23,z:-50,color:'#556d73'},{x:-14,z:49,color:'#9a7953'}])person(dynamic,p.x,p.z,p.color,Math.sin(t*.9)*.1);
  // A moored boat is connected to the quay; lines disappear on departure.
  if(s.own.s<.05)for(const [berth,anchor] of [[{x:-16,z:25},[-21.4,.95,21]], [{x:-18,z:-46},[-20,.95,-49]], [{x:-7,z:45},[-11,.95,47]]]){
   if(Math.hypot(s.own.x-berth.x,s.own.z-berth.z)<1)for(const side of [-1,1])wire(dynamic,[[s.own.x+side*.4,.6,s.own.z+side*.8],[(s.own.x+anchor[0])/2,.28,(s.own.z+anchor[2])/2],anchor],'#c4bd97',.8);
  }
  if(s.lineReady||s.portSchedule){
   box(dynamic,-25,1.9,13,2.8,1.4,.13,'#ece0b9');
   for(let i=0;i<(s.portSchedule||2);i++)wire(dynamic,[[-26,2.25-i*.5,13.12],[-24,2.25-i*.5,13.12]],'#86694b',1.6);
  }
  const a=Math.sin(t*.18)*.32,boomEnd=[-28+Math.cos(a)*10,8.7,2+Math.sin(a)*10],hookY=4.8+Math.sin(t*.55)*1.6;
  wire(dynamic,[[-28,8.5,2],boomEnd],'#656f64',2.3);wire(dynamic,[[-28,9,2],boomEnd],'#b6ae8a',1);
  wire(dynamic,[boomEnd,[boomEnd[0],hookY,boomEnd[2]]],'#576b65',1);box(dynamic,boomEnd[0],hookY-.8,boomEnd[2],1.2,.8,1.2,'#aa8d60');
  // Windmill arms turn around the hub; a flag flutters at its mast.
  for(let i=0;i<4;i++){const r=t*.22+i*TAU/4,p=[-26.1+Math.cos(r)*3.6,4.6+Math.sin(r)*3.6,45.6];wire(dynamic,[[-26.1,4.6,45.6],p],'#756b56',1.8);for(let j=0;j<4;j++){const d=1.6+j*.55,x=-26.1+Math.cos(r)*d,y=4.6+Math.sin(r)*d;wire(dynamic,[[x-Math.sin(r)*.35,y+Math.cos(r)*.35,45.6],[x+Math.sin(r)*.35,y-Math.cos(r)*.35,45.6]],'#c6bb93',1.6);}}
  for(let i=0;i<4;i++){const x=-22.5+i,sway=Math.sin(t*.9+i)*.13;dynamic.push(face([[x,2.48,56],[x+.7,2.44,56],[x+.7,1.5,56+sway],[x,1.55,56+sway]],['#c8bb8c','#a6b69c','#cbbca0','#829b8d'][i],false));}
  cylinder(dynamic,-23.5,.8,21,.07,4.7,'#6e7864',6);
  dynamic.push(face([[-23.5,5.5,21],[-20.6,5.2,21+Math.sin(t*2)*.3],[-20.9,4.3,21+Math.sin(t*2+.5)*.3],[-23.5,4.4,21]],'#b47c55',false));
  for(let i=0;i<5;i++){const u=(t*.065+i/5)%1,puff=[];rock(puff,-43.38+u*.7+Math.sin(t*.3+i)*.1,5.81+u*3,9.1+u*.25,.2+u*.5,.3+u*.25,'#e3e4d3',i);dynamic.push(...puff.map(f=>({...f,alpha:Math.sin(u*Math.PI)**2*.18})));}
  const light=[-30,11.7,-56],beam=t*.32;
  if(s.beacon!==false)dynamic.push(face([light,[-30+Math.cos(beam)*23,.1,-56+Math.sin(beam)*23],[-30+Math.cos(beam+.1)*23,.1,-56+Math.sin(beam+.1)*23]],'#f7d588',false,.14));
  // Buoys are a real location for the training boat, not a floating talk icon.
  for(const [x,z,col] of [[-13,-22,'#ad6853'],[-3,-22,'#548c79']]){cylinder(dynamic,x,.1+Math.sin(t*1.5+x)*.1,z,.33,.75,col,8,.13);cylinder(dynamic,x,.85,z,.04,.8,'#596e67',6);}
  }
  for(const ship of [s.own,...s.traffic]){
   const type=ship===s.own?'motor':ship.type;
   const shadow=project([ship.x,.01,ship.z]);c.fillStyle='#37687130';c.beginPath();c.ellipse(shadow.x+2,shadow.y+3,scale*.65,scale*.28,0,0,TAU);c.fill();
   dynamic.push(...boatMesh(ship,type,Math.sin(t*.8+ship.x)*.009));
   if(ship.s>.15){const r=ship.h*Math.PI/180;for(const side of [-1,1]){const p=[[side*.5,1.7],[side*.9,3],[side*1.4,4.8]].map(([x,z])=>({x:ship.x+x*Math.cos(r)-z*Math.sin(r),z:ship.z+x*Math.sin(r)+z*Math.cos(r)}));strokeLine(p,'#e9e9c777',1);}}
  }
  paintFaces(mergeFaces(projectedStructures,projectFaces(dynamic)));
  if(showLand)for(let i=0;i<2;i++){const a=t*.035+i*2.4,p=project([-30+Math.cos(a)*9,7.5+i*1.4,9+Math.sin(a)*12]),wing=Math.sin(t*2.8+i)*2;c.strokeStyle='#56766a';c.lineWidth=1;c.beginPath();c.moveTo(p.x-5,p.y+wing);c.quadraticCurveTo(p.x-2,p.y-2,p.x,p.y+1);c.quadraticCurveTo(p.x+2,p.y-2,p.x+5,p.y+wing);c.stroke();}
  pins=[];
  for(const p of places){
   const pos=project([p.x,p.id==='school'?.7:2.4,p.z]);if(pos.x<-80||pos.x>w+80||pos.y<-20||pos.y>h+30)continue;
   const near=Math.hypot(p.berth.x-s.own.x,p.berth.z-s.own.z)<p.radius;
   c.font=(near?'600 ':'')+'14px Golos,sans-serif';const text=p.id==='school'?'Учебные буи':p.person+' · '+p.name;
   const width=c.measureText(text).width+26;c.fillStyle=near?'#f2e9cbf5':'#e9eddfd9';c.strokeStyle=near?'#9b784e':'#8ea49c';c.lineWidth=.8;c.fillRect(pos.x-width/2,pos.y-38,width,34);c.strokeRect(pos.x-width/2,pos.y-38,width,34);c.fillStyle='#3c5e59';c.textAlign='center';c.fillText(text,pos.x,pos.y-16);c.strokeStyle='#7a9085';c.beginPath();c.moveTo(pos.x,pos.y-2);c.lineTo(pos.x,pos.y+9);c.stroke();
   pins.push({kind:'place',id:p.id,x:pos.x,y:pos.y-21,w:width,h:38});
  }
  const occupiedLabels=[];
  for(const ship of [s.own,...s.traffic]){
   const p=project([ship.x,1,ship.z]);if(p.x<0||p.x>w||p.y<0||p.y>h)continue;
   const active=s.encounter?.id===ship.id;
   c.font='500 14px Golos,sans-serif';const name=ship===s.own?'«Смена» · вы':'«'+ship.name+'»',lw=c.measureText(name).width+24,lh=32;
   let lx=Math.max(8,Math.min(w-lw-8,p.x-lw/2)),ly=p.y+24;
   for(const candidate of [p.y+24,p.y-65,p.y+62,p.y-103]){const y=Math.max(8,Math.min(h-lh-70,candidate));if(!occupiedLabels.some(r=>lx<r.x+r.w+5&&lx+lw+5>r.x&&y<r.y+r.h+5&&y+lh+5>r.y)){ly=y;break;}}
   occupiedLabels.push({x:lx,y:ly,w:lw,h:lh});c.fillStyle='#234c56';c.fillRect(lx,ly,lw,lh);c.strokeStyle=active?'#f1d394':'#a4beb0';c.lineWidth=1;c.strokeRect(lx,ly,lw,lh);c.fillStyle='#fff8e8';c.textAlign='left';c.fillText(name,lx+12,ly+21);
   if(active){c.strokeStyle='#efcb88';c.lineWidth=1.5;c.setLineDash([4,4]);c.beginPath();c.ellipse(p.x,p.y+5,24,13,0,0,TAU);c.stroke();c.setLineDash([]);}
   if(ship!==s.own)pins.push({kind:'contact',id:ship.id,x:p.x,y:p.y,w:42,h:48});
  }
  const north=project([s.own.x,0,s.own.z-9]),here=project([s.own.x,0,s.own.z-5]);
  c.strokeStyle='#e2e8d68a';c.beginPath();c.moveTo(here.x,here.y);c.lineTo(north.x,north.y);c.stroke();c.fillStyle='#e2e8d6';c.font='13px Golos,sans-serif';c.fillText('N',north.x,north.y-5);
  onDraw({c,project,width:w,height:h,state:s});
  if(hover){canvas.style.cursor=hover.kind==='place'?'pointer':hover.kind==='contact'?'help':'crosshair';}else canvas.style.cursor=drag?'grabbing':'crosshair';
  raf=requestAnimationFrame(drawFrame);
 }
 const position=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,center:{...center}};moved=false;canvas.setPointerCapture(e.pointerId);},{signal:abort.signal});
 canvas.addEventListener('pointermove',e=>{
  const p=position(e);hover=pins.find(a=>Math.abs(a.x-p.x)<a.w/2&&Math.abs(a.y-p.y)<a.h/2);
  if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){moved=true;follow=false;const start=unproject({x:w*.5,y:h*.54}),end=unproject({x:w*.5+e.clientX-drag.x,y:h*.54+e.clientY-drag.y});center={x:drag.center.x+start.x-end.x,z:drag.center.z+start.z-end.z};onCamera(false);}
 },{signal:abort.signal});
 canvas.addEventListener('pointerup',e=>{if(!moved){const p=position(e),hit=pins.find(a=>Math.abs(a.x-p.x)<a.w/2&&Math.abs(a.y-p.y)<a.h/2);if(hit){if(hit.kind==='place')onPlace(hit.id);else onContact(hit.id);}else onWater(unproject(p));}drag=null;},{signal:abort.signal});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.45,Math.min(1.8,zoom-e.deltaY*.0007));},{signal:abort.signal,passive:false});
 raf=requestAnimationFrame(drawFrame);
 return {focus(p=null){follow=!p;if(p)center={x:p.x,z:p.z};else center={x:getState().own.x,z:getState().own.z};onCamera(follow);},setProjection(next){elevation=next==='chart'?Math.PI/2:.63;projectionKey='';},project,unproject,destroy(){destroyed=true;cancelAnimationFrame(raf);abort.abort();}};
}
