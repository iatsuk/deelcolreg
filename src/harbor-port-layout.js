// Shared with the fixed SVG authoring camera in scripts/create-harbor-art.py.
export const PORT_SCALE=15;
const yaw=-.62,elevation=.63,scale=PORT_SCALE;
export function portProject(x,z,y=0){
 x+=30;z-=14;
 return {x:690+(x*Math.cos(yaw)-z*Math.sin(yaw))*scale,y:500+(x*Math.sin(yaw)+z*Math.cos(yaw))*Math.sin(elevation)*scale-y*Math.cos(elevation)*scale,d:(x*Math.sin(yaw)+z*Math.cos(yaw))*Math.cos(elevation)+y*Math.sin(elevation)};
}
