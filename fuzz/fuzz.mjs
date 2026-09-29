// Fuzz read-only (GET) list/get commands of cf. Usage: node fuzz.mjs [N] [seed]
// Only commands with httpMethod GET and category read are ever run.
import { spawn, spawnSync } from "node:child_process";
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
// cf tools: every command as an MCP-style tool definition (~4 MB).
const tools = JSON.parse(spawnSync(CF, ["tools"], { cwd: hello, encoding: "utf8", maxBuffer: 64 << 20 }).stdout).tools;
const N = Number(process.argv[2] || 60);
let seed = Number(process.argv[3] || 42);
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

// tool-name round trip: can an agent map a tool name back to a command?
const byTool = {};
for (const c of meta) (byTool[c.command.replace(/[\s-]+/g, "_")] ??= []).push(c.command);
const collisions = Object.entries(byTool).filter(([, v]) => v.length > 1);
const unmapped = tools.filter((t) => !byTool[t.name]).length;

const pool = meta.filter((c) => c.httpMethod === "GET" && /(^|\s)(list|get)(\s|$|-)|list|get/.test(c.name));
const sample = [];
const p = [...pool];
while (sample.length < Math.min(N, p.length)) sample.push(p.splice(Math.floor(rnd() * p.length), 1)[0]);

function run(args, timeoutMs = 30000, env = {}) {
  return new Promise((res) => {
    const t0 = Date.now();
    const ch = spawn(CF, args, { cwd: hello, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "", hung = false;
    ch.stdout.on("data", (d) => (out += d));
    ch.stderr.on("data", (d) => (err += d));
    const to = setTimeout(() => { hung = true; ch.kill("SIGKILL"); }, timeoutMs);
    ch.on("close", (code) => { clearTimeout(to); res({ code, out, err, ms: Date.now() - t0, hung }); });
  });
}
const isJSON = (s) => { if (!s.trim()) return "empty"; try { JSON.parse(s); return "json"; } catch { return "text"; } };
const stack = (s) => /\n\s+at .+[:(].*\d+:\d+\)?/.test(s) || /TypeError|ReferenceError|RangeError|Cannot read prop/.test(s);
const looksErr = (s) => /error|invalid|required|not found|unauthori|forbidden|missing|failed/i.test(s);

const cases = [];
for (const c of sample) {
  const path = c.fullPath;
  const req = c.arguments.filter((a) => a.required);
  cases.push({ cmd: c.command, variant: "noargs", args: [...path] });
  cases.push({ cmd: c.command, variant: "bogus", args: [...path, ...req.map(() => "bogus-000"), "--bogus-flag", "x"] });
  cases.push({ cmd: c.command, variant: "badpage", args: [...path, ...req.map(() => "00000000000000000000000000000000"), "--page", "-1", "--per-page", "abc"] });
}

const results = [];
let i = 0;
async function worker() {
  while (i < cases.length) {
    const k = cases[i++];
    const r = await run(k.args);
    const row = {
      ...k, code: r.code, ms: r.ms, hung: r.hung,
      stdout: isJSON(r.out), stdoutBytes: r.out.length,
      stack: stack(r.err) || stack(r.out),
      exit0OnError: r.code === 0 && (looksErr(r.err) || /"success":\s*false/.test(r.out) || (!r.out.trim())),
      errHead: r.err.trim().split("\n").slice(0, 3).join(" | ").slice(0, 300),
      outHead: r.out.trim().slice(0, 200),
    };
    results.push(row);
    process.stderr.write(`${results.length}/${cases.length} ${row.code} ${row.ms}ms ${k.args.join(" ")}\n`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
writeFileSync(join(out, "results.json"), JSON.stringify({ poolSize: pool.length, collisions, unmapped, results }, null, 1));
const s = (f) => results.filter(f).length;
console.log(JSON.stringify({
  pool: pool.length, sampled: sample.length, cases: results.length,
  toolNameCollisions: collisions.length, unmappedTools: unmapped,
  exit0: s((r) => r.code === 0), exitNon0: s((r) => r.code !== 0),
  crashes: s((r) => r.stack), hangs: s((r) => r.hung), exit0OnError: s((r) => r.exit0OnError),
  nonJSONstdoutWhenExit0: s((r) => r.code === 0 && r.stdout !== "json"),
  medianMs: results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length / 2)],
  maxMs: Math.max(...results.map((r) => r.ms)),
}, null, 1));
