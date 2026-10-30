import test from 'node:test';
import assert from 'node:assert/strict';
import { watchFrame, toIslandPosition, toSceneryPoint, proposedWatchTrack, ISLAND_SEA, WATCH_HULL_RADIUS, WATCH_SHIPS } from '../src/design-encounter.js';
import { createIsland, buildIslandScene } from '../src/design-island.js';

test('both views preserve the aft approach and the current starboard position', () => {
  const first=watchFrame(0),last=watchFrame(2);
  assert.equal(first.own.x,first.target.x);
  assert.ok(first.own.y>first.target.y);
  assert.ok(last.own.x>last.target.x);
  assert.ok(Math.abs(last.own.y-last.target.y)<5);
  const firstOwn=toIslandPosition(first.own),firstTarget=toIslandPosition(first.target);
  const lastOwn=toIslandPosition(last.own),lastTarget=toIslandPosition(last.target);
  assert.ok(firstOwn.z>firstTarget.z);
  assert.ok(lastOwn.x>lastTarget.x);
  assert.ok(Math.abs(lastOwn.z-lastTarget.z)<.06);
});

test('earlier records contain no future track and a view cannot mutate the record', () => {
  for(let i=0;i<3;i++){
    const frame=watchFrame(i);
    assert.equal(frame.ownTrack.length,i+1);
    assert.equal(frame.targetTrack.length,i+1);
    assert.deepEqual(frame.ownTrack.at(-1),frame.own);
  }
  watchFrame(1).ownTrack[0].x=999;
  watchFrame(0).own.x=999;
  assert.equal(watchFrame(0).own.x,406);
  assert.equal(watchFrame(100).time,'22:10');
});

// Exercise a rendered pixel on the far offshore rock. Before the underlay fix,
// the large sea face was painted over this rock because of its average depth.
test('a far-shore rock remains visible above water at several camera angles', () => {
  const original={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame,media:globalThis.matchMedia,dpr:globalThis.devicePixelRatio};
  let frame;
  globalThis.requestAnimationFrame=callback=>(frame=callback,1);
  globalThis.cancelAnimationFrame=()=>{};
  globalThis.matchMedia=()=>({matches:true});
  globalThis.devicePixelRatio=1;
  const inside=(point,polygon)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }return hit;};
  try{
    for(const yaw of [-.75,0,.75,2.25]){
      let path=[],fills=[];
      const c={globalAlpha:1,setTransform(){},clearRect(){},fillRect(){},createRadialGradient(){return {addColorStop(){}};},save(){},translate(){},scale(){},restore(){},beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},closePath(){},fill(){if(path.length>2&&this.globalAlpha===1)fills.push({points:[...path],color:this.fillStyle});},stroke(){},setLineDash(){},arc(){},quadraticCurveTo(){},fillText(){}};
      const canvas={getContext:()=>c,getBoundingClientRect:()=>({width:870,height:624}),addEventListener(){},style:{}};
      const world=createIsland(canvas,{camera:{yaw,elevation:.57,zoom:1}});
      frame(0);
      const p=toSceneryPoint([3.2,.15,-2.3]),scale=Math.min(870/19,624/13.9),x=p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),z=p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);
      const pixel=[870*.51+x*scale,624*.57+(z*Math.sin(.57)-p[1]*Math.cos(.57))*scale];
      const color=fills.filter(f=>inside(pixel,f.points)).at(-1)?.color;
      assert.ok(color,`pixel rendered at yaw ${yaw}`);
      assert.notEqual(color,'rgb(99,153,174)',`water must not cover the rock at yaw ${yaw}`);
      world.destroy();
    }
  }finally{
    globalThis.requestAnimationFrame=original.raf;globalThis.cancelAnimationFrame=original.caf;globalThis.matchMedia=original.media;globalThis.devicePixelRatio=original.dpr;
  }
});


test('both displays preserve distances and angles through a uniform world scale',()=>{
  const a={x:406,y:363},b={x:506,y:363},c={x:406,y:463};
  const p=toIslandPosition(a),q=toIslandPosition(b),r=toIslandPosition(c);
  assert.ok(Math.abs((q.x-p.x)-(r.z-p.z))<1e-10);
  assert.equal(q.z,p.z);assert.equal(r.x,p.x);
});

test('the full hull corridor and proposed return remain clear of shore and within the sea',()=>{
  const scene=buildIslandScene(),maxShoreX=Math.max(...scene.objects.flatMap(f=>f.points.map(p=>p[0])));
  const paths=[];
  for(let i=0;i<3;i++){const f=watchFrame(i);paths.push(f.ownTrack,f.targetTrack);}
  const latest=watchFrame();
  for(const p of [latest.own,latest.target])paths.push([p,{x:p.x,y:p.y-2.25/.0165}]);
  paths.push(proposedWatchTrack());
  assert.deepEqual(proposedWatchTrack()[0],latest.own);
  for(const path of paths)for(let i=0;i<path.length;i++){
    const a=path[i],b=path[Math.min(i+1,path.length-1)];
    for(let j=0;j<=20;j++){
      const t=j/20,p=toIslandPosition({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
      assert.ok(p.x-WATCH_HULL_RADIUS>maxShoreX+.4,'a hull-sized margin separates every route from all scenery');
      assert.ok(p.x-WATCH_HULL_RADIUS>ISLAND_SEA.minX+.05);
      assert.ok(p.x+WATCH_HULL_RADIUS<ISLAND_SEA.maxX-.05);
      assert.ok(p.z-WATCH_HULL_RADIUS>ISLAND_SEA.minZ+.05);
      assert.ok(p.z+WATCH_HULL_RADIUS<ISLAND_SEA.maxZ-.05);
    }
  }
});


test('the vessels do not overlap during the recorded overtaking approach',()=>{
  const own=WATCH_SHIPS.own,target=WATCH_SHIPS.target;
  for(let i=0;i<2;i++){
    const a=watchFrame(i),b=watchFrame(i+1);
    for(let n=0;n<=100;n++){
      const t=n/100,lerp=(a,b)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
      const o=toIslandPosition(lerp(a.own,b.own)),p=toIslandPosition(lerp(a.target,b.target));
      const sideGap=Math.abs(o.x-p.x)-own.halfBeam-target.halfBeam;
      const aftGap=(o.z-own.length*.79)-(p.z+target.length*.55);
      const forwardGap=(p.z-target.length*.79)-(o.z+own.length*.55);
      assert.ok(Math.max(sideGap,aftGap,forwardGap)>.15,'recorded hulls must stay apart, including between observations');
    }
  }
});
