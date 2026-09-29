// Versions, gradual releases, promote, rollback and error logs of PROJECT's Worker, all through cf
// (cf has no `versions deploy` / `rollback` / `tail`: it has the raw deployments API).
// Usage: deploys.mjs versions | release [percent] | promote [version-id] | rollback [version-id] | errors [--since 60m]
// The Worker is the first `name:` in this project's cloudflare.config.ts (or WORKER=...).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [command = 'versions', ...args] = process.argv.slice(2);
const config = readFileSync('cloudflare.config.ts', 'utf8');
const worker = process.env.WORKER ?? /name:\s*"([^"]+)"/.exec(config.slice(Math.max(0, config.indexOf('default:'))))?.[1];
if (!worker) { console.error('pass WORKER=<name>'); process.exit(1); }

// cf prints API errors as a box on stderr and exits 1: let them through and stop.
const cf = (...a) => {
  try { return execFileSync('./node_modules/.bin/cf', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }); }
  catch (e) { process.stderr.write(e.stdout ?? ''); process.exit(e.status ?? 1); }
};
const json = (...a) => JSON.parse(cf(...a));
const versions = () => json('workers', 'versions', 'list', '--worker-id', worker, '--per-page', '100');
const deployments = () => json('workers', 'deployments', 'list', '--worker', worker, '--per-page', '100').deployments;
const main = d => d.versions.reduce((a, b) => (b.percentage > a.percentage ? b : a)).version_id;
const deploy = (split, message) => {
  const body = { strategy: 'percentage', annotations: { 'workers/message': message }, versions: split.map(([version_id, percentage]) => ({ version_id, percentage })) };
  const { id } = json('workers', 'deployments', 'create', '--worker', worker, '--body', JSON.stringify(body));
  console.log(`deployment ${id}: ${split.map(([v, p]) => `${v.slice(0, 8)} ${p}%`).join(', ')}  (${message})`);
};

if (command === 'versions') {
  const [current] = deployments();
  const live = Object.fromEntries(current.versions.map(v => [v.version_id, v.percentage]));
  for (const v of versions()) {
    const a = v.annotations ?? {};
    console.log(`${String(live[v.id] ?? '').padStart(3)}${live[v.id] ? '%' : ' '}  #${String(v.number).padEnd(3)} ${v.id}  ${v.created_on.slice(0, 19)}  ${(a['workers/tag'] ?? '').padEnd(8)} ${a['workers/triggered_by'].padEnd(14)} ${a['workers/message'] ?? ''}`);
  }
} else if (command === 'release') {
  // Upload the working copy as a new version (not deployed), then send `percent` of traffic to it.
  const percent = Number(args[0] ?? 10);
  if (!(percent > 0 && percent <= 100)) { console.error('release: percent is 1..100'); process.exit(1); }
  const from = main(deployments()[0]);
  const tag = process.env.TAG ?? '';
  cf('workers', 'versions', 'create', ...(tag ? ['--tag', tag] : []), '--message', process.env.MESSAGE ?? `release ${percent}%`);
  const [latest] = versions();
  if (latest.id === from) { console.error('release: the upload made no new version'); process.exit(1); }
  console.log(`uploaded version #${latest.number} ${latest.id}\n  test it first: ${latest.urls?.[0] ?? '(no preview URL)'}`);
  deploy(percent === 100 ? [[latest.id, 100]] : [[latest.id, percent], [from, 100 - percent]], process.env.MESSAGE ?? `release #${latest.number} at ${percent}%`);
} else if (command === 'promote') {
  const id = args[0] ?? versions()[0].id;
  deploy([[id, 100]], `promote ${id.slice(0, 8)}`);
} else if (command === 'rollback') {
  // Default: the version that had most traffic in the deployment before the current one.
  const list = deployments();
  const id = args[0] ?? (list[1] ? main(list[1]) : null);
  if (!id) { console.error('rollback: no earlier deployment; pass a version id'); process.exit(1); }
  deploy([[id, 100]], `rollback to ${id.slice(0, 8)}`);
} else if (command === 'errors') {
  const i = args.indexOf('--since');
  const m = /^(\d+)([mhd])$/.exec(i >= 0 ? args[i + 1] : '60m');
  if (!m) { console.error('errors: --since is a number and m, h or d'); process.exit(1); }
  const to = Date.now(), from = to - Number(m[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[m[2]];
  const body = { queryId: 'cf-cli-test-errors', view: 'events', limit: 50, timeframe: { from, to }, parameters: { datasets: ['cloudflare-workers'], filterCombination: 'and', filters: [
    { key: '$metadata.service', operation: 'eq', type: 'string', value: worker },
    { key: '$metadata.level', operation: 'eq', type: 'string', value: 'error' }] } };
  const result = json('observability', 'telemetry', 'query', '--body', JSON.stringify(body));
  const events = result.events?.events ?? result.result?.events?.events ?? [];
  console.log(`${worker}: ${events.length} error events in the last ${m[0]}`);
  for (const e of events) {
    const meta = e.$metadata ?? {};
    console.log(`${new Date(e.timestamp).toISOString()}  ${(e.$workers?.scriptVersion?.id ?? '').slice(0, 8)}  ${meta.error ?? meta.message ?? ''}`);
  }
} else { console.error(`unknown command ${command}`); process.exit(1); }
