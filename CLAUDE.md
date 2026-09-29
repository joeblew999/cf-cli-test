# Working in this repo (for agents)

This repo evaluates Cloudflare's new `cf` CLI on its own terms. Keep it self-contained: no paths or references to other repositories.

## Use cf the way it is designed (read this first)

`cf` is search-first for agents (see `cf --help` and the cf repo's AGENTS.md "Product Direction").

1. Find the command: `cf cli search "<what you want to do>"`.
   - Use anonymous wording: no names, IDs or domains. Queries are recorded in telemetry.
   - Pick the best of the 5 results. Don't explore by chaining `--help`.
2. `<command> --help` for flags; `cf schema <command>` for the exact API request.
3. Run it. On mutating commands, try `--dry-run` first. Every generated command has it, and it prints secrets in plain text.

Facts that save time:
- **Install:** `cf` is on PATH as plain `cf` in this repo (mise tool `npm:cf`, pinned in mise.toml), matching its intended global install. `.claude/settings.json` allows `cf *` and `mise run *` without prompts, so just call `cf ...`. The mise tasks call `./node_modules/.bin/cf` of `PROJECT`.
- **Output:** JSON by default, with no `--json`/`--format`; use `jq -c`.
- **Lists:** they return one page on purpose. Pass `--per-page` or a cursor.
- **Auth:** the token is `CLOUDFLARE_API_TOKEN`, else the OAuth login from `cf auth login` (its 1-hour token is refreshed automatically). The account is `CLOUDFLARE_ACCOUNT_ID`, else project settings.
- **Non-interactive shells:** deletes need `--force` (without it cf prints "Aborted." and exits 0). Sensitive values come from stdin: `echo v | cf workers secrets update NAME`.
- **Not in cf yet:** live tail, rollback and R2 download-to-file. Use `mise run logs`, `mise run rollback` and `mise run r2:get`.
- **Fixing cf:** fixes belong in Forge overlays or the API, not in cf itself.

## This repo

- `mise tasks` lists the dev menu. Read README.md first.
- Only verified results go into FINDINGS.md / findings/.
- Anything created on a Cloudflare account must be named `cftest-*` and recorded in `.cf-manifest.json`. `mise run cleanup` deletes exactly that.
- Re-run the evaluation after bumping cf: `mise run verify`, `verify:remote`, `fuzz`, `mcp:smoke`.
