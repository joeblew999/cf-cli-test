# Project shape and bindings breadth

cf 1.0.0-beta.5, node 26.10, `@cloudflare/vite-plugin` beta, vite 8.3.1, TypeScript 7. 2026-09-29.
Reference implementation: `fuzz-shape/` (`web/` = main Worker, `svc/` = second Worker, `vapp/` = `cf init .` autoconfig test).
Only what was run and seen. Deployed live: https://cftest-shape-web.gedw99.workers.dev and https://cftest-shape-svc.gedw99.workers.dev

## `cf init` options
- `cf init --help`: one subcommand only, `cf init workers [directory]`. **No templates, no framework picker, no flags besides `--install`/`--package-manager`.** An empty dir gets a hello-world Worker; a non-empty dir gets autoconfig.
- `cf init .` in a fresh `create-vite` vanilla-ts app:
  - **Before `npm install`: fails** with `Unable to detect the version of the vite package` (and warns "no lock file ... might be a workspace"). `--package-manager npm` is ignored for existing projects (it says so).
  - After `npm install`: it works. It writes `cloudflare.config.ts` (name from the dir, `compatibilityDate`, `observability.enabled`, `assets.notFoundHandling: "single-page-application"`, **no entrypoint → assets-only**), a `vite.config.ts` with `plugins: [cloudflare()]`, adds `@cloudflare/vite-plugin@beta` + `cf` to devDependencies and a `"deploy": "cf deploy"` script, and appends Wrangler-era entries (`.wrangler`, `.dev.vars*`, `.env*`) to `.gitignore`.
  - It **leaves `"dev": "vite"` and `"build": "tsc && vite build"`** (does not switch them to `cf dev`/`cf build`, unlike `cf init workers`).

## Per feature (all verified locally with `cf dev`, then deployed and curled)

| Feature | Verdict | Local (`cf dev`) | Deployed |
|---|---|---|---|
| Static assets, SPA fallback | works | `/` and `/some/spa/route` → index.html | same, 200 |
| API route (`runWorkerFirst: ["/api/*"]`) | works | `/api/hello` → Worker; unknown `/api/nope` → Worker 404 | same |
| Durable Object (sqlite, `exports.durableObject`) | works | 1→2 | 1→2; deploy printed "Durable Object exports reconciliation: Created: Counter" — no migrations block needed |
| KV (no id) | works | 1 | 1; auto-created `cftest-shape-web-kv` |
| D1 (no id) + migrations | **partial** | table missing until applied by hand (see bug 1) | auto-created `cftest-shape-web-db`; `cf d1 migrations apply <uuid>` applied 0001; then 1 |
| R2 (no name) | works | put/get | auto-created `cftest-shape-web-bucket` |
| Queue producer + consumer | works | send → consumer wrote KV within ~3 s | auto-created `cftest-shape-q`; consumer ran within 15 s |
| Cron | works (slow first fire) | `POST /cdn-cgi/local/explorer/api/local/scheduled?worker=cftest-shape-web` body `{"cron":"*/5 * * * *"}` → `{"outcome":"ok"}`, handler ran | deploy printed `schedule: */5 * * * *`, `/api/cron/last` stayed `none` at the 13:35 and 13:40 ticks (deployed 13:31), then fired at 13:45:51 (`{"cron":"*/5 * * * *"}`). So a new cron can take ~15 min to start. Logs showed 0 events (observability not enabled). |
| Workflow | works | `status: complete`, output `HELLO LOCAL` | `status: complete`, output `HELLO REMOTE` |
| Workers AI | works | needs `dev: { remote: true }` ("Establishing remote connection"), replied "Pong" | "pong" |
| Service binding (RPC) to 2nd Worker | **partial** | works only with **two `cf dev` processes** (dev registry); `auxiliaryWorkers` fails (bug 2) | works after deploying svc first |
| Typed env | works | `cf workers types` → `.cloudflare/types/index.d.ts`; `tsc --noEmit` clean incl. `env.SVC.greet()` typed from the imported svc config |
| vitest + `@cloudflare/vitest-pool-workers` | **partial** | ignores `cloudflare.config.ts`; bindings must be restated (bug 3) | — |

