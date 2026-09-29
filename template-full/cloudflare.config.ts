import { bindings, defineConfig, exports, triggers } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
	worker: {
		name: "__NAME__",
		compatibilityDate: "2026-09-25",
		entrypoint,
		assets: {
			notFoundHandling: "single-page-application",
			runWorkerFirst: ["/api/*"],
		},
		exports: {
			Counter: exports.durableObject({ storage: "sqlite" }),
			MyFlow: exports.workflow({ name: "__NAME__-flow" }),
		},
		triggers: [
			triggers.queue({ name: "__NAME__-q", maxBatchSize: 1, maxBatchTimeout: 1 }),
			triggers.scheduled({ schedule: "*/5 * * * *" }),
		],
		// Workers Logs is off unless enabled; mise run logs / errors need it.
		observability: { enabled: true },
		env: {
			APP_NAME: bindings.text("__NAME__"),
			ASSETS: bindings.assets(),
			COUNTER: bindings.durableObject({ worker: "__NAME__", exportName: "Counter" }),
			FLOW: bindings.workflow({ name: "__NAME__-flow", worker: "__NAME__", exportName: "MyFlow" }),
			Q: bindings.queue<{ msg: string; at: string }>({ name: "__NAME__-q" }),
			AI: bindings.ai({ dev: { remote: true } }),
			KV: bindings.kv<"hits" | "last-queue" | "last-cron">(),
			DB: bindings.d1(),
			BUCKET: bindings.r2(),
		},
	},
});
