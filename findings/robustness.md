# cf robustness fuzz

cf 1.0.0-beta.5, node 26.10.0 (mise), macOS arm64, OAuth login. Run 2026-09-29, 13:27–13:50 local.
Read-only: only GET commands were run against the account, and every mutating command had `--dry-run`. Afterwards KV, D1, queues and R2 had no `cf-fuzz*` resources.
Scripts and raw output are in `fuzz-cli/`: `fuzz.mjs` → results.json; `global.sh` → global.txt; `output-modes.sh`; `paging.mjs` → paging.md; `dryrun.sh` → dryrun.md; `search.mjs` → search.md.
Other agents were deploying to the same account during the run, so Worker counts moved slightly between runs.

## 1. Random GET list/get commands (fuzz.mjs)
- The pool was the 1,192 commands with httpMethod GET and "list"/"get" in the name, out of 2,936 in `dist/_meta/commands.json`.
- 60 were sampled with seed 7. Each ran 3 ways, for 180 runs in total:
  - no args;
  - bogus positionals plus `--bogus-flag x`;
  - a zero ID with `--page -1 --per-page abc`.
- Tool names map back to commands cleanly: `cf tools` names (spaces and hyphens → `_`) had 0 collisions and 0 unmapped.

| metric | result |
|---|---|
| crashes (JS stack traces) | **0** |
| hangs (>30 s) | **0** |
| exit 0 | 15 / 180 (all no-arg lists that really returned data or `[]`) |
| exit ≠ 0 | 165 / 180 |
| exit 0 with empty stdout | **1**: `cf zero-trust access applications cas list` |
| median / max wall time | 234 ms / 1,727 ms |

- Usage errors (a missing required arg, an unknown flag, a bad enum):
  - exit 1;
  - the **whole help page goes to stderr, and the actual error is the last 3 lines** (`┌ Error │ Unknown argument: nosuchflag └`);
  - an agent reading only the head of stderr sees help text, not the error.
- API errors exit 1, with a boxed `APIError │ [code] msg │ 4xx · HTTP <path>` on stderr. Seen:
  - 7001 (`page` below 1);
  - 2701 / `per_page (NaN)` (`--per-page abc` reached the API as NaN, with no client-side validation);
  - 4119, 401, 10002 (entitlements).
- stdout was always empty or valid JSON: no mixed text on stdout in any piped run.

## 2. Global behaviour (global.sh, output-modes.sh)
| case | exit | notes |
|---|---|---|
| `cf nosuchthing` | 1 | Root help on stderr |
| `cf nosuchthing --help` | **0** | 10 KB root help on stdout. An unknown command looks like success. |
| `cf workers nosuch` | 1 | |
| `cf workers list --nosuchflag` / `--per-pag 5` | 1 | "Unknown argument", after the full help. No "did you mean". |
| `--help` root / group / leaf, `-h`, `cf help` | 0 | **Every help output starts with the "=== STOP: AGENT COMMAND DISCOVERY ===" banner**, on stdout. |
| `cf` (no args) | 0 | Banner plus a short intro |
| `--version`, `-v` | 0 | Output is `🍊☁️  cf · v1.0.0-beta.5` plus a box-drawing rule (48 B). **There's no plain semver**, so parsing it needs a regex. |
| `-q` / `--quiet` on `workers list` | 0 | Byte-identical to no `-q` (12,385 B) |
| `--profile nosuchprofile` | 1 | Says "No authentication token found…" instead of "profile not found" |
| `CLOUDFLARE_PROFILE=nosuch` | 0 | **Silently ignored.** It used the default login. |
| `CLOUDFLARE_ACCOUNT_ID=000…0` | 1 | `[10000] Authentication error 403`: misleading, since the token is fine and the account is wrong |
| `CLOUDFLARE_ACCOUNT_ID=junk` | 1 | `[7003] Could not route…` 404 |
| `--account-id junk` | 1 | Unknown argument. There's no `--account-id` flag; only the env var works. |
| `--zone nosuch.invalid` | 1 | `Zone not found: nosuch.invalid`: clear |
| `--zone-id junk` | 1 | Unknown argument (the flag is `-z/--zone`) |
| dns list with no zone | 1 | Clear message listing the 3 ways to pass a zone |
| `CLOUDFLARE_API_TOKEN=bogus` | 1 | `[9106] Authentication failed (400)`. The env token overrides the OAuth login silently. |
| `--per-page 0` / `--per-page -5` | **0** | **Silently returns 1 item** (`workers list`) |
| `--per-page abc` | 0 | Ignored; the default page came back |
| `--per-page 100000` | 0 | All Workers (80 KB) |
| `--page 9999` | 0 | `[]` |
| `--order-by bogus` | 1 | Enum validated client-side: good |
| `--json` / `--format x` | 1 | Unknown argument. There's no output-format flag at all. |
| `cf cli search ""` | 0 | `[]` |
| `cf schema nosuch cmd` | 1 | Clear message |
| `cf d1 get notauuid` | 1 | 7404 not found. No client-side UUID check. |

