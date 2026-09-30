// Small helpers the mise tasks share, so no task deals with IDs or cf's rough edges:
//   cfx.mjs worker             the Worker name PROJECT's config resolves to in MODE (cf build --mode)
//   cfx.mjs db-id <name>       D1 name -> UUID (cf d1 only takes UUIDs)
//   cfx.mjs kv-id <title>      KV namespace title -> id (cf kv only takes ids)
//   cfx.mjs table              stdin: cf d1 query JSON -> a table, or rows changed
//   cfx.mjs rename <dir> <n>   replace __NAME__ with <n> in every file of a new project
//   cfx.mjs port <vite.config> make Vite take its port from PORT (cf dev --port does not work)
// Runs in a project directory, with that project's cf. Lists ask for 100 per page: cf silently
// returns only the first page otherwise.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Upstream: cloudflare/cf#20 (when fixed: lists return everything, so drop the --per-page 100)
// Upstream: cloudflare/cf#38 (when fixed: pass names where cf wants ids, so db-id / kv-id can go)
const cf = (...args) => execFileSync('./node_modules/.bin/cf', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const fail = message => { console.error(message); process.exit(1); };
const [command, name] = process.argv.slice(2);

if (command === 'worker') {
  if (process.env.WORKER) { console.log(process.env.WORKER); process.exit(0); }
  cf('build', '--mode', process.env.MODE || 'production');
  console.log(JSON.parse(readFileSync('.cloudflare/output/v0/workers/default/worker.config.json', 'utf8')).name);
} else if (command === 'db-id') {
  const db = JSON.parse(cf('d1', 'list', '--name', name, '--per-page', '100')).find(d => d.name === name);
  db ? console.log(db.uuid) : fail(`no D1 database named ${name}`);
} else if (command === 'kv-id') {
  const ns = JSON.parse(cf('kv', 'namespaces', 'list', '--per-page', '100')).find(n => n.title === name);
  ns ? console.log(ns.id) : fail(`no KV namespace named ${name}`);
} else if (command === 'table') {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  for (const result of JSON.parse(input)) result.results.length ? console.table(result.results) : console.log(`${result.meta.changes} row(s) changed`);
} else if (command === 'rename') {
  const newName = process.argv[4];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(newName ?? '')) fail(`a Worker name is lowercase letters, digits and dashes (got ${newName})`);
  for (const file of readdirSync(name, { recursive: true })) {
    const path = join(name, file);
    try { const text = readFileSync(path, 'utf8'); if (text.includes('__NAME__')) writeFileSync(path, text.replaceAll('__NAME__', newName)); } catch {}
  }
} else if (command === 'port') {
  const text = readFileSync(name, 'utf8');
  if (!text.includes('process.env.PORT')) writeFileSync(name, text.replace('plugins: [cloudflare()],', 'server: { port: Number(process.env.PORT) || 5173, strictPort: true },\n\tplugins: [cloudflare()],'));
} else {
  fail('usage: cfx.mjs worker | db-id <name> | kv-id <title> | table | rename <dir> <name> | port <vite.config.ts>');
}
