// The view from the wheelhouse. Lights come from real sectors and aspect, so what the player reads
// on screen is what COLREG says is visible from that bearing. Colour on screen belongs to lights only.
const TAU=Math.PI*2,rad=d=>d*Math.PI/180;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
const seeded=n=>{let r=n>>>0;return ()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};
const RGB={w:[255,244,224],r:[255,62,48],g:[66,255,158],y:[255,190,76],k:[255,212,150]};

// Sectors from Rule 21. Sidelights get a small overlap so a vessel dead ahead shows both.
const IN={all:()=>true,mast:a=>Math.abs(a)<=112.5,port:a=>a>=-112.5&&a<=4,stbd:a=>a>=-4&&a<=112.5,stern:a=>Math.abs(a)>=112.5};
const side=(l,t,h)=>[{c:'r',l,t:-t,h,arc:'port'},{c:'g',l,t,h,arc:'stbd'}];
const VESSELS={
 patrol:{len:66,beam:12,deck:9,house:[[-.1,.5,20]],lights:[{c:'w',l:.3,t:0,h:36,arc:'mast'},...side(.1,5,16),{c:'w',l:-1,t:0,h:11,arc:'stern'}]},
 tug:{len:62,beam:14,deck:9,house:[[0,.55,20]],lights:[{c:'w',l:.3,t:0,h:62,arc:'mast'},{c:'w',l:.3,t:0,h:48,arc:'mast'},{c:'w',l:.3,t:0,h:34,arc:'mast'},...side(.15,6,17),{c:'w',l:-1,t:0,h:12,arc:'stern'},{c:'y',l:-1,t:0,h:24,arc:'stern'}]},
 barge:{len:120,beam:18,deck:7,house:[],lights:[...side(.9,8,8),{c:'w',l:-1,t:0,h:8,arc:'stern'}]},
 cbd:{len:300,beam:44,deck:30,house:[[-.72,.2,44]],lights:[{c:'w',l:.72,t:0,h:66,arc:'mast'},{c:'w',l:-.6,t:0,h:88,arc:'mast'},...side(.05,22,38),{c:'w',l:-1,t:0,h:34,arc:'stern'},{c:'r',l:-.3,t:0,h:124,arc:'all'},{c:'r',l:-.3,t:0,h:110,arc:'all'},{c:'r',l:-.3,t:0,h:96,arc:'all'}]},
 fisher:{len:54,beam:12,deck:8,house:[[-.3,.4,16]],lights:[{c:'r',l:.25,t:0,h:44,arc:'all'},{c:'w',l:.25,t:0,h:30,arc:'all'},...side(.2,6,14),{c:'w',l:-1,t:0,h:11,arc:'stern'}]},
 trawler:{len:60,beam:13,deck:8,house:[[-.3,.4,18]],lights:[{c:'g',l:.25,t:0,h:44,arc:'all'},{c:'w',l:.25,t:0,h:30,arc:'all'},...side(.2,6,14),{c:'w',l:-1,t:0,h:11,arc:'stern'}]},
 yacht:{len:30,beam:8,deck:4,sail:true,house:[],lights:[...side(.8,3,8),{c:'w',l:-1,t:0,h:9,arc:'stern'}]},
 aground:{len:170,beam:26,deck:18,house:[[-.6,.28,34]],list:.05,lights:[{c:'w',l:.86,t:0,h:40,arc:'all'},{c:'w',l:-.9,t:0,h:24,arc:'all'},{c:'r',l:-.1,t:0,h:66,arc:'all'},{c:'r',l:-.1,t:0,h:52,arc:'all'}]},
 dredger:{len:130,beam:30,deck:14,house:[[0,.4,30]],lights:[{c:'r',l:0,t:0,h:72,arc:'all'},{c:'w',l:0,t:0,h:58,arc:'all'},{c:'r',l:0,t:0,h:44,arc:'all'}]},
 nuc:{len:110,beam:18,deck:12,house:[[-.6,.3,26]],lights:[{c:'r',l:-.5,t:0,h:62,arc:'all'},{c:'r',l:-.5,t:0,h:48,arc:'all'},...side(.05,9,20),{c:'w',l:-1,t:0,h:14,arc:'stern'}]},
 pilot:{len:22,beam:6,deck:4,house:[[0,.4,8]],lights:[{c:'w',l:.1,t:0,h:24,arc:'all'},{c:'r',l:.1,t:0,h:19,arc:'all'},...side(.1,2.5,9),{c:'w',l:-1,t:0,h:6,arc:'stern'}]},
 patrolday:{len:66,beam:12,deck:9,house:[[-.1,.5,20]],balls:2,smoke:true,lights:[]},
};
// A vessel as seen from this aspect, in metres: hull half-width, deck height and the lights whose sector covers the observer.
export function silhouette(type,aspect){
 const def=VESSELS[type],sn=Math.sin(rad(aspect)),cs=Math.cos(rad(aspect));
 const lights=def.lights.filter(l=>IN[l.arc](aspect)).map(l=>({c:l.c,arc:l.arc,x:l.l*def.len*.5*sn-l.t*cs,h:l.h}));
 return {half:Math.abs(sn)*def.len*.5+Math.abs(cs)*def.beam*.5,deck:def.deck,lights};
}
export const visibleLights=(type,aspect)=>silhouette(type,aspect).lights.map(l=>l.c).join('');
const SCENES={
 port:{sky:['#040811','#0b1625','#1c2d42'],sea:['#142335','#060c15'],shore:'town',moon:.64},
 cape:{sky:['#040811','#0a1422','#182a3e'],sea:['#112032','#050b13'],shore:'cape',moon:.72},
 sea:{sky:['#030710','#091323','#17293e'],sea:['#102033','#040a12'],shore:null,moon:.7},
 strait:{sky:['#03060e','#08111f','#122236'],sea:['#0c1a2a','#040910'],shore:'strait',moon:.56},
 dawn:{sky:['#16233c','#54566e','#e3a56f'],sea:['#7a7780','#1a2433'],shore:'island',day:true},
 court:{sky:['#1b2330','#2c3646','#4a5566'],sea:['#333e4d','#10161f'],shore:'town',day:true,grey:true,room:true},
};
// What a quest may ask the sea to draw. Quest Lab checks every @scene and @see against these.
export const SCENE_NAMES=Object.keys(SCENES);
export const SIGHTS=[...Object.keys(VESSELS),'rock','tower','town','towline'];
export const SIGHT_KEYS=['brg','dist','aspect','clear','gear','when'];
const sprites={};
function glowSprite(c,size=128){
 if(sprites[c])return sprites[c];
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const x=canvas.getContext('2d'),[r,g,b]=RGB[c],m=size/2,grad=x.createRadialGradient(m,m,0,m,m,m);
 grad.addColorStop(0,`rgba(255,255,255,1)`);grad.addColorStop(.07,`rgba(${r},${g},${b},1)`);grad.addColorStop(.18,`rgba(${r},${g},${b},.42)`);grad.addColorStop(.42,`rgba(${r},${g},${b},.1)`);grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
 x.fillStyle=grad;x.fillRect(0,0,size,size);
 return sprites[c]=canvas;
}
function ridge(rand,w,base,amp,steps=9){
 const pts=[],phase=[rand()*TAU,rand()*TAU,rand()*TAU];
 for(let i=0;i<=steps*6;i++){const u=i/(steps*6);pts.push([u*w,base-amp*(.55+.3*Math.sin(u*7+phase[0])+.2*Math.sin(u*19+phase[1])+.09*Math.sin(u*53+phase[2]))]);}
 return pts;
}
function fillRidge(x,pts,bottom,color){x.fillStyle=color;x.beginPath();x.moveTo(pts[0][0],bottom);for(const p of pts)x.lineTo(p[0],p[1]);x.lineTo(pts[pts.length-1][0],bottom);x.closePath();x.fill();}