Resource provisioning: first `cf deploy` created KV, D1, R2 and the queue itself (names `<worker>-<binding>` lowercased; queue/workflow take the configured `name`) and said future deploys work without IDs. Deploy took ~19 s (svc ~13 s).

### Config snippet (web/cloudflare.config.ts, verified)
```ts
import { bindings, defineConfig, exports, triggers } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };
import { worker as svc } from "../svc/cloudflare.config.ts";

export default defineConfig({
  worker: {
    name: "cftest-shape-web",
    compatibilityDate: "2026-09-25",
    entrypoint,
    // recommended default: observability: { enabled: true },
    assets: { notFoundHandling: "single-page-application", runWorkerFirst: ["/api/*"] },
    exports: {
      Counter: exports.durableObject({ storage: "sqlite" }),
      MyFlow: exports.workflow({ name: "cftest-shape-flow" }),
    },
    triggers: [
      triggers.queue({ name: "cftest-shape-q", maxBatchSize: 1, maxBatchTimeout: 1 }),
      triggers.scheduled({ schedule: "*/5 * * * *" }),
    ],
    env: {
      APP_NAME: bindings.text("shape"),
      ASSETS: bindings.assets(),
      COUNTER: bindings.durableObject({ worker: "cftest-shape-web", exportName: "Counter" }),
      FLOW: bindings.workflow({ name: "cftest-shape-flow", worker: "cftest-shape-web", exportName: "MyFlow" }),
      Q: bindings.queue<{ msg: string; at: string }>({ name: "cftest-shape-q" }),
      SVC: bindings.worker({ worker: svc, exportName: "Greeter" }),
      AI: bindings.ai({ dev: { remote: true } }),
      KV: bindings.kv(),
      DB: bindings.d1(),
      BUCKET: bindings.r2(),
    },
  },
});
```
svc/cloudflare.config.ts exports the worker so others can import it for typed bindings:
```ts
export const worker = defineWorker({ name: "cftest-shape-svc", compatibilityDate: "2026-09-25", entrypoint });
export default defineConfig({ worker });
```
In code, DOs are reached with `ctx.exports.Counter.getByName("global")` (no binding needed); env comes from `import { env } from "cloudflare:workers"`.

## Bugs / gaps (with repro)
1. **No local D1 migrations.** `defineConfig` has no `migrations_dir`/migrations field for D1 (`D1BindingOptions` = `id`, `name`, `dev` only). `cf d1 migrations apply DB --local` → "Expected a D1 database ID ... binding names are not accepted"; the local id `DB-cftest-shape-web` (from the explorer) is also rejected. `cf dev` does not apply `migrations/` either (first `/api/d1` → `no such table: notes`). Workaround that worked: `POST /cdn-cgi/local/explorer/api/d1/database/DB-cftest-shape-web/raw` with `{"sql": "<file contents>"}`. Remote: `cf d1 migrations apply <uuid>` works (default dir `./migrations`, Wrangler-compatible table), but you must look up the UUID from the deploy output.
2. **`auxiliaryWorkers` can't take a cf config.** `cloudflare({ auxiliaryWorkers: [{ config: svc }] })` with `svc` imported from `../svc/cloudflare.config.ts` → vite: `failed to load config ... Only URLs with a scheme in: file, data, and node are supported ... Received protocol 'cloudflare:'` (vite's config loader follows the `with { type: "cf-worker" }` import into the Worker source). Without it: `Worker "cftest-shape-svc" not found. Make sure it is running locally.` Working answer: run `cf dev` in both dirs (different ports); the dev registry connects them.
3. **vitest pool doesn't understand `cloudflare.config.ts`.** `@cloudflare/vitest-pool-workers` 0.22.0 (latest; no beta tag) accepts only `wrangler.configPath`. Pointing it at `./cloudflare.config.ts` fails silently: `env.KV` undefined, and `SELF.fetch` → "requires poolOptions.workers.main". Also its bundled workerd supports compat dates only up to **2026-08-22**, so the scaffold's `2026-09-25` fails to start ("This Worker requires compatibility date 2026-09-25, but the newest ... is 2026-08-22"). Working setup: `main: "./src/index.ts"` + hand-written `miniflare` bindings + compat date 2026-08-22 → 3/3 tests pass (SELF.fetch, DO via `ctx.exports`, KV). It pulls in wrangler 4.124 and a separate miniflare.
4. **`cf init .` needs deps installed first** and leaves `dev`/`build` scripts on plain vite (see above).
5. `bindings.kv<"a"|"b">()` types keys strictly — any other key needs a cast. Nice for safety, surprising as a default.
6. `cf dev --port` still can't be forwarded; the port goes in `vite.config.ts` (`server: { port: Number(process.env.PORT) || 5173 }`).
8. A new remote cron first fired ~15 min after deploy (missed 2 ticks). Don't read an early `none` as broken. Add `observability: { enabled: true }` (what `cf init .` writes) to the default so this can be debugged.
7. One `cloudflare.config.ts` = one Worker (`CloudflareConfig` has `worker?` singular + `containers`). No multi-worker config; `cf deploy` deploys only the current dir's Worker, so deploy order matters (svc before web).

