# Deploy lifecycle: versions, gradual releases, rollback, previews, triggers, observability

cf 1.0.0-beta.5, node 26.10, 2026-09-29. Project `fuzz-life/` (a copy of hello/), Worker `cftest-life`
(in .cf-manifest.json). Only what was run and seen.

The Worker returns its own version: `VERSION: bindings.versionMetadata()` (found in
`@cloudflare/config` typings; `cf cli search "version metadata binding"` did not find it). `/` returns
`{release, id, tag, timestamp}`, `/boom` throws, and `scheduled()` logs.

## Verdicts

| Area | Verdict |
|---|---|
| deploy, change, deploy | Works: 5 s. `--tag`/`--message` are stored on the version. |
| `cf deploy --dry-run` | Works. It builds, lists bindings, prints "Dry run complete" and exits 0. It uploads nothing. |
| Upload without deploying | `cf workers versions create --tag --message` works; production is unchanged. |
| Gradual split | `cf workers deployments create` with 2 versions works. 50/50 gave 21/19 over 40 curls, and 50/50 again gave 17/23. |
| Rollback | There is no rollback command; you create a deployment at 100% for the old version. It converged in about 15 s (17/3 after 4 s, 30/0 after 15 s). |
| Previews | `cf previews deploy <name>` works and doesn't touch production. It can't list or delete previews. It fails when the config has triggers. |
| Cron triggers | `cf workers triggers deploy` works. Nothing reads them back. |
| Observability | **Off by default.** Only a full `cf deploy` switches it on; `observability: { enabled: true }` in config is ignored by `versions create` and `deployments create`. |
| `cf workers check` | Works (local only): bundle size and startup CPU profile. It writes `worker-startup.cpuprofile` into the project. |
| Routes / custom domains | Not exercised: 32 zones on the account, none clearly a test zone. `cf cli search` doesn't find Worker routes or domains (it returns network routes and ai-gateway domains). |

## Verified facts

### Versions
- `cf workers versions list --worker-id <name|id> --per-page 100` returns JSON, newest first. Each version has `number`, `annotations` (`workers/tag`, `workers/message`, `workers/triggered_by`), `urls` (its own preview URL), `source: "cf_cli"` and bindings.
- `triggered_by` is `upload` on the first deploy and `version_upload` on every later `cf deploy` or `versions create`. So you can't tell a deploy from a staged upload by version alone; `deployments list` tells you.
- `cf workers versions create` output still says **"use the command wrangler versions deploy"** and **"wrangler triggers deploy"**. The cf equivalents are `cf workers deployments create` and `cf workers triggers deploy`. It exits 0: "Version upload complete".
- Each version URL (`https://<first8>-cftest-life.gedw99.workers.dev`) served that version (200), including a version that wasn't deployed, as long as preview URLs are enabled.
- The `Cloudflare-Workers-Version-Overrides: cftest-life="<version-id>"` header pinned requests to v2 during a 50/50 split (6/6).

### Deployments (gradual, promote, rollback)
- `cf workers deployments list --worker <name>` returns the history, newest first. The first entry is the live split.
- `cf workers deployments create --worker <name> --strategy percentage --versions '[{"version_id":…,"percentage":50},…]'` works.
  - `--dry-run` prints the exact POST and body.
  - `--body '{"strategy":"percentage","annotations":{"workers/message":"…"},"versions":[…]}'` also sets a deployment message, which then shows in `deployments list`.
- The response is only `{"id": "<deployment-id>"}`.

### Previews
- `cf previews deploy` with no name and no Git exits with: "We couldn't determine a Preview name from CI or Git … run: cf previews deploy PREVIEW_NAME".
- `cf previews deploy cftest-life-pr1` prints JSON (`preview_id`, `preview_urls: [https://cftest-life-pr1-cftest-life.gedw99.workers.dev]`, `deployment_id`, `deployment_urls`), and both URLs served the new code. Production stayed on v1, and no Worker Version was added.
- The only command sitting under a preview area is `cf previews deploy`. `cf cli search "delete a worker preview"` returns nothing that deletes a preview. `cf workers-builds workers previews list --script-tag <id>` returned `[]` while 2 previews existed, so it covers Builds previews, not these.
- Preview URLs are **on by default**. The typings say `previewUrls` defaults to `false`, but the first `cf deploy` without it gave `subdomain.previews_enabled: true`.
- With `previewUrls: false`, a full `cf deploy` set `previews_enabled: false`, and every preview and version URL then returned 404.
  - `cf previews deploy cftest-life-pr3` still "succeeds" (exit 0) with `"preview_urls": []`, and the URL returns 404. That is a silently useless preview.

