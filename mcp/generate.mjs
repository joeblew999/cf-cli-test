// Generates mcp/tools.json: MCP tool definitions for the Cloudflare API operations a Workers developer
// needs, straight from Cloudflare's Forge OpenAPI spec (the spec cf itself is generated from).
// cf's own `cf tools` emits all 2,936 commands (~4 MB); this keeps a dev subset with typed inputs.
// Usage: node generate.mjs <openapi.forge.json>
import { readFileSync, writeFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));

// The subset: account-level Workers developer platform APIs.
const include = [
  /^\/accounts\/\{account_id\}\/workers\/(scripts|workers|subdomain|domains|observability\/telemetry)/,
  /^\/accounts\/\{account_id\}\/d1\//,
  /^\/accounts\/\{account_id\}\/storage\/kv\//,
  /^\/accounts\/\{account_id\}\/r2\/buckets/,
  /^\/accounts\/\{account_id\}\/queues/,
  /^\/accounts\/\{account_id\}\/workflows/,
];
// Uploading Worker code (scripts, versions, previews) is `cf deploy`'s job, not an agent tool's.
const exclude = [/multipart\/form-data/];
const excludeOps = /^(createWorkerVersion|patchLatestWorkerVersion|createWorker|editWorker|updateWorker|workers_previews_)/;

const MAX_DEPTH = 6;
const trim = text => (typeof text === 'string' ? text.split(/\n\n/)[0].slice(0, 240) : undefined);

// Inline $refs (bounded, cycle-safe) and keep only what describes the input.
function schemaOf(node, depth = 0, seen = new Set()) {
  if (!node || typeof node !== 'object') return node;
  if (node.$ref) {
    if (seen.has(node.$ref) || depth > MAX_DEPTH) return { type: 'object', description: trim(node.description) };
    const target = node.$ref.replace('#/', '').split('/').reduce((o, k) => o?.[k], spec);
    return schemaOf(target, depth + 1, new Set([...seen, node.$ref]));
  }
  const out = {};
  for (const key of ['type', 'enum', 'format', 'default', 'minimum', 'maximum', 'nullable']) if (node[key] !== undefined) out[key] = node[key];
  // Descriptions on the top levels only: deeper ones cost tokens and rarely decide a call.
  if (node.description && depth <= 2) out.description = trim(node.description);
  if (node.properties) out.properties = Object.fromEntries(Object.entries(node.properties).filter(([, v]) => !v?.readOnly).map(([k, v]) => [k, schemaOf(v, depth + 1, seen)]));
  if (node.required) out.required = node.required;
  if (node.items) out.items = schemaOf(node.items, depth + 1, seen);
  if (node.additionalProperties && typeof node.additionalProperties === 'object') out.additionalProperties = schemaOf(node.additionalProperties, depth + 1, seen);
  for (const key of ['allOf', 'anyOf', 'oneOf']) if (node[key]) out[key] = node[key].map(n => schemaOf(n, depth + 1, seen));
  return out;
}

// One MCP tool from one operation: typed inputs from the spec, the HTTP call kept aside in _http.
function toTool(path, method, item, op) {
  const content = op.requestBody?.content ?? {};
  const properties = {}, required = [];
  const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(p => (p.$ref ? p.$ref.replace('#/', '').split('/').reduce((o, k) => o?.[k], spec) : p));
  for (const p of params) {
    if (!p || p.name === 'account_id') continue; // filled in by the server
    properties[p.name] = { ...schemaOf(p.schema ?? {}), description: trim(p.description ?? p.schema?.description) };
    if (p.required) required.push(p.name);
  }
  const json = content['application/json']?.schema;
  if (json) {
    properties.body = { ...schemaOf(json), description: 'JSON request body' };
    if (op.requestBody.required) required.push('body');
  } else if (Object.keys(content).length) {
    properties.body = { type: 'string', description: `request body (${Object.keys(content)[0]})` };
    if (op.requestBody.required) required.push('body');
  }
  const confirm = op['x-forge-require-confirmation'];
  return {
    name: op.operationId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
    description: [op.summary, trim(op.description), confirm && `DESTRUCTIVE: ${trim(confirm)}`].filter(Boolean).join(' — '),
    inputSchema: { type: 'object', properties, required },
    annotations: { readOnlyHint: method === 'get', destructiveHint: method === 'delete' || Boolean(confirm) },
    // Not part of MCP: how the server calls the API, and what search matches on.
    _http: { method: method.toUpperCase(), path, contentType: Object.keys(content)[0], tags: op.tags ?? [] },
  };
}

// tools.json: the curated dev subset, listed directly. catalog.json: every visible operation of the
// whole API, for search mode (search -> schema -> call, the way cf itself is used).
const tools = [], catalog = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!/^(get|put|post|delete|patch)$/.test(method) || op['x-forge-hidden'] || !op.operationId) continue;
    const tool = toTool(path, method, item, op);
    catalog.push(tool);
    const content = op.requestBody?.content ?? {};
    if (include.some(re => re.test(path)) && !excludeOps.test(op.operationId) && !exclude.some(re => Object.keys(content).some(type => re.test(type)))) tools.push(tool);
  }
}

tools.sort((a, b) => a.name.localeCompare(b.name));
const text = JSON.stringify({ spec: spec.info?.version, tools }, null, 1);
writeFileSync(new URL('./tools.json', import.meta.url), text + '\n');
const listed = JSON.stringify(tools.map(({ _http, ...tool }) => tool));
catalog.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(new URL('./catalog.json', import.meta.url), JSON.stringify({ spec: spec.info?.version, tools: catalog }) + '\n');
console.log(`catalog: ${catalog.length} operations for search mode`);
console.log(`${tools.length} tools; tools/list is ${(listed.length / 1024).toFixed(0)} KB (~${Math.round(listed.length / 4 / 1000)}k tokens) vs cf tools ~4,140 KB`);
