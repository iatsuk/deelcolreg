import {norm} from './world-engine.js';

const TAU=Math.PI*2;
// Closed, navigable fair-weather circuits for background traffic. No despawn,
// endpoint reset, or simulated off-screen observer is involved.
const LANES={
 bay:{x:6,z:0,rx:7,rz:12},
 bayOuter:{x:6,z:0,rx:16,rz:22},
 busy:{x:46,z:1,rx:7,rz:17},
 busyOuter:{x:46,z:1,rx:16,rz:28},
 north:{x:9,z:-45,rx:13,rz:12}
};
const SHIPS=[
 ['lada','Лада','sail','bay',0,.7,'#ded9bf'],
 ['gull','Чайка','motor','bay',Math.PI,.7,'#739b96'],
 ['marta','Марта','cargo','bayOuter',2.8,.7,'#ba7757'],
 ['cedar','Кедр','cargo','busyOuter',.4,1,'#648b91'],
 ['vega','Вега','cargo','busyOuter',Math.PI+.4,1,'#c2a36e'],
 ['pilot','Лоцман-4','motor','busy',2.5,.65,'#b77a53'],
 ['rill','Ручей','motor','busy',Math.PI+2.5,.65,'#d5d7b9'],
 ['dawn','Заря','cargo','north',.2,.65,'#89946c']
];
function place(ship){
 const l=LANES[ship.lane],a=ship.phase;
 ship.x=l.x+Math.cos(a)*l.rx;ship.z=l.z+Math.sin(a)*l.rz;
 ship.h=norm(Math.atan2(-l.rx*Math.sin(a),-l.rz*Math.cos(a))*180/Math.PI);
}
export function createHarborTraffic(seed=0){
 const offset=(seed%1009)/1009*TAU;
 return SHIPS.map(([id,name,type,lane,phase,s,paint])=>{
  const t={id,name,type,lane,phase:phase+offset,s,paint,trail:[],trailClock:0};place(t);return t;
 });
}
export function ensureHarborTraffic(world,seed){
 if(world.harborTrafficVersion===1&&Array.isArray(world.traffic)&&world.traffic.length===SHIPS.length&&world.traffic.every(t=>LANES[t.lane]&&Number.isFinite(t.phase)&&Number.isFinite(t.s)&&t.s>0&&Array.isArray(t.trail)))return;
 world.traffic=createHarborTraffic(seed);world.harborTrafficVersion=1;
}
export function stepHarborTraffic(ships,dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 // Bounded substeps also keep a long frame from cutting across a turn.
 let remaining=Math.min(dt,1);
 while(remaining>1e-8){const step=Math.min(remaining,.05);remaining-=step;
  for(const t of ships){const l=LANES[t.lane];if(!l)continue;
   const metric=Math.hypot(l.rx*Math.sin(t.phase),l.rz*Math.cos(t.phase));
   t.phase=(t.phase+t.s/metric*step)%TAU;place(t);
   t.trailClock+=step;
   if(t.trailClock>=1.4){t.trail.push({x:t.x,z:t.z});t.trail=t.trail.slice(-28);t.trailClock-=1.4;}
  }
 }
}
