#!/usr/bin/env bash
# Output bytes of the same command: pipe vs TTY (script), CLAUDECODE set/unset, NO_COLOR.
# The project whose cf is fuzzed: PROJECT (a directory beside fuzz/, default app).
cd "$(dirname "$0")/../${PROJECT:-app}" || exit 1
CF=./node_modules/.bin/cf
run() { # name cmd...
  local n=$1; shift
  local p t
  p=$("$@" </dev/null 2>/dev/null | wc -c | tr -d ' ')
  t=$(script -q /dev/null "$@" </dev/null 2>&1 | wc -c | tr -d ' ')
  local esc=$(script -q /dev/null "$@" </dev/null 2>&1 | grep -c $'\e\[')
  echo "$n | pipe=${p}B | tty=${t}B | tty-lines-with-ANSI=$esc"
}
for args in "workers list --per-page 100" "d1 list" "auth whoami"; do
  run "unset  :$args" env -u CLAUDECODE $CF $args
  run "CC=1   :$args" env CLAUDECODE=1 $CF $args
  run "NOCOLOR:$args" env -u CLAUDECODE NO_COLOR=1 $CF $args
done
echo "--- is pipe output pretty-printed? (newline count, CLAUDECODE unset vs 1)"
echo "unset: $(env -u CLAUDECODE $CF d1 list 2>/dev/null | wc -l)  CC=1: $(env CLAUDECODE=1 $CF d1 list 2>/dev/null | wc -l)"
echo "--- error to stderr under TTY, NO_COLOR=1: ANSI lines"
script -q /dev/null env -u CLAUDECODE NO_COLOR=1 $CF d1 get nope </dev/null 2>&1 | grep -c $'\e\['
echo "--- TTY stdout starts with banner/spinner? first 3 lines (cat -v)"
script -q /dev/null env -u CLAUDECODE $CF d1 list </dev/null 2>&1 | head -3 | cat -v | cut -c1-160
