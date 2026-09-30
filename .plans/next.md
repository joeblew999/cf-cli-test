# Next

Where this repo stands (2026-09-30) and what comes next, in order. What's proven is in FINDINGS.md.

## Where we are

- **`cf` (beta.5):**
  - The mise menu (`mise tasks`) covers the dev loop, release, data, secrets, local data and account.
  - Two templates.
  - `mise run check` covers everything local, and `verify:remote` covers the live path.
- **`mcp/`:** an MCP server over Forge's spec of the Cloudflare API, search first.

## Next

1. **Clean the Cloudflare account.** `mise run cleanup` deletes everything in `.cf-manifest.json` (about 40 test Workers and resources, all named `cftest-*`).
   - This includes the Workers from the removed API and SDK work (`cftest-api`, `cftest-sdk`, `cftest-sdk-api`) and their D1 database.
2. **Optional upstream work (outward-facing, needs a go-ahead):** file the `cf` bugs from FINDINGS.md (silent paging, exit 0 on unknown commands, the bulk-secrets no-op, `--dry-run` printing secrets), and propose Forge overlays for name→ID lookups and rollback.
3. **CI.** GitHub Actions running `mise run check`.
