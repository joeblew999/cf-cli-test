# Data (D1, KV, R2) — cf 1.0.0-beta.5

node 26 via mise, macOS arm64, 2026-09-29. The project is `fuzz-data/`: a copy of hello/ with the Worker renamed `cftest-data` and bindings `KV`, `DB` and `BUCKET` that have no IDs.
Remote resources I created (all are recorded in .cf-manifest.json): D1 `cftest-data-db` (5379c0ba-…), KV `cftest-data-kv` (428174b6…) and R2 `cftest-data-bucket`.
Everything below comes from commands I ran. "exit" means cf's own exit code.

## 1. Verified facts per command

### D1
| Command | Verdict | What I saw |
|---|---|---|
| `d1 create --name X` | works | Returns JSON with `uuid`; exit 0. |
| `d1 list --name X` | works | Filters by name. The list has `uuid` and `name`. Without `--per-page` the list is capped at 10. |
| `d1 query <uuid> --sql "…"` | works | Runs several statements separated by `;` and returns one result object per statement, each with meta (colo SIN, timings). `--params a` binds `?`. |
| `d1 query <NAME> …` | **names not accepted** | `APIError [7400] Invalid property: databaseId => Invalid uuid` (400); exit 1. |
| `d1 query <uuid> --sql @seed.sql` | works | Runs a .sql file; this is the "execute a file" path. |
| `d1 query` with bad SQL | good error | `[7500] near "selec": syntax error at offset 0: SQLITE_ERROR`; exit 1. |
| `d1 query` without `--sql` | ok error | `[7400] Invalid property: sql => Required \| … batch => Required`; exit 1. |
| `d1 migrations create "<msg>"` | works | Creates `migrations/0001_add_users.sql`. The first run auto-answers "create folder? yes" in a non-interactive shell. Output is JSON `{name,path}`. |
| `d1 migrations list <uuid>` | works | Lists **unapplied** files; `[]` once they are all applied. |
| `d1 migrations apply <uuid>` | works (remote) | Auto-answers "continue? yes" in a non-interactive shell; each migration shows `status ✅`. It uses the `d1_migrations` table, which shows up in the export. |
| `d1 migrations list/apply` with a name or local id | **missing locally** | `Expected a D1 database ID, but received <database>="DB-cftest-data". Database names and binding names are not accepted.` It also rejects `00000000-0000-0000-0000-000000000000` with `--local`. **Migrations can't be applied to the `cf dev` database.** |
| `d1 export <uuid> --output-format polling` | partial | Returns `status: active` plus `at_bookmark`. You must poll again with `--current-bookmark`; otherwise the export is cancelled and the next poll prints `{"success": false, "error": "Not currently exporting anything."}` **with exit 0**. A poll loop reaches `complete` and gives `result.signed_url`, and `curl` on that URL gets a correct SQL dump. The `db:export` task wraps this loop. |
| `d1 time-travel get-bookmark <uuid>` | works | `{"bookmark": "00000001-…"}`. I did not test `restore` because it is destructive. |
| `d1 import` | not tried | It is the raw multi-step init/ingest/poll API with an etag; no dev would call it by hand. |
| `d1 list --local` | broken/misleading | Returns `[]` even while `cf dev` has a DB, with and without `--persist-to`. |
| `d1 query <id> --local` | missing | `This command has no local equivalent… The local explorer API does not implement POST /d1/database/DB/query`; exit 1. |
| `d1 raw <id> --local --persist-to <ABS>/.cloudflare/state` | works, but hangs | The local D1 id is `<BINDING>-<worker>`, here `DB-cftest-data`. It read and wrote **the same DB `cf dev` uses**: I inserted a row via cf and `SELECT` through the dev server returned it. **The process often does not exit after printing its result** (see bugs). |
| `d1 raw DB --local` (default state) | trap | With no `--persist-to` it uses `~/Library/Preferences/cloudflare/state` on macOS, not `~/.config/cloudflare/state` as the help says. It silently creates an empty DB there: `no such table: visits`. |

