// Search quality: task -> expected command (regex); record rank in cf cli search top-5.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
// The project whose cf is fuzzed: PROJECT (a directory beside fuzz/, default app). Output goes to out/.
const hello = join(here, "..", process.env.PROJECT || "app");
const out = join(here, "out");
mkdirSync(out, { recursive: true });
const CF = join(hello, "node_modules/.bin/cf");
const tasks = [
  ["deploy a worker", /^cf deploy$|workers (scripts )?(update|deploy)|versions (create|deploy)/],
  ["roll back a worker to a previous version", /deployments create|rollback/],
  ["tail live logs of a worker", /tail/],
  ["set a secret on a worker", /workers.*secrets (update|create|put)/],
  ["run d1 migrations", /d1 migrations apply/],
  ["purge cache for a zone", /cache purge/],
  ["add a dns record", /dns records create/],
  ["create a cloudflare tunnel", /tunnels (create|cloudflared create)|tunnels quick-start/],
  ["create a kv namespace", /kv namespaces create/],
  ["write a value to kv", /kv namespaces values update|kv .*(put|write|update)/],
  ["create an r2 bucket", /r2 buckets create/],
  ["upload a file to r2", /r2 objects (put|upload|create)/],
  ["run a sql query against d1", /d1 (query|execute)/],
  ["list workers", /^cf workers list$/],
  ["create a queue", /queues create/],
  ["send a message to a queue", /queues messages (push|send|create)/],
  ["add a custom domain to a worker", /workers domains (update|create|attach)|custom-domains/],
  ["create an api token", /tokens create/],
  ["list zones", /^cf zones list$/],
  ["query worker logs", /observability telemetry query/],
  ["create a hyperdrive config", /hyperdrive (configs )?create/],
  ["start local dev server", /^cf dev$/],
  ["create a d1 database", /^cf d1 create$/],
  ["delete a worker", /^cf workers delete$/],
  ["show worker versions", /versions list/],
];
const rows = [];
for (const [q, re] of tasks) {
  const t0 = Date.now();
  const r = spawnSync(CF, ["cli", "search", q], { cwd: hello, encoding: "utf8", timeout: 30000 });
  let hits = [];
  try { hits = JSON.parse(r.stdout).map((h) => h.command || h.name || JSON.stringify(h).slice(0, 60)); } catch { hits = ["nonjson: " + r.stdout.slice(0, 80)]; }
  const rank = hits.findIndex((h) => re.test(h)) + 1;
  rows.push({ q, rank, top: hits.slice(0, 5), ms: Date.now() - t0, code: r.status });
}
writeFileSync(join(out, "search.json"), JSON.stringify(rows, null, 1));
const top1 = rows.filter((r) => r.rank === 1).length, top5 = rows.filter((r) => r.rank > 0).length;
console.log(`top1 ${top1}/${rows.length}, top5 ${top5}/${rows.length}`);
for (const r of rows) console.log(`| ${r.q} | ${r.rank || "miss"} | ${r.top.slice(0, 3).join("; ")} |`);
