// Soak test for the API's real-time paths across a redeploy (issue #3, .plans/sse.md). Clients watch
// for notes while one is created every INTERVAL; halfway through, the Worker is redeployed (which
// restarts the NotesHub Durable Object). Per client it reports notes missed, duplicates, and how
// its stream ended. Usage: node sse-soak.mjs <origin> [--no-deploy] [--seconds 100] [--deploy-at 25]
//   (uses `ws` from sdk/node_modules, the TypeScript SDK in sdk/out/api/typescript-dist and the CLI
//   in sdk/out/api/cli; the redeploy runs `PROJECT=api mise run deploy`)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createInterface } from "node:readline";
import { CftestApiClient } from "../sdk/out/api/typescript-dist/esm/index.mjs";
const WebSocket = createRequire(new URL("../sdk/package.json", import.meta.url))("ws");

const args = process.argv.slice(2);
const origin = args[0];
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : Number(args[i + 1]); };
const total = opt("seconds", 100) * 1000, deployAt = opt("deploy-at", 25) * 1000, interval = 2000;
const deploy = !args.includes("--no-deploy");
const watchSeconds = Math.min(300, Math.ceil(total / 1000) + 30);
const t0 = Date.now();
const t = () => ((Date.now() - t0) / 1000).toFixed(1);
const tag = `soak ${t0}`;

// Each client: notes received (id -> times seen, when) and what happened to its connection.
const clients = {};
function client(name) {
  const c = clients[name] = { seen: new Map(), events: [], lastNoteAt: null };
  c.note = note => { if (!note?.body?.startsWith(tag)) return; c.seen.set(note.id, (c.seen.get(note.id) ?? 0) + 1); c.lastNoteAt = t(); };
  c.event = what => { c.events.push(`${t()}s ${what}`); };
  return c;
}

// SSE parser for raw clients: yields { id, event, data } blocks.
async function* sse(res) {
  const decoder = new TextDecoder(); let buf = "";
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    const blocks = buf.split("\n\n"); buf = blocks.pop();
    for (const block of blocks) {
      const field = f => new RegExp(`^${f}: ?(.*)$`, "m").exec(block)?.[1];
      yield { id: field("id"), event: field("event"), data: field("data") };
    }
  }
}
const watchUrl = `${origin}/api/notes/watch?seconds=${watchSeconds}`;

// 1. Raw SSE, one connection, no reconnect: shows what a single stream does across the redeploy.
async function rawOnce() {
  const c = client("raw SSE (no reconnect)");
  try {
    const res = await fetch(watchUrl, { headers: { accept: "text/event-stream" } });
    c.event(`open ${res.status}`);
    for await (const e of sse(res)) {
      if (e.event === "message" && e.data) c.note(JSON.parse(e.data));
      else if (e.event) c.event(`event: ${e.event}${e.data ? ` ${e.data}` : ""}`);
    }
    c.event("stream ended");
  } catch (error) { c.event(`error: ${error.message}`); }
}

// 2. Raw SSE that reconnects with Last-Event-ID, like a browser's EventSource.
async function rawResume(until) {
  const c = client("raw SSE (reconnect + Last-Event-ID)");
  let lastId;
  while (Date.now() < until) {
    try {
      const res = await fetch(watchUrl, { headers: { accept: "text/event-stream", ...(lastId ? { "last-event-id": lastId } : {}) } });
      c.event(`open ${res.status}${lastId ? ` (last-event-id ${lastId})` : ""}`);
      for await (const e of sse(res)) {
        if (e.id) lastId = e.id;
        if (e.event === "message" && e.data) c.note(JSON.parse(e.data));
        else if (e.event) c.event(`event: ${e.event}${e.data ? ` ${e.data}` : ""}`);
      }
      c.event("stream ended");
    } catch (error) { c.event(`error: ${error.message}`); }
    await new Promise(r => setTimeout(r, 1000));
  }
}

// 3. The generated TypeScript SDK's notes.watch().
async function sdkWatch() {
  const c = client("TypeScript SDK notes.watch()");
  try {
    const stream = await new CftestApiClient({ baseUrl: origin }).notes.watch({ seconds: watchSeconds });
    c.event("open");
    for await (const note of stream) c.note(note);
    c.event("stream ended");
  } catch (error) { c.event(`error: ${error.message}`); }
}

