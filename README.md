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

## Reported upstream

The bugs and gaps found here, as cf issues. Each workaround in the tasks and scripts is tagged `Upstream: cloudflare/cf#<n> (when fixed: ...)`, and `mise run upstream:status` shows which issues are closed, meaning that workaround can go.

| Issue | What | Workaround here |
|---|---|---|
| [cloudflare/cf#20](https://github.com/cloudflare/cf/issues/20) (existing) | Lists silently return only the first page | every list passes `--per-page 100` |
| [cloudflare/cf#38](https://github.com/cloudflare/cf/issues/38) (commented) | Commands take IDs, not names | `cfx.mjs db-id` / `kv-id`; cleanup looks IDs up by name |
| [cloudflare/cf#68](https://github.com/cloudflare/cf/issues/68) (existing) | No live `tail` | `mise run logs` (Workers Logs) |
| [cloudflare/cf#74](https://github.com/cloudflare/cf/issues/74) (existing) | `r2 objects bulk-delete` can't empty a bucket | cleanup deletes objects one by one |
| [cloudflare/cf#94](https://github.com/cloudflare/cf/issues/94) (existing) | An aborted delete exits 0 | `secret:rm` and cleanup pass `--force` |
| [cloudflare/cf#99](https://github.com/cloudflare/cf/issues/99) | `--per-page` not validated; maximums not advertised | none |
| [cloudflare/cf#100](https://github.com/cloudflare/cf/issues/100) | `cf <unknown> --help` exits 0; the error comes after the whole help | none |
| [cloudflare/cf#101](https://github.com/cloudflare/cf/issues/101) | Misleading auth errors (profile, account id) | none |
| [cloudflare/cf#102](https://github.com/cloudflare/cf/issues/102) | `secrets bulk` no-ops on the plain shape; invalid secret names accepted | `mise run secret:push` sends `{"secrets":{...}}` |
| [cloudflare/cf#103](https://github.com/cloudflare/cf/issues/103) | `--dry-run` prints secret values | none (keep secret dry-runs out of logs) |
| [cloudflare/cf#104](https://github.com/cloudflare/cf/issues/104) | No `--dry-run` on hand-written mutating commands; deploy dry-run skips secret checks | none |
| [cloudflare/cf#105](https://github.com/cloudflare/cf/issues/105) | Output for scripts and agents (empty stdout, `--version`, agent mode) | none |
| [cloudflare/cf#106](https://github.com/cloudflare/cf/issues/106) | No rollback command | `mise run rollback` |

## When cf changes

`mise run check` runs every local check in one go (the template loop). It needs no account.

1. Bump `cf` in `template/package.json` and `template-full/package.json`.
2. `mise run verify`: the local end-to-end check, no account needed.
3. `mise run verify:remote`: deploys `cftest-verify` and checks it live. Then run `mise run cleanup`.
4. `PROJECT=.verify/app mise run fuzz`: a read-only fuzz of cf itself, written to `fuzz/out/`.
5. Update FINDINGS.md with what changed.
