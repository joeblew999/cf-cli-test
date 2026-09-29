#!/usr/bin/env bash
# --dry-run on 18 mutating commands, all with fake names/IDs, so a dry run that is not honoured fails
# instead of changing anything. (deploy and versions create are left out: a broken dry run there would deploy.)
# The project whose cf is fuzzed: PROJECT (a directory beside fuzz/, default app).
cd "$(dirname "$0")/../${PROJECT:-app}" || exit 1
CF=./node_modules/.bin/cf
Z=00000000000000000000000000000000
t() {
  local o c
  o=$("$CF" "$@" --dry-run 2>&1 </dev/null); c=$?
  printf '### cf %s --dry-run\nexit=%s bytes=%s\n```\n%s\n```\n' "$*" "$c" "${#o}" "$(printf '%s' "$o" | head -c 500)"
}
t kv namespaces create --title cf-fuzz-dryrun-kv
t d1 create --name cf-fuzz-dryrun-db
t r2 buckets create --name cf-fuzz-dryrun-bucket
t queues create --queue-name cf-fuzz-dryrun-q
t workers delete $Z
t kv namespaces delete $Z
t d1 delete 00000000-0000-0000-0000-000000000000
t r2 buckets delete cf-fuzz-nonexistent-bucket
t dns records create --zone nosuch.invalid --type A --name x --content 1.2.3.4
t cache purge --zone nosuch.invalid --purge-everything
t zones create --name cf-fuzz-dryrun.invalid
t workers secrets update $Z --name FOO --text bar
t hyperdrive configs create --name x
t vectorize indexes create --name cf-fuzz-dryrun-idx
t zero-trust tunnels cloudflared create --name cf-fuzz-dryrun-tunnel
t d1 query 00000000-0000-0000-0000-000000000000 --sql "DROP TABLE x"
t accounts members delete $Z
t workers deployments create $Z
