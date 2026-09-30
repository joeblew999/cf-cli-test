# Secrets, vars, modes, types

cf 1.0.0-beta.5, node 26 (mise), macOS arm64, 2026-09-29. Project: `fuzz-secrets/` (copy of hello/, only text + json + secret bindings, no KV/D1/R2).
Remote resources created (both recorded in .cf-manifest.json): Workers `cftest-sec` (production) and `cftest-sec-staging`. Nothing else.

Config used:

```ts
export default defineConfig((ctx) => {
  const mode = ctx.mode ?? "development";
  const name = mode === "production" || mode === "development" ? "cftest-sec" : `cftest-sec-${mode}`;
  return { worker: { name, compatibilityDate: "2026-09-25", entrypoint, env: {
    MODE: bindings.text(mode),
    SETTINGS: bindings.json({ level: mode === "production" ? "info" : "debug", flags: ["a"] }),
    API_KEY: bindings.secret(),
  } } };
});
```

The Worker returns `{mode, settings, apiKeySet, apiKeyLen, apiKeyPrefix}`, so each test shows which value got through without printing the secret.

## Verified facts

### Declaring secrets
- **`bindings.secret()` exists.** It declares a *required* secret (no value in config). Its JSDoc: "Replaces .dev.vars/.env/process.env inference for type generation; enables local dev validation with warnings for missing secrets".
- `bindings.secretsStoreSecret({ storeId, secretName })` binds a Secrets Store secret. Not exercised (creating store secrets is outside the allowed resource kinds). `cf secrets-store stores list` shows the account's `default_secrets_store`; `cf secrets-store quota get` shows 2/100 used.
- `bindings.text("…")` → plain_text var; `bindings.json({...})` → a json binding. The code gets a real object (`env.SETTINGS.level`), not a string, both locally and when deployed.

### Local (`cf dev`)
- **Missing secret: only a warning, and the Worker runs anyway**: `Missing required secrets for Worker "cftest-sec": API_KEY. Add them to one of .dev.vars.development, .dev.vars, .env.development.local, .env.development, .env.local, or .env. Alternatively, set them as environment variables.` The runtime value is `undefined`, but the type says `string` (see Types).
- Where it looks, all tested:
  - `.dev.vars` → used.
  - `.env` only → used.
  - When both exist, **`.dev.vars` wins** and `.env` is ignored.
  - Shell env `API_KEY=… cf dev` with no files → used.
  - `.dev.vars.staging` and `.dev.vars` together with `cf dev --mode staging` → **the `.staging` file wins**.
- `cf dev --mode staging` **is forwarded to Vite** (`Delegating to npx vite "--mode" "staging"`), even though `cf dev --port` is rejected. `ctx.mode` is `"development"` for plain `cf dev` and `"staging"` with `--mode staging`.
- `cf dev` / `cf build` have no `Options` section in `--help`; `-m/--mode` is a global flag on every command.

### Remote deploy
- **A first deploy with a missing required secret fails** (exit 1) after building:
  `The following required secrets have not been set: API_KEY … To deploy a new Worker with secrets, supply them via a secrets file: wrangler deploy --secrets-file <path-to-file>`. The message says `wrangler`; in cf the command is `cf deploy --secrets-file`.
- **`cf deploy --secrets-file <file>`** works with .env format (`API_KEY=…`) and with JSON (`{"API_KEY":"…"}`). The live Worker saw the values. In .env files, quotes around values were stripped.
- **`.dev.vars*` is never uploaded.** `cf deploy --mode qa` with `.dev.vars.qa` and `.dev.vars` present, and no `--secrets-file`, still failed with the missing-secret error. Good: local and remote secrets stay apart.
- **Redeploying without `--secrets-file` keeps the existing secret.** The value survived, and so did values set later with `secrets update` or `bulk`.
- `ctx.mode` under `cf deploy` defaults to **`"production"`** (Vite build default). `cf deploy --mode staging` → a separate Worker `cftest-sec-staging` with its own vars and secrets. `cf build -m staging` writes `name: "cftest-sec-staging"` into `.cloudflare/output/v0/workers/default/worker.config.json`.
- The deploy bindings table labels secrets `env.API_KEY ("(hidden)") Environment Variable`. The value is hidden, but the label is wrong.

### `cf workers secrets` (list / get / update / delete / bulk)
- **None of them read the Worker name from cloudflare.config.ts**: `Required Worker name missing. Please specify the Worker name with --worker <name>`, and passing `-m staging` doesn't help. You always need `--worker`.
- `update <NAME>` **requires `--type secret_text`** (exit 1 without it, even when `--text` is given). The value comes from `--text <v>` **or stdin**. A trailing newline from stdin is stripped (`printf 'x\n'` → length 1 value). With `</dev/null` it fails: `--text is required. Pipe the value via stdin, pass --text <value>, or run interactively.` Stdin is the safe way: no secret in argv or shell history.
- `list` returns JSON `[{name,type}]`. `get NAME` returns `{name,type}` with no value.
- `delete NAME` without `--force` in a non-TTY prints `Aborted.` and **exits 0**, having deleted nothing. `delete -f` prints nothing and exits 0. Deleting a missing name → `[10056] Binding 'NOPE' not found`, exit 1. An unknown Worker → `[10007] This Worker does not exist`, exit 1.
- `bulk`: see the bug below. The body that works is **`{"secrets":{"NAME":{"type":"secret_text","text":"v"},"GONE":null}}`**. That sets and deletes in one new version.
- Changes take **about 5–10 s** to reach the live Worker. A curl right after `update`/`bulk` can still return the old value.