// 4. The generated CLI's `notes watch`. With --format json/jsonl it prints nothing until the stream
// ends (Fern CLI generator 0.44.0 buffers streams unless the format is raw/http), so it runs with
// --format raw and the SSE `data:` lines are parsed here.
function cliWatch() {
  const c = client("CLI notes watch --format raw");
  const bin = new URL("../sdk/out/api/cli/target/release/cftest-api", import.meta.url).pathname;
  const proc = spawn(bin, ["--base-url", origin, "notes", "watch", "--seconds", String(watchSeconds), "--format", "raw"], { stdio: ["ignore", "pipe", "pipe"] });
  c.event("started");
  createInterface({ input: proc.stdout }).on("line", line => {
    if (line.startsWith("data:")) c.note(JSON.parse(line.slice(5)));
    else if (line.startsWith("event:") && !line.includes("message")) c.event(line);
  });
  createInterface({ input: proc.stderr }).on("line", line => c.event(`stderr: ${line.slice(0, 160)}`));
  return new Promise(resolve => proc.on("exit", code => { c.event(`exited ${code}`); resolve(); }));
}

// 5. Raw WebSocket on /api/notes/live, no reconnect.
function rawWs() {
  const c = client("raw WebSocket (no reconnect)");
  const ws = new WebSocket(`${origin.replace(/^http/, "ws")}/api/notes/live`);
  ws.on("open", () => c.event("open"));
  ws.on("message", data => c.note(JSON.parse(String(data))));
  ws.on("error", error => c.event(`error: ${error.message}`));
  const closed = new Promise(resolve => ws.on("close", (code, reason) => { c.event(`closed ${code} ${reason}`); resolve(); }));
  return { close: () => ws.close(), closed };
}

// 6. The TypeScript SDK's liveNotes.connect(), with its default reconnect behaviour.
async function sdkWs() {
  const c = client("TypeScript SDK liveNotes.connect()");
  const socket = await new CftestApiClient({ baseUrl: origin.replace(/^http/, "ws") }).liveNotes.connect();
  socket.on("open", () => c.event("open"));
  socket.on("message", note => c.note(note));
  socket.on("error", error => c.event(`error: ${error?.message ?? error}`));
  socket.on("close", event => c.event(`closed ${event?.code ?? ""}`));
  return socket;
}

// Redeploy (a new Worker version restarts every Durable Object), recording the version ids.
function redeploy() {
  return new Promise(resolve => {
    console.log(`${t()}s redeploying...`);
    const proc = spawn("mise", ["run", "deploy", "--message", `sse soak ${t0}`], { env: { ...process.env, PROJECT: "api" }, cwd: new URL("..", import.meta.url).pathname });
    let out = ""; proc.stdout.on("data", d => out += d); proc.stderr.on("data", d => out += d);
    proc.on("exit", code => {
      const version = /Current Version ID: (\S+)/.exec(out)?.[1];
      console.log(`${t()}s redeploy exited ${code}${version ? `, version ${version}` : ""}`);
      resolve();
    });
  });
}

// Run: start every client, let them attach, then create notes until the end.
const until = t0 + total + 5000;
const running = [rawOnce(), rawResume(until), sdkWatch(), cliWatch()];
const ws = rawWs();
const sdkSocket = await sdkWs();
await new Promise(r => setTimeout(r, 3000));

const created = [];
let deploying;
console.log(`${t()}s creating a note every ${interval / 1000}s for ${total / 1000}s${deploy ? `, redeploy at ${deployAt / 1000}s` : ""}`);
for (let n = 0; Date.now() - t0 < total; n++) {
  if (deploy && !deploying && Date.now() - t0 >= deployAt) deploying = redeploy();
  try {
    const res = await fetch(`${origin}/api/notes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: `${tag} #${n}` }) });
    if (res.ok) created.push({ id: (await res.json()).id, at: t() });
    else console.log(`${t()}s create failed: ${res.status}`);
  } catch (error) { console.log(`${t()}s create error: ${error.message}`); }
  await new Promise(r => setTimeout(r, interval));
}
await deploying;
await new Promise(r => setTimeout(r, 5000)); // let the last notes arrive
ws.close(); sdkSocket.close();
await Promise.race([Promise.allSettled([...running, ws.closed]), new Promise(r => setTimeout(r, 5000))]);

// Report.
console.log(`\n${created.length} notes created (ids ${created[0]?.id}..${created.at(-1)?.id})\n`);
let failed = 0;
for (const [name, c] of Object.entries(clients)) {
  const missing = created.filter(n => !c.seen.has(n.id));
  const dupes = [...c.seen].filter(([, n]) => n > 1).length;
  const ok = missing.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${c.seen.size}/${created.length}, missing ${missing.length}${missing.length ? ` (first missed note created at ${missing[0].at}s)` : ""}, duplicates ${dupes}, last note at ${c.lastNoteAt ?? "-"}s`);
  for (const e of c.events) console.log(`        ${e}`);
}
process.exit(failed ? 1 : 0);
