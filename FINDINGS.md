# cf CLI — findings

cf 1.0.0-beta.5, node 24, macOS arm64. Started 2026-09-29. Only what was run and seen.

## Install
- `npm i cf` works. npm warns about workerd's postinstall script not being allow-listed.
- Needs node >= 22.

## Discovery
- `cf --help` opens with an "AGENT COMMAND DISCOVERY" banner. It also prints that banner on every `--help`.
- `cf cli search "<task>"` returns 5 JSON matches.
  - "query workers observability logs" → `cf observability telemetry query`: good.
  - "stream live logs from a deployed worker" → Stream (video) live inputs: wrong product.
  - "tail real-time logs of a worker" → secrets and audit logs: no tail found.
- **An unknown command exits 0 and prints the root help**: `cf nosuchthing --help` exits 0. So the exit code can't show whether a command exists.
- `cf auth whoami` with no login returns JSON `{"authenticated": false}`. Its login is separate from Wrangler's.

## What it wants a repo to look like (`cf init workers hello`)
- `cloudflare.config.ts` replaces `wrangler.jsonc`: `defineConfig({ worker: { name, compatibilityDate, entrypoint, env } })`.
- Bindings are typed calls: `env: { WORLD: bindings.text("World") }`.
- The entry point is imported, not given as a path: `import * as entrypoint from "./src/index.ts" with { type: "cf-worker" }`.
- Code reads `env` from `import { env } from "cloudflare:workers"`, not from the `fetch(req, env)` argument.
- Vite is the default: `vite.config.ts` plus the `@cloudflare/vite-plugin` beta.
- Generated types go in `.cloudflare/types/index.d.ts`, build output in `.cloudflare/output/v0/workers/default/bundle/`.
- package.json scripts: `dev`/`build`/`deploy` → `cf …`; `typecheck` → `cf workers types && tsc`. It pulls in TypeScript 7.
- Scaffold plus install took about 16 s. Its node_modules has 54 packages; npm audit reports 5 moderate vulnerabilities.

## Local loop
- `cf build`: ok. It hands off to `vite build`; 2.4 s.
- `cf dev`: ok on :5173. Editing `cloudflare.config.ts` restarted the server and the new binding value was served.
- `cf dev --port 8799`: **fails**: "Arguments cannot currently be forwarded to the detected dev command `npx vite`".
- `cf dev` prints a local explorer API under `/cdn-cgi/local/explorer/api/…`. It covers KV, D1, R2, DOs, Workflows, scheduled triggers, and SQL over local traces and logs (`spans`, `logs` tables).

## Bindings, local (no IDs anywhere)
- Added `KV: bindings.kv()`, `DB: bindings.d1()`, `BUCKET: bindings.r2()` to the config, with no names or IDs.
- `cf dev`: /kv counted 1→2, /d1 inserted and counted 1→2, /r2 put then get worked. Nothing to create first.
- `bindings.*` offers: agentMemory, ai, aiSearch, analyticsEngineDataset, artifacts, assets, browser, d1, dispatchNamespace, durableObject, flagship, hyperdrive, images, json, kv, logfwdr, media, mtlsCertificate, pipeline, queue, r2, rateLimit, …

## Login
- `cf auth login` uses the OAuth device flow: a code plus 2 approval pages in the dashboard. It asked for 469 scopes.
- The token nominally lasts 1 hour, but cf refreshes it with the stored refresh token: `whoami` still showed tokenValid after the expiry time. It's stored in `~/Library/Preferences/cloudflare/config/default.json`.

## Remote deploy
- The first `cf deploy` **created KV "hello-kv", D1 "hello-db" and R2 "hello-bucket" itself**, then deployed. Total 11.5 s.
  - It said: "future deploys will continue to work even without IDs".
- The live https://hello.gedw99.workers.dev passed /, /kv, /d1 and /r2.
- Redeploy took 5.3 s. The bindings show as "(inherited)", with no duplicate resources.
- `cf d1 query <uuid> --sql "…"` returned JSON results plus meta (colo, timings). It needs the UUID, not the name.

## Gaps (confirmed)
- **No `tail`** (live logs). `cf workers` has no tail subcommand, and the repo's own `usecases/tail-live-worker.yaml` says `status: gap`.
- The repo's use-case catalogue (usecases/*.yaml) counts 96 direct, 153 partial and 58 gap. **It's stale**: it lists KV/D1/R2 provisioning and `r2 object get` as gaps, but both work.
- Search misses: "roll back a worker to a previous version" → nothing relevant. "get a value from a kv namespace" → only bulk get.
- **Cleanup order matters, and cf doesn't say so up front** (verified 2026-09-30, deleting 40 test resources):
  - A Worker that consumes a queue can't be deleted (`[10064] Cannot delete this Worker as it is a consumer for a Queue`), and the queue can't be deleted while the Worker binds it (`[11005]`). Remove the consumer first: `cf queues consumers delete <consumer-id> --queue-id <id>` (ids from `cf queues get`).
  - A non-empty R2 bucket can't be deleted (`[10008]`).
