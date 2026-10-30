// Authored observations for the watch fragment; both renderers use this record.
// Coordinates are schematic, with north at the top. No future motion is logged.
export const WATCH_OBSERVATIONS = [
  {time:'22:04',own:{x:406,y:660},target:{x:406,y:500},note:'«Смена» подходит с кормы «Марты».'},
  {time:'22:07',own:{x:530,y:505},target:{x:406,y:430},note:'«Смена» выходит к правому борту; обгон продолжается.'},
  {time:'22:10',own:{x:530,y:360},target:{x:406,y:363},note:'Суда рядом. «Марта» ещё не оставлена позади.'},
];
export function watchFrame(index=2){
  const n=Number.isInteger(index)?Math.max(0,Math.min(2,index)):2;
  return {...WATCH_OBSERVATIONS[n],own:{...WATCH_OBSERVATIONS[n].own},target:{...WATCH_OBSERVATIONS[n].target},index:n,ownTrack:WATCH_OBSERVATIONS.slice(0,n+1).map(p=>({...p.own})),targetTrack:WATCH_OBSERVATIONS.slice(0,n+1).map(p=>({...p.target}))};
}
// Keep the whole encounter east of the scenery, with open water ahead of both
// bows. Both views share positions and the proposed path, rather than composing
// boats independently around a decorative island.
export const ISLAND_SEA={minX:-6.9,maxX:6.9,minZ:-5.75,maxZ:5.75};
export const WATCH_SHIPS={own:{halfBeam:.25,length:1.25},target:{halfBeam:.36,length:1.6}};
export const WATCH_HULL_RADIUS=1.35; // encloses the larger hull in any heading
export function toIslandPosition(point){return {x:3+(point.x-406)*.0165,z:-.6+(point.y-363)*.0165};}
export function toSceneryPoint([x,y,z]){return [x*.72-2.65,-.09+(y+.09)*.72,z*.72-1.75];}
export const WATCH_RETURN={start:{...WATCH_OBSERVATIONS[2].own},control:{x:530,y:315},bend:{x:465,y:280},end:{x:406,y:245}};
export function proposedWatchTrack(){
 const {start:a,control:b,bend:c,end:d}=WATCH_RETURN,points=[];
 for(let i=0;i<=20;i++){const t=i/20,u=1-t;points.push({x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y});}
 points.push({...d});return points;
}

