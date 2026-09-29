// Deletes everything in ../.cf-manifest.json (Workers first, then their resources), looking up IDs
// by exact name, and removes each entry once it is gone. Nothing outside the manifest is touched.
// Run from a project directory so ./node_modules/.bin/cf is that project's cf.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifest = new URL('../.cf-manifest.json', import.meta.url);
if (!existsSync(manifest)) { console.log('Nothing recorded in .cf-manifest.json.'); process.exit(0); }
let entries = JSON.parse(readFileSync(manifest, 'utf8'));

const cf = (...args) => execFileSync('./node_modules/.bin/cf', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Lists page at 10 by default without saying so: always ask for the maximum.
const list = (...args) => JSON.parse(cf(...args, '--per-page', '100'));

const ids = {
  worker: name => list('workers', 'list').find(w => w.name === name)?.id,
  kv: name => list('kv', 'namespaces', 'list').find(n => n.title === name)?.id,
  d1: name => list('d1', 'list').find(d => d.name === name)?.uuid,
  r2: name => name,
  queue: name => JSON.parse(cf('queues', 'list')).find(q => q.queue_name === name)?.queue_id,
  workflow: name => name,
};
const remove = {
  worker: id => cf('workers', 'delete', id, '--force'),
  kv: id => cf('kv', 'namespaces', 'delete', id, '--force'),
  d1: id => cf('d1', 'delete', id, '--force'),
  r2: id => cf('r2', 'buckets', 'delete', id, '--force'),
  queue: id => cf('queues', 'delete', id, '--force'),
  workflow: id => cf('workflows', 'delete', id, '--force'),
};

const order = ['worker', 'workflow', 'queue', 'kv', 'd1', 'r2'];
for (const entry of [...entries].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
  try {
    const id = ids[entry.kind](entry.name);
    if (id) remove[entry.kind](id);
    console.log(`${id ? 'deleted' : 'already gone'}: ${entry.kind} ${entry.name}`);
    entries = entries.filter(e => e !== entry);
  } catch (error) {
    console.error(`failed: ${entry.kind} ${entry.name}: ${(error.stderr || error.message).split('\n')[0]}`);
  }
  writeFileSync(manifest, JSON.stringify(entries, null, 2) + '\n');
}
if (entries.length) process.exit(1);
