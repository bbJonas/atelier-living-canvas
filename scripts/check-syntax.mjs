import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const roots = ['src','public','scripts','test'];
async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path));
    else if (path.endsWith('.mjs')) out.push(path);
  }
  return out;
}
for (const root of roots) for (const file of await files(root)) {
  execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
}
console.log('ES module syntax: OK');
