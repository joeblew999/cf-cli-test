# Next

Where this repo stands (2026-09-30) and what comes next, in order. What's proven is in FINDINGS.md.

## Where we are

- **`cf` (beta.5):**
  - The mise menu (`mise tasks`) covers the dev loop, release, data, secrets, local data and account.
  - Two templates.
  - `mise run check` covers everything local, and `verify:remote` covers the live path.
- **`mcp/`:** an MCP server over Forge's spec of the Cloudflare API, search first.

## Next

1. **Cloudflare account cleaned: done (2026-09-30).** All 40 recorded `cftest-*` resources are deleted, and `mise run cleanup` now handles queue consumers and non-empty R2 buckets.
2. **Optional upstream work (outward-facing, needs a go-ahead):** file the `cf` bugs from FINDINGS.md (silent paging, exit 0 on unknown commands, the bulk-secrets no-op, `--dry-run` printing secrets, `r2 objects bulk-delete` demanding `--body` for its no-body modes), and propose Forge overlays for name→ID lookups and rollback.
3. **CI.** GitHub Actions running `mise run check`.
