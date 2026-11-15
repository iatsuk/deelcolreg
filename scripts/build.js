import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// One revision for the whole module graph prevents a cached page mixing releases.
// Source URLs stay relative, so the site also works under a subpath.
const PAGES=['index.html','freight.html','404.html'];
const files=(await readdir('src')).filter(name=>/\.(js|css)$/.test(name)).sort();
const hash=createHash('sha256');
for(const name of files)hash.update(name).update(await readFile(`src/${name}`));
async function hashDirectory(path){for(const item of (await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=`${path}/${item.name}`;if(item.isDirectory())await hashDirectory(p);else hash.update(p).update(await readFile(p));}}
await hashDirectory('quests');
await hashDirectory('assets');
const revision=hash.digest('hex').slice(0,12);
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of [...PAGES, 'favicon.svg', 'src', 'assets', 'quests']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
for(const name of files.filter(name=>name.endsWith('.js'))){
  const path=`dist/src/${name}`;
  const source=await readFile(path,'utf8');
  await writeFile(path,source.replace(/from (['"])(\.\/[^'"]+\.js)\1/g,(_,quote,url)=>`from ${quote}${url}?v=${revision}${quote}`));
}
for (const name of PAGES) {
  const html=await readFile(`dist/${name}`,'utf8');
  await writeFile(`dist/${name}`,html.replace(/(\.\/src\/[^"']+\.(?:js|css))(["'])/g,`$1?v=${revision}$2`));
}
console.log(`Static game built in dist/ (${revision})`);
