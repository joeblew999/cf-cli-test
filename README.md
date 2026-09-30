# cloudflare cli test

The new cli is coming and it's really different. Let's find out!

This repo tests Cloudflare's new [`cf` CLI](https://github.com/cloudflare/cf) (1.0.0-beta.5, open beta). It gives you:

- **A developer menu** of [mise](https://mise.jdx.dev) tasks. It covers only what a dev needs from cf's ~3,000 commands, and every task was tested.
- **Two project templates:**
  - `template/` is the default: a single-page app plus `/api`, D1 and KV.
  - `template-full/` has every binding: Durable Object, queue, cron, workflow, AI and R2.
- **Findings:** what works, what doesn't, and the bugs, in [FINDINGS.md](FINDINGS.md) and [findings/](findings/).
- **A way to re-run it all** when cf changes: `mise run verify`, `verify:remote` and `fuzz`.

## Quick start

You need [mise](https://mise.jdx.dev). It installs Node itself.

```sh
mise run new app        # a new project in app/ (the default PROJECT)
mise run dev            # http://localhost:5173 (PORT=... to change)
mise run local:db:migrate   # with dev running: apply migrations/ to the local D1
mise run test
mise run login          # browser login; the token refreshes itself (or set CLOUDFLARE_API_TOKEN)
mise run deploy         # the first deploy creates the KV and D1 for you
mise run db:migrate app-db
```

Run `mise tasks` to see everything. The main ones:

| Area | Tasks |
|---|---|
| Local loop | `new`, `init`, `dev`, `build`, `types`, `test`, `check`, `migrate` (Wrangler → cf) |
| Release | `deploy`, `versions`, `release <percent>`, `promote`, `rollback`, `preview <name>`, `logs`, `errors` |
| Secrets | `secret:ls`, `secret:put`, `secret:rm`, `secret:push` (from `.secrets/<MODE>.env`) |
| Remote data, by name | `db:query`, `db:exec`, `db:migrate`, `db:export`, `kv:get/put/ls/rm`, `r2:get/put/ls/rm` |
| Local data (dev server) | `local:db:migrate`, `local:db`, `local:kv:get/put`, `local:r2:put/ls` |
| Account | `whoami`, `resources`, `cleanup`, `search "<task>"`, `schema <command>` |

Two variables pick what a task works on:

- `PROJECT` is the project directory (default `app`).
- `MODE` is the config branch (`ctx.mode`): `MODE=staging mise run deploy` deploys `<name>-staging`.

## Things to know

- **Deploys are recorded.** Every deploy writes what it created to `.cf-manifest.json` (gitignored, per account). `mise run cleanup` deletes exactly those resources.
- **The tasks work around cf's gaps.** The scripts in `scripts/` handle:
  - name → UUID lookups (cf wants IDs);
  - lists that are cut short without warning;
  - rollback, which cf has no command for;
  - logs, since cf has no live tail;
  - local D1 migrations, which cf can't apply.
- **Tests restate the bindings.** `@cloudflare/vitest-pool-workers` doesn't read `cloudflare.config.ts`, so each template's `vitest.config.ts` lists them again.

## An MCP server generated from Cloudflare's own spec

`cf` is generated from [Forge](https://github.com/cloudflare/forge), Cloudflare's annotated OpenAPI spec of the whole API: 3,458 operations and 7,869 typed schemas. `mcp/` generates an MCP server from the same spec.

It has two modes:

- **search (default):** three tools, `search`, `schema` and `call`, over all 1,383 visible operations of the whole API. That's the same search-first design `cf` uses, and its tool list is under 1 KB.
- **tools** (`CF_MCP_MODE=tools`): 153 typed tools for the Workers developer APIs (Workers, D1, KV, R2, queues, workflows, observability), listed directly (~34k tokens).

Both modes:
- use `CLOUDFLARE_API_TOKEN` or the login from `mise run login`;
- flag destructive operations (from Forge's `x-forge-require-confirmation`);
- say when a list has more pages.

`mise run mcp:bench` compares its search with `cf cli search` on the same tasks. On 18 API-backed tasks: `cf` got 11 right first time and 16 in the top 5; ours got 10 and 16.

```sh
mise run mcp:generate          # download the pinned spec, regenerate mcp/tools.json
mise run mcp:smoke my-db       # check it over stdio against your account (read only)
mise run mcp:bench             # search quality vs cf cli search
claude mcp add cloudflare-dev -- mise -C /path/to/this/repo run -q mcp:serve
```

## SDKs from any OpenAPI spec (Forge + Fern)

`sdk/` generates typed SDKs from any OpenAPI spec, using Cloudflare's own toolchain. It produces TypeScript with Forge, and Go, Python, Java, C#, Ruby, PHP and Swift with Fern. Start with `mise run sdk:doctor`, then `mise run sdk:demo`. See [sdk/README.md](sdk/README.md).

## An oRPC API with real-time (api/)

`api/` is an oRPC 2.0 Worker on D1, contract first. It serves REST, SSE and a WebSocket that don't lose notes across deploys or disconnects (tested live by `mise run api:soak`), and it generates the OpenAPI and AsyncAPI specs that Fern turns into SDKs and a CLI. See [api/README.md](api/README.md), including the **upstream issues** (Fern, oRPC) we work around and `mise run upstream:status`.

## When cf changes

`mise run check` runs every local check in one go (template loop, SDK generation, the SDK inside workerd). It needs Docker but no account.

1. Bump `cf` in `template/package.json` and `template-full/package.json`.
2. `mise run verify`: the local end-to-end check, no account needed.
3. `mise run verify:remote`: deploys `cftest-verify` and checks it live. Then run `mise run cleanup`.
4. `PROJECT=.verify/app mise run fuzz`: a read-only fuzz of cf itself, written to `fuzz/out/`.
5. Update FINDINGS.md with what changed.
