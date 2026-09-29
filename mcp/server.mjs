// A small MCP server (stdio, JSON-RPC 2.0, no dependencies) serving the tools in tools.json, which
// generate.mjs makes from Cloudflare's Forge OpenAPI spec. Each call is one Cloudflare API request.
// Credentials: CLOUDFLARE_API_TOKEN, else the login `cf auth login` stored (it lasts 1 hour).
// The account: CLOUDFLARE_ACCOUNT_ID, else the first account the token can see.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { createIndex, loadCatalog } from './search.mjs';

// Two modes. search (default): three tools, search -> schema -> call, over every visible operation of
// the whole API (catalog.json), the way cf is designed to be used. tools: the curated dev subset
// (tools.json) listed as one MCP tool per operation. CF_MCP_MODE=tools picks the second.
const mode = process.env.CF_MCP_MODE ?? 'search';
const { tools } = JSON.parse(readFileSync(new URL(mode === 'search' ? './catalog.json' : './tools.json', import.meta.url), 'utf8'));
const byName = new Map(tools.map(tool => [tool.name, tool]));
const search = mode === 'search' ? createIndex(tools) : null;
const searchTools = [
  { name: 'search', description: 'Find Cloudflare API operations for a task. Describe the action and resource (e.g. "list d1 databases"). Returns the best matches: name, method, path, summary.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', default: 5 } }, required: ['query'] }, annotations: { readOnlyHint: true } },
  { name: 'schema', description: 'The typed input schema of one operation found with search, to build its arguments.', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }, annotations: { readOnlyHint: true } },
  { name: 'call', description: 'Call one operation by name with arguments matching its schema. The account ID is filled in. Check destructive operations (see their description) before calling.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, arguments: { type: 'object' } }, required: ['name'] } },
];
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const API = 'https://api.cloudflare.com/client/v4';

function token() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const files = [
    join(homedir(), 'Library/Preferences/cloudflare/config/default.json'), // macOS
    join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'cloudflare/config/default.json'),
  ];
  const file = files.find(existsSync);
  if (!file) throw new Error('No credentials: set CLOUDFLARE_API_TOKEN or run `cf auth login`.');
  const { oauth_token, expiration_time } = JSON.parse(readFileSync(file, 'utf8'));
  if (expiration_time && Date.parse(expiration_time) < Date.now()) throw new Error('The cf login has expired: run `cf auth login` again (mise run login).');
  return oauth_token;
}

let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
async function account(auth) {
  if (accountId) return accountId;
  const json = await (await fetch(`${API}/accounts?per_page=5`, { headers: auth })).json();
  accountId = json.result?.[0]?.id;
  if (!accountId) throw new Error(`Could not find an account: ${JSON.stringify(json.errors)}`);
  return accountId;
}

async function call(tool, args) {
  const auth = { Authorization: `Bearer ${token()}` };
  const { method, path, contentType } = tool._http;
  const used = new Set(['body']);
  let url = path.replace(/\{([^}]+)\}/g, (_, name) => {
    used.add(name);
    if (name === 'account_id') return '\0account';
    if (args[name] === undefined) throw new Error(`missing ${name}`);
    return encodeURIComponent(args[name]);
  });
  url = url.replace('\0account', await account(auth));
  const query = new URLSearchParams(Object.entries(args).filter(([k, v]) => !used.has(k) && v !== undefined).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]));
  const init = { method, headers: { ...auth } };
  if (args.body !== undefined) {
    init.headers['Content-Type'] = contentType ?? 'application/json';
    init.body = typeof args.body === 'string' && contentType !== 'application/json' ? args.body : JSON.stringify(args.body);
  }
  const response = await fetch(`${API}${url}${query.size ? `?${query}` : ''}`, init);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  // Cloudflare lists page quietly: say so when there is more.
  const info = body?.result_info;
  const more = info && info.total_pages > (info.page ?? 1) ? `\n(page ${info.page} of ${info.total_pages}: pass page/per_page for more)` : '';
  const result = body && typeof body === 'object' && 'result' in body && body.success ? body.result : body;
  return { isError: !response.ok || body?.success === false, content: [{ type: 'text', text: JSON.stringify(result) + more }] };
}

const send = message => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
const listed = mode === 'search' ? searchTools : tools.map(({ _http, ...tool }) => tool);

for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  let request;
  try { request = JSON.parse(line); } catch { send({ id: null, error: { code: -32700, message: 'parse error' } }); continue; }
  const { id, method, params } = request;
  if (id === undefined) continue; // notifications (initialized, cancelled) need no answer
  try {
    if (method === 'initialize') {
      send({ id, result: { protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'cloudflare-forge-dev', version: '0.1.0' } } });
    } else if (method === 'tools/list') {
      send({ id, result: { tools: listed } });
    } else if (method === 'tools/call') {
      const args = params?.arguments ?? {};
      if (mode === 'search' && params?.name === 'search') {
        send({ id, result: text(search(args.query ?? '', args.limit ?? 5)) });
      } else if (mode === 'search' && params?.name === 'schema') {
        const tool = byName.get(args.name);
        if (!tool) throw new Error(`unknown operation ${args.name}: use search`);
        send({ id, result: text({ name: tool.name, description: tool.description, method: tool._http.method, path: tool._http.path, inputSchema: tool.inputSchema }) });
      } else {
        const name = mode === 'search' ? (params?.name === 'call' ? args.name : undefined) : params?.name;
        const tool = byName.get(name);
        if (!tool) throw new Error(mode === 'search' ? `unknown operation ${name}: use search, then call with its name` : `unknown tool ${name}`);
        send({ id, result: await call(tool, mode === 'search' ? (args.arguments ?? {}) : args) });
      }
    } else if (method === 'ping') {
      send({ id, result: {} });
    } else {
      send({ id, error: { code: -32601, message: `method not found: ${method}` } });
    }
  } catch (error) {
    if (method === 'tools/call') send({ id, result: { isError: true, content: [{ type: 'text', text: error.message }] } });
    else send({ id, error: { code: -32603, message: error.message } });
  }
}
