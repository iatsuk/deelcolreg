// Where quest sources live, and the bundle of parts the game assembles errands from.
import {readFileSync,readdirSync} from 'node:fs';
import {compileQuest} from './compile.js';

const ROOT=new URL('../../quests/freight/',import.meta.url);
const read=path=>readFileSync(new URL(path,ROOT),'utf8');
const names=dir=>readdirSync(new URL(dir,ROOT)).filter(f=>f.endsWith('.quest')).map(f=>f.slice(0,-6));
export const load=name=>read(`deck/${name}.quest`);
export const compile=source=>compileQuest(source,{load});
export function makeBundle(){
 const deck=Object.fromEntries(names('deck/').filter(n=>n!=='ship').map(n=>[n,compile(load(n))]));
 const errands=Object.fromEntries(names('errands/').map(n=>[n,compile(read(`errands/${n}.quest`))]));
 return {template:compile(read('errand.quest')),deck,errands};
}
