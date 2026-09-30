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
2. **cf bugs reported: done (2026-09-30).** The new ones are [cloudflare/cf#99](https://github.com/cloudflare/cf/issues/99)–[cloudflare/cf#106](https://github.com/cloudflare/cf/issues/106), plus a comment on [cloudflare/cf#38](https://github.com/cloudflare/cf/issues/38). Four were already filed by others (#20, #74, #94, #96). The table is in README.md; `mise run upstream:status` shows which are fixed.
3. **CI.** GitHub Actions running `mise run check`.
