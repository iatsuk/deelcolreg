import {norm} from './world-engine.js';
import {portProject} from './harbor-port-layout.js';

// Authored port transits, with their turnaround outside the illustrated plate.
// The saved scenery clock makes returning to the port resume the same traffic.
const ROUTES=[
 {id:'port-sail',name:'Береговой',type:'sail',paint:'#f0e4bd',points:[{x:-8,z:-64},{x:-10,z:15},{x:65,z:25}],period:156,offset:.28,reverse:false},
 {id:'port-cutter',name:'Речной',type:'motor',paint:'#a96447',points:[{x:-8,z:-64},{x:-10,z:15},{x:65,z:25}],lane:12,period:182,offset:.68,reverse:true}
];
function position(points,t,lane=0){
 const [a,b,c]=points,u=1-t,dx=2*(u*(b.x-a.x)+t*(c.x-b.x)),dz=2*(u*(b.z-a.z)+t*(c.z-b.z)),ddx=2*(c.x-2*b.x+a.x),ddz=2*(c.z-2*b.z+a.z),l=Math.hypot(dx,dz),dl=(dx*ddx+dz*ddz)/l;
 return {x:u*u*a.x+2*u*t*b.x+t*t*c.x+lane*dz/l,z:u*u*a.z+2*u*t*b.z+t*t*c.z-lane*dx/l,dx:dx+lane*(ddz/l-dz*dl/(l*l)),dz:dz+lane*(-ddx/l+dx*dl/(l*l))};
}
export function portTrafficAt(clock=0){
 clock=Number.isFinite(clock)?Math.max(0,clock):0;
 return ROUTES.map(route=>{
  const phase=((clock/route.period+route.offset)%1+1)%1,t=route.reverse?1-phase:phase,p=position(route.points,t,route.lane),sign=route.reverse?-1:1;
  const dx=p.dx*sign,dz=p.dz*sign;
  const trail=[];
  for(let seconds=14;seconds>=1;seconds-=1.4){const old=phase-seconds/route.period;if(old>=0){const q=position(route.points,route.reverse?1-old:old,route.lane);trail.push({x:q.x,z:q.z});}}
  return {id:route.id,name:route.name,type:route.type,paint:route.paint,x:p.x,z:p.z,h:norm(Math.atan2(dx,-dz)*180/Math.PI),s:Math.hypot(dx,dz)/route.period,trail};
 });
}
export function portTransitIsVisible(ship){const p=portProject(ship.x,ship.z);return p.x>-60&&p.x<1500&&p.y>-80&&p.y<1080;}
