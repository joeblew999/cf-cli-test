#!/usr/bin/env bash
# Global behaviour checks for cf. Read-only. Prints: label | exit | stdout bytes | stderr head
# The project whose cf is fuzzed: PROJECT (a directory beside fuzz/, default app).
cd "$(dirname "$0")/../${PROJECT:-app}" || exit 1
CF=./node_modules/.bin/cf
t() { # label, env..., -- args
  local label=$1; shift
  local envs=()
  while [ "$1" != "--" ]; do envs+=("$1"); shift; done; shift
  local o e c
  o=$(env "${envs[@]}" "$CF" "$@" 2>/tmp/cf_fuzz_err </dev/null); c=$?
  e=$(head -c 160 /tmp/cf_fuzz_err | tr '\n' ' ')
  printf '%s | exit=%s | out=%sB | json=%s | err: %s | out: %s\n' "$label" "$c" "${#o}" \
    "$(printf '%s' "$o" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{JSON.parse(s);console.log("y")}catch{console.log(s.trim()?"n":"-")}})')" \
    "$e" "$(printf '%s' "$o" | head -c 120 | tr '\n' ' ')"
}
X=CF_FUZZ=1
t "unknown cmd" $X -- nosuchthing
t "unknown cmd --help" $X -- nosuchthing --help
t "unknown subcmd" $X -- workers nosuch
t "unknown flag" $X -- workers list --nosuchflag
t "typo flag" $X -- workers list --per-pag 5
t "--help root" $X -- --help
t "--help workers" $X -- workers --help
t "--help leaf" $X -- workers list --help
t "-h leaf" $X -- workers list -h
t "help as cmd" $X -- help
t "no args" $X --
t "-q workers list" $X -- workers list -q
t "--quiet" $X -- workers list --quiet
t "--version" $X -- --version
t "-v" $X -- -v
t "profile nonexistent" $X -- workers list --profile nosuchprofile
t "CLOUDFLARE_PROFILE nonexistent" CLOUDFLARE_PROFILE=nosuch -- workers list
t "bad CLOUDFLARE_ACCOUNT_ID" CLOUDFLARE_ACCOUNT_ID=00000000000000000000000000000000 -- workers list
t "junk CLOUDFLARE_ACCOUNT_ID" CLOUDFLARE_ACCOUNT_ID=junk -- workers list
t "--account-id junk" $X -- workers list --account-id junk
t "zone bad name" $X -- dns records list --zone nosuch.invalid
t "zone-id junk" $X -- dns records list --zone-id junk
t "dns list no zone" $X -- dns records list
t "bad API token" CLOUDFLARE_API_TOKEN=bogus -- workers list
t "per-page 0" $X -- workers list --per-page 0
t "per-page -5" $X -- workers list --per-page -5
t "per-page abc" $X -- workers list --per-page abc
t "per-page 100000" $X -- workers list --per-page 100000
t "page 9999" $X -- workers list --page 9999
t "order-by bad enum" $X -- workers list --order-by bogus
t "d1 get bogus uuid" $X -- d1 get 00000000-0000-0000-0000-000000000000
t "d1 get not-a-uuid" $X -- d1 get notauuid
t "--format bogus" $X -- workers list --format bogus
t "--json" $X -- workers list --json
t "cli search empty" $X -- cli search ""
t "schema unknown" $X -- schema nosuch cmd
