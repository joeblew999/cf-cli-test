// Reads `cf deploy` output on stdin, passes it through, and records the Worker and every resource
// the deploy created in ../.cf-manifest.json, so cleanup deletes exactly what the tests made.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifest = new URL('../.cf-manifest.json', import.meta.url);
const kinds = { 'KV Namespace': 'kv', 'D1 Database': 'd1', 'R2 Bucket': 'r2', 'Queue': 'queue' };

let output = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) { process.stdout.write(chunk); output += chunk; }

const found = [];
for (const [, kind, name] of output.matchAll(/Creating new (KV Namespace|D1 Database|R2 Bucket|Queue) "([^"]+)"/g)) found.push({ kind: kinds[kind], name });
// The Worker and its live URL (cf deploy prints it; there's no cf command to look up the subdomain).
const url = /(https:\/\/\S+\.workers\.dev)/.exec(output)?.[1];
for (const [, name] of output.matchAll(/Uploaded (\S+) \(/g)) found.push({ kind: 'worker', name, ...(url ? { url } : {}) });

const entries = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : [];
for (const entry of found) {
  const known = entries.find(e => e.kind === entry.kind && e.name === entry.name);
  known ? Object.assign(known, entry) : entries.push(entry);
}
writeFileSync(manifest, JSON.stringify(entries, null, 2) + '\n');
if (found.length) console.log(`recorded in .cf-manifest.json: ${found.map(e => `${e.kind} ${e.name}`).join(', ')}`);
if (!/Deploy complete/.test(output)) process.exit(1);
