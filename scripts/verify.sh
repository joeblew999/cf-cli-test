#!/usr/bin/env bash
# Re-runs the checks this repo's findings rest on, against whatever cf the template pins.
#   verify.sh local    fresh project from template/ -> types, tests, dev server, local D1 migration, API
#   verify.sh remote   the same project deployed as Worker cftest-verify -> live API, remote D1
#                      migration, KV, versions, logs (records resources in .cf-manifest.json)
# Prints PASS/FAIL per check and exits non-zero if any failed. Work happens in .verify/ (gitignored).
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
where="${1:-local}"
app="$root/.verify/app"
port="${VERIFY_PORT:-5399}"
failed=0

check() { # check <name> <command...>: PASS when the command succeeds
  local name="$1"; shift
  if out="$("$@" 2>&1)"; then printf 'PASS  %s\n' "$name"; else printf 'FAIL  %s\n%s\n' "$name" "$(printf '%s' "$out" | tail -5 | sed 's/^/      /')"; failed=1; fi
}
expect() { # expect <name> <needle> <command...>: PASS when the output contains needle
  local name="$1" needle="$2"; shift 2
  local out; out="$("$@" 2>&1)"
  if [[ "$out" == *"$needle"* ]]; then printf 'PASS  %s\n' "$name"; else printf 'FAIL  %s (wanted %s)\n      %s\n' "$name" "$needle" "$(printf '%s' "$out" | tail -3)"; failed=1; fi
}

cd "$root"
if [ "$where" = local ]; then
  rm -rf .verify && mkdir -p .verify
  check "new project from template/" mise run -q new .verify/app --name cftest-verify
  export PROJECT=.verify/app PORT="$port"
  check "types: cf workers types + tsc" mise run -q types
  check "tests: vitest + pool-workers" mise run -q test
  (cd "$app" && PORT="$port" ./node_modules/.bin/cf dev >"$root/.verify/dev.log" 2>&1 &)
  for _ in $(seq 1 40); do curl -s -o /dev/null "localhost:$port/" && break; sleep 1; done
  expect "dev: SPA fallback" "<!doctype html>" curl -s "localhost:$port/some/route"
  expect "dev: GET /api/hello" "Hello from cftest-verify" curl -s "localhost:$port/api/hello"
  expect "dev: KV hits" '"hits"' curl -s -X POST "localhost:$port/api/hits"
  expect "local D1 migration" "0001_init.sql" mise run -q local:db:migrate
  expect "local D1 migration runs once" "up to date" mise run -q local:db:migrate
  expect "dev: POST /api/notes (D1)" '"body":"hello"' curl -s -X POST "localhost:$port/api/notes" -d hello
  expect "local:kv:get" "1" mise run -q local:kv:get KV hits
  pkill -f "$app/node_modules" 2>/dev/null
elif [ "$where" = remote ]; then
  [ -d "$app" ] || { echo "run verify.sh local first"; exit 1; }
  export PROJECT=.verify/app
  expect "logged in" "expires" mise run -q whoami
  check "deploy (creates KV and D1)" mise run -q deploy
  # The URL cf deploy printed, recorded in .cf-manifest.json (cf has no command to look up the subdomain).
  url=$(node -p 'require("./.cf-manifest.json").find(e => e.kind === "worker" && e.name === "cftest-verify")?.url ?? ""')
  for _ in $(seq 1 30); do curl -sf -o /dev/null "$url/api/hello" && break; sleep 2; done
  expect "live: GET /api/hello" "Hello from cftest-verify" curl -s "$url/api/hello"
  expect "live: SPA fallback" "<!doctype html>" curl -s "$url/some/route"
  expect "remote D1 migration" "0001_init.sql" mise run -q db:migrate cftest-verify-db
  expect "live: POST /api/notes (D1)" '"body":"hello"' curl -s -X POST "$url/api/notes" -d hello
  expect "db:query" "hello" mise run -q db:query cftest-verify-db "select body from notes"
  expect "live: KV hits" '"hits"' curl -s -X POST "$url/api/hits"
  expect "kv:get" "1" mise run -q kv:get cftest-verify-kv hits
  expect "versions" "100%" mise run -q versions
  check "logs" mise run -q logs --limit 5
  echo "Remote resources are recorded in .cf-manifest.json; mise run cleanup removes them."
else
  echo "usage: verify.sh local|remote"; exit 2
fi
[ "$failed" = 0 ] && echo "All checks passed." || echo "Some checks FAILED."
exit "$failed"