### KV (single-key commands are `cf kv keys …`; `cf cli search "read a single value from a kv key"` ranks `bulk get` first)
| Command | Verdict | What I saw |
|---|---|---|
| `kv namespaces create --title X` | works | Returns `{id, title}`. |
| `kv namespaces list --per-page 100` | works | `{id, title}`. |
| `kv keys put K --namespace-id ID --body V` | works | Prints nothing; exit 0. |
| `kv keys put … --file v.json` | works | Getting the key back returns the file content. |
| `kv keys put … --expiration-ttl 60` | works | `keys list` shows `expiration`. A TTL of 10 gives a clear error: `Expiration TTL must be at least 60`; exit 1. |
| `kv keys put` with no body | ok error | `--body is required … Pass --body '<json>' or --body @path/to/file.json.` The hint suggests JSON although the value is raw bytes. |
| `kv keys get K --namespace-id ID [--text]` | works | Raw value with no trailing newline. A missing key gives `[10009] get: 'key not found'` (404); exit 1. |
| `kv keys list --namespace-id ID` | works | `[{name, expiration?}]`. |
| `kv keys delete K --namespace-id ID` | **bug** | In a non-interactive shell it prints `(non-interactive; pass --force to confirm) Aborted.` and **exits 0** without deleting. `--force` deletes it. |
| `--namespace-id <title>` | names not accepted | `[10011] could not parse UUID … 'invalid namespace format: cftest-data-kv'`. |
| `kv namespaces list --local --persist-to <ABS>` | broken | `[]` while dev has `KV-cftest-data`. |
| `kv keys get/put --local --persist-to <ABS>` with id `KV-cftest-data` | works, but hangs | get returned dev's `1`. After put `100`, `curl /kv` through `cf dev` returned `{"hits":101}`, so it is the same state. Both **hung after finishing** and had to be killed. |

### R2 (`cf r2 objects …`; singular `cf r2 object` silently prints the r2 help)
| Command | Verdict | What I saw |
|---|---|---|
| `r2 buckets create --name X` | works | |
| `r2 objects put KEY --bucket-name B --file F` | works | Takes the bucket **by name** (no ID needed). Returns key, size, etag and version. `--body "text"` also works. |
| `r2 objects get KEY --bucket-name B > out` | works | Raw bytes go to stdout and the cf banner goes to stderr: a 3000-byte random file round-tripped with the same sha1. There is no `--output` flag; `--text` decodes as text. |
| `r2 objects list --bucket-name B` | works | JSON with `key`, `size` and so on. |
| `r2 objects delete KEY --bucket-name B --force` | works | Returns `{key}`. |
| Missing key or wrong bucket | good errors | `[10007] The specified key does not exist.` / `[10006] The specified bucket does not exist.` (404); exit 1. |
| `r2 objects list --bucket-name BUCKET-cftest-data --local --persist-to <ABS>` | works, but hangs | Listed dev's `note.txt`, then did not exit. |

### Local dev data: the reliable path is the Local Explorer API
`cf dev` stores its state in `<project>/.cloudflare/state/v3/{d1,kv,r2}`. It is **not** in `~/.config/cloudflare/state` and **not** in `.wrangler`.
While `cf dev` runs, it serves `http://localhost:$PORT/cdn-cgi/local/explorer/api`, and the OpenAPI document lists the paths. The ones I used:
- `POST /d1/database/<BINDING>-<worker>/raw {"sql": …}`
- `GET/PUT/DELETE /storage/kv/namespaces/<BINDING>-<worker>/values/<key>`
- `GET /r2/buckets/<BINDING>-<worker>/objects`
- `GET/PUT /r2/buckets/<BINDING>-<worker>/objects/<key>`

Keys must be URL-encoded (`seeded%2Fx.bin`); an unencoded `/` gives 404. Round trip: a KV value set to 500 through the API → `curl /kv` through the Worker returned `{"hits":501}`. The D1 row seeded by cf was visible to the Worker. The local R2 object came back with the same sha1.
Explorer D1 caveat: an unknown id such as `NOPE-cftest-data` is created on the fly, so a typo gives an empty DB instead of an error.

