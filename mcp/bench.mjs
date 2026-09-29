// Search benchmark: `cf cli search` vs this server's search (search.mjs over catalog.json), on the
// same tasks. Scored only on tasks some visible API operation answers (CLI-only tasks such as
// `cf dev` don't count), top-1 and top-5. Needs `cf` on PATH (mise tool). Read only.
import { execFileSync } from 'node:child_process';
import { createIndex, loadCatalog } from './search.mjs';

// [task, what counts as right for cf (command), what counts as right for the API (METHOD path name)]
const tasks = [
  ['deploy a worker', /^cf deploy$|workers (scripts )?(update|deploy)|versions (create|deploy)/, null],
  ['roll back a worker to a previous version', /deployments create|rollback/, /^POST .*workers\/scripts\/\{[^}]+\}\/deployments /],
  ['tail live logs of a worker', /tail/, /\/tails /],
  ['set a secret on a worker', /workers.*secrets (update|create|put)/, /^PUT .*workers\/scripts\/\{[^}]+\}\/secrets /],
  ['run d1 migrations', /d1 migrations apply/, null],
  ['purge cache for a zone', /cache purge/, /^POST \/zones\/\{[^}]+\}\/purge_cache /],
  ['add a dns record', /dns records create/, /^POST .*dns_records /],
  ['create a cloudflare tunnel', /tunnels (create|cloudflared create)|tunnels quick-start/, /^POST .*(cfd_tunnel|tunnels) /],
  ['create a kv namespace', /kv namespaces create/, /^POST .*storage\/kv\/namespaces /],
  ['write a value to kv', /kv namespaces values update|kv .*(put|write|update)/, /^PUT .*values\/\{/],
  ['create an r2 bucket', /r2 buckets create/, /^POST .*r2\/buckets /],
  ['upload a file to r2', /r2 objects (put|upload|create)/, /^PUT .*r2\/buckets\/\{[^}]+\}\/objects/],
  ['run a sql query against d1', /d1 (query|execute)/, /^POST .*d1\/database\/\{[^}]+\}\/(query|raw) /],
  ['list workers', /^cf workers list$/, /^GET .*workers\/(scripts|workers) /],
  ['create a queue', /queues create/, /^POST .*\/queues /],
  ['send a message to a queue', /queues messages (push|send|create)/, /^POST .*queues\/\{[^}]+\}\/messages /],
  ['add a custom domain to a worker', /workers domains (update|create|attach)|custom-domains/, /^(PUT|POST) .*workers\/domains/],
  ['create an api token', /tokens create/, /^POST \/(user|accounts\/\{[^}]+\})\/tokens /],
  ['list zones', /^cf zones list$/, /^GET \/zones /],
  ['query worker logs', /observability telemetry query/, /observability\/telemetry\/query /],
  ['create a hyperdrive config', /hyperdrive (configs )?create/, /^POST .*hyperdrive\/configs /],
  ['start local dev server', /^cf dev$/, null],
  ['create a d1 database', /^cf d1 create$/, /^POST .*d1\/database /],
  ['delete a worker', /^cf workers delete$/, /^DELETE .*workers\/(scripts|workers)\/\{[^}]+\} /],
  ['show worker versions', /versions list/, /^GET .*workers\/.*versions /],
];

const catalog = loadCatalog();
const ours = createIndex(catalog);
const key = r => `${r.method} ${r.path} ${r.name}`;
const rank = (hits, re) => hits.findIndex(h => re.test(h)) + 1;
const rows = [];
for (const [task, cfRe, apiRe] of tasks) {
  const answerable = apiRe && catalog.some(t => apiRe.test(`${t._http.method} ${t._http.path} ${t.name}`));
  let cfHits = [];
  try { cfHits = JSON.parse(execFileSync('cf', ['cli', 'search', task], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).map(h => h.command); } catch {}
  const ourHits = ours(task, 5).map(key);
  rows.push({ task, answerable, cf: rank(cfHits, cfRe), ours: answerable ? rank(ourHits, apiRe) : null, cfTop: cfHits[0] ?? '-', ourTop: ourHits[0] ?? '-' });
}

const scored = rows.filter(r => r.answerable);
const pct = (n, d) => `${n}/${d}`;
console.log('| task | cf rank | ours rank | cf top hit | our top hit |\n|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.task} | ${r.cf || 'miss'} | ${r.answerable ? r.ours || 'miss' : 'n/a'} | ${r.cfTop} | ${r.answerable ? r.ourTop : 'n/a'} |`);
console.log(`\nScored on ${scored.length} API-backed tasks:`);
console.log(`  cf cli search: top-1 ${pct(scored.filter(r => r.cf === 1).length, scored.length)}, top-5 ${pct(scored.filter(r => r.cf > 0).length, scored.length)}`);
console.log(`  ours:          top-1 ${pct(scored.filter(r => r.ours === 1).length, scored.length)}, top-5 ${pct(scored.filter(r => r.ours > 0).length, scored.length)}`);
