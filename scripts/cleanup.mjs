// Deletes everything in ../.cf-manifest.json (Workers first, then their resources), looking up IDs
// by exact name, and removes each entry once it is gone. Nothing outside the manifest is touched.
// Uses the cf on PATH (mise.toml pins it). Two things block a plain delete (verified 2026-09-30):
// a Worker that consumes a queue can't be deleted (10064) and the queue can't be deleted while bound
// (11005), so queue consumers are removed first; R2 buckets must be empty (10008), and
// `cf r2 objects bulk-delete` can't empty one (it demands --body; the empty-bucket mode takes none),
// so objects are deleted one by one.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifest = new URL('../.cf-manifest.json', import.meta.url);
if (!existsSync(manifest)) { console.log('Nothing recorded in .cf-manifest.json.'); process.exit(0); }
let entries = JSON.parse(readFileSync(manifest, 'utf8'));

const cf = (...args) => execFileSync('cf', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Lists page at 10 by default without saying so: always ask for the maximum.
// Upstream: cloudflare/cf#20 (when fixed: lists return everything, so drop the --per-page 100)
// Upstream: cloudflare/cf#38 (when fixed: delete by name, so the ids lookups can go)
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

// cf's error box on stderr starts with a blank line: find the "[code] message" line instead.
const why = error => ((error.stderr || '') + (error.stdout || '') || error.message).match(/\[\d+\][^\n]*/)?.[0] ?? (error.stderr || error.stdout || error.message).trim().split('\n')[0];

// Queue consumers first: they block deleting both their Worker and the queue.
for (const entry of entries.filter(e => e.kind === 'queue')) {
  try {
    const id = ids.queue(entry.name);
    if (!id) continue;
    for (const consumer of JSON.parse(cf('queues', 'get', id)).consumers ?? []) {
      cf('queues', 'consumers', 'delete', consumer.consumer_id, '--queue-id', id, '--force');
      console.log(`removed consumer ${consumer.consumer_id} from queue ${entry.name}`);
    }
  } catch (error) {
    console.error(`failed: consumers of queue ${entry.name}: ${why(error)}`);
  }
}

// An R2 bucket must be empty before it can be deleted.
// Upstream: cloudflare/cf#74 (when fixed: one `cf r2 objects bulk-delete --prefix ""` empties the bucket)
const emptyBucket = name => {
  for (const { key } of list('r2', 'objects', 'list', '--bucket-name', name)) cf('r2', 'objects', 'delete', key, '--bucket-name', name, '--force');
};

const order = ['worker', 'workflow', 'queue', 'kv', 'd1', 'r2'];
for (const entry of [...entries].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
  try {
    const id = ids[entry.kind](entry.name);
    if (id && entry.kind === 'r2') emptyBucket(id);
    if (id) remove[entry.kind](id);
    console.log(`${id ? 'deleted' : 'already gone'}: ${entry.kind} ${entry.name}`);
    entries = entries.filter(e => e !== entry);
  } catch (error) {
    console.error(`failed: ${entry.kind} ${entry.name}: ${why(error)}`);
  }
  writeFileSync(manifest, JSON.stringify(entries, null, 2) + '\n');
}
if (entries.length) process.exit(1);