### Triggers (cron)
- Adding `triggers: [triggers.scheduled({ schedule: "*/30 * * * *" })]` and running `cf workers triggers deploy` printed "schedule: */30 * * * *" and "Trigger deploy complete". `--dry-run` works.
- It deploys triggers only. The live version had no `scheduled()` handler at that moment, and nothing warned. `cf deploy` deploys both code and triggers.
- `cf cli search "get cron schedules of a worker script"` finds no read command.

### Observability
- `cf workers get cftest-life` after the first deploy showed `observability.enabled: false` and `logs.enabled: false`. **Workers Logs is off by default**, so `mise run logs` shows nothing for a fresh Worker.
- After adding `observability: { enabled: true }`, both `versions create` plus 50% and `deployments create` at 100% left it `false`. The next full `cf deploy` switched it to `true`.
- Once it was on: 5 × `/boom` (500) and 5 × `/` gave 10 error events and 20 events within about 30 s through `cf observability telemetry query`. Events carry `$workers.scriptVersion.id`, so an error can be traced to a version during a split.

### Errors and exit codes
| Input | Output | Exit |
|---|---|---|
| `versions get not-a-uuid` | `[10004] The parameter 'version_id' is malformed` | 1 |
| `versions get <unknown uuid>` | `[10071] The requested Worker version could not be found` | 1 |
| `versions list --worker-id cftest-nope-xyz` | `[10007] This Worker does not exist on your account.` | 1 |
| `deployments create` at 60% | `[10210] … percentages must sum to 100` | 1 |
| `deployments create` with an unknown version id (via mise rollback) | `[10210] Invalid deployment: Version not found: …` | 1 |
| `deployments create` with the all-zero UUID | **`[10013] An unknown error has occurred` HTTP 500** | 1 |
| `cf deploy` with a syntax error | Vite/rolldown error with file:line:col; **ANSI colour codes even when piped**; production untouched | 1 |
| Not logged in (`HOME=<empty dir>`) | `whoami` → `{"authenticated":false,"error":"Not logged in"}`; `deploy` builds, then "No authentication token found … set CLOUDFLARE_API_TOKEN or run cf auth login" | 1 |

## Bugs (with repro)

1. **The existing `mise run deploy -- <args>` sends the arguments to record.mjs, not to cf.** mise appends the arguments to the end of the script, so `--tag`, `--message` and even `--mode staging` are dropped.
   - Repro: `PROJECT=fuzz-life mise run -n deploy -- --tag x` prints `… cf deploy "$@" 2>&1 | node …/record.mjs --tag x`.
   - Evidence: version #4 was deployed with `--tag v4 --message …` through the task and has no tag or message. The same flags straight to cf (#5) were kept.
   - Fix: see `deploy` below (wrap the script in a shell function); it was verified with #6.