### TTY vs pipe, CLAUDECODE, NO_COLOR
Bytes of stdout plus stderr for the same command:

| command | pipe | TTY | TTY, NO_COLOR=1 | ANSI lines on TTY |
|---|---|---|---|---|
| `d1 list` | 5,474 | 13,670 | 5,794 | 170 → 0 with NO_COLOR |
| `auth whoami` | 13,126 | 14,732 | 13,738 | 24 → 0 |
| `workers list --per-page 100` | ~84 KB | ~90 KB | ~88 KB | 43 → 0 |

- **CLAUDECODE=1 changes nothing**: `d1 list` was 5,474 B and 209 lines either way.
  - The launch post promises "condensed JSON for agents", but piped output is pretty-printed JSON whether or not an agent is detected.
- Pipe output is clean JSON with no banner and no ANSI.
- On a TTY, the banner and a "Loading [0s]" spinner are written to the terminal. NO_COLOR is honoured.

## 3. Pagination (paging.mjs, 40 account-level list commands with `--per-page`)
Default count vs `--per-page 100` count:

| command | default | --per-page 100 |
|---|---|---|
| `cf workers list` (from FINDINGS.md, reconfirmed: 80 KB with a large per-page) | 10 | all |
| `cf r2 buckets list` | **20** | **35** |
| `cf durable-objects namespaces list` | **20** | **30** |
| `cf pages projects list` | 6 | **exit 1**: `[8000024] Invalid list options… per_page` (the API max is lower; the CLI doesn't know it) |
| `cf iam permission-groups list` | 100 | 100 (probably capped; this can't be seen from the output) |
| d1 list (23), kv namespaces list (15), tunnels list (3), others | same | same |

- **Nothing on stdout or stderr says a result is truncated.** There is no `result_info`, no "more available" and no `--all`.
- An agent that runs `cf r2 buckets list` sees 20 of 35 buckets.
- 15 of the 40 exited 1 because they need a required option (not a pagination issue).

## 4. `--dry-run` (dryrun.sh, 20 mutating commands)
- All 1,508 generated mutating commands (non-GET) have `--dry-run`.
- **Hand-written mutating commands without `--dry-run`:**
  - `d1 migrations apply`
  - `pages deploy`
  - `previews deploy`
  - `containers push`
  - `containers images delete`
  - `auth delete`
  - `tunnels run`
- Only `deploy`, `migrate`, `workers versions create` and `workers triggers deploy` have it.

| result | commands |
|---|---|
| exit 0, prints the planned request as JSON `{command, method, url, pathParams, query, bodyKind, body}` | kv namespaces create, d1 create, r2 buckets create, queues create, workers delete, kv namespaces delete, d1 delete, r2 buckets delete, zones create, workers secrets update (the secret is echoed in `body`), d1 query (`DROP TABLE` echoed), accounts members delete |
| exit 0, runs a real local build then prints the binding table and "--dry-run: exiting now" | `deploy`, `workers versions create` |
| exit 1, usage error | dns records create, cache purge, workers deployments create (my flag names were wrong or required options were missing), hyperdrive configs create, vectorize indexes create, zero-trust tunnels cloudflared create (these commands don't exist) |

- Nothing was mutated: afterwards there were no `cf-fuzz*` KV namespaces, D1 databases, queues or R2 buckets.
- Dry-run is purely local. **It doesn't check that the target exists**: deleting ID `000…0` "succeeds" with exit 0. It proves syntax, not effect.
- **A misleading error:** for commands that *do* exist (`dns records create`, `cache purge`, `workers deployments create`), a bad flag or value gets `┌ Error │ Unknown command: dns records create --zone … └`. It names the whole argv as an "unknown command", not the bad flag.
- `workers secrets update --dry-run` prints the secret value in plain text in the JSON body. Keep it out of logs. [cloudflare/cf#103](https://github.com/cloudflare/cf/issues/103).

## 5. Search quality (search.mjs, 25 dev tasks, `cf cli search`, top 5)
**Top-1: 14/25 correct. Top-5: 21/25.** Two regex hits turned out to be false positives on manual review and are counted as misses here. The average call took about 210 ms.
- Misses:
  - "roll back a worker to a previous version" → workers-builds migrate-to-previews, radar… (the right answer, `workers deployments create`, isn't in the top 5).
  - "send a message to a queue" → `queues messages ack`, email-sending…
  - "tail live logs of a worker" → **`pages projects deployments tails create`**, audit logs. There's no Worker tail command.
  - "add a custom domain to a worker" → all 5 are ai-gateway or r2 custom domains. Nothing for Workers.
- Right, but not first:
  - "run d1 migrations": `migrations list` came first, `apply` second.
  - "add a dns record": `edit` and `update` came before `create`.
  - "create a d1 database": `d1 migrations apply` came before `d1 create`.
  - "create an api token": 4th, after api-security token-validation.
  - "query worker logs": `logs query` (not Workers) came first; `observability telemetry query` was 4th.
  - "upload a file to r2" and "create a queue": 2nd.

## 6. Startup time (10-run loop; there's no hyperfine)
| command | mean |
|---|---|
| `node -e 0` (baseline) | 38 ms |
| `cf --version` | 158 ms |
| `cf workers list` (1 API call) | 210 ms |
| `cf cli search deploy` | 213 ms |
| `cf auth whoami` | 249 ms |
| `cf tools` (4.1 MB JSON) | 270 ms |

Fast. Startup isn't a problem for agent loops.

## Worst bugs (reported upstream 2026-09-30; re-checked on 1.0.0-beta.5)
1. **Silent truncation of list results.** Already reported: [cloudflare/cf#20](https://github.com/cloudflare/cf/issues/20).
   - `cf r2 buckets list` → 20 items; `cf r2 buckets list --per-page 100` → 35. The same happens with `durable-objects namespaces list` (20 vs 30) and `workers list` (10 vs all).
   - There's no indication of truncation on stdout or stderr and no `--all`.
   - Expected: auto-paginate, or print a warning or `result_info` to stderr.
2. **`--per-page 0` or a negative value silently returns 1 item with exit 0.** [cloudflare/cf#99](https://github.com/cloudflare/cf/issues/99). `cf workers list --per-page 0` → 1 Worker, exit 0. `--per-page abc` is ignored with exit 0 on `workers list`, but sent as `NaN` elsewhere (`per_page (NaN) is not a number`).
3. ([cloudflare/cf#99](https://github.com/cloudflare/cf/issues/99)) **`cf pages projects list --per-page 100` exits 1**: `[8000024] Invalid list options`. The CLI advertises `--per-page` without the endpoint's max.
4. **Unknown command + `--help` exits 0.** [cloudflare/cf#100](https://github.com/cloudflare/cf/issues/100). `cf nosuchthing --help; echo $?` → 0, printing the root help.
5. **"Unknown command" for existing commands.** No longer reproduces on 2026-09-30: cf now names the bad flag ("Unknown arguments: purge-everything"). Not reported. `cf cache purge --zone nosuch.invalid --purge-everything --dry-run` → `Error │ Unknown command: cache purge --zone …`, although `cache purge` exists (commands.json). The error should name the bad flag.
6. **Usage errors put the whole help before the error on stderr.** [cloudflare/cf#100](https://github.com/cloudflare/cf/issues/100). `cf workers list --nosuchflag 2>&1 | head` shows only help. The error is in the last 3 lines.
7. **The agent detection changes nothing in the output.** [cloudflare/cf#105](https://github.com/cloudflare/cf/issues/105). `CLAUDECODE=1 cf d1 list | wc -c` → 5,474, the same as unset. It's still pretty-printed, contrary to the launch post.
8. ([cloudflare/cf#101](https://github.com/cloudflare/cf/issues/101)) **`CLOUDFLARE_PROFILE` is ignored, and `--profile <missing>` reports "No authentication token found"** instead of "profile not found".
9. **A wrong `CLOUDFLARE_ACCOUNT_ID` reports `[10000] Authentication error`.** [cloudflare/cf#101](https://github.com/cloudflare/cf/issues/101). It reads like a bad token.
10. **`cf zero-trust access applications cas list` exits 0 with empty stdout.** [cloudflare/cf#105](https://github.com/cloudflare/cf/issues/105). Not JSON, so a `jq` pipeline breaks.
11. ([cloudflare/cf#105](https://github.com/cloudflare/cf/issues/105)) **`cf --version` isn't machine-readable**: an emoji banner and a box rule, no bare semver.
12. ([cloudflare/cf#104](https://github.com/cloudflare/cf/issues/104)) **Hand-written mutating commands lack `--dry-run`**: `d1 migrations apply`, `pages deploy`, `previews deploy`, `containers push`, `containers images delete`, `tunnels run`.

## Implications for mise tasks (wrappers needed)
- **`cf-json` wrapper** (the main one), for every read an agent or script consumes:
  - pipe stdout through `jq -e .`, so empty or non-JSON output fails;
  - on a non-zero exit, print only the stderr lines from the last `┌`, not the help dump.
- **`list` wrapper**:
  - always pass `--per-page` at the endpoint's max (100 for workers, R2 and DO; less for Pages), or loop `--page` until `[]`;
  - warn when count == per-page.
  - Never use a bare `cf … list` in tasks: the defaults are 10 or 20.
- **Existence check**: `mise run search` and any "does this command exist" check must not rely on `--help` exit codes. Use `cf schema <cmd>` (exit 1 when unknown) or look it up in `node_modules/cf/dist/_meta/commands.json`.
- **Safe mutations**:
  - `--dry-run` shows the HTTP request only; it doesn't check that the target exists.
  - For the hand-written commands without it (`d1 migrations apply`, `pages deploy`, `previews deploy`, `containers push`), the task needs its own confirmation or guard.
  - Redact `body` when logging dry-runs (secrets appear in plain text).
- **Environment hygiene**:
  - tasks should `unset CLOUDFLARE_PROFILE`, since it has no effect;
  - validate `CLOUDFLARE_ACCOUNT_ID` against `cf auth whoami` first, because a wrong one looks like an auth failure;
  - watch for `CLOUDFLARE_API_TOKEN`, which silently overrides OAuth.
- **Version pinning**: parse `cf --version` with `grep -oE '[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?'`.
- **Agents**: pipe output (not a TTY) is already clean JSON; set `NO_COLOR=1` anyway for TTY runs. Don't rely on CLAUDECODE for compact output: pipe through `jq -c` to cut tokens.
- **Search**: `mise run search` is fine for common tasks (top-5 21/25), but should document the known gaps: rollback → `workers deployments create`, queue send, Worker custom domains, and no tail.