## 2. Bugs (with repro)
1. **`--local` data commands hang after printing a correct result.** This happened with `cf d1 raw DB-cftest-data --local --persist-to $PWD/.cloudflare/state --sql "insert …"`, `cf kv keys get/put … --local --persist-to …` and `cf r2 objects list … --local --persist-to …` while `cf dev` was running. The work is done and the output is printed, but node does not exit, so I had to kill it (exit 143). One read-only `d1 raw` did exit once. A relative `--persist-to .cloudflare/state` also hung.
2. **`d1 list --local` and `kv namespaces list --local` return `[]`** while the same state has a DB or namespace. You can't discover local ids with cf.
3. **The `--persist-to` help says the default is `~/.config/cloudflare/state`.** On macOS the actual default is `~/Library/Preferences/cloudflare/state`, and it is not where `cf dev` keeps state (`./.cloudflare/state`). So `--local` without `--persist-to` touches a different, empty world. It auto-creates DBs: `no such table`.
4. **Local D1 migrations are impossible.** `d1 migrations list|apply` validate that the argument is a UUID before looking at `--local`, and the local id is `DB-<worker>`. There's no binding-name form.
5. **Destructive commands abort with exit 0 in a non-interactive shell** (`kv keys delete` without `--force`: "Aborted.", exit 0). The d1 export cancellation also returns `success:false` with exit 0.
6. **Remote D1 and KV commands take only UUIDs; names are rejected**, even though cf deploy creates everything by name. R2 is the exception: it uses bucket names.
7. Discovery: `cf r2 object` (singular) and other wrong subcommands print help and exit 0. `cf cli search "read a single value from a kv key"` puts `kv bulk get` above `kv keys get`.

## 3. Proposed mise tasks
Every task below was run through `mise run` from `fuzz-data/mise.toml` (dir `{{config_root}}` there; shown here in the root-file style). I ran:
- **D1:** `db:id` (plus a bad name → "no D1 database named …", task failed), `db:query` (insert → "1 row(s) changed", select → table), `db:exec` (seed.sql), `db:migrate:new`, `db:migrate:status`, `db:migrate` (0002 ✅, then status `[]`), `db:export` (a dump with users and posts), `db:bookmark`.
- **KV:** `kv:put` (plus `--ttl 120`), `kv:get`, `kv:ls`, `kv:rm`, and `kv:get` on a bad namespace (fails fast after the `set -e` fix).
- **R2:** `r2:put`, `r2:ls`, `r2:get` (sha1 matched), `r2:rm`.
- **Local, with `cf dev` on PORT=5191:** `local:db` (count), `local:kv:put`/`local:kv:get` (the Worker then saw 501, and the key `a:b/c` round-tripped), `local:r2:put` (key `seeded/x.bin`), `local:r2:ls`.

Design choices:
- Remote tasks take **resource names** and resolve IDs with small node one-liners (`db:id`, `kv:id`). This needs `--per-page 100` because lists silently cap at 10.
- cf writes its banner to stderr, so stdout JSON pipes cleanly.
- Local tasks use the dev server's explorer API with ids of the form `<BINDING>-<worker name from package.json>`, because the cf `--local` commands hang (bug 1) and local migrations are impossible (bug 4).
- Remote D1 migrations **do not** touch the dev DB; `cf dev` has no migration runner of its own that I found.

