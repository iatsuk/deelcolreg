import {face,box,cylinder,cone,wire,tree,rock} from './design-island.js';
import {LAND} from './world-engine.js';
const TAU=Math.PI*2;
const ground=(out,points,color,alpha=1)=>out.push({...face(points,color,false,alpha),ground:true});
function disc(out,x,y,z,rx,rz,color,n=16,alpha=1){ground(out,Array.from({length:n},(_,i)=>[x+Math.cos(i/n*TAU)*rx,y,z+Math.sin(i/n*TAU)*rz]),color,alpha);}
function path(out,points,width=1.3,color='#c4bc99'){
 for(let i=1;i<points.length;i++){const [x,z]=points[i-1],[a,b]=points[i],d=Math.hypot(a-x,b-z),u=(b-z)/d*width/2,v=(a-x)/d*width/2;
  ground(out,[[x-u,.738,z+v],[a-u,.738,b+v],[a+u,.738,b-v],[x+u,.738,z-v]],color);
  for(let n=.4;n<d;n+=1.2){const f=n/d;disc(out,x+(a-x)*f,.741,z+(b-z)*f,width*.25,.12,'#aaa98a',5,.4);}
 }
}
function roof(out,x,y,z,w,d,h,color){
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],m=[x,y+h,z-d/2],n=[x,y+h,z+d/2];
 out.push(face([a,m,b],color),face([e,c,n],color));
 const shade=(hex,k)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*k)).toString(16).padStart(2,'0')).join('');
 for(const side of [-1,1])for(let row=0;row<5;row++)for(let col=0;col<8;col++){
  const p=(r,j)=>[x+side*w/2*r/5,y+h*(1-r/5),z-d/2+d*j/8];
  const tile=[p(row,col),p(row+1,col),p(row+1,col+1),p(row,col+1)];if(side>0)tile.reverse();
  out.push(face(tile,shade(color,1+.055*Math.sin(row*4.1+col*2.7)),true));
 }
 wire(out,[m,n],'#586866',1.3);
 wire(out,[[x-w/2,y,z-d/2],[x-w/2,y,z+d/2]],'#abac8c',1.2);
 wire(out,[[x+w/2,y,z-d/2],[x+w/2,y,z+d/2]],'#abac8c',1.2);
}
function window(out,x,y,z,side=false,w=.85,h=1.05){
 if(side){
  box(out,x,y,z,.11,h,w,'#a9aa8b');box(out,x+.07,y+.08,z,.025,h-.16,w-.16,'#497575');
  wire(out,[[x+.09,y+h/2,z-w/2+.08],[x+.09,y+h/2,z+w/2-.08]],'#d3c9a5',.8);
  wire(out,[[x+.09,y+.1,z],[x+.09,y+h-.1,z]],'#d3c9a5',.8);
 }else{
  box(out,x,y,z,w,h,.11,'#b8b492');box(out,x,y+.08,z+.07,w-.16,h-.16,.025,'#4f7c7b');
  wire(out,[[x-w/2+.08,y+h/2,z+.09],[x+w/2-.08,y+h/2,z+.09]],'#ddd2aa',.8);
  wire(out,[[x,y+.1,z+.09],[x,y+h-.1,z+.09]],'#ddd2aa',.8);
  box(out,x,y-.1,z+.18,w+.15,.12,.35,'#d4c7a1');
 }
}
function cottage(out,x,z,w=5.5,d=5,wall='#e1d6b5',roofColor='#57746e',shop=false){
 const y=.76,h=3.2;
 disc(out,x+.5,.72,z+.8,w*.72,d*.7,'#708a6b',18,.35);
 const walls=[];box(walls,x,y,z,w,h,d,wall);out.push(...walls.slice(2));box(out,x,y,z,w+.15,.35,d+.15,'#b5ac8a');
 for(let i=0;i<7;i++)wire(out,[[x-w/2-.012,y+.45+i*.39,z-d/2],[x-w/2-.012,y+.45+i*.39,z+d/2]],'#b7b99b',.4,.5);
 roof(out,x,y+h,z,w+.65,d+.7,1.65,roofColor);
 for(const xx of [-w*.28,w*.28])window(out,x+xx,y+1.2,z+d/2+.02);
 for(const zz of [-d*.28,d*.28]){
  window(out,x+w/2+.03,y+1.15,z+zz,true);
  const mirror=[];window(mirror,0,y+1.15,zz,true);
  out.push(...mirror.map(f=>({...f,points:f.points.map(([xx,yy,zp])=>[x-w/2-.03-xx,yy,z+zp])})));
 }

 box(out,x+w/2+.12,y+.1,z,.14,2.15,1,'#6d8378');
 for(let i=0;i<5;i++)wire(out,[[x+w/2+.2,y+.2,z-.35+i*.17],[x+w/2+.2,y+2.05,z-.35+i*.17]],'#a9b293',.5);
 cylinder(out,x+w/2+.22,y+1.1,z+.3,.04,.09,'#e0c380',6);
 for(let i=0;i<3;i++)box(out,x+w/2+.4+i*.23,y-.04-i*.14,z,.5,.15,1.3,'#b4ac8b');
 box(out,x-w*.23,y+h+.7,z-d*.18,.55,1.15,.55,'#b8a587');box(out,x-w*.23,y+h+1.8,z-d*.18,.72,.14,.72,'#718276');
 cylinder(out,x+w/2+.07,y+1.7,z-d*.41,.045,1.5,'#788d80',6);
 if(shop){
  const front=z+d/2;
  out.push(face([[x-1.8,y+3,front+.15],[x-1.8,y+2.45,front+1.8],[x+1.8,y+2.45,front+1.8],[x+1.8,y+3,front+.15]],'#c4a971'));
  for(const xx of [x-1.65,x+1.65])cylinder(out,xx,y,front+1.65,.055,2.45,'#7a8267',6);
  for(let i=0;i<6;i++){const xx=x-1.8+i*.6;out.push(face([[xx,y+3.01,front+.15],[xx,y+2.46,front+1.8],[xx+.24,y+2.46,front+1.8],[xx+.24,y+3.01,front+.15]],'#e7d8ad',false));}
  box(out,x,y+3.05,front+.15,1.8,.6,.18,'#806c51');
  wire(out,[[x-.4,y+3.2,front+.25],[x+.4,y+3.5,front+.25]],'#d6c898',1.7);
  wire(out,[[x-.4,y+3.5,front+.25],[x+.4,y+3.2,front+.25]],'#d6c898',1.7);

 }
 // Flower boxes and clay pots at the front wall.
 for(const xx of [-w*.28,w*.28]){box(out,x+xx,y+.93,z+d/2+.25,1,.28,.45,'#a58760');for(let j=0;j<4;j++){cylinder(out,x+xx-.33+j*.22,y+1.16,z+d/2+.25,.14,.35,['#9ba36c','#8b9e6e','#ba9a6c'][j%3],5,.09);}}
}
function broadTree(out,x,z,size=1){
 disc(out,x+.6,.725,z+.5,size*1.6,size*.95,'#587c65',12,.2);
 cylinder(out,x,.76,z,.17*size,2.2*size,'#8e7c5d',7,.1*size);
 wire(out,[[x,1.7*size,z],[x+.65*size,2.8*size,z-.2*size]],'#8e7c5d',1.8);
 for(const [a,b,c,r,col] of [[0,3,0,1.3,'#77966d'],[-.8,2.5,.2,1,'#86a175'],[.8,2.6,-.2,1.05,'#8ca877'],[.2,3.7,.1,.9,'#9aaf7e']])rock(out,x+a*size,.76+b*size,z+c*size,r*size,r*.72*size,col,a+3);
}
function fence(out,points,height=.8){
 for(let i=0;i<points.length;i++){const [x,z]=points[i];box(out,x,.76,z,.12,height,.12,'#b9b897');if(i)for(const h of [.3,.65])wire(out,[[points[i-1][0],.76+h,points[i-1][1]],[x,.76+h,z]],'#bfbea0',1.1);}
}
function barrel(out,x,z,r=.55,y=.76){
 cylinder(out,x,y,z,r,1.1,'#9d865e',10,r*.91);
 for(const yy of [.18,.78]){const ring=Array.from({length:13},(_,i)=>[x+Math.cos(i/12*TAU)*r,y+yy,z+Math.sin(i/12*TAU)*r]);wire(out,ring,'#64786d',1);}
 wire(out,[[x-r*.7,y+1.11,z],[x+r*.7,y+1.11,z]],'#6a7964',.7);
}
function crate(out,x,z,w=1.2,y=.76){
 box(out,x,y,z,w,w*.72,w*.85,'#b29a6c');
 for(const a of [-.34,.34])box(out,x+a*w,y+.02,z,w*.1,w*.74,w*.9,'#c8b182');
 wire(out,[[x-w*.43,y+.06,z+w*.44],[x+w*.43,y+w*.7,z+w*.44]],'#8b7e59',.8);
}
function bench(out,x,z){
 box(out,x,.76,z,.15,.8,2.6,'#657d71');box(out,x+1,.76,z,.15,.8,2.6,'#657d71');
 for(let i=0;i<4;i++)box(out,x+.5,1.52,z-.9+i*.6,1.3,.12,.45,'#bbac82');
 box(out,x-.15,1.9,z,.14,.75,2.8,'#a89872');
}
function lamp(out,x,z,h=3.3){cylinder(out,x,.76,z,.065,h,'#6b8174',6);box(out,x,.76+h,z,.42,.6,.42,'#c9b578');cone(out,x,1.36+h,z,.4,.22,'#627c71',6);}
function garden(out,x,z){
 ground(out,[[x-3,.74,z-2],[x+3,.74,z-2],[x+3,.74,z+2],[x-3,.74,z+2]],'#8f916e');
 for(let i=0;i<5;i++){path(out,[[x-2.5+i*1.2,z-1.7],[x-2.5+i*1.2,z+1.7]],.22,'#b7ad84');for(let j=0;j<4;j++)rock(out,x-2.1+i*1.15,.77,z-1.3+j*.8,.32,.35,['#7a9465','#96a773'][j%2],i+j);}
 fence(out,Array.from({length:9},(_,i)=>[x-3+i*.75,z+2.2]),.65);
}
function quay(out,x,z,w,d,y=.76){
 const sides=[];box(sides,x,.02,z,w,y-.02,d,'#a69e80');out.push(...sides.slice(2));
 const count=Math.ceil(d/.52),step=d/count;
 for(let i=0;i<count;i++){const a=z-d/2+i*step,b=a+step;out.push(face([[x-w/2,y,a],[x+w/2,y,a],[x+w/2,y,b],[x-w/2,y,b]],i%3?'#b3a783':'#bfaf89',true));}
 for(const xx of [x-w/2+.35,x+w/2-.35])for(const zz of [z-d/2+.5,z+d/2-.5]){cylinder(out,xx,y,zz,.18,.5,'#6c8175',7);cylinder(out,xx,y+.4,zz,.25,.1,'#667a70',7);}
 for(let i=0;i<4;i++){const xx=x-w/2+.8+i*(w-1.6)/3;cylinder(out,xx,-.45,z+d/2-.1,.18,.65,'#657f73',7);wire(out,[[xx-.2,y,z+d/2],[xx,.2,z+d/2+.16],[xx+.2,y,z+d/2]],'#5b746a',2.4);}
}
function lighthouse(out){
 cottage(out,-31,-51.5,4.3,3.7,'#e2d8b5','#7c8a77');
 disc(out,-30,.73,-56,2.4,2.4,'#bbb99a');
 for(let i=0;i<5;i++)cylinder(out,-30,.76+i*2.1,-56,1.2-i*.08,2.1,i%2?'#b17d5c':'#e6dfc5',12,1.12-i*.08);
 for(let i=0;i<4;i++)window(out,-29.1+i*.08,2+i*2,-56,true,.3,.6);
 cylinder(out,-30,11.26,-56,1.55,.16,'#7b8b79',16);cylinder(out,-30,11.42,-56,1,.88,'#d9c786',12);cone(out,-30,12.3,-56,1.5,1.2,'#8c7961',12);
 for(let i=0;i<12;i++){const a=i/12*TAU;wire(out,[[-30+Math.cos(a)*1.4,11.4,-56+Math.sin(a)*1.4],[-30+Math.cos(a)*1.4,12,-56+Math.sin(a)*1.4]],'#5b786f',.8);}
 wire(out,Array.from({length:25},(_,i)=>[-30+Math.cos(i/24*TAU)*1.4,12,-56+Math.sin(i/24*TAU)*1.4]),'#55756c',1.1);
 path(out,[[-30,-52],[-27,-51],[-23,-49]],1.1);quay(out,-23.5,-49,8,2.4);
 barrel(out,-24,-50.5,.36);crate(out,-25,-49,1);
 fence(out,[[-33,-57],[-33.5,-55],[-33.5,-53],[-33,-51]],.75);
 lamp(out,-22,-49.4,2);tree(out,-33.5,.76,-52,1.6);
}
export function buildShoreScene(){
 const out=[];
 for(const island of LAND){
  const coast=Array.from({length:48},(_,i)=>{const a=i/48*TAU,r=.97+.03*Math.sin(i*2.3+island.x);return [island.x+Math.cos(a)*island.rx*r,.65,island.z+Math.sin(a)*island.rz*r];});
  const grass=coast.map(([x,y,z])=>[island.x+(x-island.x)*.93,.73,island.z+(z-island.z)*.93]);
  ground(out,coast,'#b8b397');ground(out,grass,'#91a47b');
  for(let i=0;i<coast.length;i++){const a=coast[i],b=coast[(i+1)%coast.length];out.push(face([[a[0],-.18,a[2]],a,b,[b[0],-.18,b[2]]],i%3?'#9b9f88':'#a9ac92',false));}
  for(let i=0;i<38;i++){const a=i*2.399,r=Math.sqrt((i+.5)/38)*.88,x=island.x+Math.cos(a)*r*island.rx,z=island.z+Math.sin(a)*r*island.rz;
   disc(out,x,.735,z,.5+(i%3)*.45,.3+(i%2)*.3,['#829873','#a1ae7e','#acb48a','#7f9978'][i%4],5,.45);
   if(i%3===0)for(let j=0;j<3;j++)wire(out,[[x+j*.18,.74,z],[x+j*.18+.07,.9,z]],'#9eac7e',.5);
  }
  for(let i=0;i<20;i++){const a=i/20*TAU,x=island.x+Math.cos(a)*island.rx*.94,z=island.z+Math.sin(a)*island.rz*.94;if(island.id==='port'&&x>-31)continue;rock(out,x,.05,z,.4+(i%4)*.16,.45+(i%3)*.18,['#a2a58c','#8f9f90','#b2b49b'][i%3],i);}
 }
 // The port's paths connect actual doors, workshop, cargo apron and quay.
 path(out,[[-43,-4],[-38,1],[-32,1],[-29,7],[-25,16]],1.8);
 path(out,[[-41,10],[-33,11],[-29,14],[-29,23],[-40,24]],1.6);
 path(out,[[-38,1],[-38,11]],1.1);
 cottage(out,-43,-2,5,4.7,'#d5d6b8','#627e75');
 cottage(out,-35,0,5.5,5,'#d9c99f','#6c8a7c',true);
 cottage(out,-42,10,6,5,'#e4d7b4','#8b8067');
 cottage(out,-42,23,6,5,'#c5cdb2','#66857c');
 garden(out,-48,20);broadTree(out,-50,7,1.35);broadTree(out,-46,-10,1.1);tree(out,-54,.76,15,2.7);tree(out,-51,.76,-5,2.3);
 broadTree(out,-36,23,.9);bench(out,-33,14);lamp(out,-29,10);lamp(out,-29,-3);
 fence(out,[[-46,14],[-44,14],[-42,14],[-40,14]],.85);
 // The workshop has tools, a timber rack, spare spars and a rain barrel.
 box(out,-31.6,.76,-2.3,2.6,1.1,1.3,'#9f9167');
 for(let i=0;i<5;i++){box(out,-31.6,1.88,-2.8+i*.23,3,.09,.16,'#c8b188');wire(out,[[-33+i*.28,.78,-3.5],[-32+i*.28,3,-3.5]],'#ac9d72',1.2);}
 barrel(out,-31,-4,.48);crate(out,-32,4,1);crate(out,-31,5.5,.8);
 // Stone apron, individual timber planks, goods and coiled mooring lines.
 quay(out,-25.5,16,9,12);
 for(let i=0;i<5;i++)crate(out,-27+(i%2)*1.8,11+Math.floor(i/2)*1.8,1.2,.77+(i===4?.9:0));
 for(const [x,z] of [[-27,20],[-25.5,20],[-24,12]])barrel(out,x,z,.45);
 for(const [x,z] of [[-22,13],[-22.5,20.5]])for(let i=0;i<3;i++)wire(out,Array.from({length:17},(_,j)=>[x+Math.cos(j/16*TAU)*(.35+i*.11),.8+i*.015,z+Math.sin(j/16*TAU)*(.35+i*.11)]),'#c4b98b',.8);
 // Crane foundation and cab; moving tackle is supplied by the renderer.
 box(out,-28,.75,2,1.7,.3,1.7,'#9aa187');cylinder(out,-28,1.05,2,.4,6.7,'#a79368',8);box(out,-28,7.7,2,2.3,.8,1.3,'#89947b');
 box(out,-26.83,7.85,2,.025,.45,.9,'#507d7a');
 for(let i=0;i<10;i++)wire(out,[[-28.5,1.2+i*.58,2.3],[-28.5,1.2+i*.58,2.8]],'#7b8e77',.8);
 wire(out,[[-28.5,1.2,2.3],[-28.5,7,2.3]],'#7b8e77',.8);wire(out,[[-28.5,1.2,2.8],[-28.5,7,2.8]],'#7b8e77',.8);
 // Boat shed and a sheltered bench at the south end of the harbour.
 box(out,-39,.76,27,4,1.7,3.2,'#a7aa88');roof(out,-39,2.46,27,4.4,3.6,.8,'#708c7d');
 for(let i=0;i<6;i++)wire(out,[[-37,.9,25.6+i*.5],[-37,2.3,25.6+i*.5]],'#c0ba93',.6);
 lighthouse(out);
 // Fishing village: small gardens, nets, laundry posts and windmill platform.
 cottage(out,-24,48,4.6,3.8,'#dfd2a9','#879078');cottage(out,-27,53,4.3,3.8,'#d0d2af','#68887b');cottage(out,-20,54,4.4,3.8,'#e1d5b5','#8e9071');
 path(out,[[-26,53],[-22,51],[-18,49],[-14,47]],1.2);quay(out,-14.5,47,8,2.1);garden(out,-27,48);
 for(const x of [-18,-16])barrel(out,x,47,.4);crate(out,-17,48,1);
 for(const x of [-23,-18])cylinder(out,x,.76,56,.065,2,'#918a65',6);
 wire(out,[[-23,2.6,56],[-20.5,2.3,56],[-18,2.6,56]],'#8b9270',.8);

 cylinder(out,-27,.76,45,.9,5,'#d4c6a2',9,.6);cone(out,-27,5.76,45,1.3,1.2,'#a1845f',9);
 broadTree(out,-29,55,.9);broadTree(out,-18,51,.75);
 // Eastern islands retain a wilder, recognisably different silhouette.
 for(let i=0;i<13;i++){const a=i*2.4,r=Math.sqrt((i+.5)/13)*.7;tree(out,54+Math.cos(a)*r*10,.76,-48+Math.sin(a)*r*7,2.8+(i%3)*.55);}
 for(let i=0;i<7;i++)rock(out,57+Math.sin(i*2.4)*4,.73,49+Math.cos(i*2.4)*3,1.4+i*.1,1.5+(i%3)*.7,'#9da58f',i);
 return out;
}
