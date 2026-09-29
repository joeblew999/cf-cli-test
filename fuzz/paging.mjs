// Pagination: default vs --per-page 100 item counts for account-level GET list commands (read-only).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
// The project whose cf is fuzzed: PROJECT (a directory beside fuzz/, default app). Output goes to out/.
const hello = join(here, "..", process.env.PROJECT || "app");
const out = join(here, "out");
mkdirSync(out, { recursive: true });
const CF = join(hello, "node_modules/.bin/cf");
const meta = JSON.parse(readFileSync(join(hello, "node_modules/cf/dist/_meta/commands.json"))).commands;
const want = /^(workers|d1|kv|r2|queues|pages|zones|hyperdrive|vectorize|workflows|ai-gateway|ai-search|secrets-store|tunnels|zero-trust tunnels|email-routing|dns|accounts|iam|containers|pipelines|images|stream|durable-objects|browser|logpush|observability)\b/;
const cmds = meta.filter((c) => c.httpMethod === "GET" && c.name === "list" && !c.arguments.some((a) => a.required)
  && c.options.some((o) => o.name === "per-page") && c.apiPath?.startsWith("/accounts/") && want.test(c.fullPath.join(" ")));
const count = (s) => { try { const j = JSON.parse(s); if (Array.isArray(j)) return j.length;
  const arr = Object.values(j).find(Array.isArray); return arr ? arr.length : "obj"; } catch { return "nonjson"; } };
const rows = [];
for (const c of cmds.slice(0, 40)) {
  const r = (extra) => { const x = spawnSync(CF, [...c.fullPath, ...extra], { cwd: hello, encoding: "utf8", timeout: 30000 });
    return { code: x.status, n: count(x.stdout), err: (x.stderr || "").trim().split("\n").filter((l) => /Error|\[\d+\]/.test(l)).slice(0, 2).join(" ").slice(0, 120) }; };
  const a = r([]), b = r(["--per-page", "100"]);
  rows.push({ cmd: c.command, def: a.n, defCode: a.code, p100: b.n, p100Code: b.code, err: b.err || a.err });
  console.error(c.command, a.n, b.n);
}
writeFileSync(join(out, "paging.json"), JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`| ${r.cmd} | ${r.def} (exit ${r.defCode}) | ${r.p100} (exit ${r.p100Code}) | ${typeof r.def === "number" && typeof r.p100 === "number" && r.p100 > r.def ? "TRUNCATED" : r.def !== r.p100 ? "DIFFERS" : ""} | ${r.err} |`);
