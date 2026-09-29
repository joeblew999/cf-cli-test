# Next

Where this repo stands (2026-09-29) and what comes next, in order. What's proven is in FINDINGS.md.

## Where we are

- **`cf` (beta.5):**
  - The mise menu (`mise tasks`) covers the dev loop, release, data, secrets, local data and account.
  - Two templates.
  - `mise run check` covers everything local, and `verify:remote` covers the live path.
- **`api/`:** an oRPC 1.15.4 Worker, contract first, on D1. It uses oRPC's Durable Object publisher for SSE (with resume) and WebSockets.
  - Everything Fern needs is declared in the contract; the only hand-written spec is `sdk/fern/apis/api/asyncapi.yml`.
- **`sdk/`:** Fern generates from that spec:
  - Go and TypeScript SDKs;
  - a Rust CLI (with `generate-skills`, `--schema` and SSE `watch`);
  - a docs site.
  - The TypeScript SDK runs on Workers; `api:live-test` passes 5/5.
- **`mcp/`:** an MCP server over Forge's spec of the Cloudflare API, search first.

## Next

1. **Ship the generated output.** Today it's only in `sdk/out/`, which is gitignored.
   - TypeScript SDK → npm (or a private registry). Go SDK → its own module repo. CLI → a repo with cargo-dist releases (7 targets).
   - Use Fern's `output: location: github` per group, so `sdk:gen` opens a PR in each SDK repo.
   - Decide the names, the repos and public vs private.
2. **Settle Fern's licensing.** Its docs call local generation (`--local`), WebSocket clients, webhook signatures and the CLI generator Enterprise or early access. It all ran here without a `FERN_TOKEN`. Ask Fern, or budget for a plan.
3. **Apply the chain to our real oRPC projects.** For each: add `operationId`, `tags` and `spec` (the `x-fern-*` extensions) to the contract, then a `generators.yml` and an `api:spec`-style task. Use string cursors for pagination.
4. **Worker-to-Worker through service bindings.** Pass `env.X.fetch` as the SDK's `fetch` (no public URL, no `global_fetch_strictly_public`). Not tested yet.
5. **Put `api/` into `mise run check`.** Typecheck, check that the regenerated spec matches the committed `openapi.json`, then `sdk:gen api` + `sdk:check`.
6. **CI.** GitHub Actions running `mise run check` (it needs Docker for Fern), plus cargo-dist for CLI releases.
7. **Try the oRPC 2.0 beta (`2.0.0-beta.40`) on `api/`, on a branch.** 1.15.4 does everything so far, so this is about getting ready for 2.0 and seeing what it improves. Do it before 2.0 is final.
   - **Port:** `.route({...})` becomes `.meta(openapi({...}))`, `@orpc/zod/zod4` becomes `@orpc/zod@beta`, and `@orpc/experimental-publisher-durable-object` becomes `DurablePublisher` from `@orpc/publisher` (stable in 2.0). orpc.dev documents the beta API.
   - **Compare:** is the generated OpenAPI the same or better (the `spec` hook, SSE envelope, operationIds, OpenAPI 3.2 by default)? Does `fern check` pass, and do `sdk:gen api` + `sdk:check` pass?
   - **Prove:** `api:live-test` 5/5 (SSE, WebSocket, resume), plus the CLI's `notes list --page-all` and `notes watch`.
   - **Look for:** anything that removes hand-written code, such as whether 2.0 can describe WebSockets so that `asyncapi.yml` goes away.
   - **Result:** write it up in FINDINGS.md. Stay on 1.15.4 or plan the move for our projects; they run 1.15.4 today.
8. **Clean the Cloudflare account.** `mise run cleanup` deletes everything in `.cf-manifest.json` (about 40 test Workers and resources, all named `cftest-*`).
9. **Optional upstream work (outward-facing, needs a go-ahead):** file the `cf` bugs from FINDINGS.md (silent paging, exit 0 on unknown commands, the bulk-secrets no-op, `--dry-run` printing secrets), and propose Forge overlays for name→ID lookups and rollback.
