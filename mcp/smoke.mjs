// Smoke test for server.mjs over stdio, the way an MCP client talks to it: initialize, list tools,
// then read-only calls against the account (needs a cf login or CLOUDFLARE_API_TOKEN).
// Usage: node smoke.mjs [d1-database-name]   Prints PASS/FAIL per check; exits 1 on any FAIL.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// The listed-tools mode: one MCP tool per operation of the dev subset.
const server = spawn(process.execPath, [new URL('./server.mjs', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, CF_MCP_MODE: 'tools' } });
const pending = new Map();
createInterface({ input: server.stdout }).on('line', line => { const m = JSON.parse(line); pending.get(m.id)?.(m); pending.delete(m.id); });
let next = 1;
const rpc = (method, params) => new Promise(resolve => { const id = next++; pending.set(id, resolve); server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const tool = async (name, args = {}) => { const { result } = await rpc('tools/call', { name, arguments: args }); return { error: result.isError, text: result.content[0].text }; };

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!ok) failed++; };

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
check('initialize', init.result?.serverInfo?.name === 'cloudflare-forge-dev');
server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

const { result: { tools } } = await rpc('tools/list');
check('tools/list', tools.length > 100, `${tools.length} tools, ${Math.round(JSON.stringify(tools).length / 1024)} KB`);
const body = tools.find(t => t.name === 'd1-query-database')?.inputSchema.properties.body;
check('typed input schemas', body?.oneOf?.some(s => s.required?.includes('sql')), 'd1 query body: { sql, params } or { batch }');

const dbs = await tool('d1-list-databases', { per_page: 100 });
check('d1-list-databases', !dbs.error && JSON.parse(dbs.text.split('\n')[0]).length > 0, dbs.error ? dbs.text.slice(0, 120) : '');
const name = process.argv[2];
if (name && !dbs.error) {
  const db = JSON.parse(dbs.text.split('\n')[0]).find(d => d.name === name);
  const query = await tool('d1-query-database', { database_id: db?.uuid, body: { sql: 'SELECT 1 AS one' } });
  check('d1-query-database (typed body)', !query.error && query.text.includes('"one":1'), query.text.slice(0, 120));
}
const workers = await tool('worker-script-list-workers');
check('worker-script-list-workers', !workers.error, workers.text.slice(0, 80));
const kv = await tool('workers-kv-namespace-list-namespaces', { per_page: 5 });
check('paging is reported', !kv.error && /page 1 of \d+/.test(kv.text), kv.text.split('\n').at(-1));

const bad = await tool('d1-get-database', { database_id: '00000000-0000-0000-0000-000000000000' });
check('bad id -> isError with the API message', bad.error && bad.text.length > 0, bad.text.slice(0, 120));
const missing = await tool('d1-get-database', {});
check('missing argument -> isError', missing.error && /missing database_id/.test(missing.text));
const unknown = await rpc('tools/call', { name: 'nope', arguments: {} });
check('unknown tool -> isError', unknown.result?.isError === true);

server.stdin.end();
console.log(failed ? `${failed} check(s) FAILED` : 'All checks passed.');
process.exit(failed ? 1 : 0);
