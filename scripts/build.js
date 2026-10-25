import { cp, mkdir, rm } from 'node:fs/promises';

// All URLs are relative, so the exact same files work under /colreg/ or in an iframe.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'favicon.svg', 'src', 'assets']) {
  await cp(file, `dist/${file}`, { recursive: true });
}
console.log('Static game built in dist/');