export class Sea{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.time=0;this.right=0;this.scene='port';this.prev=null;this.mix=1;
  this.contacts=[];this.own={stack:[],top:0,nav:0,shapes:[]};this.calm=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  this.spot=0;this.backdrops={};this.running=false;
  this.resize=this.resize.bind(this);this.frame=this.frame.bind(this);
  addEventListener('resize',this.resize);this.resize();
 }
 resize(){
  const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.6);
  this.w=Math.max(320,rect.width);this.h=Math.max(240,rect.height);this.dpr=dpr;
  this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);
  this.backdrops={};
 }
 inset(right){this.right=right;this.backdrops={};}
 get viewW(){return this.w-this.right;}
 get horizon(){return this.h*.5;}
 set(scene,see){
  if(scene&&scene!==this.scene){this.prev=this.scene;this.scene=scene;this.mix=0;}
  const next=(see||[]).map(v=>({...v,brg:v.brg??0,dist:v.dist??.5,aspect:v.aspect??0}));
  for(const c of this.contacts)c.leaving=true;
  for(const v of next){
   const old=this.contacts.find(c=>c.type===v.type&&c.leaving&&!c.taken);
   if(old){old.taken=true;Object.assign(old,{from:{brg:old.brg,dist:old.dist,aspect:old.aspect},to:v,t:0,leaving:false,gear:v.gear,clear:v.clear});}
   else this.contacts.push({...v,from:null,to:v,t:0,fade:0,seed:Math.random()*100});
  }
  for(const c of this.contacts)c.taken=false;
 }
 snap(){
  this.prev=null;this.mix=1;
  this.contacts=this.contacts.filter(c=>!c.leaving);
  for(const c of this.contacts){c.fade=1;c.t=1;c.brg=c.to.brg;c.dist=c.to.dist;c.aspect=c.to.aspect;}
  if(this.w)this.draw();
 }
 start(){if(!this.running){this.running=true;this.last=performance.now();requestAnimationFrame(this.frame);}}
 stop(){this.running=false;}
 frame(now){
  if(!this.running)return;
  const dt=Math.min(.5,(now-this.last)/1000);this.last=now;this.time+=dt;
  this.mix=Math.min(1,this.mix+dt/1.1);
  for(const c of this.contacts){
   c.fade=clamp((c.fade??1)+(c.leaving?-dt/.7:dt/1.1),0,1);
   if(c.from&&c.t<1){c.t=Math.min(1,c.t+dt/1.6);const k=ease(c.t);c.brg=lerp(c.from.brg,c.to.brg,k);c.dist=lerp(c.from.dist,c.to.dist,k);c.aspect=lerp(c.from.aspect,c.to.aspect,k);}
  }
  this.contacts=this.contacts.filter(c=>c.fade>0||!c.leaving);
  requestAnimationFrame(this.frame);this.draw();
 }
 backdrop(name){
  if(this.backdrops[name])return this.backdrops[name];
  const s=SCENES[name],c=document.createElement('canvas'),w=this.w,h=this.h,hz=this.horizon,pad=60;
  c.width=Math.round(w*this.dpr);c.height=Math.round((h+pad*2)*this.dpr);
  const x=c.getContext('2d');x.scale(this.dpr,this.dpr);x.translate(0,pad);
  const rand=seeded(name.length*977+11);
  let g=x.createLinearGradient(0,-pad,0,hz);g.addColorStop(0,s.sky[0]);g.addColorStop(.62,s.sky[1]);g.addColorStop(1,s.sky[2]);
  x.fillStyle=g;x.fillRect(0,-pad,w,hz+pad+2);
  if(!s.day){
   for(let i=0;i<620;i++){
    const a=rand()**2.2*.8+.08,y=rand()**1.5*hz*.96-pad*.5;x.fillStyle=`rgba(226,234,246,${a*(1-Math.max(0,y)/hz*.8)})`;x.fillRect(rand()*w,y,rand()<.08?1.6:1,rand()<.08?1.6:1);
   }
   const mx=this.viewW*s.moon,my=hz*.42,halo=x.createRadialGradient(mx,my,0,mx,my,hz*.9);halo.addColorStop(0,'rgba(190,210,232,.2)');halo.addColorStop(.2,'rgba(160,186,214,.075)');halo.addColorStop(1,'rgba(150,180,210,0)');
   x.fillStyle=halo;x.fillRect(0,-pad,w,hz+pad);
   x.fillStyle='rgba(226,232,240,.9)';x.beginPath();x.arc(mx,my,15,0,TAU);x.fill();
   x.fillStyle=s.sky[0];x.globalAlpha=.86;x.beginPath();x.arc(mx+7,my-4,14,0,TAU);x.fill();x.globalAlpha=1;
   for(let i=0;i<11;i++){const y=hz*(.08+rand()*.8),cw=140+rand()*520;x.fillStyle=`rgba(3,7,14,${.12+rand()*.3})`;x.beginPath();x.ellipse(rand()*w,y,cw,4+rand()*15,0,0,TAU);x.fill();}
   const band=x.createLinearGradient(0,hz-90,0,hz);band.addColorStop(0,'rgba(120,150,184,0)');band.addColorStop(1,'rgba(120,150,184,.13)');x.fillStyle=band;x.fillRect(0,hz-90,w,90);
  }
  else{
   if(!s.grey){
    const cx=this.viewW*.62,sun=x.createRadialGradient(cx,hz,0,cx,hz,h*.62);sun.addColorStop(0,'rgba(255,214,150,.95)');sun.addColorStop(.05,'rgba(255,190,120,.7)');sun.addColorStop(.3,'rgba(240,150,100,.22)');sun.addColorStop(1,'rgba(240,150,100,0)');
    x.fillStyle=sun;x.fillRect(0,-pad,w,hz+pad);
    x.fillStyle='rgba(255,234,196,1)';x.beginPath();x.arc(cx,hz+6,26,Math.PI,0);x.fill();
   }
   for(let i=0;i<7;i++){const y=hz*(.3+rand()*.6),cw=120+rand()*420;x.fillStyle=`rgba(32,36,58,${.12+rand()*.22})`;x.beginPath();x.ellipse(rand()*w,y,cw,5+rand()*11,0,0,TAU);x.fill();}
  }
  g=x.createLinearGradient(0,hz,0,h+pad);g.addColorStop(0,s.sea[0]);g.addColorStop(1,s.sea[1]);
  x.fillStyle=g;x.fillRect(0,hz,w,h-hz+pad);
  const vw=this.viewW;
  const windows=(pts,count,span=.8)=>{for(let i=0;i<count;i++){const p=pts[Math.floor(rand()*pts.length)],y=p[1]+rand()*(hz-p[1])*span,warm=rand();x.fillStyle=warm<.72?`rgba(255,${180+rand()*40},${90+rand()*50},${.5+rand()*.5})`:`rgba(226,236,255,${.3+rand()*.5})`;x.fillRect(p[0]+rand()*8,y,1.6,1.6);}};
  if(s.shore==='town'){
   const far=ridge(rand,w,hz+2,34);fillRidge(x,far,hz+3,'#0b1421');
   const near=ridge(rand,w,hz+3,14);fillRidge(x,near,hz+4,'#060c15');
   for(let i=0;i<46;i++){const bx=rand()*w,bw=12+rand()*34,bh=10+rand()*30;x.fillStyle='#060b13';x.fillRect(bx,hz-bh,bw,bh+3);for(let k=0;k<4;k++)if(rand()<.5){x.fillStyle=`rgba(255,${176+rand()*40},${90+rand()*50},.8)`;x.fillRect(bx+2+rand()*(bw-4),hz-bh+2+rand()*(bh-4),2,2.4);}}
   for(const cx of [vw*.2,vw*.34]){x.strokeStyle='#0a121d';x.lineWidth=3;x.beginPath();x.moveTo(cx,hz);x.lineTo(cx,hz-70);x.lineTo(cx+62,hz-82);x.moveTo(cx,hz-70);x.lineTo(cx-20,hz-64);x.stroke();}
   for(let i=0;i<8;i++){const lx=rand()*w;x.drawImage(glowSprite('k'),lx-16,hz-30-rand()*14,32,32);}
  }
  if(s.shore==='cape'){const land=ridge(rand,vw*.46,hz+3,38);fillRidge(x,land,hz+4,'#070d17');windows(land,14,.55);}
  if(s.shore==='strait'){
   const l=ridge(rand,vw*.34,hz+3,62),r=ridge(rand,vw*.3,hz+3,70).map(p=>[w-this.right-p[0]+this.right*.3,p[1]]);
   fillRidge(x,l,hz+4,'#050a12');x.fillStyle='#050a12';x.beginPath();x.moveTo(r[0][0],hz+4);for(const p of r)x.lineTo(p[0],p[1]);x.lineTo(r[r.length-1][0],hz+4);x.fill();
   windows(l,5,.4);
  }
  if(s.shore==='island'){
   const isl=ridge(rand,vw*.5,hz+3,30).map(p=>[p[0]+vw*.05,p[1]]);fillRidge(x,isl,hz+4,'#1d2433');
   for(let i=0;i<14;i++){const bx=vw*(.12+rand()*.3),bw=10+rand()*16,bh=8+rand()*12;x.fillStyle='#161c2a';x.fillRect(bx,hz-bh,bw,bh+3);}
  }
  return this.backdrops[name]={canvas:c,pad};
 }
 draw(){
  const {ctx:x,w,h,dpr,time:t}=this,calm=this.calm,bob=calm?0:Math.sin(t*.62)*5+Math.sin(t*.27)*3,roll=calm?0:Math.sin(t*.41)*.0035;
  const s=SCENES[this.scene],day=!!s.day,hz=this.horizon;
  x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  x.save();x.translate(this.viewW/2,hz);x.rotate(roll);x.translate(-this.viewW/2,-hz+bob);
  const paint=(name,alpha)=>{const b=this.backdrop(name);x.globalAlpha=alpha;x.drawImage(b.canvas,0,-b.pad,w,h+b.pad*2);x.globalAlpha=1;};
  if(this.prev&&this.mix<1)paint(this.prev,1);
  paint(this.scene,this.prev?ease(this.mix):1);
  this.waves(x,hz,t,day);
  if(this.scene==='cape'&&!day)this.beam(x,hz,t);
  const order=[...this.contacts].sort((a,b)=>b.dist-a.dist);
  for(const c of order)this.vessel(x,c,hz,t,day);
  x.restore();
  this.bridge(x,hz,t,bob,day);
 }
 waves(x,hz,t,day){
  const w=this.w,h=this.h+40,rows=64,speed=this.calm?0:1;
  x.lineCap='round';
  for(let r=0;r<rows;r++){
   const u=r/rows,y=hz+2+(u*u)*(h-hz),depth=.12+u,n=Math.round(22+22*(1-u));
   x.lineWidth=.5+u*1.7;
   for(let i=0;i<n;i++){
    const seed=(r*37+i*91)%997,px=((seed*13.7+t*speed*(6+u*14)*(seed%2?1:-1))%(w+200)+w+200)%(w+200)-100,len=(14+seed%70)*depth*1.4;
    const a=(.5+.5*Math.sin(t*speed*.9+seed))*(day?.26:.13)*(.5+u*.7);
    if(a<.015)continue;
    x.strokeStyle=day?`rgba(255,226,190,${a})`:`rgba(170,200,226,${a*1.35})`;
    x.beginPath();x.moveTo(px,y);x.lineTo(px+len,y+(seed%3-1)*.4);x.stroke();
   }
  }
 }
 beam(x,hz,t){
  const tower=this.contacts.find(c=>c.type==='tower');if(!tower)return;
  const {px,y,u}=this.point(tower,hz),oy=y-73*u,a=-.16+Math.sin(t*.32)*.3,len=this.viewW*1.1;
  const g=x.createLinearGradient(px,oy,px+Math.cos(a)*len,oy+Math.sin(a)*len);g.addColorStop(0,'rgba(255,240,206,.34)');g.addColorStop(.5,'rgba(255,240,206,.1)');g.addColorStop(1,'rgba(255,240,206,0)');
  x.fillStyle=g;x.beginPath();x.moveTo(px,oy);x.lineTo(px+Math.cos(a-.06)*len,oy+Math.sin(a-.06)*len);x.lineTo(px+Math.cos(a+.06)*len,oy+Math.sin(a+.06)*len);x.closePath();x.fill();
 }
 point(c,hz){
  const scale=Math.max(1.05,Math.min(this.viewW,1000)/900),perDeg=this.viewW/105;
  const near=1-clamp(c.dist,0,1),u=lerp(.7,3,near*near)*scale,y=hz+lerp(2,this.h*.2,near*near*near);
  return {px:this.viewW/2+c.brg*perDeg,y,u};
 }
 glow(x,c,sx,sy,size,alpha,hz,day){
  if(day)return;
  x.globalCompositeOperation='lighter';x.globalAlpha=alpha;
  const sp=glowSprite(c);x.drawImage(sp,sx-size/2,sy-size/2,size,size);
  const t=this.time;
  if(sy<hz+this.h*.3)for(let i=0;i<7;i++){
   const yy=lerp(hz+2,hz+2,0)+Math.max(0,(sy-hz))*.2+(i+1)*(5+size*.09),wob=(this.calm?0:Math.sin(t*2.1+i*1.7))*(1.5+i*.8),ww=size*(.16-.012*i);
   x.globalAlpha=alpha*.26*(1-i/7);x.drawImage(sp,sx+wob-ww/2,yy-1.5,ww,3.5);
  }
  x.globalCompositeOperation='source-over';x.globalAlpha=1;
 }
 vessel(x,c,hz,t,day){
  const alpha=ease(clamp(c.fade??1,0,1));
  if(c.type==='rock')return this.rock(x,c,hz,t,alpha);
  if(c.type==='tower')return this.tower(x,c,hz,t,alpha);
  if(c.type==='town')return this.town(x,c,hz,t,alpha,day);
  if(c.type==='towline')return;
  const def=VESSELS[c.type];if(!def)return;
  const {px,y,u}=this.point(c,hz),a=c.aspect,sn=Math.sin(rad(a)),cs=Math.cos(rad(a));
  const sil=silhouette(c.type,a);
  x.globalAlpha=alpha;
  const half=sil.half*u,dh=def.deck*u,dx=sn*def.len*.08*u;
  x.fillStyle=day?'#1b2230':'rgba(6,11,18,.96)';
  x.beginPath();x.moveTo(px-half,y);x.lineTo(px-half+dx*.3,y-dh);x.lineTo(px+half+dx*.3,y-dh);x.lineTo(px+half,y);x.closePath();x.fill();
  for(const [l,span,hh] of def.house){const cx=px+l*def.len*.5*sn*u,ww=(Math.abs(sn)*span*def.len*.5+Math.abs(cs)*def.beam*.42)*u;x.fillRect(cx-ww/2,y-dh-hh*u,ww,hh*u+1);}
  if(def.sail){x.fillStyle=day?'rgba(240,236,226,.8)':'rgba(190,200,212,.13)';x.beginPath();x.moveTo(px,y-74*u);x.lineTo(px+15*u,y-6*u);x.lineTo(px-3*u,y-6*u);x.closePath();x.fill();}
  if(def.balls){
   const mx=px+def.len*.15*sn*u;x.strokeStyle='#121824';x.lineWidth=Math.max(1,u*1.3);x.beginPath();x.moveTo(mx,y-dh);x.lineTo(mx,y-70*u);x.stroke();x.fillStyle='#0a0e16';
   for(let i=0;i<def.balls;i++){x.beginPath();x.arc(mx,y-(62-i*17)*u,5.6*u,0,TAU);x.fill();}
  }
  if(def.smoke&&!this.calm)for(let i=0;i<14;i++){const p=(t*.12+i/14)%1;x.fillStyle=`rgba(40,42,52,${.3*(1-p)})`;x.beginPath();x.arc(px-p*90*u,y-34*u-p*80*u,(3+p*16)*u,0,TAU);x.fill();}
  x.globalAlpha=1;
  const size=clamp(u*30,26,130),flick=this.calm?1:.93+.07*Math.sin(t*11+(c.seed||0));
  for(const L of sil.lights)this.glow(x,L.c,px+L.x*u,y-L.h*u,size,alpha*flick,hz,day);
  if(c.type==='fisher'&&c.gear)this.glow(x,'w',px+c.gear*14*u,y-20*u,size*.9,alpha*flick,hz,day);
  if(c.type==='dredger'){
   const k=def.len*.42*u,gx=px+(c.clear||1)*k,rx=px-(c.clear||1)*k;
   for(const h of [36,24]){this.glow(x,'g',gx,y-h*u,size,alpha*flick,hz,day);this.glow(x,'r',rx,y-h*u,size,alpha*flick,hz,day);}
  }
 }
 rock(x,c,hz,t,alpha){
  const {px,y,u}=this.point(c,hz);
  x.globalAlpha=alpha;x.fillStyle='rgba(4,8,14,.96)';x.beginPath();x.moveTo(px-52*u,y+2);x.lineTo(px-30*u,y-20*u);x.lineTo(px-8*u,y-44*u);x.lineTo(px+12*u,y-30*u);x.lineTo(px+46*u,y+2);x.closePath();x.fill();x.globalAlpha=1;
  if((t%3)<.9)this.glow(x,'w',px-8*u,y-52*u,62,alpha,hz);
 }
 tower(x,c,hz,t,alpha){
  const {px,y,u}=this.point(c,hz),b=px;
  x.globalAlpha=alpha;x.fillStyle='rgba(4,8,14,1)';x.fillRect(b-7*u,y-64*u,14*u,66*u);x.fillRect(b-11*u,y-69*u,22*u,6*u);x.globalAlpha=1;
  this.glow(x,'k',b,y-73*u,76,alpha,hz);
 }
 town(x,c,hz,t,alpha,day){
  if(day)return;
  const rand=seeded(77),{px,y,u}=this.point(c,hz);
  for(let i=0;i<22;i++){const lx=px+(rand()-.5)*220*u,ly=y-rand()*12*u,on=this.calm?1:.75+.25*Math.sin(t*(.4+rand())+i);this.glow(x,'k',lx,ly,20+rand()*14,alpha*on,hz+900);}
 }
 bridge(x,hz,t,bob,day){
  // Wheelhouse: bow, sill and window posts. Own lamps tint the deck, so the player feels what was switched on.
  const w=this.viewW,h=this.h,c=w/2,y=h-Math.min(h*.2,130),sway=bob*.5;
  const own=this.own;
  const room=SCENES[this.scene].room;
  if(!room){
  x.fillStyle=day?'#141a26':'#04070c';
  x.beginPath();x.moveTo(c-210,h+20);x.lineTo(c-30,y-26+sway);x.lineTo(c,y-44+sway);x.lineTo(c+30,y-26+sway);x.lineTo(c+210,h+20);x.closePath();x.fill();
  x.strokeStyle=day?'rgba(255,220,180,.2)':'rgba(170,196,222,.1)';x.lineWidth=1;x.beginPath();x.moveTo(c-150,h-14);x.lineTo(c,y-44+sway);x.lineTo(c+150,h-14);x.stroke();
  x.strokeStyle=day?'#10151f':'#02050a';x.lineWidth=3;x.beginPath();x.moveTo(c,y-42+sway);x.lineTo(c,y-96+sway);x.stroke();
  }else{
   x.fillStyle='#0e131c';for(const k of [.33,.66])x.fillRect(w*k-5,0,10,h);x.fillRect(0,h*.36,w,8);
  }
  const tint=[];
  if(!day){for(const k of own.stack)tint.push(k===2?'r':k===3?'g':'w');if(own.nav)tint.push('r','g');if(own.top)tint.push('w');}
  if(tint.length){
   x.globalCompositeOperation='lighter';
   tint.forEach((k,i)=>{const [r,g,b]=RGB[k],px=c+((i+.5)/tint.length-.5)*190,grad=x.createRadialGradient(px,y-34+sway,0,px,y-34+sway,150);grad.addColorStop(0,`rgba(${r},${g},${b},.13)`);grad.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=grad;x.fillRect(px-160,y-190,320,330);});
   x.globalCompositeOperation='source-over';
  }
  const sill=x.createLinearGradient(0,h-44,0,h+2);sill.addColorStop(0,day?'#1b2130':'#070c13');sill.addColorStop(1,day?'#0f141e':'#02040a');
  x.fillStyle=sill;x.fillRect(0,h-34,w,40);
  x.fillStyle=day?'rgba(255,224,190,.14)':'rgba(170,196,222,.09)';x.fillRect(0,h-34,w,1);
  x.fillStyle=day?'#0f141e':'#03060b';
  x.beginPath();x.moveTo(0,0);x.lineTo(w*.05,0);x.lineTo(w*.022,h);x.lineTo(0,h);x.closePath();x.fill();
  if(this.right===0){x.beginPath();x.moveTo(w,0);x.lineTo(w*.95,0);x.lineTo(w*.978,h);x.lineTo(w,h);x.closePath();x.fill();}
  x.fillRect(0,0,w,Math.min(h*.045,30));
  const v=x.createRadialGradient(c,hz,h*.28,c,hz,Math.max(w,h)*.74);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,day?'rgba(10,8,20,.42)':'rgba(0,0,0,.6)');
  x.fillStyle=v;x.fillRect(0,0,this.w,this.h);
 }
}
