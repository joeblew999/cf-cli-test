import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// @cloudflare/vitest-pool-workers 0.22 cannot read cloudflare.config.ts (only wrangler.configPath),
// so bindings are restated here by hand for Miniflare.
export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./src/index.ts",
			miniflare: {
				compatibilityDate: "2026-08-22", // pool's bundled workerd tops out here; config says 2026-09-25
				bindings: { APP_NAME: "__NAME__" },
				kvNamespaces: ["KV"],
				d1Databases: ["DB"],
				r2Buckets: ["BUCKET"],
				durableObjects: { COUNTER: { className: "Counter", useSQLite: true } },
			},
		}),
	],
});