### Types
- `cf workers types` writes `.cloudflare/types/index.d.ts`. It infers `Env` from the config itself: `InferEnv<UnwrapConfig<typeof config>>`. Nothing is listed by hand, and it works with a `(ctx) => …` factory config.
- `tsc --noEmit` catches every wrong usage tried (exit 1):
  - `const a: number = env.API_KEY` → TS2322 string→number.
  - `env.NOPE` → TS2339 Property 'NOPE' does not exist on type 'Env'.
  - `const c: number = env.SETTINGS.level` → TS2322 (the json binding is typed from its literal: `{ level: string; flags: string[] }`).
  - `env.SETTINGS.missing` → TS2339.
  - `env.MODE.get("x")` → TS2339 on type 'string'.

## Bugs / gaps (with repro)
1. ([cloudflare/cf#102](https://github.com/cloudflare/cf/issues/102)) **`secrets bulk` silently no-ops on the documented RFC 7396 shape.** `cf workers secrets bulk --worker W --body '{"API_KEY":{"type":"secret_text","text":"v"}}'` returns 200 and exit 0. The response lists the bindings, but the value is unchanged (checked over 20 s). Only `{"secrets":{...}}` applies. The same happens with `--file` holding the plain shape. A `.env` file passed to `--file` → `[10026] Could not parse request body`. The help text doesn't show the body shape, and `cf schema workers secrets bulk` shows `requestBodyFields: []`.
2. ([cloudflare/cf#104](https://github.com/cloudflare/cf/issues/104)) **`cf deploy --dry-run` does not check required secrets.** `cf deploy --mode qa --dry-run` (a new Worker, no secret) → "Dry run complete", exit 0. The real deploy then fails. The dry-run bindings table also leaves out `API_KEY`.
3. **The type says a secret is always there; locally it isn't.** `env.API_KEY` is typed `string`, but it is `undefined` in `cf dev` when missing (only a warning).
4. **`secrets` commands ignore the project config**: `--worker` is required, `-m` has no effect.
5. ([cloudflare/cf#102](https://github.com/cloudflare/cf/issues/102)) **`secrets update` accepts invalid names**: `"bad-name!"` was created (exit 0), though the help says "A JavaScript variable name". It can be deleted again with `delete "bad-name!" -f`.
6. (already reported: [cloudflare/cf#94](https://github.com/cloudflare/cf/issues/94)) **An aborted `delete` exits 0.** Scripts can't tell it was aborted; use `--force`.
7. The missing-secret error tells you to use `wrangler secret put` / `wrangler deploy --secrets-file`.
8. The deploy bindings table labels secrets "Environment Variable".

## Recommended structure (default project)
- In `cloudflare.config.ts`, use `defineConfig((ctx) => …)` with `const mode = ctx.mode ?? "development"`. Map `development`/`production` → the base Worker name and any other mode → `<name>-<mode>`, so staging is its own Worker. Non-secret config per mode goes in `bindings.text`/`bindings.json` computed from `mode` (typed, visible in the deploy table). Every secret is declared as `bindings.secret()`, so it is required, typed, and checked by both dev and deploy.
- Local secrets: `.dev.vars` for default dev and `.dev.vars.<mode>` for `cf dev --mode <mode>`. They are already gitignored by the scaffold (`.dev.vars*`, `.env*`) and never uploaded.
- Remote secrets: `.secrets/<mode>.env` (add `.secrets/` to .gitignore). Pass it to the first deploy with `--secrets-file` (required for a brand-new Worker). Later, rotate with `secret:put` (stdin) or `secret:push` (bulk, one version). Keep the remote files out of the names `.dev.vars*`/`.env.<mode>`: `cf dev --mode production` would read `.env.production` locally.
- Run `cf workers types && tsc --noEmit` (the existing `types` task) in CI. It catches binding misuse. Check secrets at runtime (`if (!env.API_KEY) …`), because types can't catch a missing local value.

## Proposed mise tasks
All of these were run from a harness mise.toml identical in style (config_root + PROJECT=fuzz-secrets), and all succeeded:
- `worker:name` → `cftest-sec` / (MODE=staging) `cftest-sec-staging`.
- `secret:list` for both modes.
- `printf 'tmp-v' | MODE=staging mise run secret:put -- TEMP_S` → `{name:"TEMP_S"}`.
- `MODE=staging mise run secret:rm -- TEMP_S` → `deleted TEMP_S from cftest-sec-staging`.
- `MODE=staging mise run secret:push` → `pushed 2 secret(s) …`; the live value changed and quotes were stripped.
- `MODE=staging mise run deploy:mode` (with `.secrets/staging.env`) and `mise run deploy:mode` (production, no file; secrets kept). Both deployed and were recorded in the manifest.
- `PORT=5392 MODE=staging mise run dev:mode` served `mode:"staging"` with the `.dev.vars.staging` secret.

Note: the tasks work out the Worker name inline, not with a nested `mise run worker:name`. A nested call from inside the project dir resolved a different config in the harness; inline is robust either way.

```toml
# --- modes and secrets (MODE picks the config branch: defineConfig((ctx) => ... ctx.mode)) -----
# Local secrets:  .dev.vars.<mode> (or .dev.vars / .env*): read by `cf dev` only, never uploaded.
# Remote secrets: .secrets/<mode>.env (gitignore it): uploaded by deploy:mode / secret:push.
# Secret commands need the Worker name (cf does not read it from config): taken from WORKER, else from `cf build --mode`.

[tasks."dev:mode"]
description = "Local dev server for PROJECT in MODE (default development); secrets from .dev.vars.<MODE>, .dev.vars or .env*"
dir = "{{config_root}}/{{env.PROJECT}}"
run = "./node_modules/.bin/cf dev --mode \"${MODE:-development}\""

[tasks."deploy:mode"]
description = "REMOTE: deploy PROJECT in MODE (default production), uploading .secrets/<MODE>.env if present (required for a first deploy with bindings.secret())"
dir = "{{config_root}}/{{env.PROJECT}}"
run = """
set -euo pipefail
M="${MODE:-production}"; F=".secrets/$M.env"
set -- --mode "$M"; [ -f "$F" ] && set -- "$@" --secrets-file "$F"
./node_modules/.bin/cf deploy "$@" 2>&1 | node {{config_root}}/scripts/record.mjs
"""

[tasks."worker:name"]
description = "Print the Worker name PROJECT's config resolves to in MODE (builds once)"
dir = "{{config_root}}/{{env.PROJECT}}"
run = """
./node_modules/.bin/cf build --mode "${MODE:-production}" >/dev/null 2>&1 &&
node -p 'require("./.cloudflare/output/v0/workers/default/worker.config.json").name'
"""

[tasks."secret:list"]
description = "REMOTE, read only: secret names on PROJECT's Worker in MODE"
dir = "{{config_root}}/{{env.PROJECT}}"
run = '''
W="${WORKER:-$(./node_modules/.bin/cf build --mode "${MODE:-production}" >/dev/null 2>&1 </dev/null && node -p 'require("./.cloudflare/output/v0/workers/default/worker.config.json").name')}"
./node_modules/.bin/cf workers secrets list --worker "$W"
'''

[tasks."secret:put"]
description = "REMOTE: set one secret from stdin on PROJECT's Worker in MODE: printf %s \"$V\" | mise run secret:put -- NAME"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<name>"'
run = '''
W="${WORKER:-$(./node_modules/.bin/cf build --mode "${MODE:-production}" >/dev/null 2>&1 </dev/null && node -p 'require("./.cloudflare/output/v0/workers/default/worker.config.json").name')}"
./node_modules/.bin/cf workers secrets update "${usage_name}" --type secret_text --worker "$W"
'''

[tasks."secret:rm"]
description = "REMOTE: delete one secret from PROJECT's Worker in MODE: mise run secret:rm -- NAME"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<name>"'
run = '''
W="${WORKER:-$(./node_modules/.bin/cf build --mode "${MODE:-production}" >/dev/null 2>&1 </dev/null && node -p 'require("./.cloudflare/output/v0/workers/default/worker.config.json").name')}"
./node_modules/.bin/cf workers secrets delete "${usage_name}" --force --worker "$W" && echo "deleted ${usage_name} from $W"
'''

[tasks."secret:push"]
description = "REMOTE: upload every KEY=value in .secrets/<MODE>.env to PROJECT's Worker in one new version (bulk)"
dir = "{{config_root}}/{{env.PROJECT}}"
run = """
set -euo pipefail
F=".secrets/${MODE:-production}.env"
BODY=$(node -e 'const s={};for(const l of require("fs").readFileSync(process.argv[1],"utf8").split("\\n")){const m=l.match(/^\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)$/);if(m)s[m[1]]={type:"secret_text",text:m[2].replace(/^(["\\x27])(.*)\\1$/,"$2")}}console.log(JSON.stringify({secrets:s}))' "$F")
W="${WORKER:-$(./node_modules/.bin/cf build --mode "${MODE:-production}" >/dev/null 2>&1 </dev/null && node -p 'require("./.cloudflare/output/v0/workers/default/worker.config.json").name')}"
./node_modules/.bin/cf workers secrets bulk --worker "$W" --body "$BODY" >/dev/null
echo "pushed $(grep -cE '^[A-Za-z_]' "$F") secret(s) from $F to $W"
"""
```

The existing `types` task (`cf workers types` + `npx tsc --noEmit`) already covers typed env. It passed on fuzz-secrets, and it failed as expected on the bad-usage file.