## RECOMMENDED DEFAULT PROJECT
Single Worker by default (SPA + `/api/*` in one Worker covers assets, API, DO, queue, cron, workflow, AI, D1, KV, R2 — all verified in one Worker). Add a second Worker only for a real separate deployable; then use one directory per Worker.

```
my-app/
├─ cloudflare.config.ts      # one Worker; bindings with no IDs (cf deploy provisions)
├─ vite.config.ts            # cloudflare() plugin + server.port from PORT
├─ vitest.config.ts          # pool-workers; bindings restated (bug 3)
├─ package.json
├─ tsconfig.json             # include src, test, cloudflare.config.ts, .cloudflare/types
├─ public/                   # SPA static assets (index.html)
├─ src/
│  ├─ index.ts               # default { fetch, scheduled, queue } + exported DO/Workflow classes
│  ├─ api.ts                 # /api/* router
│  ├─ counter.ts             # DurableObject (sqlite)
│  └─ flow.ts                # WorkflowEntrypoint
├─ migrations/0001_init.sql  # D1; `cf d1 migrations create <msg>` numbers them
├─ test/api.test.ts
└─ .cloudflare/              # generated: types/ and output/ (gitignore)
```
Multi-worker (monorepo): sibling dirs `workers/web/`, `workers/svc/`, each with its own `cloudflare.config.ts`, `vite.config.ts`, `package.json`. svc does `export const worker = defineWorker(...)`; web imports it for a typed `bindings.worker({ worker: svc, exportName })`. Dev = `cf dev` in each (different ports); deploy svc first. (`fuzz-shape/web` + `fuzz-shape/svc` is this layout, verified. A root npm-workspaces package.json was not tested.)

cloudflare.config.ts: the snippet above (drop what you don't use; keep `runWorkerFirst: ["/api/*"]` + SPA fallback).

vite.config.ts:
```ts
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
export default defineConfig({
  server: { port: Number(process.env.PORT) || 5173, strictPort: true },
  plugins: [cloudflare()],
});
```
package.json scripts:
```json
"dev": "cf dev",
"build": "cf build",
"deploy": "cf deploy",
"typecheck": "cf workers types && tsc",
"test": "vitest run",
"db:new": "cf d1 migrations create",
"db:apply": "cf d1 migrations apply"   // needs the D1 UUID arg; no --local path (bug 1)
```
devDependencies: `cf`, `@cloudflare/vite-plugin@beta`, `vite@^8`, `typescript@^7`, plus `vitest@^4.1` and `@cloudflare/vitest-pool-workers@^0.22` for tests.

vitest.config.ts (verified, 3/3 pass):
```ts
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [cloudflareTest({
    main: "./src/index.ts",
    miniflare: {
      compatibilityDate: "2026-08-22",
      bindings: { APP_NAME: "shape" },
      kvNamespaces: ["KV"], d1Databases: ["DB"], r2Buckets: ["BUCKET"],
      durableObjects: { COUNTER: { className: "Counter", useSQLite: true } },
    },
  })],
});
```

Remote resources created (all in .cf-manifest.json): workers cftest-shape-web, cftest-shape-svc; queue cftest-shape-q; workflow cftest-shape-flow; kv cftest-shape-web-kv; d1 cftest-shape-web-db; r2 cftest-shape-web-bucket.