2. **`cf previews deploy` fails when the config has any trigger**: "Preview uploads from Build Output don't support the `triggers` field." A project with a cron can't make previews without editing its config.
3. **`cf previews deploy` exits 0 with `preview_urls: []`** when preview URLs are disabled (see Previews).
4. **The `previewUrls` default is documented as `false` but is effectively on**: `previews_enabled: true` after the first deploy.
5. **`observability` in config is ignored by `versions create` and `deployments create`**: only `cf deploy` applies it, with no warning.
6. **`cf workers versions create` gives Wrangler commands** as its next steps (`wrangler versions deploy`, `wrangler triggers deploy`).
7. `deployments create` with the all-zero version UUID returns a 500 "unknown error" instead of "version not found".
8. Version metadata `tag` came back empty once. v2 (uploaded with `versions create --tag v2`) reported `tag: ""` through its version URL, although its annotation says v2. Versions deployed with `cf deploy --tag` (v1, v6) report their tag on workers.dev. The cause is not isolated (version URL vs `versions create`). Low impact.
9. `cf cli search` misses: "roll back a worker to a previous version", "list routes of a worker", "get cron schedules …", and "version metadata binding" (all tried; none returned the relevant command).
10. Tooling note (ours, not cf's): subagents share one scratchpad directory, so a helper named `cf.sh` written by one agent was overwritten by another. My first `--dry-run` silently built a different project. Use unique helper names.

## Proposed mise tasks

All were run with `MISE_ENV=life PROJECT=fuzz-life mise run <task>` from `mise.life.toml`, and each run's result is in the table below. They need `scripts/deploys.mjs` (added; it uses only cf, the same way logs.mjs does).

```toml
[tasks.deploy]
description = "REMOTE: deploy PROJECT; arguments reach cf (--tag, --message, --mode); records what it creates in .cf-manifest.json"
dir = "{{config_root}}/{{env.PROJECT}}"
raw_args = true
# mise appends arguments to the end of the script: wrap in a function so they land on cf deploy, not on record.mjs.
run = 'deploy() { set -o pipefail; ./node_modules/.bin/cf deploy "$@" 2>&1 | node {{config_root}}/scripts/record.mjs; }; deploy'

[tasks.versions]
description = "REMOTE, read only: PROJECT's Worker versions, newest first, with the live traffic split"
dir = "{{config_root}}/{{env.PROJECT}}"
run = "node {{config_root}}/scripts/deploys.mjs versions"

[tasks.release]
description = "REMOTE: upload PROJECT as a new version and send PERCENT of traffic to it (default 10): mise run release -- 50 (TAG=, MESSAGE= optional)"
dir = "{{config_root}}/{{env.PROJECT}}"
raw_args = true
run = "node {{config_root}}/scripts/deploys.mjs release"

[tasks.promote]
description = "REMOTE: send 100% of traffic to a version (default: the newest): mise run promote -- [version-id]"
dir = "{{config_root}}/{{env.PROJECT}}"
raw_args = true
run = "node {{config_root}}/scripts/deploys.mjs promote"

[tasks.rollback]
description = "REMOTE: send 100% of traffic back to the previous deployment's version, or to a given one: mise run rollback -- [version-id]"
dir = "{{config_root}}/{{env.PROJECT}}"
raw_args = true
run = "node {{config_root}}/scripts/deploys.mjs rollback"

[tasks.preview-deploy]
description = "REMOTE: deploy PROJECT as a named Worker Preview (no Git here, so the name is required): mise run preview-deploy -- pr-1"
dir = "{{config_root}}/{{env.PROJECT}}"
raw_args = true
run = "./node_modules/.bin/cf previews deploy"

[tasks.errors]
description = "REMOTE, read only: error events of PROJECT's Worker (needs observability on): mise run errors -- [--since 60m]"
dir = "{{config_root}}/{{env.PROJECT}}"
raw_args = true
run = "node {{config_root}}/scripts/deploys.mjs errors"

[tasks.check]
description = "Profile PROJECT's Worker startup time (builds locally)"
dir = "{{config_root}}/{{env.PROJECT}}"
run = "./node_modules/.bin/cf workers check"
```

Run evidence:

| Task | Command | Result |
|---|---|---|
| `deploy` | `-- --tag v6 --message "v6 via fixed task"` | Version #6 has tag v6 and the message. |
| `versions` | | Table of `live% #n id date tag triggered_by message`. |
| `release` | `TAG=v3 … release -- 50` | Uploaded #3 with its test URL, then deployed 50/50 with v1. Curl gave 17/23. |
| `release` | `-- 100` | Deployed #7 at 100%. |
| `promote` | | #3 at 100%. |
| `rollback` | (no argument) | Back to #3 from #4, the previous deployment's main version. Curl showed it converging. |
| `rollback` | `-- <bad uuid>` | API error [10210]; the task exits 1. |
| `preview-deploy` | `-- cftest-life-pr2` | Preview JSON; the URL served 200. It needs the config without triggers (bug 2). |
| `errors` | `-- --since 15m` | 10 error events, each with its version id. |
| `check` | | JSON with startup profile. |

Suggestions:
- Keep `deploy` as the only way config-level settings change (observability, previewUrls, triggers). Document that `release`, `promote` and `rollback` move code only.
- Also add `observability: { enabled: true }` to the scaffold (`init`) so `logs` and `errors` work from the first deploy.