```toml
[tasks."db:id"]
description = "REMOTE: D1 name -> UUID"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<name>"'
run = '''./node_modules/.bin/cf d1 list --name "$usage_name" --per-page 100 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s).find(d=>d.name===process.argv[1]);if(!m){console.error("no D1 database named "+process.argv[1]);process.exit(1)}console.log(m.uuid)})' "$usage_name"'''

[tasks."db:query"]
description = "REMOTE: run SQL on a D1 database by name: mise run db:query <db> '<sql>' (prints a table)"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<db>"
arg "<sql>"
'''
run = '''set -eo pipefail
id=$(mise run -q db:id "$usage_db")
./node_modules/.bin/cf d1 query "$id" --sql "$usage_sql" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const r of JSON.parse(s)) r.results.length?console.table(r.results):console.log(r.meta.changes+" row(s) changed")})' '''

[tasks."db:exec"]
description = "REMOTE: run a .sql file on a D1 database by name: mise run db:exec <db> <file.sql>"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<db>"
arg "<file>"
'''
run = '''set -eo pipefail
./node_modules/.bin/cf d1 query "$(mise run -q db:id "$usage_db")" --sql "@$usage_file" '''

[tasks."db:migrate:new"]
description = "Create migrations/NNNN_<message>.sql"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<message>"'
run = './node_modules/.bin/cf d1 migrations create "$usage_message"'

[tasks."db:migrate:status"]
description = "REMOTE: list unapplied migrations for a D1 database by name"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<db>"'
run = '''set -e; id=$(mise run -q db:id "$usage_db")
./node_modules/.bin/cf d1 migrations list "$id"'''

[tasks."db:migrate"]
description = "REMOTE: apply unapplied migrations to a D1 database by name"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<db>"'
run = '''set -e; id=$(mise run -q db:id "$usage_db")
./node_modules/.bin/cf d1 migrations apply "$id"'''

[tasks."db:export"]
description = "REMOTE: dump a D1 database to SQL on stdout: mise run db:export <db> > backup.sql"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<db>"'
run = '''set -eo pipefail
id=$(mise run -q db:id "$usage_db")
url=$(node -e '
const {execFileSync:x}=require("child_process");const id=process.argv[1];
const run=a=>JSON.parse(x("./node_modules/.bin/cf",["d1","export",id,"--output-format","polling",...a],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}));
let r=run([]);for(let i=0;i<60&&r.status!=="complete";i++){if(!r.success)throw new Error(r.error);r=run(["--current-bookmark",r.at_bookmark])}
console.log(r.result.signed_url)' "$id")
curl -fsS "$url" '''

[tasks."db:bookmark"]
description = "REMOTE: current time-travel bookmark of a D1 database (save it before risky changes)"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<db>"'
run = '''set -e; id=$(mise run -q db:id "$usage_db")
./node_modules/.bin/cf d1 time-travel get-bookmark "$id"'''

[tasks."kv:id"]
description = "REMOTE: KV namespace title -> id"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<ns>"'
run = '''./node_modules/.bin/cf kv namespaces list --per-page 100 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s).find(d=>d.title===process.argv[1]);if(!m){console.error("no KV namespace named "+process.argv[1]);process.exit(1)}console.log(m.id)})' "$usage_ns"'''

[tasks."kv:put"]
description = "REMOTE: set one key: mise run kv:put <ns> <key> <value> [--ttl 60]"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<ns>"
arg "<key>"
arg "<value>"
flag "--ttl <seconds>" help="expire after N seconds (min 60)"
'''
run = '''set -e; id=$(mise run -q kv:id "$usage_ns")
./node_modules/.bin/cf kv keys put "$usage_key" --namespace-id "$id" --body "$usage_value" ${usage_ttl:+--expiration-ttl $usage_ttl}'''

[tasks."kv:get"]
description = "REMOTE: read one key as text"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<ns>"
arg "<key>"
'''
run = '''set -e; id=$(mise run -q kv:id "$usage_ns")
./node_modules/.bin/cf kv keys get "$usage_key" --namespace-id "$id" --text'''

[tasks."kv:ls"]
description = "REMOTE: list keys in a namespace"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<ns>"'
run = '''set -e; id=$(mise run -q kv:id "$usage_ns")
./node_modules/.bin/cf kv keys list --namespace-id "$id"'''

[tasks."kv:rm"]
description = "REMOTE: delete one key (no prompt)"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<ns>"
arg "<key>"
'''
run = '''set -e; id=$(mise run -q kv:id "$usage_ns")
./node_modules/.bin/cf kv keys delete "$usage_key" --namespace-id "$id" --force'''

[tasks."r2:put"]
description = "REMOTE: upload a file: mise run r2:put <bucket> <key> <file>"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<bucket>"
arg "<key>"
arg "<file>"
'''
run = './node_modules/.bin/cf r2 objects put "$usage_key" --bucket-name "$usage_bucket" --file "$usage_file"'

[tasks."r2:get"]
description = "REMOTE: download an object to a file (byte-exact): mise run r2:get <bucket> <key> <out>"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<bucket>"
arg "<key>"
arg "<out>"
'''
run = './node_modules/.bin/cf r2 objects get "$usage_key" --bucket-name "$usage_bucket" > "$usage_out"'

[tasks."r2:ls"]
description = "REMOTE: list object keys in a bucket"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<bucket>"'
run = '''./node_modules/.bin/cf r2 objects list --bucket-name "$usage_bucket" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(o=>console.log(o.size+"\t"+o.key)))' '''

[tasks."r2:rm"]
description = "REMOTE: delete one object (no prompt)"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<bucket>"
arg "<key>"
'''
run = './node_modules/.bin/cf r2 objects delete "$usage_key" --bucket-name "$usage_bucket" --force'

# --- LOCAL: the data `cf dev` is using (dev must be running on PORT) ---
[tasks."local:db"]
description = "LOCAL: run SQL on the dev D1 by binding: mise run local:db DB '<sql>' (needs mise run dev)"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<binding>"
arg "<sql>"
'''
run = '''worker=$(node -e 'console.log(require("./package.json").name)'); ek=$(node -e 'console.log(encodeURIComponent(process.argv[1]||""))' "${usage_key:-}")
curl -fsS -X POST "http://localhost:${PORT:-5173}/cdn-cgi/local/explorer/api/d1/database/$usage_binding-$worker/raw" -H 'content-type: application/json' -d "$(node -e 'console.log(JSON.stringify({sql:process.argv[1]}))' "$usage_sql")" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const r of JSON.parse(s).result){const {columns,rows}=r.results;console.table(rows.map(x=>Object.fromEntries(columns.map((c,i)=>[c,x[i]]))))}})' '''

[tasks."local:kv:put"]
description = "LOCAL: set a key in the dev KV by binding: mise run local:kv:put KV <key> <value>"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<binding>"
arg "<key>"
arg "<value>"
'''
run = '''worker=$(node -e 'console.log(require("./package.json").name)'); ek=$(node -e 'console.log(encodeURIComponent(process.argv[1]||""))' "${usage_key:-}")
curl -fsS -X PUT "http://localhost:${PORT:-5173}/cdn-cgi/local/explorer/api/storage/kv/namespaces/$usage_binding-$worker/values/$ek" --data-binary "$usage_value"; echo'''

[tasks."local:kv:get"]
description = "LOCAL: read a key from the dev KV by binding"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<binding>"
arg "<key>"
'''
run = '''worker=$(node -e 'console.log(require("./package.json").name)'); ek=$(node -e 'console.log(encodeURIComponent(process.argv[1]||""))' "${usage_key:-}")
curl -fsS "http://localhost:${PORT:-5173}/cdn-cgi/local/explorer/api/storage/kv/namespaces/$usage_binding-$worker/values/$ek"; echo'''

[tasks."local:r2:put"]
description = "LOCAL: upload a file into the dev R2 by binding: mise run local:r2:put BUCKET <key> <file>"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = '''
arg "<binding>"
arg "<key>"
arg "<file>"
'''
run = '''worker=$(node -e 'console.log(require("./package.json").name)'); ek=$(node -e 'console.log(encodeURIComponent(process.argv[1]||""))' "${usage_key:-}")
curl -fsS -X PUT "http://localhost:${PORT:-5173}/cdn-cgi/local/explorer/api/r2/buckets/$usage_binding-$worker/objects/$ek" --data-binary "@$usage_file"; echo'''

[tasks."local:r2:ls"]
description = "LOCAL: list objects in the dev R2 by binding"
dir = "{{config_root}}/{{env.PROJECT}}"
usage = 'arg "<binding>"'
run = '''worker=$(node -e 'console.log(require("./package.json").name)'); ek=$(node -e 'console.log(encodeURIComponent(process.argv[1]||""))' "${usage_key:-}")
curl -fsS "http://localhost:${PORT:-5173}/cdn-cgi/local/explorer/api/r2/buckets/$usage_binding-$worker/objects" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).result.forEach(o=>console.log(o.size+"\t"+o.key)))' '''
```
