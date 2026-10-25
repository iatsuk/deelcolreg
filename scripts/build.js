import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// One revision for the whole module graph prevents a cached page mixing releases.
// Source URLs stay relative, including when embedded or hosted under a subpath.
const files=(await readdir('src')).filter(name=>/\.(js|css)$/.test(name)).sort();
const hash=createHash('sha256');
for(const name of files)hash.update(name).update(await readFile(`src/${name}`));
const revision=hash.digest('hex').slice(0,12);
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'favicon.svg', 'src', 'assets']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
for(const name of files.filter(name=>name.endsWith('.js'))){
  const path=`dist/src/${name}`;
  const source=await readFile(path,'utf8');
  await writeFile(path,source.replace(/from (['"])(\.\/[^'"]+\.js)\1/g,(_,quote,url)=>`from ${quote}${url}?v=${revision}${quote}`));
}
const html=await readFile('dist/index.html','utf8');
await writeFile('dist/index.html',html.replace(/(\.\/src\/[^"']+\.(?:js|css))(["'])/g,`$1?v=${revision}$2`));
console.log(`Static game built in dist/ (${revision})`);
