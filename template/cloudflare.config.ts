import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

// One Worker: the SPA in public/ plus an API under /api/*. KV and D1 need no IDs: the first
// `cf deploy` creates them (__NAME__-kv, __NAME__-db). More bindings: see template-full/.
export default defineConfig({
	worker: {
		name: "__NAME__",
		compatibilityDate: "2026-09-25",
		entrypoint,
		assets: {
			notFoundHandling: "single-page-application",
			runWorkerFirst: ["/api/*"],
		},
		// Workers Logs is off unless enabled; mise run logs / errors need it.
		observability: { enabled: true },
		env: {
			APP_NAME: bindings.text("__NAME__"),
			ASSETS: bindings.assets(),
			KV: bindings.kv<"hits">(),
			DB: bindings.d1(),
		},
	},
});
