import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// @cloudflare/vitest-pool-workers 0.22 cannot read cloudflare.config.ts (only a Wrangler config),
// so the bindings are restated here for Miniflare. Keep them in step with cloudflare.config.ts.
export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./src/index.ts",
			miniflare: {
				compatibilityDate: "2026-08-22", // the pool's bundled workerd stops here; the config says 2026-09-25
				bindings: { APP_NAME: "__NAME__" },
				kvNamespaces: ["KV"],
				d1Databases: ["DB"],
			},
		}),
	],
});