- **`cf r2 objects bulk-delete` can't empty a bucket or delete by prefix** (already reported: [cloudflare/cf#74](https://github.com/cloudflare/cf/issues/74)). Its help documents both modes as "no request body", yet cf refuses to run without `--body` ("--body is required for this command"). Deleting objects one by one with `cf r2 objects delete <key> --bucket-name <b>` works.
- **API errors go to stderr, but the error box starts with a blank line** (`\n┌ APIError\n│ [code] message`). A wrapper that prints the first line of stderr shows an empty error (`mise run cleanup` did until it was fixed).

## Migration: Wrangler → cf (files: findings/migrate-example/)
Source project: a classic `wrangler.jsonc` with vars (including JSON), KV, D1 (migrations_dir), R2, a SQLite Durable Object with Wrangler migrations, a cron, static assets (run_worker_first /api/*) and an `env.staging`. It was deployed first with Wrangler as `cftest-legacy`.
- `cf migrate` writes `cloudflare.config.ts` plus a small `wrangler.config.ts` (types and assets dir). **It needs local Wrangler 4.100 or newer**; on a bare config it fails.
- **Every resource ID was kept.** vars → `bindings.text`/`bindings.json`, cron → `triggers.scheduled`, assets → `bindings.assets()`.
- **Environments become `defineConfig((ctx) => switch (ctx.mode) …)`**, selected with `--mode staging`.
- **It's honest about gaps.** It flagged 6 [required] follow-ups: DO bindings to review, Wrangler DO migrations replaced by `exports: { Counter: exports.durableObject({ storage: "sqlite" }) }`, and D1 `migrations_dir`.
  - Each follow-up is written into the config as a TODO, with a deliberate error that blocks deploys until they're resolved.
- **Miss:** package.json scripts stayed as `wrangler dev` / `wrangler deploy`.
- The resolved config typechecks (tsc exit 0).
- `cf deploy` (it builds through Wrangler) took 9.4 s. It went to the **same Worker, used the same resources and created no duplicates**; the account still had 4 cftest-legacy resources.
- Live before → after, all 200:
  - Assets and vars were identical.
  - KV 2→3 and D1 3→4, so the data carried on.
  - **Durable Object state was kept** (2→3).
  - The cron schedule was redeployed.
- `cf deploy --mode staging` → cftest-legacy-staging with its own KV and vars: works.
- Verdict: **the migration works for real**, after about 5 minutes of manual follow-up that it points to exactly.

## Listing and paging
- **`cf workers list` silently returns the first 10 of 74 Workers.** Nothing says there are more; `--per-page 100` returns them all.
- **`cf queues list --per-page 100` returned nothing**, although without the flag the list showed a queue.
- `workers list` JSON has `id` and `name`. `workers delete` takes the ID, not the name.

## Node 26
- All local tasks pass on node 26: install, whoami, search, build, types, and dev (/, /kv, /d1, /r2).
- npm 11 warns that workerd's postinstall is not approved, but workerd runs anyway.

## Skills / MCP (checked)
- No agent skills are shipped anywhere: not in the npm package, README, source or launch post. The only "skills" commands belong to an unrelated threat-intel API.
- `cf tools` (hidden) outputs 2,936 MCP-style tool definitions, 4.1 MB, roughly a million tokens. There's no MCP server mode, and `cf mcp` is the MCP Portals product API.

## Agent angle
- `cf` detects the agent calling it from env vars (CLAUDECODE, CURSOR_AGENT, OPENCODE, QWEN_CODE_*, PI_*).
- There's a hidden `cf tools` command that outputs MCP-style tool definitions for every command.
- The launch post promises JSON pretty-printed for humans and condensed for agents, over 3,000 operations (vs ~280 in Wrangler), and 18 months of Wrangler maintenance after the beta.
- The post doesn't mention skills; being checked in findings/agents.md.

## Deeper runs (fuzzing, 5 agents, all verified)
- [findings/robustness.md](findings/robustness.md): 180 read-only runs with no crashes or hangs, ~0.2 s per command.
  - Lists are cut short silently: R2 at 20, Workers at 10, and `--per-page 0` returns 1.
  - The "condensed JSON for agents" isn't real: output is byte-identical with CLAUDECODE=1.
  - `--dry-run` prints secrets in plain text, and 7 hand-written commands have no dry run.
  - Search: 14/25 right first time, 21/25 in the top 5.
- [findings/secrets.md](findings/secrets.md):
  - `bindings.secret()` declares a required secret; tsc catches misuse.
  - `cf dev` reads `.dev.vars[.<mode>]`; the first deploy needs `--secrets-file`.
  - Modes work (`<name>-staging`).
  - Bugs: the documented bulk shape is a no-op; delete without `--force` exits 0.
- [findings/lifecycle.md](findings/lifecycle.md):
  - Uploading versions and gradual splits work (21/19 on 50/50).
  - There's no rollback command (redeploying the old version at 100% does it): [cloudflare/cf#106](https://github.com/cloudflare/cf/issues/106).
  - Previews can't be listed or deleted and fail if the config has a cron.
  - Observability is off by default.
- [findings/data.md](findings/data.md):
  - Remote D1/KV/R2 work; D1 needs the UUID and KV the ID.
  - `--local` data commands hang or return empty lists, and migrations can't target the local DB.
  - The dev server's Local Explorer API works for local data.
- [findings/shape.md](findings/shape.md):
  - All bindings work in one Worker, and the first deploy creates KV/D1/R2/queue itself.
  - One config holds one Worker, so each Worker gets its own directory.
  - vitest-pool-workers ignores `cloudflare.config.ts`.
  - The deployed cron first fired about 15 minutes after deploy.

## The mise layout this led to
- `mise.toml` is the menu: node, PROJECT (default `app`), PORT, and includes. Tasks live in `tasks/`, one file per activity:
  - project.toml: new, init, install, dev, build, types, test, check, migrate, worker:name
  - release.toml: deploy, versions, release, promote, rollback, preview, logs, errors
  - secrets.toml: secret:ls/put/rm/push
  - data.toml: db:*, kv:*, r2:*, all by NAME
  - local.toml: local:db:migrate, local:db, local:kv:*, local:r2:*
  - cli.toml: cf, search, schema, login, whoami
  - account.toml: resources, cleanup
  - verify.toml: verify, verify:remote, fuzz
- `scripts/` holds the helpers that hide cf's rough edges:
  - cfx.mjs: name→ID lookups, the Worker name for a MODE, tables, renaming new projects, the dev port
  - deploys.mjs: versions, splits and rollback
  - local-migrate.mjs: D1 migrations applied to the dev database, which cf can't do
  - logs.mjs, record.mjs, cleanup.mjs, verify.sh
- Every deploy records what it creates in `.cf-manifest.json`, and `cleanup` deletes exactly that.
- Templates (`mise run new <dir>` / `--full`):
  - `template/` (default): a single-page app plus `/api`, D1 notes and KV hits, with observability on and 4 tests.
  - `template-full/`: adds DO, queue, cron, workflow, AI and R2 (3 tests).
  - Both typecheck and pass their tests.
- `mise run verify` (local, 27 s): 10/10 PASS:
  - new → types → tests → dev (SPA and API) → local D1 migration (applied once) → notes in D1 → local KV.
- `fuzz/` keeps the robustness fuzz scripts, so they can be re-run against a new cf. `dryrun.sh` uses only fake IDs and leaves out deploy.

## Forge: the spec behind cf (mcp/)
- `github.com/cloudflare/forge` (Apache-2.0) publishes `openapi.forge.json`: 26 MB, OpenAPI 3.0.3, 2,177 paths, 3,458 operations and 7,869 schemas.
  - Its `x-forge-*` annotations include hidden (2,090), require-confirmation (207), params (85) and sunset (32).
  - cf 1.0.0-beta.5 is generated from release `openapi@6b0fb3cd…`: a 101 MB typed SDK, not exported from the npm package, plus the commands.
- AGENTS.md in cf says new or fixed commands go in as overlays in Forge, not in cf. That's the official route to fix what our scripts/ work around (name lookups, paging, rollback). Not yet checked: whether outside contributions are accepted.
- `mcp/generate.mjs` turns the dev subset into MCP tools. It skips hidden operations and code uploads (those are cf deploy's job), inlines $refs and trims descriptions.
  - Tools mode: **153 tools, 132 KB (~34k tokens)**. Comparing that with `cf tools` (4 MB) is unfair, because cf is search-first and never meant agents to load all its tools.
  - Search mode, the fair comparison: 3 tools (search, schema, call) over 1,383 operations, with a tool list of 935 bytes.
  - `mcp:bench` on 18 API-backed tasks: cf cli search got 11/18 top-1 and 16/18 top-5; BM25 over the Forge spec got 10/18 and 16/18. They miss different things: cf misses queue messages and log queries, ours misses custom domains and listing zones.
- `mcp/server.mjs`: stdio JSON-RPC with no dependencies. It fills in the account ID, reports when there are more pages, and turns API errors into isError.
  - `mcp:smoke` against the live account: 10/10 PASS. That covers initialize, tools/list, a typed D1 query body, a D1 query (SELECT 1), listing Workers, KV paging reported, and a bad ID / missing argument / unknown tool each returning isError.
