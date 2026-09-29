// Recent Workers Logs events of a Worker through `cf observability telemetry query` (cf has no live
// tail). Usage: logs.mjs [worker] [--since 60m] [--limit 20]. The Worker defaults to the first
// `name:` in this project's cloudflare.config.ts. Needs observability enabled on the Worker.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
// A migrated config switches on ctx.mode: its production Worker is the one under `default:`.
const config = readFileSync('cloudflare.config.ts', 'utf8');
const worker = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
  ?? /name:\s*"([^"]+)"/.exec(config.slice(Math.max(0, config.indexOf('default:'))))?.[1];
if (!worker) { console.error('logs: pass a Worker name'); process.exit(1); }

const match = /^(\d+)([mhd])$/.exec(option('since', '60m'));
if (!match) { console.error('logs: --since is a number and m, h or d'); process.exit(1); }
const to = Date.now();
const from = to - Number(match[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[match[2]];

const body = { queryId: 'cf-cli-test-logs', view: 'events', limit: Number(option('limit', '20')), timeframe: { from, to },
  parameters: { datasets: ['cloudflare-workers'], filters: [{ key: '$metadata.service', operation: 'eq', type: 'string', value: worker }] } };
const result = JSON.parse(execFileSync('./node_modules/.bin/cf', ['observability', 'telemetry', 'query', '--body', JSON.stringify(body)], { encoding: 'utf8' }));
const events = result.events?.events ?? result.result?.events?.events ?? [];
console.log(`${worker}: ${events.length} events in the last ${option('since', '60m')}`);
for (const event of events) {
  const meta = event.$metadata ?? {};
  console.log(`${new Date(event.timestamp).toISOString()}  ${(meta.level ?? '').padEnd(5)}  ${meta.trigger ?? ''}  ${meta.error ?? meta.message ?? ''}`);
}
